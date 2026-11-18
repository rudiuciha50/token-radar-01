// Token Radar — a program that reads a sealed DeFiLlama protocol snapshot,
// scores each pre-token protocol by implied launch value, and writes a ranked
// board, a static dashboard, and a dossier for the make.fun scorer.
//
// Usage (outside the grader container):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
//
// Inside the grader, /input/snapshot.json and /output are mounted automatically.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

// --------------- constants from the scorer's gate ---------------

/** The dossier text cap: keeps the dashboard source readable by the judge. */
const DOSSIER_TEXT_BYTES = 65_536;

/** Screenshot limits: the gate allows 3–4 screenshots, each at most 512 KiB. */
const SCREENSHOT_MAX = 4;
const SCREENSHOT_BYTES = 524_288;

/** Dashboard limits: at most 400 files and 4 MiB total. */
const DASHBOARD_MAX_FILES = 400;
const DASHBOARD_MAX_BYTES = 4_194_304;

/** A screenshot filename: letters, digits, dot, underscore, hyphen; 1–128 chars. */
const IMAGE_NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

// --------------- argument parsing ---------------

/** Pull a named argument from the CLI, with a fallback. */
function arg(name: string, fallback: string): string {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  return fallback;
}

// --------------- input discovery ---------------

const inputArg = arg('input', '/input');
const inputPath = inputArg.endsWith('.json')
  ? inputArg
  : join(inputArg, 'snapshot.json');

if (!existsSync(inputPath)) {
  process.stderr.write(
    `token radar: cannot find snapshot at ${inputPath}\n` +
    `  pass --input <snapshot.json|directory> or mount the sealed /input\n`,
  );
  process.exit(2);
}

const outDir = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// --------------- load and score ---------------

const raw = readFileSync(inputPath, 'utf8');
const snapshot = parseSnapshot(raw);
const { board, radar } = buildRadar(snapshot);

// Gate check before writing anything.
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  process.stderr.write(`token radar: board failed the gate: ${issue}\n`);
  process.exit(1);
}

// --------------- write outputs ---------------

mkdirSync(outDir, { recursive: true });

// board.json — the ranked protocol rows.
writeFileSync(join(outDir, 'board.json'), `${JSON.stringify({ rows: board })}\n`);

// data.js — the dashboard's single data source (no network fetch needed).
writeFileSync(join(outDir, 'data.js'), dataScript(radar));

// --------------- copy dashboard and screenshots ---------------

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

/** Recursively copy regular files from `src` into `dst`, skipping dotfiles. */
function copyTree(src: string, dst: string): string[] {
  if (!existsSync(src)) return [];
  mkdirSync(dst, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(src)) {
    if (name.startsWith('.')) continue;
    const fromPath = join(src, name);
    const toPath = join(dst, name);
    if (!statSync(fromPath).isFile()) continue;
    copyFileSync(fromPath, toPath);
    copied.push(name);
  }
  return copied;
}

const dashFiles = copyTree(join(repoRoot, 'dashboard'), join(outDir, 'dashboard'));
const shotFiles = copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));

// Validate screenshot count.
if (shotFiles.length < 3) {
  process.stderr.write(
    `token radar: screenshots/ has ${shotFiles.length} image${shotFiles.length === 1 ? '' : 's'}\n` +
    `  the gate requires 3–4: the board, a detail view, and a filtered view\n`,
  );
  process.exit(1);
}

// Validate screenshot names.
for (const name of shotFiles) {
  if (!IMAGE_NAME_RE.test(name)) {
    process.stderr.write(
      `token radar: screenshots/${name}: names must be letters, digits, and . _ -, 1–128 characters\n`,
    );
    process.exit(1);
  }
}

// --------------- write dossier ---------------

// buildDossier reads the dashboard and screenshots we just copied, so it
// must run after them. The scorer rewrites it from /output and compares bytes.
const dossierBytes = buildDossier(outDir, {
  text_max_bytes: DOSSIER_TEXT_BYTES,
  screenshots: { max: SCREENSHOT_MAX, max_bytes: SCREENSHOT_BYTES },
  dashboard: { max_files: DASHBOARD_MAX_FILES, max_bytes: DASHBOARD_MAX_BYTES },
});

writeFileSync(join(outDir, 'dossier.json'), dossierBytes);

// --------------- summary ---------------

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols from snapshot ` +
  `(${snapshot.watchlist.length} on watchlist) → ${board.length} rows scored ` +
  `(${radar.early_size} early, ${radar.live_size} live-token set aside)\n` +
  `token radar: wrote ${join(outDir, 'board.json')}, ${join(outDir, 'data.js')}, ` +
  `${join(outDir, 'dashboard')} (${dashFiles.length} files), ` +
  `${join(outDir, 'screenshots')} (${shotFiles.length} images), ` +
  `and ${join(outDir, 'dossier.json')}\n`,
);