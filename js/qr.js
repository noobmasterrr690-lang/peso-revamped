/**
 * PESO — Compact ISO/IEC 18004 QR Code SVG Generator (Zero External Dependencies)
 * Generates a scannable SVG QR Code for sharing the PESO app link with friends
 * on iOS and Android devices.
 */

// Galois Field GF(256) tables for Reed-Solomon Error Correction
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// QR Version specs for Level L (1 block) up to Version 5 (106 bytes max)
const QR_VERSIONS = {
  2: { size: 25, totalDataBytes: 34, ecBytes: 10, align: [6, 18] },
  3: { size: 29, totalDataBytes: 55, ecBytes: 15, align: [6, 22] },
  4: { size: 33, totalDataBytes: 80, ecBytes: 20, align: [6, 26] },
  5: { size: 37, totalDataBytes: 108, ecBytes: 26, align: [6, 30] }
};

function selectVersion(byteLen) {
  for (const v of [2, 3, 4, 5]) {
    if (byteLen + 3 <= QR_VERSIONS[v].totalDataBytes) return v;
  }
  return 5;
}

export function renderQrCodeSvg(text, pixelSize = 180) {
  const rawBytes = new TextEncoder().encode(String(text || 'https://peso.app').slice(0, 100));
  const version = selectVersion(rawBytes.length);
  const spec = QR_VERSIONS[version];
  const size = spec.size;

  // Build data bit stream: Mode 0100 (Byte), 8-bit length, payload, terminator, pad bytes
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(rawBytes.length, 8);
  for (const b of rawBytes) pushBits(b, 8);
  pushBits(0, Math.min(4, spec.totalDataBytes * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = new Uint8Array(spec.totalDataBytes);
  for (let i = 0; i < bits.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    dataBytes[i] = byte;
  }
  const pads = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < spec.totalDataBytes; i++, p++) {
    dataBytes[i] = pads[p % 2];
  }

  const ecBytes = rsEncode(dataBytes, spec.ecBytes);
  const allCodewords = new Uint8Array(dataBytes.length + ecBytes.length);
  allCodewords.set(dataBytes, 0);
  allCodewords.set(ecBytes, dataBytes.length);

  const matrix = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const isReserved = Array.from({ length: size }, () => new Uint8Array(size));

  const setModule = (r, c, val, reserve = true) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    matrix[r][c] = val ? 1 : 0;
    if (reserve) isReserved[r][c] = 1;
  };

  // Finder patterns + separators
  const placeFinder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(row + r, col + c, inOuter && (onBorder || inInner) ? 1 : 0, true);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Alignment pattern
  const [a0, a1] = spec.align;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      setModule(a1 + r, a1 + c, dark ? 1 : 0, true);
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isReserved[6][i]) setModule(6, i, i % 2 === 0 ? 1 : 0, true);
    if (!isReserved[i][6]) setModule(i, 6, i % 2 === 0 ? 1 : 0, true);
  }

  // Dark module & reserve format info areas
  setModule(size - 8, 8, 1, true);
  for (let i = 0; i < 9; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = 1;
    if (!isReserved[i][8]) isReserved[i][8] = 1;
  }
  for (let i = 0; i < 8; i++) {
    isReserved[8][size - 1 - i] = 1;
    isReserved[size - 1 - i][8] = 1;
  }

  // Place data bits in upward/downward 2-column zigzag
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isReserved[r][c]) {
          let bit = 0;
          if (bitIdx < totalBits) {
            bit = (allCodewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          // Apply Mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) bit ^= 1;
          matrix[r][c] = bit;
        }
      }
    }
    upward = !upward;
  }

  // Precomputed Format Info bits for Level L (01) + Mask 0 (000) -> 0x77c4
  const formatBits = 0x77c4;
  const fBits = [];
  for (let i = 0; i < 15; i++) fBits.push((formatBits >> i) & 1);

  const fCoords1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = fCoords1[i];
    matrix[r][c] = fBits[14 - i];
  }
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = fBits[14 - i];
  }
  for (let i = 7; i < 15; i++) {
    matrix[8][size - 15 + i] = fBits[14 - i];
  }

  // Render SVG path
  const margin = 3;
  const totalModules = size + margin * 2;
  let pathData = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        pathData += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${pixelSize}" height="${pixelSize}" role="img" aria-label="QR Code for PESO App Link" style="display:block; border:2px solid #111215; background:#FFFFFF;">
      <rect width="100%" height="100%" fill="#FFFFFF"/>
      <path d="${pathData}" fill="#111215"/>
    </svg>
  `.trim();
}
