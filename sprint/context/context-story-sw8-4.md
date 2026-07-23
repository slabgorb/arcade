# Story sw8-4 Context (RE-SCOPED 2026-07-23)

## Title
Trench reads deep — port the ROM far-end terminus (TBSBF ∐ frame) drawn at the ROM-authentic $7000 draw clamp (BSVFAR/BSVBOT; keep TRENCH_FAR, do NOT raise it) so the channel reads as a deep receding tunnel with a vanishing end; verify side-gun/wall-panel legibility vs the longplay

## Why this was re-scoped (READ FIRST)

The original story ("extend the visible render window past the 28,672u cutoff") was **refuted by the code + primary source** during the RED-phase ruling. `TRENCH_FAR = 0x7000` (28,672u, `src/core/trench-channel.ts:72`) is **not a clamp bug — it is the cabinet's own draw-depth far cull**:

- Primary source `WSBASE.MAC` `BSVBOT`/`BSVFAR`: they track the real trench end (`BS.ELC`, flagged by `BS.EFL`); if it is within `$7000` they draw the far wall at the true end, otherwise they **clamp the far reference to `#7000`** (`CMPD #7000 / BHI / LDD #7000`). It is also the `WSLAZR CLBLZ` beam-reach clip.
- It is **cited in 3 audit pair files** (`docs/audit/findings/pair-{trench,surface,guns}.json`) and **already pinned** by `tests/core/swept-port-collision.test.ts:198` — `expect(TRENCH_FAR, 'the ROM number itself, not a tuned one').toBe(0x7000)`. Raising it diverges from the cabinet AND reddens citations.

