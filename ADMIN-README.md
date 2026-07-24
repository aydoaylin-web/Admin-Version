# Deepfake Defender React mit Adminbereich

## Start

```bash
npm install
npm run dev
```

Die Schüler-App öffnet sich unter der von Vite angezeigten Adresse.

## Adminbereich

Hänge an die Adresse `#/admin` an, zum Beispiel:

```text
http://localhost:5173/#/admin
```

Beim ersten Öffnen legst du ein lokales Adminpasswort fest.

Der Adminbereich bearbeitet die echten Inhaltsbereiche der React-App:

- `content/settings.json`
- `content/posts.json`
- `content/tasks.json`
- `content/profiles.json`
- `content/stories.json`
- `content/guides.json`

Änderungen werden zunächst lokal im Browser gespeichert. Über „Geänderte Dateien herunterladen“ werden nur die tatsächlich veränderten JSON-Dateien heruntergeladen. Diese Dateien kannst du anschließend im GitHub-Repository ersetzen.

## Produktions-Build

```bash
npm run build
```

Die gebaute App befindet sich danach im Ordner `dist`.
