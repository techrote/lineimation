(function () {
  'use strict';

  const Explorer = window.LineimationExplorer;
  const Recovered = window.LineimationCore;
  const canvas = document.getElementById('canvas');
  const fatal = document.getElementById('fatal');
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance'
  });

  if (!gl) {
    fatal.textContent = 'WebGL2 is required for LINEIMATION fractal exploration.';
    fatal.classList.remove('hidden');
    return;
  }

  const VERTEX = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uCenter;
uniform float uLogZoom;
uniform int uFractalMode;
uniform int uIterations;

uniform float uPower;
uniform float uBailout;
uniform float uFold;
uniform float uLacunarity;
uniform float uFractalScale;
uniform float uSilhouetteLock;
uniform float uSilhouetteSoftness;
uniform float uShapeThreshold;

uniform float uEvolveSpeed;
uniform float uInternalRotation;
uniform float uWritheAmount;
uniform float uWritheScale;
uniform float uWritheSpeed;
uniform float uSliceSpeed;
uniform float uParameterOrbit;
uniform float uBreathe;

uniform float uContourDensity;
uniform float uContourStrength;
uniform float uGlow;
uniform float uRecoveredMix;
uniform float uTextureScale;
uniform float uTextureFlow;
uniform float uGrain;
uniform float uChromatic;
uniform float uBanding;

uniform float uPalettePhase;
uniform float uPaletteSpeed;
uniform float uSaturation;
uniform float uContrast;
uniform float uExposure;
uniform float uGamma;

uniform sampler2D uDetail;

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

struct Field {
  float shape;
  float smoothIter;
  float trap;
  float energy;
};

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

vec2 cpowv(vec2 z, float p) {
  float r = max(length(z), 1e-8);
  float a = atan(z.y, z.x);
  float rp = pow(r, p);
  return rp * vec2(cos(a * p), sin(a * p));
}

vec2 dynamicDomain(vec2 p, float t, float moving) {
  if (moving < 0.5) return p;
  float local = t * uEvolveSpeed;
  float angle = t * uInternalRotation + 0.18 * sin(local * 0.37);
  p = rot(angle) * p;
  float w = uWritheAmount;
  float s = max(0.05, uWritheScale);
  p += w * 0.11 * vec2(
    sin(p.y * s + t * uWritheSpeed + sin(p.x * s * 0.37)),
    cos(p.x * s * 0.91 - t * uWritheSpeed * 0.83 + sin(p.y * s * 0.29))
  );
  p *= 1.0 + 0.075 * uBreathe * sin(local + length(p) * 2.0);
  return p;
}

Field recursiveBloom(vec2 p, float t, float moving) {
  vec2 q = dynamicDomain(p * uFractalScale, t, moving);
  float trap = 1e9;
  float energy = 0.0;
  float scaleAcc = 1.0;
  float slice = moving * t * uSliceSpeed;
  int count = min(uIterations, 72);

  for (int i = 0; i < 72; ++i) {
    if (i >= count) break;
    float fi = float(i);
    float a = 0.37 + uFold * 0.11 + moving * 0.08 * sin(slice + fi * 0.31);
    q = rot(a) * q;
    q = abs(q);
    q -= vec2(
      0.54 + 0.12 * sin(fi * 0.73 + slice),
      0.43 + 0.10 * cos(fi * 0.61 - slice * 0.7)
    );
    q *= max(1.05, uLacunarity);
    float ring = abs(length(q) - (0.38 + 0.12 * sin(fi * 0.47 + slice)));
    trap = min(trap, ring / max(scaleAcc, 1e-5));
    energy += exp(-5.5 * ring) / (1.0 + fi * 0.16);
    scaleAcc *= max(1.05, uLacunarity);
    if (scaleAcc > 1e7) break;
  }

  float shape = exp(-trap * 9.0);
  shape = smoothstep(uShapeThreshold - uSilhouetteSoftness,
                     uShapeThreshold + uSilhouetteSoftness,
                     shape);
  return Field(shape, energy * 7.0, trap, energy);
}

