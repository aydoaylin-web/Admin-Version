/* ===========================================================================
   Bausteine der Oberflaeche.
   ---------------------------------------------------------------------------
   Kleine Helfer, damit die Editoren kurz bleiben. Wichtigster Baustein:
   biField() — ein Feld mit deutscher und englischer Fassung nebeneinander.
   =========================================================================== */

import { edit, editLive } from './store.js';

/** Kurzform fuer document.createElement mit Klassen und Inhalt. */
export function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined && content !== null) {
    if (typeof content === 'string') node.textContent = content;
    else if (Array.isArray(content)) node.append(...content.filter(Boolean));
    else node.append(content);
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

/** Text aus einem Feld holen, das entweder String oder {de,en} ist. */
export function text(value, lang = 'de') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[lang] ?? value.de ?? '';
  }
  return value ?? '';
}

/* --------------------------------------------------------------------------
   Einfache Felder
   -------------------------------------------------------------------------- */

/**
 * Ein Eingabefeld, das direkt in die Daten schreibt.
 * obj[key] wird bei jeder Eingabe gesetzt.
 */
export function field(label, obj, key, options = {}) {
  const { multiline = false, mono = false, type = 'text', hint, placeholder } = options;
  const wrap = el('div', 'field');
  wrap.append(el('label', null, label));
  if (hint) wrap.append(el('p', 'hint', hint));

  const input = el(multiline ? 'textarea' : 'input');
  if (!multiline) input.type = type;
  if (mono) input.classList.add('mono');
  if (placeholder) input.placeholder = placeholder;
  input.value = obj?.[key] ?? '';
  if (multiline) input.rows = options.rows || 3;

  input.addEventListener('input', () => {
    const value = type === 'number' ? Number(input.value) : input.value;
    editLive(() => { obj[key] = value; });
  });

  wrap.append(input);
  return wrap;
}

/** Ein Ankreuzfeld. */
export function toggle(label, obj, key) {
  const wrap = el('label', 'field');
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '8px';
  wrap.style.fontWeight = '650';
  wrap.style.fontSize = '13px';

  const box = el('input');
  box.type = 'checkbox';
  box.checked = !!obj?.[key];
  box.style.width = 'auto';
  box.addEventListener('change', () => edit(() => { obj[key] = box.checked; }));

  wrap.append(box, el('span', null, label));
  return wrap;
}

/** Auswahlliste. */
export function select(label, obj, key, choices, hint) {
  const wrap = el('div', 'field');
  wrap.append(el('label', null, label));
  if (hint) wrap.append(el('p', 'hint', hint));
  const box = el('select');
  for (const choice of choices) {
    const value = typeof choice === 'string' ? choice : choice.value;
    const text = typeof choice === 'string' ? choice : choice.label;
    const option = el('option', null, text);
    option.value = value;
    box.append(option);
  }
  box.value = obj?.[key] ?? '';
  box.addEventListener('change', () => edit(() => { obj[key] = box.value; }));
  wrap.append(box);
  return wrap;
}

/* --------------------------------------------------------------------------
   Zweisprachiges Feld
   -------------------------------------------------------------------------- */

/**
 * Deutsch und Englisch nebeneinander.
 *
 * Gespeichert wird immer als { de: "...", en: "..." }. Bleibt das englische
 * Feld leer, wird nur der deutsche Text gespeichert — die Schueler-App zeigt
 * dann in beiden Sprachen Deutsch. Du kannst also erst deutsch schreiben und
 * die Uebersetzung spaeter nachtragen.
 */
export function biField(label, obj, key, options = {}) {
  const { multiline = false, rows = 3, hint } = options;
  const wrap = el('div', 'field');
  if (label) wrap.append(el('span', 'flabel', label));
  if (hint) wrap.append(el('p', 'hint', hint));

  const grid = el('div', 'bi');

  for (const lang of ['de', 'en']) {
    const cell = el('div', 'lang');
    const input = el(multiline ? 'textarea' : 'input');
    if (!multiline) input.type = 'text';
    if (multiline) input.rows = rows;
    input.value = text(obj?.[key], lang);
    cell.append(input, el('span', 'tag', lang.toUpperCase()));

    const markEmpty = () => cell.classList.toggle('empty', lang === 'en' && !input.value.trim());
    markEmpty();

    input.addEventListener('input', () => {
      markEmpty();
      editLive(() => {
        const current = obj[key];
        const next = {
          de: text(current, 'de'),
          en: text(current, 'en'),
          [lang]: input.value,
        };
        obj[key] = next.en.trim() ? next : next.de;
      });
    });

    grid.append(cell);
  }

  wrap.append(grid);
  return wrap;
}

/* --------------------------------------------------------------------------
   Begriffslisten (Schluesselwoerter, Phrasen)
   -------------------------------------------------------------------------- */

/**
 * Liste kurzer Begriffe zum Hinzufuegen und Entfernen.
 * Neuen Begriff eintippen und Eingabetaste druecken; Komma trennt mehrere.
 */
export function tagList(label, holder, key, hint, onChange) {
  const wrap = el('div', 'field');
  wrap.append(el('span', 'flabel', label));
  if (hint) wrap.append(el('p', 'hint', hint));

  const box = el('div', 'tagbox');
  const input = el('input');
  input.placeholder = 'hinzufügen …';

  const draw = () => {
    clear(box);
    for (const [index, value] of (holder[key] || []).entries()) {
      const tag = el('span', 't', value);
      const remove = el('button', null, '×');
      remove.title = 'Entfernen';
      remove.addEventListener('click', () => {
        edit(() => { holder[key].splice(index, 1); });
        onChange?.();
      });
      tag.append(remove);
      box.append(tag);
    }
    box.append(input);
  };

  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    const parts = input.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return;
    edit(() => {
      if (!Array.isArray(holder[key])) holder[key] = [];
      for (const part of parts) if (!holder[key].includes(part)) holder[key].push(part);
    });
    input.value = '';
    onChange?.();
  });

  draw();
  wrap.append(box);
  return wrap;
}

/* --------------------------------------------------------------------------
   Kleinteile
   -------------------------------------------------------------------------- */

export function chip(verdict) {
  const labels = { echt: 'Echt', manipuliert: 'Manipuliert', suspekt: 'Suspekt' };
  return el('span', `chip ${verdict || ''}`, labels[verdict] || verdict || '—');
}

export function button(label, className, onClick) {
  const node = el('button', className || 'btn', label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

export function card(title, hint, children) {
  const node = el('section', 'card');
  if (title) node.append(el('h3', null, title));
  if (hint) node.append(el('p', 'hint', hint));
  node.append(...children.filter(Boolean));
  return node;
}

let toastTimer = null;
export function toast(message) {
  let node = document.getElementById('toast');
  if (!node) {
    node = el('div', 'toast');
    node.id = 'toast';
    document.body.append(node);
  }
  node.textContent = message;
  node.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('on'), 2400);
}

export async function copyText(value, what = 'Inhalt') {
  try {
    await navigator.clipboard.writeText(value);
    toast(`${what} kopiert`);
  } catch {
    // Aeltere Browser oder fehlende Freigabe: Textfeld als Rueckfallweg
    const area = el('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    try { document.execCommand('copy'); toast(`${what} kopiert`); }
    catch { toast('Kopieren hat nicht geklappt — bitte von Hand markieren'); }
    area.remove();
  }
}

export function download(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = el('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
