import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import App from '../App.jsx';
import {
  ladeEntwurf, speichereEntwurf, leerEntwurf,
  erzeugeCodeDateien, geaenderteCodeDateien, SPRACHCODES,
} from './codeEntwurf.js';
import { STELLSCHRAUBEN } from './codegen.js';
import { ladeZipHerunter, baueDateiListe } from './zipExport.js';

/* ============================================================
   INLINE-ADMIN

   Drei Fehler der Vorfassung sind hier behoben:

   1. Die Analysewerkzeuge liessen sich nicht bearbeiten.
      Der Auf-/Zuklapp-Knopf heisst .analysis-tool-toggle und
      liegt AUSSERHALB von .analysis-tool-content. Im
      Bearbeitenmodus wurde er abgefangen, das Werkzeug ging
      also nie auf - und was nie aufgeht, kann man auch nicht
      anklicken. Loesung: Bedienelemente (Knoepfe, Links,
      Eingaben) bleiben im Bearbeitenmodus IMMER benutzbar.
      Bearbeitet wird dort mit Alt + Klick.

   2. Keine Liveansicht des geaenderten Objekts.
      App.jsx haelt activeTask und activePost als Momentaufnahme
      im eigenen Zustand, gesetzt beim Oeffnen der Feed-Pruefung.
      Aenderst du waehrenddessen etwas, sieht die offene Pruefung
      es nicht. Loesung: die Vorschau bekommt einen Schluessel und
      wird neu aufgebaut - automatisch, solange keine Pruefung
      offen ist, sonst auf Knopfdruck.

   3. Der ZIP-Export ignorierte "nur geaenderte Dateien".
      ladeZipHerunter nahm nur zwei Werte entgegen, der dritte
      fiel weg. Ist in zipExport.js nachgezogen.

   Neu ausserdem: der vollstaendige neue Dateiinhalt ist aus
   jedem Bearbeitungsfeld heraus erreichbar, und Aenderungen
   lassen sich einzeln oder gesamt verwerfen.
   ============================================================ */

const INHALT_SCHLUESSEL = 'dd-admin-inhalte-v4';
const CONTENT_DATEIEN = ['settings', 'posts', 'tasks', 'profiles', 'stories', 'guides'];
const VERDICTS = ['echt', 'suspekt', 'manipuliert'];
const ANALYSE_WERKZEUGE = [
  { id: 'quelle', label: 'Quellenprüfung', datei: 'content/posts.json' },
  { id: 'profil', label: 'Profilprüfung', datei: 'content/profiles.json' },
  { id: 'herkunft', label: 'Bildherkunft', datei: 'content/posts.json' },
  { id: 'bild', label: 'Bildanalyse und Hotspots', datei: 'src/data/imageHotspots.js' },
];

/* Bedienelemente. Ein Klick darauf loest im Bearbeitenmodus die
   normale Aktion aus, damit die App bedienbar bleibt. Zum
   Bearbeiten Alt gedrueckt halten. */
const BEDIENELEMENTE = 'button, a, summary, input, select, option, label, [role="button"], [role="tab"]';

const joinBase = (p) => `${import.meta.env.BASE_URL}${String(p).replace(/^\//, '')}`;
const klone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
const alsListe = (v) => (Array.isArray(v) ? v : []);
const alsObjekt = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const alsText = (v) => `${JSON.stringify(v, null, 2)}\n`;

const feld = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
  marginTop: 4, border: '1px solid #cbd5e1', font: 'inherit', fontSize: 13, background: '#fff',
};
const beschriftung = { display: 'block', fontSize: 12, fontWeight: 700, color: '#3d4c66', marginTop: 12 };
const block = { marginTop: 14, padding: 12, borderRadius: 10, background: '#f7f9fc', border: '1px solid #dce3ee' };

const MARKIER_CSS = `
[data-post-id]{ outline:2px dashed rgba(219,43,115,.5); outline-offset:3px; border-radius:14px; }
[data-post-id]:hover{ outline-color:#db2b73; outline-style:solid; }
.analysis-tool-content{ outline:2px dashed rgba(31,158,120,.45); outline-offset:-2px; border-radius:10px; }
.analysis-tool-content:hover{ outline-color:#1f9e78; outline-style:solid; }
.task-sheet textarea{ outline:2px dashed rgba(31,158,120,.38); }
`;

function zwei(wert, code) {
  if (wert && typeof wert === 'object' && !Array.isArray(wert)) return wert[code] ?? '';
  return code === 'de' ? (wert ?? '') : '';
}
function setzeZwei(wert, code, neu) {
  if (wert && typeof wert === 'object' && !Array.isArray(wert)) return { ...wert, [code]: neu };
  return { de: code === 'de' ? neu : (wert ?? ''), en: code === 'en' ? neu : '' };
}

/* ---------- Knopf in der Kopfzeile der App ---------- */
export function AdminKopfKnopf({ aktiv, onClick }) {
  const [ziel, setZiel] = useState(null);
  useEffect(() => {
    let versuche = 0;
    const uhr = window.setInterval(() => {
      const el = document.querySelector('.app-header .header-actions') || document.querySelector('.app-header');
      versuche += 1;
      if (el || versuche > 50) { window.clearInterval(uhr); setZiel(el || null); }
    }, 100);
    return () => window.clearInterval(uhr);
  }, []);

  const knopf = (
    <button type="button" data-admin-schutz onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 34, padding: '5px 10px',
        borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 800,
        border: `1px solid ${aktiv ? '#db2b73' : 'rgba(9,43,97,.25)'}`,
        background: aktiv ? '#db2b73' : 'transparent', color: aktiv ? '#fff' : '#092b61',
      }}>
      {aktiv ? 'Admin beenden' : 'Admin'}
    </button>
  );
  if (ziel) return createPortal(knopf, ziel);
  return <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 2147483000 }}>{knopf}</div>;
}

