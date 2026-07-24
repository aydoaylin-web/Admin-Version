/* ===========================================================================
   Der Datenspeicher des Studios.
   ---------------------------------------------------------------------------
   Haelt das geladene Projekt, merkt sich den Ausgangsstand und weiss dadurch
   jederzeit, welche Dateien sich geaendert haben. Das ist die Grundlage fuer
   die Aenderungsspur oben in der Leiste.
   =========================================================================== */

import { readZip, entryText, entryBytes, writeZip } from './zip.js';
import {
  parseReasonConcepts, buildReasonConcepts,
  parseImageHotspots, buildImageHotspots, buildJson,
} from './serialize.js';

/* Die Dateien, die das Studio bearbeitet. Alles andere wird unveraendert
   durchgereicht. Neue Datei aufnehmen: hier einen Eintrag ergaenzen und in
   collect() sowie applyLoaded() behandeln. */
export const EDITABLE_FILES = [
  'content/posts.json',
  'content/tasks.json',
  'content/profiles.json',
  'content/settings.json',
  'src/data/reasonConcepts.js',
  'src/data/imageHotspots.js',
];

const state = {
  loaded: false,
  projectName: 'deepfake-main',
  rootPrefix: '',        // Ordner innerhalb der ZIP, z. B. "deepfake-main/"
  zipEntries: null,      // Map aller Originaleintraege
  imageUrls: new Map(),  // Bildpfad -> Blob-Adresse fuer die Vorschau

  data: null,            // aktueller Stand
  baseline: null,        // Stand beim Laden (fuer den Vergleich)

  undoStack: [],
  redoStack: [],
  listeners: new Set(),      // vollstaendiges Neuzeichnen
  liveListeners: new Set(),  // nur Aenderungsspur und Vorschau
};

/** Wird bei strukturellen Aenderungen aufgerufen: die Ansicht wird neu gebaut. */
export function subscribe(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

/**
 * Wird auch beim Tippen aufgerufen. Hier haengen nur Anzeigen, die den
 * Eingabefokus nicht stoeren — die Aenderungsspur und die Testansicht.
 */
export function subscribeLive(fn) {
  state.liveListeners.add(fn);
  return () => state.liveListeners.delete(fn);
}

function notify() {
  for (const fn of state.listeners) fn(state);
  notifyLive();
}

function notifyLive() {
  for (const fn of state.liveListeners) fn(state);
}

export function getState() { return state; }
export function isLoaded() { return state.loaded; }
export function data() { return state.data; }

/* --------------------------------------------------------------------------
   Laden
   -------------------------------------------------------------------------- */

export async function loadProjectZip(arrayBuffer, fileName = 'deepfake-main.zip') {
  const entries = await readZip(arrayBuffer);

  // Wurzelordner innerhalb der ZIP finden (dort liegt content/)
  let prefix = '';
  for (const name of entries.keys()) {
    const match = name.match(/^(.*?)content\/posts\.json$/);
    if (match) { prefix = match[1]; break; }
  }
  if (!entries.has(prefix + 'content/posts.json')) {
    throw new Error('In dieser ZIP fehlt content/posts.json. Ist das das Projekt der Schüler-App?');
  }

  const read = async (path) => entryText(entries.get(prefix + path));

  const loaded = {
    posts: JSON.parse(await read('content/posts.json')),
    tasks: JSON.parse(await read('content/tasks.json')),
    profiles: JSON.parse(await read('content/profiles.json')),
    settings: JSON.parse(await read('content/settings.json')),
    reason: parseReasonConcepts(await read('src/data/reasonConcepts.js')),
    hotspots: parseImageHotspots(await read('src/data/imageHotspots.js')),
  };

  state.zipEntries = entries;
  state.rootPrefix = prefix;
  state.projectName = (prefix.replace(/\/$/, '') || fileName.replace(/\.zip$/i, '')) || 'deepfake-main';
  state.data = loaded;
  state.baseline = structuredClone(loaded);
  state.undoStack = [];
  state.redoStack = [];
  state.loaded = true;

  await prepareImages();
  notify();
  return loaded;
}

/** Bilder aus der ZIP als Adressen bereitstellen, damit die Vorschau sie zeigt. */
async function prepareImages() {
  for (const url of state.imageUrls.values()) URL.revokeObjectURL(url);
  state.imageUrls.clear();

  const wanted = new Set(state.data.posts.map(p => p.media).filter(Boolean));
  for (const path of wanted) {
    const entry = state.zipEntries.get(state.rootPrefix + path);
    if (!entry) continue;
    const bytes = await entryBytes(entry);
    const type = path.endsWith('.png') ? 'image/png'
      : path.endsWith('.webp') ? 'image/webp'
      : path.endsWith('.gif') ? 'image/gif' : 'image/jpeg';
    state.imageUrls.set(path, URL.createObjectURL(new Blob([bytes], { type })));
  }
}

export function imageUrl(path) {
  return state.imageUrls.get(path) || '';
}

/* --------------------------------------------------------------------------
   Aendern, rueckgaengig, wiederholen
   -------------------------------------------------------------------------- */

/**
 * Strukturelle Aenderung: Urteil umstellen, Kommentar anlegen, Zone loeschen.
 * Der vorherige Stand wandert auf den Rueckgaengig-Stapel, danach wird die
 * Ansicht neu gebaut.
 */
export function edit(mutator) {
  if (!state.loaded) return;
  pushUndo();
  mutator(state.data);
  notify();
}

/**
 * Aenderung beim Tippen. Zeichnet die Ansicht NICHT neu — sonst spraenge der
 * Schreibcursor bei jedem Buchstaben. Aktualisiert nur Aenderungsspur und
 * Testansicht. Aufeinanderfolgende Tastenanschlaege werden zu einem einzigen
 * Schritt zusammengefasst, damit Rueckgaengig nicht Buchstabe fuer Buchstabe
 * zurueckgeht.
 */
let typingTimer = null;
export function editLive(mutator) {
  if (!state.loaded) return;
  if (typingTimer === null) pushUndo();
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => { typingTimer = null; }, 900);
  mutator(state.data);
  notifyLive();
}

