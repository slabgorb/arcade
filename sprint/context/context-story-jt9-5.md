# Story jt9-5 Context: framesFor edge cases

**Story ID:** jt9-5  
**Epic:** jt9  
**Type:** bug  
**Points:** 2  
**Workflow:** tdd  

## Summary

Two unreachable but real edge cases in the audio manifest's frame window derivation need direct closure:
1. **Odd token count:** `framesInRow` silently drops a trailing sound code if the token count is odd
2. **Invention cue:** `framesFor` returns 0 for `kind: invention` cues, causing a misleading error message

Both defects are defended today only indirectly (through byte-exact ROM citation gates), but the defence mechanism differs from the failure point. This story closes both directly.

## Technical Analysis

### Defect 1: Odd Token Count in `framesInRow`

**Location:** `plugins/joust/src/shell/audio-manifest.ts` lines 525-534

**Current code:**
```typescript
function framesInRow(verbatim: string, skipPriority: boolean): number {
  const tokens = operandsOf(verbatim)
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
  const pairs = skipPriority ? tokens.slice(1) : tokens
  let frames = 0
  for (let i = 0; i + 1 < pairs.length; i += 2) frames += evaluateOperand(pairs[i + 1]!)
  return frames
}
```

**Problem:** The loop condition `i + 1 < pairs.length` means if `pairs.length` is odd, the last token is never processed. Example: pairs = [code1, dur1, code2, dur2, code3] (5 elements) → loop processes indices 0,2 only → code3 at index 4 is silently ignored.

**Consequence:** A cue's window ends up shorter than the full ROM table, with no error. The shipped ROM citations in `tests/audio-rom-citations.test.ts` and `tests/audio-transporter-split.test.ts` catch this indirectly by re-opening every row byte-exact, so a malformed row cannot match—but the defence is structural verification, not direct validation.

**Fix approach:** Throw on odd token count. The ROM's PRIORITY,SOUND,LENGTH format (with optional continuation on `+$80` codes) requires pairs; an odd count is malformed input.

### Defect 2: Invention Cue Gets Wrong Error Message

**Location:** `plugins/joust/src/shell/audio-manifest.ts` lines 566-571

**Current code:**
```typescript
export function framesFor(source: CueSource): number {
  if (source.kind !== 'rom') return 0
  let frames = framesInRow(source.source.verbatim, true)
  for (const row of source.continuation) frames += framesInRow(row.verbatim, false)
  return frames
}
```

**Problem:** The `invention` cue kind returns 0 frames. In `bake-samples.mjs` lines 334-337:
```javascript
const frames = frameDurations[name]
if (!(frames > 0)) {
  throw new Error(`no FRAME_DURATIONS entry for '${name}' — the ROM window sizes the file`)
}
```

An `invention` cue will have `frames = 0`, triggering the error message "no FRAME_DURATIONS entry"—but there IS an entry, it's just 0 because the cue has no ROM table behind it.

**Consequence:** A later story that adds an `invention` cue gets a misleading error message (claims the entry is missing, not that its window is zero). All 18 shipped cues are `kind: rom`, so neither path fires in production today.

**Fix approach:** Throw before the bake gets to it, with a message that distinguishes "invented sound" (has no ROM frame window) from "no duration recorded" (entry is missing). The fix prevents the misleading message and clarifies the design constraint: invented sounds need an explicit frame window, not one derived from ROM.

### The Loaded Chamber

**jt9-4's Reviewer added this warning (bake-samples.test.mjs lines 507-512):**

jt9-4 pinned the FRAME_DURATIONS check with an exact message assertion in `bake-samples.test.mjs`. One test, **"a window of ZERO frames is refused too, not silently baked as an empty file"** (lines 500-522), specifically injects a cue with 0 frames to test this gate. When jt9-5 fixes defect 2, this test will go RED—because the error message or the condition that triggers it will change. This is deliberate: it makes the fix arrive as a visible RED test rather than as prose.

**Test affected:** Lines 500-522 of `bake-samples.test.mjs`
- Assertion: `expect(err.message).toBe("no FRAME_DURATIONS entry for 'enemyThud' — the ROM window sizes the file")`
- Will RED when error message or firing condition changes

## Acceptance Criteria

**Derived from story description and loaded chamber:**

