---
story_id: mc12-3
jira_key: mc12-3
epic: mc12
workflow: tdd
---
# Story mc12-3: Pointer-lock TRACKBALL aim, made the DEFAULT (matching centipede/millipede)

## Story Details
- **ID:** mc12-3
- **Jira Key:** mc12-3
- **Workflow:** tdd
- **Type:** enhancement
- **Points:** 3
- **Priority:** p2
- **Repos:** arcade
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-17T00:12:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T23:31:29Z | 2026-08-16T23:34:01Z | 2m 32s |
| red | 2026-08-16T23:34:01Z | 2026-08-16T23:48:32Z | 14m 31s |
| green | 2026-08-16T23:48:32Z | 2026-08-16T23:59:59Z | 11m 27s |
| review | 2026-08-16T23:59:59Z | 2026-08-17T00:12:05Z | 12m 6s |
| finish | 2026-08-17T00:12:05Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking): mc gained its FIRST main.ts boot-test harness (`tests/helpers/boot-shell.ts`) this story; prior mc main.ts wiring pins (mc8-4, mc10-4, place-cursor) are source-scans only, which cannot prove a seam is REACHED. Affects `plugins/missile-command/tests/` — future mc wiring stories should assert behaviour through the harness (boot + emit) rather than `?raw` scans alone. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `place-cursor.test.ts`'s top-of-file docstring is mc10-1's historical narrative and its "rewires main.ts" clause now reads stale after mc12-3 reversed that wiring. Affects `plugins/missile-command/tests/place-cursor.test.ts:1-9` (a one-line pointer to the in-file AC2-superseded block would remove the ambiguity). Non-blocking — follows the repo's per-story historical-docstring convention and the same file already carries a prominent superseded block. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **mc gets its OWN createPointerLock — not a cross-plugin import**
  - Spec source: context-story-mc12-3.md, AC1
  - Spec text: "clicking the canvas requests pointer lock via the REUSED createPointerLock (from centipede/millipede — no new bespoke lock controller)"
  - Implementation: tests require `createPointerLock` to be defined/exported from mc's OWN `plugins/missile-command/src/shell/input.ts` (mirroring millipede's ml10-4 controller), NOT imported from `plugins/centipede/...`.
  - Rationale: centipede (shell/input.ts:180) and millipede (shell/input.ts:128) each carry their own copy; mc has zero cross-plugin imports (plugin isolation), so "reuse" = mirror the implementation, as millipede did from centipede.
  - Severity: minor
  - Forward impact: none
- **TRACKBALL_SCALE is a new sub-unity constant with no ROM value; tests pin its direction, not its magnitude**
  - Spec source: context-story-mc12-3.md, AC1
  - Spec text: "mouse movementX/Y drives the crosshair through the existing pure core moveCursor, scaled to a non-twitchy trackball feel"
  - Implementation: tests require an exported `TRACKBALL_SCALE` in the open interval (0,1) and that `main.ts` applies it to the locked motion; the exact value is left to Dev/owner tuning.
  - Rationale: the ROM cursor motion is a bare `ADD TBALL TO CURSOR` (W3MAIN:546) with NO scale constant, so "scaled" is a shell FEEL factor; mc10-1 proved 1px=1unit IS twitchy, so "not twitchy" means de-sensitised below unity — the direction is faithful, the value is tuning.
  - Severity: minor
  - Forward impact: none
