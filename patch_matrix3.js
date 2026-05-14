const fs = require('fs');

const filePath = 'src/components/settings/NotificationPreferencesMatrix.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add useTranslations import
if (!content.includes("import { useTranslations } from 'next-intl';")) {
  content = content.replace(
    "import { toggleNotificationPreference } from '@/lib/supabase/notification-preferences';",
    "import { toggleNotificationPreference } from '@/lib/supabase/notification-preferences';\nimport { useTranslations } from 'next-intl';"
  );
}

// 2. Add const t = useTranslations('settings');
if (!content.includes("const t = useTranslations('settings');")) {
  content = content.replace(
    "}: NotificationPreferencesMatrixProps) {",
    "}: NotificationPreferencesMatrixProps) {\n  const t = useTranslations('settings');"
  );
}

// 3. Replace CHANNELS
content = content.replace(
  /const CHANNELS: \{ id: NotificationChannel; label: string; icon: typeof Bell; color: string \}\[\] = \[\r?\n  \{ id: 'in_app', label: 'En la App', icon: Bell, color: 'blue' \},\r?\n  \{ id: 'push', label: 'Push', icon: Smartphone, color: 'purple' \},\r?\n  \{ id: 'email', label: 'Email', icon: Mail, color: 'orange' \},\r?\n\];/,
  "const getChannels = (t: any): { id: NotificationChannel; label: string; icon: typeof Bell; color: string }[] => [\n  { id: 'in_app', label: t('notifications.channels.in_app'), icon: Bell, color: 'blue' },\n  { id: 'push', label: t('notifications.channels.push'), icon: Smartphone, color: 'purple' },\n  { id: 'email', label: t('notifications.channels.email'), icon: Mail, color: 'orange' },\n];"
);

// 4. Update usage of CHANNELS
content = content.replace(/\{CHANNELS\.map\(/g, '{getChannels(t).map(');
content = content.replace(/CHANNELS\.map\(/g, 'getChannels(t).map(');

// 5. Replace hardcoded strings
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
content = content.replace(/\`\$\{[\s\S]*?localPreferences\[channel\]\[config\.kind\] \? 'Desactivar' : 'Activar'[\s\S]*?\} \$\{config\.label\} para \$\{channel\}\`/g, "`\${localPreferences[channel][config.kind] ? t('notifications.matrix.aria.disable') : t('notifications.matrix.aria.enable')} \${t(\`notifications.types.\${config.kind}.label\`)} \${t('notifications.matrix.aria.for')} \${channel}`");
content = content.replace(/>No disponible<\/span>/g, `>{t('notifications.matrix.notAvailable')}</span>`);

fs.writeFileSync(filePath, content);
console.log('Fixed NotificationPreferencesMatrix.tsx');
