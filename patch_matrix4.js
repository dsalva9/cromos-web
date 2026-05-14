const fs = require('fs');

const filePath = 'src/components/settings/NotificationSettingsTab.tsx';
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes("import { useTranslations } from 'next-intl';")) {
  content = content.replace(
    "import { logger } from '@/lib/logger';",
    "import { logger } from '@/lib/logger';\nimport { useTranslations } from 'next-intl';"
  );
}

if (!content.includes("const t = useTranslations('settings');")) {
  content = content.replace(
    "export function NotificationSettingsTab() {",
    "export function NotificationSettingsTab() {\n  const t = useTranslations('settings');"
  );
}

content = content.replace(/'Error al cargar las preferencias'/g, "t('notifications.messages.errorLoad')");
content = content.replace(/'Preferencias actualizadas correctamente'/g, "t('notifications.messages.success')");
content = content.replace(/'Error al guardar las preferencias'/g, "t('notifications.messages.errorSave')");

fs.writeFileSync(filePath, content);
console.log('Fixed NotificationSettingsTab.tsx');
