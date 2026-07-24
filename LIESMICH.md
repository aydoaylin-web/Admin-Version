# Admin Studio — Deepfake Defender

Die App bearbeiten, ohne Code zu schreiben. Alles läuft im Browser auf deinem
Rechner; es wird nichts hochgeladen und nichts an deinem Original verändert.

## Loslegen

1. `Admin-Studio.html` doppelklicken.
2. Die ZIP deines Projekts hineinziehen — dieselbe Datei, die du von GitHub
   herunterlädst (`deepfake-main.zip`).
3. Bearbeiten.
4. Oben rechts **ZIP herunterladen** — oder unter **Änderungen** einzelne
   Dateien kopieren.

Kein Installieren, kein Server, keine Internetverbindung nötig.

## Die Änderungsspur

Oben unter der Kopfzeile stehen die sechs Dateien, die das Studio schreiben
kann. Sie sind grau, solange nichts geändert ist. Sobald du etwas bearbeitest,
leuchtet die betroffene Datei rosa auf und zeigt, wie viele Zeilen dazugekommen
oder weggefallen sind.

Ein Klick darauf führt direkt zur Ansicht **Änderungen**, wo du Zeile für Zeile
siehst, was sich geändert hat.

## Die beiden Wege nach GitHub

**Ganze ZIP.** Herunterladen, entpacken, den Projektordner ersetzen, pushen.
Am sichersten, wenn du mehrere Dateien geändert hast.

**Einzelne Dateien kopieren.** Unter **Änderungen** hat jede Datei den Knopf
*Inhalt kopieren*. Auf GitHub die entsprechende Datei öffnen, Stift-Symbol,
alles markieren, einfügen, committen.

Bei Weg zwei unbedingt den ganzen Inhalt ersetzen, nicht anhängen — sonst steht
die Datei doppelt in der Datei und der Build bricht ab.

Nach dem Hochladen: **Als hochgeladen markieren**. Dann gilt der aktuelle Stand
als neuer Ausgangspunkt und die Spur ist wieder leer.

## Was du bearbeiten kannst

| Ansicht | Schreibt in |
|---|---|
| Beiträge | `content/posts.json` |
| Aufgaben | `content/tasks.json` (+ `reasonConcepts.js`) |
| Begründungen | `src/data/reasonConcepts.js` |
| Bildzonen | `src/data/imageHotspots.js` |
| Profile | `content/profiles.json` |
| Einstellungen | `content/settings.json` |

### Beiträge

Absender, Bild, Bildunterschrift, Kommentare — und die beiden Prüfwerkzeuge
Quellenprüfung und Bildherkunft. Jeder Text hat ein deutsches und ein
englisches Feld nebeneinander. Lässt du Englisch leer (gelb hinterlegt), zeigt
die App dort Deutsch. Du kannst also erst deutsch schreiben und übersetzen,
wann du willst.

### Aufgaben

Hier steht das richtige Urteil. Es kommt in der App an zwei Stellen vor —
in `tasks.json` und in `reasonConcepts.js`. Das Studio hält beide zusammen:
stellst du das Urteil um, wird es in beiden Dateien geändert. Genau hier
entstehen sonst die Fehler, die schwer zu finden sind.

Oben siehst du die Verteilung der Urteile über alle Fälle. Wenn eine Sorte
stark überwiegt, wird das Spiel erratbar.

### Begründungen

Womit ein Kind den zweiten Punkt bekommt. Der Abgleich läuft offline: Begriffe
werden auf den Wortstamm gekürzt und Tippfehler verziehen — „offiziell" fängt
also auch „offizielle" und „offiziel".

Ein Fall darf mehrere Begründungen haben. Jede davon gibt den Punkt. Sinnvoll,
wenn ein Fall auf zwei Wegen lösbar ist.

Die Liste **Wörter, die nie allein zählen** enthält reinen Slang. Wer nur
„sus" schreibt, bekommt keinen Punkt — auch wenn das Urteil stimmt.

### Bildzonen

Zieh mit der Maus ein Rechteck über die Stelle, die das Kind finden soll.
Jede Zone braucht einen Text, der erklärt, warum genau diese Stelle verräterisch
ist. Die Zahlen darunter kannst du nachträglich feinjustieren.

### Testansicht

Der Fall so, wie ihn ein Kind sieht. Du kannst eine Begründung eintippen und auf
**Antwort prüfen** drücken — bewertet wird mit derselben Rechnung wie im Spiel.
Wenn eine sinnvolle Antwort keinen Punkt bekommt, nimm sie unter
**Begründungen** auf.

Das ist der ehrlichste Test: Schreib auf, was deine Schülerinnen und Schüler
wahrscheinlich tippen würden, und schau, ob es zählt.

## Nützliches

- **Rückgängig** und **Wiederholen** — auch mit Strg+Z beziehungsweise Cmd+Z.
- **Stand sichern** legt den Arbeitsstand im Browser ab (Strg+S). Beim nächsten
  Öffnen wirst du gefragt, ob du ihn übernehmen willst. Nützlich, wenn du
  zwischendurch aufhören musst.
- **Codeansicht** zeigt den erzeugten Inhalt jeder Datei im Rohtext.

## Wenn etwas nicht geht

**Die ZIP wird nicht angenommen.** Es muss die ZIP des Projekts sein, mit
`content/posts.json` darin. Eine ZIP, die nur einzelne Dateien enthält, reicht
nicht.

**Bilder fehlen in der Testansicht.** Dann liegt die Bilddatei nicht in der ZIP
oder der Pfad in `media` stimmt nicht.

**Neue Bilder hinzufügen.** Das geht im Studio nicht. Leg die Datei in
`assets/posts/` ab, pushe sie zu GitHub, lade die ZIP neu — dann steht das Bild
in der Auswahlliste.

**Änderungen sind weg.** Das Studio hält nichts dauerhaft fest, außer du
drückst *Stand sichern*. Beim Schließen des Fensters warnt der Browser, wenn es
ungespeicherte Änderungen gibt.

## Für später

Unter `quelltext/` liegen die einzelnen Bausteine. Wenn du dort etwas änderst,
baust du die Einzeldatei mit

    python3 bauen.py

neu zusammen. Die Aufteilung steht am Anfang jeder Datei beschrieben.

Willst du eine weitere Datei bearbeitbar machen, sind drei Stellen nötig:
`EDITABLE_FILES` und `collect()` in `store.js`, dazu ein Editor in `editors.js`.
