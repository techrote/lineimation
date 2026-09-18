(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LineimationExplorer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GROUP_SPECS = Object.freeze({
    camera: Object.freeze({ label: 'Camera', min: 0.25, max: 2, step: 0.01 }),
    evolution: Object.freeze({ label: 'Fractal evolution', min: 0.25, max: 2, step: 0.01 }),
    geometry: Object.freeze({ label: 'Geometry', min: 0.25, max: 2, step: 0.01 }),
    shader: Object.freeze({ label: 'Shader detail', min: 0.25, max: 2, step: 0.01 }),
    colour: Object.freeze({ label: 'Colour', min: 0.25, max: 2, step: 0.01 })
  });

  const PARAMETER_SPECS = Object.freeze({
    zoomRate: spec('camera', 'Infinite zoom rate', -2.5, 2.5, 0.01, 2, 0),
    zoomBase: spec('camera', 'Zoom depth', -12, 12, 0.01, 2, 0),
    centerX: spec('camera', 'Center X', -2.5, 2.5, 0.001, 3, 0),
    centerY: spec('camera', 'Center Y', -2.0, 2.0, 0.001, 3, 0),
    panSpeed: spec('camera', 'Flight speed', 0, 2.5, 0.01, 2, 0),
    orbitRadius: spec('camera', 'Orbit radius', 0, 1.5, 0.005, 3, 0),
    orbitSpeed: spec('camera', 'Orbit speed', -3, 3, 0.01, 2, 0),
    cameraLag: spec('camera', 'Camera smoothing', 0.2, 20, 0.1, 1, 0),

    evolveSpeed: spec('evolution', 'Evolution speed', 0, 4, 0.01, 2, 0),
    internalRotation: spec('evolution', 'Internal rotation', -5, 5, 0.01, 2, 0),
    writheAmount: spec('evolution', 'Writhe amount', 0, 2.5, 0.01, 2, 0),
    writheScale: spec('evolution', 'Writhe scale', 0.1, 12, 0.01, 2, 0),
    writheSpeed: spec('evolution', 'Writhe speed', 0, 5, 0.01, 2, 0),
    sliceSpeed: spec('evolution', 'Slice drift', -4, 4, 0.01, 2, 0),
    parameterOrbit: spec('evolution', 'Parameter orbit', 0, 1.5, 0.01, 2, 0),
    breathe: spec('evolution', 'Breathing', 0, 1.5, 0.01, 2, 0),

    iterations: spec('geometry', 'Iterations', 4, 128, 1, 0, 0, true),
    power: spec('geometry', 'Power', 1.2, 12, 0.01, 2, 0),
    bailout: spec('geometry', 'Bailout', 2, 64, 0.1, 1, 0),
    fold: spec('geometry', 'Fold strength', 0, 2.5, 0.01, 2, 0),
    lacunarity: spec('geometry', 'Recursive scale', 1.15, 4.5, 0.01, 2, 1),
    fractalScale: spec('geometry', 'Fractal scale', 0.2, 4, 0.01, 2, 1),
    silhouetteLock: spec('geometry', 'Silhouette lock', 0, 1, 0.01, 2, 0),
    silhouetteSoftness: spec('geometry', 'Silhouette softness', 0.001, 0.35, 0.001, 3, 0),
    shapeThreshold: spec('geometry', 'Shape threshold', 0.05, 0.95, 0.005, 3, 0),

    contourDensity: spec('shader', 'Contour density', 0, 120, 0.5, 1, 0),
    contourStrength: spec('shader', 'Contour strength', 0, 1, 0.01, 2, 0),
    glow: spec('shader', 'Orbit-trap glow', 0, 3, 0.01, 2, 0),
    recoveredMix: spec('shader', 'Recovered texture mix', 0, 1, 0.01, 2, 0),
    textureScale: spec('shader', 'Texture scale', 0.05, 12, 0.01, 2, 1),
    textureFlow: spec('shader', 'Texture flow', -3, 3, 0.01, 2, 0),
    grain: spec('shader', 'Fine grain', 0, 1.5, 0.01, 2, 0),
    chromatic: spec('shader', 'Chromatic split', 0, 0.08, 0.001, 3, 0),
    banding: spec('shader', 'Horizontal banding', 0, 1.5, 0.01, 2, 0),

    palettePhase: spec('colour', 'Palette phase', -2, 2, 0.01, 2, 0),
    paletteSpeed: spec('colour', 'Palette motion', -2, 2, 0.01, 2, 0),
    saturation: spec('colour', 'Saturation', 0, 2.5, 0.01, 2, 1),
    contrast: spec('colour', 'Contrast', 0.4, 2.5, 0.01, 2, 1),
    exposure: spec('colour', 'Exposure', 0.2, 3, 0.01, 2, 1),
    gamma: spec('colour', 'Gamma', 0.5, 2.2, 0.01, 2, 1)
  });

  const FRACTAL_MODES = Object.freeze([
    'Recursive bloom field',
    'Julia flow',
    'Mandelbrot orbit',
    'Tricorn',
    'Burning ship',
    'Folded lattice IFS'
  ]);

  const CAMERA_MODES = Object.freeze([
    'Infinite in',
    'Infinite out',
    'Orbit dive',
    'Flythrough',
    'Lissajous',
    'Breathing observer',
    'Manual'
  ]);

  const PRESETS = Object.freeze([
    preset('Fixed silhouette writher', 0, 5, 4, {
      zoomRate: 0.16, zoomBase: 1.1, centerX: 0.0, centerY: 0.0, orbitRadius: 0.04, orbitSpeed: 0.22, panSpeed: 0.04, cameraLag: 7,
      evolveSpeed: 0.8, internalRotation: 1.45, writheAmount: 0.72, writheScale: 4.2, writheSpeed: 0.9, sliceSpeed: 0.32, parameterOrbit: 0.18, breathe: 0.12,
      iterations: 38, power: 2.1, bailout: 8, fold: 0.82, lacunarity: 2.05, fractalScale: 1.0, silhouetteLock: 1, silhouetteSoftness: 0.055, shapeThreshold: 0.48,
      contourDensity: 34, contourStrength: 0.36, glow: 1.25, recoveredMix: 0.28, textureScale: 2.4, textureFlow: 0.16, grain: 0.18, chromatic: 0.006, banding: 0.18,
      palettePhase: -0.28, paletteSpeed: 0.12, saturation: 1.22, contrast: 1.06, exposure: 1.02, gamma: 1.0
    }),
    preset('Infinite descent', 0, 0, 11, {
      zoomRate: 0.58, zoomBase: 0.2, centerX: -0.07, centerY: 0.03, orbitRadius: 0.025, orbitSpeed: 0.15, panSpeed: 0.05, cameraLag: 8,
      evolveSpeed: 0.48, internalRotation: 0.42, writheAmount: 0.34, writheScale: 5.5, writheSpeed: 0.48, sliceSpeed: 0.16, parameterOrbit: 0.08, breathe: 0.04,
      iterations: 46, power: 2, bailout: 12, fold: 1.12, lacunarity: 2.0, fractalScale: 1.15, silhouetteLock: 0.72, silhouetteSoftness: 0.04, shapeThreshold: 0.45,
      contourDensity: 48, contourStrength: 0.42, glow: 1.45, recoveredMix: 0.38, textureScale: 3.5, textureFlow: 0.21, grain: 0.22, chromatic: 0.008, banding: 0.34,
      palettePhase: 0.06, paletteSpeed: 0.08, saturation: 1.3, contrast: 1.12, exposure: 1.08, gamma: 0.98
    }),
    preset('Reverse ascent', 0, 1, 17, {
      zoomRate: 0.52, zoomBase: 2.4, centerX: 0.04, centerY: -0.02, orbitRadius: 0.02, orbitSpeed: -0.18, panSpeed: 0.03, cameraLag: 9,
      evolveSpeed: 0.42, internalRotation: -0.58, writheAmount: 0.28, writheScale: 4.8, writheSpeed: 0.4, sliceSpeed: -0.12, parameterOrbit: 0.06, breathe: 0.03,
      iterations: 42, power: 2.0, bailout: 10, fold: 0.95, lacunarity: 2.0, fractalScale: 1.05, silhouetteLock: 0.8, silhouetteSoftness: 0.045, shapeThreshold: 0.47,
      contourDensity: 40, contourStrength: 0.35, glow: 1.3, recoveredMix: 0.32, textureScale: 2.8, textureFlow: -0.17, grain: 0.16, chromatic: 0.005, banding: 0.26,
      palettePhase: 0.34, paletteSpeed: -0.07, saturation: 1.18, contrast: 1.08, exposure: 1.0, gamma: 1.02
    }),
    preset('Julia gyroscope', 1, 2, 2, {
      zoomRate: 0.22, zoomBase: 0.8, centerX: 0.05, centerY: 0.0, orbitRadius: 0.11, orbitSpeed: 0.34, panSpeed: 0.06, cameraLag: 6,
      evolveSpeed: 0.76, internalRotation: 1.9, writheAmount: 0.58, writheScale: 3.6, writheSpeed: 1.15, sliceSpeed: 0.72, parameterOrbit: 0.36, breathe: 0.16,
      iterations: 64, power: 2.0, bailout: 16, fold: 0.4, lacunarity: 2.2, fractalScale: 1.0, silhouetteLock: 0.96, silhouetteSoftness: 0.03, shapeThreshold: 0.58,
      contourDensity: 58, contourStrength: 0.5, glow: 1.65, recoveredMix: 0.18, textureScale: 4.0, textureFlow: 0.34, grain: 0.24, chromatic: 0.01, banding: 0.12,
      palettePhase: -0.62, paletteSpeed: 0.18, saturation: 1.36, contrast: 1.15, exposure: 1.1, gamma: 0.96
    }),
    preset('Banded bloom horizon', 0, 3, 4, {
      zoomRate: 0.08, zoomBase: -0.2, centerX: 0.0, centerY: 0.12, orbitRadius: 0.03, orbitSpeed: 0.12, panSpeed: 0.03, cameraLag: 10,
      evolveSpeed: 0.55, internalRotation: 0.95, writheAmount: 0.86, writheScale: 2.7, writheSpeed: 0.7, sliceSpeed: 0.24, parameterOrbit: 0.16, breathe: 0.08,
      iterations: 34, power: 2.2, bailout: 9, fold: 1.35, lacunarity: 2.12, fractalScale: 0.88, silhouetteLock: 0.9, silhouetteSoftness: 0.07, shapeThreshold: 0.44,
      contourDensity: 26, contourStrength: 0.28, glow: 1.7, recoveredMix: 0.5, textureScale: 2.1, textureFlow: 0.09, grain: 0.13, chromatic: 0.012, banding: 1.08,
      palettePhase: 0.18, paletteSpeed: 0.05, saturation: 1.42, contrast: 0.96, exposure: 1.13, gamma: 1.04
    }),
    preset('Folded tunnel', 5, 3, 23, {
      zoomRate: 0.46, zoomBase: 1.4, centerX: 0.0, centerY: 0.0, orbitRadius: 0.12, orbitSpeed: 0.46, panSpeed: 0.18, cameraLag: 5,
      evolveSpeed: 0.88, internalRotation: 1.2, writheAmount: 0.46, writheScale: 4.4, writheSpeed: 0.92, sliceSpeed: 0.44, parameterOrbit: 0.22, breathe: 0.1,
      iterations: 30, power: 2.0, bailout: 14, fold: 1.8, lacunarity: 1.82, fractalScale: 1.22, silhouetteLock: 0.62, silhouetteSoftness: 0.04, shapeThreshold: 0.42,
      contourDensity: 64, contourStrength: 0.44, glow: 1.18, recoveredMix: 0.22, textureScale: 5.2, textureFlow: 0.42, grain: 0.28, chromatic: 0.014, banding: 0.2,
      palettePhase: -0.12, paletteSpeed: 0.14, saturation: 1.26, contrast: 1.2, exposure: 1.02, gamma: 0.94
    }),
    preset('Mandelbrot pilot', 2, 4, 9, {
      zoomRate: 0.31, zoomBase: 1.6, centerX: -0.743, centerY: 0.132, orbitRadius: 0.025, orbitSpeed: 0.17, panSpeed: 0.04, cameraLag: 9,
      evolveSpeed: 0.36, internalRotation: 0.28, writheAmount: 0.18, writheScale: 6.4, writheSpeed: 0.32, sliceSpeed: 0.12, parameterOrbit: 0.04, breathe: 0.02,
      iterations: 96, power: 2, bailout: 24, fold: 0.08, lacunarity: 2, fractalScale: 1, silhouetteLock: 0.84, silhouetteSoftness: 0.02, shapeThreshold: 0.63,
      contourDensity: 72, contourStrength: 0.58, glow: 1.1, recoveredMix: 0.14, textureScale: 6.5, textureFlow: 0.12, grain: 0.12, chromatic: 0.004, banding: 0.06,
      palettePhase: 0.46, paletteSpeed: 0.04, saturation: 1.2, contrast: 1.24, exposure: 1.06, gamma: 0.96
    }),
    preset('Burning-ship current', 4, 3, 26, {
      zoomRate: 0.27, zoomBase: 1.2, centerX: -1.75, centerY: -0.045, orbitRadius: 0.035, orbitSpeed: 0.2, panSpeed: 0.05, cameraLag: 8,
      evolveSpeed: 0.62, internalRotation: -0.64, writheAmount: 0.42, writheScale: 5.2, writheSpeed: 0.66, sliceSpeed: -0.22, parameterOrbit: 0.1, breathe: 0.05,
      iterations: 78, power: 2, bailout: 18, fold: 0.2, lacunarity: 2.0, fractalScale: 1, silhouetteLock: 0.78, silhouetteSoftness: 0.025, shapeThreshold: 0.6,
      contourDensity: 66, contourStrength: 0.54, glow: 1.45, recoveredMix: 0.26, textureScale: 4.7, textureFlow: -0.2, grain: 0.2, chromatic: 0.009, banding: 0.16,
      palettePhase: -0.4, paletteSpeed: 0.09, saturation: 1.38, contrast: 1.16, exposure: 1.12, gamma: 0.95
    })
  ]);

  function spec(group, label, min, max, step, digits, neutral, integer = false) {
    return Object.freeze({ group, label, min, max, step, digits, neutral, integer });
  }

  function preset(name, fractalMode, cameraMode, recoveredScene, params) {
    return Object.freeze({ name, fractalMode, cameraMode, recoveredScene, params: Object.freeze(params) });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeParameter(key, value) {
    const spec = PARAMETER_SPECS[key];
    if (!spec) throw new RangeError('Unknown explorer parameter: ' + key);
    let normalized = clamp(Number(value), spec.min, spec.max);
    if (spec.integer) normalized = Math.round(normalized);
    return normalized;
  }

  class ExplorerState {
    constructor(presetIndex = 0) {
      this.params = {};
      this.groupBaselines = {};
      this.groupFactors = {};
      this.presetIndex = 0;
      this.fractalMode = 0;
      this.cameraMode = 0;
      this.recoveredScene = 0;
      this.applyPreset(presetIndex);
    }

    applyPreset(index) {
      const id = clamp(Math.trunc(index), 0, PRESETS.length - 1);
      const preset = PRESETS[id];
      this.presetIndex = id;
      this.fractalMode = preset.fractalMode;
      this.cameraMode = preset.cameraMode;
      this.recoveredScene = preset.recoveredScene;
      this.params = {};
      for (const [key, spec] of Object.entries(PARAMETER_SPECS)) {
        this.params[key] = normalizeParameter(key, preset.params[key] ?? spec.neutral);
      }
      this.captureAllBaselines();
      for (const group of Object.keys(GROUP_SPECS)) this.groupFactors[group] = 1;
      return preset;
    }

    captureAllBaselines() {
      for (const group of Object.keys(GROUP_SPECS)) this.captureGroupBaseline(group);
    }

    captureGroupBaseline(group) {
      if (!GROUP_SPECS[group]) throw new RangeError('Unknown explorer group: ' + group);
      const baseline = {};
      for (const [key, spec] of Object.entries(PARAMETER_SPECS)) {
        if (spec.group === group) baseline[key] = this.params[key];
      }
      this.groupBaselines[group] = baseline;
      return baseline;
    }

    setParameter(key, value, rebase = false) {
      this.params[key] = normalizeParameter(key, value);
      if (rebase) {
        const group = PARAMETER_SPECS[key].group;
        this.captureGroupBaseline(group);
        this.groupFactors[group] = 1;
      }
      return this.params[key];
    }

    applyGroupMacro(group, factor) {
      const groupSpec = GROUP_SPECS[group];
      if (!groupSpec) throw new RangeError('Unknown explorer group: ' + group);
      const amount = clamp(Number(factor), groupSpec.min, groupSpec.max);
      const baseline = this.groupBaselines[group] || this.captureGroupBaseline(group);
      this.groupFactors[group] = amount;
      for (const [key, base] of Object.entries(baseline)) {
        const spec = PARAMETER_SPECS[key];
        const neutral = Number(spec.neutral ?? 0);
        this.params[key] = normalizeParameter(key, neutral + (base - neutral) * amount);
      }
      return this.params;
    }

    restore(snapshot) {
      if (!snapshot || typeof snapshot !== 'object') throw new TypeError('Explorer snapshot must be an object.');
      this.applyPreset(snapshot.presetIndex ?? 0);
      this.fractalMode = clamp(Math.trunc(Number(snapshot.fractalMode ?? this.fractalMode)), 0, FRACTAL_MODES.length - 1);
      this.cameraMode = clamp(Math.trunc(Number(snapshot.cameraMode ?? this.cameraMode)), 0, CAMERA_MODES.length - 1);
      this.recoveredScene = Math.max(0, Math.trunc(Number(snapshot.recoveredScene ?? this.recoveredScene)));

      if (snapshot.params && typeof snapshot.params === 'object') {
        for (const key of Object.keys(PARAMETER_SPECS)) {
          if (Object.prototype.hasOwnProperty.call(snapshot.params, key)) {
            this.params[key] = normalizeParameter(key, snapshot.params[key]);
          }
        }
      }

      if (snapshot.groupBaselines && typeof snapshot.groupBaselines === 'object') {
        for (const group of Object.keys(GROUP_SPECS)) {
          const incoming = snapshot.groupBaselines[group];
          if (!incoming || typeof incoming !== 'object') continue;
          const baseline = {};
          for (const [key, spec] of Object.entries(PARAMETER_SPECS)) {
            if (spec.group !== group || !Object.prototype.hasOwnProperty.call(incoming, key)) continue;
            baseline[key] = normalizeParameter(key, incoming[key]);
          }
          if (Object.keys(baseline).length) this.groupBaselines[group] = baseline;
        }
      }

      for (const group of Object.keys(GROUP_SPECS)) {
        if (!this.groupBaselines[group]) this.captureGroupBaseline(group);
        const spec = GROUP_SPECS[group];
        const factor = snapshot.groupFactors && Object.prototype.hasOwnProperty.call(snapshot.groupFactors, group)
          ? Number(snapshot.groupFactors[group])
          : 1;
        this.groupFactors[group] = clamp(Number.isFinite(factor) ? factor : 1, spec.min, spec.max);
      }
      return this.snapshot();
    }

    snapshot() {
      const groupBaselines = {};
      for (const [group, baseline] of Object.entries(this.groupBaselines)) {
        groupBaselines[group] = Object.freeze({ ...baseline });
      }
      return Object.freeze({
        presetIndex: this.presetIndex,
        fractalMode: this.fractalMode,
        cameraMode: this.cameraMode,
        recoveredScene: this.recoveredScene,
        params: Object.freeze({ ...this.params }),
        groupBaselines: Object.freeze(groupBaselines),
        groupFactors: Object.freeze({ ...this.groupFactors })
      });
    }
  }

  function cameraSample(state, time, manual = {}) {
    const p = state.params;
    const t = Number(time) || 0;
    const manualX = Number(manual.x) || 0;
    const manualY = Number(manual.y) || 0;
    const manualZoom = Number(manual.zoom) || 0;
    let zoomRate = p.zoomRate;
    let x = p.centerX + manualX;
    let y = p.centerY + manualY;
    let logZoom = p.zoomBase + manualZoom;
    const mode = state.cameraMode;

    if (mode === 0) {
      zoomRate = Math.abs(zoomRate);
    } else if (mode === 1) {
      zoomRate = -Math.abs(zoomRate);
    } else if (mode === 2) {
      const angle = t * p.orbitSpeed;
      x += Math.cos(angle) * p.orbitRadius;
      y += Math.sin(angle) * p.orbitRadius;
      logZoom += t * zoomRate;
    } else if (mode === 3) {
      const travel = t * p.panSpeed;
      x += (Math.sin(travel * 0.73) + 0.4 * Math.sin(travel * 1.91 + 1.3)) * p.orbitRadius;
      y += (Math.cos(travel * 0.51 + 0.7) + 0.35 * Math.sin(travel * 1.37)) * p.orbitRadius;
      logZoom += t * zoomRate;
    } else if (mode === 4) {
      const phase = t * Math.max(0.01, Math.abs(p.orbitSpeed));
      x += Math.sin(phase * 1.37) * p.orbitRadius;
      y += Math.sin(phase * 0.83 + 1.2) * p.orbitRadius * 0.75;
      logZoom += t * zoomRate;
    } else if (mode === 5) {
      logZoom += Math.sin(t * Math.max(0.05, Math.abs(p.zoomRate))) * (1.2 + Math.abs(p.zoomRate));
    }

    if (mode === 0 || mode === 1) logZoom += t * zoomRate;
    return Object.freeze({ x, y, logZoom });
  }

  return Object.freeze({
    GROUP_SPECS,
    PARAMETER_SPECS,
    FRACTAL_MODES,
    CAMERA_MODES,
    PRESETS,
    ExplorerState,
    normalizeParameter,
    cameraSample
  });
});
