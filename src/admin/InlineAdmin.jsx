import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import App from '../App.jsx';

import {
  ladeEntwurf,
  speichereEntwurf,
  leerEntwurf,
  erzeugeCodeDateien,
  geaenderteCodeDateien,
  SPRACHCODES,
} from './codeEntwurf.js';

import { STELLSCHRAUBEN } from './codegen.js';
import { ladeZipHerunter } from './zipExport.js';

/* ============================================================
   DEEPFAKE DEFENDER – INLINE-ADMIN

   Funktionen:
   - echte App im Spielmodus verwenden
   - sichtbare Elemente im Bearbeitungsmodus auswählen
   - direkt anzeigen, welche Datei verändert wird
   - vollständiges Objekt als JSON bearbeiten
   - alle Contentdateien vollständig bearbeiten
   - Änderungen lokal speichern
   - Codeansicht anzeigen
   - Änderungen als ZIP exportieren
   ============================================================ */

const INHALT_SCHLUESSEL = 'dd-admin-inhalte-v4';

const CONTENT_DATEIEN = [
  'settings',
  'posts',
  'tasks',
  'profiles',
  'stories',
  'guides',
];

const VERDICTS = [
  'echt',
  'suspekt',
  'manipuliert',
];


const ANALYSE_WERKZEUGE = [
  { id: 'quelle', label: 'Quellenprüfung', datei: 'content/posts.json' },
  { id: 'profil', label: 'Profilprüfung', datei: 'content/profiles.json' },
  { id: 'herkunft', label: 'Bildherkunft', datei: 'content/posts.json' },
  { id: 'bild', label: 'Bildanalyse und Hotspots', datei: 'src/data/imageHotspots.js' },
];

const joinBase = (pfad) =>
  `${import.meta.env.BASE_URL}${String(pfad).replace(/^\//, '')}`;

const feld = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: 8,
  marginTop: 4,
  border: '1px solid #cbd5e1',
  font: 'inherit',
  fontSize: 13,
  background: '#fff',
};

const beschriftung = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#3d4c66',
  marginTop: 12,
};

const block = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  background: '#f7f9fc',
  border: '1px solid #dce3ee',
};

const MARKIER_CSS = `
  [data-post-id] {
    outline: 2px dashed rgba(219, 43, 115, .52);
    outline-offset: 3px;
    border-radius: 14px;
  }

  [data-post-id]:hover {
    outline-color: #db2b73;
    outline-style: solid;
  }

  .analysis-tool-content,
  .task-sheet,
  .app-header,
  .bottom-nav,
  button,
  input,
  textarea,
  select {
    transition: outline-color .15s ease;
  }

  .analysis-tool-content {
    outline: 2px dashed rgba(31, 158, 120, .45);
    outline-offset: -2px;
    border-radius: 10px;
  }

  .analysis-tool-content:hover {
    outline-color: #1f9e78;
    outline-style: solid;
  }

  .task-sheet textarea,
  .task-sheet select,
  .task-sheet input {
    outline: 2px dashed rgba(31, 158, 120, .38);
  }

  .app-header:hover,
  .bottom-nav:hover {
    outline: 2px dashed rgba(9, 43, 97, .4);
    outline-offset: -2px;
  }
`;

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function normalisiereDateiName(name) {
  if (String(name).startsWith('content/')) {
    return String(name);
  }

  if (String(name).endsWith('.json')) {
    return `content/${name}`;
  }

  return `content/${name}.json`;
}

function stringifyDatei(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function arrayOderLeer(value) {
  return Array.isArray(value) ? value : [];
}

function objektOderLeer(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

function zweisprachigerWert(wert, code) {
  if (
    wert &&
    typeof wert === 'object' &&
    !Array.isArray(wert)
  ) {
    return wert[code] ?? '';
  }

  if (code === 'de') {
    return wert ?? '';
  }

  return '';
}

function setzeZweisprachigenWert(wert, code, neuerWert) {
  if (
    wert &&
    typeof wert === 'object' &&
    !Array.isArray(wert)
  ) {
    return {
      ...wert,
      [code]: neuerWert,
    };
  }

  return {
    de: code === 'de' ? neuerWert : (wert ?? ''),
    en: code === 'en' ? neuerWert : '',
  };
}

/* ============================================================
   ADMINBUTTON IN DER KOPFZEILE
   ============================================================ */

export function AdminKopfKnopf({
  aktiv,
  onClick,
}) {
  const [ziel, setZiel] = useState(null);

  useEffect(() => {
    let versuche = 0;

    const uhr = window.setInterval(() => {
      const element =
        document.querySelector('.app-header .header-actions') ||
        document.querySelector('.app-header');

      versuche += 1;

      if (element || versuche > 50) {
        window.clearInterval(uhr);
        setZiel(element || null);
      }
    }, 100);

    return () => window.clearInterval(uhr);
  }, []);

  const knopf = (
    <button
      type="button"
      data-admin-schutz
      onClick={onClick}
      aria-label="Adminmodus schließen"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        minHeight: 34,
        padding: '5px 10px',
        borderRadius: 999,
        cursor: 'pointer',
        border: `1px solid ${
          aktiv ? '#db2b73' : 'rgba(9,43,97,.25)'
        }`,
        background: aktiv ? '#db2b73' : 'transparent',
        color: aktiv ? '#fff' : '#092b61',
        font: 'inherit',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {aktiv ? 'Admin beenden' : 'Admin'}
    </button>
  );

  if (ziel) {
    return createPortal(knopf, ziel);
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 2147483000,
      }}
    >
      {knopf}
    </div>
  );
}

/* ============================================================
   ZIELERKENNUNG
   ============================================================ */

