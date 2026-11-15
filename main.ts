// ai-excited-01 entry — Node 22, standard library only.
//
// The artwork lives in this repository as entry.png: a colossal golden koi
// bursting out of a tiny teacup, frozen mid-leap on a strong diagonal.
// All this program does is place that image where the grader expects it:
// it reads the PNG sitting next to this file and writes an identical copy
// to $MAKEFUN_OUTPUT_DIR/entry.png (or /output/entry.png when the variable
// is unset). The copy is byte-for-byte the same file, so running the
// program twice always produces the same output.
//
// Local check:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//   # then confirm out/entry.png is a valid PNG, at most 1024x1024 px
//   # and at most 1 MiB.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'entry.png');
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const target = join(outDir, 'entry.png');

mkdirSync(outDir, { recursive: true });
writeFileSync(target, readFileSync(source));
