/* ===========================================================================
   Die beiden .js-Datendateien lesen und wieder ausschreiben.
   ---------------------------------------------------------------------------
   src/data/reasonConcepts.js und src/data/imageHotspots.js enthalten reine
   Daten, sind aber JavaScript. Hier werden sie zu Objekten gemacht und
   spaeter wieder als lesbares JavaScript ausgegeben.
   =========================================================================== */

/** Wandelt Quelltext in Daten um, indem die Modul-Schluesselwoerter entfernt werden. */
function evaluateModule(source, exportNames) {
  const body = source
    .replace(/export\s+default\s+([A-Za-z0-9_$]+)\s*;?/g, '')
    .replace(/export\s+(const|let|var)\s+/g, '$1 ')
    .replace(/export\s*\{[^}]*\}\s*;?/g, '');
  const returns = `return { ${exportNames.join(', ')} };`;
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\n${returns}`)();
}

export function parseReasonConcepts(source) {
  const { REASON_CONCEPTS, SLANG_ONLY } = evaluateModule(source, ['REASON_CONCEPTS', 'SLANG_ONLY']);
  return { concepts: REASON_CONCEPTS, slangOnly: SLANG_ONLY };
}

export function parseImageHotspots(source) {
  const { IMAGE_HOTSPOTS } = evaluateModule(source, ['IMAGE_HOTSPOTS']);
  return IMAGE_HOTSPOTS;
}

/* --------------------------------------------------------------------------
   Ausgabe
   -------------------------------------------------------------------------- */

/** Zeichenkette als JavaScript-Text mit doppelten Anfuehrungszeichen. */
function str(value) {
  return JSON.stringify(String(value ?? ''));
}

function list(values, indent) {
  if (!values || !values.length) return '[]';
  const pad = ' '.repeat(indent);
  const oneLine = `[${values.map(str).join(', ')}]`;
  if (oneLine.length + indent < 110) return oneLine;
  return `[\n${values.map(v => pad + '  ' + str(v)).join(',\n')},\n${pad}]`;
}

export function buildReasonConcepts({ concepts, slangOnly }) {
  const head =
`// Konzeptbasierte Freitext-Auswertung — 1:1 nach der Musterlösung des Autors.
// Pro Post: verdict + akzeptierte Begründungs-Konzepte (terms/phrases, Gen-Alpha) + Feedback (DE/EN).
// Reiner Slang (sus/fake/weird) zählt nie allein -> nur in SLANG_ONLY.
//
// Diese Datei wird vom Admin Studio erzeugt. Änderungen von Hand sind möglich,
// werden beim nächsten Export aus dem Studio aber überschrieben.

export const SLANG_ONLY = ${list(slangOnly, 0)};

const REASON_CONCEPTS = {
`;

  const blocks = Object.entries(concepts).map(([postId, entry]) => {
    const conceptText = (entry.concepts || []).map(c =>
`{
    id: ${str(c.id)}, name: ${str(c.name)},
    terms: ${list(c.terms, 4)},
    phrases: ${list(c.phrases, 4)},
  }`).join(', ');

    return `  ${postId}: { verdict: ${str(entry.verdict)}, concepts: [${conceptText}], feedback: {
    de: ${str(entry.feedback?.de)},
    en: ${str(entry.feedback?.en)},
  }},`;
  });

  return `${head}${blocks.join('\n')}\n};\n\nexport default REASON_CONCEPTS;\n`;
}

export function buildImageHotspots(hotspots) {
  const head =
`// Fehlerzonen in PROZENT (0–100). x,y = linke obere Ecke; w,h = Größe; hint = Treffertext.
//
// Diese Datei wird vom Admin Studio erzeugt. Am einfachsten änderst du die
// Zonen dort im Bildeditor, statt hier Zahlen zu tippen.

const IMAGE_HOTSPOTS = {
`;

  const blocks = Object.entries(hotspots).map(([postId, entry]) => {
    if (entry.inspectionOnly) {
      return `  ${postId}: { inspectionOnly: true },`;
    }
    const spots = (entry.hotspots || []).map(h =>
      `      { x: ${+h.x}, y: ${+h.y}, w: ${+h.w}, h: ${+h.h}, hint: ${str(h.hint)} }`
    ).join(',\n');
    return `  ${postId}: {
    errorCount: ${entry.errorCount ?? (entry.hotspots || []).length},
    hotspots: [
${spots}
    ]
  },`;
  });

  return `${head}${blocks.join('\n')}\n};\n\nexport default IMAGE_HOTSPOTS;\n`;
}

/** JSON so ausgeben, wie es im Projekt gespeichert ist. */
export function buildJson(data) {
  return JSON.stringify(data, null, 2) + '\n';
}