function postAusBlatt(blatt, inhalte) {
  if (!blatt) {
    return null;
  }

  const bild = blatt.querySelector(
    'img.post-image, .task-image-button img, .hotspot-image, img',
  );

  const quelle = bild?.getAttribute('src') || '';

  if (!quelle) {
    return null;
  }

  return arrayOderLeer(inhalte.posts).find((post) => {
    if (!post?.media) {
      return false;
    }

    const media = String(post.media).replace(/^\//, '');

    return quelle.endsWith(media);
  }) || null;
}

function findeUebersetzungsSchluessel(element, entwurf) {
  let knoten = element;

  for (let ebene = 0; ebene < 6 && knoten; ebene += 1) {
    const text = String(knoten.textContent || '').trim();

    if (text && text.length <= 180) {
      for (const code of SPRACHCODES) {
        const eintraege =
          entwurf?.translations?.[code] || {};

        const schluessel = Object.keys(eintraege).find(
          (key) => String(eintraege[key]).trim() === text,
        );

        if (schluessel) {
          return schluessel;
        }
      }
    }

    knoten = knoten.parentElement;
  }

  return null;
}

export function findeZiel(element, inhalte, entwurf) {
  if (!element || element.closest('[data-admin-schutz]')) {
    return null;
  }

  const blatt = element.closest('.task-sheet');
  const feedPost = element.closest('[data-post-id]');

  /* Analysewerkzeug */
  const werkzeug = element.closest('.analysis-tool-content');

  if (werkzeug && blatt) {
    const post = postAusBlatt(blatt, inhalte);

    if (post) {
      if (
        werkzeug.querySelector(
          '.origin-check, .origin-hit, .origin-empty',
        )
      ) {
        return {
          art: 'herkunft',
          postId: post.id,
        };
      }

      if (
        werkzeug.querySelector(
          '.profile-check-head, .profile-check-bio, .profile-check-avatar',
        )
      ) {
        return {
          art: 'profil',
          postId: post.id,
        };
      }

      if (
        werkzeug.querySelector(
          '.source-browser-bar, .linked-page-preview, .linked-page-kicker',
        )
      ) {
        return {
          art: 'quelle',
          postId: post.id,
        };
      }

      return {
        art: 'zonen',
        postId: post.id,
      };
    }
  }

  /* Aufgabe / Feedprüfung */
  if (blatt) {
    const post = postAusBlatt(blatt, inhalte);

    if (post) {
      const bewertung = element.closest(
        [
          'textarea',
          '.verdict-question',
          '.feedback',
          '.reason',
          '.verdict-card',
          '.verdict-option',
          '.verdict-row',
          '.confidence-rating',
          '.confidence-row',
          '.decision-section',
        ].join(', '),
      );

      return {
        art: bewertung ? 'bewertung' : 'beitrag',
        postId: post.id,
      };
    }
  }

  /* Beitrag im Feed */
  if (feedPost) {
    return {
      art: 'beitrag',
      postId: feedPost.getAttribute('data-post-id'),
    };
  }

  /* Kopfzeile / Punkte / Zeit */
  if (
    element.closest(
      [
        '.app-header',
        '.score',
        '.score-display',
        '.points',
        '.points-display',
        '.timer',
        '.time-display',
        '.header-score',
        '.header-timer',
      ].join(', '),
    )
  ) {
    return {
      art: 'einstellungen',
      bereich: 'header',
    };
  }

  /* Navigation */
  if (element.closest('.bottom-nav, nav')) {
    return {
      art: 'einstellungen',
      bereich: 'navigation',
    };
  }

  /* Übersetzter Oberflächentext */
  const schluessel =
    findeUebersetzungsSchluessel(element, entwurf);

  if (schluessel) {
    return {
      art: 'text',
      schluessel,
    };
  }

  /* Fallback:
     Nicht eindeutig zuordenbare Elemente führen zum vollständigen
     Dateneditor. Dadurch bleibt kein Bereich vollständig unzugänglich. */
  return {
    art: 'alle-daten',
    beschreibung:
      String(element.textContent || '')
        .trim()
        .slice(0, 100) || element.tagName,
  };
}

/* ============================================================
   DATEIZUORDNUNG
   ============================================================ */

function dateienFuerZiel(ziel, inhalte) {
  if (!ziel) {
    return [];
  }

  switch (ziel.art) {
    case 'beitrag':
      return [
        'content/posts.json',
        'content/tasks.json',
      ];

    case 'profil':
      return [
        'content/profiles.json',
      ];

    case 'quelle':
    case 'herkunft':
      return [
        'content/posts.json',
      ];

    case 'zonen':
      return [
        'src/data/imageHotspots.js',
      ];

    case 'bewertung':
      return [
        'content/tasks.json',
        'src/data/reasonConcepts.js',
      ];

    case 'text':
      return [
        'src/data/translations.js',
      ];

    case 'einstellungen':
      return [
        'content/settings.json',
      ];

    case 'alle-daten':
      return CONTENT_DATEIEN.map(normalisiereDateiName);

    default:
      return [];
  }
}

function DateiAnzeige({
  dateien,
}) {
  if (!dateien?.length) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        borderRadius: 9,
        background: '#fff7df',
        border: '1px solid #efd486',
      }}
    >
      <strong
        style={{
          display: 'block',
          fontSize: 12,
          color: '#674f0b',
          marginBottom: 5,
        }}
      >
        Direkt beeinflusste Datei(en)
      </strong>

      {dateien.map((datei) => (
        <code
          key={datei}
          style={{
            display: 'block',
            marginTop: 3,
            fontSize: 11.5,
            color: '#493804',
            overflowWrap: 'anywhere',
          }}
        >
          {datei}
        </code>
      ))}
    </div>
  );
}

/* ============================================================
   JSON-EDITOR
   ============================================================ */

function JsonFeld({
  wert,
  onChange,
  zeilen = 14,
  onFehler,
}) {
  const [text, setText] = useState(() =>
    JSON.stringify(wert ?? {}, null, 2),
  );

  const [fehler, setFehler] = useState('');

  useEffect(() => {
    setText(JSON.stringify(wert ?? {}, null, 2));
    setFehler('');
  }, [wert]);

  function tippen(neuerText) {
    setText(neuerText);

    try {
      const geparst = JSON.parse(neuerText);

      setFehler('');
      onFehler?.('');
      onChange(geparst);
    } catch (error) {
      const nachricht =
        error instanceof Error
          ? error.message
          : String(error);

      setFehler(nachricht);
      onFehler?.(nachricht);
    }
  }

  return (
    <>
      <textarea
        rows={zeilen}
        spellCheck={false}
        value={text}
        onChange={(event) => tippen(event.target.value)}
        style={{
          ...feld,
          resize: 'vertical',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: 1.5,
          borderColor: fehler ? '#d98b8b' : '#cbd5e1',
        }}
      />

      {fehler && (
        <p
          style={{
            fontSize: 11.5,
            color: '#a3382c',
            margin: '4px 0 0',
          }}
        >
          Noch nicht übernommen: {fehler}
        </p>
      )}
    </>
  );
}

/* ============================================================
   VOLLSTÄNDIGER OBJEKTEDITOR

   Wichtig:
   Neben komfortablen Feldern wird immer auch das vollständige
   Originalobjekt angeboten. Dadurch kann jedes vorhandene oder
   später ergänzte Feld geändert werden.
   ============================================================ */

