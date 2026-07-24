import './domstub.mjs';
import fs from 'node:fs';
import { app, Node } from './domstub.mjs';

const B = '/home/claude/studio/js/';
const { loadProjectZip, data, changedFiles, collect, exportZip, edit } = await import(B + 'store.js');
const editors = await import(B + 'editors.js');
const { renderHotspots } = await import(B + 'hotspots.js');
const { renderPreview, matchReason } = await import(B + 'preview.js');
const { renderChanges, renderCode } = await import(B + 'changes.js');

const zip = fs.readFileSync('/mnt/user-data/uploads/deepfake-main_7_.zip');
await loadProjectZip(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength), 'deepfake-main_7_.zip');
const d = data();
console.log(`geladen: ${d.posts.length} Beiträge, ${d.tasks.length} Aufgaben, ${d.profiles.length} Profile, ` +
  `${Object.keys(d.reason.concepts).length} Begründungen, ${Object.keys(d.hotspots).length} Bildzonen`);

const views = [
  ['Beiträge', editors.renderPosts],
  ['Aufgaben', editors.renderTasks],
  ['Begründungen', editors.renderReasons],
  ['Bildzonen', renderHotspots],
  ['Profile', editors.renderProfiles],
  ['Einstellungen', editors.renderSettings],
  ['Testansicht', renderPreview],
  ['Änderungen', renderChanges],
  ['Codeansicht', renderCode],
];

let failed = 0;
for (const [name, render] of views) {
  const root = new Node('main');
  root.className = 'work';
  try {
    render(root);
    const n = root._all().length;
    if (n < 5) { console.log(`  FEHLER ${name}: fast leer (${n} Knoten)`); failed++; }
    else console.log(`  ok  ${name.padEnd(14)} ${n} Elemente`);
  } catch (e) {
    console.log(`  FEHLER ${name}: ${e.message}`);
    console.log(e.stack.split('\n').slice(1, 3).join('\n'));
    failed++;
  }
}

/* --- Alle Einträge einzeln durchklicken --- */
console.log('\nJeden Beitrag einzeln öffnen:');
const sel = editors.getSelection();
let clickFail = 0;
for (let i = 0; i < d.posts.length; i++) {
  sel.posts = i; sel.tasks = i; sel.reasons = i;
  for (const [name, render] of views.slice(0, 5)) {
    const root = new Node('main'); root.className = 'work';
    try { render(root); } catch (e) { console.log(`  FEHLER ${name} bei Index ${i}: ${e.message}`); clickFail++; }
  }
}
console.log(clickFail ? `  ${clickFail} Fehler` : `  alle ${d.posts.length} Einträge in 5 Ansichten fehlerfrei`);

/* --- Bewertung prüfen --- */
console.log('\nBewertung der Begründungen:');
const cases = [
  ['post_104', 'das bild ist ki generiert', true],
  ['post_104', 'die quelle sagt was anderes', true],
  ['post_104', 'sus', false],
  ['post_103', 'auch vom ministerium', true],
  ['post_106', 'offizielle quelle der stadt', true],
];
for (const [id, answer, expect] of cases) {
  const r = matchReason(id, answer);
  const mark = r.matched === expect ? 'ok ' : 'FEHLER';
  console.log(`  ${mark} ${id} · "${answer}" → ${r.matched ? 'Punkt' : 'kein Punkt'}${r.via ? ` (über "${r.via}")` : ''}`);
  if (r.matched !== expect) failed++;
}

/* --- Änderung vornehmen und Spur prüfen --- */
console.log('\nÄnderung und Änderungsspur:');
console.log('  vorher geändert:', changedFiles().length, 'Dateien');
edit(() => {
  d.posts[0].likes = 9999;
  d.tasks[0].correctVerdict = 'suspekt';
  d.reason.concepts[d.tasks[0].postId].verdict = 'suspekt';
});
const changed = changedFiles();
console.log('  nachher:', changed.map(f => `${f.path} (+${f.lines.added} −${f.lines.removed})`).join(', '));
if (changed.length !== 3) { console.log('  FEHLER: erwartet 3 Dateien'); failed++; }

/* --- Export prüfen --- */
const blob = await exportZip();
console.log(`\nExport: ZIP mit ${(blob.size / 1048576).toFixed(1)} MB gebaut`);
const { readZip, entryText } = await import(B + 'zip.js');
const back = await readZip(await blob.arrayBuffer());
const posts = JSON.parse(await entryText(back.get('deepfake-main/content/posts.json')));
console.log('  Änderung in der ZIP enthalten:', posts[0].likes === 9999);
if (posts[0].likes !== 9999) failed++;

const rcText = await entryText(back.get('deepfake-main/src/data/reasonConcepts.js'));
fs.writeFileSync('/tmp/rc_export.mjs', rcText);
console.log('  reasonConcepts.js in der ZIP:', rcText.length, 'Zeichen');

console.log(failed ? `\n${failed} FEHLER` : '\nAlles fehlerfrei durchgelaufen.');
process.exit(failed ? 1 : 0);
