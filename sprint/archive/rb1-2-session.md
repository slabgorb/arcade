---
story_id: "rb1-2"
jira_key: ""
epic: "rb1"
workflow: "trivial"
---
# Story rb1-2: Source findings / fidelity spec

## Story Details
- **ID:** rb1-2
- **Jira Key:** (none — local sprint tracking only)
- **Workflow:** trivial (phased: setup → implement → review → finish)
- **Stack Parent:** none
- **Points:** 3
- **Type:** chore

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-09T09:29:37Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-09T08:55:38Z | 2026-07-09T08:58:08Z | 2m 30s |
| implement | 2026-07-09T08:58:08Z | 2026-07-09T09:21:33Z | 23m 25s |
| review | 2026-07-09T09:21:33Z | 2026-07-09T09:29:37Z | 8m 4s |
| finish | 2026-07-09T09:29:37Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### Dev (implementation)
- **Gap** (non-blocking for rb1-2; blocking for authentic-plane render): the picture-ROM *source* `RBPICS.MAC` (037007) + `RBCHAR.MAC` (037006) are **absent** from the `historicalsource/red-baron` checkout, so the biplane's face/line **connect-lists** (`DB.MAP`/`DB.MAR`/`DB.LNS`) are not enumerable — we have all 42 authentic vertices but not which lines connect them. Affects any future authentic-plane render story (needs the connect-lists). Recovery: find `RBPICS.MAC`/`RBCHAR.MAC` upstream, or disassemble `037007.XXX`/`037006.XXX` (raw bytes present). Documented in the findings doc §7/§9. *Found by Dev during implementation → candidate follow-up story before rb1's/rb2's plane geometry.*
- **Conflict → resolved** (non-blocking): two research passes disagreed on which build shipped (RBARON/RBGRND `FRMECNT=4` → 62.5 Hz vs R2 set `FRMECNT=5` → 50 Hz). Adjudicated in-doc via the `RBARON.COM`/`R2BRON.COM` LINK recipes + release part numbers → **62.5 Hz canonical**. A MAME romset cross-check would close it fully if display-rate fidelity ever matters. Affects `docs/red-baron-1980-source-findings.md` §1 (already reflects the resolution). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the shipped frame cadence is a hard cross-story constraint (sim tick = calc-frame ~10.4 Hz, NOT the 62.5 Hz display rate — ticking at display rate runs ~6× too fast). Worth promoting into `context-epic-rb1.md` Background so rb1-3+ inherit it. Affects `sprint/context/context-epic-rb1.md`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the attestation test's axis-coverage regexes match bare common words (`sound`, `frame`, `object`, `points`) with no word boundaries, so its stated guarantee — "a doc that silently drops an axis fails here" — is weaker than claimed (a doc could drop the POKEY axis yet pass on "sound approach"). Fix is safe and cheap: swap in axis-unique ROM tokens that already appear in the doc (`pokey|audc|audf`, `calcnt|frmecnt|nmi`, `vertex|connect-list`) and consider raising the 2000→~8000 char floor and/or asserting a minimum `##` section count (doc has 12). Affects `red-baron/tests/findings-doc.test.ts`. *Found by Reviewer during code review — non-blocking; deliverable (the doc) is verified accurate.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Added a findings-doc attestation test (`tests/findings-doc.test.ts`)**
  - Rationale: mirrors the sibling bz1-2 precedent (`battlezone/tests/findings-doc.test.ts`); red-baron already has a Vitest harness (rb1-1); a cheap guard that stops a future edit from silently gutting the citation-authority doc and gives the Reviewer a concrete gate. Reads only red-baron's own tree (passes in a fresh clone with no quarry).
  - Severity: minor
  - Forward impact: none — additive; no sim/render surface.
- **Gitignored `.session/` in addition to `reference/`**
  - Rationale: the testing-runner writes a transient cache to `red-baron/.session/test-runs/`; asteroids + star-wars already gitignore `.session/`. Keeps the working tree clean (dev-exit gate) and matches sibling convention.
  - Severity: minor
  - Forward impact: none.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)
