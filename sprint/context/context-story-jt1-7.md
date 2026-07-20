# Context: jt1-7 — Purity-scanner hardening — real tokenizer for the core boundary guard (five confirmed false negatives)

**Epic:** jt1 — Joust — foundation slice  
**Story:** jt1-7 (2pt, p1, chore, joust)  
**Workflow:** tdd

---

## Summary

The jt1-1 Reviewer confirmed five false negatives in `tests/purity.test.ts`'s comment-stripper/scanner, all reproduced by execution with live controls. The fix requires a real tokenizer (acorn is already in the dependency tree via vite), not regex patches — a rushed regex patch is how new holes get added.

**Gates:** jt1-5 (flight/movement — the first story whose core code grows real logic worth guarding).

---

## Acceptance Criteria

**AC-1:** Each of the five reproduced false negatives becomes a red-then-green test case:
- String-embedded `/*` (e.g., `const s = 'contains /* marker'; export Date.now()`)
- String-embedded `//` (e.g., `export const c = 'a//b' + performance.now()`)
- Template interpolation (e.g., ``export const e = `t${Math.random()}` ``)
- Math destructuring alias (e.g., `const { random } = Math; random()`)
- Function reference alias (e.g., `const readClock = Date.now; readClock()`)

**AC-2:** Scanner tokenizes source (acorn or equivalent) instead of regex comment-stripping; the existing 51-test suite plus the new cases stay green.

**AC-3:** Demonstrated red run against a poisoned `src/core/` file recorded in story notes, matching the jt1-1 AC-2 evidence bar.

---

## Five False Negatives (from jt1-1 Reviewer findings)

### Documented in jt1-1 Findings Table

1. **String-embedded block comment marker** — `'contains /* marker'` in a string, then `Date.now()` on a later line → **MISSED**
   - Root cause: `stripComments` scans file as flat text with no tokenizer, so a `/*`-looking substring inside an ordinary string consumes everything up to the next real `*/` **anywhere later in the file**, silently disabling the guard over an arbitrary span of unrelated code
   - Severity: **Worst** — accidental, not adversarial

2. **String-embedded line comment** — `export const c = 'a//b' + performance.now()` → **MISSED**
   - Root cause: `stripComments` (`:51`) runs before `stripStrings` and its only in-string `//` protection is the `(^|[^:])` URL heuristic, so any `//` in a string not preceded by `:` eats the rest of that line

3. **Template literal interpolation** — ``export const e = `t${Math.random()}` `` → **MISSED**
   - Root cause: `stripStrings` (`:63`) blanks the **entire** template literal including the live code inside `${…}`

4. **Aliasing — destructuring** — `const { random } = Math; random()` → **MISSED**
   - Root cause: every call-anchored ban requires a literal immediate `(`, so aliasing evades all of them

5. **Aliasing — function reference** — `const readClock = Date.now; readClock()` → **MISSED**
   - Root cause: same as above — only `Date` has a narrower aliasing guard at `:138`

---

## Fleet Pattern

This is a **fleet-wide pattern**, not a jt1-1 regression:
- Centipede and tempest share the scanner shape
- The fix folds back later once joust proves it
- Current joust core is 28 lines of trivially pure code, so live risk today is nil

---

## Scanner Implementation Details (from tests/purity.test.ts)

**Current approach (regex-based comment/string stripping):**
- `stripComments` (`:50-52`): Regex with flat-text scan, no tokenization
- `stripStrings` (`:61-66`): Handles backticks, single/double quotes
- `violations()` (`:146-154`): Applies BANNED patterns and SHELL_IMPORT rule to stripped code

**Banned patterns (27 rules):**
- Wall clock + entropy: Date.now(), new Date(), performance.now(), Math.random(), crypto.*
- Scheduling: setTimeout(), setInterval(), requestAnimationFrame(), queueMicrotask()
- Browser globals: window.*, document.*, navigator.*, localStorage, sessionStorage, fetch(), addEventListener()
- Process globals: process.*
- Render/audio types: HTMLCanvasElement, CanvasRenderingContext2D, OffscreenCanvas, ImageData, AudioContext
- Evasion: globalThis, dynamic import(), eval(), new Function(), Date aliasing

**One-way import rule:**
- Core → Shell is forbidden: `SHELL_IMPORT = /from\s+['"]\.{1,2}\/(?:[^'"]*\/)?shell/`

---

## Existing Test Coverage

The suite currently has:
- **56 fixture tests** exercising the scanner itself (jt1-1 AC-2)
- **1 teeth test** sweeping `src/core/**/*.ts` (51 files in jt1-1, all green)
- All fixtures have red-then-green demonstrated in jt1-1 AC-2 proof section

The five false-negative cases are NEW test additions beyond the existing 51.

---

## Reviewer's Recommendation

From jt1-1 session (Reviewer, Code review section, MEDIUM finding):

> "The durable fix is a single-pass character scanner, plus fixture tests for a string containing `//` and an unmatched `/*`. Affects `joust/tests/purity.test.ts` **and every sibling that copies this scanner** (centipede, tempest)."

> "Recommend SM file this as a tracked story rather than leave it as an archived session finding, gated to land before jt1-5 — the first story to write real core logic with strings. **A rushed regex patch is how new holes get added; this deserves its own scoped change.**"

---

## Design Spec Reference

Story gates jt1-5 (Flight + ground movement). Per the design spec (joust/docs/superpowers/specs/2026-07-19-joust-clone-design.md):

> "core never reads a clock, no Date.now/Math.random anywhere in core"

> "Determinism pinned by test: identical seed + input script reproduces the identical flight trajectory bit-for-bit through wrap, ceiling bounce, landing, and takeoff."

The purity guard is load-bearing for this claim.

---

## Implementation Notes

- Acorn is already a dependency (via vite); no need to add it
- joust's `tests/purity.test.ts` exists and is the carrier (currently 51 tests, 312 lines)
- jt1-1 proved the fixture self-tests bite (AC-2 proof run showed five new probes all caught)
- The fix likely involves a small acorn-based tokenizer written into the purity test helper functions
- The jt1-1 probe directory was deleted; tree is clean going into this story
