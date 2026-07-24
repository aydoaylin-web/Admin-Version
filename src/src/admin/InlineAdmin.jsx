import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

   Grundgedanke: Es gibt nur EINE App. Der Adminmodus rendert
   genau dieselbe Schueleransicht und legt eine Erkennungsschicht
   darueber. Ein Klick auf ein Element oeffnet das passende
   Bearbeitungsfeld daneben - der Feed bleibt stehen.

   App.jsx wird dafuer NICHT veraendert. Die Zuordnung laeuft
   ueber das, was die App ohnehin schon ausgibt:
     Feed-Beitrag      article[data-post-id]  (schon vorhanden)
     Feed-Pruefung     ueber den Bildpfad im .task-sheet
     Oberflaechentext  ueber den Textinhalt, der in den
                       Uebersetzungen gesucht wird

   Eine weitere Stelle anklickbar machen: unten in
   findeZiel() einen weiteren Zweig ergaenzen.
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

/* Umrandung der anklickbaren Stellen. Wird nur im Bearbeitenmodus
   eingehaengt, damit die Schueleransicht voellig unberuehrt bleibt. */
const MARKIER_CSS = `
[data-post-id]{ outline:2px dashed rgba(219,43,115,.55); outline-offset:3px; border-radius:14px; cursor:pointer; }
[data-post-id]:hover{ outline-color:#db2b73; outline-style:solid; background:rgba(219,43,115,.04); }
.task-sheet{ outline:2px dashed rgba(31,158,120,.5); outline-offset:-2px; }
.app-header, .bottom-nav{ outline:1px dashed rgba(9,43,97,.35); }
.dd-admin-aktiv .post-image-button, .dd-admin-aktiv .comment-link{ pointer-events:none; }
`;