function VollstaendigesObjekt({
  titel,
  datei,
  wert,
  onChange,
}) {
  const [offen, setOffen] = useState(false);

  return (
    <section style={block}>
      <button
        type="button"
        onClick={() => setOffen((aktuell) => !aktuell)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          padding: 0,
          border: 0,
          background: 'transparent',
          font: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <strong style={{ fontSize: 13 }}>
          {titel}
        </strong>

        <span style={{ fontSize: 12 }}>
          {offen ? 'Schließen' : 'Alles bearbeiten'}
        </span>
      </button>

      <code
        style={{
          display: 'block',
          marginTop: 5,
          fontSize: 11,
          color: '#5a6b86',
        }}
      >
        {datei}
      </code>

      {offen && (
        <div style={{ marginTop: 10 }}>
          <JsonFeld
            wert={wert}
            onChange={onChange}
            zeilen={22}
          />
        </div>
      )}
    </section>
  );
}

/* ============================================================
   SEITENFELD
   ============================================================ */

function Seitenfeld({
  ziel,
  inhalte,
  setInhalte,
  entwurf,
  setEntwurf,
  onSchliessen,
  onAlleDaten,
}) {
  const posts = arrayOderLeer(inhalte.posts);
  const tasks = arrayOderLeer(inhalte.tasks);
  const profiles = arrayOderLeer(inhalte.profiles);

  const post = posts.find(
    (eintrag) => String(eintrag.id) === String(ziel.postId),
  );

  const task = tasks.find(
    (eintrag) =>
      String(eintrag.postId) === String(ziel.postId),
  );

  const profil = post
    ? profiles.find(
        (eintrag) =>
          String(eintrag.id) === String(post.profileId),
      )
    : null;

  const regel =
    entwurf?.reasonConcepts?.[ziel.postId] || null;

  const zonen =
    entwurf?.imageHotspots?.[ziel.postId] || {
      errorCount: 0,
      hotspots: [],
    };

  const betroffeneDateien =
    dateienFuerZiel(ziel, inhalte);

  function aenderePost(key, value) {
    if (!post) {
      return;
    }

    setInhalte((aktuell) => ({
      ...aktuell,
      posts: arrayOderLeer(aktuell.posts).map((eintrag) =>
        String(eintrag.id) === String(post.id)
          ? {
              ...eintrag,
              [key]: value,
            }
          : eintrag,
      ),
    }));
  }

  function ersetzePost(neuerPost) {
    if (!post) {
      return;
    }

    setInhalte((aktuell) => ({
      ...aktuell,
      posts: arrayOderLeer(aktuell.posts).map((eintrag) =>
        String(eintrag.id) === String(post.id)
          ? neuerPost
          : eintrag,
      ),
    }));
  }

  function aendereTask(key, value) {
    if (!task) {
      return;
    }

    setInhalte((aktuell) => ({
      ...aktuell,
      tasks: arrayOderLeer(aktuell.tasks).map((eintrag) =>
        String(eintrag.id) === String(task.id)
          ? {
              ...eintrag,
              [key]: value,
            }
          : eintrag,
      ),
    }));
  }

  function ersetzeTask(neueTask) {
    if (!task) {
      return;
    }

    setInhalte((aktuell) => ({
      ...aktuell,
      tasks: arrayOderLeer(aktuell.tasks).map((eintrag) =>
        String(eintrag.id) === String(task.id)
          ? neueTask
          : eintrag,
      ),
    }));
  }

  function aendereProfil(key, value) {
    if (!profil) {
      return;
    }

    setInhalte((aktuell) => ({
      ...aktuell,
      profiles: arrayOderLeer(aktuell.profiles).map(
        (eintrag) =>
          String(eintrag.id) === String(profil.id)
            ? {
                ...eintrag,
                [key]: value,
              }
            : eintrag,
      ),
    }));
  }

  function ersetzeProfil(neuesProfil) {
    if (!profil) {
      return;
    }

    setInhalte((aktuell) => ({
      ...aktuell,
      profiles: arrayOderLeer(aktuell.profiles).map(
        (eintrag) =>
          String(eintrag.id) === String(profil.id)
            ? neuesProfil
            : eintrag,
      ),
    }));
  }

  function aendereRegel(neueRegel) {
    setEntwurf((aktuell) => ({
      ...aktuell,
      reasonConcepts: {
        ...objektOderLeer(aktuell.reasonConcepts),
        [ziel.postId]: neueRegel,
      },
    }));
  }

  function aendereZonen(neueZonen) {
    setEntwurf((aktuell) => ({
      ...aktuell,
      imageHotspots: {
        ...objektOderLeer(aktuell.imageHotspots),
        [ziel.postId]: neueZonen,
      },
    }));
  }

  function aendereEinstellungen(key, value) {
    setInhalte((aktuell) => ({
      ...aktuell,
      settings: {
        ...objektOderLeer(aktuell.settings),
        [key]: value,
      },
    }));
  }

  const titel = {
    beitrag: 'Beitrag',
    bewertung: 'Bewertung und Algorithmus',
    text: 'Oberflächentext',
    profil: 'Profilprüfung',
    quelle: 'Quellenprüfung',
    herkunft: 'Bildherkunft',
    zonen: 'Bildzonen',
    einstellungen: 'Spieleinstellungen',
    'alle-daten': 'Alle Daten',
  }[ziel.art] || 'Bearbeiten';

  return (
    <aside
      data-admin-schutz
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(460px, 96vw)',
        zIndex: 2147483100,
        background: '#fff',
        borderLeft: '1px solid #dce3ee',
        boxShadow: '-8px 0 28px rgba(13,36,79,.16)',
        overflowY: 'auto',
        padding: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 4,
        }}
      >
        <strong style={{ fontSize: 15 }}>
          {titel}
        </strong>

        {(ziel.schluessel || ziel.postId) && (
          <code
            style={{
              fontSize: 11,
              background: '#eef2f8',
              padding: '2px 6px',
              borderRadius: 6,
            }}
          >
            {ziel.schluessel || ziel.postId}
          </code>
        )}

        <button
          type="button"
          onClick={onSchliessen}
          style={{ marginLeft: 'auto' }}
        >
          Schließen
        </button>
      </div>

      <DateiAnzeige dateien={betroffeneDateien} />

      {ziel.art === 'alle-daten' && (
        <div style={{ marginTop: 14 }}>
          <p
            style={{
              fontSize: 12.5,
              lineHeight: 1.5,
              color: '#5a6b86',
            }}
          >
            Dieses Element konnte keiner einzelnen Datenstruktur
            eindeutig zugeordnet werden. Öffne den vollständigen
            Dateneditor, um jede Contentdatei bearbeiten zu können.
          </p>

          <button
            type="button"
            onClick={onAlleDaten}
          >
            Alle Daten öffnen
          </button>
        </div>
      )}

      {ziel.art === 'text' && (
        <>
          {SPRACHCODES.map((code) => (
            <label
              key={code}
              style={beschriftung}
            >
              {code.toUpperCase()}

              <textarea
                rows={4}
                style={feld}
                value={
                  entwurf?.translations?.[code]?.[
                    ziel.schluessel
                  ] ?? ''
                }
                onChange={(event) =>
                  setEntwurf((aktuell) => ({
                    ...aktuell,
                    translations: {
                      ...objektOderLeer(
                        aktuell.translations,
                      ),
                      [code]: {
                        ...objektOderLeer(
                          aktuell.translations?.[code],
                        ),
                        [ziel.schluessel]:
                          event.target.value,
                      },
                    },
                  }))
                }
              />
            </label>
          ))}

          <VollstaendigesObjekt
            titel="Vollständige Übersetzungen"
            datei="src/data/translations.js"
            wert={entwurf.translations}
            onChange={(value) =>
              setEntwurf((aktuell) => ({
                ...aktuell,
                translations: value,
              }))
            }
          />
        </>
      )}

      {ziel.art === 'einstellungen' && (
        <>
          <label style={beschriftung}>
            Zielpunktzahl zum Gewinnen

            <input
              type="number"
              style={feld}
              value={inhalte.settings?.targetScore ?? 20}
              onChange={(event) =>
                aendereEinstellungen(
                  'targetScore',
                  Number(event.target.value),
                )
              }
            />
          </label>

          <label style={beschriftung}>
            Verlustgrenze

            <input
              type="number"
              style={feld}
              value={inhalte.settings?.loseScore ?? -10}
              onChange={(event) =>
                aendereEinstellungen(
                  'loseScore',
                  Number(event.target.value),
                )
              }
            />
          </label>

          <label style={beschriftung}>
            Standardzeit in Sekunden

            <input
              type="number"
              min="0"
              style={feld}
              value={
                inhalte.settings?.defaultTimeLimit ?? 180
              }
              onChange={(event) =>
                aendereEinstellungen(
                  'defaultTimeLimit',
                  Number(event.target.value),
                )
              }
            />
          </label>

          <label style={beschriftung}>
            Maximale Anzahl an Tipps

            <input
              type="number"
              min="0"
              style={feld}
              value={inhalte.settings?.maxTips ?? 3}
              onChange={(event) =>
                aendereEinstellungen(
                  'maxTips',
                  Number(event.target.value),
                )
              }
            />
          </label>

          <label style={beschriftung}>
            Mindestabstand für Benachrichtigungen in Millisekunden

            <input
              type="number"
              min="0"
              style={feld}
              value={
                inhalte.settings?.notificationDelayMin ??
                12000
              }
              onChange={(event) =>
                aendereEinstellungen(
                  'notificationDelayMin',
                  Number(event.target.value),
                )
              }
            />
          </label>

          <label style={beschriftung}>
            Höchstabstand für Benachrichtigungen in Millisekunden

            <input
              type="number"
              min="0"
              style={feld}
              value={
                inhalte.settings?.notificationDelayMax ??
                25000
              }
              onChange={(event) =>
                aendereEinstellungen(
                  'notificationDelayMax',
                  Number(event.target.value),
                )
              }
            />
          </label>

          <label
            style={{
              ...beschriftung,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <input
              type="checkbox"
              checked={
                inhalte.settings
                  ?.endWhenAllTasksCompleted !== false
              }
              onChange={(event) =>
                aendereEinstellungen(
                  'endWhenAllTasksCompleted',
                  event.target.checked,
                )
              }
            />

            Spiel beenden, wenn alle Aufgaben erledigt sind
          </label>

          <VollstaendigesObjekt
            titel="Alle Einstellungen bearbeiten"
            datei="content/settings.json"
            wert={inhalte.settings}
            onChange={(value) =>
              setInhalte((aktuell) => ({
                ...aktuell,
                settings: value,
              }))
            }
          />
        </>
      )}

      {ziel.art === 'beitrag' && post && (
        <>
          <label style={beschriftung}>
            Benutzername

            <input
              style={feld}
              value={post.username || ''}
              onChange={(event) =>
                aenderePost(
                  'username',
                  event.target.value,
                )
              }
            />
          </label>

          <label style={beschriftung}>
            Ort

            <input
              style={feld}
              value={post.location || ''}
              onChange={(event) =>
                aenderePost(
                  'location',
                  event.target.value,
                )
              }
            />
          </label>

          <label style={beschriftung}>
            Likes

            <input
              type="number"
              style={feld}
              value={post.likes ?? 0}
              onChange={(event) =>
                aenderePost(
                  'likes',
                  Number(event.target.value),
                )
              }
            />
          </label>

          <label style={beschriftung}>
            Bild- oder Medienpfad

            <input
              style={feld}
              value={post.media || ''}
              onChange={(event) =>
                aenderePost(
                  'media',
                  event.target.value,
                )
              }
            />
          </label>

          {SPRACHCODES.map((code) => (
            <label
              key={code}
              style={beschriftung}
            >
              Bildunterschrift {code.toUpperCase()}

              <textarea
                rows={4}
                style={feld}
                value={zweisprachigerWert(
                  post.caption,
                  code,
                )}
                onChange={(event) =>
                  aenderePost(
                    'caption',
                    setzeZweisprachigenWert(
                      post.caption,
                      code,
                      event.target.value,
                    ),
                  )
                }
              />
            </label>
          ))}

          {task && (
            <div style={block}>
              <strong style={{ fontSize: 12.5 }}>
                Verknüpfte Aufgabe
              </strong>

              <label style={beschriftung}>
                Richtiges Urteil

                <select
                  style={feld}
                  value={task.correctVerdict || ''}
                  onChange={(event) =>
                    aendereTask(
                      'correctVerdict',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Keine Auswahl
                  </option>

                  {VERDICTS.map((verdict) => (
                    <option
                      key={verdict}
                      value={verdict}
                    >
                      {verdict}
                    </option>
                  ))}
                </select>
              </label>

              <label style={beschriftung}>
                Punkte richtig

                <input
                  type="number"
                  style={feld}
                  value={task.pointsCorrect ?? 1}
                  onChange={(event) =>
                    aendereTask(
                      'pointsCorrect',
                      Number(event.target.value),
                    )
                  }
                />
              </label>

              <label style={beschriftung}>
                Punkte falsch

                <input
                  type="number"
                  style={feld}
                  value={task.pointsWrong ?? -1}
                  onChange={(event) =>
                    aendereTask(
                      'pointsWrong',
                      Number(event.target.value),
                    )
                  }
                />
              </label>

              <label style={beschriftung}>
                Zeitlimit in Sekunden

                <input
                  type="number"
                  min="0"
                  style={feld}
                  value={
                    task.timeLimit ??
                    inhalte.settings
                      ?.defaultTimeLimit ??
                    180
                  }
                  onChange={(event) =>
                    aendereTask(
                      'timeLimit',
                      Number(event.target.value),
                    )
                  }
                />
              </label>
            </div>
          )}

          <VollstaendigesObjekt
            titel="Vollständigen Beitrag bearbeiten"
            datei="content/posts.json"
            wert={post}
            onChange={ersetzePost}
          />

          {task && (
            <VollstaendigesObjekt
              titel="Vollständige Aufgabe bearbeiten"
              datei="content/tasks.json"
              wert={task}
              onChange={ersetzeTask}
            />
          )}
        </>
      )}

      {ziel.art === 'profil' && profil && (
        <>
          <label style={beschriftung}>
            Benutzername

            <input
              style={feld}
              value={profil.username || ''}
              onChange={(event) =>
                aendereProfil(
                  'username',
                  event.target.value,
                )
              }
            />
          </label>

          <label style={beschriftung}>
            Anzeigename

            <input
              style={feld}
              value={profil.displayName || ''}
              onChange={(event) =>
                aendereProfil(
                  'displayName',
                  event.target.value,
                )
              }
            />
          </label>

          <label
            style={{
              ...beschriftung,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(profil.verified)}
              onChange={(event) =>
                aendereProfil(
                  'verified',
                  event.target.checked,
                )
              }
            />

            Profil ist verifiziert
          </label>

          {SPRACHCODES.map((code) => (
            <label
              key={code}
              style={beschriftung}
            >
              Biografie {code.toUpperCase()}

              <textarea
                rows={4}
                style={feld}
                value={zweisprachigerWert(
                  profil.bio,
                  code,
                )}
                onChange={(event) =>
                  aendereProfil(
                    'bio',
                    setzeZweisprachigenWert(
                      profil.bio,
                      code,
                      event.target.value,
                    ),
                  )
                }
              />
            </label>
          ))}

          <label style={beschriftung}>
            Profilprüfung

            <JsonFeld
              wert={profil.profileCheck}
              onChange={(value) =>
                aendereProfil(
                  'profileCheck',
                  value,
                )
              }
              zeilen={16}
            />
          </label>

          <VollstaendigesObjekt
            titel="Vollständiges Profil bearbeiten"
            datei="content/profiles.json"
            wert={profil}
            onChange={ersetzeProfil}
          />
        </>
      )}

      {ziel.art === 'quelle' && post && (
        <>
          <label style={beschriftung}>
            Quellenprüfung

            <JsonFeld
              wert={post.sourceCheck}
              onChange={(value) =>
                aenderePost(
                  'sourceCheck',
                  value,
                )
              }
              zeilen={20}
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

      {ziel.art === 'herkunft' && post && (
        <>
          <label style={beschriftung}>
            Bildherkunft / Rückwärtssuche

            <JsonFeld
              wert={post.imageOriginCheck}
              onChange={(value) =>
                aenderePost(
                  'imageOriginCheck',
                  value,
                )
              }
              zeilen={20}
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

      {ziel.art === 'zonen' && (
        <>
          <p
            style={{
              fontSize: 12.5,
              color: '#5a6b86',
              lineHeight: 1.5,
            }}
          >
            x und y markieren die linke obere Ecke. w und h
            bestimmen Breite und Höhe der Zone.
          </p>

          {arrayOderLeer(zonen.hotspots).map(
            (zone, index) => (
              <div
                key={`${index}-${zone.x}-${zone.y}`}
                style={block}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <strong style={{ fontSize: 12.5 }}>
                    Zone {index + 1}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      aendereZonen({
                        ...zonen,
                        hotspots:
                          arrayOderLeer(
                            zonen.hotspots,
                          ).filter(
                            (_, aktuellePosition) =>
                              aktuellePosition !== index,
                          ),
                      })
                    }
                    style={{ marginLeft: 'auto' }}
                  >
                    Löschen
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(2, minmax(0, 1fr))',
                    gap: 8,
                  }}
                >
                  {['x', 'y', 'w', 'h'].map(
                    (achse) => (
                      <label
                        key={achse}
                        style={{
                          fontSize: 12,
                          marginTop: 8,
                        }}
                      >
                        {achse}

                        <input
                          type="number"
                          style={feld}
                          value={zone[achse] ?? 0}
                          onChange={(event) =>
                            aendereZonen({
                              ...zonen,
                              hotspots:
                                arrayOderLeer(
                                  zonen.hotspots,
                                ).map(
                                  (
                                    aktuelleZone,
                                    aktuellePosition,
                                  ) =>
                                    aktuellePosition ===
                                    index
                                      ? {
                                          ...aktuelleZone,
                                          [achse]:
                                            Number(
                                              event.target
                                                .value,
                                            ),
                                        }
                                      : aktuelleZone,
                                ),
                            })
                          }
                        />
                      </label>
                    ),
                  )}
                </div>

                <label style={beschriftung}>
                  Hinweistext

                  <textarea
                    rows={4}
                    style={feld}
                    value={zone.hint || ''}
                    onChange={(event) =>
                      aendereZonen({
                        ...zonen,
                        hotspots:
                          arrayOderLeer(
                            zonen.hotspots,
                          ).map(
                            (
                              aktuelleZone,
                              aktuellePosition,
                            ) =>
                              aktuellePosition === index
                                ? {
                                    ...aktuelleZone,
                                    hint:
                                      event.target.value,
                                  }
                                : aktuelleZone,
                          ),
                      })
                    }
                  />
                </label>
              </div>
            ),
          )}

          <button
            type="button"
            style={{ marginTop: 10 }}
            onClick={() =>
              aendereZonen({
                ...zonen,
                errorCount:
                  Number(zonen.errorCount || 0) + 1,
                hotspots: [
                  ...arrayOderLeer(zonen.hotspots),
                  {
                    x: 40,
                    y: 30,
                    w: 24,
                    h: 30,
                    hint: 'Neuer Hinweis',
                  },
                ],
              })
            }
          >
            Zone hinzufügen
          </button>

          <VollstaendigesObjekt
            titel="Alle Bildzonen bearbeiten"
            datei="src/data/imageHotspots.js"
            wert={zonen}
            onChange={aendereZonen}
          />
        </>
      )}

      {ziel.art === 'bewertung' && (
        <>
          {task && (
            <VollstaendigesObjekt
              titel="Vollständige Aufgabe bearbeiten"
              datei="content/tasks.json"
              wert={task}
              onChange={ersetzeTask}
            />
          )}

          {regel ? (
            <>
              <label style={beschriftung}>
                Erwartetes Urteil

                <select
                  style={feld}
                  value={regel.verdict || ''}
                  onChange={(event) =>
                    aendereRegel({
                      ...regel,
                      verdict: event.target.value,
                    })
                  }
                >
                  <option value="">
                    Keine Auswahl
                  </option>

                  {VERDICTS.map((verdict) => (
                    <option
                      key={verdict}
                      value={verdict}
                    >
                      {verdict}
                    </option>
                  ))}
                </select>
              </label>

              {arrayOderLeer(regel.concepts).map(
                (konzept, index) => (
                  <div
                    key={index}
                    style={block}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <strong
                        style={{ fontSize: 12.5 }}
                      >
                        Konzept {index + 1}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          aendereRegel({
                            ...regel,
                            concepts:
                              arrayOderLeer(
                                regel.concepts,
                              ).filter(
                                (
                                  _,
                                  aktuellePosition,
                                ) =>
                                  aktuellePosition !==
                                  index,
                              ),
                          })
                        }
                        style={{ marginLeft: 'auto' }}
                      >
                        Löschen
                      </button>
                    </div>

                    <label style={beschriftung}>
                      Stichwörter, mit Komma getrennt

                      <textarea
                        rows={3}
                        style={feld}
                        value={arrayOderLeer(
                          konzept.terms,
                        ).join(', ')}
                        onChange={(event) =>
                          aendereRegel({
                            ...regel,
                            concepts:
                              arrayOderLeer(
                                regel.concepts,
                              ).map(
                                (
                                  aktuellesKonzept,
                                  aktuellePosition,
                                ) =>
                                  aktuellePosition ===
                                  index
                                    ? {
                                        ...aktuellesKonzept,
                                        terms:
                                          event.target.value
                                            .split(',')
                                            .map((wert) =>
                                              wert.trim(),
                                            )
                                            .filter(Boolean),
                                      }
                                    : aktuellesKonzept,
                              ),
                          })
                        }
                      />
                    </label>

                    <label style={beschriftung}>
                      Ganze Phrasen, mit Komma getrennt

                      <textarea
                        rows={4}
                        style={feld}
                        value={arrayOderLeer(
                          konzept.phrases,
                        ).join(', ')}
                        onChange={(event) =>
                          aendereRegel({
                            ...regel,
                            concepts:
                              arrayOderLeer(
                                regel.concepts,
                              ).map(
                                (
                                  aktuellesKonzept,
                                  aktuellePosition,
                                ) =>
                                  aktuellePosition ===
                                  index
                                    ? {
                                        ...aktuellesKonzept,
                                        phrases:
                                          event.target.value
                                            .split(',')
                                            .map((wert) =>
                                              wert.trim(),
                                            )
                                            .filter(Boolean),
                                      }
                                    : aktuellesKonzept,
                              ),
                          })
                        }
                      />
                    </label>
                  </div>
                ),
              )}

              <button
                type="button"
                style={{ marginTop: 10 }}
                onClick={() =>
                  aendereRegel({
                    ...regel,
                    concepts: [
                      ...arrayOderLeer(
                        regel.concepts,
                      ),
                      {
                        terms: [],
                        phrases: [],
                      },
                    ],
                  })
                }
              >
                Konzept hinzufügen
              </button>

              {SPRACHCODES.map((code) => (
                <label
                  key={code}
                  style={beschriftung}
                >
                  Rückmeldung {code.toUpperCase()}

                  <textarea
                    rows={4}
                    style={feld}
                    value={
                      regel.feedback?.[code] ?? ''
                    }
                    onChange={(event) =>
                      aendereRegel({
                        ...regel,
                        feedback: {
                          ...objektOderLeer(
                            regel.feedback,
                          ),
                          [code]: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}

              <VollstaendigesObjekt
                titel="Vollständige Bewertungsregel bearbeiten"
                datei="src/data/reasonConcepts.js"
                wert={regel}
                onChange={aendereRegel}
              />
            </>
          ) : (
            <div style={block}>
              <p
                style={{
                  fontSize: 12.5,
                  color: '#5a6b86',
                }}
              >
                Für diesen Beitrag existiert noch keine
                Bewertungsregel.
              </p>

              <button
                type="button"
                onClick={() =>
                  aendereRegel({
                    verdict:
                      task?.correctVerdict || 'echt',
                    concepts: [],
                    feedback: {
                      de: '',
                      en: '',
                    },
                  })
                }
              >
                Bewertungsregel erstellen
              </button>
            </div>
          )}

          <div
            style={{
              ...block,
              marginTop: 18,
            }}
          >
            <strong style={{ fontSize: 13 }}>
              Globaler Bewertungsalgorithmus
            </strong>

            <p
              style={{
                fontSize: 12,
                color: '#5a6b86',
                margin: '4px 0 0',
              }}
            >
              Diese Werte gelten für alle Fälle.
            </p>

            {STELLSCHRAUBEN.map((schraube) => (
              <label
                key={schraube.id}
                style={beschriftung}
              >
                {schraube.name}

                <span
                  style={{
                    display: 'block',
                    fontWeight: 400,
                    fontSize: 11.5,
                    color: '#5a6b86',
                  }}
                >
                  {schraube.hilfe}
                </span>

                <input
                  type="number"
                  style={{
                    ...feld,
                    maxWidth: 130,
                  }}
                  value={
                    entwurf.stellschrauben?.[
                      schraube.id
                    ] ?? ''
                  }
                  onChange={(event) =>
                    setEntwurf((aktuell) => ({
                      ...aktuell,
                      stellschrauben: {
                        ...objektOderLeer(
                          aktuell.stellschrauben,
                        ),
                        [schraube.id]:
                          Number(event.target.value),
                      },
                    }))
                  }
                />
              </label>
            ))}

            <VollstaendigesObjekt
              titel="Alle Algorithmuswerte bearbeiten"
              datei="src/data/conceptMatcher.js"
              wert={entwurf.stellschrauben}
              onChange={(value) =>
                setEntwurf((aktuell) => ({
                  ...aktuell,
                  stellschrauben: value,
                }))
              }
            />
          </div>
        </>
      )}

      <div
        style={{
          height: 24,
        }}
      />
    </aside>
  );
}

/* ============================================================
   ALLE CONTENTDATEIEN
   ============================================================ */

function AlleDatenAnsicht({
  inhalte,
  setInhalte,
  onSchliessen,
}) {
  const [aktiv, setAktiv] = useState(
    CONTENT_DATEIEN[0],
  );

  const [fehler, setFehler] = useState('');

  return (
    <div
      data-admin-schutz
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483200,
        background: 'rgba(7, 13, 27, .64)',
        padding: 18,
      }}
      onClick={onSchliessen}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: 1100,
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <strong>
            Alle Contentdateien bearbeiten
          </strong>

          <button
            type="button"
            onClick={onSchliessen}
            style={{ marginLeft: 'auto' }}
          >
            Schließen
          </button>
        </div>

        <p
          style={{
            margin: '7px 0 0',
            color: '#5a6b86',
            fontSize: 12.5,
          }}
        >
          Jede Änderung wird sofort in die Liveansicht
          übernommen, sobald das JSON gültig ist.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            margin: '12px 0',
          }}
        >
          {CONTENT_DATEIEN.map((datei) => (
            <button
              key={datei}
              type="button"
              onClick={() => {
                setAktiv(datei);
                setFehler('');
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                border: '1px solid #dce3ee',
                background:
                  datei === aktiv
                    ? '#092b61'
                    : '#fff',
                color:
                  datei === aktiv
                    ? '#fff'
                    : '#182235',
              }}
            >
              content/{datei}.json
            </button>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          <JsonFeld
            key={aktiv}
            wert={inhalte[aktiv]}
            onChange={(value) =>
              setInhalte((aktuell) => ({
                ...aktuell,
                [aktiv]: value,
              }))
            }
            onFehler={setFehler}
            zeilen={32}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: fehler
              ? '#a3382c'
              : '#1e6b4f',
          }}
        >
          {fehler
            ? 'Die Datei wird erst übernommen, wenn das JSON gültig ist.'
            : `Aktive Datei: content/${aktiv}.json`}
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   DATEIEN UND ÄNDERUNGSERKENNUNG
   ============================================================ */

function erzeugeAlleDateien(inhalte, entwurf) {
  return {
    ...Object.fromEntries(
      CONTENT_DATEIEN.map((name) => [
        `content/${name}.json`,
        stringifyDatei(inhalte[name]),
      ]),
    ),
    ...erzeugeCodeDateien(entwurf),
  };
}

function ermittleGeaenderteContentDateien(
  inhalte,
  originalInhalte,
) {
  if (!inhalte || !originalInhalte) {
    return [];
  }

  return CONTENT_DATEIEN
    .filter((name) => {
      try {
        return (
          JSON.stringify(inhalte[name]) !==
          JSON.stringify(originalInhalte[name])
        );
      } catch {
        return true;
      }
    })
    .map(normalisiereDateiName);
}

function GeaenderteDateienListe({
  dateien,
}) {
  if (!dateien.length) {
    return (
      <span style={{ color: '#1e6b4f' }}>
        Keine ungespeicherten Änderungen
      </span>
    );
  }

  return (
    <details style={{ width: '100%' }}>
      <summary
        style={{
          cursor: 'pointer',
          color: '#a3382c',
          fontWeight: 700,
        }}
      >
        {dateien.length} Datei(en) geändert
      </summary>

      <div
        style={{
          marginTop: 5,
          paddingLeft: 6,
        }}
      >
        {dateien.map((datei) => (
          <code
            key={datei}
            style={{
              display: 'block',
              marginTop: 3,
              fontSize: 11,
              overflowWrap: 'anywhere',
            }}
          >
            {datei}
          </code>
        ))}
      </div>
    </details>
  );
}

/* ============================================================
   CODEANSICHT
   ============================================================ */

/* ---------- Zentrale Bearbeitung aller Analysewerkzeuge ---------- */
function AnalysewerkzeugeAnsicht({
  inhalte,
  setInhalte,
  entwurf,
  setEntwurf,
  onSchliessen,
  onVorschau,
}) {
  const posts = arrayOderLeer(inhalte.posts);
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
    ? arrayOderLeer(inhalte.profiles).find((eintrag) => String(eintrag.id) === String(post.profileId)) || null
    : null;
  const zonen = post ? (entwurf?.imageHotspots?.[post.id] || { errorCount: 0, hotspots: [] }) : null;

  const ersetzePost = (neu) => {
    if (!post) return;
    setInhalte((alt) => ({
      ...alt,
      posts: arrayOderLeer(alt.posts).map((eintrag) => (
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
      profiles: arrayOderLeer(alt.profiles).map((eintrag) => (
        String(eintrag.id) === String(profil.id) ? neu : eintrag
      )),
    }));
  };

  const setzeZonen = (neu) => {
    if (!post) return;
    setEntwurf((alt) => ({
      ...alt,
      imageHotspots: {
        ...objektOderLeer(alt.imageHotspots),
        [post.id]: neu,
      },
    }));
  };

  const sourceCheck = objektOderLeer(post?.sourceCheck);
  const profileCheck = objektOderLeer(profil?.profileCheck);
  const originCheck = objektOderLeer(post?.imageOriginCheck);
  const genericAnalysisTools = objektOderLeer(post?.analysisTools);

  function verfuegbarkeit(wert, onChange) {
    return (
      <label style={{ ...beschriftung, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={wert?.available !== false}
          onChange={(event) => onChange({ ...objektOderLeer(wert), available: event.target.checked })}
        />
        Werkzeug für diesen Beitrag verfügbar
      </label>
    );
  }

  if (!posts.length) {
    return (
      <aside
        data-admin-schutz
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(520px, 45vw)',
          zIndex: 2147483200,
          background: '#fff',
          borderRight: '1px solid #dce3ee',
          boxShadow: '8px 0 28px rgba(13,36,79,.16)',
          padding: 18,
          overflowY: 'auto',
        }}
      >
        <strong>Analysewerkzeuge</strong>
        <p>Es sind keine Beiträge vorhanden.</p>
        <button type="button" onClick={onSchliessen}>Schließen</button>
      </aside>
    );
  }

  return (
    <aside
      data-admin-schutz
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 'min(520px, 45vw)',
        zIndex: 2147483200,
        background: '#fff',
        borderRight: '1px solid #dce3ee',
        boxShadow: '8px 0 28px rgba(13,36,79,.16)',
        overflow: 'hidden',
      }}
    >
      <section
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          padding: 18,
          overflow: 'hidden',
          boxSizing: 'border-box',
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

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flex: 1,
            minHeight: 0,
            marginTop: 14,
          }}
        >
          <div
            style={{
              flex: '0 0 auto',
              borderBottom: '1px solid #dce3ee',
              paddingBottom: 12,
            }}
          >
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
                    {eintrag.username || eintrag.id} · {String(zweisprachigerWert(eintrag.caption, 'de') || '').slice(0, 48)}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                marginTop: 14,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 6,
              }}
            >
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

            <div style={{ ...block, marginTop: 12 }}>
              <strong style={{ fontSize: 12.5 }}>Ausgewählter Beitrag</strong>
              <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.45 }}>
                <b>ID:</b> {post?.id}<br />
                <b>Profil:</b> {profil?.username || post?.profileId || 'nicht verknüpft'}
              </p>
            </div>
          </div>

          <main style={{ overflowY: 'auto', paddingRight: 4, minHeight: 0, flex: 1 }}>
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
                    wert={arrayOderLeer(sourceCheck.keyFacts)}
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
                  Änderungen an Hotspots und Hinweistexten werden direkt in der Vorschau neben dem Editor angezeigt.
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
    </aside>
  );
}

function CodeAnsicht({
  inhalte,
  entwurf,
  geaenderteDateien,
  onSchliessen,
}) {
  const dateien = useMemo(
    () => erzeugeAlleDateien(inhalte, entwurf),
    [inhalte, entwurf],
  );

  const ersterEintrag =
    geaenderteDateien.find(
      (datei) => dateien[datei] !== undefined,
    ) || Object.keys(dateien)[0];

  const [aktiv, setAktiv] = useState(ersterEintrag);
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    if (!dateien[aktiv]) {
      setAktiv(ersterEintrag);
    }
  }, [aktiv, dateien, ersterEintrag]);

  async function kopieren() {
    const code = dateien[aktiv] || '';

    try {
      await navigator.clipboard.writeText(code);
      setKopiert(true);

      window.setTimeout(
        () => setKopiert(false),
        1600,
      );
    } catch {
      window.prompt(
        'Markieren und kopieren:',
        code,
      );
    }
  }

  return (
    <div
      data-admin-schutz
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483300,
        background: 'rgba(7,13,27,.64)',
        padding: 18,
      }}
      onClick={onSchliessen}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <strong>
            Quelltext und geänderte Dateien
          </strong>

          <button
            type="button"
            onClick={kopieren}
          >
            {kopiert
              ? 'Kopiert'
              : 'Diese Datei kopieren'}
          </button>

          <button
            type="button"
            onClick={onSchliessen}
            style={{ marginLeft: 'auto' }}
          >
            Schließen
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            margin: '12px 0',
          }}
        >
          {Object.keys(dateien).map((pfad) => {
            const geaendert =
              geaenderteDateien.includes(pfad);

            return (
              <button
                key={pfad}
                type="button"
                onClick={() => setAktiv(pfad)}
                style={{
                  padding: '5px 9px',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  border: geaendert
                    ? '2px solid #db2b73'
                    : '1px solid #dce3ee',
                  background:
                    pfad === aktiv
                      ? '#092b61'
                      : '#fff',
                  color:
                    pfad === aktiv
                      ? '#fff'
                      : geaendert
                        ? '#a33868'
                        : '#182235',
                  fontWeight: geaendert
                    ? 800
                    : 500,
                }}
              >
                {pfad}
                {geaendert ? ' · geändert' : ''}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginBottom: 8,
            fontSize: 12,
            color: geaenderteDateien.includes(
              aktiv,
            )
              ? '#a33868'
              : '#5a6b86',
          }}
        >
          Aktive Datei: <code>{aktiv}</code>
        </div>

        <pre
          style={{
            flex: 1,
            margin: 0,
            padding: 12,
            overflow: 'auto',
            borderRadius: 10,
            background: '#0f1b30',
            color: '#e6edf7',
            fontSize: 12.5,
            lineHeight: 1.5,
            whiteSpace: 'pre',
          }}
        >
          {dateien[aktiv] || ''}
        </pre>
      </section>
    </div>
  );
}

