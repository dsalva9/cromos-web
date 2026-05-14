const fs = require('fs');

function fixPage() {
  let f = 'src/app/[locale]/marketplace/[id]/page.tsx';
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/'\{t\('notFoundDesc'\)\}'/g, "t('notFoundDesc')");
  fs.writeFileSync(f, c);
}

function fixChat() {
  let f = 'src/app/[locale]/marketplace/[id]/chat/page.tsx';
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/'\{t\('markReserved'\)\}'/g, "t('markReserved')");
  fs.writeFileSync(f, c);
}

fixPage();
fixChat();
