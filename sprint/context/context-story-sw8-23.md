# Story Context: sw8-23

**Title:** Harden the comment-citation guard: it cannot see its own directory, its opt-out fires on a MENTION, and its stated limits omit the two biggest ones (sw8-18 review findings 3, 4, 5, 7)
**Epic:** sw8 — star-wars
**Points:** 3 · **Priority:** p2 · **Workflow:** tdd · **Type:** chore · **Repos:** arcade

> **Authored by SM, not generated.** The story had `acceptance_criteria: null`, and
> `pf context create` renders the epic YAML `description` verbatim into `## Problem`.
> **DO NOT REGENERATE OR OVERWRITE THIS FILE.**

---

## ✅ THE DESCRIPTION SURVIVED MEASUREMENT — all four findings verified 2026-08-02

Per the standing rule, every falsifiable claim in the description was re-run before setup.
**No corrections were needed.** Recorded so the next reader does not repeat the sweep:

| Claim | Verdict | Evidence |
|---|---|---|
| (1) `checkTree` walks src, tests, specs — never `tools/` | **TRUE** | `check-comment-citations.mjs:344` — `roots ?? [swRoot/src, swRoot/tests, swRoot/docs/superpowers/specs]` |
| (1) the header's `design.md` cite was corrected in sw8-18's chore | **TRUE** | `:26` now reads `design.md:47-48` |
| (2) the opt-out gates on an unanchored `raw.includes` | **TRUE** | `:252` — `if (raw.includes(IGNORE_PRAGMA)) return errs` |
| (2) fixture reports 1 error; fixture + a prose mention reports 0 | **REPRODUCED** | re-ran the review fixture; 1 → 0 exactly as filed |
| (3) 744 of 1000 line-span citations get existence/range only | **EXACT** | 1000 spanned, 744 unquoted = **74.4%** |
| (4) `fromFile` declared, passed by `checkTree` + six test sites, never read | **TRUE** | declared `.d.mts:34`; passed `.mjs:359`; six sites at `comment-citations.test.ts:73,243,259,281,347,360`; `resolve()` destructures only `{swRoot, romDir, repoRoot}` |

**The ROM was not involved and no ROM claim needed checking** — this story is entirely about
in-repo tooling. That is the inverse of sw8-18's asymmetry (vendored ROM citations never rot;
in-repo ones rot continuously), and it is why the measurement budget went to running the tool.

---

## 🔨 USER RULINGS (2026-08-02) — settled at setup, not open

**R1 — `fromFile` is DROPPED, not wired.** AC7. The description offered both. Census attached to
the question: **zero** relative-path citations (`./x.ts:12`) exist anywhere in the scanned tree,
so the feature has no users; and the 8 real basename collisions (`input.ts`, `audio.ts`,
`font.ts`, `glow.ts`, `math3d.test.ts`, `audio.test.ts`, `name-entry.test.ts`,
`math3d.camera-mvp.test.ts` — star-wars shell vs `src/shared`) are already handled by the
path-qualified rule the guard's own header documents at `:200-208`. **Do not implement
citing-file-relative resolution.**

**R2 — the `.mts` gap is IN SCOPE.** AC1. SM found it during measurement; it is not in the filed
description. It is the same finding class as item (1) — "cannot see its own directory" extends to
"nor its own type declaration" — and `fromFile` (item 4) is *declared in one of those invisible
files*. Folded in rather than filed as a follow-up about a one-token array edit.

---

## 📐 SM MEASUREMENTS — three facts the description does not carry

These arrive labelled MEASURED and therefore outrank the story. Each was run against the working
tree at `c1fcb83`. Re-run them at RED; see the timestamp warning in AC2.

### M1 — Findings (1) and (2) INTERACT. Fixing scope alone does not make the guard check itself.

`check-comment-citations.mjs:38` *defines* the pragma as a string literal:

```js
export const IGNORE_PRAGMA = 'citation-guard: ignore-file'
```

So the guard's own source contains the pragma text, and the unanchored `raw.includes` at `:252`
matches it. **Measured:** `checkCitations(<the guard's own source>) → 0 errors`. Adding `tools/`
to the roots therefore scans the guard and it *immediately opts itself out* — the exact defect
item (1) exists to close, surviving item (1)'s own fix. With the literal masked, its own file
reports **2** errors.

