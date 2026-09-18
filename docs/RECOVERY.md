# Recovery notes

## Artifact condition

`recovered` is 777,510 characters / 12,270 lines and repeatedly switches language or project in the middle of tokens. The damage is structural, not a normal merge conflict. It contains JavaScript, WGSL, C++, HTML/CSS, tests, rendered ASCII/HTML spans and prose interleaved at arbitrary boundaries.

The original artifact remains unchanged.

## Authoritative behavioral clarification

After the first reconstruction passes, the user clarified the remembered purpose of LINEIMATION:

- it is an evolving **pseudo-fractal explorer**;
- the camera should continuously zoom inward or outward and support flight/orbit behavior;
- fractal elements should writhe, fold and appear to rotate;
- one important mode should let the internal structure move while the overall silhouette remains fixed;
- shader embellishment should decorate the fractal rather than replace the fractal/camera model.

This remembered behavior is authoritative for reconstruction intent. It changes the interpretation of the corrupted evidence: the curve/frame-ring subsystem is real and intentional, but it is not sufficient by itself to describe the whole application.

## Strong recovered texture/timeline evidence

The following signals recur independently and form a coherent subsystem:

- `/* recovered texture animation branch: frame order appears curve-addressed */`
- `LINEIMATION_FORMAT = 0x0217`
- `FRAME_RING = 96`
- `TILE = 16`
- six curve constants: Hilbert, Dragon, Sierpinski, Morton, Moore and Gosper
- Hilbert index/coordinate conversion
- Morton interleave/deinterleave
- real Heighway-dragon and Sierpiński-arrowhead generation
- `FrameAtlas`, `writeCurve`, `blendFrames`
- `buildFrameSchedule`
- `curveFeedback`
- 28 `curveFramePass_N` fragments and matching `curve-map-N` annotations
- repeated `timeline-recovery ... HILBERT_DRAGON_SIERPINSKI_FRAME_CURVE` markers
- a recovered WGSL texture pass using a 2D-array source, frame count, curve mode, order, feedback and phase

Those pieces are retained as the recovered embellishment subsystem.

## Fractal / camera evidence

The corrupted file also contains substantial WebGL/WGSL fractal and camera material: recursive flow fields, Julia/Mandelbrot-family code, continuous growth/twist/slice controls, camera chase/orbit/fly-through logic, texture motion and shader material controls.

Some of that material overlaps strongly with the separately reconstructed `techrote/recoveredfractalgen` project, so source provenance cannot be proven line-by-line. However the user's remembered LINEIMATION behavior independently confirms that **fractal evolution and camera traversal belong in this application's behavioral reconstruction**.

The current implementation therefore uses a clean WebGL2 pseudo-fractal renderer rather than copying an unknowable damaged original shader verbatim.

## Material that remains excluded

The following families still have no behavioral justification for LINEIMATION and remain evidence-only:

- WebGPU ocean/environment/compositor infrastructure associated with XenoField;
- deterministic glitch-genome operators from `techrote/recoveredprototype`;
- unrelated C++ image fault operators;
- unrelated motion-graph/agent-simulation implementations;
- prose and rendered HTML debris.

## Recovered frame-pass inference

The pass fragments reveal a regular construction even when individual functions are cut apart:

- phase multiplier follows `pass + 3`;
- phase shift follows `pass % 5`;
- curve mode cycles 1..6;
- write offset tracks pass number;
- feedback masks recur as a short set (`2, 3, 5, 9`);
- gains cluster in the low/mid 0.8s through low 0.9s.

These relationships remain useful for constructing the 28 recovered texture attractors.

## Current implementation boundary

The application now has two explicit layers:

1. **Fractal explorer** — WebGL2 camera, geometry/evolution and shader renderer.
2. **Recovered embellishment** — the original curve/frame-ring system rendered to a texture and sampled by the shader.

The fractal explorer is a behavioral reconstruction rather than a byte-for-byte recovery. In particular, the "infinite" camera is intentionally pseudo-fractal/self-similar rather than an arbitrary-precision scientific Mandelbrot engine. The recursive bloom and folded-IFS families are designed to tolerate long-running logarithmic zoom while maintaining visual continuity.

The fixed-silhouette behavior is implemented by evaluating two fields:
- a static field supplies the silhouette mask;
- an evolved field supplies moving interior metrics and colour.

This directly represents the remembered "writhing/rotating inside a fixed silhouette" behavior without forcing the geometry itself to remain static.