- **AC2's "logged as a Design Deviation / ADR-delta" is covered by process, not a vitest**
  - Spec source: context-story-mc12-3.md, AC2
  - Spec text: "the switch is logged as a Design Deviation / ADR-delta referencing mc10-1's 'trackball as a later mode' deferral — never a silent reversal"
  - Implementation: no automated test asserts the deviation text; mc has no ADR-file convention (mc10-1's absolute-aim decision lives in docs/rom-study/brief.md, not a design ADR). The behavioural half of AC2 (placeCursor is no longer the live-aim path) IS pinned; the logging half is enforced by pf's `deviations-logged` gate + Dev's `### Dev (implementation)` session entry at GREEN.
  - Rationale: there is no doc-test seam to pin an ADR delta faithfully; over-fitting a source scan to a prose sentence would be a vacuous guard.
  - Severity: minor
  - Forward impact: none — Dev must still log the ADR-delta in this session's `### Dev (implementation)` subsection at GREEN.

### Dev (implementation)
- **ADR-delta: live aim switched from ABSOLUTE (mc10-1) to pointer-lock TRACKBALL, made the default**
  - Spec source: context-story-mc12-3.md, AC2
  - Spec text: "the absolute placeCursor path (main.ts:85-89) is no longer the live-aim path ... the switch is logged as a Design Deviation / ADR-delta referencing mc10-1's 'trackball as a later mode' deferral — never a silent reversal"
  - Implementation: `src/main.ts` live aim is now `applyPointerMotion(game.cursor, event.movementX * TRACKBALL_SCALE, event.movementY * TRACKBALL_SCALE)` on a canvas `mousemove`, gated on `document.pointerLockElement === canvas`; a canvas `click` requests lock through the reused `createPointerLock`. The absolute `cursor: placeCursor(clientX-left, …)` `pointermove` handler and the `placeCursor` import are removed from main.ts. Core `placeCursor` (core/cursor.ts) is retained and unchanged, no longer called for live aim.
  - Rationale: completes mc10-1's OWN explicit deferral of "trackball (relative + pointer-lock, scaled) as an optional later mode" — pointer lock removes the twitch (unbounded deltas + sub-unity TRACKBALL_SCALE) that made relative-without-lock unusable; it is not a reversal of the mc10-1 twitch fix.
  - Severity: major
  - Forward impact: none — no downstream story depends on absolute live aim; mc10-1 is hereby completed.
- **Retired mc10-1's superseded absolute-wiring source pins in place-cursor.test.ts**
  - Spec source: context-story-mc12-3.md, AC2
  - Spec text: "never a silent reversal"
  - Implementation: removed the four source-text assertions in place-cursor.test.ts's `AC2 — main.ts is rewired … to absolute placement` describe block (they pinned main.ts reading no movementX/Y, assigning `cursor: placeCursor(`, mapping clientX/clientY, and importing placeCursor — the exact wiring mc12-3 reverses). Replaced with a documented supersession note; the main.ts aim wiring is now owned by tests/pointer-lock.test.ts. The AC1 pure-`placeCursor`-FUNCTION tests in the same file are untouched.
  - Rationale: those guards pinned behaviour mc12-3 removes and could not coexist with the trackball default; current behaviour keeps full coverage via pointer-lock.test.ts, so no real coverage is lost. TEA missed this coexistence conflict at RED (place-cursor.test.ts source-scans main.ts); it surfaced at the GREEN full-suite run.
  - Severity: minor
  - Forward impact: none
- **"Lock-exit resets input state" realised by the lock gate, not an accumulator reset**
  - Spec source: context-story-mc12-3.md, AC1
  - Spec text: "a lock-exit resets input state (centipede parity)"
  - Implementation: mc reuses the EXISTING pure `applyPointerMotion` (immediate apply), which has no per-frame accumulator like centipede's `createMouseAdapter`; so the mousemove handler is gated on `document.pointerLockElement === canvas` — the instant the lock leaves the canvas the mouse stops driving the crosshair (no residual/drift), and `createPointerLock`'s `onExit` restores the OS cursor. TRACKBALL_SCALE = 0.35 (a sub-unity value; feel tuning per TEA's direction-only deviation).
  - Rationale: the context (higher authority than the epic description) mandates reusing the immediate applyPointerMotion; with no accumulator there is nothing to drain, so the equivalent of centipede's reset is the lock-state gate.
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **[TEA] mc gets its OWN createPointerLock — not a cross-plugin import** → ✓ ACCEPTED by Reviewer: verified — `createPointerLock` is defined at shell/input.ts:82 and imported via `./shell/input.js`; grep confirms zero `plugins/centipede`/`plugins/millipede` import paths in mc src/tests. Matches the fleet per-plugin-ownership model.
- **[TEA] TRACKBALL_SCALE is a new sub-unity constant with no ROM value; tests pin direction not magnitude** → ✓ ACCEPTED by Reviewer: sound — the ROM cursor motion is a bare `ADD TBALL TO CURSOR` (no scale byte), so a shell feel-factor is correct; pinning 0<scale<1 (not the value) is the right fidelity boundary. Value shipped = 0.35.
- **[TEA] AC2's "logged as ADR-delta" is covered by process, not a vitest** → ✓ ACCEPTED by Reviewer: correct — mc has no ADR-file convention; over-fitting a source scan to a prose sentence would be a vacuous guard. The logging half is satisfied by the Dev deviation below + this audit.
- **[Dev] ADR-delta: live aim switched from ABSOLUTE (mc10-1) to pointer-lock TRACKBALL, made the default** → ✓ ACCEPTED by Reviewer: this IS the AC2-mandated ADR-delta; it references mc10-1's explicit "trackball as a later mode" deferral and completes it — not a silent reversal. Severity major is apt (input-mechanism change); forward impact none confirmed (no downstream story depends on absolute aim).
- **[Dev] Retired mc10-1's superseded absolute-wiring source pins in place-cursor.test.ts** → ✓ ACCEPTED by Reviewer: surgical and correct — the 4 removed pins asserted the exact main.ts wiring mc12-3 reverses; all 14 retained AC1 tests still fully cover the pure `placeCursor` FUNCTION (interior mapping, all-edge clamps, off-canvas, referential transparency, degenerate-canvas, anti-drift anchor). No function coverage lost; the new main.ts aim wiring is owned by pointer-lock.test.ts.
- **[Dev] "Lock-exit resets input state" realised by the lock gate, not an accumulator reset** → ✓ ACCEPTED by Reviewer: correct given the context-mandated reuse of the immediate `applyPointerMotion` (no accumulator exists); gating the mousemove on `document.pointerLockElement === canvas` makes residual/drift structurally impossible, and rule-checker rule 14 confirms the exit reset is wired once, centrally.

## Sm Assessment

Setup complete for mc12-3 (3pt, tdd) — pointer-lock trackball aim, made the default in Missile Command. Board was clear at setup (no sibling branch or session for mc12-3; a-1 on ml11-3, a-3 on df4-2), no blocking open PRs, cut from develop @ ad5c601d.

I measured the epic description's falsifiable file:line anchors before setup — two had drifted, and the corrections are recorded in a ⚠ block in the context file (ACs copied verbatim, unedited):
- The shell entry is `plugins/missile-command/src/main.ts` (the description's `src/shell/main.ts` does not exist). The absolute `placeCursor` live-aim call is at `src/main.ts:89` — AC2's "main.ts:85-89" resolves here, correct line, wrong path prefix.
- The pure relative applier + clamp is `moveCursor` at `core/cursor.ts:71`, NOT `game.ts:319/335` (that span is `attractDriver`, which merely calls moveCursor).

Key scope note for TEA/DEV: a relative pointer-motion adapter ALREADY exists and is UNWIRED — `applyPointerMotion` at `shell/input.ts:43` (dh=movementX, dv=-movementY V-flip → core moveCursor). The story's "movementX/Y adapter" is REUSE of this seam, not new construction. The real work is reusing centipede's `createPointerLock` (`plugins/centipede/src/shell/input.ts:180`) and rewiring `src/main.ts` so a canvas click requests lock and locked movement drives `applyPointerMotion` (default) instead of `placeCursor`, with lock-exit input reset (centipede parity). Shell-only + reuse of existing core, so the purity/citation gate (src/core only) must stay green. The switch is a completion of mc10-1, logged as an ADR-delta / Design Deviation, never a silent reversal.

Handing off to Leeloo (TEA) for RED.
## Tea Assessment

RED landed for mc12-3. One new test file drives the story; one new helper supports it.

**New tests (`plugins/missile-command/tests/pointer-lock.test.ts`, 16 cases):**
- **createPointerLock controller (behavioural, R4/R5)** — mirrors millipede ml10-4. request() calls canvas.requestPointerLock(); its returned promise NEVER rejects — a rejected thenable (re-lock cooldown) AND a synchronous throw (method unsupported) both route to the optional onReject sink and resolve; a void-returning legacy call still resolves; a pointerlockchange fires onExit on lock EXIT only (not on acquire), exactly once; dispose() detaches the listener.
- **TRACKBALL_SCALE (AC1 "scaled, not twitchy")** — an exported sub-unity factor in (0,1). Direction pinned, value left to Dev (no ROM constant exists — see the deviation).
- **main.ts wiring (source-read, comments stripped)** — reddening pins: createPointerLock imported, applyPointerMotion drives live aim, TRACKBALL_SCALE applied, and the absolute `cursor: placeCursor(...)` live-aim assignment is GONE (AC2).
- **Boot-harness behavioural wiring** — the key anti-dead-wiring proof (ml10-4 review round 1 lesson): a new `tests/helpers/boot-shell.ts` boots the REAL main.ts against a measured stub browser and asserts a canvas CLICK actually reaches `requestPointerLock` (0→1), and that no lock is requested before any gesture.

**Why a boot harness (mc's first):** every prior mc main.ts pin (mc8-4, mc10-4, place-cursor) is a `?raw` source scan, which proves a token EXISTS but not that the seam is REACHED — deleting the one `lock.request()` line leaves every source scan green. centipede and millipede both boot main.ts under `environment: 'node'`; mc now does too. The stub answers only the DOM members main.ts + the renderer actually touch (measured by grep, cited in the helper header) and throws loudly on anything else.

**AC coverage:**
- AC1 (click→lock via reused createPointerLock; locked movementX/Y → moveCursor scaled; lock-exit resets) — controller unit tests + TRACKBALL_SCALE + wiring pins + boot behavioural. The V-flip/clamp of the applier itself is ALREADY covered by input.test.ts and cursor.test.ts (applyPointerMotion ≡ moveCursor(dh, -dv), clamped) and is deliberately not re-proven.
- AC2 (placeCursor no longer the live-aim path; logged as ADR-delta) — behavioural half pinned (source guard on the absolute assignment); logging half is a process gate (see deviation).
- AC3 (crosshair still clamps, V-flip preserved, moveCursor unchanged, no clock/entropy in core, purity stays green) — testing-runner confirms purity.test.ts PASSES and core is untouched (shell-only story); clamp/V-flip covered by existing core tests.

**Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`):**
- **§7 Async/Promise patterns** — the R4 block is the centrepiece: request() is async, so a synchronous throw from calling requestPointerLock() would auto-wrap into a rejected promise; two tests pin that BOTH a rejected thenable and a sync throw are caught (no unhandled rejection) and reach onReject. This is the exact defect millipede's ml10-4 review round 1 raised.
- **§1 Type-safety escapes** — the runtime module loader validates `typeof mod.createPointerLock === 'function'` and `typeof mod.TRACKBALL_SCALE === 'number'` before casting (a type predicate WITH runtime validation), rather than a bare `as` bypass; the `as Partial<InputModuleLike>` is the fleet idiom for a not-yet-built module and is guarded by that check.
- **§4 Null/undefined** — the void-returning-requestPointerLock case and boot-shell's `?? ''` cover the non-thenable / absent-value paths; missing movementX/Y is already covered in input.test.ts.
- **§5 Module resolution** — tests dodge repo-wide tsc (TS2305) on unbuilt symbols via the runtime-path import trick + `?raw`; `npm run lint` verified GREEN with the new files present.

**Verification:** `npm run lint` GREEN; testing-runner reports missile-command 1414 passed / 15 failed, the 15 all in the new file, purity.test.ts among the 80 passing files — no scaffold/purity/citation guard disturbed.

**Handoff to Korben (Dev) for GREEN:** add `createPointerLock` (R4 sync+async catch, R5 exit onExit, dispose) and a sub-unity `TRACKBALL_SCALE` to `plugins/missile-command/src/shell/input.ts`; rewire `src/main.ts` so a canvas click requests lock through createPointerLock and locked movementX/Y drives `applyPointerMotion` scaled by TRACKBALL_SCALE as the DEFAULT live aim (retiring the absolute placeCursor pointermove), with onExit resetting the trackball input state; log the ADR-delta in the `### Dev (implementation)` deviation subsection.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/shell/input.ts` — added `TRACKBALL_SCALE` (0.35, sub-unity feel factor) and `createPointerLock(canvas, doc, onExit, onReject?)` (R4: request() never rejects — catches both a rejected thenable and a synchronous throw, routing the reason to onReject; R5: pointerlockchange fires onExit on lock EXIT; dispose() detaches). mc's own copy, mirroring millipede ml10-4 — no cross-plugin import.
- `plugins/missile-command/src/main.ts` — retired the absolute `pointermove`→`placeCursor` live-aim handler (and the `placeCursor` import); wired the reused `createPointerLock`, a canvas `click`→`request()` (hides the OS cursor only after the lock is actually held), and a `mousemove` handler that drives the pure `applyPointerMotion(cursor, movementX*TRACKBALL_SCALE, movementY*TRACKBALL_SCALE)` while `document.pointerLockElement === canvas`. onExit restores the OS cursor.
- `plugins/missile-command/tests/place-cursor.test.ts` — retired mc10-1's four superseded absolute-wiring source pins (documented supersession note); AC1 pure-`placeCursor`-function tests untouched. (See Design Deviations.)

**Tests:** missile-command 1425/1425 passing (GREEN). `npm run lint` (repo-wide tsc) GREEN.
- New: `tests/pointer-lock.test.ts` 16/16, `tests/helpers/boot-shell.ts` (mc's first boot harness). `purity.test.ts` PASSES — core untouched (shell-only story).

**AC status:**
- AC1 — createPointerLock reused (mc's own port); locked movementX/Y → applyPointerMotion → core moveCursor, scaled by TRACKBALL_SCALE; lock-exit resets input via the lock-state gate (immediate applier has no accumulator — deviation logged). ✅
- AC2 — absolute placeCursor is no longer the live-aim path (removed from main.ts); switch logged as an ADR-delta deviation referencing mc10-1's deferral — never a silent reversal. ✅
- AC3 — moveCursor unchanged, clamp + V-flip preserved (via the pure applier, covered by input.test.ts/cursor.test.ts); no clock/entropy in core; purity.test.ts green. ✅

**Live verification note:** headless browsers reject `requestPointerLock` outright (a fleet cp1-6/cp2-2/ml10-4 finding), so the actual pointer-lock capture is proven only by a HUMAN smoke test at `http://127.0.0.1:5270/missile-command/` (click to lock, move the trackball, Escape to exit). The unit tests cover the lock LOGIC; the boot harness proves the click→request seam is REACHED; the aim math is the already-tested pure applier.

**Branch:** feat/mc12-3-trackball-pointer-lock-aim-default (pushed)

**Handoff:** To review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (lint PASS, 1425/1425 green, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [DOC] finding) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 9 | reviewer-rule-checker | Yes | findings | 8 (34 rules, 61 instances) | confirmed 0 blocking, 3 noted LOW, 5 dismissed (fleet idiom) |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled)
**Total findings:** 0 confirmed blocking, 3 noted (LOW/informational), 5 dismissed with rationale

## Reviewer Assessment

**Verdict:** APPROVED

Shell-only story, cleanly executed. Preflight [PRE] green (lint + 1425/1425 tests, zero smells); security [SEC] clean (it independently verified the motion path is NaN/Infinity-safe via @shared/clamp.ts:20, and the requestPointerLock path is structurally non-throwing); rule-checker [RULE] ran 34 rules over 61 instances and surfaced no blocker. I hand-covered the six disabled specialists (edge, silent-failure, test, comment, type-design, simplifier) myself.

**Observations (plain-text tags):**
- [VERIFIED] createPointerLock is mc's OWN — shell/input.ts:82, imported via ./shell/input.js; grep finds zero cross-plugin import paths in mc. Complies with the CLAUDE.md per-plugin-ownership / no-cross-plugin-import rule.
- [VERIFIED] Core is UNTOUCHED — `git diff origin/develop...HEAD -- plugins/missile-command/src/core/**` is empty; purity.test.ts passes. AC3 satisfied; core/cursor.ts moveCursor/placeCursor unchanged.
- [VERIFIED] request() never rejects — shell/input.ts:94-103 try/catch routes BOTH a rejected thenable and a synchronous throw to onReject and resolves; main.ts:107 `void ...request().then()` has no floating rejection. Covered by pointer-lock.test.ts R4 suite. [SEC] concurs.
- [VERIFIED] Motion is bounded — event.movementX/Y * TRACKBALL_SCALE → applyPointerMotion → moveCursor → @shared/clamp (NaN/Infinity-safe), so no pathological delta escapes [HMIN,HMAX]×[VMIN,VMAX]. [SEC] confirmed clamp.ts:20.
- [RULE][SEC] Relative ESM `.js` extensions correct on all src imports (main.ts:15-21, input.ts) ; three EXTENSION-LESS test imports (pointer-lock.test.ts:53/114, boot-shell.ts:174) are the established centipede/millipede test idiom and tsc (npm run lint) resolves them green — DISMISSED as fleet-precedented, not a novel deviation.
- [RULE] boot-shell.ts:127 `as unknown as Record<...>` — DISMISSED: verbatim the centipede/millipede boot-shell globalThis-stub idiom, test-only.
- [RULE][TEST] pointer-lock.test.ts:286/291/296 bare-token regexes over whole main.ts (rules 15/25) — NOTED LOW: a token match, not a claim match; MITIGATED by the boot-harness behavioural test (a click must actually reach requestPointerLock, 0→1), which a token-only deletion could not survive. This TEA design (source pins + behavioural proof) is the correct fleet shape.
- [DOC] place-cursor.test.ts:1-9 header — NOTED LOW: mc10-1's historical docstring's "rewires main.ts" clause reads stale post-mc12-3; follows the repo's per-story historical-docstring convention and the same file carries a prominent AC2-superseded block. Non-blocking (recorded as a Delivery Finding).
- [RULE] pointer-lock.test.ts:278 stripComments untested — DISMISSED: inherited mc9-2 idiom, trivial regex.
- [MEDIUM→LOW, downgraded] main.ts:105-123 live aim is gated ENTIRELY on Pointer Lock; the mc10-1 absolute fallback is removed, so in any environment where Pointer Lock is denied/unsupported the crosshair cannot move. DOWNGRADED per AC2's explicit text: "kept only as an explicitly-noted unlocked fallback **if retained at all**" — the spec explicitly authorises no fallback — and the reuse targets centipede/millipede are pointer-lock-only too (verified: neither retains a non-lock aim path). Logged as the Dev ADR-delta deviation and accepted in the audit. Desktop-only repo rule makes Pointer Lock universally available in practice.

**Data flow traced:** canvas click → `pointerLock.request()` → `canvas.requestPointerLock()` (user gesture, valid) → lock acquired → locked `mousemove` → `event.movementX/Y * TRACKBALL_SCALE` → `applyPointerMotion` → core `moveCursor` (V-flip + clamp) → `game.cursor` → read by `stepGame`/`drawFrame`. Safe: every numeric enters a NaN/Infinity-safe clamp; the gate `document.pointerLockElement === canvas` means an unlocked stray move drives nothing.

**Pattern observed:** fleet-consistent pointer-lock trackball (centipede cp2-2 / millipede ml10-4 mirrored), plus mc's first behavioural boot harness (tests/helpers/boot-shell.ts) — a genuine improvement over source-scan-only wiring pins.

**Error handling:** requestPointerLock rejection (re-lock cooldown) and synchronous throw both swallowed to a console.warn diagnostic sink; lock exit (Escape/blur) restores the OS cursor via a single central pointerlockchange listener; no unhandled rejection, no listener duplication.

**Rule Compliance:** core/shell boundary — COMPLIANT (core untouched, purity green). No-cross-plugin-import — COMPLIANT. .js ESM extensions — COMPLIANT on all src imports (test-idiom exceptions dismissed, lint green). Meaningful assertions — COMPLIANT (rule-checker rule 34 found no vacuous assertion). Async/Promise (never-reject contract) — COMPLIANT and tested. No enums/JSX/config/secrets/eval/DOM sinks in the diff.

**Devil's Advocate:** Suppose a hostile or confused user. They double-click fast: the second requestPointerLock hits the browser re-lock cooldown and rejects — but request() swallows it to console.warn, so no crash and a later click re-locks; acceptable. They Escape mid-game: the lock drops, the crosshair freezes at its last position (mousemove gated off), the OS cursor returns — playable, they click to resume; not a defect. They run a browser/embedding where Pointer Lock is policy-denied: aim is dead — the one real degradation, but AC2 explicitly sanctioned dropping the fallback and the fleet does the same on a desktop-only cabinet, so it is an accepted tradeoff, not a bug. They flick the mouse violently under lock: movementX may be large, but ×0.35 then clamped keeps the crosshair inside the field — cannot escape or NaN (clamp is NaN/Infinity-safe). They never touch the mouse and only mash Z/X/C: fire works, aim doesn't move — but that was equally true under mc10-1 (aim was always mouse-driven), so no regression. A stressed event stream delivering `movementX: undefined`: real MouseEvents always carry a number, but even a synthetic undefined coerces to NaN → clamp floors to HMIN, a bounded glitch not a crash. The one thing I could not exercise here is the live lock capture itself — headless rejects requestPointerLock — so the click→request seam is proven reached by the boot harness and the capture logic by unit tests, with the actual lock left to the human smoke test the Dev noted. Nothing uncovered rises to Critical/High.

**Handoff:** To SM for finish-story.