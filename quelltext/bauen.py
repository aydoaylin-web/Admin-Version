#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Baut aus den Modulen unter js/ eine einzige HTML-Datei.

Grund: Browser verbieten das Laden von JavaScript-Modulen, wenn eine Seite
per Doppelklick geoeffnet wird (file://). Eine einzelne Datei umgeht das —
das Studio laesst sich dadurch ohne Server und ohne Installation benutzen.

Jedes Modul behaelt seinen eigenen Namensraum, damit sich gleichnamige
Hilfsfunktionen nicht in die Quere kommen.
"""

import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))

# Reihenfolge = Abhaengigkeit: zuerst, was nichts braucht.
ORDER = ['zip', 'serialize', 'store', 'ui', 'lock', 'editors', 'hotspots', 'preview', 'changes', 'main']


def read(path):
    with io.open(os.path.join(HERE, path), encoding='utf-8') as f:
        return f.read()


def code_mask(source):
    """
    Markiert, welche Zeichen echter Code sind.

    Noetig, weil in serialize.js Beispielcode INNERHALB von Textbausteinen
    steht — unter anderem die Zeile "export const SLANG_ONLY = ...", die in
    die erzeugte Datei geschrieben wird. Ohne diese Trennung haelt das
    Bau-Skript den Beispieltext fuer echten Code und zerstoert beides:
    das Studio startet nicht mehr, und die erzeugte Datei verliert ihr
    "export". Genau das ist einmal passiert.
    """
    mask = [True] * len(source)
    i = 0
    n = len(source)
    state = None          # None | "'" | '"' | '`' | 'line' | 'block' | 'regex'
    template_depth = []   # offene ${ } innerhalb von Textbausteinen
    prev_code = ''        # letztes echtes Codezeichen (fuer die Schraegstrich-Frage)

    while i < n:
        c = source[i]
        nxt = source[i + 1] if i + 1 < n else ''

        if state is None:
            if c == '/' and nxt == '/':
                state = 'line';  mask[i] = mask[i + 1] = False; i += 2; continue
            if c == '/' and nxt == '*':
                state = 'block'; mask[i] = mask[i + 1] = False; i += 2; continue
            if c in ('"', "'", '`'):
                state = c; mask[i] = False; i += 1; continue
            if c == '/' and prev_code in ('', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '\n', 'n'):
                state = 'regex'; mask[i] = False; i += 1; continue
            if c == '}' and template_depth and template_depth[-1] == 0:
                template_depth.pop(); state = '`'; mask[i] = False; i += 1; continue
            if template_depth:
                if c == '{': template_depth[-1] += 1
                elif c == '}': template_depth[-1] -= 1
            if not c.isspace():
                prev_code = c
            i += 1
            continue

        mask[i] = False

        if state == 'line':
            if c == '\n': state = None; mask[i] = True
            i += 1; continue

        if state == 'block':
            if c == '*' and nxt == '/': mask[i + 1] = False; state = None; i += 2; continue
            i += 1; continue

        if state == 'regex':
            if c == '\\': mask[i + 1] = False; i += 2; continue
            if c == '/': state = None; prev_code = '/'
            i += 1; continue

        # in einer Zeichenkette
        if c == '\\':
            if i + 1 < n: mask[i + 1] = False
            i += 2; continue

        if state == '`' and c == '$' and nxt == '{':
            mask[i + 1] = False
            template_depth.append(0)
            state = None
            i += 2; continue

        if c == state:
            state = None
            prev_code = c
        i += 1

    return mask


def convert(name, source):
    """Ein ES-Modul in eine gekapselte Funktion umschreiben."""
    mask = code_mask(source)

    def is_code(position):
        """Steht an dieser Stelle echter Code — oder Text in Anfuehrungszeichen?

        Geprueft wird nur der Anfang des Fundes. Ein Import enthaelt hinten den
        Dateinamen in Anfuehrungszeichen; der ist Text, das Schluesselwort davor
        aber Code."""
        return position < len(mask) and mask[position]

    # import { a, b } from './x.js';  ->  const { a, b } = MODULE['x'];
    def replace_import(match):
        if not is_code(match.start()):
            return match.group(0)
        names = ' '.join(match.group(1).split())
        return "const { %s } = MODULE[%r];" % (names, match.group(2))

    source = re.sub(
        r"import\s*\{([^}]*)\}\s*from\s*['\"]\./([A-Za-z0-9_]+)\.js['\"]\s*;",
        replace_import, source)

    # Nach der Ersetzung stimmen die Positionen nicht mehr — neu bestimmen.
    mask = code_mask(source)

    exports = []
    for pattern in (
        r'^export\s+async\s+function\s+([A-Za-z0-9_$]+)',
        r'^export\s+function\s+([A-Za-z0-9_$]+)',
        r'^export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)',
    ):
        for match in re.finditer(pattern, source, re.M):
            if mask[match.start()]:
                exports.append(match.group(1))

    # "export " nur dort entfernen, wo es echter Code ist.
    out = []
    last = 0
    for match in re.finditer(r'^export\s+', source, re.M):
        if not mask[match.start()]:
            continue
        out.append(source[last:match.start()])
        last = match.end()
    out.append(source[last:])
    source = ''.join(out)

    exports = sorted(set(exports))
    body = source.rstrip()

    # Selbstpruefung: Jeder Name, den dieser Baustein herausgibt, muss darin
    # auch wirklich erklaert sein. Fehlt einer, bricht das Studio beim Laden
    # sofort ab — genau das ist einmal passiert, weil Beispieltext in einem
    # Textbaustein faelschlich fuer Code gehalten wurde.
    for name_ in exports:
        declared = re.search(
            r'\b(?:function|const|let|var|class)\s+' + re.escape(name_) + r'\b', body)
        if not declared:
            raise SystemExit(
                f'ABBRUCH in js/{name}.js: "{name_}" soll herausgegeben werden, '
                f'ist aber nirgends erklaert. Vermutlich steht das Wort nur in '
                f'einem Textbaustein. Nichts wurde geschrieben.')

    returns = 'return { ' + ', '.join(exports) + ' };' if exports else 'return {};'

    return (
        f"/* ---------- js/{name}.js ---------- */\n"
        f"MODULE[{name!r}] = (function () {{\n{body}\n\n{returns}\n}})();\n"
    )


def main():
    parts = []
    for name in ORDER:
        source = read(f'js/{name}.js')
        parts.append(convert(name, source))

    script = (
        "(function () {\n"
        "'use strict';\n"
        "var MODULE = {};\n\n"
        + '\n'.join(parts) +
        "\n})();\n"
    )

    css = read('studio.css')
    html = read('index.html')

    html = html.replace(
        '  <link rel="stylesheet" href="studio.css" />',
        '  <style>\n' + css + '\n  </style>',
    )
    html = html.replace(
        '  <script type="module" src="js/main.js"></script>',
        '  <script>\n' + script + '\n  </script>',
    )

    out = os.path.join(HERE, 'Admin-Studio.html')
    with io.open(out, 'w', encoding='utf-8') as f:
        f.write(html)

    size = os.path.getsize(out) / 1024
    print(f'Admin-Studio.html gebaut ({size:.0f} KB)')


if __name__ == '__main__':
    main()
