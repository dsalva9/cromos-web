
import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');

const pdfPath = path.join(process.cwd(), 'tests', 'checklist_axl25-26.pdf');

interface Slot {
    number: number;
    name: string;
    position?: string;
}

const POSITION_MAP: Record<string, string> = {
    'P': 'Portero',
    'D': 'Defensa',
    'M': 'Centrocampista',
    'DE': 'Delantero',
    'C': 'Escudo',
};

const GROUPS = [
    { name: "D. ALAVÉS", range: [1, 18], isTeam: true },
    { name: "ATHLETIC CLUB", range: [19, 36], isTeam: true },
    { name: "ATLÉTICO DE MADRID", range: [37, 54], isTeam: true },
    { name: "FC BARCELONA", range: [55, 72], isTeam: true },
    { name: "REAL BETIS", range: [73, 90], isTeam: true },
    { name: "RC CELTA", range: [91, 108], isTeam: true },
    { name: "ELCHE CF", range: [109, 126], isTeam: true },
    { name: "RCD ESPANYOL", range: [127, 144], isTeam: true },
    { name: "GETAFE CF", range: [145, 162], isTeam: true },
    { name: "GIRONA FC", range: [163, 180], isTeam: true },
    { name: "LEVANTE UD", range: [181, 198], isTeam: true },
    { name: "REAL MADRID", range: [199, 216], isTeam: true },
    { name: "RCD MALLORCA", range: [217, 234], isTeam: true },
    { name: "CA OSASUNA", range: [235, 252], isTeam: true },
    { name: "REAL OVIEDO", range: [253, 270], isTeam: true },
    { name: "RAYO VALLECANO", range: [271, 288], isTeam: true },
    { name: "REAL SOCIEDAD", range: [289, 306], isTeam: true },
    { name: "SEVILLA FC", range: [307, 324], isTeam: true },
    { name: "VALENCIA CF", range: [325, 342], isTeam: true },
    { name: "VILLARREAL CF", range: [343, 360], isTeam: true },
    { name: "¡VAMOS!", range: [361, 380] },
    { name: "GUANTES DE ORO", range: [381, 387] },
    { name: "KRYPTONITA", range: [388, 396] },
    { name: "DIAMANTES", range: [397, 414] },
    { name: "INFLUENCERS", range: [415, 423] },
    { name: "PROTAS", range: [424, 441] },
    { name: "SUPER CRACKS", range: [442, 467] },
    { name: "CARD CHAMPIONS", range: [468, 468] },
    { name: "BALÓN DE ORO", range: [469, 474] },
    { name: "BALÓN DE ORO EXCELLENCE", range: [475, 475] },
    { name: "CARD ATÓMICA", range: [476, 476] },
    { name: "CARD INVENCIBLE", range: [477, 477] },
    { name: "CAMPEÓN CARD", range: [478, 478] }
];

async function parseChecklist() {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const rawLines = data.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l);

    const isPosition = (l: string) => /^(C|P|D|M|DE)$/.test(l);
    const parseItem = (l: string) => {
        const match = l.match(/^(\d+)\s+(.+)$/);
        if (!match) return null;
        const num = parseInt(match[1]);
        const name = match[2];
        if (num > 478) return null;
        if (name.toLowerCase().includes('card') && !['CHAMPIONS', 'ATÓMICA', 'INVENCIBLE', 'CAMPEÓN'].some(k => name.toUpperCase().includes(k))) {
            // Filter out junk lines like "2 cards..."
            if (name.toLowerCase().includes('cards m') || name.toLowerCase().includes('cards p')) return null;
        }
        return { number: num, name: name.toUpperCase() };
    };

    const allItems: Slot[] = [];
    const allPos: string[] = [];

    for (const line of rawLines) {
        if (isPosition(line)) {
            allPos.push(line);
        } else {
            const itm = parseItem(line);
            if (itm) {
                // Ensure we don't add duplicates (like the "2" in junk text)
                if (!allItems.find(a => a.number === itm.number)) {
                    allItems.push(itm);
                }
            }
        }
    }

    allItems.sort((a, b) => a.number - b.number);
    console.log(`Extracted ${allItems.length} unique items and ${allPos.length} positions.`);

    let pIdx = 5; // Skip legend
    const resultPages: any[] = [];

    GROUPS.forEach(group => {
        const pageSlots: any[] = [];
        const items = allItems.filter(i => i.number >= group.range[0] && i.number <= group.range[1]);

        if (group.name === '¡VAMOS!') {
            items.forEach(itm => pageSlots.push({ ...itm, position: "" }));
        } else {
            let countToConsume = items.length;
            let prependC = false;
            if (group.isTeam && items[0].name === 'ESCUDO' && allPos[pIdx] === 'P') {
                prependC = true;
                countToConsume = items.length - 1;
            }

            const posToUse = prependC ? ['C'] : [];
            for (let k = 0; k < countToConsume; k++) {
                if (pIdx < allPos.length) {
                    posToUse.push(allPos[pIdx]);
                    pIdx++;
                }
            }

            items.forEach((itm, idx) => {
                pageSlots.push({
                    ...itm,
                    position: idx < posToUse.length ? POSITION_MAP[posToUse[idx]] || posToUse[idx] : ""
                });
            });
        }
        resultPages.push({ name: group.name, slots: pageSlots });
    });

    fs.writeFileSync('checklist_data.json', JSON.stringify(resultPages, null, 2));

    // SQL Generator
    const COLLECTION_ID = 63;
    let sql = `-- Seed data for Collection 63 (FIXED POSITIONS & GROUPING)\n`;
    sql += `DELETE FROM template_slots WHERE template_id = ${COLLECTION_ID};\n`;
    sql += `DELETE FROM template_pages WHERE template_id = ${COLLECTION_ID};\n\n`;

    resultPages.forEach((page, pageIdx) => {
        const title = page.name.replace(/'/g, "''");
        const pageNum = pageIdx + 1;

        sql += `WITH new_page AS (\n`;
        sql += `  INSERT INTO template_pages (template_id, page_number, title, slots_count)\n`;
        sql += `  VALUES (${COLLECTION_ID}, ${pageNum}, '${title}', ${page.slots.length})\n`;
        sql += `  RETURNING id\n`;
        sql += `)\n`;
        sql += `INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)\n`;
        sql += `VALUES \n`;

        const slotValues = page.slots.map((slot: any) => {
            const label = slot.name.replace(/'/g, "''");
            // Use "Posición" (with accent) to match the expected CustomField name in UI
            // And store the LETTER as well? User said "(P, D, M, DE)".
            // Let's store the full name but ensure the key is right.
            const dataJson = slot.position ? JSON.stringify({ "Posición": slot.position }) : '{}';
            return `  (${COLLECTION_ID}, (SELECT id FROM new_page), ${slot.number}, '${label}', '${dataJson}'::jsonb, false)`;
        });
        sql += slotValues.join(',\n') + ';\n\n';
    });

    // Schema update
    sql += `UPDATE collection_templates\n`;
    sql += `SET item_schema = '[{"name": "Número", "type": "number", "required": false}, {"name": "Nombre", "type": "text", "required": false}, {"name": "Posición", "type": "text", "required": false}]'::jsonb\n`;
    sql += `WHERE id = ${COLLECTION_ID};\n`;

    fs.writeFileSync('seed_collection_63.sql', sql);
    console.log(`Generated seed_collection_63.sql with ${resultPages.length} pages.`);
}

parseChecklist().catch(console.error);
