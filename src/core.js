(function (root, factory) {
  const curves = typeof module === 'object' && module.exports ? require('./curves.js') : root.LineimationCurves;
  const api = factory(curves);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LineimationCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Curves) {
  'use strict';

  if (!Curves) throw new Error('LineimationCurves is required');

  const LINEIMATION_FORMAT = 0x0217;
  const FRAME_RING = 96;
  const TILE = 16;

  const GROUP_SPECS = Object.freeze({
    motion: Object.freeze({ label: 'Motion', min: 0.25, max: 2, step: 0.01 }),
    temporal: Object.freeze({ label: 'Temporal', min: 0.25, max: 2, step: 0.01 }),
    structure: Object.freeze({ label: 'Structure', min: 0.25, max: 2, step: 0.01 }),
    colour: Object.freeze({ label: 'Colour', min: 0.25, max: 2, step: 0.01 })
  });

  const PARAMETER_SPECS = Object.freeze({
    motionRate: Object.freeze({ group: 'motion', label: 'Motion rate', min: 0.05, max: 2.5, step: 0.01, digits: 2, neutral: 0 }),
    driftX: Object.freeze({ group: 'motion', label: 'Horizontal drift', min: 0, max: 32, step: 0.25, digits: 2, neutral: 0 }),
    driftY: Object.freeze({ group: 'motion', label: 'Vertical drift', min: 0, max: 32, step: 0.25, digits: 2, neutral: 0 }),
    driftFrequency: Object.freeze({ group: 'motion', label: 'Drift frequency', min: 0.01, max: 1.5, step: 0.01, digits: 2, neutral: 0 }),
    driftPhase: Object.freeze({ group: 'motion', label: 'Drift phase', min: -3.1416, max: 3.1416, step: 0.01, digits: 2, neutral: 0 }),

    historyMix: Object.freeze({ group: 'temporal', label: 'History mix', min: 0, max: 0.95, step: 0.01, digits: 2, neutral: 0 }),
    historyLag: Object.freeze({ group: 'temporal', label: 'History lag', min: 1, max: 48, step: 1, digits: 0, neutral: 0, integer: true }),
    historySpread: Object.freeze({ group: 'temporal', label: 'History spread', min: 1, max: 24, step: 1, digits: 0, neutral: 0, integer: true }),
    historyBlend: Object.freeze({ group: 'temporal', label: 'History crossfade', min: 0, max: 1, step: 0.01, digits: 2, neutral: 0 }),
    feedbackGain: Object.freeze({ group: 'temporal', label: 'Feedback gain', min: 0, max: 0.9, step: 0.01, digits: 2, neutral: 0 }),
    feedbackDistance: Object.freeze({ group: 'temporal', label: 'Feedback travel', min: 0, max: 160, step: 1, digits: 0, neutral: 0, integer: true }),
    feedbackSpeed: Object.freeze({ group: 'temporal', label: 'Feedback speed', min: 0.01, max: 2, step: 0.01, digits: 2, neutral: 0 }),
    frameResponse: Object.freeze({ group: 'temporal', label: 'Frame response', min: 0.02, max: 0.25, step: 0.005, digits: 3, neutral: 0 }),

    curveWriteMix: Object.freeze({ group: 'structure', label: 'Curve write mix', min: 0, max: 1, step: 0.01, digits: 2, neutral: 0 }),
    curveFeedbackMix: Object.freeze({ group: 'structure', label: 'Curve feedback mix', min: 0, max: 1, step: 0.01, digits: 2, neutral: 0 }),
    writeOffset: Object.freeze({ group: 'structure', label: 'Ring write offset', min: 0, max: 95, step: 1, digits: 0, neutral: 0, integer: true }),
    writeStride: Object.freeze({ group: 'structure', label: 'Ring write stride', min: 1, max: 8, step: 1, digits: 0, neutral: 0, integer: true }),

    hueShift: Object.freeze({ group: 'colour', label: 'Hue rotation', min: -0.5, max: 0.5, step: 0.005, digits: 3, neutral: 0 }),
    saturation: Object.freeze({ group: 'colour', label: 'Saturation', min: 0, max: 2.5, step: 0.01, digits: 2, neutral: 1 }),
    contrast: Object.freeze({ group: 'colour', label: 'Contrast', min: 0.4, max: 2, step: 0.01, digits: 2, neutral: 1 }),
    brightness: Object.freeze({ group: 'colour', label: 'Brightness', min: 0.5, max: 1.5, step: 0.01, digits: 2, neutral: 1 }),
    gamma: Object.freeze({ group: 'colour', label: 'Gamma', min: 0.5, max: 2, step: 0.01, digits: 2, neutral: 1 }),
    posterize: Object.freeze({ group: 'colour', label: 'Posterize levels', min: 0, max: 32, step: 1, digits: 0, neutral: 0, integer: true })
  });

  const SCENE_STEMS = Object.freeze([
    'Veil', 'Fold', 'Current', 'Lattice', 'Bloom', 'Relay', 'Orbit',
    'Trellis', 'Glass', 'Drift', 'Halo', 'Wake', 'Contour', 'Echo',
    'Ribbon', 'Field', 'Tide', 'Mesh', 'Pulse', 'Arc', 'Prism',
    'Trace', 'Basin', 'Cairn', 'Woven', 'Flare', 'Channel', 'Afterimage'
  ]);

  function rounded(value, digits = 4) {
    const scale = 10 ** digits;
    return Math.round(value * scale) / scale;
  }

  function makeScene(index) {
    const curveMode = (index % 6) + 1;
    const oldMasks = [2, 3, 5, 9];
    const oldGains = [0.82, 0.86, 0.9, 0.94, 0.88, 0.84, 0.92, 0.86];
    const mask = oldMasks[index % oldMasks.length];
    const recoveredGain = oldGains[index % oldGains.length];
    const phase = ((index * 0.754877666) % 1) * Math.PI * 2 - Math.PI;
    const params = {
      motionRate: rounded(0.16 + (index % 7) * 0.075, 3),
      driftX: rounded(2 + ((index * 3) % 13) * 0.7, 2),
      driftY: rounded(2 + ((index * 5) % 11) * 0.65, 2),
      driftFrequency: rounded(0.06 + (index % 5) * 0.045, 3),
      driftPhase: rounded(phase, 3),

      historyMix: rounded(0.16 + (index % 6) * 0.065, 3),
      historyLag: 2 + ((index * 3) % 11),
      historySpread: 1 + ((index * 5) % 7),
      historyBlend: rounded(0.22 + (index % 5) * 0.12, 3),
      feedbackGain: rounded(0.08 + (recoveredGain - 0.8) * 0.55, 3),
      feedbackDistance: 5 + ((index * 7) % 47),
      feedbackSpeed: rounded(0.05 + (index % 6) * 0.045, 3),
      frameResponse: rounded(0.075 + (index % 5) * 0.0175, 4),

      curveWriteMix: rounded(0.16 + (index % 6) * 0.075, 3),
      curveFeedbackMix: rounded(0.12 + (index % 7) * 0.055, 3),
      writeOffset: index % 24,
      writeStride: 1 + (index % 3),

      hueShift: rounded((((index * 0.137) % 1) - 0.5) * 0.42, 3),
      saturation: rounded(0.82 + (index % 5) * 0.13, 2),
      contrast: rounded(0.88 + (index % 6) * 0.075, 3),
      brightness: rounded(0.9 + (index % 4) * 0.045, 3),
      gamma: rounded(0.86 + (index % 5) * 0.07, 3),
      posterize: index % 7 === 0 ? 10 + (index % 4) * 2 : 0
    };
    return Object.freeze({
      id: index,
      name: 'Scene ' + String(index).padStart(2, '0') + ' · ' + SCENE_STEMS[index],
      curveMode,
      phase,
      recovered: Object.freeze({
        phaseMultiplier: index + 3,
        phaseShift: index % 5,
        feedbackMask: mask,
        gain: recoveredGain,
        writeOffset: index
      }),
      params: Object.freeze(params)
    });
  }

  const RECOVERED_SCENES = Object.freeze(Array.from({ length: 28 }, (_, index) => makeScene(index)));
  const RECOVERED_PASSES = RECOVERED_SCENES;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function assertPixels(pixels, width, height, label = 'pixels') {
    if (!(pixels instanceof Uint8ClampedArray)) throw new TypeError(`${label} must be Uint8ClampedArray`);
    const expected = width * height * 4;
    if (pixels.length !== expected) throw new RangeError(`${label} length ${pixels.length} != ${expected}`);
  }

  function copyPixels(source, destination) {
    destination.set(source.subarray(0, destination.length));
    return destination;
  }

  class FrameAtlas {
    constructor(width, height, frames = 24) {
      if (!Number.isInteger(width) || width < 1) throw new RangeError('width must be positive');
      if (!Number.isInteger(height) || height < 1) throw new RangeError('height must be positive');
      if (!Number.isInteger(frames) || frames < 2 || frames > FRAME_RING) throw new RangeError(`frames must be in [2, ${FRAME_RING}]`);
      this.width = width;
      this.height = height;
      this.frames = frames;
      this.stride = width * height * 4;
      this.data = new Uint8ClampedArray(this.stride * frames);
      this.frameClock = 0;
      this._maps = new Map();
    }

    frameView(frame) {
      const f = ((frame % this.frames) + this.frames) % this.frames;
      return this.data.subarray(f * this.stride, (f + 1) * this.stride);
    }

    curveMap(mode) {
      if (!this._maps.has(mode)) this._maps.set(mode, Curves.buildCurvePermutation(this.width, this.height, mode));
      return this._maps.get(mode);
    }

    fill(source) {
      assertPixels(source, this.width, this.height, 'source');
      for (let frame = 0; frame < this.frames; frame += 1) this.frameView(frame).set(source);
      return this;
    }

    writeCurve(frame, source, mode = Curves.CURVE_HILBERT) {
      assertPixels(source, this.width, this.height, 'source');
      const dst = this.frameView(frame);
      const map = this.curveMap(mode);
      const count = this.width * this.height;
      for (let i = 0; i < count; i += 1) {
        const d = map[i] * 4;
        const s = i * 4;
        dst[d] = source[s];
        dst[d + 1] = source[s + 1];
        dst[d + 2] = source[s + 2];
        dst[d + 3] = source[s + 3];
      }
      return dst;
    }

    blendFrames(a, b, t, out = new Uint8ClampedArray(this.stride)) {
      const A = this.frameView(a);
      const B = this.frameView(b);
      const u = clamp(Number(t) || 0, 0, 1);
      for (let i = 0; i < this.stride; i += 4) {
        out[i] = A[i] + (B[i] - A[i]) * u;
        out[i + 1] = A[i + 1] + (B[i + 1] - A[i + 1]) * u;
        out[i + 2] = A[i + 2] + (B[i + 2] - A[i + 2]) * u;
        out[i + 3] = Math.max(A[i + 3], B[i + 3]);
      }
      return out;
    }
  }

  function buildFrameSchedule(frameCount, curveMode) {
    if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > FRAME_RING) {
      throw new RangeError(`frameCount must be in [1, ${FRAME_RING}]`);
    }
    const side = Math.ceil(Math.sqrt(frameCount));
    const map = Curves.buildCurvePermutation(side, side, curveMode);
    const schedule = new Uint32Array(frameCount);
    let out = 0;
    for (let i = 0; i < map.length && out < frameCount; i += 1) {
      const index = map[i];
      if (index < frameCount) schedule[out++] = index;
    }
    for (; out < frameCount; out += 1) schedule[out] = out;
    return schedule;
  }

  function curveFeedback(frame, pixels, width, height, mode, gain = 0.25, travel = 0, speed = 0.1, phase = 0) {
    assertPixels(pixels, width, height);
    const u = clamp(Number(gain) || 0, 0, 1);
    if (u <= 0) return pixels.slice();
    const out = pixels.slice();
    const map = Curves.buildCurvePermutation(width, height, mode);
    const count = width * height;
    const wobble = Math.sin(frame * Number(speed || 0) + Number(phase || 0));
    const shift = Math.round(wobble * Math.max(0, Number(travel) || 0));
    for (let i = 0; i < count; i += 1) {
      const sourcePixel = map[((i + shift) % count + count) % count];
      const d = i * 4;
      const s = sourcePixel * 4;
      out[d] = pixels[d] * (1 - u) + pixels[s] * u;
      out[d + 1] = pixels[d + 1] * (1 - u) + pixels[s + 1] * u;
      out[d + 2] = pixels[d + 2] * (1 - u) + pixels[s + 2] * u;
      out[d + 3] = pixels[d + 3];
    }
    return out;
  }

  function curveRemap(pixels, width, height, mode) {
    assertPixels(pixels, width, height);
    const map = Curves.buildCurvePermutation(width, height, mode);
    const out = new Uint8ClampedArray(pixels.length);
    for (let i = 0; i < map.length; i += 1) {
      const d = map[i] * 4;
      const s = i * 4;
      out[d] = pixels[s];
      out[d + 1] = pixels[s + 1];
      out[d + 2] = pixels[s + 2];
      out[d + 3] = pixels[s + 3];
    }
    return out;
  }

  function blendPixels(a, b, amount, out = new Uint8ClampedArray(a.length)) {
    if (a.length !== b.length || out.length !== a.length) throw new RangeError('pixel buffers must have equal length');
    const u = clamp(Number(amount) || 0, 0, 1);
    for (let i = 0; i < a.length; i += 4) {
      out[i] = a[i] + (b[i] - a[i]) * u;
      out[i + 1] = a[i + 1] + (b[i + 1] - a[i + 1]) * u;
      out[i + 2] = a[i + 2] + (b[i + 2] - a[i + 2]) * u;
      out[i + 3] = Math.max(a[i + 3], b[i + 3]);
    }
    return out;
  }

  function translateSource(source, width, height, dx, dy, channelPhase = 0) {
    assertPixels(source, width, height, 'source');
    const out = new Uint8ClampedArray(source.length);
    const ox = ((Math.trunc(dx) % width) + width) % width;
    const oy = ((Math.trunc(dy) % height) + height) % height;
    for (let y = 0; y < height; y += 1) {
      const sy = (y + oy) % height;
      for (let x = 0; x < width; x += 1) {
        const sx = (x + ox) % width;
        const d = (y * width + x) * 4;
        const s = (sy * width + sx) * 4;
        out[d] = source[s];
        out[d + 1] = source[s + 1];
        out[d + 2] = source[s + 2];
        out[d + 3] = source[s + 3];
      }
    }
    if (channelPhase) {
      const phase = channelPhase & 3;
      if (phase) {
        for (let i = 0; i < out.length; i += 4) {
          const r = out[i];
          const g = out[i + 1];
          const b = out[i + 2];
          if (phase === 1) {
            out[i] = g; out[i + 1] = b; out[i + 2] = r;
          } else if (phase === 2) {
            out[i] = b; out[i + 1] = r; out[i + 2] = g;
          }
        }
      }
    }
    return out;
  }

  class LineimationEngine {
    constructor(width, height, options = {}) {
      this.width = width;
      this.height = height;
      this.ringFrames = clamp(Math.trunc(options.ringFrames || 24), 2, FRAME_RING);
      this.atlas = new FrameAtlas(width, height, this.ringFrames);
      this.frame = 0;
      this.source = new Uint8ClampedArray(width * height * 4);
      this.current = this.source.slice();
      this.curveMode = options.curveMode || Curves.CURVE_HILBERT;
      this.passId = clamp(Math.trunc(options.passId || 0), 0, RECOVERED_PASSES.length - 1);
      this.historyMix = clamp(options.historyMix === undefined ? 0.45 : Number(options.historyMix), 0, 1);
      this.feedbackGain = clamp(options.feedbackGain === undefined ? 0.88 : Number(options.feedbackGain), 0, 1);
    }

    setSource(pixels) {
      assertPixels(pixels, this.width, this.height, 'source');
      this.source = pixels.slice();
      this.current = pixels.slice();
      this.atlas.fill(pixels);
      this.frame = 0;
      return this.current;
    }

    setRingFrames(frames) {
      const next = clamp(Math.trunc(frames), 2, FRAME_RING);
      if (next === this.ringFrames) return;
      this.ringFrames = next;
      this.atlas = new FrameAtlas(this.width, this.height, next);
      this.atlas.fill(this.current);
    }

    configure(options = {}) {
      if (options.curveMode !== undefined) this.curveMode = clamp(Math.trunc(options.curveMode), 1, 6);
      if (options.passId !== undefined) this.passId = clamp(Math.trunc(options.passId), 0, RECOVERED_PASSES.length - 1);
      if (options.historyMix !== undefined) this.historyMix = clamp(Number(options.historyMix), 0, 1);
      if (options.feedbackGain !== undefined) this.feedbackGain = clamp(Number(options.feedbackGain), 0, 1);
      if (options.ringFrames !== undefined) this.setRingFrames(options.ringFrames);
    }

    reset() {
      this.frame = 0;
      this.current = this.source.slice();
      this.atlas.fill(this.source);
      return this.current;
    }

    step() {
      const pass = RECOVERED_PASSES[this.passId];
      const mode = this.curveMode || pass.curveMode;
      const phase = (((this.frame * pass.phaseMultiplier) ^ (this.frame >>> pass.phaseShift)) >>> 0);
      const schedule = buildFrameSchedule(this.atlas.frames, mode);
      const selected = schedule[phase % schedule.length];
      const neighbor = schedule[(phase + 1) % schedule.length];
      const temporal = this.atlas.blendFrames(selected, neighbor, (phase & 255) / 255);
      const driftX = ((phase >>> 3) % 7) - 3;
      const driftY = ((phase >>> 6) % 5) - 2;
      const animatedSource = translateSource(this.source, this.width, this.height, driftX, driftY, phase & 3);
      let mixed = blendPixels(animatedSource, temporal, this.historyMix);
      const mask = pass.feedbackMask;
      if ((phase & mask) === 0) {
        mixed = curveFeedback(this.frame, mixed, this.width, this.height, mode, clamp((pass.gain + this.feedbackGain) * 0.5, 0, 1));
      }
      this.atlas.writeCurve((this.frame + pass.writeOffset) % this.atlas.frames, mixed, mode);
      this.current = mixed;
      this.frame += 1;
      return this.current;
    }

    state() {
      return Object.freeze({
        format: LINEIMATION_FORMAT,
        width: this.width,
        height: this.height,
        frame: this.frame,
        ringFrames: this.ringFrames,
        curveMode: this.curveMode,
        passId: this.passId,
        historyMix: this.historyMix,
        feedbackGain: this.feedbackGain
      });
    }
  }

  function makeTestPattern(width, height) {
    const out = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const gx = x / Math.max(1, width - 1);
        const gy = y / Math.max(1, height - 1);
        const checker = (((x / TILE) | 0) ^ ((y / TILE) | 0)) & 1;
        const ring = Math.sin(Math.hypot(x - width / 2, y - height / 2) * 0.12) * 0.5 + 0.5;
        out[i] = clamp(Math.round(35 + 190 * gx + checker * 25), 0, 255);
        out[i + 1] = clamp(Math.round(25 + 170 * gy + ring * 45), 0, 255);
        out[i + 2] = clamp(Math.round(45 + 170 * (1 - gx) + (1 - checker) * 25), 0, 255);
        out[i + 3] = 255;
      }
    }
    return out;
  }

  function checksum(pixels) {
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < pixels.length; i += 1) {
      hash ^= pixels[i];
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  return Object.freeze({
    LINEIMATION_FORMAT,
    FRAME_RING,
    TILE,
    RECOVERED_PASSES,
    FrameAtlas,
    LineimationEngine,
    buildFrameSchedule,
    curveFeedback,
    blendPixels,
    translateSource,
    makeTestPattern,
    checksum
  });
});
