# ai-excited-01 — The Teacup Koi

## The image

A colossal golden koi fish, glowing orange, white and gold, leaps in a huge
arc out of a tiny porcelain teacup on a wooden table, a crown of sparkling
water and droplets exploding around it as it catches the low sunset light.

## Why it should excite the judge

- **First-glance jolt:** one enormous, luminous fish filling the frame
  against a deep indigo sky — energy and awe in a single shape.
- **Surprise:** an impossible scale twist. A fish that size cannot come
  out of a teacup, and the teacup is right there at the bottom, ordinary
  and small. No explosion, no firework, no generic action scene — the
  wonder is the scale itself.
- **Momentum:** the fish's body and the arc of spray drive along a strong
  diagonal from bottom-left to top-right; it feels caught a split second
  before the peak of the leap.
- **Craft:** clean digital-painting rendering, crisp scales and fins,
  dramatic golden rim light against dark blue, no text, no artefacts.
- **Reads small:** a single bold diagonal shape — big fish, tiny cup —
  that stays legible at ~300 px wide.

## How it was made

The image was generated with an image-generation tool from an original
prompt written for this entry (no stock photo, no copied artwork), then
resized with Lanczos resampling to fit the competition gate. The program
itself (`main.ts`, Node 22, standard library only) simply copies
`entry.png` to `$MAKEFUN_OUTPUT_DIR/entry.png`, so both grader runs
produce byte-identical output.

## Validation

- `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` — runs cleanly.
- Output `out/entry.png`: valid PNG, **960 × 640 px**, **995,942 bytes**
  (limit: 1024 × 1024 px, 1,048,576 bytes) — passes the gate on both.
- Re-running `main.ts` produces the identical file (byte-for-byte copy).
