/* eslint-disable */
// Run: node scripts/add-nav-translations.js
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/i18n/messages');

const es = JSON.parse(fs.readFileSync(path.join(dir, 'es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));
const pt = JSON.parse(fs.readFileSync(path.join(dir, 'pt.json'), 'utf8'));

// ─── navigation namespace ─────────────────────────────────────────────────────
es.navigation.faq = 'FAQ';
es.navigation.contact = 'Contacto';
es.navigation.about = 'Sobre Nosotros';

en.navigation.faq = 'FAQ';
en.navigation.contact = 'Contact';
en.navigation.about = 'About Us';

pt.navigation.faq = 'FAQ';
pt.navigation.contact = 'Contato';
pt.navigation.about = 'Sobre Nós';

// ─── FAQ downloadTitle key ────────────────────────────────────────────────────
es.legal.faq.downloadTitle = 'Descarga la app';
en.legal.faq.downloadTitle = 'Download the app';
pt.legal.faq.downloadTitle = 'Descarregar a app';

// ─── Write ────────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(dir, 'es.json'), JSON.stringify(es, null, 2), 'utf8');
fs.writeFileSync(path.join(dir, 'en.json'), JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync(path.join(dir, 'pt.json'), JSON.stringify(pt, null, 2), 'utf8');
console.log('Done.');
