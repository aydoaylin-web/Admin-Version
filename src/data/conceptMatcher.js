// Deterministischer, offline Begruendungs-Matcher — kein LLM, kein Modell.
// Ordnet eine freie Schueler-Antwort einem autorierten Konzept zu (reasonConcepts.js).
import REASON_CONCEPTS, { SLANG_ONLY } from './reasonConcepts';

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// leichtes deutsches Suffix-Stripping (Stamm >= 3 Zeichen behalten)
function stem(w) {
  for (const suf of ['en', 'em', 'er', 'es', 'te', 'ten', 'st', 'e', 'n', 's']) {
    if (w.length - suf.length >= 3 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[n];
}

// Trifft ein einzelnes Antwort-Token einen (Einzelwort-)Begriff? Laengenabhaengige Toleranz.
function tokenHitsTerm(token, termNorm) {
  if (!termNorm) return false;
  if (token === termNorm) return true;
  const maxD = termNorm.length >= 7 ? 2 : (termNorm.length >= 5 ? 1 : 0);
  if (maxD > 0 && levenshtein(token, termNorm) <= maxD) return true;
  const st = stem(termNorm);
  if (st.length >= 4 && stem(token) === st) return true;
  return false;
}

// Mehrwort-Begriff/Phrase: exakter Teilstring ODER alle Kern-Tokens (fuzzy) im Text vorhanden.
function phraseInText(tokens, rawNorm, phraseNorm) {
  if (rawNorm.includes(phraseNorm)) return true;
  const parts = phraseNorm.split(' ').filter((w) => w.length > 2);
  if (!parts.length) return false;
  return parts.every((p) => tokens.some((tk) => tokenHitsTerm(tk, p)));
}

function termInText(tokens, rawNorm, termNorm) {
  if (termNorm.includes(' ')) return phraseInText(tokens, rawNorm, termNorm);
  return tokens.some((tk) => tokenHitsTerm(tk, termNorm));
}

// Ergebnis: { matched, conceptId, conceptName, via, hadSlangOnly, feedback, expectedVerdict }
export function matchReason(postId, text) {
  const entry = REASON_CONCEPTS[postId];
  const rawNorm = normalize(text);
  const tokens = rawNorm.split(' ').filter(Boolean);
  const slangOnly = () => tokens.some((tk) => SLANG_ONLY.some((s) => tokenHitsTerm(tk, normalize(s))));
  const result = {
    matched: false, conceptId: null, conceptName: null, via: null,
    hadSlangOnly: false, feedback: entry ? entry.feedback : null,
    expectedVerdict: entry ? entry.verdict : null,
  };
  if (!entry || !tokens.length) {
    result.hadSlangOnly = slangOnly();
    return result;
  }
  for (const concept of entry.concepts) {
    for (const term of (concept.terms || [])) {
      if (termInText(tokens, rawNorm, normalize(term))) {
        return { ...result, matched: true, conceptId: concept.id, conceptName: concept.name, via: term };
      }
    }
    for (const phrase of (concept.phrases || [])) {
      if (phraseInText(tokens, rawNorm, normalize(phrase))) {
        return { ...result, matched: true, conceptId: concept.id, conceptName: concept.name, via: phrase };
      }
    }
  }
  result.hadSlangOnly = slangOnly();
  return result;
}

export default matchReason;
