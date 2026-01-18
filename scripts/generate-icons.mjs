import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

// CRC32 calculation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Simple PNG generator for solid color icons with "P" letter
function createPNG(size, r, g, b) {
  const width = size;
  const height = size;

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16);
  ihdr.writeUInt8(2, 17);
  ihdr.writeUInt8(0, 18);
  ihdr.writeUInt8(0, 19);
  ihdr.writeUInt8(0, 20);

  const ihdrCrc = crc32(ihdr.slice(4, 21));
  ihdr.writeUInt32BE(ihdrCrc, 21);

  // Create raw image data
  const rawData = [];
  const padding = Math.floor(size * 0.15);
  const letterWidth = Math.floor(size * 0.12);
  const arcRadius = Math.floor(size * 0.2);

  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      let isLetter = false;

      // Left vertical bar of P
      if (x >= padding && x < padding + letterWidth &&
          y >= padding && y < height - padding) {
        isLetter = true;
      }

      // Top horizontal of P
      if (y >= padding && y < padding + letterWidth &&
          x >= padding && x < width - padding * 1.5) {
        isLetter = true;
      }

      // Middle horizontal of P
      const middleY = Math.floor(height * 0.5);
      if (y >= middleY && y < middleY + letterWidth &&
          x >= padding && x < width - padding * 1.5) {
        isLetter = true;
      }

      // Right vertical (upper part) of P
      if (x >= width - padding * 1.5 - letterWidth && x < width - padding * 1.5 &&
          y >= padding && y < middleY + letterWidth) {
        isLetter = true;
      }

      if (isLetter) {
        rawData.push(255, 255, 255); // White letter
      } else {
        rawData.push(r, g, b); // Background color
      }
    }
  }

  const compressed = deflateSync(Buffer.from(rawData));

  // IDAT chunk
  const idatLength = compressed.length;
  const idat = Buffer.alloc(idatLength + 12);
  idat.writeUInt32BE(idatLength, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  idat.writeUInt32BE(idatCrc, idatLength + 8);

  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Generate icons with theme color (#6366f1 = indigo)
const png192 = createPNG(192, 99, 102, 241);
const png512 = createPNG(512, 99, 102, 241);

writeFileSync('public/icons/icon-192.png', png192);
writeFileSync('public/icons/icon-512.png', png512);

console.log('Icons generated: icon-192.png, icon-512.png');
