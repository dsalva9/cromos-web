const fs = require('fs');

const filePath = 'src/components/settings/ThemeSettingsSection.tsx';
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes("import { useTranslations } from 'next-intl';")) {
  content = content.replace(
    "import { Sun, Moon, Monitor } from 'lucide-react';",
    "import { Sun, Moon, Monitor } from 'lucide-react';\nimport { useTranslations } from 'next-intl';"
  );
}

if (!content.includes("const t = useTranslations('settings');")) {
  content = content.replace(
    "export function ThemeSettingsSection() {",
    "export function ThemeSettingsSection() {\n  const t = useTranslations('settings');"
  );
}

content = content.replace(/label: 'Claro'/g, "label: t('theme.light')");
content = content.replace(/label: 'Oscuro'/g, "label: t('theme.dark')");
content = content.replace(/label: 'Sistema'/g, "label: t('theme.system')");
content = content.replace(/>\s*Apariencia\s*<\/h2>/g, ">{t('theme.title')}</h2>");
content = content.replace(/>\s*Personaliza cómo se ve la aplicación\.\s*<\/p>/g, ">{t('theme.description')}</p>");

fs.writeFileSync(filePath, content);
console.log('Fixed ThemeSettingsSection.tsx');
