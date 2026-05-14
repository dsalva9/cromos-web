const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`No changes made to ${filePath}`);
    }
}

// 2.5 NotificationPreferencesMatrix.tsx
replaceInFile(path.join(__dirname, 'src/components/settings/NotificationPreferencesMatrix.tsx'), [
    [ /import \{ toggleNotificationPreference \} from '@\/lib\/supabase\/notification-preferences';/, `import { toggleNotificationPreference } from '@/lib/supabase/notification-preferences';\nimport { useTranslations } from 'next-intl';` ],
    [ /export function NotificationPreferencesMatrix\(\{\n  preferences,\n  onSave,\n  saving,\n\}: NotificationPreferencesMatrixProps\) \{/, `export function NotificationPreferencesMatrix({\n  preferences,\n  onSave,\n  saving,\n}: NotificationPreferencesMatrixProps) {\n  const t = useTranslations('settings');` ],
    [ /const CHANNELS: \{ id: NotificationChannel; label: string; icon: typeof Bell; color: string \}\[\] = \[\n  \{ id: 'in_app', label: 'En la App', icon: Bell, color: 'blue' \},\n  \{ id: 'push', label: 'Push', icon: Smartphone, color: 'purple' \},\n  \{ id: 'email', label: 'Email', icon: Mail, color: 'orange' \},\n\];/, `const getChannels = (t: any): { id: NotificationChannel; label: string; icon: typeof Bell; color: string }[] => [\n  { id: 'in_app', label: t('notifications.channels.in_app'), icon: Bell, color: 'blue' },\n  { id: 'push', label: t('notifications.channels.push'), icon: Smartphone, color: 'purple' },\n  { id: 'email', label: t('notifications.channels.email'), icon: Mail, color: 'orange' },\n];` ],
    [ /\{CHANNELS\.map\(/g, `{getChannels(t).map(` ],
    [ /CHANNELS\.map\(/g, `getChannels(t).map(` ],
    [ />\s*Restaurar valores por defecto\s*<\/button>/g, `>{t('notifications.matrix.restore')}</button>` ],
    [ />\s*Cancelar\s*<\/button>/g, `>{t('notifications.matrix.cancel')}</button>` ],
    [ />\s*Guardando\.\.\.\s*<\//g, `>{t('notifications.matrix.saving')}</` ],
    [ />\s*Guardar cambios\s*<\/button>/g, `>{t('notifications.matrix.save')}</button>` ],
    [ />\s*Tipo de Notificación\s*<\/th>/g, `>{t('notifications.matrix.type')}</th>` ],
    [ />\s*Desmarcar todas\s*<\//g, `>{t('notifications.matrix.uncheckAll')}</` ],
    [ />\s*Marcar todas\s*<\//g, `>{t('notifications.matrix.checkAll')}</` ],
    [ /\{CATEGORY_INFO\[category\]\.label\}/g, `{t(\`notifications.categories.\${category}.label\`)}` ],
    [ /\{config\.label\}/g, `{t(\`notifications.types.\${config.kind}.label\`)}` ],
    [ /\{config\.description\}/g, `{t(\`notifications.types.\${config.kind}.description\`)}` ],
    [ /\`\$\{[\s\S]*?localPreferences\[channel\]\[config\.kind\] \? 'Desactivar' : 'Activar'[\s\S]*?\} \$\{config\.label\} para \$\{channel\}\`/g, `\`\${localPreferences[channel][config.kind] ? t('notifications.matrix.aria.disable') : t('notifications.matrix.aria.enable')} \${t(\`notifications.types.\${config.kind}.label\`)} \${t('notifications.matrix.aria.for')} \${channel}\`` ],
    [ />No disponible<\/span>/g, `>{t('notifications.matrix.notAvailable')}</span>` ]
]);

console.log('Done!');
