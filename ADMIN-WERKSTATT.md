# Adminbereich — was wo steckt

Zugang: Knopf „🔒 Admin" unten links, oder 2 Sekunden auf die linke
obere Ecke, oder Strg+Alt+A, oder die Adresse `.../#/admin`.
Der Knopf lässt sich in `src/main.jsx` über `ADMIN_KNOPF_SICHTBAR`
ausschalten, wenn die Klasse mitspielt.

## Die Reiter

**Bearbeiten** — Inhalte aus `content/*.json`: Beiträge, Aufgaben,
Profile, Stories, Hilfen, Einstellungen.

**Live-Vorschau** — die echte Schüleransicht mit deinem Entwurf.
Alles aus den JSON-Dateien wirkt hier sofort.

**Code** — die JSON-Dateien als Quelltext zum Kopieren.

**Nachziehen** — prüft, ob eine Änderung zusätzlich eine JS-Datei
braucht, und liefert den fertigen Schnipsel. Die Zahl am Reiter
zählt nur die Pflichtpunkte.

**Code-Werkstatt** — die Spiellogik:
- *Übersetzungen*: alle Oberflächentexte, Deutsch und Englisch
  nebeneinander. Leere Felder sind rosa hinterlegt.
- *Bewertungsregeln*: Urteil, Stichwörter, Phrasen und Rückmeldung
  je Beitrag, dazu die Slang-Liste.
- *Fehlerzonen*: die Bildzonen in Prozent.
- *Algorithmus*: die vier Stellschrauben des Begründungsabgleichs.
- *Rohtext*: jede Datei als reiner Text, auch `App.jsx`.

Unter jedem Bereich steht der erzeugte Quelltext mit Kopierknopf.

**Gesamtes Paket als ZIP** — packt `content/*.json` und alle
erzeugten JS-Dateien in der richtigen Ordnerstruktur, mit einer
LIESMICH-Datei. Bilder und Töne sind nicht dabei, die ändert der
Adminbereich nie.

## Was live prüfbar ist und was nicht

| Änderung | in der Vorschau sichtbar |
|---|---|
| Inhalte, Texte, Punkte, Zeitlimits | ja, sofort |
| Übersetzungen, Bewertungsregeln, Fehlerzonen | erst nach Hochladen |
| Algorithmus, `App.jsx` | erst nach Hochladen |

Der Grund: Der Browser führt aus, was beim Bauen entstanden ist.
Neuen Quelltext kann er dir anzeigen, aber nicht selbst ausführen.
Ablauf also: ändern, ZIP laden, ins Repository, pushen, warten bis
der Actions-Lauf grün ist, Seite mit gedrückter Umschalttaste neu
laden.
