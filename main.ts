// ai-excited-01 entry — Node 22, standard library only.
//
// The artwork lives in this repository as entry.png: a colossal golden koi
// bursting out of a tiny teacup, frozen mid-leap on a strong diagonal,
// trailing a crown of sparkling water and golden embers against a deep
// indigo sky. All this program does is place that image where the grader
// expects it: it reads the PNG sitting next to this file, checks it against
// the competition gate (a whole PNG, at most 1 MiB, at most 1024 by 1024
// pixels), and writes an identical copy to $MAKEFUN_OUTPUT_DIR/entry.png
// (or /output/entry.png when the variable is unset). The copy is
// byte-for-byte the same file, so running the program twice always
// produces the same output.
//
// Local check:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//   # then confirm out/entry.png is a valid PNG, at most 1024x1024 px
//   # and at most 1 MiB.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'entry.png');
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const target = join(outDir, 'entry.png');

// Competition gate limits, from the kit's RULES.txt.
const MAX_BYTES = 1_048_576;
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;

// A PNG always starts with these eight bytes.
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fail(message: string): never {
  throw new Error(`entry.png failed validation: ${message}`);
}

// Check the file is a real PNG inside the gate limits, and read the
// dimensions out of its IHDR chunk (width at bytes 16-19, height at 20-23).
// Anything wrong fails loudly instead of silently shipping a bad entry.
function validatePng(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 33) {
    fail(`file is only ${bytes.length} bytes, too short to be a PNG`);
  }
  if (!bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    fail('missing PNG magic bytes (not a PNG file)');
  }
  if (bytes.length > MAX_BYTES) {
    fail(`file is ${bytes.length} bytes, over the ${MAX_BYTES}-byte limit`);
  }
  const chunkLength = bytes.readUInt32BE(8);
  const chunkType = bytes.toString('latin1', 12, 16);
  if (chunkType !== 'IHDR' || chunkLength !== 13) {
    fail(`first chunk is ${chunkType} (${chunkLength} bytes), expected IHDR of 13 bytes`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width === 0 || height === 0) {
    fail(`zero dimension: ${width}x${height}`);
  }
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    fail(`dimensions ${width}x${height} exceed the ${MAX_WIDTH}x${MAX_HEIGHT} limit`);
  }
  // The gate needs a whole image: walk every chunk, check each checksum,
  // and make sure the file ends exactly on its IEND chunk.
  checkChunksWhole(bytes);
  return { width, height };
}

// Walk the chunk stream after the 8-byte signature: each chunk is a
// 4-byte length, a 4-byte type, its data, and a 4-byte CRC32 over the
// type plus data. The last chunk must be IEND and nothing may follow it.
function checkChunksWhole(bytes: Buffer): void {
  let offset = 8;
  let seenIend = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) {
      fail(`truncated chunk header at byte ${offset}`);
    }
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) {
      fail(`truncated ${type} chunk: claims ${length} bytes past end of file`);
    }
    const storedCrc = bytes.readUInt32BE(dataEnd);
    if (crc32(bytes.subarray(offset + 4, dataEnd)) !== storedCrc) {
      fail(`${type} chunk has a bad CRC (file is corrupted)`);
    }
    offset = dataEnd + 4;
    if (type === 'IEND') {
      seenIend = true;
      break;
    }
  }
  if (!seenIend) {
    fail('no IEND chunk: file ends before the image does');
  }
  if (offset !== bytes.length) {
    fail(`${bytes.length - offset} trailing bytes after the IEND chunk`);
  }
}

// CRC32 (IEEE, polynomial 0xedb88320) over a buffer, as PNG chunks use.
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

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const bytes = readFileSync(source);
const { width, height } = validatePng(bytes);

mkdirSync(outDir, { recursive: true });
writeFileSync(target, bytes);

// Confirm what landed is exactly what was validated: read the copy
// back and compare it byte for byte with the source before reporting.
const written = readFileSync(target);
if (!written.equals(bytes)) {
  fail(`output ${target} does not match the source after writing`);
}
console.log(`wrote ${target}: PNG ${width}x${height}, ${bytes.length} bytes`);
