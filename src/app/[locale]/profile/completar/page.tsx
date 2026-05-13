'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { AvatarPicker, AvatarSelection } from '@/components/profile/AvatarPicker';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { useRouter } from '@/hooks/use-router';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import { validatePostcode, getPostcodeRule } from '@/lib/validations/postcode';
import { InstallAppModal } from '@/components/pwa/InstallAppModal';
import { isWeb } from '@/lib/platform';
import { getSupportMailtoUrl } from '@/lib/utils';

function CompleteProfileContent() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const { profile, updateProfile, refresh, markComplete } = useProfileCompletion();
  const { enabled: multiCountryEnabled } = useFeatureFlag('multi_country');

  const [formNickname, setFormNickname] = useState('');
  const [formPostcode, setFormPostcode] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('ES');
  const [formAvatarPath, setFormAvatarPath] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const previewAvatarUrl = useMemo(
    () => resolveAvatarUrl(formAvatarPath, supabase),
    [formAvatarPath, supabase]
  );

  // Get postcode rules for the currently selected country
  const postcodeRule = useMemo(
    () => getPostcodeRule(formCountryCode),
    [formCountryCode]
  );

  // Seed form fields from ProfileCompletionProvider context (no extra query needed)
  useEffect(() => {
    if (!user || !profile) return;

    setFormNickname(profile.nickname ?? '');
    // Clear default/placeholder postcode so new users must enter their own
    const isDefaultPostcode = !profile.postcode || profile.postcode === '28001';
    setFormPostcode(isDefaultPostcode ? '' : (profile.postcode ?? ''));
    setFormCountryCode(profile.country_code ?? 'ES');
    setFormAvatarPath(profile.avatar_url ?? null);
    setLoadingProfile(false);
  }, [user, profile]);

  const handleAvatarSelection = (selection: AvatarSelection) => {
    if (selection.type === 'preset') {
      setFormAvatarPath(selection.value);
      setAvatarBlob(null);
    } else if (selection.type === 'upload') {
      setAvatarBlob({ blob: selection.value, fileName: selection.fileName });
      const previewUrl = URL.createObjectURL(selection.value);
      setFormAvatarPath(previewUrl);
    } else if (selection.type === 'remove') {
      setFormAvatarPath(null);
      setAvatarBlob(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const trimmedNickname = formNickname.trim();
    const trimmedPostcode = formPostcode.trim();

    if (!trimmedNickname) {
      setErrorMessage('El campo Usuario es obligatorio.');
      return;
    }

    if (trimmedNickname.toLowerCase() === 'sin nombre') {
      setErrorMessage('Elige un usuario distinto a "Sin nombre".');
      return;
    }

    if (trimmedNickname.toLowerCase().startsWith('pending_')) {
      setErrorMessage('Elige un nombre de usuario personalizado.');
      return;
    }

    if (!trimmedPostcode) {
      setErrorMessage(`El campo ${postcodeRule.label} es obligatorio.`);
      return;
    }

    if (!validatePostcode(trimmedPostcode, formCountryCode)) {
      setErrorMessage(`Introduce un ${postcodeRule.label} válido (ej: ${postcodeRule.placeholder}).`);
      return;
    }

    if (!formAvatarPath && !avatarBlob) {
      setErrorMessage('Selecciona un avatar para tu perfil.');
      return;
    }

    setErrorMessage(null);
    setSaving(true);

    try {
      // Ensure nickname is unique (case-insensitive)
      const { data: existingNickname, error: nicknameError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('nickname', trimmedNickname)
        .neq('id', user.id)
        .maybeSingle();

      if (nicknameError) {
        throw nicknameError;
      }

      if (existingNickname) {
        setErrorMessage('Ese usuario ya está en uso. Prueba con otro.');
        setSaving(false);
        return;
      }

      let finalAvatarPath = formAvatarPath;

      if (avatarBlob) {
        const storagePath = `avatars/${user.id}/${avatarBlob.fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(storagePath, avatarBlob.blob, {
            upsert: true,
            cacheControl: '3600',
            contentType: avatarBlob.blob.type,
          });

        if (uploadError) throw uploadError;

        finalAvatarPath = storagePath;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            nickname: trimmedNickname,
            postcode: trimmedPostcode,
            avatar_url: finalAvatarPath,
            country_code: formCountryCode,
          },
          { onConflict: 'id' }
        );

      if (updateError) {
        if ('code' in updateError && updateError.code === '23505') {
          setErrorMessage('Ese usuario ya está en uso. Prueba con otro.');
          setSaving(false);
          return;
        }
        throw updateError;
      }

      updateProfile({
        nickname: trimmedNickname,
        postcode: trimmedPostcode,
        avatar_url: finalAvatarPath,
        country_code: formCountryCode,
      });

      // Lock isComplete=true BEFORE navigating — prevents the guard from
      // redirecting back during the transient re-fetch period.
      markComplete();

      // Non-blocking refresh — the optimistic updateProfile + markComplete
      // are sufficient; the DB re-fetch can settle after navigation.
      refresh().catch(() => { /* swallow — data is already optimistic */ });

      toast.success('Perfil completado. ¡Bienvenido!');

      // On mobile web, show install modal before redirecting
      if (isWeb() && typeof window !== 'undefined' && window.innerWidth < 768) {
        setShowInstallModal(true);
      } else {
        router.push('/marketplace');
      }
    } catch (error) {
      logger.error('Error completing profile', error);

      // Extract user-friendly error from Supabase DB errors
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as { code: string; message?: string };
        if (dbError.code === 'P0001' && dbError.message?.toLowerCase().includes('postcode')) {
          setErrorMessage('El código postal introducido no es válido. Por favor, comprueba que es un código postal real.');
        } else if (dbError.code === '23505') {
          setErrorMessage('Ese usuario ya está en uso. Prueba con otro.');
        } else {
          setErrorMessage('profile_save_error');
        }
      } else {
        setErrorMessage('profile_save_error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto bg-white border-2 border-black rounded-xl shadow-xl p-8">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900">
              Completa tu perfil
            </h1>
            <p className="text-gray-600 mt-2">
              Necesitamos algunos datos básicos antes de que puedas usar todas las secciones de la app.
            </p>
          </header>

          {loadingProfile ? (
            <div className="h-64 flex items-center justify-center">
              <span className="text-gray-600">Cargando perfil...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Avatar</Label>
                <AvatarPicker
                  currentAvatarUrl={previewAvatarUrl}
                  onSelect={handleAvatarSelection}
                  uploading={saving && !!avatarBlob}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">Usuario</Label>
                <Input
                  id="nickname"
                  value={formNickname}
                  onChange={event => setFormNickname(event.target.value)}
                  maxLength={50}
                  placeholder="Tu nombre de usuario"
                  required
                  disabled={saving}
                />
              </div>

              {/* Country Picker — only shown when multi_country flag is enabled */}
              {multiCountryEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <select
                    id="country"
                    value={formCountryCode}
                    onChange={e => {
                      setFormCountryCode(e.target.value);
                      // Clear postcode when country changes since format is different
                      setFormPostcode('');
                      setErrorMessage(null);
                    }}
                    disabled={saving}
                    className="w-full rounded-md border-2 border-black bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                  >
                    {SUPPORTED_COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="postcode">{postcodeRule.label}</Label>
                <Input
                  id="postcode"
                  value={formPostcode}
                  onChange={event => setFormPostcode(event.target.value)}
                  maxLength={postcodeRule.maxLength}
                  placeholder={postcodeRule.placeholder}
                  inputMode={formCountryCode === 'AR' || formCountryCode === 'BR' ? 'text' : 'numeric'}
                  required
                  disabled={saving}
                />
                <p className="text-xs text-gray-600">
                  Usamos tu código postal para mostrar tu ubicación aproximada en intercambios.
                </p>
              </div>

              {errorMessage && (
                <div className="bg-red-600/80 border-2 border-black rounded-md px-4 py-3 text-sm font-bold text-white">
                  {errorMessage === 'profile_save_error' ? (
                    <>
                      No pudimos guardar tu perfil. Intenta nuevamente.
                      <br />
                      <br />
                      Por favor contacta con{' '}
                      <a
                        href={getSupportMailtoUrl()}
                        className="underline hover:text-gray-200"
                      >
                        soporte@cambiocromos.com
                      </a>
                    </>
                  ) : (
                    errorMessage
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  className="bg-gold text-gray-900 border-2 border-black hover:bg-yellow-400"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar y continuar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post-onboarding install modal */}
      <InstallAppModal
        open={showInstallModal}
        onClose={() => {
          setShowInstallModal(false);
          router.push('/marketplace');
        }}
      />
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <AuthGuard>
      <CompleteProfileContent />
    </AuthGuard>
  );
}
