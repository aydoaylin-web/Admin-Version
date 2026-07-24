import { useMemo, useState } from 'react';
import REASON_CONCEPTS from '../data/reasonConcepts';
import IMAGE_HOTSPOTS from '../data/imageHotspots';
import { LANGUAGES } from '../data/translations';

/* ============================================================
   NACHZIEH-PRUEFER

   Manche Aenderungen im Adminbereich wirken nicht allein durch
   die JSON-Dateien. Sie brauchen zusaetzlich eine Aenderung in
   einer JS-Datei - und die kann der Browser nicht selbst
   vornehmen, weil er nur ausfuehrt, was beim Bauen entstanden
   ist. Dieser Pruefer vergleicht deinen Entwurf mit dem Stand
   der JS-Dateien und sagt dir woertlich, was noch zu tun ist.

   Eine neue Regel ergaenzen: unten in ermittleNachziehschritte
   einen weiteren Block nach demselben Muster einfuegen und ein
   Objekt in die Liste schieben. Pflichtfelder: datei, titel,
   warum. Optional: code (zum Kopieren) und dringend.
   ============================================================ */

const VERDICTS = ['echt', 'suspekt', 'manipuliert'];

function alsListe(wert) {
  if (Array.isArray(wert)) return wert;
  if (wert && typeof wert === 'object') return Object.values(wert)[0] || [];
  return [];
}

export function ermittleNachziehschritte(data) {
  if (!data) return [];
  const schritte = [];
  const posts = alsListe(data.posts);
  const tasks = alsListe(data.tasks);
  const postIds = new Set(posts.map((p) => p.id));

  /* ---- 1. Newsaufgaben ohne Bewertungsregel ----------------
     Die Begruendung der Kinder wird ueber reasonConcepts.js
     bewertet, nicht ueber die Wortliste im Aufgabenformular.
     Fehlt dort ein Eintrag, wird jede Begruendung abgelehnt. */
  tasks.filter((t) => t.type === 'news' && t.enabled !== false).forEach((task) => {
    const regel = REASON_CONCEPTS[task.postId];
    const post = posts.find((p) => p.id === task.postId);
    if (!post) return;

    if (!regel) {
      schritte.push({
        id: `regel-fehlt-${task.postId}`,
        datei: 'src/data/reasonConcepts.js',
        dringend: true,
        titel: `Bewertungsregel für ${task.postId} fehlt`,
        warum: `Der Beitrag "${post.username || task.postId}" hat eine Newsaufgabe, aber keinen Eintrag in reasonConcepts.js. Ohne ihn wird jede Begründung der Kinder als falsch gewertet.`,
        anweisung: `In src/data/reasonConcepts.js innerhalb von REASON_CONCEPTS einfügen (Wortlisten und Feedback noch anpassen):`,
        code: `  ${task.postId}: { verdict: "${task.correctVerdict || 'suspekt'}", concepts: [{
    id: "kurzname-des-konzepts", name: "Sprechender Name",
    terms: ["stichwort", "weiteres stichwort"],
    phrases: ["ein ganzer satz, den kinder schreiben koennten"],
  }], feedback: {
    de: "Erklaerung fuer die Schuelerinnen und Schueler.",
    en: "Explanation in English.",
  }},`,
      });
      return;
    }

    /* ---- 2. Einstufung weicht voneinander ab --------------
       Aenderst du im Adminbereich die richtige Einstufung,
       zieht reasonConcepts.js NICHT automatisch mit. Dann
       widersprechen sich Urteil und Begruendungsfeedback. */
    if (task.correctVerdict && regel.verdict !== task.correctVerdict) {
      schritte.push({
        id: `verdict-${task.postId}`,
        datei: 'src/data/reasonConcepts.js',
        dringend: true,
        titel: `Einstufung für ${task.postId} widerspricht sich`,
        warum: `Im Adminbereich steht "${task.correctVerdict}", in reasonConcepts.js steht noch "${regel.verdict}". Die Kinder bekämen ein Feedback, das nicht zum richtigen Urteil passt.`,
        anweisung: `In src/data/reasonConcepts.js beim Eintrag ${task.postId} das Feld verdict ändern auf:`,
        code: `verdict: "${task.correctVerdict}"`,
      });
    }

    if (task.correctVerdict && !VERDICTS.includes(task.correctVerdict)) {
      schritte.push({
        id: `verdict-unbekannt-${task.postId}`,
        datei: 'content/tasks.json',
        dringend: true,
        titel: `Unbekannte Einstufung bei ${task.id}`,
        warum: `"${task.correctVerdict}" ist keine gültige Einstufung. Erlaubt sind: ${VERDICTS.join(', ')}.`,
      });
    }
  });

  /* ---- 3. Verwaiste Regeln ---------------------------------
     Beitrag geloescht, Regel blieb stehen. Stoert nicht, macht
     die Datei aber mit der Zeit unuebersichtlich. */
  Object.keys(REASON_CONCEPTS).forEach((postId) => {
    if (postIds.has(postId)) return;
    schritte.push({
      id: `regel-verwaist-${postId}`,
      datei: 'src/data/reasonConcepts.js',
      dringend: false,
      titel: `Regel für gelöschten Beitrag ${postId}`,
      warum: `Den Beitrag ${postId} gibt es nicht mehr, die Bewertungsregel steht aber noch in der Datei.`,
      anweisung: `In src/data/reasonConcepts.js den kompletten Block ${postId}: { ... } entfernen.`,
    });
  });

  /* ---- 4. Manipulierte Bilder ohne Fehlerzonen -------------
     Ohne Eintrag laeuft die Bildpruefung im Nur-Ansehen-Modus,
     die Kinder finden also nichts. Kein Fehler, aber meist
     nicht gewollt. */
  tasks.filter((t) => t.correctVerdict === 'manipuliert' && t.enabled !== false).forEach((task) => {
    if (IMAGE_HOTSPOTS[task.postId]) return;
    if (!postIds.has(task.postId)) return;
    schritte.push({
      id: `hotspot-${task.postId}`,
      datei: 'src/data/imageHotspots.js',
      dringend: false,
      titel: `Keine Fehlerzonen für ${task.postId}`,
      warum: `Der Beitrag gilt als manipuliert, hat aber keine Fehlerzonen. Die Bildprüfung zeigt das Bild dann nur an, ohne dass die Kinder etwas finden können.`,
      anweisung: `In src/data/imageHotspots.js einfügen (Werte in Prozent, x/y ist die linke obere Ecke):`,
      code: `  ${task.postId}: {
    errorCount: 1,
    hotspots: [
      { x: 40, y: 30, w: 24, h: 30, hint: "Was hier auffaellt und warum das Bild generiert ist." }
    ]
  },`,
    });
  });

  Object.keys(IMAGE_HOTSPOTS).forEach((postId) => {
    if (postIds.has(postId)) return;
    schritte.push({
      id: `hotspot-verwaist-${postId}`,
      datei: 'src/data/imageHotspots.js',
      dringend: false,
      titel: `Fehlerzonen für gelöschten Beitrag ${postId}`,
      warum: `Den Beitrag ${postId} gibt es nicht mehr, die Fehlerzonen stehen aber noch in der Datei.`,
      anweisung: `In src/data/imageHotspots.js den Block ${postId}: { ... } entfernen.`,
    });
  });

  /* ---- 5. Sprache ohne Uebersetzung ------------------------ */
  const sprachen = LANGUAGES.map((l) => l.code);
  const eingestellt = data.settings?.language;
  if (eingestellt && !sprachen.includes(eingestellt)) {
    schritte.push({
      id: `sprache-${eingestellt}`,
      datei: 'src/data/translations.js',
      dringend: true,
      titel: `Sprache "${eingestellt}" ist nicht übersetzt`,
      warum: `In den Einstellungen steht "${eingestellt}", übersetzt sind bisher nur: ${sprachen.join(', ')}. Die Oberfläche bliebe ohne Beschriftungen.`,
      anweisung: `In src/data/translations.js die Sprache zur Liste LANGUAGES hinzufügen und einen Übersetzungsblock ergänzen:`,
      code: `export const LANGUAGES = [
${sprachen.map((c) => `  { code: '${c}', label: '${c.toUpperCase()}' },`).join('\n')}
  { code: '${eingestellt}', label: '${String(eingestellt).toUpperCase()}' },
];`,
    });
  }

  return schritte;
}

