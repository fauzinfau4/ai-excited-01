import { deflateSync, inflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const W = 1024, H = 1024;
type Color = [number, number, number, number];
const pixels = new Uint8Array(W * H * 4);

function seeded(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let z = x;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
const random = seeded(0x4b4f4937);
const clamp = (v: number, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, Math.round(v)));

function blend(x: number, y: number, color: Color) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4, a = color[3] / 255, q = 1 - a;
  pixels[i] = clamp(color[0] * a + pixels[i] * q);
  pixels[i + 1] = clamp(color[1] * a + pixels[i + 1] * q);
  pixels[i + 2] = clamp(color[2] * a + pixels[i + 2] * q);
  pixels[i + 3] = 255;
}
function box(x0: number, y0: number, x1: number, y1: number, color: Color) {
  const ax = Math.max(0, Math.floor(x0)), bx = Math.min(W - 1, Math.ceil(x1));
  const ay = Math.max(0, Math.floor(y0)), by = Math.min(H - 1, Math.ceil(y1));
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) blend(x, y, color);
}
function disk(cx: number, cy: number, radius: number, color: Color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++)
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) blend(x, y, color);
}
function ellipse(cx: number, cy: number, rx: number, ry: number, color: Color) {
  const r2 = Math.max(rx, ry), ax = Math.floor(cx - rx), bx = Math.ceil(cx + rx);
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = ax; x <= bx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) blend(x, y, color);
}
function line(x0: number, y0: number, x1: number, y1: number, width: number, color: Color) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.4);
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    disk(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, color);
  }
}
function polygon(points: number[][], color: Color) {
  const ys = points.map(p => p[1]), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const hits: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, yy1] = points[i], [x2, yy2] = points[(i + 1) % points.length];
      if ((yy1 <= y && yy2 > y) || (yy2 <= y && yy1 > y)) hits.push(x1 + (y - yy1) * (x2 - x1) / (yy2 - yy1));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) box(hits[i], y, hits[i + 1], y, color);
  }
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u32(n: number) { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; }
function chunk(type: string, data: Uint8Array) {
  const t = Buffer.from(type), body = Buffer.concat([t, Buffer.from(data)]);
  return Buffer.concat([u32(data.length), body, u32(crc32(body))]);
}
function encodePng() {
  const raw = Buffer.alloc(H * (W * 4 + 1));
  for (let y = 0; y < H; y++) raw.set(pixels.subarray(y * W * 4, (y + 1) * W * 4), y * (W * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function validatePng(bytes: Buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!bytes.subarray(0, 8).equals(signature)) throw new Error('bad PNG signature');
  let offset = 8, width = 0, height = 0, ended = false;
  const compressed: Buffer[] = [];
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset), end = offset + 12 + size;
    if (end > bytes.length) throw new Error('truncated PNG chunk');
    const type = bytes.toString('ascii', offset + 4, offset + 8), data = bytes.subarray(offset + 8, offset + 8 + size);
    const checked = bytes.subarray(offset + 4, offset + 8 + size);
    if (crc32(checked) !== bytes.readUInt32BE(offset + 8 + size)) throw new Error(`bad ${type} CRC`);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); }
    if (type === 'IDAT') compressed.push(data);
    if (type === 'IEND') { ended = true; offset = end; break; }
    offset = end;
  }
  if (!ended || offset !== bytes.length) throw new Error('missing IEND or trailing PNG data');
  if (width !== W || height !== H || width > 1024 || height > 1024) throw new Error(`unexpected dimensions ${width}x${height}`);
  const decoded = inflateSync(Buffer.concat(compressed));
  if (decoded.length !== H * (W * 4 + 1)) throw new Error('unexpected decoded pixel data length');
  if (bytes.length > 1048576) throw new Error(`PNG is over 1 MiB: ${bytes.length}`);
}

