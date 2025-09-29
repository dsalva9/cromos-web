import { config as loadEnv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types';

type StickerRow = Database['public']['Tables']['stickers']['Row'];
type TeamRow = Database['public']['Tables']['collection_teams']['Row'];

type StickerWithAssets = StickerRow & {
  sticker_number: number | null;
  image_path_webp_300: string | null;
  thumb_path_webp_100: string | null;
};

type StickerMatch = {
  sticker: StickerWithAssets;
  playerSlug: string;
  teamSlug: string;
  teamLabel?: string | null;
};

type StickerUpdate = Database['public']['Tables']['stickers']['Update'];

type Supabase = SupabaseClient<Database>;

interface ProcessCounters {
  total: number;
  uploadedFull: number;
  uploadedThumb: number;
  skipped: number;
  drySkipped: number;
  ambiguous: number;
  unmatched: number;
  failed: number;
}

const SUPPORTED_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg']);

(async function main() {
  bootstrapEnv();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.STICKER_BACKFILL_DRY_RUN === 'true';
  const force = args.includes('--force');
  const inputOverride = getArgValue(args, '--input');
  const collectionOverride = getNumericArg(args, '--collection');
  const limitArg = getNumericArg(args, '--limit');

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  const collectionIdSource =
    collectionOverride ||
    Number.parseInt(process.env.STICKER_BACKFILL_COLLECTION_ID || '', 10) ||
    Number.parseInt(process.env.COLLECTION_ID || '', 10) ||
    Number.parseInt(process.env.NEXT_PUBLIC_COLLECTION_ID || '', 10);
  if (!Number.isInteger(collectionIdSource)) {
    throw new Error('Missing STICKER_BACKFILL_COLLECTION_ID or --collection argument');
  }
  const collectionId = collectionIdSource;

  const inputDirRaw =
    inputOverride ||
    process.env.STICKER_BACKFILL_INPUT_DIR ||
    process.env.ASSETS_INPUT_DIR ||
    process.env.INPUT_DIR;
  if (!inputDirRaw) {
    throw new Error('Missing STICKER_BACKFILL_INPUT_DIR or --input argument');
  }
  const inputDir = path.resolve(process.cwd(), inputDirRaw);
  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const bucketName = process.env.STICKER_BACKFILL_BUCKET || 'sticker-images';

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { stickerIndex, playerIndex, teamAliasList } = await buildStickerIndex(
    supabase,
    collectionId,
  );

  const files = await collectFiles(inputDir);
  const limitedFiles = typeof limitArg === 'number' ? files.slice(0, limitArg) : files;

  const counters: ProcessCounters = {
    total: limitedFiles.length,
    uploadedFull: 0,
    uploadedThumb: 0,
    skipped: 0,
    drySkipped: 0,
    ambiguous: 0,
    unmatched: 0,
    failed: 0,
  };

  for (const filePath of limitedFiles) {
    const relative = path.relative(inputDir, filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      log(`Skipping unsupported file ${relative}`);
      counters.drySkipped += 1;
      continue;
    }

    const baseName = path.basename(filePath, ext).toLowerCase();
    const isThumb = baseName.endsWith('-thumb');
    const normalizedBase = isThumb ? baseName.slice(0, -6) : baseName;
    const { playerSlug, teamSlug } = parseNameSegments(normalizedBase, teamAliasList);

    const matches = findMatches(playerSlug, teamSlug, stickerIndex, playerIndex);
    if (matches.length === 0) {
      counters.unmatched += 1;
      log(`No sticker match for ${relative} (player=${playerSlug}, team=${teamSlug || 'n/a'})`);
      continue;
    }
    if (matches.length > 1) {
      counters.ambiguous += 1;
      log(
        `Ambiguous match for ${relative}. Candidates: ${matches
          .map((match) => describeSticker(match))
          .join('; ')}`,
      );
      continue;
    }

    const match = matches[0];
    if (match.sticker.id == null) {
      counters.failed += 1;
      log(`Sticker record missing id for ${relative}`);
      continue;
    }
    if (match.sticker.sticker_number == null) {
      counters.failed += 1;
      log(
        `Sticker ${match.sticker.id} is missing sticker_number. Populate before running backfill.`,
      );
      continue;
    }

    const stickerNumber = match.sticker.sticker_number;
    const targetPath = isThumb
      ? buildThumbPath(collectionId, stickerNumber, match.sticker.id)
      : buildFullPath(collectionId, stickerNumber, match.sticker.id);

    const alreadyProcessed = isThumb
      ? Boolean(match.sticker.thumb_path_webp_100)
      : Boolean(match.sticker.image_path_webp_300);
    if (alreadyProcessed && !force) {
      counters.skipped += 1;
      log(`Skipping ${relative}, target already set (${targetPath})`);
      continue;
    }

    logAction({
      action: dryRun ? 'DRY RUN' : force ? 'REUPLOAD' : 'UPLOAD',
      file: relative,
      sticker: match,
      targetPath,
      variant: isThumb ? 'thumb' : 'full',
    });

    if (dryRun) {
      counters.drySkipped += 1;
      continue;
    }

    try {
      await pushToStorage({
        supabase,
        bucketName,
        sourcePath: filePath,
        targetPath,
        contentType: inferMimeType(ext),
        upsert: force,
      });
    } catch (error) {
      counters.failed += 1;
      log(`Upload failed for ${relative}: ${(error as Error).message}`);
      continue;
    }

    try {
      await updateStickerPaths({
        supabase,
        stickerId: match.sticker.id,
        targetPath,
        isThumb,
      });
      if (isThumb) {
        match.sticker.thumb_path_webp_100 = targetPath;
        counters.uploadedThumb += 1;
      } else {
        match.sticker.image_path_webp_300 = targetPath;
        counters.uploadedFull += 1;
      }
    } catch (error) {
      counters.failed += 1;
      log(`Database update failed for ${relative}: ${(error as Error).message}`);
    }
  }

  summarize(counters, dryRun);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function bootstrapEnv() {
  const candidates = ['.env.local', '.env'];
  for (const candidate of candidates) {
    const absolute = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(absolute)) {
      loadEnv({ path: absolute });
    }
  }
}

function getArgValue(args: string[], name: string): string | undefined {
  const withEquals = args.find((value) => value.startsWith(`${name}=`));
  if (withEquals) {
    return withEquals.slice(name.length + 1);
  }
  const index = args.indexOf(name);
  if (index >= 0 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

function getNumericArg(args: string[], name: string): number | undefined {
  const raw = getArgValue(args, name);
  if (!raw) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function buildStickerIndex(supabase: Supabase, collectionId: number) {
  const { data: stickerData, error: stickersError } = await supabase
    .from('stickers')
    .select(
      'id, player_name, team_id, code, rarity, sticker_number, image_path_webp_300, thumb_path_webp_100',
    )
    .eq('collection_id', collectionId);
  if (stickersError) {
    throw new Error(`Failed to load stickers: ${stickersError.message}`);
  }
  const stickers = (stickerData || []) as StickerWithAssets[];

  const { data: teamData, error: teamsError } = await supabase
    .from('collection_teams')
    .select('id, team_name, team_code')
    .eq('collection_id', collectionId);
  if (teamsError) {
    throw new Error(`Failed to load teams: ${teamsError.message}`);
  }
  const teams = (teamData || []) as TeamRow[];

  const teamById = new Map<number, TeamRow>();
  for (const team of teams) {
    if (team.id != null) {
      teamById.set(team.id, team);
    }
  }

  const stickerIndex = new Map<string, StickerMatch[]>();
  const playerIndex = new Map<string, StickerMatch[]>();
  const teamAliasSet = new Set<string>();

  for (const sticker of stickers) {
    const playerSlug = slugify(sticker.player_name);
    const teamAliases = getTeamAliases(sticker, teamById);
    if (teamAliases.length === 0) {
      teamAliases.push('');
    }

    for (const alias of teamAliases) {
      const match: StickerMatch = {
        sticker,
        playerSlug,
        teamSlug: alias,
        teamLabel: getTeamLabel(alias, sticker, teamById),
      };
      const key = createKey(playerSlug, alias);
      pushMatch(stickerIndex, key, match);
      pushPlayerMatch(playerIndex, playerSlug, match);
      if (alias) {
        teamAliasSet.add(alias);
      }
    }
  }

  const teamAliasList = Array.from(teamAliasSet).sort((a, b) => b.length - a.length);

  return { stickerIndex, playerIndex, teamAliasList };
}

function getTeamAliases(sticker: StickerWithAssets, teamById: Map<number, TeamRow>) {
  const aliases = new Set<string>();
  if (sticker.team_id != null && teamById.has(sticker.team_id)) {
    const team = teamById.get(sticker.team_id) as TeamRow;
    const nameSlug = slugify(team.team_name);
    if (nameSlug) aliases.add(nameSlug);
    if (team.team_code) aliases.add(slugify(team.team_code));
  } else {
    aliases.add('special');
    if (sticker.rarity) aliases.add(slugify(sticker.rarity));
    if (sticker.code) {
      const prefix = sticker.code.split('-')[0];
      if (prefix) aliases.add(slugify(prefix));
    }
  }
  return Array.from(aliases).filter(Boolean);
}

function getTeamLabel(alias: string, sticker: StickerWithAssets, teamById: Map<number, TeamRow>) {
  if (sticker.team_id != null && teamById.has(sticker.team_id)) {
    return teamById.get(sticker.team_id)?.team_name || null;
  }
  if (alias === 'special') {
    return 'Special';
  }
  return sticker.rarity || 'Special';
}

function pushMatch(index: Map<string, StickerMatch[]>, key: string, match: StickerMatch) {
  const existing = index.get(key) || [];
  if (!existing.some((item) => item.sticker.id === match.sticker.id && item.teamSlug === match.teamSlug)) {
    existing.push(match);
  }
  index.set(key, existing);
}

function pushPlayerMatch(index: Map<string, StickerMatch[]>, playerSlug: string, match: StickerMatch) {
  const key = slugify(playerSlug);
  const existing = index.get(key) || [];
  if (!existing.some((item) => item.sticker.id === match.sticker.id && item.teamSlug === match.teamSlug)) {
    existing.push(match);
  }
  index.set(key, existing);
}

function parseNameSegments(baseName: string, teamAliases: string[]) {
  const normalized = slugify(baseName);
  for (const alias of teamAliases) {
    if (!alias) continue;
    if (normalized.endsWith(`-${alias}`)) {
      const playerPart = normalized.slice(0, -(alias.length + 1));
      if (playerPart) {
        return { playerSlug: playerPart, teamSlug: alias };
      }
    }
  }
  const pivot = normalized.lastIndexOf('-');
  if (pivot === -1) {
    return { playerSlug: normalized, teamSlug: undefined };
  }
  return {
    playerSlug: normalized.slice(0, pivot),
    teamSlug: normalized.slice(pivot + 1) || undefined,
  };
}

function findMatches(
  playerSlug: string,
  teamSlug: string | undefined,
  stickerIndex: Map<string, StickerMatch[]>,
  playerIndex: Map<string, StickerMatch[]>,
) {
  const normalizedPlayer = slugify(playerSlug);
  if (teamSlug) {
    const key = createKey(normalizedPlayer, slugify(teamSlug));
    const matches = stickerIndex.get(key);
    if (matches && matches.length > 0) {
      return matches;
    }
  }
  return playerIndex.get(normalizedPlayer) || [];
}

function createKey(playerSlug: string, teamSlug: string) {
  return `${slugify(playerSlug)}__${slugify(teamSlug)}`;
}

function slugify(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildFullPath(collectionId: number, stickerNumber: number, stickerId: number) {
  return `sticker-images/${collectionId}/${stickerNumber}-${stickerId}.webp`;
}

function buildThumbPath(collectionId: number, stickerNumber: number, stickerId: number) {
  return `sticker-images/${collectionId}/thumbs/${stickerNumber}-${stickerId}.webp`;
}

async function pushToStorage({
  supabase,
  bucketName,
  sourcePath,
  targetPath,
  contentType,
  upsert,
}: {
  supabase: Supabase;
  bucketName: string;
  sourcePath: string;
  targetPath: string;
  contentType: string;
  upsert: boolean;
}) {
  const buffer = await fs.promises.readFile(sourcePath);
  const { error } = await supabase.storage.from(bucketName).upload(targetPath, buffer, {
    contentType,
    upsert,
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function updateStickerPaths({
  supabase,
  stickerId,
  targetPath,
  isThumb,
}: {
  supabase: Supabase;
  stickerId: number;
  targetPath: string;
  isThumb: boolean;
}) {
  const updatePayload: StickerUpdate = isThumb
    ? { thumb_path_webp_100: targetPath }
    : { image_path_webp_300: targetPath };
  const { error } = await supabase
    .from('stickers')
    // @ts-expect-error: Supabase update typing does not accept narrow payloads
    .update(updatePayload)
    .eq('id', stickerId);
  if (error) {
    throw new Error(error.message);
  }
}

function inferMimeType(ext: string) {
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'image/webp';
  }
}

function logAction({
  action,
  file,
  sticker,
  targetPath,
  variant,
}: {
  action: string;
  file: string;
  sticker: StickerMatch;
  targetPath: string;
  variant: 'full' | 'thumb';
}) {
  const label = describeSticker(sticker);
  log(`${action}: ${file} -> ${targetPath} (${variant}) [${label}]`);
}

function describeSticker(match: StickerMatch) {
  const code = match.sticker.code || 'n/a';
  const number = match.sticker.sticker_number ?? 'no-number';
  const player = match.sticker.player_name;
  const team = match.teamLabel || 'Special';
  return `${player} (${team}) #${number} [${code}]`;
}

function log(message: string) {
  console.log(`[backfill] ${message}`);
}

function summarize(counters: ProcessCounters, dryRun: boolean) {
  log('--- Backfill summary ---');
  log(`Files considered: ${counters.total}`);
  log(`Full uploads: ${counters.uploadedFull}`);
  log(`Thumb uploads: ${counters.uploadedThumb}`);
  log(`Skipped (existing): ${counters.skipped}`);
  log(`Dry-run skips: ${counters.drySkipped}`);
  log(`Ambiguous matches: ${counters.ambiguous}`);
  log(`No matches: ${counters.unmatched}`);
  log(`Failures: ${counters.failed}`);
  log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`);
}
