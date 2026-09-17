'use strict';
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const core = fs.readFileSync('src/core.js', 'utf8');
const curves = fs.readFileSync('src/curves.js', 'utf8');

const ids = [
  'canvas','fileInput','sceneMode','curveMode','resetSceneButton','groupMacros','expertControls',
  'ringFrames','fps','playButton','stepButton','resetButton','exportButton'
];
for (const id of ids) {
  if (!html.includes('id="' + id + '"')) throw new Error('index.html missing #' + id);
}

for (const script of ['src/curves.js','src/core.js','src/app.js']) {
  if (!html.includes('src="' + script + '"')) throw new Error('index.html missing ' + script);
}

for (const signal of [
  'LINEIMATION_FORMAT','FRAME_RING','FrameAtlas','buildFrameSchedule','curveFeedback',
  'RECOVERED_SCENES','GROUP_SPECS','PARAMETER_SPECS','applyGroupMacro','selectScene','buildLegacySceneAttractor','legacyCurveFeedback','sceneIdentity'
]) {
  if (!core.includes(signal)) throw new Error('core signal missing: ' + signal);
}

for (const signal of [
  'hilbertIndexToXY','heighwayDragon','sierpinskiArrowhead','mortonEncode','mooreCurve','gosperCurve'
]) {
  if (!curves.includes(signal)) throw new Error('curve signal missing: ' + signal);
}

for (const signal of ['requestAnimationFrame','buildMacroControls','buildExpertControls','selectScene']) {
  if (!app.includes(signal)) throw new Error('app signal missing: ' + signal);
}

console.log('static reconstruction checks passed');