/* ---------- Zielerkennung ---------- */
function postAusBlatt(blatt, inhalte) {
  if (!blatt) return null;
  const bild = blatt.querySelector('img.post-image, .task-image-button img, .hotspot-image, img');
  const quelle = bild?.getAttribute('src') || '';
  if (!quelle) return null;
  return alsListe(inhalte.posts).find((p) => p?.media && quelle.endsWith(String(p.media).replace(/^\//, ''))) || null;
}

function findeTextSchluessel(element, entwurf) {
  let knoten = element;
  for (let i = 0; i < 6 && knoten; i += 1) {
    const text = String(knoten.textContent || '').trim();
    if (text && text.length <= 180) {
      for (const code of SPRACHCODES) {
        const eintraege = alsObjekt(entwurf?.translations?.[code]);
        const schluessel = Object.keys(eintraege).find((k) => String(eintraege[k]).trim() === text);
        if (schluessel) return schluessel;
      }
    }
    knoten = knoten.parentElement;
  }
  return null;
}

export function findeZiel(element, inhalte, entwurf) {
  if (!element || element.closest('[data-admin-schutz]')) return null;

  const blatt = element.closest('.task-sheet');
  const werkzeug = element.closest('.analysis-tool-content');

  if (werkzeug && blatt) {
    const post = postAusBlatt(blatt, inhalte);
    if (post) {
      if (werkzeug.querySelector('.origin-check, .origin-hit, .origin-empty')) return { art: 'herkunft', postId: post.id };
      if (werkzeug.querySelector('.profile-check-head, .profile-check-bio, .profile-check-avatar')) return { art: 'profil', postId: post.id };
      if (werkzeug.querySelector('.source-browser-bar, .linked-page-preview, .linked-page-kicker')) return { art: 'quelle', postId: post.id };
      return { art: 'zonen', postId: post.id };
    }
  }

  if (blatt) {
    const post = postAusBlatt(blatt, inhalte);
    if (post) {
      const bewertung = element.closest(
        'textarea, .verdict-question, .feedback, .reason, .verdict-card, .verdict-option, .verdict-row, .confidence-rating, .decision-section',
      );
      return { art: bewertung ? 'bewertung' : 'beitrag', postId: post.id };
    }
  }

  const feedPost = element.closest('[data-post-id]');
  if (feedPost) return { art: 'beitrag', postId: feedPost.getAttribute('data-post-id') };

  if (element.closest('.score-chip, .timer, .app-header')) return { art: 'einstellungen' };
  if (element.closest('.bottom-nav, nav')) return { art: 'einstellungen' };

  const schluessel = findeTextSchluessel(element, entwurf);
  if (schluessel) return { art: 'text', schluessel };

  return { art: 'alle-daten' };
}

function dateienFuerZiel(art) {
  return {
    beitrag: ['content/posts.json', 'content/tasks.json'],
    profil: ['content/profiles.json'],
    quelle: ['content/posts.json'],
    herkunft: ['content/posts.json'],
    zonen: ['src/data/imageHotspots.js'],
    bewertung: ['content/tasks.json', 'src/data/reasonConcepts.js', 'src/data/conceptMatcher.js'],
    text: ['src/data/translations.js'],
    einstellungen: ['content/settings.json'],
    'alle-daten': CONTENT_DATEIEN.map((n) => `content/${n}.json`),
  }[art] || [];
}

/* ---------- JSON-Feld mit Gueltigkeitspruefung ---------- */
function JsonFeld({ wert, onChange, zeilen = 14, onFehler }) {
  const [text, setText] = useState(() => JSON.stringify(wert ?? {}, null, 2));
  const [fehler, setFehler] = useState('');
  useEffect(() => { setText(JSON.stringify(wert ?? {}, null, 2)); setFehler(''); }, [wert]);

  function tippen(neu) {
    setText(neu);
    try {
      const geparst = JSON.parse(neu);
      setFehler(''); onFehler?.(''); onChange(geparst);
    } catch (f) {
      const nachricht = f instanceof Error ? f.message : String(f);
      setFehler(nachricht); onFehler?.(nachricht);
    }
  }

  return (
    <>
      <textarea rows={zeilen} spellCheck={false} value={text} onChange={(e) => tippen(e.target.value)}
        style={{
          ...feld, resize: 'vertical', fontSize: 12, lineHeight: 1.5,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          borderColor: fehler ? '#d98b8b' : '#cbd5e1',
        }} />
      {fehler && <p style={{ fontSize: 11.5, color: '#a3382c', margin: '4px 0 0' }}>Noch nicht übernommen: {fehler}</p>}
    </>
  );
}

function VollstaendigesObjekt({ titel, datei, wert, onChange }) {
  const [offen, setOffen] = useState(false);
  return (
    <section style={block}>
      <button type="button" onClick={() => setOffen((v) => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 8, padding: 0, border: 0, background: 'transparent', font: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}>
        <strong style={{ fontSize: 13 }}>{titel}</strong>
        <span style={{ fontSize: 12 }}>{offen ? 'Schließen' : 'Alles bearbeiten'}</span>
      </button>
      <code style={{ display: 'block', marginTop: 5, fontSize: 11, color: '#5a6b86' }}>{datei}</code>
      {offen && <div style={{ marginTop: 10 }}><JsonFeld wert={wert} onChange={onChange} zeilen={22} /></div>}
    </section>
  );
}

/* Zeigt, welche Dateien betroffen sind - und oeffnet auf Klick
   den VOLLSTAENDIGEN neuen Inhalt der jeweiligen Datei. */
function DateiAnzeige({ dateien, geaenderte, onZeigeDatei }) {
  if (!dateien?.length) return null;
  return (
    <div style={{ marginTop: 10, padding: 10, borderRadius: 9, background: '#fff7df', border: '1px solid #efd486' }}>
      <strong style={{ display: 'block', fontSize: 12, color: '#674f0b', marginBottom: 6 }}>
        Diese Datei(en) ändern sich
      </strong>
      {dateien.map((d) => (
        <button key={d} type="button" onClick={() => onZeigeDatei(d)}
          style={{
            display: 'block', width: '100%', textAlign: 'left', marginTop: 4, padding: '5px 7px',
            borderRadius: 7, cursor: 'pointer', font: 'inherit', fontSize: 11.5,
            border: `1px solid ${geaenderte.includes(d) ? '#db2b73' : '#e3d6a8'}`,
            background: '#fff', color: geaenderte.includes(d) ? '#a33868' : '#493804',
            fontWeight: geaenderte.includes(d) ? 800 : 500, overflowWrap: 'anywhere',
          }}>
          {d}{geaenderte.includes(d) ? ' · geändert' : ''} — ganze Datei ansehen
        </button>
      ))}
    </div>
  );
}

/* ---------- Seitenfeld ---------- */
function Seitenfeld({
  ziel, inhalte, setInhalte, entwurf, setEntwurf, geaenderte,
  onSchliessen, onAlleDaten, onZeigeDatei, onVerwerfen,
}) {
  const post = alsListe(inhalte.posts).find((p) => String(p.id) === String(ziel.postId));
  const task = alsListe(inhalte.tasks).find((t) => String(t.postId) === String(ziel.postId));
  const profil = post ? alsListe(inhalte.profiles).find((p) => String(p.id) === String(post.profileId)) : null;
  const regel = entwurf?.reasonConcepts?.[ziel.postId] || null;
  const zonen = entwurf?.imageHotspots?.[ziel.postId] || { errorCount: 0, hotspots: [] };

  const setzePost = (k, v) => setInhalte((a) => ({ ...a, posts: alsListe(a.posts).map((e) => (String(e.id) === String(post.id) ? { ...e, [k]: v } : e)) }));
  const ersetzePost = (neu) => setInhalte((a) => ({ ...a, posts: alsListe(a.posts).map((e) => (String(e.id) === String(post.id) ? neu : e)) }));
  const setzeTask = (k, v) => setInhalte((a) => ({ ...a, tasks: alsListe(a.tasks).map((e) => (String(e.id) === String(task.id) ? { ...e, [k]: v } : e)) }));
  const ersetzeTask = (neu) => setInhalte((a) => ({ ...a, tasks: alsListe(a.tasks).map((e) => (String(e.id) === String(task.id) ? neu : e)) }));
  const setzeProfil = (k, v) => setInhalte((a) => ({ ...a, profiles: alsListe(a.profiles).map((e) => (String(e.id) === String(profil.id) ? { ...e, [k]: v } : e)) }));
  const ersetzeProfil = (neu) => setInhalte((a) => ({ ...a, profiles: alsListe(a.profiles).map((e) => (String(e.id) === String(profil.id) ? neu : e)) }));
  const setzeRegel = (neu) => setEntwurf((a) => ({ ...a, reasonConcepts: { ...alsObjekt(a.reasonConcepts), [ziel.postId]: neu } }));
  const setzeZonen = (neu) => setEntwurf((a) => ({ ...a, imageHotspots: { ...alsObjekt(a.imageHotspots), [ziel.postId]: neu } }));
  const setzeEinstellung = (k, v) => setInhalte((a) => ({ ...a, settings: { ...alsObjekt(a.settings), [k]: v } }));

  const titel = {
    beitrag: 'Beitrag', bewertung: 'Bewertung und Algorithmus', text: 'Oberflächentext',
    profil: 'Profilprüfung', quelle: 'Quellenprüfung', herkunft: 'Bildherkunft',
    zonen: 'Bildzonen', einstellungen: 'Spieleinstellungen', 'alle-daten': 'Alle Daten',
  }[ziel.art] || 'Bearbeiten';

  return (
    <aside data-admin-schutz style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(460px, 96vw)', zIndex: 2147483100,
      background: '#fff', borderLeft: '1px solid #dce3ee', boxShadow: '-8px 0 28px rgba(13,36,79,.16)',
      overflowY: 'auto', padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15 }}>{titel}</strong>
        {(ziel.schluessel || ziel.postId) && (
          <code style={{ fontSize: 11, background: '#eef2f8', padding: '2px 6px', borderRadius: 6 }}>
            {ziel.schluessel || ziel.postId}
          </code>
        )}
        <button type="button" onClick={onSchliessen} style={{ marginLeft: 'auto' }}>Schließen</button>
      </div>

      <DateiAnzeige dateien={dateienFuerZiel(ziel.art)} geaenderte={geaenderte} onZeigeDatei={onZeigeDatei} />

      <button type="button" onClick={() => onVerwerfen(ziel)} style={{ marginTop: 10 }}>
        Änderungen an diesem Element verwerfen
      </button>

      {ziel.art === 'alle-daten' && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#5a6b86' }}>
            Dieses Element gehört zu keiner einzelnen Datenstruktur. Im vollständigen
            Dateneditor kannst du jede Contentdatei direkt bearbeiten.
          </p>
          <button type="button" onClick={onAlleDaten}>Alle Daten öffnen</button>
        </div>
      )}

      {ziel.art === 'text' && (
        <>
          {SPRACHCODES.map((code) => (
            <label key={code} style={beschriftung}>{code.toUpperCase()}
              <textarea rows={4} style={feld}
                value={entwurf?.translations?.[code]?.[ziel.schluessel] ?? ''}
                onChange={(e) => setEntwurf((a) => ({
                  ...a,
                  translations: {
                    ...alsObjekt(a.translations),
                    [code]: { ...alsObjekt(a.translations?.[code]), [ziel.schluessel]: e.target.value },
                  },
                }))} />
            </label>
          ))}
          <VollstaendigesObjekt titel="Vollständige Übersetzungen" datei="src/data/translations.js"
            wert={entwurf.translations} onChange={(v) => setEntwurf((a) => ({ ...a, translations: v }))} />
        </>
      )}

      {ziel.art === 'einstellungen' && (
        <>
          <label style={beschriftung}>Zielpunktzahl
            <input type="number" style={feld} value={inhalte.settings?.targetScore ?? 20}
              onChange={(e) => setzeEinstellung('targetScore', Number(e.target.value))} /></label>
          <label style={beschriftung}>Standardzeit in Sekunden
            <input type="number" min="0" style={feld} value={inhalte.settings?.defaultTimeLimit ?? 180}
              onChange={(e) => setzeEinstellung('defaultTimeLimit', Number(e.target.value))} /></label>
          <VollstaendigesObjekt titel="Alle Einstellungen" datei="content/settings.json"
            wert={inhalte.settings} onChange={(v) => setInhalte((a) => ({ ...a, settings: v }))} />
        </>
      )}

      {ziel.art === 'beitrag' && post && (
        <>
          <label style={beschriftung}>Benutzername
            <input style={feld} value={post.username || ''} onChange={(e) => setzePost('username', e.target.value)} /></label>
          <label style={beschriftung}>Ort
            <input style={feld} value={post.location || ''} onChange={(e) => setzePost('location', e.target.value)} /></label>
          <label style={beschriftung}>Likes
            <input type="number" style={feld} value={post.likes ?? 0} onChange={(e) => setzePost('likes', Number(e.target.value))} /></label>
          <label style={beschriftung}>Bildpfad
            <input style={feld} value={post.media || ''} onChange={(e) => setzePost('media', e.target.value)} /></label>
          {SPRACHCODES.map((code) => (
            <label key={code} style={beschriftung}>Bildunterschrift {code.toUpperCase()}
              <textarea rows={4} style={feld} value={zwei(post.caption, code)}
                onChange={(e) => setzePost('caption', setzeZwei(post.caption, code, e.target.value))} /></label>
          ))}
          {task && (
            <div style={block}>
              <strong style={{ fontSize: 12.5 }}>Verknüpfte Aufgabe</strong>
              <label style={beschriftung}>Richtiges Urteil
                <select style={feld} value={task.correctVerdict || ''} onChange={(e) => setzeTask('correctVerdict', e.target.value)}>
                  <option value="">Keine Auswahl</option>
                  {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select></label>
              {regel && regel.verdict !== task.correctVerdict && (
                <p style={{ fontSize: 12, color: '#a3382c', marginTop: 6 }}>
                  Die Bewertungsregel steht noch auf „{regel.verdict}“.{' '}
                  <button type="button" onClick={() => setzeRegel({ ...regel, verdict: task.correctVerdict })}>Mitziehen</button>
                </p>
              )}
              <label style={beschriftung}>Punkte richtig
                <input type="number" style={feld} value={task.pointsCorrect ?? 1} onChange={(e) => setzeTask('pointsCorrect', Number(e.target.value))} /></label>
              <label style={beschriftung}>Zeitlimit in Sekunden
                <input type="number" min="0" style={feld} value={task.timeLimit ?? inhalte.settings?.defaultTimeLimit ?? 180}
                  onChange={(e) => setzeTask('timeLimit', Number(e.target.value))} /></label>
            </div>
          )}
          <VollstaendigesObjekt titel="Vollständigen Beitrag bearbeiten" datei="content/posts.json" wert={post} onChange={ersetzePost} />
          {task && <VollstaendigesObjekt titel="Vollständige Aufgabe bearbeiten" datei="content/tasks.json" wert={task} onChange={ersetzeTask} />}
        </>
      )}

      {ziel.art === 'profil' && profil && (
        <>
          <label style={beschriftung}>Benutzername
            <input style={feld} value={profil.username || ''} onChange={(e) => setzeProfil('username', e.target.value)} /></label>
          <label style={beschriftung}>Anzeigename
            <input style={feld} value={profil.displayName || ''} onChange={(e) => setzeProfil('displayName', e.target.value)} /></label>
          <label style={{ ...beschriftung, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={Boolean(profil.verified)} onChange={(e) => setzeProfil('verified', e.target.checked)} />
            Profil ist verifiziert
          </label>
          {SPRACHCODES.map((code) => (
            <label key={code} style={beschriftung}>Biografie {code.toUpperCase()}
              <textarea rows={4} style={feld} value={zwei(profil.bio, code)}
                onChange={(e) => setzeProfil('bio', setzeZwei(profil.bio, code, e.target.value))} /></label>
          ))}
          <label style={beschriftung}>Profilprüfung
            <JsonFeld wert={profil.profileCheck} onChange={(v) => setzeProfil('profileCheck', v)} zeilen={16} /></label>
          <VollstaendigesObjekt titel="Vollständiges Profil bearbeiten" datei="content/profiles.json" wert={profil} onChange={ersetzeProfil} />
        </>
      )}

      {ziel.art === 'quelle' && post && (
        <>
          <label style={beschriftung}>Quellenprüfung
            <JsonFeld wert={post.sourceCheck} onChange={(v) => setzePost('sourceCheck', v)} zeilen={20} /></label>
          <VollstaendigesObjekt titel="Vollständigen Beitrag bearbeiten" datei="content/posts.json" wert={post} onChange={ersetzePost} />
        </>
      )}

      {ziel.art === 'herkunft' && post && (
        <>
          <label style={beschriftung}>Bildherkunft / Rückwärtssuche
            <JsonFeld wert={post.imageOriginCheck} onChange={(v) => setzePost('imageOriginCheck', v)} zeilen={20} /></label>
          <VollstaendigesObjekt titel="Vollständigen Beitrag bearbeiten" datei="content/posts.json" wert={post} onChange={ersetzePost} />
        </>
      )}

      {ziel.art === 'zonen' && (
        <>
          <p style={{ fontSize: 12.5, color: '#5a6b86', lineHeight: 1.5 }}>
            x und y markieren die linke obere Ecke, w und h Breite und Höhe. Alles in Prozent.
          </p>
          {alsListe(zonen.hotspots).map((zone, i) => (
            <div key={i} style={block}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 12.5 }}>Zone {i + 1}</strong>
                <button type="button" style={{ marginLeft: 'auto' }}
                  onClick={() => setzeZonen({ ...zonen, hotspots: alsListe(zonen.hotspots).filter((_, j) => j !== i) })}>
                  Löschen
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
                {['x', 'y', 'w', 'h'].map((achse) => (
                  <label key={achse} style={{ fontSize: 12, marginTop: 8 }}>{achse}
                    <input type="number" style={feld} value={zone[achse] ?? 0}
                      onChange={(e) => setzeZonen({
                        ...zonen,
                        hotspots: alsListe(zonen.hotspots).map((z, j) => (j === i ? { ...z, [achse]: Number(e.target.value) } : z)),
                      })} /></label>
                ))}
              </div>
              <label style={beschriftung}>Hinweistext
                <textarea rows={4} style={feld} value={zone.hint || ''}
                  onChange={(e) => setzeZonen({
                    ...zonen,
                    hotspots: alsListe(zonen.hotspots).map((z, j) => (j === i ? { ...z, hint: e.target.value } : z)),
                  })} /></label>
            </div>
          ))}
          <button type="button" style={{ marginTop: 10 }}
            onClick={() => setzeZonen({
              ...zonen,
              errorCount: Number(zonen.errorCount || 0) + 1,
              hotspots: [...alsListe(zonen.hotspots), { x: 40, y: 30, w: 24, h: 30, hint: 'Neuer Hinweis' }],
            })}>Zone hinzufügen</button>
          <VollstaendigesObjekt titel="Alle Bildzonen dieses Beitrags" datei="src/data/imageHotspots.js" wert={zonen} onChange={setzeZonen} />
        </>
      )}

      {ziel.art === 'bewertung' && (
        <>
          {task && <VollstaendigesObjekt titel="Vollständige Aufgabe bearbeiten" datei="content/tasks.json" wert={task} onChange={ersetzeTask} />}
          {regel ? (
            <>
              <label style={beschriftung}>Erwartetes Urteil
                <select style={feld} value={regel.verdict || ''} onChange={(e) => setzeRegel({ ...regel, verdict: e.target.value })}>
                  <option value="">Keine Auswahl</option>
                  {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select></label>

              {alsListe(regel.concepts).map((konzept, i) => (
                <div key={i} style={block}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 12.5 }}>Konzept {i + 1}</strong>
                    <button type="button" style={{ marginLeft: 'auto' }}
                      onClick={() => setzeRegel({ ...regel, concepts: alsListe(regel.concepts).filter((_, j) => j !== i) })}>
                      Löschen
                    </button>
                  </div>
                  <label style={beschriftung}>Stichwörter, mit Komma getrennt
                    <textarea rows={3} style={feld} value={alsListe(konzept.terms).join(', ')}
                      onChange={(e) => setzeRegel({
                        ...regel,
                        concepts: alsListe(regel.concepts).map((c, j) => (j === i
                          ? { ...c, terms: e.target.value.split(',').map((w) => w.trim()).filter(Boolean) } : c)),
                      })} /></label>
                  <label style={beschriftung}>Ganze Phrasen, mit Komma getrennt
                    <textarea rows={4} style={feld} value={alsListe(konzept.phrases).join(', ')}
                      onChange={(e) => setzeRegel({
                        ...regel,
                        concepts: alsListe(regel.concepts).map((c, j) => (j === i
                          ? { ...c, phrases: e.target.value.split(',').map((w) => w.trim()).filter(Boolean) } : c)),
                      })} /></label>
                </div>
              ))}

              <button type="button" style={{ marginTop: 10 }}
                onClick={() => setzeRegel({ ...regel, concepts: [...alsListe(regel.concepts), { terms: [], phrases: [] }] })}>
                Konzept hinzufügen
              </button>

              {SPRACHCODES.map((code) => (
                <label key={code} style={beschriftung}>Rückmeldung {code.toUpperCase()}
                  <textarea rows={4} style={feld} value={regel.feedback?.[code] ?? ''}
                    onChange={(e) => setzeRegel({ ...regel, feedback: { ...alsObjekt(regel.feedback), [code]: e.target.value } })} /></label>
              ))}

              <VollstaendigesObjekt titel="Vollständige Bewertungsregel" datei="src/data/reasonConcepts.js" wert={regel} onChange={setzeRegel} />
            </>
          ) : (
            <div style={block}>
              <p style={{ fontSize: 12.5, color: '#5a6b86' }}>Für diesen Beitrag gibt es noch keine Bewertungsregel.</p>
              <button type="button"
                onClick={() => setzeRegel({ verdict: task?.correctVerdict || 'echt', concepts: [], feedback: { de: '', en: '' } })}>
                Bewertungsregel erstellen
              </button>
            </div>
          )}

          <div style={{ ...block, marginTop: 18 }}>
            <strong style={{ fontSize: 13 }}>Globaler Bewertungsalgorithmus</strong>
            <p style={{ fontSize: 12, color: '#5a6b86', margin: '4px 0 0' }}>Diese Werte gelten für alle Fälle.</p>
            {STELLSCHRAUBEN.map((s) => (
              <label key={s.id} style={beschriftung}>{s.name}
                <span style={{ display: 'block', fontWeight: 400, fontSize: 11.5, color: '#5a6b86' }}>{s.hilfe}</span>
                <input type="number" style={{ ...feld, maxWidth: 130 }} value={entwurf.stellschrauben?.[s.id] ?? ''}
                  onChange={(e) => setEntwurf((a) => ({
                    ...a, stellschrauben: { ...alsObjekt(a.stellschrauben), [s.id]: Number(e.target.value) },
                  }))} /></label>
            ))}
          </div>
        </>
      )}

      <div style={{ height: 24 }} />
    </aside>
  );
}

/* ---------- Alle Contentdateien ---------- */
function AlleDatenAnsicht({ inhalte, setInhalte, onSchliessen }) {
  const [aktiv, setAktiv] = useState(CONTENT_DATEIEN[0]);
  const [fehler, setFehler] = useState('');
  return (
    <div data-admin-schutz onClick={onSchliessen}
      style={{ position: 'fixed', inset: 0, zIndex: 2147483200, background: 'rgba(7,13,27,.64)', padding: 18 }}>
      <section onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100, height: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column',
        background: '#fff', borderRadius: 14, padding: 18, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong>Alle Contentdateien bearbeiten</strong>
          <button type="button" onClick={onSchliessen} style={{ marginLeft: 'auto' }}>Schließen</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
          {CONTENT_DATEIEN.map((d) => (
            <button key={d} type="button" onClick={() => { setAktiv(d); setFehler(''); }}
              style={{
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid #dce3ee',
                background: d === aktiv ? '#092b61' : '#fff', color: d === aktiv ? '#fff' : '#182235',
              }}>content/{d}.json</button>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <JsonFeld key={aktiv} wert={inhalte[aktiv]} onFehler={setFehler} zeilen={32}
            onChange={(v) => setInhalte((a) => ({ ...a, [aktiv]: v }))} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: fehler ? '#a3382c' : '#1e6b4f' }}>
          {fehler ? 'Wird erst übernommen, wenn das JSON gültig ist.' : `Aktive Datei: content/${aktiv}.json`}
        </div>
      </section>
    </div>
  );
}


/* ---------- Zentrale Bearbeitung aller Analysewerkzeuge ---------- */
function AnalysewerkzeugeAnsicht({
  inhalte,
  setInhalte,
  entwurf,
  setEntwurf,
  onSchliessen,
  onVorschau,
}) {
  const posts = alsListe(inhalte.posts);
  const [postId, setPostId] = useState(() => String(posts[0]?.id ?? ''));
  const [aktiv, setAktiv] = useState('quelle');
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    if (!posts.some((post) => String(post.id) === String(postId))) {
      setPostId(String(posts[0]?.id ?? ''));
    }
  }, [posts, postId]);

  const post = posts.find((eintrag) => String(eintrag.id) === String(postId)) || null;
  const profil = post
    ? alsListe(inhalte.profiles).find((eintrag) => String(eintrag.id) === String(post.profileId)) || null
    : null;
  const zonen = post ? (entwurf?.imageHotspots?.[post.id] || { errorCount: 0, hotspots: [] }) : null;

  const ersetzePost = (neu) => {
    if (!post) return;
    setInhalte((alt) => ({
      ...alt,
      posts: alsListe(alt.posts).map((eintrag) => (
        String(eintrag.id) === String(post.id) ? neu : eintrag
      )),
    }));
  };

  const setzePostTeil = (schluessel, wert) => {
    if (!post) return;
    ersetzePost({ ...post, [schluessel]: wert });
  };

  const ersetzeProfil = (neu) => {
    if (!profil) return;
    setInhalte((alt) => ({
      ...alt,
      profiles: alsListe(alt.profiles).map((eintrag) => (
        String(eintrag.id) === String(profil.id) ? neu : eintrag
      )),
    }));
  };

  const setzeZonen = (neu) => {
    if (!post) return;
    setEntwurf((alt) => ({
      ...alt,
      imageHotspots: {
        ...alsObjekt(alt.imageHotspots),
        [post.id]: neu,
      },
    }));
  };

  const sourceCheck = alsObjekt(post?.sourceCheck);
  const profileCheck = alsObjekt(profil?.profileCheck);
  const originCheck = alsObjekt(post?.imageOriginCheck);
  const genericAnalysisTools = alsObjekt(post?.analysisTools);

  function verfuegbarkeit(wert, onChange) {
    return (
      <label style={{ ...beschriftung, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={wert?.available !== false}
          onChange={(event) => onChange({ ...alsObjekt(wert), available: event.target.checked })}
        />
        Werkzeug für diesen Beitrag verfügbar
      </label>
    );
  }

  if (!posts.length) {
    return (
      <div data-admin-schutz style={{ position: 'fixed', inset: 0, zIndex: 2147483200, background: 'rgba(7,13,27,.64)', padding: 18 }}>
        <section style={{ maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 14, padding: 18 }}>
          <strong>Analysewerkzeuge</strong>
          <p>Es sind keine Beiträge vorhanden.</p>
          <button type="button" onClick={onSchliessen}>Schließen</button>
        </section>
      </div>
    );
  }

  return (
    <div
      data-admin-schutz
      onClick={onSchliessen}
      style={{ position: 'fixed', inset: 0, zIndex: 2147483200, background: 'rgba(7,13,27,.64)', padding: 18 }}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: 1180,
          height: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 14,
          padding: 18,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong>Alle Analysewerkzeuge bearbeiten</strong>
          <span style={{ fontSize: 12, color: '#5a6b86' }}>
            Änderungen werden direkt in die Vorschau übernommen.
          </span>
          <button type="button" onClick={onVorschau}>Vorschau neu laden</button>
          <button type="button" onClick={onSchliessen} style={{ marginLeft: 'auto' }}>Schließen</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 300px) 1fr', gap: 16, flex: 1, minHeight: 0, marginTop: 14 }}>
          <aside style={{ overflowY: 'auto', borderRight: '1px solid #dce3ee', paddingRight: 12 }}>
            <label style={{ ...beschriftung, marginTop: 0 }}>
              Beitrag auswählen
              <select
                style={feld}
                value={postId}
                onChange={(event) => {
                  setPostId(event.target.value);
                  setFehler('');
                }}
              >
                {posts.map((eintrag) => (
                  <option key={eintrag.id} value={String(eintrag.id)}>
                    {eintrag.username || eintrag.id} · {String(zwei(eintrag.caption, 'de') || '').slice(0, 48)}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
              {ANALYSE_WERKZEUGE.map((werkzeug) => (
                <button
                  key={werkzeug.id}
                  type="button"
                  onClick={() => {
                    setAktiv(werkzeug.id);
                    setFehler('');
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '9px 10px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    border: '1px solid #dce3ee',
                    background: aktiv === werkzeug.id ? '#092b61' : '#fff',
                    color: aktiv === werkzeug.id ? '#fff' : '#182235',
                    fontWeight: 750,
                  }}
                >
                  {werkzeug.label}
                  <small style={{ display: 'block', marginTop: 2, opacity: 0.75 }}>{werkzeug.datei}</small>
                </button>
              ))}
            </div>

            <div style={{ ...block, marginTop: 16 }}>
              <strong style={{ fontSize: 12.5 }}>Ausgewählter Beitrag</strong>
              <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.45 }}>
                <b>ID:</b> {post?.id}<br />
                <b>Profil:</b> {profil?.username || post?.profileId || 'nicht verknüpft'}
              </p>
            </div>
          </aside>

          <main style={{ overflowY: 'auto', paddingRight: 4 }}>
            {aktiv === 'quelle' && (
              <>
                <h2 style={{ marginTop: 0, fontSize: 18 }}>Quellenprüfung</h2>
                {verfuegbarkeit(sourceCheck, (neu) => setzePostTeil('sourceCheck', neu))}

                <label style={beschriftung}>Status
                  <select
                    style={feld}
                    value={sourceCheck.status || ''}
                    onChange={(event) => setzePostTeil('sourceCheck', { ...sourceCheck, status: event.target.value })}
                  >
                    <option value="">Standard</option>
                    <option value="good">Vertrauenswürdig</option>
                    <option value="warning">Warnung</option>
                    <option value="mixed">Gemischt</option>
                    <option value="ad">Werbung</option>
                  </select>
                </label>

                {[
                  ['domain', 'Domain'],
                  ['title', 'Titel'],
                  ['url', 'URL'],
                  ['pageType', 'Seitentyp'],
                  ['articleHeadline', 'Artikelüberschrift'],
                  ['author', 'Verantwortliche Person oder Redaktion'],
                  ['published', 'Veröffentlichungsdatum'],
                  ['unavailableTitle', 'Titel bei Nichtverfügbarkeit'],
                  ['unavailableMessage', 'Meldung bei Nichtverfügbarkeit'],
                  ['previewLabel', 'Beschriftung Vorschau öffnen'],
                  ['lessLabel', 'Beschriftung Vorschau schließen'],
                  ['authorLabel', 'Beschriftung Verantwortlich'],
                  ['publishedLabel', 'Beschriftung Veröffentlicht'],
                  ['hintTitle', 'Tippüberschrift'],
                  ['hintQuestion', 'Tippfrage'],
                  ['hintImportanceTitle', 'Überschrift Warum wichtig'],
                  ['hintText', 'Tipptext'],
                  ['collapseLabel', 'Beschriftung Tipp schließen'],
                ].map(([schluessel, label]) => (
                  <label key={schluessel} style={beschriftung}>{label}
                    <textarea
                      rows={schluessel.includes('Message') || schluessel.includes('Text') || schluessel.includes('Question') ? 3 : 2}
                      style={feld}
                      value={sourceCheck[schluessel] ?? ''}
                      onChange={(event) => setzePostTeil('sourceCheck', { ...sourceCheck, [schluessel]: event.target.value })}
                    />
                  </label>
                ))}

                <label style={beschriftung}>Kernaussagen, vollständige Liste als JSON
                  <JsonFeld
                    wert={alsListe(sourceCheck.keyFacts)}
                    onChange={(neu) => setzePostTeil('sourceCheck', { ...sourceCheck, keyFacts: neu })}
                    zeilen={8}
                    onFehler={setFehler}
                  />
                </label>

                <VollstaendigesObjekt
                  titel="Vollständige Quellenprüfung"
                  datei="content/posts.json"
                  wert={sourceCheck}
                  onChange={(neu) => setzePostTeil('sourceCheck', neu)}
                />
              </>
            )}

            {aktiv === 'profil' && (
              <>
                <h2 style={{ marginTop: 0, fontSize: 18 }}>Profilprüfung</h2>
                {!profil ? (
                  <div style={block}>
                    <strong>Kein Profil verknüpft</strong>
                    <p style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                      Dieser Beitrag verweist auf kein vorhandenes Profil. Trage im Beitrag eine gültige profileId ein.
                    </p>
                  </div>
                ) : (
                  <>
                    {verfuegbarkeit(profileCheck, (neu) => ersetzeProfil({ ...profil, profileCheck: neu }))}

                    {[
                      ['bio', 'Biografie in der Profilprüfung'],
                      ['accountType', 'Kontotyp'],
                      ['created', 'Erstellungsdatum'],
                      ['visibility', 'Sichtbarkeit'],
                      ['verification', 'Verifizierungsstatus'],
                      ['unavailableTitle', 'Titel bei Nichtverfügbarkeit'],
                      ['unavailableMessage', 'Meldung bei Nichtverfügbarkeit'],
                      ['lockedTitle', 'Titel bei gesperrtem Profil'],
                      ['lockedMessage', 'Meldung bei gesperrtem Profil'],
                      ['postsLabel', 'Beschriftung Beiträge'],
                      ['followersLabel', 'Beschriftung Follower'],
                      ['followingLabel', 'Beschriftung Folgt'],
                      ['accountTypeLabel', 'Beschriftung Kontotyp'],
                      ['createdLabel', 'Beschriftung Erstellt'],
                      ['visibilityLabel', 'Beschriftung Sichtbarkeit'],
                      ['verificationLabel', 'Beschriftung Verifizierung'],
                      ['hintTitle', 'Tippüberschrift'],
                      ['hintQuestion', 'Tippfrage'],
                      ['hintImportanceTitle', 'Überschrift Warum wichtig'],
                      ['hintText1', 'Erster Tipptext'],
                      ['hintText2', 'Zweiter Tipptext'],
                      ['collapseLabel', 'Beschriftung Tipp schließen'],
                    ].map(([schluessel, label]) => (
                      <label key={schluessel} style={beschriftung}>{label}
                        <textarea
                          rows={schluessel.includes('Message') || schluessel.includes('Text') || schluessel.includes('Question') || schluessel === 'bio' ? 3 : 2}
                          style={feld}
                          value={profileCheck[schluessel] ?? ''}
                          onChange={(event) => ersetzeProfil({
                            ...profil,
                            profileCheck: { ...profileCheck, [schluessel]: event.target.value },
                          })}
                        />
                      </label>
                    ))}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                      {[
                        ['posts', 'Beiträge'],
                        ['followers', 'Follower'],
                        ['following', 'Folgt'],
                      ].map(([schluessel, label]) => (
                        <label key={schluessel} style={beschriftung}>{label}
                          <input
                            style={feld}
                            value={profileCheck[schluessel] ?? ''}
                            onChange={(event) => ersetzeProfil({
                              ...profil,
                              profileCheck: { ...profileCheck, [schluessel]: event.target.value },
                            })}
                          />
                        </label>
                      ))}
                    </div>

                    <label style={{ ...beschriftung, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={profileCheck.inaccessible === true}
                        onChange={(event) => ersetzeProfil({
                          ...profil,
                          profileCheck: { ...profileCheck, inaccessible: event.target.checked },
                        })}
                      />
                      Profil als nicht erreichbar darstellen
                    </label>

                    <VollstaendigesObjekt
                      titel="Vollständige Profilprüfung"
                      datei="content/profiles.json"
                      wert={profileCheck}
                      onChange={(neu) => ersetzeProfil({ ...profil, profileCheck: neu })}
                    />
                  </>
                )}
              </>
            )}

            {aktiv === 'herkunft' && (
              <>
                <h2 style={{ marginTop: 0, fontSize: 18 }}>Bildherkunft und Rückwärtssuche</h2>
                {verfuegbarkeit(originCheck, (neu) => setzePostTeil('imageOriginCheck', neu))}

                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#5a6b86' }}>
                  Hier bearbeitest du den vollständigen Inhalt der Rückwärtssuche. Listen, Treffer,
                  Bilder, Datumsangaben, Hinweise und Meldungen können direkt im JSON verändert werden.
                </p>

                <JsonFeld
                  wert={originCheck}
                  onChange={(neu) => setzePostTeil('imageOriginCheck', neu)}
                  zeilen={28}
                  onFehler={setFehler}
                />

                <VollstaendigesObjekt
                  titel="Vollständigen Beitrag bearbeiten"
                  datei="content/posts.json"
                  wert={post}
                  onChange={ersetzePost}
                />
              </>
            )}

            {aktiv === 'bild' && (
              <>
                <h2 style={{ marginTop: 0, fontSize: 18 }}>Bildanalyse und Hotspots</h2>

                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#5a6b86' }}>
                  Die Hotspots liegen derzeit in src/data/imageHotspots.js. Änderungen werden gespeichert
                  und in der Codeansicht sowie im ZIP sichtbar. Für eine echte Liveanzeige der Hotspots muss
                  App.jsx zusätzlich einen imageHotspotsOverride an HotspotImage weiterreichen.
                </p>

                <label style={beschriftung}>Hotspots und Hinweisinhalt
                  <JsonFeld
                    wert={zonen || { errorCount: 0, hotspots: [] }}
                    onChange={setzeZonen}
                    zeilen={28}
                    onFehler={setFehler}
                  />
                </label>

                <label style={beschriftung}>Optionales allgemeines analysisTools-Objekt des Beitrags
                  <JsonFeld
                    wert={genericAnalysisTools}
                    onChange={(neu) => setzePostTeil('analysisTools', neu)}
                    zeilen={16}
                    onFehler={setFehler}
                  />
                </label>

                <VollstaendigesObjekt
                  titel="Vollständigen Beitrag bearbeiten"
                  datei="content/posts.json"
                  wert={post}
                  onChange={ersetzePost}
                />
              </>
            )}

            <div style={{ marginTop: 12, fontSize: 12, color: fehler ? '#a3382c' : '#1e6b4f' }}>
              {fehler ? 'Ungültiges JSON wird noch nicht übernommen.' : 'Alle gültigen Änderungen sind übernommen.'}
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}


/* ---------- Codeansicht: immer die GANZE Datei ---------- */
function CodeAnsicht({ inhalte, entwurf, geaenderte, startDatei, onSchliessen }) {
  const dateien = useMemo(() => ({
    ...Object.fromEntries(CONTENT_DATEIEN.map((n) => [`content/${n}.json`, alsText(inhalte[n])])),
    ...erzeugeCodeDateien(entwurf),
  }), [inhalte, entwurf]);

  const [aktiv, setAktiv] = useState(() => (startDatei && dateien[startDatei] ? startDatei : (geaenderte.find((d) => dateien[d]) || Object.keys(dateien)[0])));
  const [kopiert, setKopiert] = useState(false);
  useEffect(() => { if (!dateien[aktiv]) setAktiv(Object.keys(dateien)[0]); }, [aktiv, dateien]);

  async function kopieren() {
    const code = dateien[aktiv] || '';
    try {
      await navigator.clipboard.writeText(code);
      setKopiert(true);
      window.setTimeout(() => setKopiert(false), 1600);
    } catch { window.prompt('Markieren und kopieren:', code); }
  }

  const text = dateien[aktiv] || '';

  return (
    <div data-admin-schutz onClick={onSchliessen}
      style={{ position: 'fixed', inset: 0, zIndex: 2147483300, background: 'rgba(7,13,27,.64)', padding: 18 }}>
      <section onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#fff', borderRadius: 14, padding: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong>Vollständiger Quelltext</strong>
          <button type="button" onClick={kopieren}>{kopiert ? 'Kopiert' : 'Ganze Datei kopieren'}</button>
          <span style={{ fontSize: 12, color: '#5a6b86' }}>{text.split('\n').length} Zeilen</span>
          <button type="button" onClick={onSchliessen} style={{ marginLeft: 'auto' }}>Schließen</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
          {Object.keys(dateien).map((pfad) => {
            const ist = geaenderte.includes(pfad);
            return (
              <button key={pfad} type="button" onClick={() => setAktiv(pfad)}
                style={{
                  padding: '5px 9px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  border: ist ? '2px solid #db2b73' : '1px solid #dce3ee',
                  background: pfad === aktiv ? '#092b61' : '#fff',
                  color: pfad === aktiv ? '#fff' : (ist ? '#a33868' : '#182235'),
                  fontWeight: ist ? 800 : 500,
                }}>{pfad}{ist ? ' · geändert' : ''}</button>
            );
          })}
        </div>
        <pre style={{
          flex: 1, margin: 0, padding: 12, overflow: 'auto', borderRadius: 10,
          background: '#0f1b30', color: '#e6edf7', fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre',
        }}>{text}</pre>
      </section>
    </div>
  );
}

/* ---------- Hauptkomponente ---------- */
export default function InlineAdmin() {
  const [modus, setModus] = useState('spielen');
  const [inhalte, setInhalte] = useState(null);
  const [originalInhalte, setOriginalInhalte] = useState(null);
  const [entwurf, setEntwurf] = useState(ladeEntwurf);
  const [ziel, setZiel] = useState(null);
  const [zeigeCode, setZeigeCode] = useState(false);
  const [startDatei, setStartDatei] = useState(null);
  const [zeigeAlleDaten, setZeigeAlleDaten] = useState(false);
  const [zeigeAnalysewerkzeuge, setZeigeAnalysewerkzeuge] = useState(false);
  const [meldung, setMeldung] = useState('');
  const [status, setStatus] = useState('');
  const [vorschauSchluessel, setVorschauSchluessel] = useState(0);
  const ersterLauf = useRef(true);

  useEffect(() => {
    let lebt = true;
    (async () => {
      try {
        const paare = await Promise.all(CONTENT_DATEIEN.map(async (n) => {
          const antwort = await fetch(joinBase(`content/${n}.json`), { cache: 'no-store' });
          if (!antwort.ok) throw new Error(`content/${n}.json: Status ${antwort.status}`);
          return [n, await antwort.json()];
        }));
        if (!lebt) return;
        const vomServer = Object.fromEntries(paare);
        setOriginalInhalte(klone(vomServer));
        let gespeichert = null;
        try {
          const text = localStorage.getItem(INHALT_SCHLUESSEL);
          gespeichert = text ? JSON.parse(text) : null;
        } catch { gespeichert = null; }
        setInhalte(gespeichert || klone(vomServer));
      } catch (f) {
        if (lebt) setMeldung(f instanceof Error ? f.message : String(f));
      }
    })();
    return () => { lebt = false; };
  }, []);

  useEffect(() => {
    if (!inhalte) return;
    try { localStorage.setItem(INHALT_SCHLUESSEL, JSON.stringify(inhalte)); } catch { /* voll */ }
  }, [inhalte]);

  useEffect(() => { speichereEntwurf(entwurf); }, [entwurf]);

  /* Liveansicht:
     Jede gültige Contentänderung baut die Vorschau neu auf. Dadurch
     werden auch bereits geöffnete Analysewerkzeuge mit den neuen Daten
     geladen. Eine gerade offene Prüfung wird dabei geschlossen, weil
     App.jsx activePost und activeTask als Momentaufnahme speichert. */
  useEffect(() => {
    if (!inhalte) return;
    if (ersterLauf.current) { ersterLauf.current = false; return; }
    const uhr = window.setTimeout(() => {
      setVorschauSchluessel((k) => k + 1);
    }, 180);
    return () => window.clearTimeout(uhr);
  }, [inhalte]);

  const geaenderteInhalte = useMemo(() => {
    if (!inhalte || !originalInhalte) return [];
    return CONTENT_DATEIEN
      .filter((n) => JSON.stringify(inhalte[n]) !== JSON.stringify(originalInhalte[n]))
      .map((n) => `content/${n}.json`);
  }, [inhalte, originalInhalte]);

  const geaenderterCode = useMemo(() => geaenderteCodeDateien(entwurf), [entwurf]);
  const alleGeaenderten = useMemo(
    () => Array.from(new Set([...geaenderteInhalte, ...geaenderterCode])),
    [geaenderteInhalte, geaenderterCode],
  );

  const klick = useCallback((e) => {
    const willBearbeiten = e.altKey || modus === 'bearbeiten';
    if (!willBearbeiten) return;
    if (e.target.closest('[data-admin-schutz]')) return;
    // Bedienelemente bleiben benutzbar, sonst gehen die Werkzeuge
    // nie auf und die App laesst sich nicht mehr durchspielen.
    if (!e.altKey && e.target.closest(BEDIENELEMENTE)) return;
    const gefunden = findeZiel(e.target, inhalte || {}, entwurf);
    if (!gefunden) return;
    e.preventDefault();
    e.stopPropagation();
    setZiel(gefunden);
  }, [modus, inhalte, entwurf]);

  function zeigeGanzeDatei(pfad) { setStartDatei(pfad); setZeigeCode(true); }

  /* Nur dieses eine Element auf den Auslieferungsstand zuruecksetzen. */
  function verwerfeElement(z) {
    if (!originalInhalte) return;
    if (!window.confirm('Änderungen an diesem Element verwerfen?')) return;
    const frisch = leerEntwurf();
    if (z.art === 'text' && z.schluessel) {
      setEntwurf((a) => {
        const t = { ...alsObjekt(a.translations) };
        SPRACHCODES.forEach((c) => {
          t[c] = { ...alsObjekt(t[c]), [z.schluessel]: frisch.translations[c]?.[z.schluessel] ?? '' };
        });
        return { ...a, translations: t };
      });
      return;
    }
    if (z.art === 'zonen' && z.postId) {
      setEntwurf((a) => ({ ...a, imageHotspots: { ...alsObjekt(a.imageHotspots), [z.postId]: frisch.imageHotspots[z.postId] } }));
      return;
    }
    if (z.art === 'bewertung' && z.postId) {
      setEntwurf((a) => ({
        ...a,
        reasonConcepts: { ...alsObjekt(a.reasonConcepts), [z.postId]: frisch.reasonConcepts[z.postId] },
        stellschrauben: frisch.stellschrauben,
      }));
    }
    // Inhalte: den betroffenen Datensatz aus dem Original holen
    setInhalte((a) => {
      const neu = { ...a };
      if (z.art === 'einstellungen') neu.settings = klone(originalInhalte.settings);
      if (z.postId) {
        neu.posts = alsListe(a.posts).map((p) => (String(p.id) === String(z.postId)
          ? klone(alsListe(originalInhalte.posts).find((o) => String(o.id) === String(z.postId)) || p) : p));
        neu.tasks = alsListe(a.tasks).map((t) => (String(t.postId) === String(z.postId)
          ? klone(alsListe(originalInhalte.tasks).find((o) => String(o.postId) === String(z.postId)) || t) : t));
        const post = alsListe(a.posts).find((p) => String(p.id) === String(z.postId));
        if (post?.profileId) {
          neu.profiles = alsListe(a.profiles).map((p) => (String(p.id) === String(post.profileId)
            ? klone(alsListe(originalInhalte.profiles).find((o) => String(o.id) === String(post.profileId)) || p) : p));
        }
      }
      return neu;
    });
    setVorschauSchluessel((k) => k + 1);
  }

  function verwerfeAlles() {
    if (!window.confirm('Wirklich ALLE Änderungen verwerfen und den Auslieferungsstand laden?')) return;
    try { localStorage.removeItem(INHALT_SCHLUESSEL); } catch { /* nichts */ }
    setEntwurf(leerEntwurf());
    if (originalInhalte) setInhalte(klone(originalInhalte));
    setZiel(null);
    setVorschauSchluessel((k) => k + 1);
    setStatus('Alles verworfen');
    window.setTimeout(() => setStatus(''), 1800);
  }

  function speichern() {
    try {
      localStorage.setItem(INHALT_SCHLUESSEL, JSON.stringify(inhalte));
      speichereEntwurf(entwurf);
      setStatus('Gespeichert');
      window.setTimeout(() => setStatus(''), 1600);
    } catch (f) {
      setStatus(`Speichern fehlgeschlagen: ${f instanceof Error ? f.message : String(f)}`);
    }
  }

  if (meldung) {
    return <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <p><strong>Die Inhalte konnten nicht geladen werden.</strong></p>
      <p>{meldung}</p>
      <p>Der Adminmodus braucht einen Server — npm run dev oder die veröffentlichte Adresse.</p>
    </div>;
  }
  if (!inhalte) return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Inhalte werden geladen …</div>;

  const anzahlDateien = Object.keys(baueDateiListe(inhalte, entwurf, { originalInhalte, nurGeaenderteDateien: true })).length;

  return (
    <div onClickCapture={klick}>
      {modus === 'bearbeiten' && <style>{MARKIER_CSS}</style>}

      <App key={vorschauSchluessel} contentOverride={inhalte} previewMode />

      <AdminKopfKnopf aktiv onClick={() => { window.location.hash = ''; window.location.reload(); }} />

      <div data-admin-schutz style={{
        position: 'fixed', left: 12, bottom: 12, zIndex: 2147483050, maxWidth: 'min(560px, 96vw)',
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: 10, borderRadius: 12,
        background: 'rgba(255,255,255,.97)', border: '1px solid #dce3ee', boxShadow: '0 8px 22px rgba(13,36,79,.16)',
      }}>
        <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 999, overflow: 'hidden' }}>
          {[['spielen', 'Spielen'], ['bearbeiten', 'Bearbeiten']].map(([id, name]) => (
            <button key={id} type="button" onClick={() => { setModus(id); setZiel(null); }}
              style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 800,
                background: modus === id ? '#092b61' : 'transparent', color: modus === id ? '#fff' : '#092b61',
              }}>{name}</button>
          ))}
        </div>
        <button type="button" onClick={() => setVorschauSchluessel((k) => k + 1)}>Vorschau aktualisieren</button>
        <button type="button" onClick={() => setZeigeAnalysewerkzeuge(true)}>Analysewerkzeuge</button>
        <button type="button" onClick={() => setZeigeAlleDaten(true)}>Alle Daten</button>
        <button type="button" onClick={() => { setStartDatei(null); setZeigeCode(true); }}>Code</button>
        <button type="button" onClick={speichern}>{status || 'Speichern'}</button>
        <button type="button" onClick={() => ladeZipHerunter(inhalte, entwurf, { originalInhalte, nurGeaenderteDateien: true })}>
          ZIP ({anzahlDateien})
        </button>
        <button type="button" onClick={verwerfeAlles}>Änderungen verwerfen</button>

        <p style={{ width: '100%', margin: 0, fontSize: 11.5, lineHeight: 1.45, color: '#5a6b86' }}>
          {modus === 'spielen'
            ? 'Die App verhält sich wie für die Kinder. Zum Ändern: Alt gedrückt halten und klicken.'
            : 'Klick auf ein Element öffnet die Bearbeitung. Knöpfe bleiben bedienbar — dort Alt+Klick zum Ändern.'}
        </p>

        {alleGeaenderten.length > 0 ? (
          <details style={{ width: '100%' }}>
            <summary style={{ cursor: 'pointer', color: '#a3382c', fontWeight: 700, fontSize: 12 }}>
              {alleGeaenderten.length} Datei(en) geändert
            </summary>
            <div style={{ marginTop: 5 }}>
              {alleGeaenderten.map((d) => (
                <button key={d} type="button" onClick={() => zeigeGanzeDatei(d)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', marginTop: 3, padding: '4px 6px',
                    border: '1px solid #efd0dc', borderRadius: 6, background: '#fff', cursor: 'pointer',
                    font: 'inherit', fontSize: 11, overflowWrap: 'anywhere',
                  }}>{d} — ganze Datei ansehen</button>
              ))}
            </div>
          </details>
        ) : (
          <span style={{ width: '100%', fontSize: 12, color: '#1e6b4f' }}>Keine Änderungen</span>
        )}
      </div>

      {ziel && (
        <Seitenfeld ziel={ziel} inhalte={inhalte} setInhalte={setInhalte}
          entwurf={entwurf} setEntwurf={setEntwurf} geaenderte={alleGeaenderten}
          onSchliessen={() => setZiel(null)}
          onAlleDaten={() => { setZiel(null); setZeigeAlleDaten(true); }}
          onZeigeDatei={zeigeGanzeDatei}
          onVerwerfen={verwerfeElement} />
      )}

      {zeigeAnalysewerkzeuge && (
        <AnalysewerkzeugeAnsicht
          inhalte={inhalte}
          setInhalte={setInhalte}
          entwurf={entwurf}
          setEntwurf={setEntwurf}
          onSchliessen={() => setZeigeAnalysewerkzeuge(false)}
          onVorschau={() => setVorschauSchluessel((k) => k + 1)}
        />
      )}

      {zeigeAlleDaten && (
        <AlleDatenAnsicht inhalte={inhalte} setInhalte={setInhalte} onSchliessen={() => setZeigeAlleDaten(false)} />
      )}

      {zeigeCode && (
        <CodeAnsicht inhalte={inhalte} entwurf={entwurf} geaenderte={alleGeaenderten}
          startDatei={startDatei} onSchliessen={() => setZeigeCode(false)} />
      )}
    </div>
  );
}