**Consequence for sequencing:** AC3 (anchor the pragma) is a prerequisite for AC1 delivering
what it promises. A test asserting "the guard checks its own file" passes vacuously if AC3 is
not done first.

### M2 — Item (3) describes ONE population as though it were two.

The description reads: "744 of 1000 … get existence/range checking ONLY … *and* a citation whose
adjacent quote is a single token is never verbatim-checked at all". A reader totals those as two
limitations. **They are not disjoint — the second is a subset of the first.**

`quoteFor()` (`:130-137`) runs the adjacency scan, then `isFragment` (`:129`) requires whitespace
and returns `null` for anything else. A single-token adjacent span is therefore indistinguishable,
downstream, from *no adjacent span at all*. Measured partition of the 744:

```
spanned citations:            1000
quote === null:                744   (74.4%)
  ...nothing adjacent at all:  698
  ...a span WAS adjacent:       46   <- single token, silently dropped by isFragment
```

Samples of the 46, which are exactly the shape the description's `TGPROB` mutant predicts:

| Citation | Dropped adjacent token | In |
|---|---|---|
| `WSCPU.MAC:736` | `` `TGPROB` `` | `src/core/state.ts` |
| `WSCPU.MAC:736` | `` `FIRE_MASK` `` | `src/core/gameRules.ts` |
| `WSGAS.MAC:375` | `` `SCRSHLD` `` | `src/core/events.ts` |
| `WSCPU.MAC:357` | `` `CPHTSA` `` | `src/core/state.ts` |
| `TCMES.MAC:415` | `` `#0F000` `` | `src/core/attract.ts` |

AC6 requires UNCATCHABLE to state the subset relationship, because "744 range-only **and** the
single-token class" over-counts the guard's blindness and would be the same over-claiming defect
the guard exists to prevent.

### M3 — The newly-surfaced errors inside the audit tooling are EXAMPLES, not defects.

This is the trap in AC2 and the whole reason AC5 exists. Measured, once the pragma is anchored
and `.mts` is scanned, three errors appear inside `tools/audit/` — and **all three are correct as
written**, because the audit tooling documents the citation format by exhibiting it:

1. **`design.md: cited file does not exist`** — the header's `:26` example
   `"…the Death Star is entirely out of frame" (`…design.md:47-48`)`. The leading `…` marks an
   elision; no file is named exactly `design.md` (there are 5+ `*-design.md` specs).
2. **`WSMAIN.MAC:2273-2290 … now at :2271`** — the header's `:97` example, quoting what
   `gameRules.ts` wrote **before** sw8-18 fixed it. The live citation today is
   `gameRules.ts:244` → `` `.REPT 0`, `WSMAIN.MAC:2271-2290` `` — **correct**. The header is
   deliberately preserving the historical wrong form to explain the bare-colon case.
3. **`check-comment-citations.mjs:2273-2290: span out of range`** — `.d.mts:18`'s
   `` /** True when the span was written bare (`:2273-2290`) … */ ``, whose bare span inherits
   the nearest preceding filename (`.d.mts:5`) and lands on a 394-line file. Also an example.

**Rewriting any of these into currently-true citations destroys what they document.** The module
already ships the mechanism for exactly this — `RETIRED_MARK = 'RETIRED:'` at `:42`, described as
"Prose sometimes quotes a citation in order to DISOWN it". AC5 requires the marker, and requires
a test proving its removal reddens, so the disowning is load-bearing rather than decorative.

> **Not a user question.** The story is emphatic that the guard must see its own directory
> ("This is not hypothetical … invisible by construction"), so excluding `tools/audit/` to dodge
> these three would defeat the finding. Mark them; do not narrow the scope.

---

## 📊 THE FRESH COUNT — measured, itemised, and owed re-measurement at RED

`checkTree` with `tools/` added, minus the current baseline of **35**:

**10 fresh, all in the bake tools** (none in `tools/audit/`, which is clean apart from M3):

