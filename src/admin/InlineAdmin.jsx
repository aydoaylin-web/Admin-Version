import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import App from '../App.jsx';
import {
  ladeEntwurf, speichereEntwurf, leerEntwurf, erzeugeCodeDateien,
  geaenderteCodeDateien, SPRACHCODES,
} from './codeEntwurf';
import { STELLSCHRAUBEN } from './codegen';
import { ladeZipHerunter } from './zipExport';

/* ============================================================
   BEARBEITEN DIREKT IN DER APP

   ZWEI MODI - das ist der Kern:

     SPIELEN      Die App verhaelt sich exakt wie fuer die Kinder.
                  Jeder Knopf tut, was er tun soll. So gehst du
                  einen Fall komplett durch und pruefst, ob deine
                  Aenderungen wirken.

     BEARBEITEN   Ein Klick oeffnet das Bearbeitungsfeld statt
                  die Aktion auszuloesen.

   In BEIDEN Modi gilt: Alt + Klick bearbeitet immer. Damit
   kommst du auch mitten im Spielen an jede Stelle, ohne den
   Modus zu wechseln.

   App.jsx wird nicht veraendert. Die Zuordnung laeuft ueber das,
   was die App ohnehin ausgibt.

   Eine weitere Stelle anklickbar machen: unten in findeZiel()
   einen Zweig ergaenzen und im Seitenfeld einen Abschnitt dazu.
   ============================================================ */

const INHALT_SCHLUESSEL = 'dd-admin-inhalte-v2';
const FILES = ['settings', 'posts', 'tasks', 'profiles', 'stories', 'guides'];
const VERDICTS = ['echt', 'suspekt', 'manipuliert'];

const joinBase = (pfad) => `${import.meta.env.BASE_URL}${String(pfad).replace(/^\//, '')}`;

const feld = {
  width: '100%', padding: '8px 10px', borderRadius: 8, marginTop: 4,
  border: '1px solid #cbd5e1', font: 'inherit', fontSize: 13, background: '#fff',
};
const beschriftung = { display: 'block', fontSize: 12, fontWeight: 700, color: '#3d4c66', marginTop: 12 };
const block = { marginTop: 14, padding: 12, borderRadius: 10, background: '#f7f9fc', border: '1px solid #dce3ee' };

/* Umrandungen nur im Bearbeitenmodus. Im Spielmodus sieht die
   Oberflaeche exakt aus wie fuer die Kinder. */
const MARKIER_CSS = `
[data-post-id]{ outline:2px dashed rgba(219,43,115,.5); outline-offset:3px; border-radius:14px; }
[data-post-id]:hover{ outline-color:#db2b73; outline-style:solid; }
.analysis-tool-content{ outline:2px dashed rgba(31,158,120,.45); outline-offset:-2px; border-radius:10px; }
.analysis-tool-content:hover{ outline-color:#1f9e78; outline-style:solid; }
.task-sheet textarea{ outline:2px dashed rgba(31,158,120,.45); }
`;

export function AdminKopfKnopf({ aktiv, onClick }) {
  const [ziel, setZiel] = useState(null);
  useEffect(() => {
    let versuche = 0;
    const uhr = setInterval(() => {
      const el = document.querySelector('.app-header .header-actions');
      versuche += 1;
      if (el || versuche > 40) { clearInterval(uhr); setZiel(el || null); }
    }, 100);
    return () => clearInterval(uhr);
  }, []);

  const knopf = (
    <button type="button" data-admin-schutz onClick={onClick} aria-label="Adminmodus"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 34,
        padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
        border: `1px solid ${aktiv ? '#db2b73' : 'rgba(9,43,97,.25)'}`,
        background: aktiv ? '#db2b73' : 'transparent',
        color: aktiv ? '#fff' : '#092b61',
        font: 'inherit', fontSize: 12, fontWeight: 800,
      }}>
      {aktiv ? 'Fertig' : 'Admin'}
    </button>
  );

  if (ziel) return createPortal(knopf, ziel);
  return <div style={{ position: 'fixed', top: 10, left: 10, zIndex: 2147483000 }}>{knopf}</div>;
}

