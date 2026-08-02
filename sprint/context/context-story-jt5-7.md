# Story jt5-7 Context

## Title
Make the jt5 epic YAML truthful (epic opener, jt5-1, jt5-3) and fix joust's unguarded README counts

## Metadata
- **Story ID:** jt5-7
- **Type:** chore
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust audio — the sound subsystem joust shipped without

## Problem
Documentation debts recorded rather than fixed. (1) THE EPIC DESCRIPTION IS STALE and contradicts landed stories: sprint/epic-jt5.yaml still frames the @shared adoption question as an open ruling, quotes the REFUTED 'every other game consumes between four and nine subpaths' (measured 2026-07-31: battlezone 13, star-wars 11, tempest 10, asteroids 10, red-baron 8, centipede 5 — the range is 5-13), and says events are 'emitted as DATA on the step result' when stepGame returns a bare GameState and the stream is a field on it. It also lists the flap, the egg laid, the joust won and the wave clearing as moments 'the sim already produces' — the machine's 38-table sound set (:8051-8131) contains NO wave-clear, egg-laid or joust-won cue at all, so a future story reaching for those will find nothing to cite and should mark them inventions under jt5-1's AC5 escape hatch rather than hunt. (2) plugins/joust/README.md carries measured counts nothing guards — the suite size, the claim count (twice) and a six-number skipIf reconciliation block. They go stale on every story that adds a test file. Either derive them in a test or mark them indicative. ADDED 2026-08-01 BY jt5-3's REVIEWER AND SM (this story is the named owner for both): (3) jt5-3's OWN description in this epic YAML still carries the REFUTED extent 'JOUSTRV4.SRC:6207-6218' for GOFLAP. GOFLAP is :6212, FLAST2 is :6216, and the load-bearing three lines are :6216-6218; :6207 is GOTFIT JSR SRCADA, in the other loop's tail. A wrong extent is worse than a wrong fact because it MANUFACTURES corroboration — a reader who checks only the cited span sees a false claim confirmed. (4) The wording 'FLAPS2/FLIPS2, the labels BELOW each JSR VSND' is true of FLIPS2 and FALSE of FLAPS2, and it propagated: claim JT53-001 in plugins/joust/docs/rom-study/claims/audio.json, a comment at plugins/joust/src/core/flight.ts:438, and seven sites in plugins/joust/tests/audio-flap.test.ts. Fix all nine together or the next reader finds the corrected copy and the stale copies disagreeing.

