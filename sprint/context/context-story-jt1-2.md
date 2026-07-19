# Story jt1-2: Citation Checker + Claims JSON

## Summary

Port the centipede citation checker (story cp1-2) to joust. Convert all citations from the joust dossier files into machine-verifiable claims before any numeric story transcribes constants. This story is a **blocking gate** for jt1-3, jt1-4, and jt1-5 — the rb4/cp1 lesson: numeric stories landing before the gate re-bake their own misreadings and then confirm themselves.

## Acceptance Criteria (Verbatim from epic-jt1.yaml)

1. **Byte-for-byte verification:** `npm test -- citations` re-opens every claim byte-for-byte against the vendored tree; a deliberately drifted line number or altered verbatim fails the suite (prove red once).

2. **Complete coverage:** Every citation in brief.md, subsystems.md, and pictures.md exists as a claims/*.json entry; the 20-citation synthesis cross-sample is among them.

3. **Graceful degradation:** Checker runs schema-only without the vendored tree; CI (which lacks it) is green.

4. **Radix traps:** Radix traps are schema-encoded: a claim whose verbatim carries @ octal or !X operators round-trips exactly (no evaluation, no normalization).

## Configuration Donor: Centipede cp1-2

The centipede citation checker is the authoritative model. Port the following:

### Checker Files (tools/audit/)
- **centipede/tools/audit/check-citations.mjs** — the main checker script
  - Exports `checkClaims(claims, opts)` function
  - Resolves cited files root-first, then revision.v4/
  - Performs byte-verification when `vendoredRoot` is provided
  - Degrades gracefully (schema-only) when tree is absent
  - Handles radix preservation for @ octal and !X operators

- **centipede/tools/audit/check-citations.d.mts** — TypeScript type definitions for `Claim` schema

### Test File (tests/audit/)
- **centipede/tests/audit/citations.test.ts** — test suite that:
  - Loads the checker dynamically
  - Provides RED fixtures with hand-verified citations
  - Tests coverage of dossier citations
  - Validates schema enforcement
  - Skips byte verification when vendored tree is absent (CI green)

### Claims Schema
Single-sided claim per rom-source-study skill:
```json
{
  "id": "string (unique identifier)",
  "claim": "string (the assertion about the 1982 cabinet)",
  "source": {
    "file": "string (filename in vendored tree)",
    "line": "number (positive integer)",
    "verbatim": "string (exact line content, preserves radix)"
  },
  "corroboration": "optional (string or object with file/line/verbatim/note)"
}
```

## Joust Dossier Files to Convert

Convert citations from these files into `docs/rom-study/claims/*.json`:

1. **joust/docs/rom-study/brief.md** — High-level architecture and design overview
   - Contains citations to JOUSTRV4.SRC, JOUSTI.SRC, JOUST.DOC, williams.cpp
   - Includes timebase constant citations (8e6/(512*260) = 60.09615 Hz)
   - References the nap-unit frame model and scheduler

2. **joust/docs/rom-study/subsystems.md** — Deep subsystem breakdown
   - Flight/flap model citations (ADDFLP, PTIMUP, gravity, FLYX ladder)
   - Movement and input contract specifications
   - Platform and collision semantics
   - State machine and animation frame deltas

3. **joust/docs/rom-study/pictures.md** — Entity graphics and layout
   - Entity picture citations (JOUSTI.SRC, OSTRICH.SRC, BUZZARD.SRC, EGG.SRC, etc.)
   - Palette citations (COLOR1, HICOLR with BBGGGRRR nibble semantics)
   - RLE algorithm citations (COMCL5, NEWCL5/UNCOM from SYSTEM.SRC:927-1023)
   - Collision span table citations (COFF, sentinel semantics)
   - Contact sheet inventory (91 blocks: 14 ostrich, 14 stork, 14 buzzard, 13 riders, 6 egg, 6 troll hand, 4 flame, 3 poof, 6 pterodactyl, cliffs, transporter)

Note: glossary.md contains definitions, not citations to verify.

## Vendored Source Tree Location

**Root:** `arcade/reference/williams-source/joust/` (gitignored; pin 9bcfdb1)

Available files include:
- JOUSTRV4.SRC — primary game code (RV4 revision with pre-patch comments)
- JOUSTI.SRC — image/picture definitions
- SYSTEM.SRC — shared library (RLE algorithm, utilities)
- EQU.SRC — equate definitions
- JOUST.DOC — design documentation
- *.PIC — artist provenance records
- Specific entity sources: OSTRICH.SRC, BUZZARD.SRC, EGG.SRC, CLIFF.SRC, FLAME.SRC, etc.

Resolver strategy (per centipede):
1. Bare filename resolves root-first, then revision.v4/ subdirectory
2. Path-separator or absolute paths are tree-relative (exact paths)
3. Validation: resolved path must remain within vendoredRoot (no escape via `..`)

## MAME Citations (Schema-Only)

MAME driver files (`williams.cpp`, `williamssound.cpp`, `williams_v.cpp`, etc.) are referenced but not vendored in the arcade repo. These receive **schema-only claims** — the claim structure is validated, but no byte-verification is performed since the file location is `~/Projects/mame/...` (machine-local, outside the orchestrator). The corroboration field can document this:

```json
{
  "id": "mame-timebase-1556",
  "claim": "Video timebase: 8MHz / (512×260 clocks/frame) = 60.09615 Hz",
  "source": {
    "file": "williams.cpp",
    "line": 1556,
    "verbatim": "MAME driver reference (machine-local)"
  },
  "corroboration": {
    "note": "MAME ~/Projects/mame/src/mame/williams/williams.cpp — schema-only, not vendored"
  }
}
```

## Radix Discipline & Traps

Radix notation must round-trip exactly in the `verbatim` field, with NO evaluation or normalization:

- **@ octal literals:** e.g., `@400` (octal 400 = decimal 256) — must preserve `@` in verbatim
- **!X prefix operators:** e.g., `!377` (bitwise NOT 377) — must preserve `!X` in verbatim
- **$ hex:** e.g., `$8000` — must preserve `$` in verbatim
- **% binary:** e.g., `%1010` — must preserve `%` in verbatim
- **Bare decimal:** e.g., `512` — no prefix

Every transcribed constant in subsequent stories (jt1-3, jt1-4, jt1-5) must carry a radix-cited comment. Claims for these constants enforce the radix via test (AC-4).

## Dependencies & Blocking

This story **BLOCKS** the following numeric stories:

- **jt1-3** (Image transcription) — constant transcription requires verified claims
- **jt1-4** (Arena setup) — platform/landing/wrap constants need claims gate
- **jt1-5** (Flight & movement) — flap/gravity/FLYX ladder constants need claims gate

Do NOT merge jt1-3, jt1-4, or jt1-5 until jt1-2 is complete and approved. This enforces the **rb4/cp1 lesson:** numeric stories landing before the claims gate re-bake their own misreadings and then confirm themselves. The gate ensures every constant is cited BEFORE it is transcribed.

## Key References

- **Centipede Citation Checker (cp1-2):** `/Users/slabgorb/Projects/a-3/centipede/tools/audit/check-citations.mjs`
- **Centipede Test Suite:** `/Users/slabgorb/Projects/a-3/centipede/tests/audit/citations.test.ts`
- **Centipede Claims Directory:** `/Users/slabgorb/Projects/a-3/centipede/docs/rom-study/claims/`
- **Joust Vendored Source:** `/Users/slabgorb/Projects/a-3/reference/williams-source/joust/`
- **Joust Design Spec:** `joust/docs/superpowers/specs/2026-07-19-joust-clone-design.md`
