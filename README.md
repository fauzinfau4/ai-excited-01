[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/fauzinfau4/ai-excited-01/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/fauzinfau4/ai-excited-01/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

# The Teacup Koi

A small, deterministic drawing program for a fish that bursts out of a porcelain teacup and into a night sky made of tea currents, pearls, and glints. The scene uses crisp geometric shapes and a warm coral-and-gold koi against deep teal, so its central leap stays readable at thumbnail size.

## Build

Run with Node 22 or later:

```sh
node main.ts
```

The program writes `entry.png` in the current directory. Set `MAKEFUN_OUTPUT_DIR` to choose another output folder. Pass `--check` to validate the generated PNG's dimensions, chunks, checksums, decoded data length, and size, then print its SHA-256 hash.

Every shape is rasterized in the program. A seeded generator controls the little suspended droplets and sparks, so each run produces the same 1024 × 1024 PNG.
