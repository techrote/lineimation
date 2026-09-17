(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LineimationCurves = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CURVE_HILBERT = 1;
  const CURVE_DRAGON = 2;
  const CURVE_SIERPINSKI = 3;
  const CURVE_MORTON = 4;
  const CURVE_MOORE = 5;
  const CURVE_GOSPER = 6;

  const CURVE_NAMES = Object.freeze({
    [CURVE_HILBERT]: 'Hilbert',
    [CURVE_DRAGON]: 'Heighway dragon',
    [CURVE_SIERPINSKI]: 'Sierpiński arrowhead',
    [CURVE_MORTON]: 'Morton / Z-order',
    [CURVE_MOORE]: 'Moore',
    [CURVE_GOSPER]: 'Gosper'
  });

  const cache = new Map();

  function assertInteger(value, label, min = 0, max = 0x7fffffff) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new RangeError(`${label} must be an integer in [${min}, ${max}]`);
    }
    return value;
  }

  function nextPowerOfTwo(value) {
    let n = 1;
    while (n < value) n <<= 1;
    return n;
  }

  function rotHilbert(n, x, y, rx, ry) {
    if (ry === 0) {
      if (rx === 1) {
        x = n - 1 - x;
        y = n - 1 - y;
      }
      const t = x;
      x = y;
      y = t;
    }
    return [x, y];
  }

  function hilbertIndexToXY(index, order) {
    assertInteger(order, 'order', 1, 15);
    const side = 1 << order;
    const max = side * side;
    let t = ((index % max) + max) % max;
    let x = 0;
    let y = 0;
    for (let s = 1; s < side; s <<= 1) {
      const rx = 1 & (t >>> 1);
      const ry = 1 & (t ^ rx);
      [x, y] = rotHilbert(s, x, y, rx, ry);
      x += s * rx;
      y += s * ry;
      t >>>= 2;
    }
    return [x, y];
  }

  function hilbertXYToIndex(x, y, order) {
    assertInteger(order, 'order', 1, 15);
    const side = 1 << order;
    assertInteger(x, 'x', 0, side - 1);
    assertInteger(y, 'y', 0, side - 1);
    let d = 0;
    for (let s = side >>> 1; s > 0; s >>>= 1) {
      const rx = (x & s) ? 1 : 0;
      const ry = (y & s) ? 1 : 0;
      d += s * s * ((3 * rx) ^ ry);
      [x, y] = rotHilbert(s, x, y, rx, ry);
    }
    return d >>> 0;
  }

  function part1By1(v) {
    v &= 0xffff;
    v = (v | (v << 8)) & 0x00ff00ff;
    v = (v | (v << 4)) & 0x0f0f0f0f;
    v = (v | (v << 2)) & 0x33333333;
    v = (v | (v << 1)) & 0x55555555;
    return v >>> 0;
  }

  function compact1By1(v) {
    v &= 0x55555555;
    v = (v ^ (v >>> 1)) & 0x33333333;
    v = (v ^ (v >>> 2)) & 0x0f0f0f0f;
    v = (v ^ (v >>> 4)) & 0x00ff00ff;
    v = (v ^ (v >>> 8)) & 0x0000ffff;
    return v >>> 0;
  }

  function mortonEncode(x, y) {
    return (part1By1(x) | (part1By1(y) << 1)) >>> 0;
  }

  function mortonDecode(value) {
    return [compact1By1(value), compact1By1(value >>> 1)];
  }

  function dragonTurn(step) {
    step >>>= 0;
    const low = step & -step;
    return (((low << 1) & step) === 0) ? 1 : -1;
  }

  function heighwayDragon(iterations, stepLength = 1) {
    assertInteger(iterations, 'iterations', 1, 20);
    const segmentCount = 1 << iterations;
    const points = new Float32Array((segmentCount + 1) * 2);
    let x = 0;
    let y = 0;
    let dir = 0;
    for (let i = 1; i <= segmentCount; i += 1) {
      if (dir === 0) x += stepLength;
      else if (dir === 1) y += stepLength;
      else if (dir === 2) x -= stepLength;
      else y -= stepLength;
      points[i * 2] = x;
      points[i * 2 + 1] = y;
      dir = (dir + dragonTurn(i) + 4) & 3;
    }
    return points;
  }

  function sierpinskiSymbols(depth) {
    assertInteger(depth, 'depth', 0, 12);
    let state = 'A';
    for (let i = 0; i < depth; i += 1) {
      let next = '';
      for (const c of state) {
        if (c === 'A') next += 'B-A-B';
        else if (c === 'B') next += 'A+B+A';
        else next += c;
      }
      state = next;
    }
    return state;
  }

  function sierpinskiArrowhead(depth, stepLength = 1) {
    const symbols = sierpinskiSymbols(depth);
    const points = [[0, 0]];
    let x = 0;
    let y = 0;
    let angle = (depth & 1) ? Math.PI / 3 : 0;
    for (const c of symbols) {
      if (c === 'A' || c === 'B') {
        x += Math.cos(angle) * stepLength;
        y += Math.sin(angle) * stepLength;
        points.push([x, y]);
      } else if (c === '+') angle += Math.PI / 3;
      else if (c === '-') angle -= Math.PI / 3;
    }
    return points;
  }

  function expandLSystem(axiom, rules, depth) {
    let state = axiom;
    for (let i = 0; i < depth; i += 1) {
      let next = '';
      for (const c of state) next += rules[c] || c;
      state = next;
    }
    return state;
  }

  function turtlePath(symbols, drawSymbols, angleStep) {
    const points = [[0, 0]];
    let x = 0;
    let y = 0;
    let angle = 0;
    for (const c of symbols) {
      if (drawSymbols.has(c)) {
        x += Math.cos(angle);
        y += Math.sin(angle);
        points.push([x, y]);
      } else if (c === '+') angle += angleStep;
      else if (c === '-') angle -= angleStep;
    }
    return points;
  }

  function mooreCurve(depth) {
    assertInteger(depth, 'depth', 1, 8);
    const symbols = expandLSystem(
      'LFL+F+LFL',
      { L: '-RF+LFL+FR-', R: '+LF-RFR-FL+' },
      depth - 1
    );
    return turtlePath(symbols, new Set(['F']), Math.PI / 2);
  }

  function gosperCurve(depth) {
    assertInteger(depth, 'depth', 1, 7);
    const symbols = expandLSystem(
      'A',
      { A: 'A-B--B+A++AA+B-', B: '+A-BB--B-A++A+B' },
      depth
    );
    return turtlePath(symbols, new Set(['A', 'B']), Math.PI / 3);
  }

  function serpentinePermutation(width, height) {
    const result = new Uint32Array(width * height);
    let out = 0;
    for (let y = 0; y < height; y += 1) {
      if ((y & 1) === 0) {
        for (let x = 0; x < width; x += 1) result[out++] = y * width + x;
      } else {
        for (let x = width - 1; x >= 0; x -= 1) result[out++] = y * width + x;
      }
    }
    return result;
  }

  function permutationFromSquareCurve(width, height, mode) {
    const count = width * height;
    const side = nextPowerOfTwo(Math.max(width, height));
    const order = Math.round(Math.log2(side));
    const result = new Uint32Array(count);
    const seen = new Uint8Array(count);
    let out = 0;
    const limit = side * side;
    for (let i = 0; i < limit && out < count; i += 1) {
      const point = mode === CURVE_HILBERT ? hilbertIndexToXY(i, order) : mortonDecode(i);
      const x = point[0];
      const y = point[1];
      if (x < width && y < height) {
        const index = y * width + x;
        if (!seen[index]) {
          seen[index] = 1;
          result[out++] = index;
        }
      }
    }
    return result;
  }

  function normalizePathToPermutation(points, width, height) {
    const count = width * height;
    const result = new Uint32Array(count);
    const seen = new Uint8Array(count);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const getPoint = ArrayBuffer.isView(points)
      ? i => [points[i * 2], points[i * 2 + 1]]
      : i => points[i];
    const length = ArrayBuffer.isView(points) ? points.length >> 1 : points.length;
    for (let i = 0; i < length; i += 1) {
      const [x, y] = getPoint(i);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const spanX = Math.max(1e-9, maxX - minX);
    const spanY = Math.max(1e-9, maxY - minY);
    let out = 0;
    for (let i = 0; i < length && out < count; i += 1) {
      const [px, py] = getPoint(i);
      const x = Math.max(0, Math.min(width - 1, Math.round(((px - minX) / spanX) * (width - 1))));
      const y = Math.max(0, Math.min(height - 1, Math.round(((py - minY) / spanY) * (height - 1))));
      const index = y * width + x;
      if (!seen[index]) {
        seen[index] = 1;
        result[out++] = index;
      }
    }
    const fallback = serpentinePermutation(width, height);
    for (let i = 0; i < fallback.length && out < count; i += 1) {
      const index = fallback[i];
      if (!seen[index]) {
        seen[index] = 1;
        result[out++] = index;
      }
    }
    return result;
  }

  function iterationsForCount(base, count, min, max, oversample = 1.5) {
    return Math.max(min, Math.min(max, Math.ceil(Math.log(Math.max(2, count * oversample)) / Math.log(base))));
  }

  function buildCurvePermutation(width, height, mode) {
    assertInteger(width, 'width', 1, 4096);
    assertInteger(height, 'height', 1, 4096);
    assertInteger(mode, 'mode', CURVE_HILBERT, CURVE_GOSPER);
    const key = `${width}x${height}:${mode}`;
    if (cache.has(key)) return cache.get(key);
    const count = width * height;
    let permutation;
    if (mode === CURVE_HILBERT || mode === CURVE_MORTON) {
      permutation = permutationFromSquareCurve(width, height, mode);
    } else if (mode === CURVE_DRAGON) {
      permutation = normalizePathToPermutation(
        heighwayDragon(iterationsForCount(2, count, 5, 20, 2)), width, height
      );
    } else if (mode === CURVE_SIERPINSKI) {
      permutation = normalizePathToPermutation(
        sierpinskiArrowhead(iterationsForCount(3, count, 2, 12, 2)), width, height
      );
    } else if (mode === CURVE_MOORE) {
      permutation = normalizePathToPermutation(
        mooreCurve(iterationsForCount(4, count, 2, 8, 2)), width, height
      );
    } else if (mode === CURVE_GOSPER) {
      permutation = normalizePathToPermutation(
        gosperCurve(iterationsForCount(7, count, 1, 7, 2)), width, height
      );
    } else {
      permutation = serpentinePermutation(width, height);
    }
    cache.set(key, permutation);
    return permutation;
  }

  function clearCurveCache() {
    cache.clear();
  }

  return Object.freeze({
    CURVE_HILBERT,
    CURVE_DRAGON,
    CURVE_SIERPINSKI,
    CURVE_MORTON,
    CURVE_MOORE,
    CURVE_GOSPER,
    CURVE_NAMES,
    rotHilbert,
    hilbertIndexToXY,
    hilbertXYToIndex,
    mortonEncode,
    mortonDecode,
    dragonTurn,
    heighwayDragon,
    sierpinskiSymbols,
    sierpinskiArrowhead,
    mooreCurve,
    gosperCurve,
    serpentinePermutation,
    buildCurvePermutation,
    clearCurveCache
  });
});