**The real defect** (per epic sw8's "video-is-ground-truth" rule): the cabinet draws a **dedicated far-end terminus frame** — `TBSBF` ("FAR END LINE POINTS") — a closed cross-section across the far end at the `$7000` clamp depth. That frame is the trench's **vanishing terminus**: it makes `$7000` of depth *read* as a long tunnel with an end. Our `trenchChannel` builds rails + evenly-spaced ribs out to `-TRENCH_FAR` but draws **no far-end terminus** — so the corridor fades instead of terminating, and reads short. **We ported the far-end NUMBER and skipped the far-end MECHANISM.** This story ports the mechanism.

**Design source:** `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md` §4 sw8-4. **Cabinet reference:** `star-wars-longplay.mov`, wave-3 trench (~2:45–4:10). **ROM ground truth:** `WSBASE.MAC` `BSVBOT`/`BSVFAR`/`TBSBF`/`BS.EFL`/`BS.ELC` (use `~/Projects/star-wars-1983-source-text`).

The `TBSBF` table verbatim (WSBASE.MAC, `.RADIX 16`):
```
TBSBF:            ;FAR END LINE POINTS
  .WORD -400,0    ;TOP LEFT PANEL
  .WORD -400,-1000 ;FAR LEFT BOTTOM
  .WORD  400,-1000 ;FAR RIGHT BOTTOM
  .WORD  400,0    ;TOP OF RIGHT PANEL
```
i.e. down the left wall (top→bottom), across the floor, up the right wall — a ∐ in the trench's own ±$400 / $1000 frame, which we already carry as `TRENCH_HALF_W` (1024) and `TRENCH_WALL_H` (4096).

---

## Acceptance Criteria

### AC1 — Pin the far cull as ROM-authentic (regression guard)
`TRENCH_FAR` MUST stay `0x7000`. Add/keep a guard asserting `TRENCH_FAR === 0x7000` with the `CMPD #7000` / `BSVFAR` citation (one already exists at `swept-port-collision.test.ts:198` — reference it; do not duplicate needlessly). **Do NOT raise or scale the far cull.** `citations` stays green (`npm test -- citations`).

### AC2 — Port the far-end terminus frame (TBSBF)
Add a far-end cross-section frame to the trench render geometry (a `trenchFarEnd(scroll)` model, or an addition to `trenchChannel`, in `src/core/` — pure, deterministic, mirroring `trenchWallDetail`). It is the `TBSBF` ∐: at `x = ±TRENCH_HALF_W`, edges down the left wall (`y=TRENCH_WALL_H → 0`), across the floor (`-HALF_W → +HALF_W` at `y=0`), up the right wall (`y=0 → TRENCH_WALL_H`), seated at the far reference depth.
- **Seat depth:** the true trench end when it is within `TRENCH_FAR`, else `−TRENCH_FAR` (mirror `BSVFAR`'s `BS.ELC`-vs-`#7000` choice). If the current trench has no tracked "end," seating at `−TRENCH_FAR` is the faithful mid-run case; document if the end-approach case is deferred.
- **Test:** the terminus model exists with the ∐ vertex/edge pattern at the far depth; ±X symmetric; y spans floor→wall top on both sides; seated at `−TRENCH_FAR` (± the RIB_Z quantum) mid-run.

### AC3 — Trench reads deep (visual QA vs the longplay)
With the terminus in, the trench reads as a **deep receding tunnel with a visible far end**, matching the wave-3 trench in `star-wars-longplay.mov` (~2:45+). **Manual QA** (serve YOUR checkout on a spare port — port-ownership trap; screenshot mid-trench; compare side-by-side). Not a unit test.

### AC4 — Side-gun / wall-panel legibility
Verify the side guns (sw7-20) register on-screen and the wall panels read through the depth to the terminus. `PANEL_Z`/`PANEL_W`/`PANEL_H` (`trench-detail.ts`) are **PROVISIONAL — no ROM grid to pin them to**; tune density/scale **only if** the longplay shows them too sparse, and log it as a tuning deviation. **Do NOT invent a ROM number** — this is a judgment tune against the video, not a pinned test.

### AC5 — Render-layer only; sim + citations unchanged
The trench **simulation** (scroll speed, obstacle/tower/bunker collision, exhaust port, force-field) stays byte-identical. `src/core/` sim behaviour unchanged; only trench render geometry gains the terminus. `TRENCH_FAR` untouched. Full suite + `npm run build` green; no space/surface-phase regressions.

---

## Technical approach (rule → fix, per epic §3)
1. **Ruling done (RED phase):** `$7000` far cull is ROM-authentic (BSVBOT/BSVFAR `CMPD #7000`); the "reads short" defect is the **missing `TBSBF` terminus**, not the cull value. See the session's Delivery Findings.
2. **Fix:** port `TBSBF` as a far-end ∐ frame at the far-reference depth (AC2). Keep it a separate pure `src/core` model strokable by the shell's `drawWireframe`, like `trenchChannel`/`trenchWallDetail`.
3. **Verify:** watch build-beside-longplay (AC3); tune only the PROVISIONAL panel constants if legibility (AC4) demands.

### Prior-art anchors
- `TRENCH_FAR = 0x7000` provenance + double duty (draw cull AND `WSLAZR CLBLZ` beam reach): `trench-channel.ts:68-72`, `state.ts:655`, `sim.ts:1675`. Cited + pinned — untouchable.
- Trench geometry is already pure-core + unit-tested (`trench-channel.ts`, `trench-detail.ts`, `tests/core/trench-channel.test.ts`, `trench-detail.test.ts`). The terminus mirrors that pattern.
- "reads long via content streaming from beyond `$7000`" is ALREADY shipped (sw7-22/R6d): port/force-fields/obstacles stream in from beyond the window. This story adds the visible *terminus*, not more render distance.
- Core/shell boundary: the terminus is pure geometry in `core/`; the shell only strokes it. No `shell/`→`core/` import.

## Verification
1. Unit: AC1 guard + AC2 terminus geometry. `npm test`.
2. Build: `npm run build` clean.
3. Citations: `npm test -- citations` green (TRENCH_FAR untouched).
4. Visual QA (AC3/AC4): serve a spare port, screenshot the wave-3 trench mid-run, compare to `star-wars-longplay.mov`.

---
_Re-scoped by SM (Thrawn) 2026-07-23 after the RED-phase ruling refuted the original "extend the render window" premise. Original scope + the full ruling are in the session Delivery Findings._