export function AdminKopfKnopf({ aktiv, onClick }) {
  const [ziel, setZiel] = useState(null);
  useEffect(() => {
    // Die Kopfleiste gehoert zur App und wird erst nach ihr gerendert,
    // deshalb kurz warten statt sofort zu suchen.
    let versuche = 0;
    const timer = setInterval(() => {
      const el = document.querySelector('.app-header .header-actions');
      versuche += 1;
      if (el || versuche > 40) {
        clearInterval(timer);
        setZiel(el || null);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const knopf = (
    <button type="button" data-admin-schutz onClick={onClick} aria-label="Adminmodus"
      title={aktiv ? 'Bearbeiten beenden' : 'Bearbeiten starten'}
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

/* ---------- Zielbestimmung: worauf wurde geklickt? ---------- */
function findeZiel(el, inhalte, entwurf) {
  const beitrag = el.closest('[data-post-id]');
  if (beitrag) return { art: 'beitrag', postId: beitrag.getAttribute('data-post-id') };

  const blatt = el.closest('.task-sheet');
  if (blatt) {
    const bild = blatt.querySelector('img.post-image, .task-image-button img');
    const quelle = bild ? bild.getAttribute('src') : '';
    const post = (inhalte.posts || []).find((p) => quelle && quelle.endsWith(String(p.media).replace(/^\//, '')));
    const imBegruendungsteil = el.closest('textarea, .verdict-question, .feedback, .reason, .verdict-card, .verdict-option');
    if (post) return { art: imBegruendungsteil ? 'bewertung' : 'beitrag', postId: post.id };
  }

  // Oberflaechentext: den sichtbaren Text in den Uebersetzungen suchen.
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

/* ---------- Bearbeitungsfeld ---------- */
function Seitenfeld({ ziel, inhalte, setInhalte, entwurf, setEntwurf, onSchliessen }) {
  const post = (inhalte.posts || []).find((p) => p.id === ziel.postId);
  const task = (inhalte.tasks || []).find((t) => t.postId === ziel.postId);

  function aenderePost(schluessel, wert) {
    setInhalte({ ...inhalte, posts: inhalte.posts.map((p) => (p.id === post.id ? { ...p, [schluessel]: wert } : p)) });
  }
  function aendereTask(schluessel, wert) {
    setInhalte({ ...inhalte, tasks: inhalte.tasks.map((t) => (t.id === task.id ? { ...t, [schluessel]: wert } : t)) });
  }
  function aendereRegel(neu) {
    setEntwurf({ ...entwurf, reasonConcepts: { ...entwurf.reasonConcepts, [ziel.postId]: neu } });
  }
  function aendereText(code, wert) {
    setEntwurf({
      ...entwurf,
      translations: { ...entwurf.translations, [code]: { ...entwurf.translations[code], [ziel.schluessel]: wert } },
    });
  }

  const zweisprachig = (wert, code) => (wert && typeof wert === 'object' ? (wert[code] ?? '') : (code === 'de' ? (wert ?? '') : ''));
  const setzeZweisprachig = (wert, code, neu) => (wert && typeof wert === 'object' ? { ...wert, [code]: neu } : { de: code === 'de' ? neu : (wert ?? ''), en: code === 'en' ? neu : '' });

  const regel = entwurf.reasonConcepts[ziel.postId];

  return (
    <aside style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 92vw)', zIndex: 2147483100,
      background: '#fff', borderLeft: '1px solid #dce3ee', boxShadow: '-8px 0 28px rgba(13,36,79,.16)',
      overflowY: 'auto', padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <strong style={{ fontSize: 15 }}>
          {ziel.art === 'text' ? 'Oberflächentext' : ziel.art === 'bewertung' ? 'Bewertung & Algorithmus' : 'Beitrag'}
        </strong>
        <code style={{ fontSize: 11, background: '#eef2f8', padding: '2px 6px', borderRadius: 6 }}>
          {ziel.schluessel || ziel.postId}
        </code>
        <button type="button" onClick={onSchliessen} style={{ marginLeft: 'auto' }}>Schließen</button>
      </div>

      {ziel.art === 'text' && SPRACHCODES.map((code) => (
        <label key={code} style={beschriftung}>
          {code.toUpperCase()}
          <textarea rows={3} style={feld} value={entwurf.translations[code]?.[ziel.schluessel] ?? ''}
            onChange={(e) => aendereText(code, e.target.value)} />
        </label>
      ))}

      {ziel.art === 'beitrag' && post && (
        <>
          <label style={beschriftung}>Benutzername
            <input style={feld} value={post.username || ''} onChange={(e) => aenderePost('username', e.target.value)} />
          </label>
          <label style={beschriftung}>Ort
            <input style={feld} value={post.location || ''} onChange={(e) => aenderePost('location', e.target.value)} />
          </label>
          <label style={beschriftung}>Likes
            <input type="number" style={feld} value={post.likes ?? 0} onChange={(e) => aenderePost('likes', Number(e.target.value))} />
          </label>
          {SPRACHCODES.map((code) => (
            <label key={code} style={beschriftung}>Bildunterschrift {code.toUpperCase()}
              <textarea rows={3} style={feld} value={zweisprachig(post.caption, code)}
                onChange={(e) => aenderePost('caption', setzeZweisprachig(post.caption, code, e.target.value))} />
            </label>
          ))}
          {task && (
            <>
              <label style={beschriftung}>Richtiges Urteil
                <select style={feld} value={task.correctVerdict || ''} onChange={(e) => aendereTask('correctVerdict', e.target.value)}>
                  {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              {regel && regel.verdict !== task.correctVerdict && (
                <p style={{ fontSize: 12, color: '#a3382c', marginTop: 6 }}>
                  Die Bewertungsregel steht noch auf „{regel.verdict}“.{' '}
                  <button type="button" onClick={() => aendereRegel({ ...regel, verdict: task.correctVerdict })}>
                    Mitziehen
                  </button>
                </p>
              )}
              <label style={beschriftung}>Punkte richtig
                <input type="number" style={feld} value={task.pointsCorrect ?? 1} onChange={(e) => aendereTask('pointsCorrect', Number(e.target.value))} />
              </label>
              <label style={beschriftung}>Zeitlimit in Sekunden
                <input type="number" style={feld} value={task.timeLimit ?? 180} onChange={(e) => aendereTask('timeLimit', Number(e.target.value))} />
              </label>
            </>
          )}
        </>
      )}

      {ziel.art === 'bewertung' && regel && (
        <>
          <label style={beschriftung}>Erwartetes Urteil
            <select style={feld} value={regel.verdict} onChange={(e) => aendereRegel({ ...regel, verdict: e.target.value })}>
              {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>

          {(regel.concepts || []).map((k, i) => (
            <div key={i} style={{ marginTop: 14, padding: 12, borderRadius: 10, background: '#f7f9fc', border: '1px solid #dce3ee' }}>
              <strong style={{ fontSize: 12.5 }}>Konzept {i + 1}</strong>
              <label style={beschriftung}>Stichwörter, mit Komma getrennt
                <textarea rows={2} style={feld} value={(k.terms || []).join(', ')}
                  onChange={(e) => aendereRegel({
                    ...regel,
                    concepts: regel.concepts.map((c, j) => (j === i ? { ...c, terms: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } : c)),
                  })} />
              </label>
              <label style={beschriftung}>Ganze Phrasen, mit Komma getrennt
                <textarea rows={3} style={feld} value={(k.phrases || []).join(', ')}
                  onChange={(e) => aendereRegel({
                    ...regel,
                    concepts: regel.concepts.map((c, j) => (j === i ? { ...c, phrases: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } : c)),
                  })} />
              </label>
            </div>
          ))}

          {SPRACHCODES.map((code) => (
            <label key={code} style={beschriftung}>Rückmeldung {code.toUpperCase()}
              <textarea rows={3} style={feld} value={regel.feedback?.[code] ?? ''}
                onChange={(e) => aendereRegel({ ...regel, feedback: { ...regel.feedback, [code]: e.target.value } })} />
            </label>
          ))}

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #e6ebf3' }}>
            <strong style={{ fontSize: 13 }}>Algorithmus</strong>
            <p style={{ fontSize: 12, color: '#5a6b86', margin: '4px 0 0' }}>
              Gilt für alle Fälle, nicht nur für diesen.
            </p>
            {STELLSCHRAUBEN.map((s) => (
              <label key={s.id} style={beschriftung}>{s.name}
                <span style={{ display: 'block', fontWeight: 400, fontSize: 11.5, color: '#5a6b86' }}>{s.hilfe}</span>
                <input type="number" style={{ ...feld, maxWidth: 110 }} value={entwurf.stellschrauben[s.id] ?? ''}
                  onChange={(e) => setEntwurf({ ...entwurf, stellschrauben: { ...entwurf.stellschrauben, [s.id]: Number(e.target.value) } })} />
              </label>
            ))}
          </div>
        </>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 2147483200, background: 'rgba(7,13,27,.6)', padding: 24 }}
      onClick={onSchliessen}>
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
                padding: '5px 9px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                border: '1px solid #dce3ee',
                background: p === aktiv ? '#092b61' : '#fff',
                color: p === aktiv ? '#fff' : '#182235',
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
  const [bearbeiten, setBearbeiten] = useState(true);
  const [inhalte, setInhalte] = useState(null);
  const [entwurf, setEntwurf] = useState(ladeEntwurf);
  const [ziel, setZiel] = useState(null);
  const [zeigeCode, setZeigeCode] = useState(false);
  const [meldung, setMeldung] = useState('');
  const huelle = useRef(null);

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
    if (!bearbeiten) return;
    if (e.target.closest('[data-admin-schutz]')) return;
    // Kopfleiste und untere Navigation bleiben bedienbar, sonst kaemst du
    // im Adminmodus nicht mehr zwischen den Tabs hin und her. Ihre
    // Beschriftungen aenderst du dort mit gedrueckter Alt-Taste.
    const istBedienleiste = e.target.closest('.bottom-nav, .app-header');
    if (istBedienleiste && !e.altKey) return;
    const gefunden = findeZiel(e.target, inhalte || {}, entwurf);
    if (!gefunden) return;
    e.preventDefault();
    e.stopPropagation();
    setZiel(gefunden);
  }, [bearbeiten, inhalte, entwurf]);

  const geaendert = useMemo(() => geaenderteCodeDateien(entwurf), [entwurf]);

  if (meldung) {
    return <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <p><strong>Die Inhalte konnten nicht geladen werden.</strong></p>
      <p>{meldung}</p>
      <p>Der Adminmodus braucht einen Server. Also npm run dev oder die veröffentlichte Adresse, nicht per Doppelklick.</p>
    </div>;
  }
  if (!inhalte) return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Inhalte werden geladen …</div>;

  return (
    <div ref={huelle} className={bearbeiten ? 'dd-admin-aktiv' : ''} onClickCapture={klick}>
      {bearbeiten && <style>{MARKIER_CSS}</style>}

      <App contentOverride={inhalte} previewMode />

      <AdminKopfKnopf aktiv={bearbeiten} onClick={() => { setBearbeiten((v) => !v); setZiel(null); }} />

      {bearbeiten && (
        <div data-admin-schutz style={{
          position: 'fixed', left: 12, bottom: 12, zIndex: 2147483050, display: 'flex', gap: 8,
          flexWrap: 'wrap', padding: 8, borderRadius: 12, background: 'rgba(255,255,255,.96)',
          border: '1px solid #dce3ee', boxShadow: '0 8px 22px rgba(13,36,79,.16)',
        }}>
          <span style={{ fontSize: 12, alignSelf: 'center', maxWidth: 260, lineHeight: 1.4, color: geaendert.length ? '#a3382c' : '#5a6b86' }}>
            {geaendert.length ? `${geaendert.length} Codedatei(en) geändert` : 'nur Inhalte geändert'}
            <br />
            <span style={{ color: '#5a6b86' }}>Navigation bleibt bedienbar — ihre Beschriftungen mit Alt+Klick ändern.</span>
          </span>
          <button type="button" onClick={() => setZeigeCode(true)}>Code anzeigen</button>
          <button type="button" onClick={() => ladeZipHerunter(inhalte, entwurf)}>ZIP herunterladen</button>
          <button type="button" onClick={() => {
            if (!window.confirm('Alle Änderungen verwerfen und den Auslieferungsstand laden?')) return;
            try { localStorage.removeItem(INHALT_SCHLUESSEL); } catch { /* nichts */ }
            setEntwurf(leerEntwurf());
            window.location.reload();
          }}>Zurücksetzen</button>
        </div>
      )}

      {ziel && (
        <div data-admin-schutz>
          <Seitenfeld ziel={ziel} inhalte={inhalte} setInhalte={setInhalte}
            entwurf={entwurf} setEntwurf={setEntwurf} onSchliessen={() => setZiel(null)} />
        </div>
      )}

      {zeigeCode && (
        <div data-admin-schutz>
          <CodeAnsicht inhalte={inhalte} entwurf={entwurf} onSchliessen={() => setZeigeCode(false)} />
        </div>
      )}
    </div>
  );
}
