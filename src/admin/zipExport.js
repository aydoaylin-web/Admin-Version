import JSZip from 'jszip';
import { erzeugeCodeDateien, geaenderteCodeDateien } from './codeEntwurf';

/* ============================================================
   ZIP-EXPORT

   Packt alles, was der Adminbereich erzeugen kann, in der
   richtigen Ordnerstruktur:
     content/*.json          die Inhalte
     src/data/*.js           Uebersetzungen, Regeln, Zonen, Algorithmus
     src/App.jsx             falls im Rohtext bearbeitet

   Bilder und Tonspuren sind NICHT dabei. Sie liegen als
   47 MB im Repository, der Adminbereich aendert sie nie, und
   sie durch den Browser zu schleifen wuerde nur Speicher
   kosten. Du entpackst das Paket also ueber dein Repository -
   die unveraenderten Dateien bleiben einfach liegen.
   ============================================================ */

const FILES = ['settings', 'posts', 'tasks', 'profiles', 'stories', 'guides'];

function zeitstempel() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}`;
}

export async function baueZip(inhalte, codeEntwurf) {
  const zip = new JSZip();

  const jsonDateien = {};
  FILES.forEach((name) => {
    if (!inhalte || inhalte[name] === undefined) return;
    jsonDateien[`content/${name}.json`] = `${JSON.stringify(inhalte[name], null, 2)}\n`;
  });

  const codeDateien = erzeugeCodeDateien(codeEntwurf);
  const geaendert = geaenderteCodeDateien(codeEntwurf);

  Object.entries({ ...jsonDateien, ...codeDateien }).forEach(([pfad, text]) => {
    zip.file(pfad, text);
  });

  const liesmich = `AiGram / Deepfake Defender - Aenderungspaket
Erzeugt am ${new Date().toLocaleString('de-DE')}

SO SPIELST DU ES EIN
1. Dieses Archiv entpacken.
2. Die Ordner "content" und "src" ueber die gleichnamigen Ordner
   in deinem Repository kopieren, vorhandene Dateien ersetzen.
3. Aenderungen committen und pushen.
4. Warten, bis der Actions-Lauf gruen ist, dann die Seite neu
   laden (bei Firefox und Chrome mit gedrueckter Umschalttaste).

WAS DRIN IST
${Object.keys(jsonDateien).map((p) => `  ${p}`).join('\n') || '  (keine Inhalte)'}
${Object.keys(codeDateien).map((p) => `  ${p}`).join('\n')}

GEAENDERTE CODE-DATEIEN
${geaendert.length ? geaendert.map((p) => `  ${p}`).join('\n') : '  keine'}

WAS NICHT DRIN IST
  assets/   Bilder und Tonspuren
  icons/    App-Symbole
  Diese Dateien aendert der Adminbereich nie. Sie bleiben in
  deinem Repository unveraendert liegen.
`;
  zip.file('LIESMICH.txt', liesmich);

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function ladeZipHerunter(inhalte, codeEntwurf) {
  const blob = await baueZip(inhalte, codeEntwurf);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aigram-aenderungen_${zeitstempel()}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
