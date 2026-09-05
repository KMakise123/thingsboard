/**
 * Store-method zip writer contract (M11 wave 1B): deterministic bytes,
 * valid signature chain (local headers → central directory → EOCD), raw
 * (store) payloads and preserved entry order — verified against the
 * APPNOTE.TXT field layout the writer packs.
 */

import nodeZlib from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { zipTextFiles } from './zip';

async function zipBytes(files: Record<string, string>): Promise<Uint8Array> {
  const blob = zipTextFiles(files);
  return new Uint8Array(await blob.arrayBuffer());
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

describe('zipTextFiles', () => {
  it('is deterministic: same files → identical bytes', async () => {
    const files = { 'a.json': '{"x":1}', 'b.json': 'text' };
    const first = await zipBytes(files);
    const second = await zipBytes(files);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });

  it('packs store-method local headers followed by raw content', async () => {
    const content = 'HELLO_WIDGET';
    const bytes = await zipBytes({ 'one.json': content });
    const data = view(bytes);

    expect(data.getUint32(0, true)).toBe(0x04034b50); // local header sig
    expect(data.getUint16(8, true)).toBe(0); // method = store
    // CRC-32 of "HELLO_WIDGET" via the header field must match the payload:
    // the raw content is stored verbatim right after the 30-byte header.
    const nameLen = data.getUint16(26, true);
    const payloadStart = 30 + nameLen;
    const text = new TextDecoder().decode(
      bytes.subarray(payloadStart, payloadStart + content.length),
    );
    expect(text).toBe(content);
  });

  it('ends with an EOCD carrying the entry count and preserves order', async () => {
    const files = {
      'z_first.json': '1',
      'a_second.json': '22',
      'm_third.json': '333',
    };
    const bytes = await zipBytes(files);
    const data = view(bytes);

    const eocdSig = 0x06054b50;
    let eocd = -1;
    for (let i = bytes.length - 22; i >= 0; i -= 1) {
      if (data.getUint32(i, true) === eocdSig) {
        eocd = i;
        break;
      }
    }
    expect(eocd).toBeGreaterThan(0);
    expect(data.getUint16(eocd + 8, true)).toBe(3); // entries this disk
    expect(data.getUint16(eocd + 10, true)).toBe(3); // total entries

    // central directory starts at the EOCD-recorded offset with its sig
    const cdOffset = data.getUint32(eocd + 16, true);
    expect(data.getUint32(cdOffset, true)).toBe(0x02014b50);
    const firstEntryNameLen = data.getUint16(cdOffset + 28, true);
    const firstName = new TextDecoder().decode(
      bytes.subarray(cdOffset + 46, cdOffset + 46 + firstEntryNameLen),
    );
    expect(firstName).toBe('z_first.json'); // insertion order preserved
  });

  it('round-trips a crc field equal to the stored payload crc', async () => {
    const payload = 'abcdef';
    const bytes = await zipBytes({ 'c.json': payload });
    const data = view(bytes);
    const crcInHeader = data.getUint32(14, true);
    // independent reference: node's zlib CRC-32 (IEEE)
    const reference = nodeZlib.crc32(Buffer.from(payload));
    expect(crcInHeader).toBe(reference >>> 0);
  });
});