function Schritt({ schritt }) {
  const [kopiert, setKopiert] = useState(false);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(schritt.code);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1600);
    } catch {
      window.prompt('Zum Kopieren markieren und Strg+C drücken:', schritt.code);
    }
  }

  return (
    <article style={{
      padding: 16, marginBottom: 12, borderRadius: 12,
      border: `1px solid ${schritt.dringend ? '#e8b4b4' : '#dce3ee'}`,
      background: schritt.dringend ? '#fdf4f4' : '#f7f9fc',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15 }}>{schritt.titel}</strong>
        <code style={{ fontSize: 12, padding: '2px 7px', borderRadius: 6, background: '#e7edf6', color: '#243b60' }}>
          {schritt.datei}
        </code>
        {schritt.dringend && (
          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: '#c0392b', color: '#fff' }}>
            muss
          </span>
        )}
      </div>

      <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.55 }}>{schritt.warum}</p>

      {schritt.anweisung && (
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.55, fontWeight: 700 }}>{schritt.anweisung}</p>
      )}

      {schritt.code && (
        <div style={{ marginTop: 8 }}>
          <pre style={{
            margin: 0, padding: 12, borderRadius: 10, overflowX: 'auto',
            background: '#0f1b30', color: '#e6edf7', fontSize: 12.5, lineHeight: 1.5,
          }}>{schritt.code}</pre>
          <button type="button" onClick={kopieren} style={{ marginTop: 8 }}>
            {kopiert ? 'Kopiert' : 'Code kopieren'}
          </button>
        </div>
      )}
    </article>
  );
}

export default function NachziehHinweise({ data }) {
  const schritte = useMemo(() => ermittleNachziehschritte(data), [data]);
  const muss = schritte.filter((s) => s.dringend);
  const kann = schritte.filter((s) => !s.dringend);

  if (!schritte.length) {
    return (
      <main className="admin-panel" style={{ padding: 24 }}>
        <h2>Nachziehen im Code</h2>
        <p style={{ fontSize: 14 }}>
          Nichts zu tun. Deine Änderungen kommen alle aus den JSON-Dateien
          und wirken nach dem Hochladen von selbst.
        </p>
      </main>
    );
  }

  return (
    <main className="admin-panel" style={{ padding: 24 }}>
      <h2>Nachziehen im Code</h2>
      <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
        Diese Änderungen brauchen zusätzlich eine Anpassung in einer
        JS-Datei. Der Browser kann das nicht selbst erledigen — er führt
        aus, was beim Bauen entstanden ist. Also: Code unten kopieren, in
        der genannten Datei einsetzen, hochladen, danach die Seite neu
        laden. Erst dann wirkt es.
      </p>

      {muss.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>
            Muss geändert werden ({muss.length})
          </h3>
          {muss.map((s) => <Schritt key={s.id} schritt={s} />)}
        </section>
      )}

      {kann.length > 0 && (
        <section>
          <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>
            Hinweise, keine Pflicht ({kann.length})
          </h3>
          {kann.map((s) => <Schritt key={s.id} schritt={s} />)}
        </section>
      )}
    </main>
  );
}
