# Context: mc8-1

**Story:** mc8-1  
**Epic:** mc8 (Missile Command — authentic audio)  
**Type:** Architecture Spike  
**Points:** 3  
**Priority:** p1  
**Workflow:** architecture

## Background

This is an architecture spike to decode the W3SOUN sound-command tables from the Missile Command ROM and decide between two driver paths: **runtime synthesis** (drive vendored pokey.js from lifted commands, no assets) or **baked assets** (synthesize sound to files, upload to R2, requires contract-5 live-verify follow-through).

### Quarry Location

The W3SOUN module is located at:
- **File:** `plugins/missile-command/reference/source/A35820.1C.bin`
- **Format:** ASCII assembler source (CRLF-lined, null-padded) despite the `.bin` extension
- **Read pattern:** `tr '\r' '\n' < file | grep -a`
- **Key markers:** `.TITLE W3SOUN-(WAS T2SOUN)`, `*POKEY SOUND SYSTEM CONTROL`, `AUDF1=4000`, `AUDCTL=4008`, `SOUNDN`, `STSOUND`

The provenance (`A35820.1C` = `W3SOUN`) is documented in `plugins/missile-command/docs/rom-study/brief.md` §O-1 (RESOLVED).

### Reuse Surface

The following existing building blocks are confirmed in-tree and must be cited as the intended reuse surface:
- `@shared/audio` — the audio system contract
- `@shared/synth` — synthesis primitives
- `plugins/star-wars/tools/pokey-bake/vendor/pokey.js` — the vendored POKEY emulator

### Reference Pattern

The `pokey-bake` pattern at `plugins/star-wars/tools/pokey-bake/` demonstrates the precedent for driving POKEY synthesis from lifted ROM tables.

## Acceptance Criteria

- A design doc is committed under `docs/superpowers/specs/` containing the W3SOUN sound-command table(s) transcribed with per-entry citations (FILE.MAC:LINE, radix noted) and the game-event -> sound mapping.
- The driver path is decided and justified (runtime-synth via pokey.js vs baked asset), including — if baked — the exact R2 bucket/key layout and the contract-5 live-verify + follow-up-story plan.
- The reuse surface is confirmed by reading it: `@shared/audio`, `@shared/synth`, and `plugins/star-wars/tools/pokey-bake/vendor/pokey.js` are cited as the intended building blocks; no src/ production code is changed in this story.

## Deliverable

**Output:** A committed design doc under `docs/superpowers/specs/` (filename to be decided during workflow)

**Contents:**
1. Extracted W3SOUN sound-command tables with per-entry citations (FILE.MAC:LINE, radix noted)
2. Game-event → sound mapping (launch, explosion, incoming ICBM, city/base destroyed, out-of-ammo klaxon, wave-bonus count-up, low-city warning)
3. Driver path decision and rationale
4. If baked asset path: R2 bucket/key layout and contract-5 live-verify + follow-up-story plan
5. Confirmation of reuse surface (citations to @shared/audio, @shared/synth, pokey-bake/vendor/pokey.js)

**No src/ production code changes in this story.**
