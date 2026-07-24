// Konzeptbasierte Freitext-Auswertung — 1:1 nach der Musterlösung des Autors.
// Pro Post: verdict + akzeptierte Begründungs-Konzepte (terms/phrases, Gen-Alpha) + Feedback (DE/EN).
// Reiner Slang (sus/fake/weird) zählt nie allein -> nur in SLANG_ONLY.

export const SLANG_ONLY = [
  "sus", "fake", "weird", "komisch", "unecht", "cringe", "sketchy", "off",
  "seltsam", "strange", "not real", "ai looking", "ki maessig", "glitch",
  "glaube ich nicht", "sieht komisch aus", "irgendwie falsch", "hmm",
];

const REASON_CONCEPTS = {
  // (2) ECHT — offizielle Seite, auch anderswo berichtet (Bildsuche bestätigt)
  post_101: { verdict: "echt", concepts: [{
    id: "offiziell-anderswo-bestaetigt", name: "Offizielle Seite + anderswo bestätigt",
    terms: ["offiziell", "verifiziert", "aigram", "bildsuche", "andere", "quellen", "berichtet", "bestätigt", "seriös"],
    phrases: ["offizielle seite", "wurde auch woanders berichtet", "andere quellen sagen das gleiche", "das offizielle konto", "bildersuche bestätigt", "auch in anderen quellen"],
  }], feedback: {
    de: "Der Beitrag kommt von der offiziellen Seite – und die Bildersuche zeigt, dass auch andere Quellen darüber berichten. Deshalb „Echt“.",
    en: "The post is from the official page — and the reverse image search shows other sources report it too. So “Real”.",
  }},
  // (7) ECHT — Bild in ähnlichen Kontexten (Bildsuche), EU-Seite sagt dasselbe
  post_102: { verdict: "echt", concepts: [{
    id: "eu-quelle-bild-bestaetigt", name: "EU-Quelle + Bild bestätigt",
    terms: ["eu", "europa", "quelle", "offiziell", "bildsuche", "ähnlich", "bestätigt", "seriös", "berichtet"],
    phrases: ["die eu seite sagt das gleiche", "bild taucht in ähnlichen kontexten auf", "seriöse quelle bestätigt", "eu quelle bestätigt das", "auch woanders so berichtet"],
  }], feedback: {
    de: "Die Bildersuche zeigt das Bild in passenden, ähnlichen Zusammenhängen, und die EU-Seite sagt dasselbe. Deshalb „Echt“.",
    en: "The reverse image search shows the image in matching contexts, and the EU page says the same. So “Real”.",
  }},
  // (9) ECHT — Bildsuche führt zur offiziellen Mitteilung des Bundesministeriums
  post_103: { verdict: "echt", concepts: [{
    id: "ministerium-bestaetigt", name: "Offizielle Stelle bestätigt (Bildsuche)",
    terms: ["ministerium", "bundesministerium", "offiziell", "behörde", "amtlich", "bildsuche", "bestätigt", "bestätigen", "beleg", "quelle", "seriös"],
    phrases: ["das ministerium hat das auch", "auch vom ministerium", "offizielle mitteilung", "die bildersuche bestätigt das", "auch woanders berichtet", "amtliche quelle bestätigt", "eine offizielle stelle sagt das gleiche"],
  }], feedback: {
    de: "Die Bildersuche führt zur offiziellen Mitteilung des Bundesministeriums – die Meldung ist also belegt. Deshalb „Echt“.",
    en: "The reverse image search leads to the ministry's official announcement — the report is backed up. So “Real”.",
  }},
  // (6) MANIPULIERT — Bild aus KI-Generator; zusätzlich widerspricht die Quelle.
  // Zwei gleichwertige Konzepte: beide Begründungswege geben den Punkt.
  post_104: { verdict: "manipuliert", concepts: [{
    id: "bild-aus-ki-generator", name: "Bild stammt aus einem KI-Bildgenerator",
    terms: ["ki", "ai", "generator", "generiert", "erzeugt", "bildgenerator", "erstellt", "künstlich", "bildsuche", "gefunden", "fake"],
    phrases: ["das bild ist ki", "mit ki erstellt", "aus einem ki generator", "die bildersuche findet es bei einem ki bild ersteller", "bild wurde generiert", "kommt von einem bildgenerator", "künstlich erzeugtes bild"],
  }, {
    id: "quelle-widerspricht-junges-profil", name: "Quelle widerspricht + junges/unverifiziertes Profil",
    terms: ["pilot", "pilotprojekt", "test", "überall", "quelle", "widerspricht", "anders", "profil", "verifiziert", "neu", "frisch"],
    phrases: ["die quelle sagt was anderes", "nur ein pilotprojekt", "der post sagt überall", "im artikel steht anders", "profil ist neu", "konto erst gerade erstellt", "profil nicht verifiziert"],
  }], feedback: {
    de: "Die Bildersuche findet das Bild bei einem KI-Bildgenerator – es wurde also erzeugt. Dazu sagt die verlinkte Quelle nur „Test an wenigen Schulen“, während der Beitrag „alle“ behauptet. Deshalb „Manipuliert“.",
    en: "The reverse image search finds the picture at an AI image generator — so it was created. On top of that the linked source only mentions a test at a few schools, while the post claims it applies to everyone. So “Manipulated”.",
  }},
  // (—) ECHT — Mona Lisa: KI-Look macht Info nicht falsch (unverändert beibehalten)
  post_105: { verdict: "echt", concepts: [{
    id: "ki-look-info-stimmt", name: "KI-/Stil-Bild macht Info nicht falsch",
    terms: ["stimmt", "wahr", "korrekt", "louvre", "paris", "quelle", "bestätigt", "fakt", "richtig", "true"],
    phrases: ["das stimmt", "die info ist richtig", "auch wenn das bild ki ist stimmt der text", "quelle bestätigt es", "der fakt stimmt trotzdem"],
  }], feedback: {
    de: "Auch wenn das Bild künstlich wirkt: Die Aussage ist faktisch korrekt und die Quelle bestätigt sie. Ein KI-Look macht eine Info nicht falsch – „Echt“.",
    en: "Even if the image looks artificial, the statement is correct and the source confirms it. An AI look does not make info false — “Real”.",
  }},
  // (11) ECHT — offizielle Stadtquelle, von der Bildsuche zusätzlich bestätigt
  post_106: { verdict: "echt", concepts: [{
    id: "offizielle-stadtquelle-bestaetigt", name: "Offizielle Stadtquelle + Bildsuche bestätigt",
    terms: ["offiziell", "stadt", "presseamt", "quelle", "behörde", "seriös", "amtlich", "bestätigt", "bildsuche", "gleiche", "selbe"],
    phrases: ["offizielle quelle", "die stadt bestätigt das", "offizielle seite der stadt", "quelle ist offiziell", "die bildersuche führt zur gleichen seite", "bildsuche bestätigt die stadt", "beides zeigt die stadt"],
  }], feedback: {
    de: "Die Quelle ist offiziell (Presseamt der Stadt) – und die Bildersuche führt zur selben amtlichen Seite. Zwei Wege, ein Ergebnis. Deshalb „Echt“.",
    en: "The source is official (the city's press office) — and the reverse image search leads to the same official page. Two routes, one result. So “Real”.",
  }},
  // (13) MANIPULIERT — Artefakt, 6 Finger
  post_107: { verdict: "manipuliert", concepts: [{
    id: "artefakt-finger", name: "Artefakt (Finger/Hand)",
    terms: ["artefakt", "finger", "hand", "hände", "verformt", "ki", "komisch", "unnatürlich", "generiert"],
    phrases: ["sechs finger", "6 finger", "die hand ist komisch", "das bild ist ki", "verformte hand", "mit ki gemacht"],
  }], feedback: {
    de: "Im Bild steckt ein KI-Artefakt – die Hand hat sechs Finger. Deshalb „Manipuliert“.",
    en: "The image has an AI artefact — the hand has six fingers. So “Manipulated”.",
  }},
  // (4) MANIPULIERT — Artefakt + kein Impressum auf der Webpage
  post_108: { verdict: "manipuliert", concepts: [
    { id: "artefakt", name: "Artefakt", terms: ["artefakt", "ki", "verformt", "hand", "gesicht", "generiert", "unnatürlich"],
      phrases: ["das bild ist ki", "mit ki gemacht", "sieht ki generiert aus", "das bild ist fake"] },
    { id: "kein-impressum", name: "Kein Impressum", terms: ["impressum", "owner", "verantwortlich", "unseriös", "anonym", "betreiber"],
      phrases: ["kein impressum", "kein impressum auf der seite", "unseriöse webpage", "man weiß nicht wer dahinter steckt"] },
  ], feedback: {
    de: "Das Bild zeigt ein KI-Artefakt, und die verlinkte Seite hat kein Impressum – also keine seriöse Quelle. Deshalb „Manipuliert“.",
    en: "The image shows an AI artefact, and the linked page has no legal notice/owner — not a reliable source. So “Manipulated”.",
  }},
  // (1) MANIPULIERT — Artefakte, Hände
  post_109: { verdict: "manipuliert", concepts: [{
    id: "artefakt-haende", name: "Artefakt (Hände)",
    terms: ["artefakt", "hände", "hand", "finger", "verformt", "ki", "generiert", "unnatürlich", "hintergrund"],
    phrases: ["die hände sind komisch", "verformte hände", "das bild ist ki", "mit ki gemacht", "ki artefakte"],
  }], feedback: {
    de: "Im Bild stecken KI-Artefakte – vor allem an den Händen. Deshalb „Manipuliert“.",
    en: "The image has AI artefacts — especially on the hands. So “Manipulated”.",
  }},
  // (10) MANIPULIERT — Artefakt, nichts auf der offiziellen Seite
  post_110: { verdict: "manipuliert", concepts: [{
    id: "artefakt-nichts-offiziell", name: "Artefakt + nichts auf offizieller Seite",
    terms: ["artefakt", "ki", "produktbild", "verformt", "offiziell", "seite", "nichts"],
    phrases: ["das produktbild ist ki", "das bild ist ki", "auf der offiziellen seite steht das nicht", "nichts auf der echten seite", "mit ki gemacht"],
  }], feedback: {
    de: "Das Produktbild ist ein KI-Artefakt – und auf der offiziellen Seite ist davon nichts zu sehen. Deshalb „Manipuliert“.",
    en: "The product image is an AI artefact — and there is nothing about it on the official page. So “Manipulated”.",
  }},
  // (—) SUSPEKT — Cyberattacke: kein Link, Bild taucht woanders auf (Bildsuche)
  post_111: { verdict: "suspekt", concepts: [{
    id: "keine-quelle-bild-woanders", name: "Keine Quelle + Bild woanders (Bildsuche)",
    terms: ["link", "quelle", "keine", "bildsuche", "woanders", "anderswo", "altes", "kontext", "panik"],
    phrases: ["es gibt keinen link", "keine quelle", "die bildersuche zeigt das bild woanders", "das bild ist von woanders", "das bild taucht schon auf"],
  }], feedback: {
    de: "Es gibt keinen Link/keine Quelle, und die Bildersuche zeigt: Dasselbe Bild taucht schon woanders auf. Deshalb „Suspekt“.",
    en: "There is no link/source, and the reverse image search shows the same image already appears elsewhere. So “Suspicious”.",
  }},
  // (8) SUSPEKT — nirgends berichtet (Bildsuche), Seite frisch, kein Owner
  post_112: { verdict: "suspekt", concepts: [{
    id: "bildsuche-leer-neue-seite-kein-owner", name: "Bildsuche leer + neue Seite ohne Owner",
    terms: ["nirgends", "bildsuche", "owner", "impressum", "neu", "frisch", "keine", "andere"],
    phrases: ["sonst berichtet niemand", "die bildersuche findet nichts", "die seite ist neu", "gerade erst gemacht", "kein owner", "kein impressum", "wurde nirgends berichtet"],
  }], feedback: {
    de: "Sonst berichtet niemand darüber (Bildersuche leer), und die verlinkte Seite ist gerade erst erstellt und hat keinen Owner. Deshalb „Suspekt“.",
    en: "Nobody else reports it (reverse search empty), and the linked page was just created and has no owner. So “Suspicious”.",
  }},
  // (5) MANIPULIERT — falscher Kontext, Bild in anderem Kontext genutzt
  post_113: { verdict: "manipuliert", concepts: [{
    id: "falscher-kontext", name: "Bild im falschen Kontext",
    terms: ["kontext", "anderer", "anderes", "ereignis", "altes", "bild", "woanders", "nachricht", "bildsuche"],
    phrases: ["das bild wurde in anderem kontext benutzt", "falscher kontext", "das bild gehört zu einer anderen nachricht", "das bild ist von woanders", "aus einem anderen zusammenhang"],
  }], feedback: {
    de: "Das Bild wurde schon einmal in einem ganz anderen Kontext – mit einer anderen Nachricht – benutzt. Deshalb „Manipuliert“.",
    en: "The image was already used in a completely different context — with a different story. So “Manipulated”.",
  }},
  // (15) MANIPULIERT — Quellensuche zeigt: nur ausgewählte Bereiche, nicht Chats
  post_114: { verdict: "manipuliert", concepts: [{
    id: "quelle-sagt-anders", name: "Quelle sagt es anders",
    terms: ["quelle", "bereiche", "chats", "allgemein", "anders", "eingegrenzt", "nur"],
    phrases: ["die quelle sagt es anders", "nur in ausgewählten bereichen", "nicht in den chats", "nur beim allgemeinen", "die quellensuche zeigt anders"],
  }], feedback: {
    de: "Die Quellensuche zeigt: Die Werbung kommt nur in ausgewählten Bereichen (nicht in den Chats, nur im Allgemeinen). Der Post stellt es anders dar. Deshalb „Manipuliert“.",
    en: "The source search shows the ads run only in selected areas (not in chats, only in the general area). The post frames it differently. So “Manipulated”.",
  }},
  // (12) MANIPULIERT — Artefakt (Arm unvollständig) + kein Link
  post_115: { verdict: "manipuliert", concepts: [{
    id: "artefakt-arm-kein-link", name: "Artefakt (Arm) + keine Quelle",
    terms: ["artefakt", "arm", "vollständig", "fehlt", "verformt", "ki", "link", "quelle"],
    phrases: ["der arm ist nicht vollständig", "der arm fehlt teilweise", "das bild ist ki", "es gibt keinen link", "keine quelle und artefakt"],
  }], feedback: {
    de: "Das Bild hat ein Artefakt – der Arm ist nicht vollständig – und es gibt keinen Link/keine Quelle. Deshalb „Manipuliert“.",
    en: "The image has an artefact — the arm is incomplete — and there is no link/source. So “Manipulated”.",
  }},
  // (3) SUSPEKT — keine Quelle, Bildsuche nichts, nicht offizieller Account
  post_116: { verdict: "suspekt", concepts: [{
    id: "keine-quelle-bildsuche-leer-nicht-offiziell", name: "Keine Quelle + Bildsuche leer + nicht offizieller Account",
    terms: ["keine", "quelle", "link", "bildsuche", "nichts", "offiziell", "account", "privat"],
    phrases: ["es gibt keine quelle", "die bildersuche findet nichts", "kein offizieller account", "nur ein privates konto", "nicht offizieller account"],
  }], feedback: {
    de: "Es gibt keine Quelle, die Bildersuche findet nichts, und der Account ist nicht offiziell. Deshalb „Suspekt“.",
    en: "There is no source, the reverse search finds nothing, and the account is not official. So “Suspicious”.",
  }},
  // (14) SUSPEKT — kein Link zu offizieller Bestätigung, Bild aus Gedankenexperiment
  post_117: { verdict: "suspekt", concepts: [{
    id: "kein-beleg-gedankenexperiment", name: "Kein offizieller Beleg + Gedankenexperiment-Kontext",
    terms: ["link", "offiziell", "bestätigung", "gedankenexperiment", "kontext", "bildsuche", "hypothetisch"],
    phrases: ["kein link zu einer offiziellen bestätigung", "das war ein gedankenexperiment", "das bild gehört zu einem gedankenexperiment", "keine offizielle bestätigung", "anderer kontext"],
  }], feedback: {
    de: "Es gibt keinen Link zu einer offiziellen Bestätigung, und die Bildersuche zeigt: Das Bild stammt aus einem Gedankenexperiment, nicht aus der Realität. Deshalb „Suspekt“.",
    en: "There is no link to an official confirmation, and the reverse search shows the image comes from a thought experiment, not reality. So “Suspicious”.",
  }},
  // (—) SUSPEKT — Handyregeln @pausenhof.news: echter Fakt, aber Bild aus anderem Kontext (beibehalten)
  post_118: { verdict: "suspekt", concepts: [{
    id: "echter-fakt-falscher-kontext", name: "Echter Fakt, aber Bild aus anderem Kontext",
    terms: ["kontext", "anderer", "altes", "bild", "regel", "regional", "bildsuche", "aufgebauscht"],
    phrases: ["das bild ist von woanders", "aus einem anderen kontext", "die regel stimmt aber das bild nicht", "das bild passt nicht", "banale regel groß gemacht"],
  }], feedback: {
    de: "Die Regel selbst ist echt, aber das Bild stammt aus einem anderen Kontext und die Sache wird größer gemacht, als sie ist. Deshalb „Suspekt“.",
    en: "The rule itself is real, but the image is from another context and the whole thing is blown up bigger than it is. So “Suspicious”.",
  }},
};

export default REASON_CONCEPTS;
