/* ===========================================================================
   Zusammenbau: Startbildschirm, Navigation, Aenderungsspur.
   =========================================================================== */

import {
  loadProjectZip, isLoaded, data, subscribe, subscribeLive,
  undo, redo, canUndo, canRedo, changedFiles, exportZip,
  saveDraft, peekDraft, applyDraft, clearDraft, getState, EDITABLE_FILES,
} from './store.js';
import { el, clear, button, toast, download } from './ui.js';
import {
  renderPosts, renderTasks, renderReasons, renderProfiles, renderSettings,
} from './editors.js';
import { renderHotspots } from './hotspots.js';
import { renderPreview } from './preview.js';
import { renderChanges, renderCode } from './changes.js';

const SECTIONS = [
  { id: 'posts',    label: 'Beiträge',      render: renderPosts,    count: d => d.posts.length },
  { id: 'tasks',    label: 'Aufgaben',      render: renderTasks,    count: d => d.tasks.length },
  { id: 'reasons',  label: 'Begründungen',  render: renderReasons,  count: d => Object.keys(d.reason.concepts).length },
  { id: 'hotspots', label: 'Bildzonen',     render: renderHotspots, count: d => Object.keys(d.hotspots).length },
  { id: 'profiles', label: 'Profile',       render: renderProfiles, count: d => d.profiles.length },
  { id: 'settings', label: 'Einstellungen', render: renderSettings },
  { id: 'preview',  label: 'Testansicht',   render: renderPreview,  group: 2 },
  { id: 'changes',  label: 'Änderungen',    render: renderChanges,  group: 2 },
  { id: 'code',     label: 'Codeansicht',   render: renderCode,     group: 2 },
];

let current = 'posts';

/* ==========================================================================
   Startbildschirm
   ========================================================================== */

function showStart(errorMessage) {
  const app = document.getElementById('app');
  clear(app);
  app.className = 'start';

  const drop = el('div', 'drop', [
    el('p', null, 'Zieh die ZIP deines Projekts hierher'),
    el('p', 'path', 'deepfake-main.zip'),
  ]);

  const picker = el('input');
  picker.type = 'file';
  picker.accept = '.zip';
  picker.className = 'hidden';

  const pick = button('Datei auswählen', 'btn dark', () => picker.click());
  pick.style.marginTop = '14px';
  drop.append(pick, picker);

  const card = el('div', 'start-card', [
    el('h1', null, 'Admin Studio'),
    el('p', null, 'Deepfake Defender ohne Code bearbeiten.'),
    drop,
  ]);

  if (errorMessage) card.append(el('p', 'start-error', errorMessage));

  const draft = peekDraft();
  if (draft) {
    const when = new Date(draft.savedAt).toLocaleString('de-DE');
    card.append(el('p', 'start-note',
      `Es liegt ein gesicherter Arbeitsstand von ${when}. Lade dasselbe Projekt, ` +
      'dann kannst du ihn übernehmen.'));
  }

  card.append(el('p', 'start-note',
    'Alles läuft in diesem Browser. Es wird nichts hochgeladen und nichts an ' +
    'deinem Original verändert — du bekommst am Ende eine neue ZIP oder ' +
    'einzelne Dateien zum Kopieren.'));

  app.append(card);

  /* Ziehen und Ablegen */
  const stop = event => { event.preventDefault(); event.stopPropagation(); };
  for (const type of ['dragenter', 'dragover']) {
    drop.addEventListener(type, event => { stop(event); drop.classList.add('hot'); });
  }
  for (const type of ['dragleave', 'drop']) {
    drop.addEventListener(type, event => { stop(event); drop.classList.remove('hot'); });
  }
  drop.addEventListener('drop', event => {
    const file = event.dataTransfer?.files?.[0];
    if (file) open(file);
  });
  picker.addEventListener('change', () => {
    if (picker.files?.[0]) open(picker.files[0]);
  });
}

async function open(file) {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    showStart('Das ist keine ZIP-Datei. Lade das Projekt so, wie du es von GitHub herunterlädst.');
    return;
  }
  try {
    await loadProjectZip(await file.arrayBuffer(), file.name);
    buildShell();
    offerDraft();
  } catch (error) {
    showStart(error.message || 'Die Datei konnte nicht gelesen werden.');
  }
}

function offerDraft() {
  const draft = peekDraft();
  if (!draft) return;
  const when = new Date(draft.savedAt).toLocaleString('de-DE');
  if (confirm(`Gesicherter Arbeitsstand vom ${when} gefunden.\n\nÜbernehmen? ` +
    'Abbrechen behält den Stand aus der ZIP.')) {
    applyDraft(draft);
    toast('Arbeitsstand übernommen');
  } else {
    clearDraft();
  }
}