```
tools/music-bake/bake-music.mjs      SNDPM.MAC:919   -> now at SNDPM.MAC:605
tools/music-bake/gen-music-data.mjs  SNDPM.MAC:737   -> nowhere in the file
tools/music-bake/music-data.test.mjs .test.mjs       -> cited file does not exist
tools/music-bake/music-data.test.mjs tools/speech-bake/gen-speech-data.mjs -> does not exist
tools/music-bake/music-data.test.mjs WSMAIN.MAC:1673 -> now at WSMAIN.MAC:1636
tools/music-bake/pm-player.mjs       SNDPM.MAC:1031  -> now at SNDPM.MAC:553
tools/music-bake/pm-player.mjs       SNDPM.MAC:1040  -> now at SNDPM.MAC:564
tools/pokey-bake/bake-sfx.test.mjs   .test.mjs       -> cited file does not exist
tools/pokey-bake/dedicated-sfx.test.mjs  sfx-data.mjs:323-347 -> out of range (339 lines)
tools/speech-bake/speech-data.mjs    gen-speech-data.mjs -> cited file does not exist
```

**+1 from `.mts`** (M3 item 3) · **+2 from anchoring the pragma** (M3 items 1–2).

> ⚠ **Two of the ten are probably artifacts of `FILE_RE`, not real citations.** The bare
> `.test.mjs` "cited file does not exist" entries have no filename stem — `FILE_RE`
> (`:85`) accepts a leading `.`, so a sentence mentioning `*.test.mjs` or `foo.test.mjs` split
> across a comment wrap can extract as the bare extension. The same shape appears **five times in
> the current baseline** (`.test.ts` in `exhaust-port-rom.test.ts`, `helpers/space.ts`,
> `trench-gun-streaming.test.ts`, `render.lock-on-removed.test.ts`). SM did not determine whether
> this is a real extractor defect or benign noise. **TEA: classify these before treating them as
> citations to re-anchor** — if it is an extractor defect it is arguably out of this story's scope
> and should be filed, not fixed here.

---

## 🧭 TECHNICAL APPROACH — measured pointers only, no design

Everything is in **one implementation file**, its type declaration and one test file:

| File | Lines | Why it is in scope |
|---|---|---|
| `plugins/star-wars/tools/audit/check-comment-citations.mjs` | 393 | `SCAN_EXT :44` · `IGNORE_PRAGMA :38` · `RETIRED_MARK :42` · `isFragment :129` · `quoteFor :130-137` · the unanchored gate `:252` · `resolve() :210-227` · `checkTree :343-364` · `UNCATCHABLE :373-383` |
| `…/check-comment-citations.d.mts` | 54 | `CheckOptions.fromFile :34` (AC7) · the example bare span `:18` (AC5) |
| `plugins/star-wars/tests/audit/comment-citations.test.ts` | — | the six `fromFile` sites `:73,243,259,281,347,360` (AC7) · carries the pragma deliberately (AC4) |
| `plugins/star-wars/tests/audit/sw8-18-remediation.test.ts` | — | carries the pragma deliberately (AC4) |

**Run the gate:** `npx vitest run --project star-wars citations`
**Run the tool directly:** `node plugins/star-wars/tools/audit/check-comment-citations.mjs`
(CLI at `:386-393`; it already accepts a `rootDir` argv and computes `repoRoot` as `swRoot/../..`).

**Baseline suite state at setup:** not re-measured by SM at handoff — see the contention note
below, and re-measure rather than inheriting a number.

---

## 🚧 CONTENTION — a sibling is editing the files this guard scans

`a-3` holds a live session for **uf1-15** (`status: in_progress`, star-wars, `tie-status.ts` /
`sim.ts` — the C_AS fire cone). Those files are inside this guard's scan tree and
`src/core/tie-status.ts` carries **46** spanned citations, third-highest in the plugin.

**Consequences, both real:**
- The **35** baseline and the **1000/744** census will move under you. Both are claims with a
  timestamp. AC2 says re-measure; do it at the start of RED and again before GREEN is called.
- `tests/core/tie-aim-axis.test.ts` already contributes **2** of the 35 baseline errors and is
  uf1-15's own test file. If those two disappear or change, that is the sibling landing, not you.