ADDED 2026-08-01 BY jt5-2 (TEA's finding sweep; this story is the README-truthfulness owner): (5) THE README'S QUICK-START DEV-SERVER PARAGRAPH IS REFUTED BY mg1-2 — 'There is no way to open joust in a browser from this repo right now', the do-not-screenshot warning and the removed-port prose all describe the pre-cabinet SPA fallback, but `just serve` now serves the real plugin at /joust/ (pinned by tests/canonical-serve.test.mjs, which compares a game path against a nonsense control). Rewrite that paragraph against the current cabinet server. (6) 'The shipped game is unaffected and still live at joust.slabgorb.com' is an UNMEASURED liveness claim — CLAUDE.md's own rule is 'do not infer a live game from a live hostname; request it'. Hedge it or measure it. Note: jt5-2 flipped the audio paragraph off 'silent' but deliberately left every COUNT verbatim (its tests match around the numbers with wildcards), so the audio paragraph's 'eleven ROM-cited moments' is still among the counts this story owns.

SM MEASUREMENT 2026-08-02 (setup): every claim above was re-measured before RED. Four survived, one is MISATTRIBUTED, one is now RESOLVED. Treat the numbers below as measured, and the sentences above them as the claims they correct.

(1) IS MISATTRIBUTED, AND IT MISSES THE ONE THING THAT IS ACTUALLY STALE IN THE EPIC DESCRIPTION. All three phrases it quotes live at sprint/epic-jt5.yaml LINE 11 — jt5-1's STORY description — not at LINE 4, the epic description: 'between four and nine subpaths' (:11), 'emitted as DATA on the step result' (:11), and the 'sim already produces' cue list (:11). The epic description at :4 does NOT frame the @shared question as an open ruling; it already carries 'AMENDED 2026-07-31 AFTER THE MONOREPO MIGRATION ... The 2026-07-30 collapse ANSWERS that question by dissolving it'. What IS stale at :4 is the sentence this story never named — its OPENING claim, 'joust has no audio module at all: no src/shell/audio.ts, no core/events.ts event channel, no dispatch, and nothing under an arcade-assets joust prefix'. All three files exist today and jt5-2 uploaded the samples. Separately, jt5-1's description at :11 still asserts the dead 'the usual pin-and-bump ceremony applies'. SCOPE RULING: fix BOTH locations. The deliverable is a truthful epic-jt5.yaml and both live in that one file; fixing only what this story literally named would leave the epic's own first sentence false.

(2) CONFIRMED, and rotted further than recorded. Measured 2026-08-02: README.md:48 says '81 files / 1944 tests' against 96 test files today; 'checked 897 claim(s)' appears TWICE (:52 and :139) against the checker's actual output, 'checked 938 claim(s)'; and the six-number skipIf block (:86-99) has moved on both axes — literal 'skipIf(!vendoredAvailable)' occurrences 111 -> 143, comment-inclusive '.skipIf(' lines 109 -> 140 — so the stated '95 + 16 = 111' reconciliation no longer holds. RULING (user, 2026-08-02): SPLIT, do not treat the block as one thing. DERIVE the two mechanically-clean counts in plugins/joust/tests/audio-seam-scope.test.ts, which ALREADY reads the README (readmePath at :43, the flatten() un-wrapper at :45-49) and already guards refuted phrases (not.toMatch(/between four and nine subpaths/) at :176) — no new machinery is needed. Mark the six-number skipIf block INDICATIVE with a 'measured 2026-08-02' stamp instead of deriving it, because that block is SELF-REFERENTIAL: a test asserting how many times the literal occurs under tests/ is itself a file under tests/ carrying that literal, so writing the guard changes the number it guards. State that reason in the README where the next reader will meet it.

(3) CONFIRMED against the ROM. In reference/williams-source/joust/JOUSTRV4.SRC, :6207 is 'GOTFIT JSR SRCADA' — the wings-UP loop's tail, a different routine entirely. GOFLAP is :6212, FLAST2 is :6216, and the load-bearing cue is 'LDX PDECSN,U / LDX DSNWD,X / JSR VSND' at :6216-6218. The extent ':6207-6218' carried by jt5-3's description is refuted exactly as recorded.

(4) CONFIRMED — and the fix must state the MECHANISM, not merely drop one label. FLIPS2 (:6197) genuinely IS below the wing-up JSR VSND (:6184): GOFLIP plays the cue at :6182-6184 and then falls onward via 'BRA FLIPS2' (:6186). FLAPS2 (:6170) is ABOVE the wing-down JSR VSND (:6218) in file order, AND the cue path never reaches it in control flow either — after the cue, GOFLAP continues :6219, :6223 'TSTB', then 'BLE WINGDN' (:6176) or 'BRA WINGFK' (:6177). FLAPS2 is instead the FALL-THROUGH label the held path enters from FLAPLP's 'TSTB / BEQ GOFLIP' (:6168-6169), bypassing GOFLAP and its cue altogether. So the UNDERLYING claim — a held button never re-fires the cue — is TRUE of both loops; only the positional wording 'the labels BELOW each JSR VSND' is wrong, and for FLAPS2 it is wrong in BOTH senses. Nine sites confirmed: plugins/joust/docs/rom-study/claims/audio.json:130, plugins/joust/src/core/flight.ts:437, and seven in plugins/joust/tests/audio-flap.test.ts (:20, :40, :195, :200, :387, :483, :636).

(5) CONFIRMED live — plugins/joust/README.md:55-63 still carries the refuted paragraph verbatim, including the removed-port prose and the do-not-screenshot warning.

(6) RESOLVED BY MEASUREMENT rather than hedged. CLAUDE.md's rule is 'do not infer a live game from a live hostname; request it', so it was requested 2026-08-02 WITH the nonsense control that rule's own warning demands: https://joust.slabgorb.com/ returns 200 with '<title>Joust</title>' while https://joust.slabgorb.com/banana-control/ returns '<title>Not Found</title>'. The liveness claim is TRUE and may be written as MEASURED, with that date and the control named. A second measured fact belongs in the same rewrite: https://arcade.slabgorb.com/joust/ also serves '<title>Joust</title>' (its control returns 'Not Found'), so the single-origin path is live and is the canonical URL to cite alongside or instead of the per-game hostname.

RE-POINTED 1 -> 3 AND RE-WORKFLOWED trivial -> tdd AT SETUP (SM, 2026-08-02). The measurement grew the scope: two YAML descriptions, a README paragraph rewrite, a nine-site propagation fix and a NEW derived guard is not a one-point chore. TDD is the right shape because AC5's guard must be PROVEN to fail first — a derived count that never went red is indistinguishable from a hardcoded one — and because the nine-site fix has a partial-application failure mode this story's own text warns about ('fix all nine together or the next reader finds the corrected copy and the stale copies disagreeing'), which is a RED-phase assertion, not an implementation detail.

## Technical Approach

Six documentation debts, all re-measured by SM on 2026-08-02 before RED. Four
survived as filed, **one (debt 1) is misattributed**, and **one (debt 6) is
already resolved by measurement**. Read the story description's
`SM MEASUREMENT 2026-08-02` block before starting — it carries the corrected
line numbers, and the original (partly wrong) text is preserved above it
deliberately, so the two must not be confused.

**Debt 1 is the trap.** The story is titled for "the epic description", but all
three phrases it quotes live at `sprint/epic-jt5.yaml:11` — **jt5-1's story
description** — not at `:4`, the epic description. The epic description already
records the `@shared` ruling as settled ("the 2026-07-30 collapse ANSWERS that
question by dissolving it"). The epic's genuinely stale sentence is its
**opening** one, which the story never named. Fix both; the deliverable is a
truthful `epic-jt5.yaml`, and both locations are in that one file.

**The ROM is the authority for debts 3 and 4**, and it has been read
(`reference/williams-source/joust/JOUSTRV4.SRC`, CRLF — read with `awk`, not
`grep`, per the house gotcha):

| Line | Content | Bears on |
|------|---------|----------|
| `:6168-6169` | `TSTB` / `BEQ GOFLIP` — the held-path fork | debt 4 |
| `:6170` | `FLAPS2 CLRB` — the fall-through label | debt 4 |
| `:6176-6177` | `WINGDN` / `WINGFK` — where GOFLAP's cue path rejoins | debt 4 |
| `:6182-6186` | `GOFLIP` … `JSR VSND` (:6184) … `BRA FLIPS2` | debt 4 |
| `:6197` | `FLIPS2 LDB #$04` — genuinely below its cue | debt 4 |
| `:6207` | `GOTFIT JSR SRCADA` — **not** GOFLAP; the other loop's tail | debt 3 |
| `:6212` | `GOFLAP JSR ADDFLP` | debt 3 |
| `:6216-6218` | `FLAST2` / `LDX DSNWD,X` / `JSR VSND` — the load-bearing cue | debt 3 |

The asymmetry debt 4 names is real and now has a mechanism: FLIPS2 sits below
its cue because `GOFLIP` plays the cue and then branches *to* it; FLAPS2 sits
**above** its cue (`:6170` < `:6218`) and the cue path never reaches it at all
(after `JSR VSND` GOFLAP runs `:6219`, `TSTB :6223`, then `WINGDN`/`WINGFK`).
The underlying law — a held button never re-fires the cue — is **true of both
loops** and must survive the rewrite. Correct the wording, not the law.

**Debt 2 has a user ruling (2026-08-02): SPLIT.** Derive the two mechanically
clean counts; mark the six-number `skipIf` block indicative. The derivation has
same-file precedent and needs no new machinery —
`plugins/joust/tests/audio-seam-scope.test.ts` already reads the README
(`readmePath` :43, `flatten()` :45-49) and already guards refuted phrases
(`not.toMatch(/between four and nine subpaths/)` :176). Note `flatten()` exists
because README prose is blockquoted and line-wrapped: assert against the
flattened text or a wrap will make the guard vacuous.

Measured drift, 2026-08-02:

| README claim | Site | Measured today |
|---|---|---|
| `81 files / 1944 tests` | `:48` | **96** test files |
| `checked 897 claim(s)` | `:52` **and** `:139` | **938** |
| literal `skipIf(!vendoredAvailable)` = 111 | `:93-95` | **143** |
| `.skipIf(` lines = 109 | `:96-97` | **140** |

`95 + 16 = 111` therefore no longer reconciles. The block is **not** to be
derived: it is self-referential — a test counting that literal under `tests/`
is itself a file under `tests/` carrying it, so the guard would change the
number it guards. Say so in the README.

**Debt 6 needs no hedging — it was measured** (CLAUDE.md: "do not infer a live
game from a live hostname; request it"), with the nonsense control that rule's
own warning demands: `joust.slabgorb.com/` → `<title>Joust</title>` vs
`/banana-control/` → `<title>Not Found</title>`; `arcade.slabgorb.com/joust/`
behaves identically. Write it as a dated measurement naming the control.

## Scope

**In scope**
- `sprint/epic-jt5.yaml` — the **epic** description (`:4`) and **two story**
  descriptions, jt5-1 (`:11`) and jt5-3. Edit via `pf sprint story update`
  where possible; hand-editing sprint YAML is how conflict markers get in.
- `plugins/joust/README.md` — the counts, the dev-server paragraph (`:55-63`),
  the liveness sentence (`:63`), the `skipIf` block (`:86-99`).
- `plugins/joust/tests/audio-seam-scope.test.ts` — new derived-count guards.
- The nine FLAPS2/FLIPS2 sites: `docs/rom-study/claims/audio.json:130`,
  `src/core/flight.ts:437`, and `tests/audio-flap.test.ts` (`:20`, `:40`,
  `:195`, `:200`, `:387`, `:483`, `:636`).

**Out of scope**
- Any change to flap *behaviour*. This story corrects wording and citations
  only; the two-edge cue that jt5-3 shipped is correct and stays.
- Deriving the six-number `skipIf` block (ruled out above, with reason).
- The `eleven ROM-cited moments` phrase at `README.md:23` — the manifest grew
  past eleven (jt5-3 added four wing cues, jt5-4 two THUDs, jt5-6 split
  player-materialise). It is a **count**, so it falls to this story's AC5/AC6
  judgement: derive it if `SOUNDS`/`EVENT_KINDS` makes that clean, otherwise
  re-measure and mark indicative. Do not leave it reading `eleven`.

**Guard-quality note for TEA.** These are prose guards, and prose guards go
vacuous three ways: matching the file's own data rather than the sentence,
matching a *different* sentence, and line-wrapping. Assert by **resolution and
proximity**, and include **control mutants that must stay GREEN** — otherwise
an over-broad regex "passes" for the wrong reason. AC4's nine-site fix has a
partial-application failure mode the story itself names: a grep asserting zero
surviving FLAPS2-is-below claims is the honest guard, not nine spot checks.

## Acceptance Criteria
- The EPIC description (sprint/epic-jt5.yaml:4) no longer opens with 'joust has no audio module at all' — that sentence is rewritten against the landed subsystem: src/shell/audio.ts, src/core/events.ts and src/shell/audio-dispatch.ts all exist, and jt5-2 uploaded the samples. A test or grep proves the refuted sentence is gone, not merely softened.
- jt5-1's STORY description (sprint/epic-jt5.yaml:11) no longer carries the refuted 'between four and nine subpaths' (measured range is 5-13), the 'emitted as DATA on the step result' framing (stepGame returns a bare GameState; the stream is a field on it), or the dead 'pin-and-bump ceremony applies'. Its @shared ruling reads as SETTLED, consistent with the epic description's own 2026-07-31 amendment.
- jt5-3's STORY description cites the wing-down cue at JOUSTRV4.SRC:6216-6218 (GOFLAP :6212 -> FLAST2 :6216), never :6207-6218. The cited span is re-opened and shown to contain 'LDX PDECSN,U / LDX DSNWD,X / JSR VSND', so the citation corroborates the claim instead of manufacturing corroboration.
- All NINE FLAPS2/FLIPS2 sites are corrected in the same commit — claims/audio.json:130, src/core/flight.ts:437, and tests/audio-flap.test.ts (:20, :40, :195, :200, :387, :483, :636) — and the replacement states the MECHANISM: FLIPS2 (:6197) IS below the wing-up JSR VSND (:6184), FLAPS2 (:6170) is NOT below the wing-down JSR VSND (:6218) in either file order or control flow, being the fall-through the held path takes from FLAPLP's TSTB/BEQ GOFLIP (:6168-6169). The underlying law — holding never re-fires the cue — is preserved as TRUE of both loops. A grep proves zero surviving sites assert FLAPS2 sits below a JSR VSND.
- The README's suite size and claim count are DERIVED, not transcribed, in plugins/joust/tests/audio-seam-scope.test.ts (reusing its existing readme()/flatten() helpers at :43-49): the test-file count and the check-citations.mjs claim count are computed and matched against the README's prose. Both assertions are PROVEN to fail — editing either README number to a wrong value reddens the suite — so a derived count is distinguishable from a hardcoded one.
- The six-number skipIf reconciliation block (README.md:86-99) is re-measured to today's values and marked EXPLICITLY INDICATIVE with a 'measured 2026-08-02' stamp. It is deliberately NOT derived, and the reason is stated where the next reader meets it: the block is self-referential, so a test counting the literal under tests/ would itself be a file under tests/ carrying that literal and would change the number it guards.
- The README's dev-server paragraph (README.md:55-63) is rewritten against the cabinet server that mg1-2 landed: 'just serve' serves the real plugin at /joust/ on 127.0.0.1:5270, pinned by tests/canonical-serve.test.mjs, which compares a game path against a nonsense control. The 'no way to open joust in a browser', the do-not-screenshot warning and the removed-port (5279) prose are gone.
- The liveness sentence states a MEASUREMENT with its date and control, not an inference from a hostname: joust.slabgorb.com/ served '<title>Joust</title>' on 2026-08-02 while /banana-control/ served 'Not Found', and arcade.slabgorb.com/joust/ did the same. CLAUDE.md's rule ('do not infer a live game from a live hostname; request it') is satisfied on its face.

---
_Generated by `pf context create story jt5-7` from the sprint YAML._
