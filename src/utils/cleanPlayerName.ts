/**
 * Strips the parenthesized country name suffix from a player label (e.g., "Nicolas Jackson (Senegal)")
 * when it matches the team/country group name.
 */
export function cleanPlayerName(label: string, teamName?: string): string {
  if (!label) return '';
  if (!teamName) return label;
  
  const suffix = ` (${teamName})`;
  if (label.endsWith(suffix)) {
    return label.slice(0, -suffix.length);
  }
  return label;
}