/* ---------- Welchen Beitrag zeigt die Feed-Pruefung gerade? ---------- */
function postAusBlatt(blatt, inhalte) {
  const bild = blatt.querySelector('img.post-image, .task-image-button img, .hotspot-image, img');
  const quelle = bild ? bild.getAttribute('src') : '';
  if (!quelle) return null;
  return (inhalte.posts || []).find((p) => p.media && quelle.endsWith(String(p.media).replace(/^\//, ''))) || null;
}

/* ---------- Zielbestimmung: worauf wurde geklickt? ---------- */
export function findeZiel(el, inhalte, entwurf) {
  const blatt = el.closest('.task-sheet');

  // 1. Analysewerkzeuge in der Feed-Pruefung
  const werkzeug = el.closest('.analysis-tool-content');
  if (werkzeug && blatt) {
    const post = postAusBlatt(blatt, inhalte);
    if (post) {
      if (werkzeug.querySelector('.origin-check, .origin-hit, .origin-empty')) return { art: 'herkunft', postId: post.id };
      if (werkzeug.querySelector('.profile-check-head, .profile-check-bio, .profile-check-avatar')) return { art: 'profil', postId: post.id };
      if (werkzeug.querySelector('.source-browser-bar, .linked-page-preview, .linked-page-kicker')) return { art: 'quelle', postId: post.id };
      return { art: 'zonen', postId: post.id };
    }
  }

  // 2. Begruendungsfeld und Urteilsauswahl
  if (blatt) {
    const post = postAusBlatt(blatt, inhalte);
    const imBegruendungsteil = el.closest('textarea, .verdict-question, .feedback, .reason, .verdict-card, .verdict-option, .verdict-row');
    if (post) return { art: imBegruendungsteil ? 'bewertung' : 'beitrag', postId: post.id };
  }

  // 3. Beitrag im Feed
  const beitrag = el.closest('[data-post-id]');
  if (beitrag) return { art: 'beitrag', postId: beitrag.getAttribute('data-post-id') };

  // 4. Oberflaechentext ueber die Uebersetzungen
  let knoten = el;
  for (let i = 0; i < 4 && knoten; i += 1) {
    const text = (knoten.textContent || '').trim();
    if (text && text.length <= 120) {
      for (const code of SPRACHCODES) {
        const eintraege = entwurf.translations[code] || {};
        const schluessel = Object.keys(eintraege).find((k) => eintraege[k] === text);
        if (schluessel) return { art: 'text', schluessel };
      }
    }
    knoten = knoten.parentElement;
  }
  return null;
}

/* Freies Feld fuer verschachtelte Daten wie sourceCheck oder
   profileCheck. Zeigt sofort an, wenn die Klammern nicht stimmen,
   und uebernimmt erst dann. */
function JsonFeld({ wert, onChange, zeilen = 12 }) {
  const [text, setText] = useState(() => JSON.stringify(wert ?? {}, null, 2));
  const [fehler, setFehler] = useState('');
  useEffect(() => { setText(JSON.stringify(wert ?? {}, null, 2)); }, [wert]);

  function tippen(neu) {
    setText(neu);
    try {
      const geparst = JSON.parse(neu);
      setFehler('');
      onChange(geparst);
    } catch (f) {
      setFehler(f.message);
    }
  }
  return (
    <>
      <textarea rows={zeilen} spellCheck={false} value={text} onChange={(e) => tippen(e.target.value)}
        style={{ ...feld, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12, borderColor: fehler ? '#d98b8b' : '#cbd5e1' }} />
      {fehler && <p style={{ fontSize: 11.5, color: '#a3382c', margin: '4px 0 0' }}>Noch nicht übernommen: {fehler}</p>}
    </>
  );
}

/* ---------- Bearbeitungsfeld ---------- */
function Seitenfeld({ ziel, inhalte, setInhalte, entwurf, setEntwurf, onSchliessen }) {
  const post = (inhalte.posts || []).find((p) => p.id === ziel.postId);
  const task = (inhalte.tasks || []).find((t) => t.postId === ziel.postId);
  const profil = post ? (inhalte.profiles || []).find((p) => p.id === post.profileId) : null;
  const regel = entwurf.reasonConcepts[ziel.postId];
  const zonen = entwurf.imageHotspots[ziel.postId];

  const aenderePost = (k, v) => setInhalte({ ...inhalte, posts: inhalte.posts.map((p) => (p.id === post.id ? { ...p, [k]: v } : p)) });
  const aendereTask = (k, v) => setInhalte({ ...inhalte, tasks: inhalte.tasks.map((t) => (t.id === task.id ? { ...t, [k]: v } : t)) });
  const aendereProfil = (k, v) => setInhalte({ ...inhalte, profiles: inhalte.profiles.map((p) => (p.id === profil.id ? { ...p, [k]: v } : p)) });
  const aendereRegel = (neu) => setEntwurf({ ...entwurf, reasonConcepts: { ...entwurf.reasonConcepts, [ziel.postId]: neu } });
  const aendereZonen = (neu) => setEntwurf({ ...entwurf, imageHotspots: { ...entwurf.imageHotspots, [ziel.postId]: neu } });

  const zwei = (w, c) => (w && typeof w === 'object' ? (w[c] ?? '') : (c === 'de' ? (w ?? '') : ''));
  const setzeZwei = (w, c, neu) => (w && typeof w === 'object' ? { ...w, [c]: neu } : { de: c === 'de' ? neu : (w ?? ''), en: c === 'en' ? neu : '' });

  const titel = {
    beitrag: 'Beitrag', bewertung: 'Bewertung & Algorithmus', text: 'Oberflächentext',
    profil: 'Profilprüfung', quelle: 'Quellenprüfung', herkunft: 'Bildherkunft', zonen: 'Bildzonen',
  }[ziel.art];

  return (
    <aside style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(430px, 94vw)', zIndex: 2147483100,
      background: '#fff', borderLeft: '1px solid #dce3ee', boxShadow: '-8px 0 28px rgba(13,36,79,.16)',
      overflowY: 'auto', padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <strong style={{ fontSize: 15 }}>{titel}</strong>
        <code style={{ fontSize: 11, background: '#eef2f8', padding: '2px 6px', borderRadius: 6 }}>
          {ziel.schluessel || ziel.postId}
        </code>
        <button type="button" onClick={onSchliessen} style={{ marginLeft: 'auto' }}>Schließen</button>
      </div>

      {ziel.art === 'text' && SPRACHCODES.map((code) => (
        <label key={code} style={beschriftung}>{code.toUpperCase()}
          <textarea rows={3} style={feld} value={entwurf.translations[code]?.[ziel.schluessel] ?? ''}
            onChange={(e) => setEntwurf({
              ...entwurf,
              translations: { ...entwurf.translations, [code]: { ...entwurf.translations[code], [ziel.schluessel]: e.target.value } },
            })} />
        </label>
      ))}

      {ziel.art === 'beitrag' && post && (
        <>
          <label style={beschriftung}>Benutzername
            <input style={feld} value={post.username || ''} onChange={(e) => aenderePost('username', e.target.value)} /></label>
          <label style={beschriftung}>Ort
            <input style={feld} value={post.location || ''} onChange={(e) => aenderePost('location', e.target.value)} /></label>
          <label style={beschriftung}>Likes
            <input type="number" style={feld} value={post.likes ?? 0} onChange={(e) => aenderePost('likes', Number(e.target.value))} /></label>
          <label style={beschriftung}>Bildpfad
            <input style={feld} value={post.media || ''} onChange={(e) => aenderePost('media', e.target.value)} /></label>
          {SPRACHCODES.map((code) => (
            <label key={code} style={beschriftung}>Bildunterschrift {code.toUpperCase()}
              <textarea rows={3} style={feld} value={zwei(post.caption, code)}
                onChange={(e) => aenderePost('caption', setzeZwei(post.caption, code, e.target.value))} /></label>
          ))}
          {task && (
            <div style={block}>
              <strong style={{ fontSize: 12.5 }}>Aufgabe</strong>
              <label style={beschriftung}>Richtiges Urteil
                <select style={feld} value={task.correctVerdict || ''} onChange={(e) => aendereTask('correctVerdict', e.target.value)}>
                  {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select></label>
              {regel && regel.verdict !== task.correctVerdict && (
                <p style={{ fontSize: 12, color: '#a3382c', marginTop: 6 }}>
                  Die Bewertungsregel steht noch auf „{regel.verdict}“.{' '}
                  <button type="button" onClick={() => aendereRegel({ ...regel, verdict: task.correctVerdict })}>Mitziehen</button>
                </p>
              )}
              <label style={beschriftung}>Punkte richtig
                <input type="number" style={feld} value={task.pointsCorrect ?? 1} onChange={(e) => aendereTask('pointsCorrect', Number(e.target.value))} /></label>
              <label style={beschriftung}>Zeitlimit in Sekunden
                <input type="number" style={feld} value={task.timeLimit ?? 180} onChange={(e) => aendereTask('timeLimit', Number(e.target.value))} /></label>
            </div>
          )}
        </>
      )}

      {ziel.art === 'profil' && profil && (
        <>
          <label style={beschriftung}>Benutzername
            <input style={feld} value={profil.username || ''} onChange={(e) => aendereProfil('username', e.target.value)} /></label>
          <label style={beschriftung}>Anzeigename
            <input style={feld} value={profil.displayName || ''} onChange={(e) => aendereProfil('displayName', e.target.value)} /></label>
          <label style={{ ...beschriftung, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={Boolean(profil.verified)} onChange={(e) => aendereProfil('verified', e.target.checked)} />
            Verifiziert
          </label>
          {SPRACHCODES.map((code) => (
            <label key={code} style={beschriftung}>Biografie {code.toUpperCase()}
              <textarea rows={3} style={feld} value={zwei(profil.bio, code)}
                onChange={(e) => aendereProfil('bio', setzeZwei(profil.bio, code, e.target.value))} /></label>
          ))}
          <label style={beschriftung}>Profilprüfung (Impressum, Kommentare, Besonderheit …)
            <JsonFeld wert={profil.profileCheck} onChange={(v) => aendereProfil('profileCheck', v)} /></label>
        </>
      )}

      {ziel.art === 'quelle' && post && (
        <label style={beschriftung}>Quellenprüfung
          <JsonFeld wert={post.sourceCheck} onChange={(v) => aenderePost('sourceCheck', v)} zeilen={16} /></label>
      )}

      {ziel.art === 'herkunft' && post && (
        <label style={beschriftung}>Bildherkunft / Rückwärtssuche
          <JsonFeld wert={post.imageOriginCheck} onChange={(v) => aenderePost('imageOriginCheck', v)} zeilen={16} /></label>
      )}

      {ziel.art === 'zonen' && (
        <>
          <p style={{ fontSize: 12.5, color: '#5a6b86' }}>
            Alle Werte in Prozent des Bildes. x und y sind die linke obere Ecke.
          </p>
          {(zonen?.hotspots || []).map((z, i) => (
            <div key={i} style={block}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {['x', 'y', 'w', 'h'].map((achse) => (
                  <label key={achse} style={{ fontSize: 12 }}>{achse}
                    <input type="number" style={feld} value={z[achse]}
                      onChange={(e) => aendereZonen({
                        ...zonen,
                        hotspots: zonen.hotspots.map((q, j) => (j === i ? { ...q, [achse]: Number(e.target.value) } : q)),
                      })} /></label>
                ))}
              </div>
              <label style={beschriftung}>Hinweistext bei Treffer
                <textarea rows={3} style={feld} value={z.hint || ''}
                  onChange={(e) => aendereZonen({
                    ...zonen,
                    hotspots: zonen.hotspots.map((q, j) => (j === i ? { ...q, hint: e.target.value } : q)),
                  })} /></label>
            </div>
          ))}
          <button type="button" style={{ marginTop: 10 }}
            onClick={() => aendereZonen({
              errorCount: ((zonen?.hotspots || []).length + 1),
              hotspots: [...(zonen?.hotspots || []), { x: 40, y: 30, w: 24, h: 30, hint: 'Neuer Hinweis' }],
            })}>Zone hinzufügen</button>
        </>
      )}

      {ziel.art === 'bewertung' && regel && (
        <>
          <label style={beschriftung}>Erwartetes Urteil
            <select style={feld} value={regel.verdict} onChange={(e) => aendereRegel({ ...regel, verdict: e.target.value })}>
              {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select></label>

          {(regel.concepts || []).map((k, i) => (
            <div key={i} style={block}>
              <strong style={{ fontSize: 12.5 }}>Konzept {i + 1}</strong>
              <label style={beschriftung}>Stichwörter, mit Komma getrennt
                <textarea rows={2} style={feld} value={(k.terms || []).join(', ')}
                  onChange={(e) => aendereRegel({
                    ...regel,
                    concepts: regel.concepts.map((c, j) => (j === i ? { ...c, terms: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } : c)),
                  })} /></label>
              <label style={beschriftung}>Ganze Phrasen, mit Komma getrennt
                <textarea rows={3} style={feld} value={(k.phrases || []).join(', ')}
                  onChange={(e) => aendereRegel({
                    ...regel,
                    concepts: regel.concepts.map((c, j) => (j === i ? { ...c, phrases: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } : c)),
                  })} /></label>
            </div>
          ))}

          {SPRACHCODES.map((code) => (
            <label key={code} style={beschriftung}>Rückmeldung {code.toUpperCase()}
              <textarea rows={3} style={feld} value={regel.feedback?.[code] ?? ''}
                onChange={(e) => aendereRegel({ ...regel, feedback: { ...regel.feedback, [code]: e.target.value } })} /></label>
          ))}

          <div style={{ ...block, marginTop: 18 }}>
            <strong style={{ fontSize: 13 }}>Algorithmus</strong>
            <p style={{ fontSize: 12, color: '#5a6b86', margin: '4px 0 0' }}>Gilt für alle Fälle, nicht nur für diesen.</p>
            {STELLSCHRAUBEN.map((s) => (
              <label key={s.id} style={beschriftung}>{s.name}
                <span style={{ display: 'block', fontWeight: 400, fontSize: 11.5, color: '#5a6b86' }}>{s.hilfe}</span>
                <input type="number" style={{ ...feld, maxWidth: 110 }} value={entwurf.stellschrauben[s.id] ?? ''}
                  onChange={(e) => setEntwurf({ ...entwurf, stellschrauben: { ...entwurf.stellschrauben, [s.id]: Number(e.target.value) } })} /></label>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}


function GlobalEditor({ inhalte, setInhalte, onSchliessen }) {
  const [datei, setDatei] = useState('settings');
  return (
    <aside data-admin-schutz style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(520px, 96vw)', zIndex: 2147483150,
      background: '#fff', borderLeft: '1px solid #dce3ee', boxShadow: '-8px 0 28px rgba(13,36,79,.16)',
      overflowY: 'auto', padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <strong>Alle Live-Daten bearbeiten</strong>
        <button type="button" onClick={onSchliessen} style={{ marginLeft: 'auto' }}>Schließen</button>
      </div>
      <p style={{ fontSize: 12.5, color: '#5a6b86' }}>
        Jede Änderung wird sofort in der laufenden Vorschau übernommen. Die Struktur muss gültiges JSON bleiben.
      </p>
      <label style={beschriftung}>Datei
        <select style={feld} value={datei} onChange={(e) => setDatei(e.target.value)}>
          {FILES.map((name) => <option key={name} value={name}>content/{name}.json</option>)}
        </select>
      </label>
      <JsonFeld wert={inhalte[datei]} onChange={(wert) => setInhalte({ ...inhalte, [datei]: wert })} zeilen={28} />
      {datei === 'settings' && (
        <div style={block}>
          <strong style={{ fontSize: 13 }}>Wichtige Spielwerte</strong>
          {[
            ['targetScore', 'Punkte zum Gewinnen'],
            ['loseScore', 'Punkte zum Verlieren'],
            ['defaultTimeLimit', 'Standardzeit in Sekunden'],
            ['maxTips', 'Anzahl Tipps'],
            ['notificationDelayMin', 'Push-Abstand Minimum in ms'],
            ['notificationDelayMax', 'Push-Abstand Maximum in ms'],
            ['notificationHistoryLimit', 'Gespeicherte Pushmeldungen'],
          ].map(([key, label]) => (
            <label key={key} style={beschriftung}>{label}
              <input type="number" style={feld} value={inhalte.settings?.[key] ?? ''}
                onChange={(e) => setInhalte({ ...inhalte, settings: { ...inhalte.settings, [key]: Number(e.target.value) } })} />
            </label>
          ))}
          <label style={{ ...beschriftung, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={inhalte.settings?.endWhenAllTasksCompleted !== false}
              onChange={(e) => setInhalte({ ...inhalte, settings: { ...inhalte.settings, endWhenAllTasksCompleted: e.target.checked } })} />
            Mission endet, wenn alle Aufgaben bearbeitet sind
          </label>
        </div>
      )}
    </aside>
  );
}

/* ---------- Codeansicht ---------- */
function CodeAnsicht({ inhalte, entwurf, onSchliessen }) {
  const dateien = useMemo(() => ({
    ...Object.fromEntries(FILES.map((n) => [`content/${n}.json`, `${JSON.stringify(inhalte[n], null, 2)}\n`])),
    ...erzeugeCodeDateien(entwurf),
  }), [inhalte, entwurf]);
  const [aktiv, setAktiv] = useState(Object.keys(dateien)[0]);
  const [kopiert, setKopiert] = useState(false);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(dateien[aktiv]);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1600);
    } catch {
      window.prompt('Markieren und Strg+C:', dateien[aktiv]);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2147483200, background: 'rgba(7,13,27,.6)', padding: 24 }} onClick={onSchliessen}>
      <section onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 940, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#fff', borderRadius: 14, padding: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong>Quelltext zum Kopieren</strong>
          <button type="button" onClick={kopieren}>{kopiert ? 'Kopiert' : 'Diese Datei kopieren'}</button>
          <button type="button" onClick={onSchliessen} style={{ marginLeft: 'auto' }}>Schließen</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
          {Object.keys(dateien).map((p) => (
            <button key={p} type="button" onClick={() => setAktiv(p)}
              style={{
                padding: '5px 9px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '1px solid #dce3ee',
                background: p === aktiv ? '#092b61' : '#fff', color: p === aktiv ? '#fff' : '#182235',
              }}>{p}</button>
          ))}
        </div>
        <pre style={{
          flex: 1, margin: 0, padding: 12, overflow: 'auto', borderRadius: 10,
          background: '#0f1b30', color: '#e6edf7', fontSize: 12.5, lineHeight: 1.5,
        }}>{dateien[aktiv]}</pre>
      </section>
    </div>
  );
}

/* ---------- Hauptkomponente ---------- */
export default function InlineAdmin() {
  const [modus, setModus] = useState('spielen');
  const [inhalte, setInhalte] = useState(null);
  const [entwurf, setEntwurf] = useState(ladeEntwurf);
  const [ziel, setZiel] = useState(null);
  const [zeigeCode, setZeigeCode] = useState(false);
  const [zeigeDaten, setZeigeDaten] = useState(false);
  const [meldung, setMeldung] = useState('');

  useEffect(() => {
    const gespeichert = (() => {
      try { return JSON.parse(localStorage.getItem(INHALT_SCHLUESSEL)); } catch { return null; }
    })();
    if (gespeichert) { setInhalte(gespeichert); return; }
    Promise.all(FILES.map(async (n) => {
      const antwort = await fetch(joinBase(`content/${n}.json`), { cache: 'no-store' });
      if (!antwort.ok) throw new Error(`content/${n}.json: Status ${antwort.status}`);
      return [n, await antwort.json()];
    })).then((paare) => setInhalte(Object.fromEntries(paare)))
      .catch((f) => setMeldung(f.message));
  }, []);

  useEffect(() => {
    if (inhalte) { try { localStorage.setItem(INHALT_SCHLUESSEL, JSON.stringify(inhalte)); } catch { /* voll */ } }
  }, [inhalte]);

  useEffect(() => { speichereEntwurf(entwurf); }, [entwurf]);

  const klick = useCallback((e) => {
    // Im Spielmodus wird NICHTS abgefangen - ausser du haeltst Alt.
    const willBearbeiten = e.altKey || modus === 'bearbeiten';
    if (!willBearbeiten) return;
    if (e.target.closest('[data-admin-schutz]')) return;
    // Kopfleiste und Navigation bleiben immer bedienbar, ausser mit Alt.
    if (!e.altKey && e.target.closest('.bottom-nav, .app-header')) return;
    const gefunden = findeZiel(e.target, inhalte || {}, entwurf);
    if (!gefunden) return;
    e.preventDefault();
    e.stopPropagation();
    setZiel(gefunden);
  }, [modus, inhalte, entwurf]);

  const geaendert = useMemo(() => geaenderteCodeDateien(entwurf), [entwurf]);

  if (meldung) {
    return <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <p><strong>Die Inhalte konnten nicht geladen werden.</strong></p>
      <p>{meldung}</p>
      <p>Der Adminmodus braucht einen Server — npm run dev oder die veröffentlichte Adresse, nicht per Doppelklick.</p>
    </div>;
  }
  if (!inhalte) return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Inhalte werden geladen …</div>;

  return (
    <div onClickCapture={klick}>
      {modus === 'bearbeiten' && <style>{MARKIER_CSS}</style>}

      <App contentOverride={inhalte} previewMode />

      <AdminKopfKnopf aktiv onClick={() => { window.location.hash = ''; window.location.reload(); }} />

      <div data-admin-schutz style={{
        position: 'fixed', left: 12, bottom: 12, zIndex: 2147483050, maxWidth: 'min(420px, 94vw)',
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: 10, borderRadius: 12,
        background: 'rgba(255,255,255,.97)', border: '1px solid #dce3ee', boxShadow: '0 8px 22px rgba(13,36,79,.16)',
      }}>
        <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 999, overflow: 'hidden' }}>
          {[['spielen', 'Spielen'], ['bearbeiten', 'Bearbeiten']].map(([id, name]) => (
            <button key={id} type="button" onClick={() => { setModus(id); setZiel(null); }}
              style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', font: 'inherit',
                fontSize: 12, fontWeight: 800,
                background: modus === id ? '#092b61' : 'transparent',
                color: modus === id ? '#fff' : '#092b61',
              }}>{name}</button>
          ))}
        </div>
        <button type="button" onClick={() => setZeigeDaten(true)}>Alle Daten</button>
        <button type="button" onClick={() => setZeigeCode(true)}>Code</button>
        <button type="button" onClick={() => ladeZipHerunter(inhalte, entwurf)}>ZIP</button>
        <button type="button" onClick={() => {
          if (!window.confirm('Alle Änderungen verwerfen und den Auslieferungsstand laden?')) return;
          try { localStorage.removeItem(INHALT_SCHLUESSEL); } catch { /* nichts */ }
          setEntwurf(leerEntwurf());
          window.location.reload();
        }}>Zurücksetzen</button>
        <p style={{ width: '100%', margin: 0, fontSize: 11.5, lineHeight: 1.45, color: '#5a6b86' }}>
          {modus === 'spielen'
            ? 'Die App verhält sich wie für die Kinder. Zum Ändern: Alt gedrückt halten und klicken.'
            : 'Klick öffnet die Bearbeitung. Zum Durchspielen auf „Spielen“ wechseln.'}
          {geaendert.length > 0 && <span style={{ color: '#a3382c' }}> · {geaendert.length} Codedatei(en) geändert</span>}
        </p>
      </div>

      {ziel && (
        <div data-admin-schutz>
          <Seitenfeld ziel={ziel} inhalte={inhalte} setInhalte={setInhalte}
            entwurf={entwurf} setEntwurf={setEntwurf} onSchliessen={() => setZiel(null)} />
        </div>
      )}

      {zeigeDaten && (
        <GlobalEditor inhalte={inhalte} setInhalte={setInhalte} onSchliessen={() => setZeigeDaten(false)} />
      )}

      {zeigeCode && (
        <div data-admin-schutz>
          <CodeAnsicht inhalte={inhalte} entwurf={entwurf} onSchliessen={() => setZeigeCode(false)} />
        </div>
      )}
    </div>
  );
}
