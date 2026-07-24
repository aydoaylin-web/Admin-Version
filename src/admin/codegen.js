/* ============================================================
   QUELLTEXT-ERZEUGUNG

   Der Adminbereich bearbeitet die Spiellogik als Daten und
   schreibt daraus wieder gueltige JS-Dateien. Der Browser fuehrt
   diesen Text nicht aus - er zeigt ihn dir zum Kopieren. Deshalb
   ist hier nur wichtig, dass gueltiges JavaScript herauskommt.

   Eine weitere Datei ergaenzen: eine baue...()-Funktion nach
   demselben Muster schreiben und in DATEIEN unten eintragen.
   ============================================================ */

/* Wandelt einen Wert in JS-Quelltext. Anfuehrungszeichen,
   Zeilenumbrueche und Backslashes werden korrekt maskiert -
   sonst entsteht kaputter Code, sobald ein Text ein Apostroph
   enthaelt ("Iris' Hinweis"). */
export function alsJs(wert, einrueckung = 0) {
  const tab = '  '.repeat(einrueckung);
  if (wert === null) return 'null';
  if (wert === undefined) return 'undefined';
  if (typeof wert === 'number' || typeof wert === 'boolean') return String(wert);
  if (typeof wert === 'string') return JSON.stringify(wert);
  if (Array.isArray(wert)) {
    if (!wert.length) return '[]';
    const kurz = wert.every((v) => typeof v === 'string' || typeof v === 'number');
    if (kurz) {
      const zeile = `[${wert.map((v) => alsJs(v)).join(', ')}]`;
      if (zeile.length <= 100) return zeile;
    }
    const teile = wert.map((v) => `${tab}  ${alsJs(v, einrueckung + 1)}`);
    return `[\n${teile.join(',\n')}\n${tab}]`;
  }
  const schluessel = Object.keys(wert);
  if (!schluessel.length) return '{}';
  const teile = schluessel.map((k) => {
    const name = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
    return `${tab}  ${name}: ${alsJs(wert[k], einrueckung + 1)}`;
  });
  return `{\n${teile.join(',\n')}\n${tab}}`;
}

export function baueTranslations(translations) {
  const sprachen = Object.keys(translations);
  const bloecke = sprachen.map((code) => {
    const zeilen = Object.keys(translations[code]).map(
      (k) => `    ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(translations[code][k])},`,
    );
    return `  ${code}: {\n${zeilen.join('\n')}\n  },`;
  });

  return `// Oberflaechentexte. Aus dem Adminbereich erzeugt.
// Neue Sprache: unten in LANGUAGES eintragen und einen
// gleichnamigen Block mit denselben Schluesseln ergaenzen.

export const LANGUAGES = [
${sprachen.map((c) => `  { code: '${c}', label: '${c.toUpperCase()}' },`).join('\n')}
];

const translations = {
${bloecke.join('\n')}
};

export default translations;
`;
}

export function baueReasonConcepts(slangOnly, eintraege) {
  const bloecke = Object.keys(eintraege).map((postId) => {
    const e = eintraege[postId];
    const konzepte = (e.concepts || []).map((c) => `{
    id: ${JSON.stringify(c.id || '')}, name: ${JSON.stringify(c.name || '')},
    terms: ${alsJs(c.terms || [], 2)},
    phrases: ${alsJs(c.phrases || [], 2)},
  }`).join(', ');

    return `  ${postId}: { verdict: ${JSON.stringify(e.verdict || 'suspekt')}, concepts: [${konzepte}], feedback: {
    de: ${JSON.stringify(e.feedback?.de || '')},
    en: ${JSON.stringify(e.feedback?.en || '')},
  }},`;
  });

  return `// Konzeptbasierte Freitext-Auswertung. Aus dem Adminbereich erzeugt.
// Pro Beitrag: verdict + akzeptierte Begruendungs-Konzepte + Feedback.
// Reiner Slang zaehlt nie allein -> dafuer ist SLANG_ONLY da.

export const SLANG_ONLY = ${alsJs(slangOnly, 0)};

const REASON_CONCEPTS = {
${bloecke.join('\n')}
};

export default REASON_CONCEPTS;
`;
}

export function baueImageHotspots(hotspots) {
  const bloecke = Object.keys(hotspots).map((postId) => {
    const h = hotspots[postId];
    const zonen = (h.hotspots || []).map(
      (z) => `      { x: ${z.x}, y: ${z.y}, w: ${z.w}, h: ${z.h}, hint: ${JSON.stringify(z.hint || '')} }`,
    ).join(',\n');
    return `  ${postId}: {
    errorCount: ${h.errorCount ?? (h.hotspots || []).length},
    hotspots: [
${zonen}
    ]
  },`;
  });

  return `// Fehlerzonen in PROZENT (0-100). x,y = linke obere Ecke; w,h = Groesse.
// Aus dem Adminbereich erzeugt.

const IMAGE_HOTSPOTS = {
${bloecke.join('\n')}
};

export default IMAGE_HOTSPOTS;
`;
}

/* ============================================================
   ALGORITHMUS-STELLSCHRAUBEN

   conceptMatcher.js wird NICHT neu geschrieben, sondern gezielt
   an vier Stellen ersetzt. Das ist sicherer, als die ganze
   Datei aus einer Vorlage zu erzeugen: alles andere im Text
   bleibt unangetastet, auch wenn du es von Hand aenderst.
   ============================================================ */
export const STELLSCHRAUBEN = [
  {
    id: 'fuzzyLang',
    name: 'Tippfehler-Toleranz bei langen Wörtern',
    hilfe: 'Ab dieser Wortlänge sind zwei falsche Buchstaben erlaubt. Höher = strenger.',
    muster: /(termNorm\.length >= )(\d+)( \? 2)/,
  },
  {
    id: 'fuzzyKurz',
    name: 'Tippfehler-Toleranz bei kurzen Wörtern',
    hilfe: 'Ab dieser Wortlänge ist ein falscher Buchstabe erlaubt. Höher = strenger.',
    muster: /(termNorm\.length >= )(\d+)( \? 1 : 0)/,
  },
  {
    id: 'stammMin',
    name: 'Mindestlänge des Wortstamms',
    hilfe: 'Kürzere Stämme werden nicht verglichen. Niedriger = großzügiger, aber mehr Zufallstreffer.',
    muster: /(st\.length >= )(\d+)()/,
  },
  {
    id: 'phrasenMin',
    name: 'Mindestlänge der Wörter in einer Phrase',
    hilfe: 'Kürzere Wörter einer Phrase werden ignoriert (der, die, und ...).',
    muster: /(\.filter\(\(w\) => w\.length > )(\d+)(\))/,
  },
];

export function leseStellschrauben(quelltext) {
  const werte = {};
  STELLSCHRAUBEN.forEach((s) => {
    const treffer = quelltext.match(s.muster);
    werte[s.id] = treffer ? Number(treffer[2]) : null;
  });
  return werte;
}

export function setzeStellschrauben(quelltext, werte) {
  let text = quelltext;
  STELLSCHRAUBEN.forEach((s) => {
    const wert = werte[s.id];
    if (wert === null || wert === undefined || Number.isNaN(Number(wert))) return;
    // Alle Muster haben genau drei Gruppen: davor, Zahl, danach.
    // Mit weniger Gruppen liefert replace als drittes Argument die
    // Fundstelle als Zahl - das haengt sich sonst an den Wert an.
    text = text.replace(s.muster, (_treffer, davor, _zahl, danach) => `${davor}${Number(wert)}${danach}`);
  });
  return text;
}
