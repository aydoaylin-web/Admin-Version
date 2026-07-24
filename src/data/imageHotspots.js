// Fehlerzonen in PROZENT (0–100). x,y = linke obere Ecke; w,h = Größe; hint = Treffertext.
// Die Werte sind aus den Bildern geschätzt – mit dem Koordinaten-Helfer feinjustieren.

const IMAGE_HOTSPOTS = {
  post_107: {
    errorCount: 1,
    hotspots: [
      { x: 68, y: 48, w: 22, h: 32, hint: "Die erhobene Hand des Polizisten wirkt fehlerhaft – KI erzeugt Hände oft falsch. Das Foto ist generiert." }
    ]
  },
  post_108: {
    errorCount: 1,
    hotspots: [
      { x: 38, y: 22, w: 26, h: 46, hint: "Das Gesicht ist 3D-animiert (Pixar-Look), kein echtes Kamerabild – „Mira\" ist eine Kunstfigur." }
    ]
  },
  post_109: {
    errorCount: 1,
    hotspots: [
      { x: 68, y: 12, w: 28, h: 40, hint: "Die Hände der Personen im Hintergrund sind verformt – ein typisches KI-Artefakt." }
    ]
  },
  post_110: {
    errorCount: 1,
    hotspots: [
      { x: 6, y: 38, w: 34, h: 40, hint: "Hand und Finger am Produkt wirken künstlich – KI-erzeugtes Werbebild mit gefälschter Empfehlung." }
    ]
  },
  post_116: {
    errorCount: 1,
    hotspots: [
      { x: 40, y: 52, w: 22, h: 18, hint: "Der Übergang von Menschen- zu Roboterhand ist generiert – das ganze Foto ist KI." }
    ]
  },
  post_117: {
    errorCount: 1,
    hotspots: [
      { x: 50, y: 12, w: 24, h: 58, hint: "Der „Roboter\" ist ein KI-Render, keine reale Klassenzimmer-Aufnahme." }
    ]
  },
};

export default IMAGE_HOTSPOTS;