Field foldedIFS(vec2 p, float t, float moving) {
  vec2 q = dynamicDomain(p * uFractalScale, t, moving);
  float trap = 1e9;
  float energy = 0.0;
  float local = moving * t * uEvolveSpeed;
  int count = min(uIterations, 72);

  for (int i = 0; i < 72; ++i) {
    if (i >= count) break;
    float fi = float(i);
    q = abs(q);
    q -= vec2(0.52, 0.39) + 0.09 * vec2(sin(local + fi), cos(local * 0.7 - fi * 0.83));
    q = rot(0.82 + uFold * 0.23 + moving * 0.12 * sin(local + fi * 0.4)) * q;
    q *= max(1.05, uLacunarity);
    float d = min(abs(q.x), abs(q.y));
    trap = min(trap, d / (1.0 + fi));
    energy += exp(-3.0 * length(q - round(q)));
  }

  float shape = exp(-trap * 16.0);
  shape = smoothstep(uShapeThreshold - uSilhouetteSoftness,
                     uShapeThreshold + uSilhouetteSoftness,
                     shape);
  return Field(shape, energy * 0.6, trap, energy);
}

Field escapeField(vec2 p, float t, float moving, int mode) {
  vec2 pp = dynamicDomain(p * uFractalScale, t, moving);
  float local = moving * t * uEvolveSpeed;
  vec2 orbit = uParameterOrbit * vec2(cos(local * 0.71), sin(local * 0.83));
  vec2 z = vec2(0.0);
  vec2 c = pp;
  if (mode == 1) {
    z = pp;
    c = vec2(-0.72, 0.27) + orbit * 0.22 + vec2(
      0.08 * sin(t * uSliceSpeed),
      0.07 * cos(t * uSliceSpeed * 0.73)
    );
  }

  float trap = 1e9;
  float r2 = 0.0;
  int n = 0;
  for (int i = 0; i < 128; ++i) {
    if (i >= uIterations) break;
    vec2 a = z;
    if (mode == 3) a.y = -a.y;
    if (mode == 4) a = abs(a);
    if (mode == 1 || mode == 2 || mode == 3 || mode == 4) {
      z = cpowv(a, uPower) + c;
    }
    trap = min(trap, abs(z.x * z.y) + 0.11 * abs(z.x + z.y));
    r2 = dot(z, z);
    n = i + 1;
    if (r2 > uBailout * uBailout) break;
  }

  float escaped = r2 > uBailout * uBailout ? 1.0 : 0.0;
  float rr = max(sqrt(max(r2, 1e-10)), 1.000001);
  float smoothN = float(n);
  if (escaped > 0.5) {
    smoothN = float(n) + 1.0 - log2(max(log2(rr), 1e-6));
  }

  float iterFrac = float(n) / max(1.0, float(uIterations));
  float shape = smoothstep(
    uShapeThreshold - uSilhouetteSoftness,
    uShapeThreshold + uSilhouetteSoftness,
    iterFrac
  );
  float energy = exp(-trap * 6.0);
  return Field(shape, smoothN, trap, energy);
}

Field sampleField(vec2 p, float t, float moving) {
  if (uFractalMode == 0) return recursiveBloom(p, t, moving);
  if (uFractalMode == 5) return foldedIFS(p, t, moving);
  return escapeField(p, t, moving, uFractalMode);
}

vec3 palette(float x) {
  vec3 a = vec3(0.48, 0.50, 0.55);
  vec3 b = vec3(0.46, 0.42, 0.38);
  vec3 c = vec3(1.00, 0.83, 0.61);
  vec3 d = vec3(0.06, 0.20, 0.39) + vec3(uPalettePhase * 0.11, uPalettePhase * 0.07, -uPalettePhase * 0.08);
  return a + b * cos(TAU * (c * x + d));
}

