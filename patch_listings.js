const fs = require('fs');

const file = 'src/app/[locale]/marketplace/my-listings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: SelectValue placeholder
content = content.replace(
  '<SelectValue placeholder="{t(\'selectStatus\')}" />',
  '<SelectValue placeholder={t(\'selectStatus\')} />'
);

// Fix 2: EmptyState props
content = content.replace(
  /title=t\('noActiveTitle'\)\s+description=t\('noActiveDesc'\)\s+actionLabel=t\('createFirst'\)/g,
  "title={t('noActiveTitle')}\n                  description={t('noActiveDesc')}\n                  actionLabel={t('createFirst')}"
);

fs.writeFileSync(file, content);
console.log('Fixed my-listings page.tsx');
