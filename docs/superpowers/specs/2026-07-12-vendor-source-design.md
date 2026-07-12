# Design: `vendor-source` — vendor an original-source repo into a greppable local copy

**Date:** 2026-07-12
**Status:** Approved (brainstorm)
**Author:** Architect (Emmanuel Goldstein)

## Problem

The arcade games are faithful ports of 1980s Atari vector games. Fidelity work
depends on reading the **original preserved Atari source** — the
`historicalsource/*` GitHub repos — which carry the original comments, labels,
and vector-picture data that the board disassemblies lack.

Those source files are **CR-terminated, non-UTF8**. `grep` flags them as binary
and silently returns nothing — a documented footgun (see the `red-baron ROM
quarry location` and `star-wars original source text` memories). The working
pattern, established by hand for star-wars, keeps two local directories:

- a **pristine clone** — `.git` intact, pinned commit — as the byte-of-record, and
- a **greppable copy** — same filenames, LF-normalized plain ASCII — that agents
  actually `grep`/`read`.

This was done **once, by hand**, for star-wars
(`~/Projects/star-wars-1983-source[-text]`) and documented in
`star-wars/CLAUDE.md:98-112`. It is undocumented-as-tooling and unrepeatable;
red-baron and every other game in the fleet needs the same dance. There is also
**no durable index** of what has been vendored and where — the clones are
machine-local and invisible to a fresh checkout of the orchestrator.

Known original-source repos (one per game):

- `historicalsource/tempest`
- `historicalsource/asteroids`
- `historicalsource/battlezone`
- `historicalsource/red-baron`
- `historicalsource/star-wars` (already vendored by hand — grandfathered)

## Goal

A single reusable command that, given a GitHub repo, produces the pristine clone
plus greppable copy in `~/Projects` and records the result in a checked-in index.
A companion command vendors the whole fleet from a manifest.

**Non-goals:** transcribing ROM *data* into TypeScript (that is per-story
fidelity work); renaming or re-homing the existing hand-made star-wars dirs
(load-bearing path, grandfathered).

## Design

### Interface

```
just vendor-source <org/repo> [ref]      # one repo
just vendor-source-all                    # every repo in the manifest
# → scripts/vendor-source.mjs <org/repo> [--ref <ref>] [--name <dirbase>] [--force]
# → scripts/vendor-source.mjs --all [--force]
```

- `<org/repo>` — e.g. `historicalsource/red-baron`. `<dirbase>` defaults to the
  repo basename (`red-baron`).
- `--ref <ref>` — optional commit/tag/branch to pin. Default: the remote's
  default-branch HEAD. The **resolved SHA is always recorded**.
- `--name <dirbase>` — override the directory base name (used only for the
  grandfathered star-wars entry → `star-wars-1983`).
- `--force` — remove and re-create target dirs that already exist.

### Manifest

`scripts/vendor-source.mjs` carries a small in-file manifest of the fleet:

```js
const FLEET = [
  { repo: 'historicalsource/tempest' },
  { repo: 'historicalsource/asteroids' },
  { repo: 'historicalsource/battlezone' },
  { repo: 'historicalsource/red-baron' },
  { repo: 'historicalsource/star-wars', ref: '5355b76', name: 'star-wars-1983',
    handVendored: true }, // index-only: dirs already exist, do not clobber
];
```

`--all` iterates `FLEET`. Entries marked `handVendored` are **indexed only** —
their existing dirs are not touched (the tool asserts they exist and records
them). Everything else is cloned + transcribed normally.

### Behavior (per repo)

1. **Clone** `https://github.com/<org/repo>.git` → `~/Projects/<dirbase>-source`.
   - If `ref` given, `git -C <dir> checkout <ref>` after clone.
   - Record `git -C <dir> rev-parse HEAD` → the pinned SHA.
   - Pristine: `.git` kept, no file modified.

