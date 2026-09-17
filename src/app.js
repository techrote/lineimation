(function () {
  'use strict';

  const Core = window.LineimationCore;
  const Curves = window.LineimationCurves;
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scratch = document.createElement('canvas');
  const scratchCtx = scratch.getContext('2d', { alpha: false, willReadFrequently: true });

  const els = {
    file: document.getElementById('fileInput'),
    scene: document.getElementById('sceneMode'),
    curve: document.getElementById('curveMode'),
    resetScene: document.getElementById('resetSceneButton'),
    macros: document.getElementById('groupMacros'),
    experts: document.getElementById('expertControls'),
    ring: document.getElementById('ringFrames'),
    ringOut: document.getElementById('ringFramesOut'),
    fps: document.getElementById('fps'),
    fpsOut: document.getElementById('fpsOut'),
    play: document.getElementById('playButton'),
    step: document.getElementById('stepButton'),
    reset: document.getElementById('resetButton'),
    test: document.getElementById('testPatternButton'),
    exportPng: document.getElementById('exportButton'),
    curveOverlay: document.getElementById('curveOverlay'),
    frame: document.getElementById('frameReadout'),
    sceneReadout: document.getElementById('sceneReadout'),
    status: document.getElementById('status'),
    checksum: document.getElementById('checksum'),
    memory: document.getElementById('memoryReadout')
  };

  const WIDTH = 640;
  const HEIGHT = 360;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  scratch.width = WIDTH;
  scratch.height = HEIGHT;

  let engine = new Core.LineimationEngine(WIDTH, HEIGHT, { ringFrames: 24, sceneId: 0 });
  let playing = true;
  let lastTick = performance.now();
  let accumulator = 0;
  let lastFpsUpdate = performance.now();
  let renderedFrames = 0;

  const parameterInputs = new Map();
  const macroInputs = new Map();

  for (const scene of Core.RECOVERED_SCENES) {
    const option = document.createElement('option');
    option.value = scene.id;
    option.textContent = scene.name;
    els.scene.appendChild(option);
  }

  for (const [value, name] of Object.entries(Curves.CURVE_NAMES)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = name;
    els.curve.appendChild(option);
  }

  function setStatus(message) {
    els.status.textContent = message;
  }

  function updateMemory() {
    const mib = engine.atlas.data.byteLength / (1024 * 1024);
    els.memory.textContent = mib.toFixed(1) + ' MiB ring';
  }

  function formatParameter(key, value) {
    const spec = Core.PARAMETER_SPECS[key];
    if (spec.integer) return String(Math.round(value));
    return Number(value).toFixed(spec.digits);
  }

  function buildMacroControls() {
    for (const [group, spec] of Object.entries(Core.GROUP_SPECS)) {
      const row = document.createElement('label');
      row.className = 'macro-row';
      const text = document.createElement('span');
      text.textContent = spec.label;

      const input = document.createElement('input');
      input.type = 'range';
      input.min = spec.min;
      input.max = spec.max;
      input.step = spec.step;
      input.value = '1';

      const output = document.createElement('output');
      output.textContent = '1.00×';

      input.addEventListener('input', () => {
        const factor = Number(input.value);
        engine.applyGroupMacro(group, factor);
        output.textContent = factor.toFixed(2) + '×';
        syncExpertGroup(group);
        render();
      });

      input.addEventListener('dblclick', () => {
        input.value = '1';
        engine.applyGroupMacro(group, 1);
        output.textContent = '1.00×';
        syncExpertGroup(group);
        render();
      });

      row.append(text, input, output);
      els.macros.appendChild(row);
      macroInputs.set(group, { input, output });
    }
  }

  function buildExpertControls() {
    for (const [group, groupSpec] of Object.entries(Core.GROUP_SPECS)) {
      const details = document.createElement('details');
      details.className = 'parameter-group';
      if (group === 'motion' || group === 'temporal') details.open = true;
      const summary = document.createElement('summary');
      summary.textContent = groupSpec.label + ' parameters';
      details.appendChild(summary);

      const body = document.createElement('div');
      body.className = 'parameter-body';

      for (const [key, spec] of Object.entries(Core.PARAMETER_SPECS)) {
        if (spec.group !== group) continue;

        const row = document.createElement('label');
        row.className = 'parameter-row';
        const text = document.createElement('span');
        text.textContent = spec.label;

        const input = document.createElement('input');
        input.type = 'range';
        input.min = spec.min;
        input.max = spec.max;
        input.step = spec.step;

        const output = document.createElement('output');

        input.addEventListener('input', () => {
          engine.setParameter(key, Number(input.value), true);
          const macro = macroInputs.get(group);
          if (macro) {
            macro.input.value = '1';
            macro.output.textContent = '1.00×';
          }
          output.textContent = formatParameter(key, engine.params[key]);
          render();
        });

        row.append(text, input, output);
        body.appendChild(row);
        parameterInputs.set(key, { input, output, group });
      }

      details.appendChild(body);
      els.experts.appendChild(details);
    }
  }

  function syncExpertGroup(group) {
    for (const [key, binding] of parameterInputs) {
      if (binding.group !== group) continue;
      binding.input.value = String(engine.params[key]);
      binding.output.textContent = formatParameter(key, engine.params[key]);
    }
  }

  function syncAllExpertControls() {
    for (const group of Object.keys(Core.GROUP_SPECS)) syncExpertGroup(group);
  }

  function resetMacroControls() {
    for (const binding of macroInputs.values()) {
      binding.input.value = '1';
      binding.output.textContent = '1.00×';
    }
  }

  function imageDataFromPixels(pixels) {
    return new ImageData(pixels, WIDTH, HEIGHT);
  }

  function render() {
    ctx.putImageData(imageDataFromPixels(engine.current), 0, 0);
    if (els.curveOverlay.checked) drawCurveOverlay();
    els.frame.textContent = 'frame ' + engine.frame;
    els.sceneReadout.textContent = 'scene ' + String(engine.sceneId).padStart(2, '0');
    els.checksum.textContent = '#' + Core.checksum(engine.current);
    renderedFrames += 1;
  }

  function drawCurveOverlay() {
    const map = Curves.buildCurvePermutation(WIDTH, HEIGHT, Number(els.curve.value));
    const samples = 640;
    const step = Math.max(1, Math.floor(map.length / samples));
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0, p = 0; i < map.length; i += step, p += 1) {
      const index = map[i];
      const x = index % WIDTH;
      const y = Math.floor(index / WIDTH);
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function selectScene(sceneId) {
    const scene = engine.selectScene(Number(sceneId), true);
    els.scene.value = String(scene.id);
    els.curve.value = String(engine.curveMode);
    resetMacroControls();
    syncAllExpertControls();
    updateMemory();
    setStatus(scene.name);
    render();
  }

  function useTestPattern() {
    engine.setSource(Core.makeTestPattern(WIDTH, HEIGHT));
    setStatus('procedural source');
    render();
  }

  function loadImage(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      scratchCtx.fillStyle = '#000';
      scratchCtx.fillRect(0, 0, WIDTH, HEIGHT);
      const scale = Math.max(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      scratchCtx.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      const pixels = scratchCtx.getImageData(0, 0, WIDTH, HEIGHT).data;
      engine.setSource(new Uint8ClampedArray(pixels));
      URL.revokeObjectURL(url);
      setStatus(file.name);
      render();
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus('image load failed');
    };
    image.src = url;
  }

  function togglePlay(force) {
    playing = force === undefined ? !playing : Boolean(force);
    els.play.textContent = playing ? 'PAUSE' : 'PLAY';
    setStatus(playing ? engine.scene().name : 'paused · ' + engine.scene().name);
  }

  function step() {
    engine.step();
    render();
  }

  function animate(now) {
    const delta = Math.min(250, now - lastTick);
    lastTick = now;
    accumulator += delta;
    const interval = 1000 / Number(els.fps.value);

    if (playing && accumulator >= interval) {
      step();
      accumulator %= interval;
    } else if (!playing) {
      accumulator = 0;
    }

    if (now - lastFpsUpdate >= 750) {
      const measuredFps = renderedFrames * 1000 / (now - lastFpsUpdate);
      renderedFrames = 0;
      lastFpsUpdate = now;
      document.getElementById('measuredFps').textContent = measuredFps.toFixed(1) + ' fps';
    }
    requestAnimationFrame(animate);
  }

  function exportPng() {
    const link = document.createElement('a');
    link.download = 'lineimation-scene-' + String(engine.sceneId).padStart(2, '0') + '-frame-' + String(engine.frame).padStart(5, '0') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  buildMacroControls();
  buildExpertControls();

  els.file.addEventListener('change', event => loadImage(event.target.files && event.target.files[0]));
  els.scene.addEventListener('change', () => selectScene(els.scene.value));
  els.curve.addEventListener('change', () => {
    engine.configure({ curveMode: Number(els.curve.value) });
    engine.reset();
    setStatus('curve changed · ' + engine.scene().name);
    render();
  });
  els.resetScene.addEventListener('click', () => selectScene(engine.sceneId));
  els.play.addEventListener('click', () => togglePlay());
  els.step.addEventListener('click', () => {
    togglePlay(false);
    step();
  });
  els.reset.addEventListener('click', () => {
    engine.reset();
    render();
    setStatus('timeline reset · ' + engine.scene().name);
  });
  els.test.addEventListener('click', useTestPattern);
  els.exportPng.addEventListener('click', exportPng);
  els.curveOverlay.addEventListener('change', render);

  els.ring.addEventListener('input', () => {
    engine.setRingFrames(Number(els.ring.value));
    els.ringOut.textContent = els.ring.value;
    updateMemory();
    render();
  });

  els.fps.addEventListener('input', () => {
    els.fpsOut.textContent = els.fps.value;
    accumulator = 0;
  });

  window.addEventListener('keydown', event => {
    if (event.target && /input|select|textarea/i.test(event.target.tagName)) return;
    if (event.code === 'Space') {
      event.preventDefault();
      togglePlay();
    } else if (event.key === 'ArrowRight') {
      togglePlay(false);
      step();
    } else if (event.key.toLowerCase() === 'r') {
      engine.reset();
      render();
    }
  });

  els.scene.value = String(engine.sceneId);
  els.curve.value = String(engine.curveMode);
  els.ringOut.textContent = els.ring.value;
  els.fpsOut.textContent = els.fps.value;
  resetMacroControls();
  syncAllExpertControls();
  useTestPattern();
  updateMemory();
  togglePlay(true);
  requestAnimationFrame(animate);
})();
