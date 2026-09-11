import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = crc ^ byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, drawFn) {
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // ColorType: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Tactical icon drawer: dark tactical canvas, concentric emerald rings, crosshairs, shield and center node
function drawTacticalIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background: dark #050505
  let r = 5, g = 5, b = 5, a = 255;

  const scale = w / 512;
  const pad = isMaskable ? 0.8 : 0.95; // Maskable safe zone margin

  // Outer border / rounded rect for non-maskable
  if (!isMaskable) {
    const rx = Math.abs(dx);
    const ry = Math.abs(dy);
    const cornerRadius = 60 * scale;
    const maxBox = (w / 2) - 12 * scale;
    if (rx > maxBox || ry > maxBox) {
      const cdx = Math.max(0, rx - (maxBox - cornerRadius));
      const cdy = Math.max(0, ry - (maxBox - cornerRadius));
      if (Math.sqrt(cdx * cdx + cdy * cdy) > cornerRadius) {
        return [0, 0, 0, 0]; // transparent outside
      }
    }
  }

  // Radar Circles (dist in scale)
  const normDist = dist / scale;
  if (Math.abs(normDist - 190 * pad) < 3.5 * scale) {
    return [16, 185, 129, 230]; // Emerald outer ring
  }
  if (Math.abs(normDist - 140 * pad) < 2.5 * scale) {
    return [16, 185, 129, 180]; // Emerald mid ring
  }
  if (Math.abs(normDist - 90 * pad) < 2 * scale) {
    return [16, 185, 129, 140]; // Emerald inner ring
  }

  // Radar crosshairs (horizontal and vertical lines)
  if (Math.abs(dx) < 1.5 * scale && Math.abs(dy) < 210 * pad * scale) {
    return [16, 185, 129, 120];
  }
  if (Math.abs(dy) < 1.5 * scale && Math.abs(dx) < 210 * pad * scale) {
    return [16, 185, 129, 120];
  }

  // Tactical Shield outline
  // Triangle/Shield math:
  // Top horizontal: y = cy - 130 * scale
  // Left point: (cx - 100 * scale, cy - 130 * scale) to (cx - 100 * scale, cy + 20 * scale) to (cx, cy + 130 * scale)
  const sy = (y - cy) / scale / pad;
  const sx = Math.abs(x - cx) / scale / pad;
  if (sy >= -130 && sy <= 135) {
    let targetX = 0;
    if (sy <= 20) {
      targetX = 110;
    } else {
      // slope down to point at (0, 135)
      targetX = 110 * (1 - (sy - 20) / 115);
    }

    if (Math.abs(sx - targetX) < 5 * scale) {
      return [16, 185, 129, 255]; // Shield outline
    }
  }

  // Center node
  if (normDist < 16 * pad) {
    return [16, 185, 129, 255];
  }

  // Satellite tactical blip (blue node at ~ (330, 190))
  const bx = (x - (cx + 65 * scale * pad));
  const by = (y - (cy - 55 * scale * pad));
  if (Math.sqrt(bx * bx + by * by) < 8 * scale) {
    return [59, 130, 246, 255]; // Blue C2 blip
  }

  // Target red/amber alert blip at ~ (-55, 60)
  const ax = (x - (cx - 55 * scale * pad));
  const ay = (y - (cy + 60 * scale * pad));
  if (Math.sqrt(ax * ax + ay * ay) < 7 * scale) {
    return [239, 68, 68, 255]; // Red alert blip
  }

  return [r, g, b, a];
}

const publicDir = path.join(process.cwd(), 'public');

const pwa192 = createPng(192, 192, (x, y, w, h) => drawTacticalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

const pwa512 = createPng(512, 512, (x, y, w, h) => drawTacticalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

const pwaMaskable = createPng(512, 512, (x, y, w, h) => drawTacticalIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

const appleTouch = createPng(180, 180, (x, y, w, h) => drawTacticalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

const favicon = createPng(64, 64, (x, y, w, h) => drawTacticalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), favicon);

console.log('Successfully generated all PWA icons (192, 512, maskable, apple-touch-icon, favicon)!');
