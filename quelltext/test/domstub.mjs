/* Sehr einfache Nachbildung des Browsers — nur so viel, wie das Studio braucht.
   Dient dazu, alle Ansichten einmal durchlaufen zu lassen und Fehler zu finden. */

class ClassList {
  constructor(node) { this.node = node; this.set = new Set(); }
  add(...c) { c.forEach(x => x && this.set.add(x)); this.sync(); }
  remove(...c) { c.forEach(x => this.set.delete(x)); this.sync(); }
  toggle(c, on) { if (on === undefined) on = !this.set.has(c); on ? this.set.add(c) : this.set.delete(c); this.sync(); }
  contains(c) { return this.set.has(c); }
  sync() { this.node._class = [...this.set].join(' '); }
}

class Node {
  constructor(tag) {
    this.tagName = String(tag || '').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this._class = '';
    this._text = '';
    this.style = new Proxy({ cssText: '' }, { get: (t, k) => t[k] ?? '', set: (t, k, v) => (t[k] = v, true) });
    this.dataset = {};
    this.classList = new ClassList(this);
    this.listeners = {};
    this.value = '';
    this.attributes = {};
  }
  get className() { return this._class; }
  set className(v) { this._class = v || ''; this.classList.set = new Set(String(v || '').split(/\s+/).filter(Boolean)); }
  get textContent() {
    if (this.children.length) return this.children.map(c => c.textContent).join('');
    return this._text;
  }
  set textContent(v) { this._text = String(v ?? ''); this.children = []; }
  append(...nodes) {
    for (const n of nodes) {
      if (n === null || n === undefined || n === false) continue;
      const node = typeof n === 'string' ? new TextNode(n) : n;
      node.parentNode = this;
      this.children.push(node);
    }
  }
  appendChild(n) { this.append(n); return n; }
  removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); return n; }
  remove() { this.parentNode?.removeChild(this); }
  get firstChild() { return this.children[0] || null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener() {}
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 300 }; }
  closest(sel) {
    let node = this;
    const want = sel.replace('.', '');
    while (node) { if (node.classList?.contains(want)) return node; node = node.parentNode; }
    return null;
  }
  _all(out = []) { for (const c of this.children) { out.push(c); c._all?.(out); } return out; }
  querySelectorAll(sel) {
    const want = sel.replace('.', '').toUpperCase();
    return this._all().filter(n =>
      sel.startsWith('.') ? n.classList?.contains(sel.slice(1)) : n.tagName === want);
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  /** Test-Hilfe: einen Klick auslösen */
  click(extra = {}) { for (const fn of this.listeners.click || []) fn({ preventDefault() {}, stopPropagation() {}, target: this, ...extra }); }
  input(value) { this.value = value; for (const fn of this.listeners.input || []) fn({ target: this }); }
}

class TextNode extends Node {
  constructor(text) { super('#text'); this._text = text; }
  get textContent() { return this._text; }
}

const document = {
  createElement: tag => new Node(tag),
  createTextNode: t => new TextNode(t),
  getElementById(id) { return this._byId[id] || null; },
  addEventListener() {},
  body: new Node('body'),
  _byId: {},
};

const app = new Node('div');
document._byId.app = app;

const store = new Map();
const localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: k => store.delete(k),
};

globalThis.document = document;
globalThis.localStorage = localStorage;
globalThis.window = { addEventListener() {}, location: { href: '' } };
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => {} } }, configurable: true });
globalThis.confirm = () => false;
globalThis.alert = () => {};
globalThis.requestAnimationFrame = fn => fn();
globalThis.URL.createObjectURL = () => 'blob:test';
globalThis.URL.revokeObjectURL = () => {};

export { document, app, Node };
