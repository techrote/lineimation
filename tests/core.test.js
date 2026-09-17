'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Curves = require('../src/curves.js');
const Core = require('../src/core.js');

test('Hilbert index/coordinate conversion round-trips', () => {
  for (let order = 1; order <= 6; order += 1) {
    const side = 1 << order;
    for (let i = 0; i < side * side; i += 1) {
      const [x, y] = Curves.hilbertIndexToXY(i, order);
      assert.equal(Curves.hilbertXYToIndex(x, y, order), i);
    }
  }
});

test('Morton encode/decode round-trips representative points', () => {
  for (let y = 0; y < 64; y += 7) {
    for (let x = 0; x < 64; x += 5) {
      assert.deepEqual(Curves.mortonDecode(Curves.mortonEncode(x, y)), [x, y]);
    }
  }
});

test('all recovered curve modes produce a complete pixel permutation', () => {
  const width = 24;
  const height = 16;
  for (let mode = 1; mode <= 6; mode += 1) {
    const map = Curves.buildCurvePermutation(width, height, mode);
    assert.equal(map.length, width * height);
    assert.equal(new Set(map).size, width * height, `mode ${mode} must be bijective`);
    for (const index of map) assert.ok(index >= 0 && index < width * height);
  }
});

test('frame atlas curve write and frame blend remain bounded', () => {
  const width = 12;
  const height = 8;
  const source = Core.makeTestPattern(width, height);
  const atlas = new Core.FrameAtlas(width, height, 8);
  atlas.fill(source);
  atlas.writeCurve(3, source, Curves.CURVE_HILBERT);
  const mixed = atlas.blendFrames(2, 3, 0.5);
  assert.equal(mixed.length, source.length);
  assert.ok(mixed.every(value => value >= 0 && value <= 255));
});

test('frame schedules are permutations within the ring', () => {
  for (let mode = 1; mode <= 6; mode += 1) {
    const schedule = Core.buildFrameSchedule(24, mode);
    assert.equal(schedule.length, 24);
    assert.equal(new Set(schedule).size, 24);
    for (const frame of schedule) assert.ok(frame >= 0 && frame < 24);
  }
});

test('engine is deterministic and evolves the timeline', () => {
  const width = 32;
  const height = 20;
  const source = Core.makeTestPattern(width, height);
  const a = new Core.LineimationEngine(width, height, { ringFrames: 8, passId: 7, curveMode: Curves.CURVE_DRAGON });
  const b = new Core.LineimationEngine(width, height, { ringFrames: 8, passId: 7, curveMode: Curves.CURVE_DRAGON });
  a.setSource(source);
  b.setSource(source);
  const initial = Core.checksum(source);
  let ca = initial;
  let cb = initial;
  for (let i = 0; i < 6; i += 1) {
    ca = Core.checksum(a.step());
    cb = Core.checksum(b.step());
    assert.equal(ca, cb);
  }
  assert.notEqual(ca, initial);
  assert.equal(a.state().format, Core.LINEIMATION_FORMAT);
});
