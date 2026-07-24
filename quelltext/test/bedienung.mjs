import './domstub.mjs';
import fs from 'node:fs';
import { Node } from './domstub.mjs';

const B = '/home/claude/studio/js/';
const store = await import(B + 'store.js');
const editors = await import(B + 'editors.js');
const { renderHotspots } = await import(B + 'hotspots.js');
const { parseReasonConcepts, parseImageHotspots } = await import(B + 'serialize.js');

const zip = fs.readFileSync('/mnt/user-data/uploads/deepfake-main_7_.zip');
await store.loadProjectZip(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));
const D = () => store.data();

let bad = 0;
const check = (label, ok, extra = '') => {
  console.log(`  ${ok ? 'ok    ' : 'FEHLER'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) bad++;
};

const draw = render => { const root = new Node('main'); root.className = 'work'; render(root); return root; };

/* ---- 1. Urteil umstellen zieht reasonConcepts mit ---- */
console.log('\nUrteil umstellen:');
editors.getSelection().tasks = 3;
let root = draw(editors.renderTasks);
const before = D().tasks[3].correctVerdict;
const taskPostId = D().tasks[3].postId;
const buttons = root.querySelectorAll('.verdicts')[0].children;
const target = [...buttons].find(b => b.dataset.v && b.dataset.v !== before);
target.click();
check('tasks.json geändert', D().tasks[3].correctVerdict === target.dataset.v, `${before} → ${D().tasks[3].correctVerdict}`);
check('reasonConcepts.js mitgezogen', D().reason.concepts[taskPostId].verdict === D().tasks[3].correctVerdict);
check('beide Dateien in der Änderungsspur',
  store.changedFiles().length === 2,
  store.changedFiles().map(f => f.path).join(', '));

/* ---- 2. Rückgängig ---- */
store.undo();
check('Rückgängig stellt beides zurück',
  D().tasks[3].correctVerdict === before && D().reason.concepts[taskPostId].verdict === before);
check('Änderungsspur wieder leer', store.changedFiles().length === 0);

/* ---- 3. Zweisprachiges Feld beschreiben ---- */
console.log('\nTexte bearbeiten:');
editors.getSelection().posts = 0;
root = draw(editors.renderPosts);
const areas = root.querySelectorAll('TEXTAREA');
areas[0].input('Neue deutsche Bildunterschrift');
check('deutscher Text gespeichert', JSON.stringify(D().posts[0].caption).includes('Neue deutsche'));
areas[1].input('New English caption');
check('englischer Text gespeichert', D().posts[0].caption.en === 'New English caption');
check('nur posts.json betroffen',
  store.changedFiles().length === 1 && store.changedFiles()[0].path === 'content/posts.json');

/* ---- 4. Kommentar anlegen und löschen ---- */
console.log('\nKommentare:');
const countBefore = D().posts[0].comments.length;
const addBtn = root._all().find(n => n.textContent === 'Kommentar hinzufügen');
addBtn.click();
check('Kommentar angelegt', D().posts[0].comments.length === countBefore + 1);
root = draw(editors.renderPosts);
// Löschen-Knopf gezielt aus der Kommentarkarte holen
const commentCard = root.querySelectorAll('.card').find(c => c.textContent.includes('Kommentar hinzufügen'));
const delBtn = commentCard._all().filter(n => n.textContent === 'Löschen').pop();
delBtn.click();
check('Kommentar gelöscht', D().posts[0].comments.length === countBefore);

/* ---- 5. Begriff zur Begründung hinzufügen ---- */
console.log('\nBegründungen:');
editors.getSelection().reasons = 0;
root = draw(editors.renderReasons);
const firstId = Object.keys(D().reason.concepts)[0];
const termsBefore = D().reason.concepts[firstId].concepts[0].terms.length;
const tagInputs = root.querySelectorAll('.tagbox').map(b => b.children[b.children.length - 1]);
const input = tagInputs.find(i => i.tagName === 'INPUT');
input.value = 'testbegriff';
for (const fn of input.listeners.keydown || []) fn({ key: 'Enter', preventDefault() {} });
check('Begriff aufgenommen',
  D().reason.concepts[firstId].concepts[0].terms.length === termsBefore + 1 ||
  D().reason.slangOnly.includes('testbegriff'));

/* ---- 6. Bildzone aufziehen ---- */
console.log('\nBildzonen:');
const postWithZones = Object.keys(D().hotspots).find(id => D().hotspots[id].hotspots);
const hotspotModule = await import(B + 'hotspots.js');
root = draw(renderHotspots);
// den Beitrag mit Zonen in der Liste anklicken
const listEntry = root.querySelector('.list')._all().find(n => n.textContent.includes(postWithZones));
listEntry?.click?.();
root = draw(renderHotspots);
const stage = root.querySelector('.stage');
const zonesBefore = D().hotspots[postWithZones]?.hotspots?.length ?? 0;
if (stage) {
  const fire = (type, x, y) => {
    for (const fn of stage.listeners[type] || []) fn({ clientX: x, clientY: y, pointerId: 1 });
  };
  fire('pointerdown', 40, 40);
  fire('pointermove', 200, 200);
  fire('pointerup', 200, 200);
  check('Zone durch Ziehen angelegt',
    (D().hotspots[postWithZones]?.hotspots?.length ?? 0) === zonesBefore + 1,
    `${zonesBefore} → ${D().hotspots[postWithZones]?.hotspots?.length}`);
} else {
  check('Bildfläche vorhanden', false);
}

/* ---- 7. Erzeugte Dateien bleiben gültig ---- */
console.log('\nErzeugte Dateien:');
const out = store.collect();
try { JSON.parse(out['content/posts.json']); check('posts.json gültiges JSON', true); }
catch (e) { check('posts.json gültiges JSON', false, e.message); }
try { JSON.parse(out['content/tasks.json']); check('tasks.json gültiges JSON', true); }
catch (e) { check('tasks.json gültiges JSON', false, e.message); }
try {
  const back = parseReasonConcepts(out['src/data/reasonConcepts.js']);
  check('reasonConcepts.js wieder lesbar', Object.keys(back.concepts).length === 18);
} catch (e) { check('reasonConcepts.js wieder lesbar', false, e.message); }
try {
  const back = parseImageHotspots(out['src/data/imageHotspots.js']);
  check('imageHotspots.js wieder lesbar', Object.keys(back).length >= 6);
} catch (e) { check('imageHotspots.js wieder lesbar', false, e.message); }

fs.writeFileSync('/tmp/out_rc.mjs', out['src/data/reasonConcepts.js']);
fs.writeFileSync('/tmp/out_hs.mjs', out['src/data/imageHotspots.js']);

console.log(bad ? `\n${bad} FEHLER` : '\nBedienung fehlerfrei.');
process.exit(bad ? 1 : 0);
