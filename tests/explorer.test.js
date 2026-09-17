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
  assert.ok(b.logZoom - a.logZoom > 7000);

  state.cameraMode = 1;
  const c = Explorer.cameraSample(state, 10000);
  assert.ok(c.logZoom < a.logZoom - 7000);
});

test('camera paths are deterministic', () => {
  const state = new Explorer.ExplorerState(5);
  state.cameraMode = 3;
  const a = Explorer.cameraSample(state, 123.456, {x:0.2,y:-0.1,zoom:1.5});
  const b = Explorer.cameraSample(state, 123.456, {x:0.2,y:-0.1,zoom:1.5});
  assert.deepEqual(a, b);
});
