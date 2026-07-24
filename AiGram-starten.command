#!/bin/bash
# Startet die AiGram / Deepfake-Defender-App lokal im Browser.
# Doppelklick auf diese Datei genuegt (beim ersten Mal: Rechtsklick -> Oeffnen).

cd "$(dirname "$0")" || exit 1

PORT=8765
URL="http://localhost:$PORT"
DIR="dist"

# Falls noch nicht gebaut: bauen (braucht Node/npm)
if [ ! -d "$DIR" ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "App wird zum ersten Mal vorbereitet (npm install + build) ..."
    echo "Das kann beim ersten Mal ein paar Minuten dauern."
    npm install && npm run build || { echo "Build fehlgeschlagen."; echo "Zum Schliessen eine Taste druecken ..."; read -n 1 -s; exit 1; }
  else
    echo ""
    echo "Es wurde kein 'dist'-Ordner und kein npm (Node.js) auf diesem Mac gefunden."
    echo "Bitte die App einmal mit 'npm run build' bauen und erneut versuchen,"
    echo "oder Node.js von https://nodejs.org installieren."
    echo ""
    echo "Zum Schliessen eine Taste druecken ..."
    read -n 1 -s
    exit 1
  fi
fi

# Passenden Python-Befehl finden (macOS bringt meist python3 mit)
if command -v python3 >/dev/null 2>&1; then
  PY="python3"
elif command -v python >/dev/null 2>&1; then
  PY="python"
else
  echo ""
  echo "Es wurde kein Python auf diesem Mac gefunden."
  echo "Zum Schliessen eine Taste druecken ..."
  read -n 1 -s
  exit 1
fi

echo ""
echo "AiGram startet ..."
echo "Der Browser oeffnet sich gleich unter: $URL"
echo "Zum Beenden dieses Fenster schliessen oder Ctrl + C druecken."
echo ""

# Browser nach kurzer Wartezeit oeffnen (parallel zum Server)
( sleep 1; open "$URL" ) &

# Lokalen Server aus dem dist-Ordner starten
cd "$DIR" || { echo "Der 'dist'-Ordner fehlt."; read -n 1 -s; exit 1; }
exec "$PY" -m http.server "$PORT"