/* ==========================================================================
   Geruest
   ========================================================================== */

function buildShell() {
  const app = document.getElementById('app');
  clear(app);
  app.className = '';

  /* --- Kopfleiste --- */
  const top = el('header', 'top');
  const main = el('div', 'top-main');

  main.append(el('div', 'brand', [
    el('b', null, 'Admin Studio'),
    el('span', null, getState().projectName),
  ]));

  const undoBtn = button('Rückgängig', '', () => undo());
  const redoBtn = button('Wiederholen', '', () => redo());
  const saveBtn = button('Stand sichern', '', () => {
    toast(saveDraft() ? 'Im Browser gesichert' : 'Sichern nicht möglich');
  });
  const zipBtn = button('ZIP herunterladen', 'go', async () => {
    toast('ZIP wird gebaut …');
    const blob = await exportZip();
    download(blob, `${getState().projectName}.zip`);
    toast('ZIP heruntergeladen');
  });

  main.append(undoBtn, redoBtn, saveBtn, zipBtn);
  top.append(main);

  /* --- Aenderungsspur --- */
  const spur = el('div', 'spur');
  top.append(spur);

  /* --- Seitenleiste und Arbeitsflaeche --- */
  const shell = el('div', 'shell');
  const side = el('nav', 'side');
  const work = el('main', 'work');
  shell.append(side, work);

  app.append(top, shell);

  const drawSide = () => {
    clear(side);
    let group = 1;
    for (const section of SECTIONS) {
      if ((section.group || 1) !== group) { side.append(el('hr')); group = section.group; }
      const node = el('button', section.id === current ? 'on' : '');
      node.type = 'button';
      node.append(el('span', null, section.label));
      if (section.count && isLoaded()) node.append(el('span', 'tally', String(section.count(data()))));
      if (section.id === 'changes') {
        const count = changedFiles().length;
        if (count) {
          const badge = el('span', 'tally', `● ${count}`);
          badge.style.color = 'var(--spur)';
          node.append(badge);
        }
      }
      node.addEventListener('click', () => { current = section.id; drawSide(); drawWork(); });
      side.append(node);
    }
  };

  const drawWork = () => {
    const section = SECTIONS.find(s => s.id === current) || SECTIONS[0];
    section.render(work);
  };

  /* --- Aenderungsspur zeichnen ---
     Laeuft bei jedem Tastenanschlag mit, ohne die Editoren neu zu bauen. */
  const drawSpur = () => {
    const changed = new Map(changedFiles().map(f => [f.path, f.lines]));
    clear(spur);
    spur.append(el('span', 'spur-label', 'Dateien'));
    for (const path of EDITABLE_FILES) {
      const lines = changed.get(path);
      const item = el('span', lines ? 'spur-item on' : 'spur-item');
      item.append(el('span', 'dot'));
      item.append(el('span', null, path));
      if (lines) item.append(el('span', 'count', `+${lines.added} −${lines.removed}`));
      item.title = lines
        ? `${path} — ${lines.added} Zeilen dazu, ${lines.removed} weg`
        : `${path} — unverändert`;
      item.addEventListener('click', () => { current = 'changes'; drawSide(); drawWork(); });
      item.style.cursor = 'pointer';
      spur.append(item);
    }
    undoBtn.disabled = !canUndo();
    redoBtn.disabled = !canRedo();
  };

  /* Strukturelle Aenderungen: alles neu. */
  subscribe(() => { drawSide(); drawWork(); drawSpur(); });

  /* Tippen: nur Spur und Testansicht. */
  subscribeLive(() => {
    drawSpur();
    if (current === 'preview') { /* Testansicht baut sich selbst neu auf Knopfdruck */ }
  });

  drawSide();
  drawWork();
  drawSpur();

  /* Tastenkürzel */
  document.addEventListener('keydown', event => {
    const meta = event.metaKey || event.ctrlKey;
    if (!meta) return;
    if (event.key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
    else if ((event.key === 'z' && event.shiftKey) || event.key === 'y') { event.preventDefault(); redo(); }
    else if (event.key === 's') { event.preventDefault(); saveDraft(); toast('Im Browser gesichert'); }
  });

  /* Warnung beim Schliessen, wenn es ungespeicherte Aenderungen gibt */
  window.addEventListener('beforeunload', event => {
    if (changedFiles().length) { event.preventDefault(); event.returnValue = ''; }
  });
}

showStart();
