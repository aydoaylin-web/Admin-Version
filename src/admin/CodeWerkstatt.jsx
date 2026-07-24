import { useEffect, useMemo, useState } from 'react';
import {
  ladeEntwurf, speichereEntwurf, verwerfeEntwurf, leerEntwurf,
  erzeugeCodeDateien, geaenderteCodeDateien, ROHDATEIEN, SPRACHCODES,
} from './codeEntwurf';
import { STELLSCHRAUBEN } from './codegen';

/* ============================================================
   CODE-WERKSTATT

   Fuenf Bereiche:
     Uebersetzungen   alle Oberflaechentexte, DE und EN nebeneinander
     Bewertungsregeln Urteil, Stichwoerter, Phrasen, Feedback je Beitrag
     Fehlerzonen      Bildzonen in Prozent
     Algorithmus      die Stellschrauben des Begruendungsabgleichs
     Rohtext          jede Datei als reiner Text, auch App.jsx

   Ganz unten steht immer der erzeugte Quelltext zum Kopieren.
   ============================================================ */

const feld = {
  width: '100%', padding: '7px 9px', borderRadius: 8,
  border: '1px solid #cbd5e1', font: 'inherit', fontSize: 13,
};
const karte = {
  padding: 14, marginBottom: 12, borderRadius: 12,
  border: '1px solid #dce3ee', background: '#f7f9fc',
};

function Kopierbar({ text, titel }) {
  const [kopiert, setKopiert] = useState(false);
  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1600);
    } catch {
      window.prompt('Zum Kopieren markieren und Strg+C drücken:', text);
    }
  }
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>{titel}</strong>
        <button type="button" onClick={kopieren}>{kopiert ? 'Kopiert' : 'Code kopieren'}</button>
        <span style={{ fontSize: 12, color: '#5a6b86' }}>{text.split('\n').length} Zeilen</span>
      </div>
      <pre style={{
        margin: 0, padding: 12, maxHeight: 340, overflow: 'auto', borderRadius: 10,
        background: '#0f1b30', color: '#e6edf7', fontSize: 12.5, lineHeight: 1.5,
      }}>{text}</pre>
    </section>
  );
}

