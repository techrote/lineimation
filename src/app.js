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
    curve: document.getElementById('curveMode'),
    pass: document.getElementById('passMode'),
    ring: document.getElementById('ringFrames'),
    ringOut: document.getElementById('ringFramesOut'),
    history: document.getElementById('historyMix'),
    historyOut: document.getElementById('historyMixOut'),
    gain: document.getElementById('feedbackGain'),
    gainOut: document.getElementById('feedbackGainOut'),
    fps: document.getElementById('fps'),
    fpsOut: document.getElementById('fpsOut'),
    play: document.getElementById('playButton'),
    step: document.getElementById('stepButton'),
    reset: document.getElementById('resetButton'),
    test: document.getElementById('testPatternButton'),
    exportPng: document.getElementById('exportButton'),
    curveOverlay: document.getElementById('curveOverlay'),
    frame: document.getElementById('frameReadout'),
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

  let engine = new Core.LineimationEngine(WIDTH, HEIGHT, { ringFrames: 24 });
  let playing = true;
  let lastTick = performance.now();
  let accumulator = 0;
  let lastFpsUpdate = performance.now();
  let renderedFrames = 0;
  let measuredFps = 0;

  for (const [value, name] of Object.entries(Curves.CURVE_NAMES)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = name;
    els.curve.appendChild(option);
  }
  for (const pass of Core.RECOVERED_PASSES) {
    const option = document.createElement('option');
    option.value = pass.id;
    option.textContent = `${pass.name} · ${Curves.CURVE_NAMES[pass.curveMode]}`;
    els.pass.appendChild(option);
  }

  function setStatus(message) {
    els.status.textContent = message;
  }

  function updateMemory() {
    const mib = engine.atlas.data.byteLength / (1024 * 1024);
    els.memory.textContent = `${mib.toFixed(1)} MiB ring`;
  }

  function syncControls() {
    engine.configure({
      curveMode: Number(els.curve.value),
      passId: Number(els.pass.value),
      ringFrames: Number(els.ring.value),
      historyMix: Number(els.history.value),
      feedbackGain: Number(els.gain.value)
    });
    els.ringOut.textContent = els.ring.value;
    els.historyOut.textContent = Number(els.history.value).toFixed(2);
    els.gainOut.textContent = Number(els.gain.value).toFixed(2);
    els.fpsOut.textContent = els.fps.value;
    updateMemory();
  }

  function imageDataFromPixels(pixels) {
    return new ImageData(pixels, WIDTH, HEIGHT);
  }

  function render() {
    ctx.putImageData(imageDataFromPixels(engine.current), 0, 0);
    if (els.curveOverlay.checked) drawCurveOverlay();
    els.frame.textContent = `frame ${engine.frame}`;
    els.checksum.textContent = `#${Core.checksum(engine.current)}`;
    renderedFrames += 1;
  }

  function drawCurveOverlay() {
    const map = Curves.buildCurvePermutation(WIDTH, HEIGHT, Number(els.curve.value));
    const samples = 640;
    const step = Math.max(1, Math.floor(map.length / samples));
    ctx.save();
    ctx.globalAlpha = 0.45;
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
    setStatus(playing ? 'running' : 'paused');
  }

  function step() {
    syncControls();
    engine.step();
    render();
  }

  function animate(now) {
    const delta = Math.min(250, now - lastTick);
    lastTick = now;
    accumulator += delta;
    const interval = 1000 / Number(els.fps.value);
    if (playing) {
      while (accumulator >= interval) {
        step();
        accumulator -= interval;
      }
    } else {
      accumulator = 0;
    }
    if (now - lastFpsUpdate >= 750) {
      measuredFps = renderedFrames * 1000 / (now - lastFpsUpdate);
      renderedFrames = 0;
      lastFpsUpdate = now;
      document.getElementById('measuredFps').textContent = `${measuredFps.toFixed(1)} fps`;
    }
    requestAnimationFrame(animate);
  }

  function exportPng() {
    const link = document.createElement('a');
    link.download = `lineimation-${String(engine.frame).padStart(5, '0')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  els.file.addEventListener('change', event => loadImage(event.target.files && event.target.files[0]));
  els.play.addEventListener('click', () => togglePlay());
  els.step.addEventListener('click', () => { togglePlay(false); step(); });
  els.reset.addEventListener('click', () => { engine.reset(); render(); setStatus('timeline reset'); });
  els.test.addEventListener('click', useTestPattern);
  els.exportPng.addEventListener('click', exportPng);
  els.curveOverlay.addEventListener('change', render);
  for (const input of [els.curve, els.pass, els.ring, els.history, els.gain, els.fps]) {
    input.addEventListener('input', () => { syncControls(); render(); });
  }

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

  useTestPattern();
  syncControls();
  togglePlay(true);
  requestAnimationFrame(animate);
})();