- Do **not** "fix" a citation in `tie-status.ts` or `sim.ts` while uf1-15 is in flight.

Dev port **5270** was not probed at setup (no AC here needs a served page — this story is a CLI
tool and a vitest gate, with no render surface).

---

## 📌 OPEN QUESTION — deliberately NOT settled by this story

The description carries it and it stays out of scope: **should the guard run cabinet-wide?** Every
other game writes the same `<file>:<span>` comment habit and none has a citation gate. Answering it
needs the resolver taught about `@shared` and the monorepo root (**already done for star-wars** —
`resolve() :210-227` takes `repoRoot`), then a measured count per game. **Raise it with numbers,
not a guess.** SM will file it at finish with whatever count this story's work makes cheap to take.

**Not `td1-14`.** That story owns the non-unique-verbatim guard clause for the *relocation search*
in both tools. This one is scope, the opt-out, the docs and a dead parameter. No overlap; do not
merge them.

---

## ✅ ACCEPTANCE CRITERIA

Reproduced **verbatim** from `sprint/epic-sw8.yaml` and **not edited** — verified byte-exact by a
`python3` `in` test against `yaml.safe_load`, not by eye.

- AC1 SCOPE — the guard sees its own directory and its own type declarations. checkTree default roots include <swRoot>/tools alongside src, tests and docs/superpowers/specs, and SCAN_EXT includes ".mts" (measured: extname("check-comment-citations.d.mts") === ".mts", so both .d.mts files are invisible today even with tools/ added). A test asserts the default root list and the extension list by value, and a planted stale citation inside a tools/ file is reported.

- AC2 THE FRESH COUNT — measured before promising green, not after. Adding tools/ surfaces exactly 10 pre-existing stale citations, all in the bake tools (tools/music-bake x5, tools/pokey-bake x2, tools/speech-bake x1, plus 2 dangling refs); adding .mts surfaces 1 more; anchoring the pragma (AC3) surfaces 2 more inside the guard itself. Full list with SM measurements is in the context file. Every one is either re-anchored or dispositioned under AC5, and the tree-wide gate exits 0 at the end. Re-measure at RED: the count is a claim with a timestamp and a-3 is editing star-wars core concurrently.

- AC3 THE OPT-OUT IS ANCHORED — IGNORE_PRAGMA takes effect only when it appears as a leading comment (an exact-line or first-N-lines match), never on a bare mention anywhere in the file. Pinned by the exact review fixture, re-measured by SM on 2026-08-02: a fixture carrying one stale citation reports 1 error; the SAME fixture preceded by the sentence "The guard honours a citation-guard: ignore-file pragma" reports 0 today and MUST report 1 after this story.

- AC4 THE SKIP IS LOGGED — when the pragma fires, checkTree reports the skipped file by name on stdout/stderr, so a whole-file drop-out is never silent. The two deliberate users (tests/audit/comment-citations.test.ts and tests/audit/sw8-18-remediation.test.ts) appear in that output, and a test asserts the skip is announced rather than inferred.

