'use strict';
// Teacup Koi: a koi rockets out of a porcelain cup as tea becomes a celestial tide.
// Every shape, color, and pixel is produced here; fixed geometry keeps the PNG reproducible.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const N = 1024;
const pixels = Buffer.alloc(N * N * 4);
const palette = {
  night: '#071629', deep: '#0b3148', teal: '#147887', aqua: '#62d4c1', pale: '#d9fff0',
  porcelain: '#fff3d3', gold: '#ffbd56', orange: '#fa7548', red: '#dd4550', ink: '#102b3c',
  foam: '#f9fff4', jade: '#268c82', shadow: '#b4cec0'
};
function color(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
function put(x, y, hex) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  const [r, g, b] = color(hex), p = (y * N + x) * 4;
  pixels[p] = r; pixels[p + 1] = g; pixels[p + 2] = b; pixels[p + 3] = 255;
}
function disk(cx, cy, radius, hex) {
  const r2 = radius * radius;
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(N - 1, Math.ceil(cy + radius)); y++)
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(N - 1, Math.ceil(cx + radius)); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) put(x, y, hex);
}
function oval(cx, cy, rx, ry, hex) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(N - 1, Math.ceil(cy + ry)); y++) {
    const q = 1 - ((y - cy) / ry) ** 2;
    if (q < 0) continue;
    const dx = rx * Math.sqrt(q);
    for (let x = Math.max(0, Math.floor(cx - dx)); x <= Math.min(N - 1, Math.ceil(cx + dx)); x++) put(x, y, hex);
  }
}
function poly(points, hex) {
  const ymin = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))));
  const ymax = Math.min(N - 1, Math.ceil(Math.max(...points.map(p => p[1]))));
  for (let y = ymin; y <= ymax; y++) {
    const cuts = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [x1, y1] = points[j], [x2, y2] = points[i];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) cuts.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
    }
    cuts.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cuts.length; k += 2)
      for (let x = Math.max(0, Math.ceil(cuts[k])); x <= Math.min(N - 1, Math.floor(cuts[k + 1])); x++) put(x, y, hex);
  }
}
function line(a, b, width, hex) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; disk(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, width / 2, hex);
  }
}
function bezier(a, b, c, d, width, hex) {
  let prev = a;
  for (let i = 1; i <= 96; i++) {
    const t = i / 96, u = 1 - t;
    const next = [u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0],
      u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1]];
    line(prev, next, width, hex); prev = next;
  }
}
function sparkle(x, y, r, hex) {
  poly([[x,y-r],[x+r*.17,y-r*.17],[x+r,y],[x+r*.17,y+r*.17],[x,y+r],[x-r*.17,y+r*.17],[x-r,y],[x-r*.17,y-r*.17]], hex);
}
// Layered midnight gradient with a restrained halo behind the leap.
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const glow = Math.max(0, 1 - Math.hypot((x - 520) / 720, (y - 365) / 680));
  const grain = ((x * 13 + y * 29) % 47 === 0) ? 1 : 0, p = (y * N + x) * 4;
  pixels[p] = 6 + Math.round(glow * 8) + grain;
  pixels[p + 1] = 19 + Math.round(glow * 36) + grain;
  pixels[p + 2] = 39 + Math.round(glow * 47) + grain; pixels[p + 3] = 255;
}
// A gold moon and a broad, directional spiral make the splash feel like a portal.
disk(792, 179, 123, palette.deep); disk(792, 179, 98, palette.gold); disk(792, 179, 84, '#145365');
oval(762, 151, 25, 10, palette.teal); oval(823, 207, 19, 8, palette.teal);
bezier([85,668],[123,354],[331,215],[532,302],38,'#0a536b');
bezier([82,654],[149,370],[329,258],[527,318],9,palette.aqua);
bezier([947,644],[878,393],[707,303],[552,363],31,'#0c5267');
bezier([940,668],[852,431],[696,355],[554,391],8,palette.pale);
bezier([185,824],[411,892],[674,805],[819,595],23,'#0c4c62');
bezier([217,812],[432,864],[657,786],[794,617],6,palette.aqua);
// A thin, broken halo gives the central leap a second scale cue.
bezier([373,307],[440,240],[576,230],[661,288],3,'#67a9a2');
bezier([675,304],[697,325],[710,342],[718,356],2,palette.gold);
// Tea shoots up from the cup in tapered arcs and bright, separated droplets.
for (let i = 0; i < 9; i++) {
  const x = 354 + i * 39, top = 372 + Math.abs(i - 4) * 17;
  bezier([x + 5, 690],[x - 46, 560],[x + 42, 486],[x, top],5 + (i % 3),i % 2 ? palette.teal : palette.jade);
}
const droplets = [[303,426,8],[347,361,5],[395,331,7],[451,287,5],[483,389,9],[527,351,5],[591,327,7],[637,383,6],[686,427,8],[733,465,5],[285,525,6],[789,508,8],[343,574,4],[682,555,5],[592,477,4],[423,451,5],[747,338,4],[253,474,5],[855,392,6],[623,605,4],[310,632,5],[490,529,7],[833,575,4],[205,579,4]];
for (let i = 0; i < droplets.length; i++) {
  const [x,y,r] = droplets[i], hue = i % 5 === 0 ? palette.red : i % 3 === 0 ? palette.pale : palette.gold;
  disk(x, y, r, hue); disk(x - r * .23, y - r * .3, Math.max(1, r * .22), palette.foam);
}
// The koi's tail and fins flare backward while its head breaks toward the moon.
poly([[422,487],[365,416],[318,375],[388,390],[466,438],[510,463]],palette.ink);
poly([[427,501],[372,559],[344,625],[408,588],[474,536],[514,510]],palette.ink);
poly([[430,477],[389,411],[395,347],[446,396],[489,447],[520,466]],palette.orange);
poly([[437,502],[392,548],[371,600],[428,563],[482,526],[520,509]],palette.red);
oval(558,449,151,68,palette.ink); oval(559,440,140,58,palette.porcelain);
oval(560,440,123,48,palette.gold); oval(548,446,83,34,palette.orange);
poly([[457,410],[488,384],[528,389],[551,408],[533,427],[492,432],[466,423]],palette.porcelain);
poly([[573,481],[621,477],[659,450],[687,431],[674,475],[644,500],[605,498]],palette.porcelain);
poly([[643,411],[682,365],[743,348],[807,369],[789,405],[742,432],[690,439]],palette.ink);
poly([[650,404],[688,372],[746,361],[781,378],[755,399],[710,416],[672,423]],palette.red);
poly([[681,407],[714,394],[757,384],[778,389],[757,412],[715,427],[689,424]],palette.porcelain);
bezier([675,402],[688,390],[699,389],[710,396],5,palette.red);
disk(741,382,10,palette.ink); disk(744,379,3,palette.foam); disk(779,390,3,palette.ink);
bezier([787,397],[798,404],[807,402],[812,394],3,palette.porcelain);
bezier([784,405],[798,416],[807,414],[813,408],2,palette.porcelain);
poly([[533,477],[560,511],[609,523],[589,493],[571,466]],palette.red);
for (let i = 0; i < 6; i++) line([545 + i * 7,472],[578 + i * 6,501],2,palette.gold);
for (let i = 0; i < 6; i++) bezier([500 + i * 19,424],[508 + i * 19,408],[517 + i * 19,411],[523 + i * 19,426],2,palette.orange);
// The cup anchors the motion: dark foot, luminous tea rim, ivory body, cobalt wave.
oval(508,779,297,70,palette.ink); oval(508,764,284,60,palette.gold); oval(508,750,263,47,palette.porcelain); oval(508,749,220,30,'#104b5b');
poly([[230,766],[786,766],[728,944],[669,990],[353,990],[291,948]],palette.ink);
poly([[250,774],[765,774],[714,929],[660,971],[365,971],[309,930]],palette.porcelain);
poly([[274,797],[741,797],[695,915],[648,950],[376,950],[328,915]],palette.shadow);
poly([[295,800],[720,800],[679,899],[633,931],[390,931],[344,899]],'#ffe8b8');
for (let i = 0; i < 3; i++) bezier([337 + i * 115,868],[385 + i * 115,820],[425 + i * 115,912],[469 + i * 115,866],10,'#126b79');
bezier([751,823],[862,780],[880,881],[787,905],27,palette.gold);
bezier([754,825],[837,799],[856,867],[788,885],14,palette.porcelain);
bezier([376,951],[466,984],[609,984],[677,949],5,palette.foam);
bezier([251,762],[383,724],[633,724],[765,762],5,palette.foam);
line([309,822],[326,874],3,palette.foam); line([704,822],[686,874],3,palette.foam);
// Small rays and crisp stars add scale without competing with the koi silhouette.
for (const [a,b,w] of [[[174,383],[242,351],5],[[834,405],[898,369],4],[[248,538],[322,508],3],[[771,518],[844,482],4],[[433,257],[474,217],3],[[165,706],[226,692],3]]) line(a,b,w,palette.aqua);
for (const [x,y,r,h] of [[220,265,14,palette.foam],[869,293,9,palette.foam],[191,493,7,palette.gold],[866,530,12,palette.foam],[709,581,8,palette.aqua],[285,684,9,palette.gold],[651,244,7,palette.foam],[910,225,6,palette.aqua]]) disk(x,y,r,h);
sparkle(260,195,19,palette.foam); sparkle(884,438,14,palette.gold); sparkle(697,551,11,palette.aqua); sparkle(351,329,9,palette.porcelain); sparkle(822,584,8,palette.foam);
// Build canonical PNG chunks with fixed compression and CRCs.
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const label = Buffer.from(type), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc32(Buffer.concat([label, data])));
  return Buffer.concat([length, label, data, checksum]);
}
const raw = Buffer.alloc((N * 4 + 1) * N);
for (let y = 0; y < N; y++) { const row = y * (N * 4 + 1); raw[row] = 0; pixels.copy(raw, row + 1, y * N * 4, (y + 1) * N * 4); }
const header = Buffer.alloc(13); header.writeUInt32BE(N, 0); header.writeUInt32BE(N, 4); header[8] = 8; header[9] = 6;
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
if (png.length > 1048576) throw new Error('Image exceeds the competition size limit');
const output = process.argv[2] || process.env.MAKEFUN_OUTPUT_DIR || '/output';
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'entry.png'), png);