function pushUndo() {
  state.undoStack.push(structuredClone(state.data));
  if (state.undoStack.length > 80) state.undoStack.shift();
  state.redoStack = [];
}

export function undo() {
  if (!state.undoStack.length) return;
  clearTimeout(typingTimer); typingTimer = null;
  state.redoStack.push(structuredClone(state.data));
  state.data = state.undoStack.pop();
  notify();
}

export function redo() {
  if (!state.redoStack.length) return;
  clearTimeout(typingTimer); typingTimer = null;
  state.undoStack.push(structuredClone(state.data));
  state.data = state.redoStack.pop();
  notify();
}

export function canUndo() { return state.undoStack.length > 0; }
export function canRedo() { return state.redoStack.length > 0; }

/* --------------------------------------------------------------------------
   Dateien erzeugen und vergleichen
   -------------------------------------------------------------------------- */

/** Erzeugt den Inhalt aller bearbeitbaren Dateien aus einem Datenstand. */
export function collect(from = state.data) {
  return {
    'content/posts.json': buildJson(from.posts),
    'content/tasks.json': buildJson(from.tasks),
    'content/profiles.json': buildJson(from.profiles),
    'content/settings.json': buildJson(from.settings),
    'src/data/reasonConcepts.js': buildReasonConcepts(from.reason),
    'src/data/imageHotspots.js': buildImageHotspots(from.hotspots),
  };
}

/** Welche Dateien haben sich seit dem Laden geaendert? */
export function changedFiles() {
  if (!state.loaded) return [];
  const now = collect(state.data);
  const before = collect(state.baseline);
  return EDITABLE_FILES
    .filter(path => now[path] !== before[path])
    .map(path => ({
      path,
      before: before[path],
      after: now[path],
      lines: countLineChanges(before[path], now[path]),
    }));
}

function countLineChanges(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const setA = new Map();
  for (const line of a) setA.set(line, (setA.get(line) || 0) + 1);
  let added = 0;
  for (const line of b) {
    const count = setA.get(line) || 0;
    if (count > 0) setA.set(line, count - 1); else added++;
  }
  let removed = 0;
  for (const count of setA.values()) removed += count;
  return { added, removed };
}

/** Zeilenweiser Vergleich fuer die Detailansicht. */
export function diffLines(before, after, context = 2) {
  const a = before.split('\n');
  const b = after.split('\n');
  // Laengste gemeinsame Teilfolge, auf Zeilenebene
  const n = a.length, m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const rows = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { rows.push({ type: 'same', text: a[i], line: i + 1 }); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { rows.push({ type: 'del', text: a[i], line: i + 1 }); i++; }
    else { rows.push({ type: 'add', text: b[j], line: j + 1 }); j++; }
  }
  while (i < n) rows.push({ type: 'del', text: a[i], line: ++i });
  while (j < m) rows.push({ type: 'add', text: b[j], line: ++j });

  // Nur Umgebung der Aenderungen zeigen
  const keep = new Set();
  rows.forEach((row, index) => {
    if (row.type === 'same') return;
    for (let k = index - context; k <= index + context; k++) keep.add(k);
  });
  const out = [];
  let gap = false;
  rows.forEach((row, index) => {
    if (keep.has(index)) { out.push(row); gap = false; }
    else if (!gap) { out.push({ type: 'gap' }); gap = true; }
  });
  return out;
}

/* --------------------------------------------------------------------------
   Export
   -------------------------------------------------------------------------- */

/** Baut die vollstaendige Projekt-ZIP mit den geaenderten Dateien. */
export async function exportZip() {
  const generated = collect();
  const encoder = new TextEncoder();
  const files = [];
  for (const [name, entry] of state.zipEntries) {
    const relative = name.startsWith(state.rootPrefix) ? name.slice(state.rootPrefix.length) : name;
    if (generated[relative] !== undefined) {
      files.push({ name, bytes: encoder.encode(generated[relative]) });
    } else {
      files.push({ name, passthrough: entry });
    }
  }
  return writeZip(files);
}

/** Baut eine kleine ZIP nur mit den geaenderten Dateien. */
export async function exportChangedOnly() {
  const encoder = new TextEncoder();
  const files = changedFiles().map(file => ({
    name: file.path,
    bytes: encoder.encode(file.after),
  }));
  if (!files.length) return null;
  return writeZip(files);
}

/** Den aktuellen Stand zum neuen Vergleichspunkt machen (nach dem Hochladen). */
export function markAsExported() {
  state.baseline = structuredClone(state.data);
  notify();
}

/* --------------------------------------------------------------------------
   Sitzung im Browser sichern, damit nichts verloren geht
   -------------------------------------------------------------------------- */

const SAVE_KEY = 'dd-studio-entwurf-v1';

export function saveDraft() {
  if (!state.loaded) return false;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      projectName: state.projectName,
      data: state.data,
      baseline: state.baseline,
    }));
    return true;
  } catch { return false; }
}

export function peekDraft() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Entwurf auf das gerade geladene Projekt anwenden. */
export function applyDraft(draft) {
  if (!state.loaded || !draft?.data) return false;
  state.undoStack.push(structuredClone(state.data));
  state.data = draft.data;
  if (draft.baseline) state.baseline = draft.baseline;
  notify();
  return true;
}

export function clearDraft() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* egal */ }
}