- AC5 EXAMPLES ARE DISOWNED, NOT "CORRECTED" — three of the newly-surfaced errors are citation-shaped EXAMPLES that document the defect class rather than assert anything: the guard header's elided `...design.md:47-48`, the header's deliberately-historical `:2273-2290` (gameRules.ts' LIVE citation is the corrected `WSMAIN.MAC:2271-2290`), and check-comment-citations.d.mts's bare `:2273-2290` illustrating span inheritance. They are disowned with the existing RETIRED: marker or an equivalent named marker — NOT rewritten into currently-true citations, which would destroy the thing they document. A test proves the guard is green on its own tooling AND that removing the marker from any one of the three reddens it.

- AC6 UNCATCHABLE NAMES THE TWO BIGGEST LIMITS, WITH THE MEASURED PARTITION — of 1000 line-span citations in the scanned tree, 744 (74.4%) receive existence/range checking ONLY. Critically these are ONE population, not two: 698 have no adjacent delimited span at all, and 46 have one that isFragment drops to null because it is a single token (measured samples: TGPROB, FIRE_MASK, SCRSHLD, SCRWAV, CPHTSA). UNCATCHABLE states the percentage, states that the single-token case is a SUBSET of it rather than an additional limitation, and a test asserts both facts are present.

- AC7 fromFile IS GONE — USER RULING 2026-08-02, drop rather than wire. Removed from CheckOptions in check-comment-citations.d.mts, from checkTree's call site, and from all six call sites in tests/audit/comment-citations.test.ts (lines 73, 243, 259, 281, 347, 360). Census backing the ruling: ZERO relative-path citations exist in the scanned tree, and the 8 basename collisions are already covered by the documented path-qualified rule. sw8-18's item-7 mutation test currently varies fromFile and provably has NO effect — it is rewritten to vary something the implementation actually reads, and that new mutation is proven to redden.

---

## 📄 ORIGINAL DESCRIPTION — reproduced unedited

Nothing below is corrected; the measurement table at the top found no defects in it. The three
SM additions (M1, M2, M3) and the two user rulings (R1, R2) sit ABOVE it and outrank it where
they overlap.

```
Four findings from sw8-18's review, all in plugins/star-wars/tools/audit/check-comment-citations.mjs, all the same shape: the guard has gaps it does not disclose.

(1) IT CANNOT SEE ITS OWN DIRECTORY. checkTree walks src, tests and docs/superpowers/specs — never tools/. So the guard does not check its own citations, nor those of check-citations.mjs, reanchor-citations.mjs or linked-modules.mjs. This is not hypothetical: at review the module's own header cited design.md:45-46 for the longplay observation that sits at :47-48, i.e. the exact defect class the tool exists to catch, inside the tool, invisible by construction. (That one citation was corrected in sw8-18's chore; the scope gap was not.) Adding tools/ will surface a fresh count — measure it before promising green.

(2) THE OPT-OUT FIRES ON A MENTION. checkCitations gates on `raw.includes(IGNORE_PRAGMA)` with no anchoring, so any file containing the string `citation-guard: ignore-file` — including inside a backticked example, or in prose describing the pragma — silently drops out of the scan entirely. VERIFIED at review: a fixture with one stale citation reports 1 error; the same fixture with the sentence "The guard honours a citation-guard: ignore-file pragma" above it reports 0. Nothing trips it accidentally today (only the two sw8-18 test files carry it deliberately), but docs/superpowers/specs IS in scope, so the first spec that documents this guard retires itself. Anchor it — leading comment only, or first N lines, or an exact-line match — and LOG when it fires. A silent whole-file skip is the worst failure mode a completeness tool can have.

(3) UNCATCHABLE OMITS THE TWO BIGGEST LIMITATIONS. AC7 of sw8-18 was met to its letter (the nine prose items are named), but measured over the scanned tree: 744 of 1000 line-span citations — 74% — get existence/range checking ONLY, because no usable quote is adjacent to them; and a citation whose adjacent quote is a single token is never verbatim-checked at all (mutant `(`TGPROB:`, WSCPU.MAC:999)` -> MISSED). Both are consequences of rules that are individually correct — a quote must contain whitespace or our own identifiers get checked against the ROM. The problem is that a reader seeing a green run infers "the citations are true" when three-quarters were only checked for "the file exists and the number is in range". Say so in UNCATCHABLE.

(4) `fromFile` IS DEAD. CheckOptions.fromFile is declared in the .d.mts, passed by checkTree and by six test call sites, and never read anywhere in the implementation. sw8-18's item-7 mutation test varies it specifically to simulate the citation living in a different file, and that variation has no effect — so the suite reads as covering citing-file-relative resolution that nothing implements. Either wire it into resolve() (relative paths resolved against the citing file, before the basename index) or drop it from the interface and the call sites.

OPEN QUESTION, deliberately not settled here: should the guard run cabinet-wide? Every other game carries the same comment style and the same <file>:<span> habit and none has any citation gate. Answering it needs the resolver taught about @shared and the monorepo root first (already done for star-wars), then a measured count per game. Raise it with numbers, not a guess.

NOT td1-14: that story owns the non-unique-verbatim guard clause for the relocation search, in both tools. This one is about scope, the opt-out, the docs and a dead parameter — no overlap.
```
