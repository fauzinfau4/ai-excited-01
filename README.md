[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/fauzinfau4/ai-excited-01/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/fauzinfau4/ai-excited-01/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

# Teacup Koi

A koi launches from a porcelain cup as a spiral of tea becomes a moonlit current. Its red and ivory body cuts across a field of gold droplets, turquoise wake, and sharp starlight. The sweeping arcs point toward the fish's leap, while the bright cup holds the lower edge of the composition so its central idea stays clear at small size.

## Render

Run with Node.js 22 or later:

```sh
node main.ts
```

The program writes a complete 1024 × 1024 PNG to `/output/entry.png`. Pass a directory for a local render:

```sh
node main.ts ./preview
```

The illustration is drawn from fixed geometry using only Node's standard library. It uses no external assets, network, clock, or random input, so repeated renders produce identical PNG bytes.