function Uebersetzungen({ entwurf, setzen }) {
  const [suche, setSuche] = useState('');
  const schluessel = useMemo(() => {
    const alle = new Set();
    SPRACHCODES.forEach((c) => Object.keys(entwurf.translations[c] || {}).forEach((k) => alle.add(k)));
    return [...alle].filter((k) => {
      if (!suche) return true;
      const s = suche.toLowerCase();
      if (k.toLowerCase().includes(s)) return true;
      return SPRACHCODES.some((c) => String(entwurf.translations[c]?.[k] || '').toLowerCase().includes(s));
    });
  }, [entwurf.translations, suche]);

  function aendern(sprache, key, wert) {
    setzen({
      ...entwurf,
      translations: {
        ...entwurf.translations,
        [sprache]: { ...entwurf.translations[sprache], [key]: wert },
      },
    });
  }

  const fehlend = SPRACHCODES.reduce((summe, c) => summe + schluessel.filter((k) => !entwurf.translations[c]?.[k]).length, 0);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input style={{ ...feld, maxWidth: 320 }} placeholder="Suchen in Schlüssel oder Text"
          value={suche} onChange={(e) => setSuche(e.target.value)} />
        <span style={{ fontSize: 13, color: '#5a6b86' }}>
          {schluessel.length} Einträge{fehlend > 0 && `, ${fehlend} davon leer`}
        </span>
      </div>

      <div style={{ maxHeight: 460, overflow: 'auto', border: '1px solid #dce3ee', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: '#eef2f8' }}>
              <th style={{ textAlign: 'left', padding: 8, width: '22%' }}>Schlüssel</th>
              {SPRACHCODES.map((c) => (
                <th key={c} style={{ textAlign: 'left', padding: 8 }}>{c.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schluessel.map((k) => (
              <tr key={k} style={{ borderTop: '1px solid #e6ebf3' }}>
                <td style={{ padding: 6, verticalAlign: 'top' }}>
                  <code style={{ fontSize: 12, color: '#243b60' }}>{k}</code>
                </td>
                {SPRACHCODES.map((c) => (
                  <td key={c} style={{ padding: 6 }}>
                    <textarea rows={String(entwurf.translations[c]?.[k] || '').length > 60 ? 3 : 1}
                      style={{ ...feld, background: entwurf.translations[c]?.[k] ? '#fff' : '#fff6f6' }}
                      value={entwurf.translations[c]?.[k] || ''}
                      onChange={(e) => aendern(c, k, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Bewertungsregeln({ entwurf, setzen }) {
  const ids = Object.keys(entwurf.reasonConcepts);
  const [aktiv, setAktiv] = useState(ids[0] || '');
  const regel = entwurf.reasonConcepts[aktiv];

  function aendern(neueRegel) {
    setzen({ ...entwurf, reasonConcepts: { ...entwurf.reasonConcepts, [aktiv]: neueRegel } });
  }
  function konzeptAendern(index, feldName, wert) {
    const konzepte = regel.concepts.map((c, i) => (i === index ? { ...c, [feldName]: wert } : c));
    aendern({ ...regel, concepts: konzepte });
  }

  if (!regel) return <p>Keine Bewertungsregeln vorhanden.</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}>
      <aside style={{ maxHeight: 460, overflow: 'auto' }}>
        {ids.map((id) => (
          <button key={id} type="button" onClick={() => setAktiv(id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', marginBottom: 4,
              padding: '7px 9px', borderRadius: 8, font: 'inherit', fontSize: 12.5,
              cursor: 'pointer', border: '1px solid #dce3ee',
              background: id === aktiv ? '#092b61' : '#fff',
              color: id === aktiv ? '#fff' : '#182235',
            }}>
            {id}
            <span style={{ display: 'block', fontSize: 11, opacity: 0.75 }}>
              {entwurf.reasonConcepts[id].verdict}
            </span>
          </button>
        ))}
      </aside>

      <div style={{ maxHeight: 460, overflow: 'auto' }}>
        <div style={karte}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            Richtige Einstufung
          </label>
          <select style={{ ...feld, maxWidth: 220 }} value={regel.verdict}
            onChange={(e) => aendern({ ...regel, verdict: e.target.value })}>
            <option value="echt">echt</option>
            <option value="suspekt">suspekt</option>
            <option value="manipuliert">manipuliert</option>
          </select>
          <p style={{ fontSize: 12, color: '#8a4b4b', margin: '8px 0 0' }}>
            Änderst du das hier, muss dieselbe Einstufung auch in content/tasks.json stehen.
            Der Reiter „Nachziehen“ prüft das.
          </p>
        </div>

        {regel.concepts.map((konzept, i) => (
          <div key={i} style={karte}>
            <strong style={{ fontSize: 13 }}>Konzept {i + 1}</strong>
            <label style={{ display: 'block', fontSize: 12, marginTop: 8 }}>Name</label>
            <input style={feld} value={konzept.name || ''}
              onChange={(e) => konzeptAendern(i, 'name', e.target.value)} />
            <label style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
              Stichwörter, durch Komma getrennt
            </label>
            <textarea rows={2} style={feld} value={(konzept.terms || []).join(', ')}
              onChange={(e) => konzeptAendern(i, 'terms', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))} />
            <label style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
              Ganze Phrasen, durch Komma getrennt
            </label>
            <textarea rows={3} style={feld} value={(konzept.phrases || []).join(', ')}
              onChange={(e) => konzeptAendern(i, 'phrases', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))} />
          </div>
        ))}

        <div style={karte}>
          <strong style={{ fontSize: 13 }}>Rückmeldung an die Kinder</strong>
          <label style={{ display: 'block', fontSize: 12, marginTop: 8 }}>Deutsch</label>
          <textarea rows={3} style={feld} value={regel.feedback?.de || ''}
            onChange={(e) => aendern({ ...regel, feedback: { ...regel.feedback, de: e.target.value } })} />
          <label style={{ display: 'block', fontSize: 12, marginTop: 8 }}>Englisch</label>
          <textarea rows={3} style={feld} value={regel.feedback?.en || ''}
            onChange={(e) => aendern({ ...regel, feedback: { ...regel.feedback, en: e.target.value } })} />
        </div>

        <div style={karte}>
          <strong style={{ fontSize: 13 }}>Reiner Slang — zählt nie allein als Begründung</strong>
          <textarea rows={3} style={{ ...feld, marginTop: 8 }} value={entwurf.slangOnly.join(', ')}
            onChange={(e) => setzen({ ...entwurf, slangOnly: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} />
        </div>
      </div>
    </div>
  );
}

function Fehlerzonen({ entwurf, setzen }) {
  const ids = Object.keys(entwurf.imageHotspots);
  const [aktiv, setAktiv] = useState(ids[0] || '');
  const eintrag = entwurf.imageHotspots[aktiv];

  function zoneAendern(index, feldName, wert) {
    const zonen = eintrag.hotspots.map((z, i) => (i === index ? { ...z, [feldName]: wert } : z));
    setzen({ ...entwurf, imageHotspots: { ...entwurf.imageHotspots, [aktiv]: { ...eintrag, hotspots: zonen } } });
  }

  if (!eintrag) return <p>Keine Fehlerzonen vorhanden.</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}>
      <aside>
        {ids.map((id) => (
          <button key={id} type="button" onClick={() => setAktiv(id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', marginBottom: 4,
              padding: '7px 9px', borderRadius: 8, font: 'inherit', fontSize: 12.5, cursor: 'pointer',
              border: '1px solid #dce3ee',
              background: id === aktiv ? '#092b61' : '#fff',
              color: id === aktiv ? '#fff' : '#182235',
            }}>{id}</button>
        ))}
      </aside>

      <div>
        <p style={{ fontSize: 12.5, color: '#5a6b86', marginTop: 0 }}>
          Alle Werte in Prozent des Bildes. x und y sind die linke obere Ecke.
        </p>
        {eintrag.hotspots.map((zone, i) => (
          <div key={i} style={karte}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {['x', 'y', 'w', 'h'].map((achse) => (
                <label key={achse} style={{ fontSize: 12 }}>
                  {achse}
                  <input type="number" style={feld} value={zone[achse]}
                    onChange={(e) => zoneAendern(i, achse, Number(e.target.value))} />
                </label>
              ))}
            </div>
            <label style={{ display: 'block', fontSize: 12, marginTop: 10 }}>Hinweistext bei Treffer</label>
            <textarea rows={3} style={feld} value={zone.hint || ''}
              onChange={(e) => zoneAendern(i, 'hint', e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Algorithmus({ entwurf, setzen }) {
  return (
    <>
      <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 720 }}>
        Diese vier Zahlen steuern, wie großzügig der Begründungsabgleich ist.
        Sie werden gezielt in <code>conceptMatcher.js</code> ersetzt, der übrige
        Text der Datei bleibt unangetastet.
      </p>
      {STELLSCHRAUBEN.map((s) => (
        <div key={s.id} style={karte}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{s.name}</label>
          <p style={{ fontSize: 12.5, color: '#5a6b86', margin: '4px 0 8px' }}>{s.hilfe}</p>
          <input type="number" style={{ ...feld, maxWidth: 120 }}
            value={entwurf.stellschrauben[s.id] ?? ''}
            onChange={(e) => setzen({
              ...entwurf,
              stellschrauben: { ...entwurf.stellschrauben, [s.id]: Number(e.target.value) },
            })} />
        </div>
      ))}
    </>
  );
}

function Rohtext({ entwurf, setzen }) {
  const pfade = Object.keys(ROHDATEIEN);
  const [aktiv, setAktiv] = useState(pfade[0]);
  const text = entwurf.rohtexte[aktiv] ?? ROHDATEIEN[aktiv];
  const geaendert = text !== ROHDATEIEN[aktiv];

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {pfade.map((p) => (
          <button key={p} type="button" onClick={() => setAktiv(p)}
            className={p === aktiv ? 'admin-primary' : ''}>
            {p.split('/').pop()}
            {(entwurf.rohtexte[p] ?? ROHDATEIEN[p]) !== ROHDATEIEN[p] && ' •'}
          </button>
        ))}
      </div>

      {aktiv === 'src/App.jsx' && (
        <p style={{ fontSize: 12.5, color: '#8a4b4b', maxWidth: 720 }}>
          App.jsx steuert den Ablauf der App. Änderungen hier lassen sich in der
          Vorschau nicht prüfen — erst nach Hochladen und neuem Bau. Ein Tippfehler
          legt die App still. Im Zweifel vorher „Version speichern“.
        </p>
      )}

      <textarea
        value={text}
        onChange={(e) => setzen({ ...entwurf, rohtexte: { ...entwurf.rohtexte, [aktiv]: e.target.value } })}
        spellCheck={false}
        style={{
          width: '100%', height: 420, padding: 12, borderRadius: 10,
          border: `1px solid ${geaendert ? '#d98b8b' : '#cbd5e1'}`,
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12.5, lineHeight: 1.5,
        }} />

      {geaendert && (
        <button type="button" style={{ marginTop: 8 }}
          onClick={() => {
            const rest = { ...entwurf.rohtexte };
            delete rest[aktiv];
            setzen({ ...entwurf, rohtexte: rest });
          }}>
          Diese Datei zurücksetzen
        </button>
      )}
    </>
  );
}

const BEREICHE = [
  ['uebersetzungen', 'Übersetzungen'],
  ['regeln', 'Bewertungsregeln'],
  ['zonen', 'Fehlerzonen'],
  ['algorithmus', 'Algorithmus'],
  ['rohtext', 'Rohtext'],
];

export default function CodeWerkstatt({ onEntwurfWechsel }) {
  const [entwurf, setEntwurf] = useState(ladeEntwurf);
  const [bereich, setBereich] = useState('uebersetzungen');

  useEffect(() => {
    speichereEntwurf(entwurf);
    if (onEntwurfWechsel) onEntwurfWechsel(entwurf);
  }, [entwurf, onEntwurfWechsel]);

  const dateien = useMemo(() => erzeugeCodeDateien(entwurf), [entwurf]);
  const geaendert = useMemo(() => geaenderteCodeDateien(entwurf), [entwurf]);

  const zeigeDatei = {
    uebersetzungen: 'src/data/translations.js',
    regeln: 'src/data/reasonConcepts.js',
    zonen: 'src/data/imageHotspots.js',
    algorithmus: 'src/data/conceptMatcher.js',
  }[bereich];

  return (
    <main className="admin-panel" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Code-Werkstatt</h2>
        <span style={{ fontSize: 13, color: geaendert.length ? '#a3382c' : '#5a6b86' }}>
          {geaendert.length ? `${geaendert.length} Datei(en) geändert` : 'keine Änderungen'}
        </span>
        <button type="button" onClick={() => {
          if (window.confirm('Alle Änderungen an den Code-Dateien verwerfen?')) {
            verwerfeEntwurf();
            setEntwurf(leerEntwurf());
          }
        }}>Alles zurücksetzen</button>
      </div>

      {geaendert.length > 0 && (
        <div style={{ ...karte, background: '#fdf4f4', borderColor: '#e8b4b4' }}>
          <strong style={{ fontSize: 13 }}>Geändert und noch nicht hochgeladen</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
            {geaendert.map((p) => <li key={p}><code>{p}</code></li>)}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {BEREICHE.map(([id, name]) => (
          <button key={id} type="button" onClick={() => setBereich(id)}
            className={bereich === id ? 'admin-primary' : ''}>{name}</button>
        ))}
      </div>

      {bereich === 'uebersetzungen' && <Uebersetzungen entwurf={entwurf} setzen={setEntwurf} />}
      {bereich === 'regeln' && <Bewertungsregeln entwurf={entwurf} setzen={setEntwurf} />}
      {bereich === 'zonen' && <Fehlerzonen entwurf={entwurf} setzen={setEntwurf} />}
      {bereich === 'algorithmus' && <Algorithmus entwurf={entwurf} setzen={setEntwurf} />}
      {bereich === 'rohtext' && <Rohtext entwurf={entwurf} setzen={setEntwurf} />}

      {zeigeDatei && <Kopierbar titel={zeigeDatei} text={dateien[zeigeDatei]} />}
    </main>
  );
}
