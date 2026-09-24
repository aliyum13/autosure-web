/*
 * Builds every favicon / app-icon size from the AutoSure logo master at
 * public/images/logo.png, plus favicon.ico.
 *
 *   node scripts/gen-favicons.js
 *
 * No dependencies: the master is decoded with zlib, cropped to the mark,
 * squared on white, and box-filtered down to each size. The master is a wide
 * car on a lot of white, so cropping first is what keeps the mark legible at
 * 16px instead of shrinking the padding along with it.
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const IMAGES = path.join(PUBLIC, 'images');
const APP = path.join(ROOT, 'src', 'app');
const MASTER = path.join(IMAGES, 'logo.png');

// Margin around the mark once squared, as a fraction of the mark's long side.
const MARGIN = 0.06;
// A pixel darker than this on any channel counts as part of the mark.
const INK_THRESHOLD = 235;

// ---- minimal PNG reader (8-bit RGB / RGBA, non-interlaced) -------------------

function decodePNG(buf) {
  let pos = 8, width, height, bitDepth, colourType, interlace;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colourType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colourType !== 2 && colourType !== 6) || interlace !== 0) {
    throw new Error(`Unsupported PNG (depth ${bitDepth}, colour type ${colourType}, interlace ${interlace})`);
  }

  const bpp = colourType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[out + x - bpp] : 0;
      const b = y > 0 ? px[out - stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[out - stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[out + x] = v & 0xff;
    }
  }

  // Normalise to RGBA.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = px[i * bpp];
    rgba[i * 4 + 1] = px[i * bpp + 1];
    rgba[i * 4 + 2] = px[i * bpp + 2];
    rgba[i * 4 + 3] = bpp === 4 ? px[i * bpp + 3] : 255;
  }
  return { width, height, rgba };
}

// ---- crop to the mark and square it on white ---------------------------------

function squareMaster({ width, height, rgba }) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] > 16 && Math.min(rgba[i], rgba[i + 1], rgba[i + 2]) < INK_THRESHOLD) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('No mark found in the master image');

  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const side = Math.round(Math.max(w, h) * (1 + 2 * MARGIN));
  const ox = Math.floor((side - w) / 2), oy = Math.floor((side - h) / 2);
  const out = Buffer.alloc(side * side * 4, 255); // opaque white
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y0 + y) * width + (x0 + x)) * 4;
      const d = ((oy + y) * side + (ox + x)) * 4;
      // Composite onto white so any soft alpha edges stay clean.
      const al = rgba[s + 3] / 255;
      out[d] = Math.round(rgba[s] * al + 255 * (1 - al));
      out[d + 1] = Math.round(rgba[s + 1] * al + 255 * (1 - al));
      out[d + 2] = Math.round(rgba[s + 2] * al + 255 * (1 - al));
      out[d + 3] = 255;
    }
  }
  return { side, rgba: out };
}

// Area-average (box filter) downsample. Every output pixel is the exact mean of
// the source region it covers, with fractional weights at the edges.
function resize({ side, rgba }, size) {
  const out = Buffer.alloc(size * size * 4);
  const scale = side / size;
  for (let oy = 0; oy < size; oy++) {
    const sy0 = oy * scale, sy1 = sy0 + scale;
    for (let ox = 0; ox < size; ox++) {
      const sx0 = ox * scale, sx1 = sx0 + scale;
      let r = 0, g = 0, b = 0, a = 0, wsum = 0;
      for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) {
        const wy = Math.min(y + 1, sy1) - Math.max(y, sy0);
        for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
          const wx = Math.min(x + 1, sx1) - Math.max(x, sx0);
          const w = wx * wy, i = (y * side + x) * 4;
          r += rgba[i] * w; g += rgba[i + 1] * w; b += rgba[i + 2] * w; a += rgba[i + 3] * w;
          wsum += w;
        }
      }
      const o = (oy * size + ox) * 4;
      out[o] = Math.round(r / wsum);
      out[o + 1] = Math.round(g / wsum);
      out[o + 2] = Math.round(b / wsum);
      out[o + 3] = Math.round(a / wsum);
    }
  }
  return out;
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

const master = squareMaster(decodePNG(fs.readFileSync(MASTER)));

const targets = [
  { file: path.join(IMAGES, 'logo-16.png'), size: 16 },
  { file: path.join(IMAGES, 'logo-32.png'), size: 32 },
  { file: path.join(IMAGES, 'logo-180.png'), size: 180 },
  { file: path.join(IMAGES, 'logo-512.png'), size: 512 },
  // Next serves this as the <link rel="icon"> for the app router.
  { file: path.join(APP, 'icon.png'), size: 256 },
];

const cache = new Map();
function png(size) {
  if (!cache.has(size)) cache.set(size, encodePNG(size, resize(master, size)));
  return cache.get(size);
}

for (const { file, size } of targets) {
  fs.writeFileSync(file, png(size));
  console.log(`✓ ${path.relative(ROOT, file)} (${size}x${size})`);
}

const ico = encodeICO([16, 32, 48].map((size) => ({ size, png: png(size) })));
// public/images/ is the canonical copy; public/favicon.ico is what browsers
// request on their own, whatever the <link> tags say.
for (const file of [path.join(IMAGES, 'favicon.ico'), path.join(PUBLIC, 'favicon.ico')]) {
  fs.writeFileSync(file, ico);
  console.log(`✓ ${path.relative(ROOT, file)} (16+32+48)`);
}
