import { deflateSync } from "node:zlib";

type Point = [number, number];

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, checksum]);
}

export function generatePwaIcon(size: number): Buffer {
  const width = size;
  const height = size;
  const pixels = Buffer.alloc(width * height * 4);
  const put = (x: number, y: number, color: [number, number, number, number]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = color[3];
  };
  const scale = size / 512;
  const px = (v: number) => Math.round(v * scale);

  // Fond bleu ciel vers bleu profond, plein cadre pour résister aux masques Android.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = Math.min(1, (x / width) * 0.35 + (y / height) * 0.65);
      put(x, y, [
        Math.round(56 * (1 - t) + 29 * t),
        Math.round(189 * (1 - t) + 78 * t),
        Math.round(248 * (1 - t) + 216 * t),
        255,
      ]);
    }
  }

  const fillPolygon = (points: Point[], color: [number, number, number, number]) => {
    const scaled = points.map(([x, y]) => [px(x), px(y)] as Point);
    const minY = Math.max(0, Math.min(...scaled.map(p => p[1])));
    const maxY = Math.min(height - 1, Math.max(...scaled.map(p => p[1])));
    for (let y = minY; y <= maxY; y++) {
      const intersections: number[] = [];
      for (let i = 0, j = scaled.length - 1; i < scaled.length; j = i++) {
        const [xi, yi] = scaled[i], [xj, yj] = scaled[j];
        if ((yi <= y && yj > y) || (yj <= y && yi > y)) {
          intersections.push(Math.round(xi + ((y - yi) * (xj - xi)) / (yj - yi)));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length; i += 2) {
        const start = Math.max(0, intersections[i]);
        const end = Math.min(width - 1, intersections[i + 1] ?? intersections[i]);
        for (let x = start; x <= end; x++) put(x, y, color);
      }
    }
  };

  const line = (x1: number, y1: number, x2: number, y2: number, thickness: number, color: [number, number, number, number]) => {
    let x = px(x1), y = px(y1);
    const endX = px(x2), endY = px(y2);
    const dx = Math.abs(endX - x), sx = x < endX ? 1 : -1;
    const dy = -Math.abs(endY - y), sy = y < endY ? 1 : -1;
    let error = dx + dy;
    const radius = Math.max(1, Math.round(px(thickness) / 2));
    while (true) {
      for (let oy = -radius; oy <= radius; oy++) for (let ox = -radius; ox <= radius; ox++) {
        if (ox * ox + oy * oy <= radius * radius) put(x + ox, y + oy, color);
      }
      if (x === endX && y === endY) break;
      const twice = 2 * error;
      if (twice >= dy) { error += dy; x += sx; }
      if (twice <= dx) { error += dx; y += sy; }
    }
  };

  // Petite étoile de réussite.
  const star: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 === 0 ? 42 : 19;
    star.push([256 + Math.cos(angle) * radius, 113 + Math.sin(angle) * radius]);
  }
  fillPolygon(star, [254, 240, 138, 255]);

  // Livre ouvert : couverture blanche, pages bleu très pâle.
  fillPolygon([[256, 359], [240, 348], [205, 333], [164, 326], [117, 329], [117, 163], [166, 159], [211, 168], [256, 190]], [255, 255, 255, 255]);
  fillPolygon([[256, 359], [272, 348], [307, 333], [348, 326], [395, 329], [395, 163], [346, 159], [301, 168], [256, 190]], [239, 248, 255, 255]);
  line(256, 190, 256, 359, 9, [2, 132, 199, 255]);
  line(145, 209, 213, 220, 8, [2, 132, 199, 255]);
  line(145, 254, 213, 265, 8, [2, 132, 199, 255]);
  line(367, 209, 299, 220, 8, [2, 132, 199, 255]);
  line(367, 254, 299, 265, 8, [2, 132, 199, 255]);
  line(117, 163, 117, 329, 8, [255, 255, 255, 255]);
  line(395, 163, 395, 329, 8, [255, 255, 255, 255]);

  // Marque courte « ÉTUDES », dessinée en bitmap pour rester nette à petite taille.
  const glyphs: Record<string, string[]> = {
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  };
  const word = ["E", "T", "U", "D", "E", "S"];
  const unit = Math.max(1, px(5));
  const letterWidth = 5 * unit;
  const gap = unit;
  const totalWidth = word.length * letterWidth + (word.length - 1) * gap;
  const startX = Math.floor((width - totalWidth) / 2);
  const startY = px(405);
  word.forEach((letter, letterIndex) => {
    glyphs[letter].forEach((row, rowIndex) => {
      for (let col = 0; col < row.length; col++) {
        if (row[col] === "1") {
          const x0 = startX + letterIndex * (letterWidth + gap) + col * unit;
          const y0 = startY + rowIndex * unit;
          for (let oy = 0; oy < unit; oy++) for (let ox = 0; ox < unit; ox++) {
            put(x0 + ox, y0 + oy, [255, 255, 255, 255]);
          }
        }
      }
    });
  });
  // Accent aigu au-dessus du premier E.
  line(startX + unit * 2, startY - unit * 2, startX + unit * 3, startY - unit * 3, Math.max(1, unit), [255, 255, 255, 255]);

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 4);
    scanlines[row] = 0;
    pixels.copy(scanlines, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6; header[10] = 0; header[11] = 0; header[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
