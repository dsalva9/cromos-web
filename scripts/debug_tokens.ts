
import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');

const pdfPath = path.join(process.cwd(), 'tests', 'checklist_axl25-26.pdf');

async function debugTokens() {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const lines = data.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l);

    const isPosition = (l: string) => /^(C|P|D|M|DE)$/.test(l);
    const parseItem = (l: string) => l.match(/^(\d+)\s+(.+)$/);

    for (let i = 0; i < Math.min(200, lines.length); i++) {
        const line = lines[i];
        if (isPosition(line)) console.log(`POS: ${line}`);
        else if (parseItem(line)) console.log(`ITEM: ${line}`);
        else console.log(`TEXT: ${line}`);
    }
}

debugTokens().catch(console.error);