vec3 grade(vec3 color) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = vec3(luma) + (color - vec3(luma)) * uSaturation;
  color = (color - 0.5) * uContrast + 0.5;
  color *= uExposure;
  color = pow(max(color, vec3(0.0)), vec3(1.0 / max(0.05, uGamma)));
  return color;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * uResolution) / max(1.0, uResolution.y);

  float logZoom = uLogZoom;
  float zoom;
  if (uFractalMode == 0 || uFractalMode == 5) {
    float period = max(0.22, log2(max(1.16, uLacunarity)));
    float localLog = mod(logZoom, period);
    if (localLog < 0.0) localLog += period;
    zoom = exp2(localLog);
  } else {
    zoom = exp2(clamp(logZoom, -22.0, 22.0));
  }

  vec2 p = uCenter + uv * 2.2 / max(1e-7, zoom);

  Field base = sampleField(p, 0.0, 0.0);
  Field moving = sampleField(p, uTime, 1.0);
  float silhouette = mix(moving.shape, base.shape, uSilhouetteLock);

  float iterSignal = moving.smoothIter * 0.031 + moving.energy * 0.15;
  float contourPhase = fract(iterSignal * max(0.0, uContourDensity));
  float contour = 1.0 - smoothstep(0.08, 0.34, abs(contourPhase - 0.5) * 2.0);
  contour *= uContourStrength;

  vec2 texUv = fract(
    p * uTextureScale +
    vec2(uTime * uTextureFlow * 0.019, -uTime * uTextureFlow * 0.013) +
    0.025 * uWritheAmount * vec2(sin(moving.smoothIter), cos(moving.smoothIter))
  );
  vec3 recovered = texture(uDetail, texUv).rgb;

  float phase = iterSignal + uPalettePhase + uTime * uPaletteSpeed * 0.035;
  vec3 color = palette(phase);
  color += uGlow * moving.energy * vec3(0.32, 0.18, 0.42);
  color = mix(color, recovered, clamp(uRecoveredMix * (0.35 + moving.energy), 0.0, 0.92));

  float bands = 0.5 + 0.5 * sin((p.y * 34.0 + moving.smoothIter * 0.19) + uTime * 0.17);
  color *= mix(1.0, 0.58 + 0.72 * bands, clamp(uBanding, 0.0, 1.5));

  float edge = abs(base.shape - moving.shape);
  color += contour * vec3(0.22, 0.28, 0.34);
  color += edge * (1.0 - uSilhouetteLock) * vec3(0.4, 0.2, 0.3);

  float grain = hash21(frag + floor(uTime * 60.0));
  color += (grain - 0.5) * uGrain * 0.09;

  float interior = mix(0.16 + moving.energy * 0.4, 1.0, silhouette);
  color *= interior;

  if (uChromatic > 0.0001) {
    float split = uChromatic * (0.5 + moving.energy);
    color.r += split * sin(moving.smoothIter * 0.7 + uTime);
    color.b += split * cos(moving.smoothIter * 0.6 - uTime * 0.8);
  }

  color = grade(color);
  fragColor = vec4(clamp(color, 0.0, 8.0), 1.0);
}`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || 'unknown shader error';
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  function createProgram() {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'program link failed');
    }
    return program;
  }

  let program;
  try {
    program = createProgram();
  } catch (error) {
    fatal.textContent = 'Shader compilation failed:\n\n' + error.message;
    fatal.classList.remove('hidden');
    return;
  }

  const uniformNames = [
    'uResolution','uTime','uCenter','uLogZoom','uFractalMode','uIterations',
    'uPower','uBailout','uFold','uLacunarity','uFractalScale','uSilhouetteLock','uSilhouetteSoftness','uShapeThreshold',
    'uEvolveSpeed','uInternalRotation','uWritheAmount','uWritheScale','uWritheSpeed','uSliceSpeed','uParameterOrbit','uBreathe',
    'uContourDensity','uContourStrength','uGlow','uRecoveredMix','uTextureScale','uTextureFlow','uGrain','uChromatic','uBanding',
    'uPalettePhase','uPaletteSpeed','uSaturation','uContrast','uExposure','uGamma','uDetail'
  ];
  const uniforms = Object.fromEntries(uniformNames.map(name => [name, gl.getUniformLocation(program, name)]));

  const state = new Explorer.ExplorerState(0);
  const parameterBindings = new Map();
  const macroBindings = new Map();
  const manual = { x: 0, y: 0, zoom: 0 };
  const STORAGE_KEY = 'lineimation.explorer.state.v1';
  let paused = false;
  let cameraLocked = false;
  let hiddenUi = false;
  let simTime = 0;
  let lastNow = performance.now();
  let smoothCamera = Explorer.cameraSample(state, 0, manual);
  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  let customTexture = false;

  const els = {
    preset: document.getElementById('preset'),
    fractal: document.getElementById('fractalMode'),
    camera: document.getElementById('cameraMode'),
    recovered: document.getElementById('recoveredScene'),
    textureFile: document.getElementById('textureFile'),
    restoreRecovered: document.getElementById('restoreRecoveredButton'),
    macros: document.getElementById('groupMacros'),
    experts: document.getElementById('expertControls'),
    pause: document.getElementById('pauseButton'),
    cameraLock: document.getElementById('cameraLockButton'),
    save: document.getElementById('saveButton'),
    recenter: document.getElementById('recenterButton'),
    reset: document.getElementById('resetButton'),
    shot: document.getElementById('shotButton'),
    fps: document.getElementById('fpsReadout'),
    zoom: document.getElementById('zoomReadout'),
    mode: document.getElementById('modeReadout'),
    status: document.getElementById('status')
  };

  function resize(force = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(2, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(2, Math.floor(canvas.clientHeight * dpr));
    if (force || canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  function uploadPixels(width, height, pixels) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  function buildRecoveredTexture(sceneId) {
    const width = 256;
    const height = 144;
    const engine = new Recovered.LineimationEngine(width, height, { ringFrames: 20, sceneId });
    engine.setSource(Recovered.makeTestPattern(width, height));
    uploadPixels(width, height, engine.sceneSource || engine.current);
    customTexture = false;
    els.status.textContent = 'recovered texture scene ' + String(sceneId).padStart(2, '0');
  }

  function uploadImage(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      URL.revokeObjectURL(url);
      customTexture = true;
      els.status.textContent = 'detail image · ' + file.name;
    };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  }

  function addOptions(select, labels) {
    labels.forEach((label, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = label;
      select.appendChild(option);
    });
  }

  Explorer.PRESETS.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = preset.name;
    els.preset.appendChild(option);
  });
  addOptions(els.fractal, Explorer.FRACTAL_MODES);
  addOptions(els.camera, Explorer.CAMERA_MODES);
  for (let i = 0; i < Recovered.RECOVERED_SCENES.length; i += 1) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = Recovered.RECOVERED_SCENES[i].name;
    els.recovered.appendChild(option);
  }

  function formatParameter(key, value) {
    const spec = Explorer.PARAMETER_SPECS[key];
    return spec.integer ? String(Math.round(value)) : Number(value).toFixed(spec.digits);
  }

  function setNumberAttributes(input, spec) {
    input.type = 'number';
    input.className = 'numeric-input';
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
  }

  function syncParameterGroup(group) {
    for (const [key, binding] of parameterBindings) {
      if (binding.group !== group) continue;
      const value = state.params[key];
      binding.range.value = String(value);
      binding.number.value = formatParameter(key, value);
    }
  }

  function syncAllParameters() {
    for (const group of Object.keys(Explorer.GROUP_SPECS)) syncParameterGroup(group);
  }

  function syncMacros() {
    for (const [group, binding] of macroBindings) {
      const factor = Number(state.groupFactors[group] ?? 1);
      binding.range.value = String(factor);
      binding.number.value = factor.toFixed(2);
    }
  }

  function commitMacro(group, rawValue) {
    const spec = Explorer.GROUP_SPECS[group];
    const parsed = Number(rawValue);
    const value = Number.isFinite(parsed) ? parsed : Number(state.groupFactors[group] ?? 1);
    state.applyGroupMacro(group, value);
    syncMacros();
    syncParameterGroup(group);
  }

  function commitParameter(key, rawValue) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      syncParameterGroup(Explorer.PARAMETER_SPECS[key].group);
      return;
    }
    const group = Explorer.PARAMETER_SPECS[key].group;
    state.setParameter(key, parsed, true);
    syncParameterGroup(group);
    syncMacros();
  }

  function enterCommits(input, commit) {
    input.addEventListener('change', commit);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
        input.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        input.blur();
      }
    });
  }

  function buildControls() {
    for (const [group, groupSpec] of Object.entries(Explorer.GROUP_SPECS)) {
      const macroRow = document.createElement('label');
      macroRow.className = 'macro-row';
      const macroName = document.createElement('span');
      macroName.textContent = groupSpec.label;

      const macroRange = document.createElement('input');
      macroRange.type = 'range';
      macroRange.min = String(groupSpec.min);
      macroRange.max = String(groupSpec.max);
      macroRange.step = String(groupSpec.step);
      macroRange.value = '1';

      const macroNumber = document.createElement('input');
      setNumberAttributes(macroNumber, groupSpec);
      macroNumber.value = '1.00';

      macroRange.addEventListener('input', () => commitMacro(group, macroRange.value));
      enterCommits(macroNumber, () => commitMacro(group, macroNumber.value));
      macroRange.addEventListener('dblclick', () => commitMacro(group, 1));
      macroNumber.addEventListener('dblclick', () => commitMacro(group, 1));

      macroRow.append(macroName, macroRange, macroNumber);
      els.macros.appendChild(macroRow);
      macroBindings.set(group, { range: macroRange, number: macroNumber });

      const details = document.createElement('details');
      details.className = 'parameter-group';
      if (group === 'camera' || group === 'evolution' || group === 'geometry') details.open = true;
      const summary = document.createElement('summary');
      summary.textContent = groupSpec.label + ' parameters';
      details.appendChild(summary);
      const body = document.createElement('div');
      body.className = 'parameter-body';

      for (const [key, spec] of Object.entries(Explorer.PARAMETER_SPECS)) {
        if (spec.group !== group) continue;
        const row = document.createElement('label');
        row.className = 'parameter-row';
        const name = document.createElement('span');
        name.textContent = spec.label;

        const range = document.createElement('input');
        range.type = 'range';
        range.min = String(spec.min);
        range.max = String(spec.max);
        range.step = String(spec.step);

        const number = document.createElement('input');
        setNumberAttributes(number, spec);

        range.addEventListener('input', () => commitParameter(key, range.value));
        enterCommits(number, () => commitParameter(key, number.value));

        row.append(name, range, number);
        body.appendChild(row);
        parameterBindings.set(key, { range, number, group });
      }
      details.appendChild(body);
      els.experts.appendChild(details);
    }
  }

  function syncSelectors() {
    els.preset.value = String(state.presetIndex);
    els.fractal.value = String(state.fractalMode);
    els.camera.value = String(state.cameraMode);
    els.recovered.value = String(state.recoveredScene);
  }

  function updatePauseButton() {
    els.pause.textContent = paused ? 'RESUME' : 'PAUSE';
  }

  function updateCameraLockButton() {
    els.cameraLock.textContent = cameraLocked ? 'UNLOCK CAMERA' : 'LOCK CAMERA';
    els.cameraLock.classList.toggle('active', cameraLocked);
    els.cameraLock.setAttribute('aria-pressed', String(cameraLocked));
  }

  function applyPreset(index) {
    const preset = state.applyPreset(Number(index));
    manual.x = 0;
    manual.y = 0;
    manual.zoom = 0;
    simTime = 0;
    cameraLocked = false;
    syncSelectors();
    syncMacros();
    syncAllParameters();
    buildRecoveredTexture(state.recoveredScene);
    smoothCamera = Explorer.cameraSample(state, 0, manual);
    updateCameraLockButton();
    els.status.textContent = preset.name;
  }

  function saveState() {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      explorer: state.snapshot(),
      manual: { ...manual },
      simTime,
      cameraLocked,
      camera: { ...smoothCamera },
      paused,
      texture: {
        kind: customTexture ? 'custom' : 'recovered',
        recoveredScene: state.recoveredScene
      }
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      els.status.textContent = customTexture
        ? 'saved · custom image is not embedded; recovered texture will restore after reload'
        : 'saved explorer state';
    } catch (error) {
      els.status.textContent = 'save failed · ' + error.message;
    }
  }

  function finiteOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function restoreSavedState() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
    if (!raw) return false;

    try {
      const payload = JSON.parse(raw);
      if (!payload || payload.version !== 1 || !payload.explorer) return false;
      state.restore(payload.explorer);
      manual.x = finiteOr(payload.manual && payload.manual.x, 0);
      manual.y = finiteOr(payload.manual && payload.manual.y, 0);
      manual.zoom = finiteOr(payload.manual && payload.manual.zoom, 0);
      simTime = finiteOr(payload.simTime, 0);
      paused = Boolean(payload.paused);
      cameraLocked = Boolean(payload.cameraLocked);

      const fallbackCamera = Explorer.cameraSample(state, simTime, manual);
      smoothCamera = {
        x: finiteOr(payload.camera && payload.camera.x, fallbackCamera.x),
        y: finiteOr(payload.camera && payload.camera.y, fallbackCamera.y),
        logZoom: finiteOr(payload.camera && payload.camera.logZoom, fallbackCamera.logZoom)
      };

      syncSelectors();
      syncMacros();
      syncAllParameters();
      buildRecoveredTexture(state.recoveredScene);
      updatePauseButton();
      updateCameraLockButton();
      els.status.textContent = payload.texture && payload.texture.kind === 'custom'
        ? 'restored saved state · custom image was not embedded'
        : 'restored saved state';
      return true;
    } catch (error) {
      els.status.textContent = 'saved state invalid · ' + error.message;
      return false;
    }
  }

  function toggleCameraLock(force) {
    cameraLocked = force === undefined ? !cameraLocked : Boolean(force);
    updateCameraLockButton();
    els.status.textContent = cameraLocked
      ? 'camera locked · fractal evolution continues'
      : 'camera unlocked · automatic path resumed';
  }

  function setUniform1f(name, value) {
    if (uniforms[name] !== null) gl.uniform1f(uniforms[name], value);
  }

  function sendUniforms(camera) {
    const p = state.params;
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    setUniform1f('uTime', simTime);
    gl.uniform2f(uniforms.uCenter, camera.x, camera.y);
    setUniform1f('uLogZoom', camera.logZoom);
    gl.uniform1i(uniforms.uFractalMode, state.fractalMode);
    gl.uniform1i(uniforms.uIterations, Math.round(p.iterations));
    setUniform1f('uPower', p.power);
    setUniform1f('uBailout', p.bailout);
    setUniform1f('uFold', p.fold);
    setUniform1f('uLacunarity', p.lacunarity);
    setUniform1f('uFractalScale', p.fractalScale);
    setUniform1f('uSilhouetteLock', p.silhouetteLock);
    setUniform1f('uSilhouetteSoftness', p.silhouetteSoftness);
    setUniform1f('uShapeThreshold', p.shapeThreshold);
    setUniform1f('uEvolveSpeed', p.evolveSpeed);
    setUniform1f('uInternalRotation', p.internalRotation);
    setUniform1f('uWritheAmount', p.writheAmount);
    setUniform1f('uWritheScale', p.writheScale);
    setUniform1f('uWritheSpeed', p.writheSpeed);
    setUniform1f('uSliceSpeed', p.sliceSpeed);
    setUniform1f('uParameterOrbit', p.parameterOrbit);
    setUniform1f('uBreathe', p.breathe);
    setUniform1f('uContourDensity', p.contourDensity);
    setUniform1f('uContourStrength', p.contourStrength);
    setUniform1f('uGlow', p.glow);
    setUniform1f('uRecoveredMix', p.recoveredMix);
    setUniform1f('uTextureScale', p.textureScale);
    setUniform1f('uTextureFlow', p.textureFlow);
    setUniform1f('uGrain', p.grain);
    setUniform1f('uChromatic', p.chromatic);
    setUniform1f('uBanding', p.banding);
    setUniform1f('uPalettePhase', p.palettePhase);
    setUniform1f('uPaletteSpeed', p.paletteSpeed);
    setUniform1f('uSaturation', p.saturation);
    setUniform1f('uContrast', p.contrast);
    setUniform1f('uExposure', p.exposure);
    setUniform1f('uGamma', p.gamma);
    gl.uniform1i(uniforms.uDetail, 0);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  let fpsFrames = 0;
  let fpsStart = performance.now();

  function frame(now) {
    resize();
    const dt = Math.min(0.05, Math.max(0.0001, (now - lastNow) / 1000));
    lastNow = now;
    if (!paused) simTime += dt;

    if (!cameraLocked) {
      const desired = Explorer.cameraSample(state, simTime, manual);
      const response = 1 - Math.exp(-dt * Math.max(0.2, state.params.cameraLag));
      smoothCamera = {
        x: lerp(smoothCamera.x, desired.x, response),
        y: lerp(smoothCamera.y, desired.y, response),
        logZoom: lerp(smoothCamera.logZoom, desired.logZoom, response)
      };
    }

    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    sendUniforms(smoothCamera);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    fpsFrames += 1;
    if (now - fpsStart >= 600) {
      const fps = fpsFrames * 1000 / (now - fpsStart);
      fpsFrames = 0;
      fpsStart = now;
      els.fps.textContent = fps.toFixed(1) + ' fps';
    }
    els.zoom.textContent = 'zoom 2^' + smoothCamera.logZoom.toFixed(2) + (cameraLocked ? ' · LOCKED' : '');
    els.mode.textContent = Explorer.FRACTAL_MODES[state.fractalMode] + ' · ' + Explorer.CAMERA_MODES[state.cameraMode];
    requestAnimationFrame(frame);
  }

  buildControls();

  els.preset.addEventListener('change', () => applyPreset(els.preset.value));
  els.fractal.addEventListener('change', () => {
    state.fractalMode = Number(els.fractal.value);
    els.status.textContent = Explorer.FRACTAL_MODES[state.fractalMode];
  });
  els.camera.addEventListener('change', () => {
    state.cameraMode = Number(els.camera.value);
    els.status.textContent = Explorer.CAMERA_MODES[state.cameraMode];
  });
  els.recovered.addEventListener('change', () => {
    state.recoveredScene = Number(els.recovered.value);
    buildRecoveredTexture(state.recoveredScene);
  });
  els.textureFile.addEventListener('change', event => uploadImage(event.target.files && event.target.files[0]));
  els.restoreRecovered.addEventListener('click', () => buildRecoveredTexture(state.recoveredScene));

  els.pause.addEventListener('click', () => {
    paused = !paused;
    updatePauseButton();
  });
  els.cameraLock.addEventListener('click', () => toggleCameraLock());
  els.save.addEventListener('click', saveState);
  els.recenter.addEventListener('click', () => {
    manual.x = manual.y = manual.zoom = 0;
    smoothCamera = Explorer.cameraSample(state, simTime, manual);
  });
  els.reset.addEventListener('click', () => applyPreset(state.presetIndex));
  els.shot.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'lineimation-fractal-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    dragX = event.clientX;
    dragY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    const dx = event.clientX - dragX;
    const dy = event.clientY - dragY;
    dragX = event.clientX;
    dragY = event.clientY;
    const scale = Math.pow(2, -Math.min(20, Math.max(-20, smoothCamera.logZoom)));
    const worldX = dx / Math.max(1, canvas.clientHeight) * scale * 2.2;
    const worldY = dy / Math.max(1, canvas.clientHeight) * scale * 2.2;
    manual.x -= worldX;
    manual.y += worldY;
    if (cameraLocked) {
      smoothCamera.x -= worldX;
      smoothCamera.y += worldY;
    }
  });
  canvas.addEventListener('pointerup', event => {
    dragging = false;
    canvas.releasePointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointercancel', () => dragging = false);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const delta = -event.deltaY * 0.0025;
    manual.zoom += delta;
    if (cameraLocked) smoothCamera.logZoom += delta;
  }, { passive: false });

  window.addEventListener('keydown', event => {
    const tag = event.target && event.target.tagName;
    const editing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveState();
      return;
    }
    if (editing) return;
    if (event.code === 'Space') {
      event.preventDefault();
      paused = !paused;
      updatePauseButton();
    } else if (event.key.toLowerCase() === 'l') {
      toggleCameraLock();
    } else if (event.key.toLowerCase() === 'r') {
      applyPreset(state.presetIndex);
    } else if (event.key.toLowerCase() === 'h') {
      hiddenUi = !hiddenUi;
      document.body.classList.toggle('uiHidden', hiddenUi);
    } else if (event.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  });

  window.addEventListener('resize', () => resize(true));
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    fatal.textContent = 'WebGL context lost. Reload to rebuild the fractal renderer.';
    fatal.classList.remove('hidden');
  });

  if (!restoreSavedState()) applyPreset(0);
  resize(true);
  gl.useProgram(program);
  lastNow = performance.now();
  requestAnimationFrame(frame);
})();
