/**
 * Minimal STORE-method (uncompressed) zip writer for the widget-types batch
 * export (M11 wave 1B, spec §3.1 批量导出 zip).
 *
 * Why hand-rolled: the fork adds no new npm dependencies after wave 0 (M11
 * brief §2 纪律), and no zip library is a direct dependency — upstream uses
 * JSZip, which is out of reach here. Store-method zips are ~90 lines of
 * well-specified byte packing (local headers + central directory + EOCD,
 * APPNOTE.TXT §4.3), accepted by every mainstream unarchiver, and the
 * exported widget JSONs are repetitive text that stays small anyway.
 *
 * Determinism contract (pinned by zip.test): same input files → same bytes,
 * so the unit test can compare exact CRCs and headers instead of parsing.
 */

/** CRC-32 (IEEE 802.3), the zip-mandated polynomial 0xEDB88320. */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Fixed FAT timestamp: 1980-01-01 00:00 (DOS epoch minimum — 0 is invalid). */
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1; // day 1, month 1, year 0 (=1980)

const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;

/**
 * Packs the given {fileName → textContent} map into a zip Blob. Insertion
 * order is preserved (the central directory lists files in the same order
 * the map was written).
 */
export function zipTextFiles(files: Record<string, string>): Blob {
  const entries = Object.entries(files).map(([name, content]) => {
    const nameBytes = new TextEncoder().encode(name);
    const data = new TextEncoder().encode(content);
    return { nameBytes, data, crc: crc32(data) };
  });

  const localParts: BlobPart[] = [];
  const centralChunks: BlobPart[] = [];
  let offset = 0;

  for (const { nameBytes, data, crc } of entries) {
    const local = new ArrayBuffer(30 + nameBytes.length);
    const view = new DataView(local);
    view.setUint32(0, 0x04034b50, true); // local file header signature
    view.setUint16(4, 20, true); // version needed to extract
    view.setUint16(6, UTF8_FLAG, true); // general purpose flags
    view.setUint16(8, STORE_METHOD, true);
    view.setUint16(10, DOS_TIME, true);
    view.setUint16(12, DOS_DATE, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true); // compressed (= raw for store)
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true); // extra field length
    new Uint8Array(local, 30).set(nameBytes);

    localParts.push(local, data);

    const central = new ArrayBuffer(46 + nameBytes.length);
    const cView = new DataView(central);
    cView.setUint32(0, 0x02014b50, true); // central directory signature
    cView.setUint16(4, 20, true); // version made by
    cView.setUint16(6, 20, true); // version needed
    cView.setUint16(8, UTF8_FLAG, true);
    cView.setUint16(10, STORE_METHOD, true);
    cView.setUint16(12, DOS_TIME, true);
    cView.setUint16(14, DOS_DATE, true);
    cView.setUint32(16, crc, true);
    cView.setUint32(20, data.length, true);
    cView.setUint32(24, data.length, true);
    cView.setUint16(28, nameBytes.length, true);
    // 30 extra len / 32 comment len / 34 disk start / 36 internal attrs = 0
    cView.setUint32(38, 0, true); // external attrs
    cView.setUint32(42, offset, true); // local header offset
    new Uint8Array(central, 46).set(nameBytes);
    centralChunks.push(central);

    offset += local.byteLength + data.length;
  }

  const centralSize = centralChunks.reduce(
    (sum, chunk) => sum + (chunk as ArrayBuffer).byteLength,
    0,
  );
  const eocd = new ArrayBuffer(22);
  const eView = new DataView(eocd);
  eView.setUint32(0, 0x06054b50, true); // end of central directory
  // 4 disk number / 6 disk with cd = 0
  eView.setUint16(8, entries.length, true); // entries on this disk
  eView.setUint16(10, entries.length, true); // total entries
  eView.setUint32(12, centralSize, true);
  eView.setUint32(16, offset, true); // central directory offset
  // 20 comment length = 0

  return new Blob([...localParts, ...centralChunks, eocd], {
    type: 'application/zip',
  });
}
