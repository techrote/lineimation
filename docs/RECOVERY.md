# Recovery notes

## Artifact condition

`recovered` is 777,510 characters / 12,270 lines and repeatedly switches language or project in the middle of tokens. The damage is structural, not a normal merge conflict. It contains JavaScript, WGSL, C++, HTML/CSS, tests, rendered ASCII/HTML spans and prose interleaved at arbitrary boundaries.

The original artifact remains unchanged.

## Strong LINEIMATION evidence

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

Those pieces agree on a 2D texture/timeline architecture and are the basis of the reconstruction.

## Donor material excluded from the runtime

Several large families are recognizable as code from other repositories and do not form part of the LINEIMATION subsystem:

- WebGL2 live-fractal renderer UI, quaternion Julia / Mandelbulb / Mandelbox code and ray-march controls: matches the reconstructed `techrote/recoveredfractalgen` project.
- WebGPU ocean, projection, environment and compositor WGSL: matches the XenoField code family.
- deterministic glitch-genome operators (`tear`, `blocks`, `channels`, `bits`, `quantize`, `noise`, `feedback`, `refresh`) and its browser UI: matches `techrote/recoveredprototype`.
- unrelated C++ image fault operators, motion graph/evaluator code, agent simulation code and large prose/HTML passages.

These remain available in the preserved artifact but are not executed by the recovered LINEIMATION application.

## Inferred parameters

The pass fragments reveal a regular construction even when individual functions are cut apart:

- phase multiplier follows `pass + 3`;
- phase shift follows `pass % 5`;
- curve mode cycles 1..6;
- write offset tracks pass number;
- feedback masks recur as a short set (`2, 3, 5, 9`);
- gains cluster in the low/mid 0.8s through low 0.9s.

The first four relationships are sufficiently consistent to restore directly. The final two are represented by bounded repeating tables because several original values are unrecoverable. They are exposed through the runtime controls, so later forensic discoveries can be substituted without changing the architecture.

## Implementation choice

The artifact contains a partial WGSL compute pass, but not enough intact WebGPU setup/resource code to prove that it was the only intended runtime. The reconstruction therefore implements the same frame-ring, curve-write, scheduling and feedback semantics in dependency-free JavaScript/Canvas2D. This has three advantages:

1. it works from `file://` like the other recovered projects;
2. the algorithms are directly testable under Node;
3. the surviving behavior is restored without importing unrelated XenoField GPU infrastructure merely to make the shader compile.

A future GPU backend can be added behind the same core contracts if more original evidence appears.