/* ============================================================
   HAUPTKOMPONENTE
   ============================================================ */

export default function InlineAdmin() {
  const [modus, setModus] =
    useState('spielen');

  const [inhalte, setInhalte] =
    useState(null);

  const [originalInhalte, setOriginalInhalte] =
    useState(null);

  const [entwurf, setEntwurf] =
    useState(ladeEntwurf);

  const [ziel, setZiel] =
    useState(null);

  const [zeigeCode, setZeigeCode] =
    useState(false);

  const [zeigeAlleDaten, setZeigeAlleDaten] =
    useState(false);

  const [zeigeAnalysewerkzeuge, setZeigeAnalysewerkzeuge] =
    useState(false);

  const [vorschauSchluessel, setVorschauSchluessel] =
    useState(0);

  const [meldung, setMeldung] =
    useState('');

  const [speicherStatus, setSpeicherStatus] =
    useState('');

  useEffect(() => {
    let aktiv = true;

    async function laden() {
      try {
        const paare = await Promise.all(
          CONTENT_DATEIEN.map(async (name) => {
            const antwort = await fetch(
              joinBase(`content/${name}.json`),
              {
                cache: 'no-store',
              },
            );

            if (!antwort.ok) {
              throw new Error(
                `content/${name}.json: Status ${antwort.status}`,
              );
            }

            return [
              name,
              await antwort.json(),
            ];
          }),
        );

        if (!aktiv) {
          return;
        }

        const serverInhalte =
          Object.fromEntries(paare);

        setOriginalInhalte(clone(serverInhalte));

        let gespeichert = null;

        try {
          const text =
            localStorage.getItem(
              INHALT_SCHLUESSEL,
            );

          gespeichert = text
            ? JSON.parse(text)
            : null;
        } catch {
          gespeichert = null;
        }

        setInhalte(
          gespeichert || clone(serverInhalte),
        );
      } catch (error) {
        if (!aktiv) {
          return;
        }

        setMeldung(
          error instanceof Error
            ? error.message
            : String(error),
        );
      }
    }

    laden();

    return () => {
      aktiv = false;
    };
  }, []);

  useEffect(() => {
    if (!inhalte) {
      return;
    }

    try {
      localStorage.setItem(
        INHALT_SCHLUESSEL,
        JSON.stringify(inhalte),
      );
    } catch {
      /* localStorage voll oder blockiert */
    }
  }, [inhalte]);

  const geaenderteContentDateien = useMemo(
    () =>
      ermittleGeaenderteContentDateien(
        inhalte,
        originalInhalte,
      ),
    [inhalte, originalInhalte],
  );

  const geaenderteGenerierteDateien = useMemo(
    () => geaenderteCodeDateien(entwurf),
    [entwurf],
  );

  const alleGeaendertenDateien = useMemo(
    () =>
      Array.from(
        new Set([
          ...geaenderteContentDateien,
          ...geaenderteGenerierteDateien,
        ]),
      ),
    [
      geaenderteContentDateien,
      geaenderteGenerierteDateien,
    ],
  );

  const klick = useCallback(
    (event) => {
      const willBearbeiten =
        event.altKey ||
        modus === 'bearbeiten';

      if (!willBearbeiten) {
        return;
      }

      if (
        event.target.closest(
          '[data-admin-schutz]',
        )
      ) {
        return;
      }

      const gefunden = findeZiel(
        event.target,
        inhalte || {},
        entwurf,
      );

      if (!gefunden) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setZiel(gefunden);
    },
    [
      modus,
      inhalte,
      entwurf,
    ],
  );

  function manuellSpeichern() {
    try {
      localStorage.setItem(
        INHALT_SCHLUESSEL,
        JSON.stringify(inhalte),
      );

      speichereEntwurf(entwurf);

      setSpeicherStatus('Gespeichert');

      window.setTimeout(
        () => setSpeicherStatus(''),
        1800,
      );
    } catch (error) {
      setSpeicherStatus(
        `Speichern fehlgeschlagen: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }

  function zuruecksetzen() {
    const bestaetigt = window.confirm(
      'Alle lokalen Änderungen verwerfen und den GitHub-Stand laden?',
    );

    if (!bestaetigt) {
      return;
    }

    try {
      localStorage.removeItem(
        INHALT_SCHLUESSEL,
      );
    } catch {
      /* nichts */
    }

    setEntwurf(leerEntwurf());
    window.location.reload();
  }

  function exportiereZip() {
    manuellSpeichern();

    ladeZipHerunter(
      inhalte,
      entwurf,
      originalInhalte,
    );
  }

  if (meldung) {
    return (
      <div
        style={{
          padding: 24,
          fontFamily: 'system-ui',
        }}
      >
        <p>
          <strong>
            Die Inhalte konnten nicht geladen
            werden.
          </strong>
        </p>

        <p>{meldung}</p>

        <p>
          Der Adminmodus benötigt einen Server.
          Verwende npm run dev oder die
          veröffentlichte GitHub-Pages-Adresse.
        </p>
      </div>
    );
  }

  if (!inhalte) {
    return (
      <div
        style={{
          padding: 24,
          fontFamily: 'system-ui',
        }}
      >
        Inhalte werden geladen …
      </div>
    );
  }

  return (
    <div onClickCapture={klick}>
      {modus === 'bearbeiten' && (
        <style>{MARKIER_CSS}</style>
      )}

      <div
        style={{
          marginLeft: zeigeAnalysewerkzeuge ? 'min(520px, 45vw)' : 0,
          transition: 'margin-left .2s ease',
          minHeight: '100vh',
        }}
      >
        <App
          key={vorschauSchluessel}
          contentOverride={inhalte}
          imageHotspotsOverride={entwurf.imageHotspots}
          previewMode
        />
      </div>

      <AdminKopfKnopf
        aktiv
        onClick={() => {
          window.location.hash = '';
          window.location.reload();
        }}
      />

      <div
        data-admin-schutz
        style={{
          position: 'fixed',
          left: 12,
          bottom: 12,
          zIndex: 2147483050,
          maxWidth: 'min(560px, 96vw)',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: 10,
          borderRadius: 12,
          background: 'rgba(255,255,255,.97)',
          border: '1px solid #dce3ee',
          boxShadow:
            '0 8px 22px rgba(13,36,79,.16)',
        }}
      >
        <div
          style={{
            display: 'flex',
            border: '1px solid #cbd5e1',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          {[
            ['spielen', 'Spielen'],
            ['bearbeiten', 'Bearbeiten'],
          ].map(([id, name]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setModus(id);
                setZiel(null);
              }}
              style={{
                padding: '6px 12px',
                border: 'none',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 12,
                fontWeight: 800,
                background:
                  modus === id
                    ? '#092b61'
                    : 'transparent',
                color:
                  modus === id
                    ? '#fff'
                    : '#092b61',
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            setZeigeAnalysewerkzeuge(true)
          }
        >
          Analysewerkzeuge
        </button>

        <button
          type="button"
          onClick={() =>
            setZeigeAlleDaten(true)
          }
        >
          Alle Daten
        </button>

        <button
          type="button"
          onClick={() => setZeigeCode(true)}
        >
          Code
        </button>

        <button
          type="button"
          onClick={manuellSpeichern}
        >
          {speicherStatus || 'Speichern'}
        </button>

        <button
          type="button"
          onClick={exportiereZip}
        >
          Geänderte Dateien als ZIP
        </button>

        <button
          type="button"
          onClick={zuruecksetzen}
        >
          Zurücksetzen
        </button>

        <p
          style={{
            width: '100%',
            margin: 0,
            fontSize: 11.5,
            lineHeight: 1.45,
            color: '#5a6b86',
          }}
        >
          {modus === 'spielen'
            ? 'Die App verhält sich wie für die Schülerinnen und Schüler. Mit Alt + Klick kannst du trotzdem ein Element bearbeiten.'
            : 'Klicke ein sichtbares Element an. Im Bearbeitungsfenster wird direkt angezeigt, welche Datei verändert wird.'}
        </p>

        <GeaenderteDateienListe
          dateien={alleGeaendertenDateien}
        />
      </div>

      {ziel && (
        <Seitenfeld
          ziel={ziel}
          inhalte={inhalte}
          setInhalte={setInhalte}
          entwurf={entwurf}
          setEntwurf={setEntwurf}
          onSchliessen={() => setZiel(null)}
          onAlleDaten={() => {
            setZiel(null);
            setZeigeAlleDaten(true);
          }}
        />
      )}

      {zeigeAnalysewerkzeuge && (
        <AnalysewerkzeugeAnsicht
          inhalte={inhalte}
          setInhalte={setInhalte}
          entwurf={entwurf}
          setEntwurf={setEntwurf}
          onSchliessen={() =>
            setZeigeAnalysewerkzeuge(false)
          }
          onVorschau={() =>
            setVorschauSchluessel((aktuell) => aktuell + 1)
          }
        />
      )}

      {zeigeAlleDaten && (
        <AlleDatenAnsicht
          inhalte={inhalte}
          setInhalte={setInhalte}
          onSchliessen={() =>
            setZeigeAlleDaten(false)
          }
        />
      )}

      {zeigeCode && (
        <CodeAnsicht
          inhalte={inhalte}
          entwurf={entwurf}
          geaenderteDateien={
            alleGeaendertenDateien
          }
          onSchliessen={() =>
            setZeigeCode(false)
          }
        />
      )}
    </div>
  );
}

