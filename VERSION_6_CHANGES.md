# Deepfake Defender – Version 6

## Umgesetzte Änderungen

1. Bildanalyse mit Zoom von 100–300 %, Doppelklick/Doppeltipp, Verschieben per Maus/Touch und Zurücksetzen.
2. Hotspots bleiben beim Zoomen und Verschieben korrekt positioniert.
3. Neutrales Feedback bei Klicks ohne hinterlegte Auffälligkeit.
4. Zweistufige Tipps und kurze Auswertung mit „Merke dir“.
5. Kompakte Webseiten-Prüfung mit Browserkopf, Verantwortlichkeit, Veröffentlichungsdatum und kurzer Seitenvorschau.
6. Eigene Einschätzung der Quellenverantwortlichkeit: Ja / Teilweise / Nein.
7. Gen-Alpha-gerechte Erklärung, warum die verantwortliche Person oder Organisation wichtig ist.
8. Profilprüfung übersichtlicher gegliedert; kein Impressumsfeld mehr.
9. Bewertungssystem: Echt / Suspekt – weitere Recherche notwendig / Manipuliert.
10. Kurze didaktische Abschlussregel nach Entscheidungen.
11. Feed-Verteilung: 7 Kinderposts, 9 Creator-/Influencerposts, 2 Eltern-/Newsposts.
12. Kinder-Captions und sichtbare Kommentare sprachlich authentischer und in der Anzahl variierend.
13. Inhaltsvalidator und Mechanikvalidator an die neue Kategorie „suspekt“ angepasst.
14. Produktionsbuild erfolgreich erstellt.

## Feed loading hotfix
- Service worker cache version renewed.
- JSON content is loaded network-first with `no-store`.
- Old Deepfake Defender caches and service workers are removed automatically during Vite development.
- Production service worker updates bypass the browser HTTP cache.