// Scene: a koi leaps from a porcelain cup into a spiralling, star-bright tea sky.
const C = {
  ink: [15, 24, 48, 255] as Color, night: [7, 15, 39, 255] as Color,
  deep: [10, 34, 66, 255] as Color, teal: [21, 125, 143, 255] as Color,
  aqua: [90, 226, 210, 255] as Color, cream: [255, 239, 205, 255] as Color,
  porcelain: [249, 244, 226, 255] as Color, coral: [238, 89, 70, 255] as Color,
  orange: [255, 155, 73, 255] as Color, gold: [255, 211, 102, 255] as Color,
  white: [255, 255, 247, 255] as Color, shadow: [4, 12, 30, 255] as Color,
};
box(0, 0, W - 1, H - 1, C.night);
// Quiet framing bands give the central splash a strong silhouette at thumbnail scale.
ellipse(510, 456, 438, 438, [12, 38, 67, 255]);
ellipse(510, 456, 410, 410, [18, 56, 79, 255]);
ellipse(510, 456, 385, 385, [12, 35, 65, 255]);
ellipse(510, 456, 358, 358, [20, 68, 87, 255]);
// Radiating tea-current ribbons, swept toward the leap.
for (let i = 0; i < 9; i++) {
  const a = -2.65 + i * 0.39;
  const x1 = 510 + Math.cos(a) * 402, y1 = 452 + Math.sin(a) * 402;
  const x2 = 526 + Math.cos(a + 0.55) * (258 + (i % 3) * 17), y2 = 438 + Math.sin(a + 0.55) * (258 + (i % 3) * 17);
  line(x1, y1, x2, y2, 4 + (i % 3), i % 2 ? [70, 184, 175, 145] : [255, 190, 89, 160]);
}
// A thin, luminous halo behind the cup.
for (let i = 0; i < 72; i++) {
  const a = i * Math.PI * 2 / 72;
  const r = i % 3 === 0 ? 343 : 331;
  disk(510 + Math.cos(a) * r, 463 + Math.sin(a) * r, i % 3 === 0 ? 3 : 1.5, i % 3 === 0 ? C.gold : C.aqua);
}
// Floating tea pearls and four-point glints.
function sparkle(x: number, y: number, size: number, color: Color) {
  polygon([[x, y - size], [x + size * .24, y - size * .24], [x + size, y], [x + size * .24, y + size * .24], [x, y + size], [x - size * .24, y + size * .24], [x - size, y], [x - size * .24, y - size * .24]], color);
}
for (let i = 0; i < 55; i++) {
  const a = random() * Math.PI * 2, r = 210 + random() * 285;
  const x = 510 + Math.cos(a) * r, y = 450 + Math.sin(a) * r;
  if (i % 4 === 0) sparkle(x, y, 5 + random() * 7, i % 8 ? C.gold : C.white);
  else disk(x, y, 1.5 + random() * 3.2, i % 3 ? C.aqua : C.orange);
}
// Cup shadow, curved saucer, handle, and the body of the cup.
ellipse(513, 817, 302, 54, [3, 10, 26, 255]);
ellipse(514, 795, 300, 52, C.gold);
ellipse(514, 783, 280, 43, C.porcelain);
ellipse(514, 776, 239, 26, [228, 220, 197, 255]);
// Handle appears behind the cup; the hollow is cut by overpainting the background tone.
ellipse(781, 675, 107, 147, C.gold);
ellipse(781, 675, 78, 115, [15, 44, 70, 255]);
ellipse(779, 670, 63, 97, [12, 37, 65, 255]);
polygon([[266, 485], [765, 485], [704, 775], [661, 822], [368, 822], [326, 778]], C.porcelain);
polygon([[266, 485], [297, 494], [352, 752], [382, 797], [672, 797], [704, 775], [661, 822], [368, 822], [326, 778]], [212, 219, 210, 255]);
// Porcelain highlights and a fine cobalt rim.
line(286, 507, 747, 507, 12, C.teal);
line(299, 516, 733, 516, 3, C.aqua);
line(357, 744, 387, 788, 5, C.white);
line(680, 769, 659, 789, 4, C.white);
// Tea surface is an ellipse nestled inside the lip.
ellipse(514, 494, 223, 37, [8, 75, 90, 255]);
ellipse(514, 489, 199, 25, [24, 128, 130, 255]);
for (let i = 0; i < 30; i++) {
  const x = 335 + random() * 358, y = 476 + random() * 27;
  disk(x, y, 1 + random() * 2.4, i % 4 ? C.gold : C.white);
}
// The koi's sweeping body is a sequence of overlapping, tapered fish forms.
// Its tail fans upward left; its head breaks into the upper right in a burst of foam.
polygon([[351, 452], [287, 414], [251, 345], [280, 357], [308, 322], [323, 378], [391, 397]], C.coral);
polygon([[345, 447], [292, 410], [267, 364], [303, 389], [319, 359], [329, 411], [388, 422]], C.orange);
// Main arcing torso, broad through the center and narrow at the tail.
polygon([[315, 427], [367, 383], [446, 355], [527, 345], [592, 361], [655, 399], [705, 441], [725, 474], [691, 496], [637, 505], [575, 495], [505, 473], [434, 455], [374, 450]], C.white);
polygon([[329, 421], [381, 394], [447, 370], [520, 361], [577, 374], [631, 405], [674, 442], [690, 462], [653, 478], [601, 474], [542, 455], [480, 436], [420, 426], [369, 440]], [249, 231, 205, 255]);
// Koi vermilion islands, shaped as deliberate patches across the back.
polygon([[394, 392], [433, 367], [469, 364], [493, 379], [485, 403], [454, 414], [421, 414], [392, 426], [371, 414]], C.coral);
polygon([[514, 364], [551, 364], [587, 382], [601, 402], [581, 420], [547, 412], [524, 395]], C.orange);
polygon([[624, 407], [655, 426], [682, 451], [673, 469], [640, 462], [615, 444]], C.coral);
polygon([[328, 422], [353, 405], [378, 411], [389, 434], [368, 450], [340, 445]], C.orange);
// Side fins, outlined in warm gold.
polygon([[451, 437], [420, 486], [450, 477], [489, 448]], C.gold);
polygon([[459, 441], [432, 477], [456, 469], [482, 447]], [255, 248, 220, 255]);
polygon([[593, 448], [613, 496], [627, 478], [618, 438]], C.gold);
polygon([[600, 449], [616, 482], [620, 459]], [255, 248, 220, 255]);
// Fin rays.
for (let i = 0; i < 6; i++) line(438 + i * 5, 471 - i * 2, 451 + i * 6, 444 + i * 2, 2, [204, 117, 69, 255]);
// Head, cheek, gill and alert eye.
ellipse(697, 450, 58, 47, C.white);
polygon([[663, 421], [692, 400], [717, 405], [739, 426], [730, 447], [708, 452], [685, 438]], C.coral);
ellipse(714, 464, 24, 17, [255, 216, 185, 255]);
line(674, 437, 664, 464, 4, [166, 90, 78, 255]);
disk(712, 433, 10, C.ink); disk(715, 430, 3, C.white);
// Open, delighted fish mouth and whisker-like barbels.
ellipse(749, 470, 11, 7, C.ink);
line(742, 475, 769, 493, 3, C.cream);
line(739, 458, 770, 451, 2, C.cream);
// Scales: arcing rows of tiny mother-of-pearl crescents.
for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) {
  const x = 424 + col * 25 + (row % 2) * 12, y = 420 + row * 12 - Math.abs(col - 4) * 1.7;
  if (x < 650 && random() > .18) {
    line(x - 5, y, x, y + 5, 1.5, [255, 255, 239, 220]);
    line(x, y + 5, x + 6, y, 1.5, [114, 184, 175, 210]);
  }
}
// Splash crown arcs around the koi, using beads and swept brush strokes.
const splash = [[315, 481], [286, 451], [277, 422], [260, 432], [251, 401], [234, 390], [242, 427], [225, 418], [239, 457], [270, 473]];
for (let i = 0; i + 1 < splash.length; i++) line(splash[i][0], splash[i][1], splash[i + 1][0], splash[i + 1][1], 9, i % 2 ? C.aqua : C.white);
for (let i = 0; i < 25; i++) {
  const x = 232 + random() * 555, y = 338 + random() * 169;
  const dx = (x - 490) * .07, dy = (y - 420) * .05;
  if (random() > .48) disk(x + dx, y + dy, 2 + random() * 5, i % 3 ? C.aqua : C.white);
}
// A sweeping crescent and suspended droplets carry the leap without crossing the fish.
line(289, 514, 249, 481, 5, C.aqua);
line(249, 481, 220, 441, 4, C.white);
line(220, 441, 211, 410, 3, C.gold);
line(722, 510, 775, 490, 5, C.aqua);
line(775, 490, 812, 456, 4, C.white);
line(812, 456, 827, 424, 3, C.gold);
for (let i = 0; i < 18; i++) {
  const side = i % 2 ? 1 : -1;
  const x = side < 0 ? 216 + random() * 55 : 777 + random() * 62;
  const y = 394 + random() * 126;
  disk(x, y, 2.5 + random() * 5, i % 3 ? C.aqua : C.white);
  if (i % 4 === 0) sparkle(x + side * 6, y - 8, 4 + random() * 3, C.gold);
}
// Tiny cup medallion: the single punctuation mark at the base.
disk(514, 686, 31, C.teal); disk(514, 686, 25, C.porcelain);
sparkle(514, 686, 18, C.coral);
const target = resolve(process.env.MAKEFUN_OUTPUT_DIR || '.', 'entry.png');
mkdirSync(dirname(target), { recursive: true });
const png = encodePng();
validatePng(png);
writeFileSync(target, png);
if (process.argv.includes('--check')) {
  const saved = readFileSync(target);
  validatePng(saved);
  console.log(`PNG OK ${W}x${H} ${saved.length} bytes sha256=${createHash('sha256').update(saved).digest('hex')}`);
}
