'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Explorer = require('../src/explorer-core.js');

test('explorer exposes deep grouped fractal controls', () => {
  assert.ok(Object.keys(Explorer.PARAMETER_SPECS).length >= 40);
  assert.deepEqual(Object.keys(Explorer.GROUP_SPECS), ['camera','evolution','geometry','shader','colour']);
  const represented = new Set(Object.values(Explorer.PARAMETER_SPECS).map(spec => spec.group));
  assert.equal(represented.size, 5);
});

test('all explorer presets normalize into the declared parameter ranges', () => {
  for (let i = 0; i < Explorer.PRESETS.length; i += 1) {
    const state = new Explorer.ExplorerState(i);
    for (const [key, spec] of Object.entries(Explorer.PARAMETER_SPECS)) {
      const value = state.params[key];
      assert.ok(value >= spec.min && value <= spec.max, `${Explorer.PRESETS[i].name} ${key} out of range`);
      if (spec.integer) assert.equal(Number.isInteger(value), true);
    }
  }
});

test('grouped proportional macros preserve relative offsets from neutral', () => {
  const state = new Explorer.ExplorerState(0);
  const beforeRate = state.params.zoomRate;
  const beforeOrbit = state.params.orbitRadius;
  state.applyGroupMacro('camera', 1.5);
  assert.ok(Math.abs(state.params.zoomRate / beforeRate - 1.5) < 0.02);
  assert.ok(Math.abs(state.params.orbitRadius / beforeOrbit - 1.5) < 0.02);

  state.setParameter('zoomRate', 0.4, true);
  state.applyGroupMacro('camera', 1.25);
  assert.ok(Math.abs(state.params.zoomRate - 0.5) < 0.02);
});

test('fixed-silhouette presets actually request silhouette locking', () => {
  const names = ['Fixed silhouette writher','Julia gyroscope'];
  for (const name of names) {
    const index = Explorer.PRESETS.findIndex(preset => preset.name === name);
    assert.ok(index >= 0);
    const state = new Explorer.ExplorerState(index);
    assert.ok(state.params.silhouetteLock >= 0.95);
    assert.ok(Math.abs(state.params.internalRotation) > 0.5);
    assert.ok(state.params.writheAmount > 0.4);
  }
});

test('camera sampling supports unbounded signed logarithmic zoom', () => {
  const state = new Explorer.ExplorerState(1);
  state.cameraMode = 0;
  state.setParameter('zoomRate', 0.75);
  const a = Explorer.cameraSample(state, 0);
  const b = Explorer.cameraSample(state, 10000);
  assert.ok(b.logZoom - a.logZoom > 5000);

  state.cameraMode = 1;
  const c = Explorer.cameraSample(state, 10000);
  assert.ok(c.logZoom < a.logZoom - 5000);
});

test('camera paths are deterministic', () => {
  const state = new Explorer.ExplorerState(5);
  state.cameraMode = 3;
  const a = Explorer.cameraSample(state, 123.456, {x:0.2,y:-0.1,zoom:1.5});
  const b = Explorer.cameraSample(state, 123.456, {x:0.2,y:-0.1,zoom:1.5});
  assert.deepEqual(a, b);
});

test('explorer snapshots round-trip parameters, macros, and baselines', () => {
  const original = new Explorer.ExplorerState(3);
  original.setParameter('zoomRate', 0.41, true);
  original.setParameter('writheAmount', 1.17, true);
  original.applyGroupMacro('camera', 1.35);
  original.applyGroupMacro('evolution', 0.72);
  original.fractalMode = 5;
  original.cameraMode = 4;
  original.recoveredScene = 19;

  const snapshot = JSON.parse(JSON.stringify(original.snapshot()));
  const restored = new Explorer.ExplorerState(0);
  restored.restore(snapshot);

  assert.equal(restored.fractalMode, 5);
  assert.equal(restored.cameraMode, 4);
  assert.equal(restored.recoveredScene, 19);
  assert.equal(restored.params.zoomRate, original.params.zoomRate);
  assert.equal(restored.params.writheAmount, original.params.writheAmount);
  assert.equal(restored.groupFactors.camera, original.groupFactors.camera);
  assert.equal(restored.groupFactors.evolution, original.groupFactors.evolution);
  assert.deepEqual(restored.groupBaselines.camera, original.groupBaselines.camera);
  assert.deepEqual(restored.groupBaselines.evolution, original.groupBaselines.evolution);
});

test('restored snapshots clamp invalid numeric values to declared contracts', () => {
  const restored = new Explorer.ExplorerState(0);
  restored.restore({
    presetIndex: 0,
    fractalMode: 999,
    cameraMode: -100,
    recoveredScene: 12,
    params: {
      zoomRate: 999,
      iterations: -5,
      silhouetteLock: 4
    },
    groupFactors: {
      camera: 99,
      evolution: -20
    }
  });

  assert.equal(restored.fractalMode, Explorer.FRACTAL_MODES.length - 1);
  assert.equal(restored.cameraMode, 0);
  assert.equal(restored.params.zoomRate, Explorer.PARAMETER_SPECS.zoomRate.max);
  assert.equal(restored.params.iterations, Explorer.PARAMETER_SPECS.iterations.min);
  assert.equal(restored.params.silhouetteLock, Explorer.PARAMETER_SPECS.silhouetteLock.max);
  assert.equal(restored.groupFactors.camera, Explorer.GROUP_SPECS.camera.max);
  assert.equal(restored.groupFactors.evolution, Explorer.GROUP_SPECS.evolution.min);
});
