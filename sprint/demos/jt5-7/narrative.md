# jt5-7

## Problem

Problem: Make the jt5 epic YAML truthful (epic opener, jt5-1, jt5-3) and fix joust's unguarded README counts. Why it matters: a defect was impacting functionality.

## What Changed

We implemented: Make the jt5 epic YAML truthful (epic opener, jt5-1, jt5-3) and fix joust's unguarded README counts.
This delivers the following capabilities:
  - The EPIC description (sprint/epic-jt5.yaml:4) no longer opens with 'joust has no audio module at all' — that sentence is rewritten against the landed subsystem: src/shell/audio.ts, src/core/events.ts and src/shell/audio-dispatch.ts all exist, and jt5-2 uploaded the samples. A test or grep proves the refuted sentence is gone, not merely softened.
  - jt5-1's STORY description (sprint/epic-jt5.yaml:11) no longer carries the refuted 'between four and nine subpaths' (measured range is 5-13), the 'emitted as DATA on the step result' framing (stepGame returns a bare GameState; the stream is a field on it), or the dead 'pin-and-bump ceremony applies'. Its @shared ruling reads as SETTLED, consistent with the epic description's own 2026-07-31 amendment.
  - jt5-3's STORY description cites the wing-down cue at JOUSTRV4.SRC:6216-6218 (GOFLAP :6212 -> FLAST2 :6216), never :6207-6218. The cited span is re-opened and shown to contain 'LDX PDECSN,U / LDX DSNWD,X / JSR VSND', so the citation corroborates the claim instead of manufacturing corroboration.
  - All NINE FLAPS2/FLIPS2 sites are corrected in the same commit — claims/audio.json:130, src/core/flight.ts:437, and tests/audio-flap.test.ts (:20, :40, :195, :200, :387, :483, :636) — and the replacement states the MECHANISM: FLIPS2 (:6197) IS below the wing-up JSR VSND (:6184), FLAPS2 (:6170) is NOT below the wing-down JSR VSND (:6218) in either file order or control flow, being the fall-through the held path takes from FLAPLP's TSTB/BEQ GOFLIP (:6168-6169). The underlying law — holding never re-fires the cue — is preserved as TRUE of both loops. A grep proves zero surviving sites assert FLAPS2 sits below a JSR VSND.
  - The README's suite size and claim count are DERIVED, not transcribed, in plugins/joust/tests/audio-seam-scope.test.ts (reusing its existing readme()/flatten() helpers at :43-49): the test-file count and the check-citations.mjs claim count are computed and matched against the README's prose. Both assertions are PROVEN to fail — editing either README number to a wrong value reddens the suite — so a derived count is distinguishable from a hardcoded one.
  - The six-number skipIf reconciliation block (README.md:86-99) is re-measured to today's values and marked EXPLICITLY INDICATIVE with a 'measured 2026-08-02' stamp. It is deliberately NOT derived, and the reason is stated where the next reader meets it: the block is self-referential, so a test counting the literal under tests/ would itself be a file under tests/ carrying that literal and would change the number it guards.
  - The README's dev-server paragraph (README.md:55-63) is rewritten against the cabinet server that mg1-2 landed: 'just serve' serves the real plugin at /joust/ on 127.0.0.1:5270, pinned by tests/canonical-serve.test.mjs, which compares a game path against a nonsense control. The 'no way to open joust in a browser', the do-not-screenshot warning and the removed-port (5279) prose are gone.
  - The liveness sentence states a MEASUREMENT with its date and control, not an inference from a hostname: joust.slabgorb.com/ served '<title>Joust</title>' on 2026-08-02 while /banana-control/ served 'Not Found', and arcade.slabgorb.com/joust/ did the same. CLAUDE.md's rule ('do not infer a live game from a live hostname; request it') is satisfied on its face.

## Why This Approach

This approach addresses the root cause rather than symptoms.
