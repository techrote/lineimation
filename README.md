# LINEIMATION

A behavioral reconstruction of the corrupted `recovered` artifact: a 2D texture-animation instrument whose surviving native signals point to curve-addressed frame storage and temporal feedback.

The original `recovered` file is intentionally left untouched as forensic evidence. It is a 777 kB splice containing fragments from several other projects plus the damaged LINEIMATION code. Repairing it line-by-line would preserve the corruption rather than the application, so the runnable reconstruction lives alongside it.

## Recovered behavior

The strongest internally consistent LINEIMATION fragments preserve these constants and concepts:

- format marker `0x0217`;
- a maximum 96-frame ring;
- Hilbert, Heighway dragon, Sierpiński arrowhead, Morton/Z-order, Moore and Gosper curve modes;
- curve-addressed texture writes;
- curve-derived frame scheduling;
- temporal frame blending and curve feedback;
- a family of 28 closely related frame passes with different phase, curve, write-offset and feedback parameters.

The reconstruction makes those parts operational again. The 28 damaged functions are represented as explicit, stable **Scenes** rather than being cycled implicitly during playback. Each scene keeps its identity until you select another one.

## Run

Open `index.html` directly in a current browser. No install, build step, server or network access is required.

Windows: double-click `0Play.cmd`.

Linux/macOS: run `./0Play.sh` or open `index.html`.

The default source is a generated test texture. You can load a local image, select one of 28 recovered scenes, choose a curve, tune the frame ring, step the timeline, or export the current frame as PNG.

The control surface now exposes more than twenty expert parameters across **Motion**, **Temporal**, **Structure**, and **Colour**. Each bank also has a grouped proportional macro. A macro scales the linked expert values around that scene's baseline while preserving their internal ratios; editing an expert value rebases that group so subsequent macro moves remain proportional.

Playback does not auto-select scenes, and missed animation frames are dropped rather than replayed in a catch-up burst. Default scene response is deliberately bounded to avoid full-frame strobe-like changes.

Controls: Space play/pause, Right Arrow single-step, R reset timeline.

## Development validation

Node.js 18+ is only needed for tests:

```text
npm test
```

There are no npm dependencies.

## Recovery boundary

This is a behavioral reconstruction, not a claim of byte-for-byte restoration. See `docs/RECOVERY.md` for the evidence used to distinguish LINEIMATION from interleaved donor material and for the small number of parameters that had to be inferred from surviving patterns.