1. **AC-1 (Defect 1 — Odd token count):** A row with an odd number of tokens throws on entry to `framesInRow`, with a message that identifies which row and indicates the malformed operand count. The error is thrown before any frames are counted, preventing silent truncation.

2. **AC-2 (Defect 1 — Guard verification):** The two existing guards (`audio-rom-citations.test.ts` re-opening every defining row byte-exact, and `audio-transporter-split.test.ts` re-opening continuation rows) still pass. The defence mechanism doesn't change; we add a direct check alongside it.

3. **AC-3 (Defect 2 — Invention distinction):** An `invention` cue either:
   - (a) Throws in `framesFor` with a message that distinguishes "no ROM window to derive from" (for invention cues) from "FRAME_DURATIONS entry missing" (for ROM cues with no entry), OR
   - (b) Requires `invention` cues to carry an explicit frame window in `CueSource` (design change), in which case `framesFor` returns that window and the bake gate remains unchanged.

   **Note:** This story does NOT change the current shipped behaviour (all 18 cues are `kind: rom` today). The fix clarifies what SHOULD happen when a later story adds an invention cue.

4. **AC-4 (Loaded chamber test):** The test "a window of ZERO frames is refused too, not silently baked as an empty file" (bake-samples.test.mjs lines 500-522) will go RED on any change that affects the zero-frames path. The message assertion `toBe("no FRAME_DURATIONS entry for '${cue}' — the ROM window sizes the file")` must be re-worded together with any change to the error condition or message. The test must stay RED until the fix is complete AND the assertion is updated.

5. **AC-5 (Determinism):** All 18 shipped cues remain at their current FRAME_DURATIONS values. No change to any cue's window size or the frames baked for any shipped sound.

6. **AC-6 (Synthetic inputs to trigger unreachable paths):**
   - Defect 1 requires a synthetic row with an odd token count (injected via a test harness, since all shipped rows are well-formed)
   - Defect 2 requires a synthetic `invention` cue (injected via the bake's `opts` parameter added in jt9-4, since all shipped cues are `kind: rom`)
   - Both tests must state how the input is constructed, why it represents a real failure case, and that the defect would be reached on a real input if the guard didn't throw

## Implementation Strategy

### Phase 1: RED (Write failing tests)
- Test for odd token count: construct a verbatim row with odd operand count, pass to `framesInRow`, expect throw
- Test for invention cue: inject a synthetic `invention` cue via `opts.sounds`/`opts.frameDurations`, expect error message distinguishing it from missing entry
- Verify the loaded chamber test (zero-frames) goes RED when the message changes
- Do NOT change production code yet

### Phase 2: GREEN (Implement fixes)
- Add odd-count check to `framesInRow`: throw before accumulating if `pairs.length % 2 === 1`
- Fix the invention cue path in `framesFor` or `bake-samples.mjs`: throw with appropriate message
- Update the loaded chamber test message assertion to match the new error condition
- Verify all 18 shipped cues' frame windows remain unchanged

### Phase 3: REVIEW
- Mutation battery on the two new guards (odd-count throw, invention-cue throw)
- Verify both defence mechanisms (byte-exact ROM checks) still pass
- Confirm no shipped cue's behaviour changes
- Check the message for clarity and distinguish invention from missing-entry cases

## Risk & Mitigation

- **Risk:** Changing the FRAME_DURATIONS message may affect other tooling. **Mitigation:** Grep the repo for references to that message; jt9-4 already hardened all paths it reached.
- **Risk:** The odd-token case is unreachable in shipped code (all ROM rows are well-formed). **Mitigation:** Tests construct the malformed input directly; the defect is latent but real—a transcription error could introduce it.
- **Risk:** Invention cues don't exist yet (all 18 are `kind: rom`). **Mitigation:** The fix clarifies the design contract for when they do; the test uses the `opts` injection seam jt9-4 built.

## References

- Story jt9-4 session: `sprint/archive/jt9-4-session.md` (jt9-4's TEA built the `opts` injection seam)
- Loaded chamber detail: `plugins/joust/tools/sample-bake/bake-samples.test.mjs` lines 500-522
- Defence mechanisms: `tests/audio-rom-citations.test.ts`, `tests/audio-transporter-split.test.ts`
- bake-samples contract: `plugins/joust/tools/sample-bake/bake-samples.mjs` lines 330-342
