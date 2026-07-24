import JSZip from 'jszip';
import { erzeugeCodeDateien, geaenderteCodeDateien } from './codeEntwurf';

const FILES = ['settings', 'posts', 'tasks', 'profiles', 'stories', 'guides'];

function zeitstempel() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}`;
}

export async function baueZip(inhalte, codeEntwurf, originalInhalte = null) {
  const zip = new JSZip();
  const jsonDateien = {};

  FILES.forEach((name) => {
    if (!inhalte || inhalte[name] === undefined) return;
    const istGeaendert = !originalInhalte
      || JSON.stringify(inhalte[name]) !== JSON.stringify(originalInhalte[name]);
    if (istGeaendert) {
      jsonDateien[`content/${name}.json`] = `${JSON.stringify(inhalte[name], null, 2)}\n`;
    }
  });

  const alleCodeDateien = erzeugeCodeDateien(codeEntwurf);
  const geaenderteCodePfade = geaenderteCodeDateien(codeEntwurf);
  const codeDateien = Object.fromEntries(
    geaenderteCodePfade.map((pfad) => [pfad, alleCodeDateien[pfad]]),
  );

  const dateien = { ...jsonDateien, ...codeDateien };
  if (Object.keys(dateien).length === 0) {
    throw new Error('Es gibt derzeit keine Änderungen zum Exportieren.');
  }

  Object.entries(dateien).forEach(([pfad, text]) => zip.file(pfad, text));

  zip.file('LIESMICH.txt', `Deepfake Defender - Änderungspaket
Erzeugt am ${new Date().toLocaleString('de-DE')}

Nur diese geänderten Dateien auf GitHub ersetzen oder neu hochladen:
${Object.keys(dateien).map((p) => `  ${p}`).join('\n')}

Es müssen keine anderen Projektdateien neu hochgeladen werden.
`);

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function ladeZipHerunter(inhalte, codeEntwurf, originalInhalte = null) {
  try {
    const blob = await baueZip(inhalte, codeEntwurf, originalInhalte);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepfake-defender-aenderungen_${zeitstempel()}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (fehler) {
    window.alert(fehler?.message || 'Das ZIP konnte nicht erstellt werden.');
  }
}
