// stats.js — Fall-Protokoll für die Auswertung.
// Alles bleibt im Browser (localStorage). Nichts wird gesendet.

const KEY = 'aigram.caseLog.v1';

export const CONFIDENCE_LEVELS = [
  { value: 1, de: 'Unsicher', en: 'Not sure' },
  { value: 2, de: 'Eher sicher', en: 'Fairly sure' },
  { value: 3, de: 'Sicher', en: 'Sure' },
];

export const TRUTH_LABELS = {
  echt: { de: 'Echt', en: 'Real' },
  manipuliert: { de: 'Manipuliert', en: 'Manipulated' },
  irrefuehrend: { de: 'Irreführend', en: 'Misleading' },
};

function readRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

function writeRaw(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, entries }));
  } catch {
    // Privater Modus o. ä. — Statistik läuft dann nur für diese Sitzung.
  }
}

export function loadCaseLog() {
  return readRaw();
}

/**
 * Einen abgeschlossenen Fall protokollieren.
 * Ein Post wird nur einmal gezählt: ein erneuter Eintrag ersetzt den alten.
 */
export function logCase({
  postId,
  truth,               // 'echt' | 'manipuliert' | 'irrefuehrend'
  verdict,             // was das Kind gewählt hat
  reasonPoint = 0,     // 0 oder 1 aus dem Begründungs-Matcher
  confidence = null,   // 1 | 2 | 3
  tools = [],          // ['image','source','profile','origin']
}) {
  const entries = readRaw().filter((e) => e.postId !== postId);
  entries.push({
    postId,
    truth,
    verdict,
    verdictCorrect: verdict === truth,
    reasonPoint: reasonPoint ? 1 : 0,
    confidence,
    tools,
    ts: Date.now(),
  });
  writeRaw(entries);
  return entries;
}

export function clearCaseLog() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorieren */
  }
  return [];
}

/** Rohdaten → alles, was das Panel anzeigt. */
export function buildStats(entries) {
  const total = entries.length;
  const verdictRight = entries.filter((e) => e.verdictCorrect).length;
  const reasonRight = entries.reduce((sum, e) => sum + e.reasonPoint, 0);

  // Tendenz: pro Grundwahrheit, wie oft welches Urteil kam
  const byTruth = {};
  for (const key of Object.keys(TRUTH_LABELS)) {
    const rows = entries.filter((e) => e.truth === key);
    byTruth[key] = {
      total: rows.length,
      right: rows.filter((e) => e.verdictCorrect).length,
    };
  }

  // Echte Posts fälschlich als manipuliert/irreführend = misstrauisch
  // Manipulierte/irreführende fälschlich als echt = vertrauensvoll
  const tooSuspicious = entries.filter(
    (e) => e.truth === 'echt' && !e.verdictCorrect
  ).length;
  const tooTrusting = entries.filter(
    (e) => e.truth !== 'echt' && e.verdict === 'echt'
  ).length;

  let tendency = 'balanced';
  if (tooSuspicious - tooTrusting >= 2) tendency = 'suspicious';
  else if (tooTrusting - tooSuspicious >= 2) tendency = 'trusting';
  if (total < 4) tendency = 'early';

  // Kalibrierung: Trefferquote je Sicherheitsstufe
  const byConfidence = CONFIDENCE_LEVELS.map((level) => {
    const rows = entries.filter((e) => e.confidence === level.value);
    return {
      ...level,
      total: rows.length,
      right: rows.filter((e) => e.verdictCorrect).length,
    };
  });

  // Mit vs. ohne genutzte Werkzeuge
  const withTools = entries.filter((e) => (e.tools || []).length > 0);
  const withoutTools = entries.filter((e) => (e.tools || []).length === 0);

  return {
    total,
    verdictRight,
    verdictWrong: total - verdictRight,
    reasonRight,
    reasonWrong: total - reasonRight,
    byTruth,
    tooSuspicious,
    tooTrusting,
    tendency,
    byConfidence,
    withTools: { total: withTools.length, right: withTools.filter((e) => e.verdictCorrect).length },
    withoutTools: { total: withoutTools.length, right: withoutTools.filter((e) => e.verdictCorrect).length },
  };
}
