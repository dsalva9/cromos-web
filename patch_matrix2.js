const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/settings/NotificationPreferencesMatrix.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const search1 = `import { toggleNotificationPreference } from '@/lib/supabase/notification-preferences';`;
const replace1 = `import { toggleNotificationPreference } from '@/lib/supabase/notification-preferences';
import { useTranslations } from 'next-intl';`;

const search2 = `export function NotificationPreferencesMatrix({
  preferences,
  onSave,
  saving,
}: NotificationPreferencesMatrixProps) {`;

const replace2 = `export function NotificationPreferencesMatrix({
  preferences,
  onSave,
  saving,
}: NotificationPreferencesMatrixProps) {
  const t = useTranslations('settings');`;

const search3 = `const CHANNELS: { id: NotificationChannel; label: string; icon: typeof Bell; color: string }[] = [
  { id: 'in_app', label: 'En la App', icon: Bell, color: 'blue' },
  { id: 'push', label: 'Push', icon: Smartphone, color: 'purple' },
  { id: 'email', label: 'Email', icon: Mail, color: 'orange' },
];`;

const replace3 = `const getChannels = (t: any): { id: NotificationChannel; label: string; icon: typeof Bell; color: string }[] => [
  { id: 'in_app', label: t('notifications.channels.in_app'), icon: Bell, color: 'blue' },
  { id: 'push', label: t('notifications.channels.push'), icon: Smartphone, color: 'purple' },
  { id: 'email', label: t('notifications.channels.email'), icon: Mail, color: 'orange' },
];`;

content = content.replace(search1, replace1);
content = content.replace(search2, replace2);
// The rest can use regex or string replacements, but they shouldn't cross multiple lines to avoid CRLF issues
content = content.replace(search3, replace3);
content = content.replace(/\{CHANNELS\.map\(/g, '{getChannels(t).map(');
content = content.replace(/CHANNELS\.map\(/g, 'getChannels(t).map(');
content = content.replace(/>\s*Restaurar valores por defecto\s*<\/button>/g, `>{t('notifications.matrix.restore')}</button>`);
content = content.replace(/>\s*Cancelar\s*<\/button>/g, `>{t('notifications.matrix.cancel')}</button>`);
content = content.replace(/>\s*Guardando\.\.\.\s*<\//g, `>{t('notifications.matrix.saving')}</`);
content = content.replace(/>\s*Guardar cambios\s*<\/button>/g, `>{t('notifications.matrix.save')}</button>`);
content = content.replace(/>\s*Tipo de Notificación\s*<\/th>/g, `>{t('notifications.matrix.type')}</th>`);
content = content.replace(/>\s*Desmarcar todas\s*<\//g, `>{t('notifications.matrix.uncheckAll')}</`);
content = content.replace(/>\s*Marcar todas\s*<\//g, `>{t('notifications.matrix.checkAll')}</`);
content = content.replace(/\{CATEGORY_INFO\[category\]\.label\}/g, "{t(`notifications.categories.${category}.label`)}");
content = content.replace(/\{config\.label\}/g, "{t(`notifications.types.${config.kind}.label`)}");
content = content.replace(/\{config\.description\}/g, "{t(`notifications.types.${config.kind}.description`)}");
// Replace complex multiline template string
content = content.replace(/\`\$\{[\s\S]*?localPreferences\[channel\]\[config\.kind\] \? 'Desactivar' : 'Activar'[\s\S]*?\} \$\{config\.label\} para \$\{channel\}\`/g, "`\${localPreferences[channel][config.kind] ? t('notifications.matrix.aria.disable') : t('notifications.matrix.aria.enable')} \${t(\`notifications.types.\${config.kind}.label\`)} \${t('notifications.matrix.aria.for')} \${channel}`");
content = content.replace(/>No disponible<\/span>/g, `>{t('notifications.matrix.notAvailable')}</span>`);

fs.writeFileSync(filePath, content);
console.log('Updated NotificationPreferencesMatrix.tsx');