- **Added a findings-doc attestation test (`tests/findings-doc.test.ts`)**
  - Spec source: context-story-rb1-2.md, ACs (trivial workflow — no test required)
  - Spec text: derived ACs list the doc + citations + axes; no test is called for, and `trivial` has no RED phase.
  - Implementation: added an 8-assertion Vitest attestation guard (doc exists / >2000 chars / cites `historicalsource/red-baron` / names all four axes).
  - Rationale: mirrors the sibling bz1-2 precedent (`battlezone/tests/findings-doc.test.ts`); red-baron already has a Vitest harness (rb1-1); a cheap guard that stops a future edit from silently gutting the citation-authority doc and gives the Reviewer a concrete gate. Reads only red-baron's own tree (passes in a fresh clone with no quarry).
  - Severity: minor
  - Forward impact: none — additive; no sim/render surface.
- **Gitignored `.session/` in addition to `reference/`**
  - Spec source: context-story-rb1-2.md, AC-1 (only names `reference/` as gitignored)
  - Spec text: "reference/ quarried … (gitignored — raw source not committed)".
  - Implementation: `red-baron/.gitignore` now ignores `reference/` AND `.session/` (+ `.DS_Store`).
  - Rationale: the testing-runner writes a transient cache to `red-baron/.session/test-runs/`; asteroids + star-wars already gitignore `.session/`. Keeps the working tree clean (dev-exit gate) and matches sibling convention.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
- **Added a findings-doc attestation test** → ✓ ACCEPTED by Reviewer: sound — mirrors the sibling bz1-2 precedent (`battlezone/tests/findings-doc.test.ts`) exactly, reads only red-baron's own tree (passes in a fresh clone), and gives a concrete CI guard against a future edit gutting the citation-authority doc. The test itself has two robustness weaknesses (see [TEST] findings) but adding it is the correct call, not a deviation to reverse.
- **Gitignored `.session/` in addition to `reference/`** → ✓ ACCEPTED by Reviewer: correct — asteroids + star-wars already ignore `.session/`; the testing-runner writes a transient cache there, and leaving it untracked keeps the dev-exit "clean tree" gate honest. Verified `git check-ignore` covers `reference/` recursively (security specialist confirmed).
- No **undocumented** deviations found: the diff is exactly the three files Dev logged (doc + test + gitignore); the doc's shipped-build adjudication (62.5 Hz) is documented, not a silent choice.

## SM Assessment

**Diagnosis (Organic Mechanic):** Clean 3pt `trivial`/chore research story. Survives —
its one dependency (the source disassembly) is confirmed reachable, so nothing blocks the
implement phase. Documentation deliverable only; no sim/render code, no test cycle.

**Branch Strategy:** `chore/rb1-2-source-findings` in the **red-baron** subrepo (off
`develop`). red-baron has **NO GitHub remote** (local-only bootstrap policy inherited from
rb1-1) → local commits only, **no push, no PR**. Finish = local merge to `develop`.
Orchestrator repo: no commits unless the user asks.

**Source verified at setup (input exists):** GitHub `historicalsource/red-baron` is public
and complete — `RBARON.MAC`, `RBSOUN.MAC`, `RBGRND.MAC`, `MBUCOD.*` (Math Box microcode),
`VG*.MAC` (AVG), and the `036xxx`/`037xxx` picture ROMs incl. `PLANE POINTS DB`. Dev clones
it into `red-baron/reference/` (gitignored); only the distilled findings doc is committed.

**Route:** → **Dev (The Word Burgers)**, **implement** phase. This is a phased *trivial*
workflow — **no RED/TDD phase, no TEA**. Deliverable mirrors **bz1-2**: a fidelity-spec
markdown authored in the red-baron subrepo distilling four axes — mechanics, **timing
(nail the ÷N frame-cadence divider — the Asteroids ÷4 trap)**, sound (RBSOUN POKEY tables),
object data — each finding citing its `.MAC` source. Consume `@arcade/shared/math3d`; do NOT
re-port the Math Box. Scope to seed rb1-3 + rb2–rb5; **do not gold-plate** unreached fidelity.
Full detail + derived ACs in `sprint/context/context-story-rb1-2.md`.

**Setup complete:**
- Session file created (workflow `trivial`, phase `setup`)
- Story context curated at `sprint/context/context-story-rb1-2.md` (verified source inventory, deliverable shape, derived ACs — replaced bare YAML template)
- Epic context intact (not clobbered)
- Feature branch `chore/rb1-2-source-findings` live in red-baron
- Ready for implement phase (Dev)