2. **Transcribe** → mirror every file (excluding `.git/`) into
   `~/Projects/<dirbase>-source-text`, applying the canonical byte transform,
   identical to `star-wars/CLAUDE.md:112`:
   - read the file as raw bytes (latin1),
   - `\r\n` → `\n`, then lone `\r` → `\n`, then `\x0c` (form-feed) → `\n`,
   - strip any byte **not** in `{ \x09 tab, \x0a LF, \x20–\x7e printable ASCII }`,
   - write the result. Directory structure is preserved; filenames unchanged.
   - **Binaries are copied VERBATIM, not transcribed** (the transform would shred
     them into ASCII confetti). Classification is by **extension**, decided during
     implementation against real data — a content/ratio heuristic is impossible
     because real source and real binaries overlap (star-wars `SNDSUM.MAC` sound
     data is 78% non-ASCII *text* we want greppable, while a `.LDA` load-module is
     only 61% non-ASCII *binary*). Verbatim iff: `.lda` (star-wars load-modules),
     `.sav` (DEC save-images), `.prg` (battlezone `XXX225.PRG`, a 32 KB program
     image), or a numbered ROM-chip dump (`\.\d+$`, e.g. red-baron `036995.01`).
     NB `.COM` is **text** in star-wars (DEC command
     files) but **binary** in red-baron (microcode/state) — so it cannot be
     denylisted globally; red-baron's two binary `.COM` transcribe to harmless
     confetti and the pristine clone keeps their true bytes.

3. **Index** → upsert a row in `docs/reference-sources.md`, keyed by `<dirbase>`
   (re-running **updates** the row, never appends a duplicate):

   | Name | Repo | Pinned SHA | Pristine clone | Greppable copy | Vendored |

4. **Report** → print both paths and the reminder: *grep the `-text` copy; the
   pristine clone is CR-terminated non-UTF8.*

### Guards / edge cases

- Target dir already exists and not `--force` → error with a hint; never silently
  overwrites.
- `handVendored` entry whose dir is **missing** → error (index would point at
  nothing); tells the user to vendor it normally or fix the path.
- `git clone` failure (network / 404) → non-zero exit, nothing indexed for that
  repo. In `--all`, one failure does not abort the rest; a summary lists
  successes and failures.
- Binary files (`.lda`, `.sav`, `.prg`, numbered ROM dumps) are copied verbatim
  (see the Transcribe step); text is transcribed. `BINARY_EXTS` is an extensible
  set — extend it, with evidence from the pristine clone, when a new repo shows a
  binary format whose greppable copy comes out mangled. Audit a freshly-vendored
  repo by ranking its pristine files by non-ASCII ratio and eyeballing any
  high-ratio extension the rule left text-classified (that is how `.prg` and the
  accepted `.COM`/`.DAT`/`.DOC` confetti were found).

### Fidelity oracle

Re-vendoring `historicalsource/star-wars` (pinned `5355b76`) into a **temp**
target and diffing the transcribed tree against the existing
`~/Projects/star-wars-1983-source-text` must show **zero byte differences for
files present in both**. (The hand copy may hold a subset of the repo's files;
the check is over the intersection.) This proves the JS transform reproduces the
hand `perl` method byte-for-byte.

## Files

- `scripts/vendor-source.mjs` — **new** (node, zero deps: `node:child_process`,
  `node:fs`, `node:path`, `node:os`).
- `justfile` — **new** `vendor-source` and `vendor-source-all` recipes.
- `docs/reference-sources.md` — **new** index, seeded with all fleet rows.

## Verification

1. **Regression (fidelity oracle):** star-wars re-vendor into a temp dir, diff
   common files against `~/Projects/star-wars-1983-source-text` → empty diff.
2. **Live:** `just vendor-source historicalsource/red-baron` populates
   `~/Projects/red-baron-source[-text]`, adds the index row, and
   `grep -rn HORZ ~/Projects/red-baron-source-text` returns hits (the CRLF
   footgun is gone).
3. **Idempotency:** re-running the same command with `--force` reproduces
   identical output and a single (updated) index row.
