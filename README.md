# LINEIMATION

LINEIMATION is a dependency-free **WebGL2 pseudo-fractal explorer** reconstructed from a badly corrupted recovered artifact.

The user clarified the intended behavior after the first recovery passes: this is not primarily a texture-feedback instrument. The core experience is continuous flight through evolving fractal-like structures — logarithmic zoom in or out, orbit/fly-through camera paths, recurrence evolution, domain writhe, apparent rotation, and shader embellishment.

The original `recovered` file remains untouched as forensic evidence.

## What LINEIMATION does now

- Live WebGL2 fractal/pseudo-fractal rendering with no runtime dependencies.
- Six geometry families:
  - Recursive bloom field
  - Julia flow
  - Mandelbrot orbit
  - Tricorn
  - Burning ship
  - Folded lattice IFS
- Seven camera behaviors:
  - Infinite in
  - Infinite out
  - Orbit dive
  - Flythrough
  - Lissajous
  - Breathing observer
  - Manual
- Continuous logarithmic zoom, plus drag steering and wheel zoom.
- **Camera lock** freezes the current camera transform while fractal evolution continues; drag/wheel still make manual locked-camera adjustments.
- **SAVE** persists the full explorer state to browser storage and restores it on the next launch: fractal/camera modes, every expert parameter, proportional-macro baselines/factors, simulation time and manual camera position/zoom.
- Every slider has a synchronized keyboard-editable numeric field with the same min/max/step contract.
- **Silhouette lock**: the boundary can be evaluated from a static field while the interior uses a separately evolved field. This lets internal fractal elements writhe, rotate, fold and change while the outer silhouette remains fixed.
- Independent recurrence evolution, internal rotation, writhe amplitude/scale/speed, slice drift, parameter orbit and breathing.
- More than forty expert parameters across five grouped banks:
  - Camera
  - Fractal evolution
  - Geometry
  - Shader detail
  - Colour
- ZaagGenZ-style proportional group macros: a macro scales a bank around its current baseline while preserving internal parameter relationships.
- Contours, orbit-trap glow, grain, chromatic separation, horizontal banding and animated palette controls.
- The recovered 28 scene/frame-ring system is retained as an **optional shader texture source**, not the geometry/camera engine.
- Local image loading can replace the recovered detail texture.

## Presets

The supplied presets are deliberately different explorations rather than rapidly changing timeline states:

- Fixed silhouette writher
- Infinite descent
- Reverse ascent
- Julia gyroscope
- Banded bloom horizon
- Folded tunnel
- Mandelbrot pilot
- Burning-ship current

A preset remains selected until you choose another one.

## Run

Open `index.html` directly in a current browser with WebGL2 and hardware acceleration.

Windows: double-click `0Play.cmd`.

Linux/macOS: run `./0Play.sh` or open `index.html`.

No server, npm install, CDN or network connection is required at runtime.

### Interaction

- Drag the canvas: steer the focal point.
- Mouse wheel: add manual logarithmic zoom.
- **LOCK CAMERA** (or L): freeze/unfreeze automatic camera motion without pausing fractal evolution.
- **SAVE** (or Ctrl/Cmd+S): store the complete explorer state locally; it auto-restores next launch.
- Type directly into the numeric field beside any slider and press Enter (or leave the field) to commit an exact value.
- Space: pause/resume.
- R: reset the current preset.
- H: hide/show the interface.
- F: fullscreen.
- PNG: capture the current view.

Custom detail images are deliberately not embedded into the browser save because arbitrary image files can exceed local-storage limits; if a custom image was active, the saved recovered-texture selection is restored instead and the status bar says so.

## Architecture

The renderer deliberately separates three concepts:

1. **Camera field** — where and at what logarithmic depth the explorer is looking.
2. **Fractal field** — the actual recurrence/fold structure and its evolving parameters.
3. **Embellishment field** — recovered frame-ring art or a loaded image used as shader material.

For silhouette-locked motion the shader evaluates the fractal twice:

- a static field supplies the outer mask;
- a time-evolved field supplies internal orbit metrics, contours, colour and texture coordinates.

The two are mixed by **Silhouette lock**. At 1.0 the overall outline can remain effectively stationary while the internal structure continues to move.

The recursive bloom and folded-IFS modes are designed for long-running self-similar zoom. Exact deep-precision Mandelbrot navigation is not the goal; LINEIMATION is intentionally a **pseudo-fractal flight instrument** rather than a scientific arbitrary-precision explorer.

## Development validation

Node.js 18+ is only required for repository tests:

```text
npm test
```

There are no npm dependencies.

Tests cover the recovered curve/frame-ring subsystem as well as the explorer parameter model, grouped macros, fixed-silhouette presets, deterministic camera paths and unbounded logarithmic camera state.

## Recovery boundary

`docs/RECOVERY.md` records the forensic evidence and the distinction between recovered material and reconstruction decisions. The original `recovered` artifact is preserved unchanged.
