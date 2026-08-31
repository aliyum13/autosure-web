/*
 * Renders the CheckAm brand mark — a green disc with a white magnifying glass — at
 * every size the app needs, plus favicon.ico.
 *
 *   node scripts/gen-favicons.js
 *
 * No dependencies. The previous version of this script shelled out to `sharp`,
 * which was never in package.json and is not installed, so it could not run.
 * It also upscaled a 192px master to 512px. This one draws each size from the
 * geometry below, so nothing is ever resampled and the small favicons stay
 * crisp. That makes scripts/gen-ico.js redundant.
 *
 * The mark is defined once, in unit coordinates, in MARK. Change it there and
 * every asset follows.
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public');
const APP = path.join(__dirname, '..', 'src', 'app');

const GREEN = [0x16, 0xa3, 0x4a]; // --color-ch-primary
const WHITE = [0xff, 0xff, 0xff];

// Unit-square geometry (0..1). The glass is an unfilled ring plus a round-capped
// handle; both round caps and the ring's even thickness fall out of the distance
// functions below. The handle starts slightly inside the ring's outer edge so
// the two read as one drawn stroke rather than two touching shapes.
const MARK = {
  radius: 0.5,
  stroke: 0.055,
  lens: { cx: 0.425, cy: 0.415, r: 0.185 },
  handle: [
    [0.556, 0.546],
    [0.745, 0.735],
  ],
};

const SS = 4; // supersampling factor per axis — 16 samples per output pixel

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function onMark(x, y) {
  // Returns 0 = transparent, 1 = green, 2 = white
  if (Math.hypot(x - 0.5, y - 0.5) > MARK.radius) return 0;

  // Lens: white only on the ring itself, so the disc shows through the middle.
  const { cx, cy, r } = MARK.lens;
  if (Math.abs(Math.hypot(x - cx, y - cy) - r) <= MARK.stroke) return 2;

  const [[ax, ay], [bx, by]] = MARK.handle;
  if (distToSegment(x, y, ax, ay, bx, by) <= MARK.stroke) return 2;

  return 1;
}

function renderRGBA(size) {
  const buf = Buffer.alloc(size * size * 4);
  const step = 1 / (size * SS);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px * SS + sx + 0.5) * step;
          const y = (py * SS + sy + 0.5) * step;
          const hit = onMark(x, y);
          if (hit === 0) continue;
          const c = hit === 2 ? WHITE : GREEN;
          r += c[0]; g += c[1]; b += c[2]; a += 255;
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      // Premultiplied average: colour is the mean of covering samples only,
      // so edge pixels keep full-strength colour and only alpha falls off.
      const cover = a / 255;
      buf[i]     = cover ? Math.round(r / cover) : 0;
      buf[i + 1] = cover ? Math.round(g / cover) : 0;
      buf[i + 2] = cover ? Math.round(b / cover) : 0;
      buf[i + 3] = Math.round(a / n);
    }
  }
  return buf;
}

// ---- minimal PNG writer -----------------------------------------------------

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  // 10,11,12 = compression, filter, interlace — all 0

  // One filter byte (0 = None) per scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const o = y * (size * 4 + 1);
    raw[o] = 0;
    rgba.copy(raw, o + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- ICO container (embeds PNGs, which every target browser reads) ----------

function encodeICO(entries) {
  const dir = Buffer.alloc(6 + 16 * entries.length);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2); // 1 = icon
  dir.writeUInt16LE(entries.length, 4);
  let offset = dir.length;
  entries.forEach((e, i) => {
    const o = 6 + i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir[o + 2] = 0; // palette count
    dir[o + 3] = 0; // reserved
    dir.writeUInt16LE(1, o + 4);  // colour planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([dir, ...entries.map((e) => e.png)]);
}

// ---- outputs ---------------------------------------------------------------

const targets = [
  { file: path.join(OUT, 'logo-icon.png'), size: 512 },
  { file: path.join(OUT, 'logo-512.png'), size: 512 },
  { file: path.join(OUT, 'apple-touch-icon.png'), size: 180 },
  { file: path.join(OUT, 'favicon-32x32.png'), size: 32 },
  { file: path.join(OUT, 'favicon-16x16.png'), size: 16 },
  { file: path.join(APP, 'icon.png'), size: 256 },
];

const cache = new Map();
function png(size) {
  if (!cache.has(size)) cache.set(size, encodePNG(size, renderRGBA(size)));
  return cache.get(size);
}

for (const { file, size } of targets) {
  fs.writeFileSync(file, png(size));
  console.log(`✓ ${path.relative(path.join(__dirname, '..'), file)} (${size}x${size})`);
}

fs.writeFileSync(
  path.join(OUT, 'favicon.ico'),
  encodeICO([{ size: 16, png: png(16) }, { size: 32, png: png(32) }])
);
console.log('✓ public/favicon.ico (16+32)');
