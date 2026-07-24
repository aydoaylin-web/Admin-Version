/* ===========================================================================
   Geaenderte Dateien.
   ---------------------------------------------------------------------------
   Zeigt genau, welche Dateien sich seit dem Laden geaendert haben, was darin
   anders ist, und bietet die beiden Wege nach GitHub an:
   Inhalt kopieren oder ZIP herunterladen.
   =========================================================================== */

import {
  changedFiles, diffLines, collect, exportZip, exportChangedOnly,
  markAsExported, getState, EDITABLE_FILES,
} from './store.js';
import { el, clear, button, copyText, download, toast } from './ui.js';

export function renderChanges(root) {
  clear(root);
  const files = changedFiles();
  const state = getState();

  root.append(el('div', 'page-head', [
    el('h2', null, 'Geänderte Dateien'),
    el('p', null,
      'Verglichen wird mit dem Stand beim Laden. Für GitHub hast du zwei Wege: ' +
      'einzelne Dateien kopieren oder das ganze Projekt als ZIP herunterladen.'),
  ]));

  /* --- Übersicht --- */
  const summary = el('div', 'summary-box');
  summary.append(el('div', null, [
    el('div', 'big', String(files.length)),
    el('span', 'chip', files.length === 1 ? 'Datei geändert' : 'Dateien geändert'),
  ]));
  const added = files.reduce((sum, f) => sum + f.lines.added, 0);
  const removed = files.reduce((sum, f) => sum + f.lines.removed, 0);
  summary.append(el('div', null, [
    el('div', 'big', `+${added} / −${removed}`),
    el('span', 'chip', 'Zeilen'),
  ]));

  const actions = el('div', 'row');
  actions.style.marginLeft = 'auto';
  actions.style.flex = '0 0 auto';

  actions.append(button('Ganzes Projekt als ZIP', 'btn dark', async () => {
    toast('ZIP wird gebaut …');
    const blob = await exportZip();
    download(blob, `${state.projectName}.zip`);
    toast('ZIP heruntergeladen');
  }));

  if (files.length) {
    actions.append(button('Nur geänderte Dateien als ZIP', 'btn', async () => {
      const blob = await exportChangedOnly();
      if (blob) download(blob, 'geaenderte-dateien.zip');
    }));
    actions.append(button('Als hochgeladen markieren', 'btn', () => {
      markAsExported();
      toast('Ausgangsstand neu gesetzt');
    }));
  }

  summary.append(actions);
  root.append(summary);

  /* --- Nichts geändert --- */
  if (!files.length) {
    root.append(el('div', 'empty', [
      el('p', null, 'Seit dem Laden hat sich nichts geändert.'),
      el('p', 'hint', 'Sobald du etwas bearbeitest, erscheint die Datei hier — ' +
        'und leuchtet oben in der Änderungsspur auf.'),
    ]));

    const all = el('div', 'card');
    all.append(el('h3', null, 'Dateien, die das Studio schreiben kann'));
    const list = el('div');
    for (const path of EDITABLE_FILES) {
      const line = el('div', 'file');
      const head = el('summary');
      head.style.cursor = 'default';
      head.append(el('span', null, path));
      const acts = el('div', 'acts');
      acts.append(button('Inhalt kopieren', 'btn small', () => {
        copyText(collect()[path], path);
      }));
      head.append(acts);
      line.append(head);
      list.append(line);
    }
    all.append(list);
    root.append(all);
    return;
  }

  /* --- Liste der Änderungen --- */
  for (const file of files) {
    const box = el('details', 'file');
    const head = el('summary');
    head.append(el('span', null, file.path));
    head.append(el('span', 'plus', `+${file.lines.added}`));
    head.append(el('span', 'minus', `−${file.lines.removed}`));

    const acts = el('div', 'acts');
    acts.append(button('Inhalt kopieren', 'btn small', event => {
      event.preventDefault();
      event.stopPropagation();
      copyText(file.after, file.path);
    }));
    acts.append(button('Datei laden', 'btn small', event => {
      event.preventDefault();
      event.stopPropagation();
      download(new Blob([file.after], { type: 'text/plain' }), file.path.split('/').pop());
    }));
    head.append(acts);
    box.append(head);

    const diff = el('pre', 'diff');
    for (const line of diffLines(file.before, file.after)) {
      if (line.type === 'gap') { diff.append(el('div', 'gap', '⋯')); continue; }
      const mark = line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' ';
      diff.append(el('div', line.type === 'same' ? '' : line.type, `${mark} ${line.text}`));
    }
    box.append(diff);
    root.append(box);
  }

  root.append(el('p', 'hint',
    'Zum Hochladen auf GitHub: in den passenden Ordner gehen, „Add file → Upload files", ' +
    'die Datei ablegen. Gleicher Name ersetzt die alte automatisch.'));
}

/* --------------------------------------------------------------------------
   Codeansicht: alle erzeugten Dateien im Rohtext
   -------------------------------------------------------------------------- */

export function renderCode(root) {
  clear(root);
  const generated = collect();
  const changed = new Set(changedFiles().map(f => f.path));

  root.append(el('div', 'page-head', [
    el('h2', null, 'Erzeugter Code'),
    el('p', null, 'Der genaue Inhalt, den das Studio schreibt. Zum Vergleichen oder direkten Kopieren.'),
  ]));

  for (const path of EDITABLE_FILES) {
    const box = el('details', 'file');
    const head = el('summary');
    head.append(el('span', null, path));
    if (changed.has(path)) head.append(el('span', 'plus', 'geändert'));
    const acts = el('div', 'acts');
    acts.append(button('Kopieren', 'btn small', event => {
      event.preventDefault();
      event.stopPropagation();
      copyText(generated[path], path);
    }));
    head.append(acts);
    box.append(head);

    const pre = el('pre', 'diff');
    const content = generated[path];
    const lines = content.split('\n');
    const shown = lines.slice(0, 400);
    for (const line of shown) pre.append(el('div', '', line));
    if (lines.length > shown.length) {
      pre.append(el('div', 'gap', `⋯ ${lines.length - shown.length} weitere Zeilen — „Kopieren" nimmt alles mit`));
    }
    box.append(pre);
    root.append(box);
  }
}
