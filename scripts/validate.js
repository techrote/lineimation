'use strict';
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const core = fs.readFileSync('src/core.js', 'utf8');
const explorer = fs.readFileSync('src/explorer-core.js', 'utf8');
const curves = fs.readFileSync('src/curves.js', 'utf8');

const ids = [
  'canvas','preset','fractalMode','cameraMode','recoveredScene','textureFile',
  'groupMacros','expertControls','pauseButton','recenterButton','resetButton','shotButton'
];
for (const id of ids) {
  if (!html.includes('id="' + id + '"')) throw new Error('index.html missing #' + id);
}

for (const script of ['src/curves.js','src/core.js','src/explorer-core.js','src/app.js']) {
  if (!html.includes('src="' + script + '"')) throw new Error('index.html missing ' + script);
}

for (const signal of [
  'RECOVERED_SCENES','buildLegacySceneAttractor','sceneIdentity'
]) {
  if (!core.includes(signal)) throw new Error('recovered embellishment signal missing: ' + signal);
}

for (const signal of [
  'GROUP_SPECS','PARAMETER_SPECS','FRACTAL_MODES','CAMERA_MODES','PRESETS',
  'ExplorerState','cameraSample','silhouetteLock','internalRotation','writheAmount','zoomRate'
]) {
  if (!explorer.includes(signal)) throw new Error('explorer signal missing: ' + signal);
}

for (const signal of [
  'WebGL2','uSilhouetteLock','dynamicDomain','recursiveBloom','escapeField',
  'uLogZoom','buildRecoveredTexture','buildControls','requestAnimationFrame'
]) {
  if (!app.includes(signal)) throw new Error('renderer signal missing: ' + signal);
}

for (const signal of [
  'hilbertIndexToXY','heighwayDragon','sierpinskiArrowhead','mortonEncode','mooreCurve','gosperCurve'
]) {
  if (!curves.includes(signal)) throw new Error('curve signal missing: ' + signal);
}

console.log('static fractal-explorer checks passed');
