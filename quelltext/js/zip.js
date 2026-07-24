/* ===========================================================================
   ZIP lesen und schreiben — ohne externe Bibliothek.
   ---------------------------------------------------------------------------
   Nutzt die eingebaute Kompression des Browsers (CompressionStream).
   Unveraenderte Dateien werden beim Export unveraendert durchgereicht:
   ihre bereits komprimierten Bytes wandern direkt in die neue ZIP.
   Deshalb dauert der Export auch bei 47 MB Bildern nur einen Moment.
   =========================================================================== */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function deflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* --------------------------------------------------------------------------
   Lesen
   -------------------------------------------------------------------------- */

/**
 * Liest eine ZIP-Datei.
 * Ergebnis: Map<pfad, eintrag>, wobei ein Eintrag so aussieht:
 *   { name, method, crc, compressedSize, size, compressed }  // Rohbytes
 * Der Inhalt wird erst bei Bedarf entpackt (siehe readText / readBytes).
 */
export async function readZip(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  // Ende des zentralen Verzeichnisses suchen (rueckwaerts, Kommentar bis 64 KB)
  let eocd = -1;
  const min = Math.max(0, data.length - 66000);
  for (let i = data.length - 22; i >= min; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Das ist keine gueltige ZIP-Datei.');

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  const entries = new Map();
  const decoder = new TextDecoder();

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(data.subarray(offset + 46, offset + 46 + nameLen));

    // Lokalen Kopf lesen, um den echten Datenanfang zu finden
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;

    if (!name.endsWith('/')) {
      entries.set(name, {
        name, method, crc, compressedSize, size,
        compressed: data.subarray(dataStart, dataStart + compressedSize),
      });
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Entpackt einen Eintrag zu Bytes. */
export async function entryBytes(entry) {
  if (entry.bytes) return entry.bytes;
  if (entry.method === 0) return entry.compressed;
  if (entry.method === 8) return inflateRaw(entry.compressed);
  throw new Error(`Unbekannte Komprimierung (${entry.method}) bei ${entry.name}`);
}

/** Entpackt einen Eintrag zu Text. */
export async function entryText(entry) {
  return new TextDecoder().decode(await entryBytes(entry));
}

/* --------------------------------------------------------------------------
   Schreiben
   -------------------------------------------------------------------------- */

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

/**
 * Baut eine ZIP-Datei.
 * files: Array aus
 *   { name, bytes }                  -> wird neu komprimiert
 *   { name, passthrough: zipEintrag } -> wird unveraendert uebernommen
 */
export async function writeZip(files) {
  const encoder = new TextEncoder();
  const { time, day } = dosDateTime();
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    let method, crc, compressed, size;

    if (file.passthrough) {
      method = file.passthrough.method;
      crc = file.passthrough.crc;
      compressed = file.passthrough.compressed;
      size = file.passthrough.size;
    } else {
      const raw = file.bytes;
      crc = crc32(raw);
      size = raw.length;
      const packed = await deflateRaw(raw);
      // Nur komprimiert speichern, wenn es wirklich kleiner wird
      if (packed.length < raw.length) { method = 8; compressed = packed; }
      else { method = 0; compressed = raw; }
    }

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);          // UTF-8 Dateinamen
    lv.setUint16(8, method, true);
    lv.setUint16(10, time, true);
    lv.setUint16(12, day, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, compressed.length, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);

    chunks.push(local, compressed);

    const dir = new Uint8Array(46 + nameBytes.length);
    const dv = new DataView(dir.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint16(8, 0x0800, true);
    dv.setUint16(10, method, true);
    dv.setUint16(12, time, true);
    dv.setUint16(14, day, true);
    dv.setUint32(16, crc, true);
    dv.setUint32(20, compressed.length, true);
    dv.setUint32(24, size, true);
    dv.setUint16(28, nameBytes.length, true);
    dv.setUint32(42, offset, true);
    dir.set(nameBytes, 46);
    central.push(dir);

    offset += local.length + compressed.length;
  }

  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}
