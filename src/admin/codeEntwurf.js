import translationsOriginal, { LANGUAGES } from '../data/translations';
import REASON_CONCEPTS_ORIGINAL, { SLANG_ONLY } from '../data/reasonConcepts';
import IMAGE_HOTSPOTS_ORIGINAL from '../data/imageHotspots';
import conceptMatcherRoh from '../data/conceptMatcher.js?raw';
import appRoh from '../App.jsx?raw';
import contentRoh from '../content.js?raw';
import {
  baueTranslations, baueReasonConcepts, baueImageHotspots,
  leseStellschrauben, setzeStellschrauben,
} from './codegen';

/* ============================================================
   ENTWURFSSPEICHER FUER DIE CODE-DATEIEN

   Die JSON-Inhalte verwaltet AdminApp. Hier liegt alles, was in
   JS-Dateien steht: Uebersetzungen, Bewertungsregeln,
   Fehlerzonen, der Algorithmus und der reine Text von App.jsx.

   Wichtig: die Daten werden als OBJEKTE bearbeitet und daraus
   wird der Quelltext erzeugt. Es wird nichts geparst - deshalb
   kann dabei auch nichts kaputtgehen.

   Das ?raw hinter einem Import gibt Vite die Anweisung, den
   Dateiinhalt als Zeichenkette mitzuliefern statt ihn
   auszufuehren. So kommt App.jsx als Text in den Adminbereich.
   ============================================================ */

const SCHLUESSEL = 'dd-admin-code-entwurf-v1';

export const ROHDATEIEN = {
  'src/data/conceptMatcher.js': conceptMatcherRoh,
  'src/App.jsx': appRoh,
  'src/content.js': contentRoh,
};

const tief = (wert) => JSON.parse(JSON.stringify(wert));

export function leerEntwurf() {
  return {
    translations: tief(translationsOriginal),
    slangOnly: tief(SLANG_ONLY),
    reasonConcepts: tief(REASON_CONCEPTS_ORIGINAL),
    imageHotspots: tief(IMAGE_HOTSPOTS_ORIGINAL),
    stellschrauben: leseStellschrauben(conceptMatcherRoh),
    rohtexte: {},
  };
}

export function ladeEntwurf() {
  try {
    const gespeichert = localStorage.getItem(SCHLUESSEL);
    if (!gespeichert) return leerEntwurf();
    const geladen = JSON.parse(gespeichert);
    return { ...leerEntwurf(), ...geladen };
  } catch {
    return leerEntwurf();
  }
}

export function speichereEntwurf(entwurf) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(entwurf));
    return true;
  } catch {
    return false;
  }
}

export function verwerfeEntwurf() {
  try { localStorage.removeItem(SCHLUESSEL); } catch { /* nichts zu tun */ }
}

export const SPRACHCODES = LANGUAGES.map((l) => l.code);

/* Erzeugt aus dem Entwurf alle JS-Dateien als Text.
   Rueckgabe: { 'src/data/translations.js': '...', ... } */
export function erzeugeCodeDateien(entwurf) {
  const dateien = {
    'src/data/translations.js': baueTranslations(entwurf.translations),
    'src/data/reasonConcepts.js': baueReasonConcepts(entwurf.slangOnly, entwurf.reasonConcepts),
    'src/data/imageHotspots.js': baueImageHotspots(entwurf.imageHotspots),
    'src/data/conceptMatcher.js': setzeStellschrauben(
      entwurf.rohtexte['src/data/conceptMatcher.js'] ?? conceptMatcherRoh,
      entwurf.stellschrauben,
    ),
  };
  Object.keys(entwurf.rohtexte || {}).forEach((pfad) => {
    if (pfad === 'src/data/conceptMatcher.js') return;
    dateien[pfad] = entwurf.rohtexte[pfad];
  });
  return dateien;
}

/* Vergleich gegen den Auslieferungsstand. Damit ein unveraenderter
   Entwurf nicht als geaendert gilt, wird der Originalstand mit
   denselben Generatoren erzeugt - sonst wuerde blosse
   Umformatierung schon als Aenderung zaehlen. */
export function urspruenglicheCodeDateien() {
  return erzeugeCodeDateien(leerEntwurf());
}

export function geaenderteCodeDateien(entwurf) {
  const neu = erzeugeCodeDateien(entwurf);
  const alt = urspruenglicheCodeDateien();
  return Object.keys(neu).filter((pfad) => (alt[pfad] ?? ROHDATEIEN[pfad]) !== neu[pfad]);
}
