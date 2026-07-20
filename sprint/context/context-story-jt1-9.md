# Story jt1-9 Context

## Title
Citation checker hardening — external-claim shape enforcement + robustness holes from the jt1-2 review

## Metadata
- **Story ID:** jt1-9
- **Type:** chore
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** joust
- **Epic:** Joust — foundation slice (scaffold, citations, image transcription, arena, flight, render)

## Problem
Files the jt1-2 Reviewer's non-blocking checker findings as one bounded hardening pass (the checker itself shipped sound — all 131 primary claims independently re-verified byte-exact). 

**(1) THE PAIRED DESIGN HOLE:** externality is recognized by file extension alone, so renaming any claim's file to e.g. JOUSTRV4.cpp with a fabricated verbatim returns zero errors — the abuse the module header warns about, reached by filename instead of flag; and the 19 external .cpp claims carry prose markers in verbatim, a field whose contract is byte-exact quotation, where a plausible fake quote is undetectable. Reviewer's ruling (accepted by SM): do NOT rename the schema field (drags centipede along); instead ENFORCE THE MARKER SHAPE for external claims (all 19 already share a rigid self-describing form) or forbid verbatim on external claims outright — a shape rule cannot be forgotten the way a flag can, matching the extension-only ruling's spirit. Enforcement must also pin the external extension set (e.g. exactly .cpp) so a renamed .SRC claim cannot slip out of byte-verification. 

**(2) Robustness:** CLI prints 'all claims verified'/exit 0 on an EMPTY claims dir (should be a distinct loud state); wrong-case filenames pass on macOS (case-insensitive fs) but would fail CI/Linux; symlinked source files escape the containment check; a primitive (non-object) array element throws, contradicting the module's never-throw invariant; empty-string verbatim passes schema. 

**(3) Two radix tests (tests/audit/citations.test.ts:403,422)** assert JS language guarantees without calling the checker — rewrite them to drive the real implementation or delete them.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the intended behavior._

## Scope
- In scope: external-claim shape validation; robustness against empty/miscased/symlinked paths and malformed primitives; deprecation of decorative radix tests.
- Out of scope: schema migration (e.g., adding a `note` field); centipede alignment.

## Acceptance Criteria
- An external claim whose verbatim deviates from the enforced marker shape (or carries any quotation-like text, if the forbid-verbatim option is chosen) fails the checker; prove red once with a plausible fake quote.
- 'A claim renamed to a non-allowed extension (or a .SRC file miscased/symlinked/renamed .cpp) is caught: extension set pinned, case-sensitive filename comparison, symlink containment enforced.'
- Empty claims dir is a distinct non-success outcome; primitive array elements and empty-string verbatims are schema errors, not throws; the two no-op radix tests exercise the real checker or are removed.

## Supporting References
- **jt1-2 archived session** — sprint/archive/jt1-2-session.md
  - Reviewer's findings on checker abuse and robustness (lines ~68-70)
  - All 19 external .cpp claims currently carry prose markers in verbatim
  - SM ruling on extension enforcement vs. per-claim flag (line ~267)
  
- **Checker implementation** — joust/tools/audit/check-citations.mjs
  - Header prose on externality and the "never-throw" invariant (lines 34-46)
  - isExternalSource() function (lines 57-59) — currently extension-only, no marker validation
  - checkClaims() main validation loop (lines 136-190) — entry point for all hardening
  
- **Claims README** — joust/docs/rom-study/claims/README.md
  - Explains single-sided schema and the external .cpp citation model
  
- **Test file** — joust/tests/audit/citations.test.ts
  - Line 403 and 422: the two no-op radix tests that assert JS language guarantees without calling the real checker
  - Line 719-723: existing suite guard ensuring claims.length > 0

---
_Generated from sprint/epic-jt1.yaml for story jt1-9._