## Dev Assessment

**Implementation Complete:** Yes

**Approach:** Cloned `github.com/historicalsource/red-baron` (the original Atari MAC65
6502 source, proj 22603) into the gitignored `red-baron/reference/` quarry, then fanned out
four parallel read-only research passes (my "Scroungers") over the disassembly — one per axis:
mechanics, timing, sound, object data — each returning `file:label`-cited findings tagged
ROM-verified vs inferred. Synthesized them into a single committed fidelity spec in the
battlezone house style, adjudicating the one cross-pass conflict against primary evidence.

**Files Changed (red-baron subrepo, branch `chore/rb1-2-source-findings`, commit `b122562`):**
- `docs/red-baron-1980-source-findings.md` — the committed fidelity spec (11 sections): frame
  cadence (§1), flight-camera pipeline (§2, seeds rb1-3), enemy AI (§3), wave sequence (§4),
  collision/lives (§5), POKEY+analog sound (§6), object/vector data (§7), Math Box conventions
  (§8), verified-vs-gaps (§9), what-this-seeds (§10), provenance (§11). Every material fact cited.
- `tests/findings-doc.test.ts` — 8-assertion attestation guard (exists / substantive / cites
  `historicalsource/red-baron` / covers all four axes). Reads only red-baron's own tree.
- `.gitignore` — ignore `reference/` (raw quarry, checkout-local) + `.session/` + `.DS_Store`.

