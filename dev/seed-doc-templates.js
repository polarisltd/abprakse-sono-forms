/**
 * One-off seed for the six rich-text document templates transcribed from the
 * practice's reference photos — see specs/feature-document-templates.md §12.
 *
 * Posts to a running dev server's /api/doc-templates (so the same
 * sanitize-on-write path every other write goes through also covers this),
 * rather than inserting rows directly. Safe to re-run — it does not check
 * for existing templates with the same name, so re-running creates
 * duplicates; delete the old ones first via /admin/templates if re-seeding.
 *
 * Run with:  BASE_URL=http://localhost:3000 node dev/seed-doc-templates.js
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const TEMPLATES = [
  {
    name: 'Vēdera dobuma orgānu ultrasonogrāfija',
    body_html: `
<p><b>Aknas</b> gludas, struktūra homogēna, ehogenitāte neizmainīta. Perekļainas izmaiņas neredz.</p>
<p>Intrahepatiskie žultsvadi nav dilatēti, kopējais žultsvads – n.</p>
<p><b>Žultspūslis</b> parasta lieluma, ovālas formas. Sieniņa plāna, gluda, bez ehogēna satura.</p>
<p><b>Aizkuņģa dziedzeris</b> gludām kontūrām, homogēns, ehogenitāte neizmainīta, patoloģiskus defektus neredz.</p>
<p><b>Labā niere</b> cm, gludas kontūras, slāņu attiecības pareizas, parenhīmas ehogenitāte neizmainīta.</p>
<p><b>Kreisā niere</b> cm, gludas kontūras, slāņu attiecības pareizas, parenhīmas ehogenitāte neizmainīta.</p>
<p>Konkrementus nierēs pārliecinoši neredz, urīna atteces traucējumu nav.</p>
<p><b>Liesa</b> parasta lieluma cm, gluda homogēna.</p>
<p><b>Urīnpūslis</b> gludu sienu, bez ehogēna satura.</p>
<p><b>Prostata</b> cm, V- cm, gluda, homogēna, ehogenitāte neizmainīta.</p>
<p><b>Slēdziens:</b></p>
`.trim(),
  },
  {
    name: 'VAIROGDZIEDZERA ULTRASONOGRĀFIJA',
    body_html: `
<p>LOB.DXT.: cm, gar cm.</p>
<p>LOB.SIN.: cm, gar cm.</p>
<p><b>Lokalizācija</b> – tipiska</p>
<p><b>Kontūras</b> – gludas</p>
<p><b>Forma</b> – parasta</p>
<p><b>Ehogenitāte</b> – izoehogēna</p>
<p><b>Struktūra</b> – homogēna</p>
<p><b>Mezgli</b> – </p>
<p>Epitēlijķermenīšus tipiskās vietās neredz.</p>
<p>Kakla rajona limfmezgli nav palielināti.</p>
<p><b>Slēdziens:</b></p>
`.trim(),
  },
  {
    name: 'Vairogdziedzera US.',
    body_html: `
<p>Vairogdziedzeris parastas lokalizācijas, lieluma.</p>
<p><b>Labā daiva</b></p>
<p><b>Isthmus</b></p>
<p><b>Kreisā daiva</b></p>
<p>Struktūra homogēna, vaskularizācija parasta, mezglus nevizualizē.</p>
<p>Palielinātus l/m kakla rajonā nevizualizē.</p>
<p>Izmainītas ehostruktūras epitēlijķermenīšu vizualizācijas vietās nevizualizē.</p>
<p><b>Slēdziens:</b></p>
`.trim(),
  },
  {
    name: 'Vēdera dobuma US.',
    body_html: `
<p><b>AKNA:</b> akna gludu kontūru, homogēna, struktūra neizmainīta.</p>
<p><b>ŽULTSPŪSLIS:</b> ar plānu, gludu sieniņu, bez ehogēna satura.</p>
<p><b>AIZKUŅĢA DZIEDZERIS:</b> homogēns, struktūra neizmainīta.</p>
<p><b>LIESA:</b> parastas lokalizācijas, homogēna.</p>
<p><b>NIERES:</b> parastas lokalizācijas, lieluma, kontūras samērā gludas, parenhīmas attiecības saglabātas, konkrementus un atteces traucējumus nevizualizē.</p>
<p><b>URĪNPŪSLIS:</b> pildīts – sieniņa plāna, gluda, bez ehogēna satura.</p>
<p><b>SLĒDZIENS:</b></p>
`.trim(),
  },
  {
    name: 'Gūžu locītavu US.',
    body_html: `
<p>Abas gūžu locītavas centrētas, kaulu jumti abās locītavās labi diferencējas, konturētas, skrimšļa jumti sedz femur galviņas. Pārkaulošanās kodoli abās gūžu locītavās iezīmējas vāji.</p>
<p><b>Sin.</b> alfa grādi, beta grādi — atbilst IA tipam</p>
<p><b>Dxt.</b> alfa grādi, beta grādi — atbilst IA tipam</p>
<p><b>SLĒDZIENS:</b> US atrade atbilst vecuma normai.</p>
`.trim(),
  },
  {
    name: 'Neirosonoskopija.',
    body_html: `
<p>Smadzeņu struktūras diferencējas labi.</p>
<p>VLA sin. = dxt. – spraugveida.</p>
<p>VLP sin. = dxt. – mm.</p>
<p>VT – mm.</p>
<p>VQ – mm   CM – mm.</p>
<p>F – mm.</p>
<p>Ventrikulārais indekss – %.</p>
<p>Corpus collosum – mm.</p>
<p><b>SLĒDZIENS:</b> US atrade bez patoloģiskām izmaiņām.</p>
`.trim(),
  },
];

async function main() {
  for (const tpl of TEMPLATES) {
    const res = await fetch(`${BASE_URL}/api/doc-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tpl),
    });
    if (!res.ok) {
      console.error(`FAILED: ${tpl.name} — ${res.status} ${await res.text()}`);
      continue;
    }
    const created = await res.json();
    console.log(`OK: ${tpl.name} (id ${created.id})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