**Key result — the frame-cadence trap (the story's headline finding):** shipped Red Baron is
`RBARON`+`RBGRND` (`FRMECNT=4`) per the `RBARON.COM` LINK recipe → **250 Hz NMI, 62.5 Hz VG
refresh, but the sim advances one step per ~10.4 Hz calculation frame (`CALCNT=0x18`)**. A port
ticking motion at the 62.5 Hz display rate runs **~6× too fast** — the Red Baron analogue of the
Asteroids ÷4 trap. Enemy-shell launch is a further ÷4, plane fire ÷2, off the `FRAME` counter.

**Adjudication:** the two build variants (RBARON/RBGRND 62.5 Hz vs R2BRON/R2GRND 50 Hz) were
resolved to 62.5 Hz canonical via the `.COM` link recipes + release part numbers (see doc header).

**Tests:** 24/24 passing (GREEN) — `tests/scaffold.test.ts` 16 (rb1-1 regression, no breakage)
+ `tests/findings-doc.test.ts` 8 (new). Build clean (`tsc --noEmit && vite build`).

**Branch:** `chore/rb1-2-source-findings` (red-baron, **local — NOT pushed; no GitHub remote**
per the rb1-1 bootstrap policy). Working tree clean. No PR (subrepo has no remote).

**Delivery Findings:** one **Gap** (picture-ROM source `RBPICS.MAC`/`RBCHAR.MAC` absent → plane
connect-lists not enumerable → follow-up story before authentic-plane render), one resolved
**Conflict** (frame-rate build), one **Improvement** (promote the cadence constraint to epic
Background). See the Delivery Findings section above.

**Handoff:** → Reviewer (Immortan Joe) for the review phase. This is a documentation deliverable —
review is primarily a **citation audit**: spot-check the doc's `.MAC` citations against the
gitignored `reference/red-baron/` quarry (present in this checkout) and sanity-check the
frame-cadence adjudication against `RBARON.COM`/`R2BRON.COM`.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 24/24 GREEN, build clean, 0 code smells, reference/ untracked |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (no boundary/path surface in a doc + fs-read test) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (no error-swallowing surface) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2 (both non-blocking: 1 Medium, 1 Low), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (doc prose audited by Reviewer directly — citation audit) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (no types declared; rule-checker covered TS) |
| 7 | reviewer-security | Yes | clean | none | N/A — reference/ recursively ignored + untracked + no remote; test path bounded, no traversal |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (54-line test + 3-line gitignore; nothing to simplify) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 16 TS/CLAUDE.md rules, 14 instances, 0 violations; mirrors scaffold.test.ts |

**All received:** Yes (4 enabled returned; 5 disabled via settings, do not block the gate)
**Total findings:** 2 confirmed (0 blocking — 1 Medium, 1 Low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

This is a documentation deliverable (a ROM fidelity spec + an additive attestation test + a
gitignore entry). The adversarial core for such a story is the **citation audit** — does the doc
tell the truth about the source? — which no subagent covers, so I did it by hand.

**Observations:**

- [VERIFIED] **Citation audit — the doc is faithfully cited.** I spot-checked ~18 specific
  `.MAC:line` claims spanning all four axes against the gitignored `reference/red-baron/` quarry;
  **every one is accurate to the line.** Evidence: timing — `RBGRND.MAC:61` `FRMECNT=4`,
  `RBARON.MAC:620` `CALCNT =18`, `:621` `BNRCNT =0C`, `:102`(grnd) NMI "EVERY 4 MS", `:140`/`:868`
  `FRAME`; dividers — `RBARON.MAC:4023` `AND I,3 ;1 OUT OF 4 FRAMES`, `:4805` "EVERY OTHER FRAME";
  object — `:29-30` `POINTP → .BYTE .Z,.X*2,.Y*4`, `:6207` `PLANE POINTS DB`, `:6225`
  `POINTP -40,20,-40 ;12 TOP WING` (exact); flight — `:5923` `POTDLY: .4WORD -32.,-23.,…,25.`;
  enemy — `:462` `N.MOB … 3 MOTION OBJECTS`, `:2474` `PLNLVL: .BYTE 0,0,0,0,1,2,…,5`; sound —
  `RBSOUN.MAC:124` the stale "6 BYTES PER SOUND NUMBER" comment the doc correctly flags, and the
  `SOUND 1/2/3` triggers at `RBARON.MAC:2313/1594/3038`.
- [VERIFIED] **The 62.5 Hz shipped-build adjudication is correct.** The doc resolves the
  RBARON/RBGRND (`FRMECNT=4`, 62.5 Hz) vs R2 (`FRMECNT=5`, 50 Hz) ambiguity to 62.5 Hz. Evidence:
  `RBARON.COM` assembles+links `RBGRND` and emits the release part images `037001.01…`; `R2BRON.COM`
  links `R2GRND` and emits only the `036996.02` EPROM revision. The adjudication is sound and its
  reasoning is in the doc header — not a silent choice.
- [VERIFIED] **The doc does not overclaim.** [inferred] tags are applied honestly (axis handedness,
  LOD reading, wall-clock rate), and the picture-ROM source gap (`RBPICS.MAC`/`RBCHAR.MAC` absent →
  plane connect-lists not enumerable) is documented in §7/§9, not papered over.
- [TEST] **Axis-coverage regexes are weaker than their stated intent (Medium, non-blocking).** The
  four `toMatch` guards use bare common words (`sound`, `frame`, `object`, `points`) with no word
  boundaries, so the test's promise — "a doc that silently drops an axis fails here" — doesn't hold
  ("sound approach"/"framework" would satisfy it). Confirmed high-confidence by test-analyzer. Does
  NOT block: the test passes on the *actual* doc, which my audit proves is correct; this is a
  robustness gap in an additive guard, not a defect in the deliverable. Fix is safe and cheap —
  swap in axis-unique tokens that already occur in the doc (`pokey|audc|audf`, `calcnt|frmecnt|nmi`,
  `vertex|connect-list`; counts verified: POKEY 12, AUDC 3, FRMECNT 6, vertex 7, connect-list 6).
  Captured as a non-blocking Delivery Finding.
- [TEST] **The 2000-char "substantive" floor is gameable (Low, non-blocking).** Raw char count is
  padding-satisfiable. But the in-file comment explicitly calls it "a deliberately low floor" — a
  documented, intentional tradeoff — so this is Low; folded into the same hardening recommendation
  (raise floor + assert a `##` section-count; doc has 12).
- [SEC] **Clean — verified.** `git check-ignore` confirms `reference/` matches recursively;
  `git ls-files`/`git log --all` confirm the third-party quarry was never staged or committed; the
  subrepo has no remote. The test's file path is built solely from `import.meta.url` + a literal —
  no user input, no traversal vector.
- [RULE] **Clean — verified.** rule-checker ran the full `typescript.md` checklist + 3 CLAUDE.md
  conventions (16 rules, 14 applicable instances): no `as any`, no non-null `!`, no enum/generic/
  null-handling anti-patterns, correct `existsSync(DOC) ? … : ''` guard (not a `||` falsy trap),
  ESM + strict, and it mirrors the sibling `scaffold.test.ts` idiom exactly.
- [DOC] N/A — comment-analyzer disabled; doc prose was audited directly (see the citation audit).
- [TYPE] N/A — type-design disabled; no types are declared (a 54-line fs-read test); TS rules
  covered by rule-checker.
- [EDGE] N/A — edge-hunter disabled; the only path is a bounded file read with an `existsSync`
  guard returning `''` on absence (which then fails the downstream assertions — correct).
- [SILENT] N/A — silent-failure-hunter disabled; no error-swallowing surface (no try/catch, no
  fallbacks that hide failure).
- [SIMPLE] N/A — simplifier disabled; nothing to simplify in a 54-line test + a 3-line gitignore.

**Data flow traced:** the only runtime path is the test — `import.meta.url` → repo root → fixed
`docs/red-baron-1980-source-findings.md` → `readFileSync` → four attestation assertions. No
external/user input enters the path; safe (confirmed by [SEC]).

**Pattern observed:** the deliverable faithfully mirrors the established `bz1-2` quarry pattern —
gitignored `reference/` + committed `docs/<game>-1980-source-findings.md` + a `tests/findings-doc.test.ts`
attestation guard (`red-baron/docs/red-baron-1980-source-findings.md`, `tests/findings-doc.test.ts:1`).

### Rule Compliance

No `.claude/rules/*.md` and no `SOUL.md` exist. Applicable CLAUDE.md conventions, enumerated against
the one code file (`tests/findings-doc.test.ts`) and the config change (`.gitignore`):
- **TS strict mode** — compliant: covered by unmodified `tsconfig.json` (`strict: true`, `include`
  covers `tests`); build `tsc --noEmit` clean.
- **ES modules** — compliant: ESM `import` only, matches `package.json` `"type": "module"`.
- **Vitest / sibling convention** — compliant: same `describe/it/expect` + `node:*` imports + the
  `join(dirname(fileURLToPath(import.meta.url)), '..')` idiom as `tests/scaffold.test.ts`.
- **No backend / no secrets / client-side only** — compliant: no network, secrets, or auth surface;
  the diff is a doc + a test + a gitignore.
- **Quarry never committed** — compliant: `.gitignore` `reference/` verified recursive + untracked.
Every applicable rule instance is compliant; zero violations across preflight, security, and rule-checker.

### Devil's Advocate

Argue this is broken. First attack: the doc is *confidently wrong* somewhere and a later story
(rb1-3's flight camera, rb2's enemy AI) inherits a bad constant as gospel. Mitigation held: I
spot-checked ~18 citations across every axis and all matched to the line, including the subtle ones
(the stale "6 BYTES" comment, the exact `POTDLY`/`PLNLVL` byte tables, the `POINTP -40,20,-40` wing
vertex) — the sample is broad enough that a systemic fabrication would almost certainly have surfaced.
Second attack: the 62.5-vs-50 Hz call is wrong and MAME actually ships the R2 build, so every future
port ticks the display 20% slow. This is the doc's riskiest single claim, and it is *inferred from
build recipes, not confirmed against a MAME romset* — I rate it well-supported (RBARON.COM emits the
exact release part numbers) but not certain; the doc itself says as much and recommends a MAME
cross-check, so the risk is disclosed, not hidden. Third attack: the picture-ROM gap means nobody can
actually render the authentic biplane from this doc — true, but it is explicitly flagged as a blocking
gap for that future work, which is the honest outcome, not a defect. Fourth attack, the real one: the
attestation test lies. Its comment promises it fails a doc that drops an axis, but a future dev could
delete the entire frame-cadence section and the `/cadence|frame|timing/` regex would still pass on the
word "framework" elsewhere — so CI would stay green on a gutted doc. That is a genuine weakness (the
[TEST] Medium finding), but it degrades a *safety net*, not the artifact under review; the doc today is
correct and the fix is trivial. Fifth: a confused reader treats an [inferred] claim as [ROM-verified].
Mitigation: every inference is tagged, and §9 segregates verified-vs-gaps explicitly. None of these
rise to Critical/High. The deliverable is sound; the only actionable improvement is hardening the guard.

**Handoff:** To SM (The Organic Mechanic) for finish-story. No blocking issues; two non-blocking
[TEST] robustness findings captured as a Delivery Finding for a cheap fast-follow.