# Story sw9-3 Context

## Title
Attract-mode parity pass — hold the rotating banner/instructions/scoring/hi-score
machine (sw7-10) beside the longplay attract loop and close ordering/timing/text gaps.

## Metadata
- **Story ID:** sw9-3 · **Points:** 2 · **Workflow:** tdd · **Repo:** star-wars
- **Epic:** sw9 — Cabinet front-of-house (attract, canopy frame, difficulty select)
- **Branch:** `feat/sw9-3-attract-parity` (off origin/develop 4be3388; tree already
  carries sw9-1's canopy frame + sw9-2's select screen)

## What this story is (scope discipline)
A **2-point parity pass**, NOT a rebuild. The attract rotation machine already exists
(sw7-10). This story holds it beside the real cabinet attract loop, closes the genuine
ordering/timing/text gaps worth closing at 2 points, and FILES the big-ticket
divergences as Delivery Findings for future stories.

---

## Ground truth — the ROM attract loop (1983 "Warp Speed" source)
Verified firsthand against `/Users/slabgorb/Projects/star-wars-1983-source-text`
(all `.RADIX 16` via WSCOMN.MAC:5 — bare operands HEX, trailing-dot literals DECIMAL).

**The idle sequence is the TPHASE table** (WSMAIN.MAC:307-341). The idle phases are
exactly four, in this order, then close back to the banner:

```
P. BNR,I   ;BANNER
P. INS,I   ;FLIGHT INSTRUCTIONS
P. SCR,I   ;SCORING PAGE
P. HIS,I   ;HI SCORE TABLE DISPLAY   → PHEHIS:923-927 sets PHASE=PH$BNR
```

Decisively, TPHASE places the gameplay phases (`SP1`/`SP2`/`GD`/`BS`/trench…) AFTER
`CN1 ;FIRST COIN` → `SG1`/`SG2 ;START GAME` → `BGN ;BEGIN ACT`. **The cabinet's attract
loop contains NO gameplay-demo / self-play phase** — all gameplay is coin-gated and
unreachable from the idle loop. (No `DEMO`/`SELF-PLAY` symbol exists anywhere in the
source; the only "attract" hits are the operator MUSIC-IN-ATTRACT option and STRTCK.)

### Per-page phase handlers (what each attract page draws)
- **PHEBNR** (WSMAIN.MAC:1260-1276): `VWSTAR` · `VWBNNR` (animated STAR WARS title) ·
  `VWSPMS` (intro crawl) · **`VWCOIN`** · **`VWMES`** · `SMVBNR` · `STRTCK`.
- **PHEINS** (:699-709): `VWMES` · **`VWCOIN`** · `VWPAGE` (the brief) · `VWSTAR` · `SMVINS`.
- **PHESCR** (:730-740): `VWMES` · **`VWCOIN`** · `VWPAGE` (the table) · `VWSTAR` · `SMVSCR`.
- **PHEHIS** (:898-925): `CPYRGHT` · `VWSTAR` · `VWMES` · **`VWCOIN`** · `VWHSCR`
  (RF2 "PRINCESS LEIA'S REBEL FORCE" board) · `VWMESS` · `SMVHIS`.

`VWCOIN` (WSMAIN.MAC:802-878) draws the persistent bottom line. With credit present
(the free-play / startable state — the only state our clone models), it draws
**`MS.STR` = "PULL TRIGGER TO START"** (WSMAIN.MAC:815; string TCMES.MAC:549). It is
called on **all four** attract phases — so the start invitation is shown on every
attract page, not only the banner.

### Dwell timings (already faithful)
BNR/INS/SCR hold `PH.TIM`/`BN.CNT` = `#0200` (512 game frames); HIS holds `#0100` (256)
— board dwells exactly HALF (WSMAIN.MAC:688-689/718-719/883-884; TCMES.MAC:440-444).

---

## Parity gap table — ROM vs ours

| # | Dimension | ROM ground truth | Our clone today | Verdict / Action |
|---|-----------|------------------|-----------------|------------------|
| 1 | **Ordering** | BNR→INS→SCR→HIS→BNR (TPHASE + transitions) | banner→instructions→scoring→hiscore→banner | ✅ MATCH — pinned `attract-rotation.test.ts`. No action. |
| 2 | **Timing** | 0x200/0x200/0x200/0x100 ticks | same `PAGE_TICKS` | ✅ MATCH — pinned `attract-dwell-magnitude.test.ts`. No action. |
| 3 | **INS text** | FLI header + 15 lines (TCMES:553-568) | verbatim | ✅ MATCH — pinned `render.attract-pages.test.ts`. No action. |
| 4 | **SCR text** | SCR header + 8 rows (TCMES:573-581) | verbatim | ✅ MATCH — pinned `render.attract-pages.test.ts`. No action. |
| 5 | **Crawl text** | 8 SPMESS lines (TCMES:625-632) | verbatim | ✅ MATCH — pinned `intro-crawl.test.ts`. No action. |
| 6 | **HIS board header** | RF2 "PRINCESS LEIA'S REBEL FORCE" (TCMES:605) | same | ✅ MATCH — pinned `render.rebel-force-board.test.ts`. No action. |
| 7 | **Start invitation persistence** | `MS.STR` "PULL TRIGGER TO START" via `VWCOIN` on **all 4** attract phases | drawn **only on banner** (`drawBannerPage` render.ts:1506) | ❌ **GAP — IN SCOPE.** RED (AC-1). Also requires re-seating the sw7-10 "F5" guard (see AC-2). |
| 8 | **Canopy frame on attract** | No attract gameplay demo → `PLAYER'S GUN SITE` drawn only during coin-gated gameplay | frame gated to `mode:'playing'`, absent on attract (sw9-1) | ✅ CORRECT — **KEEP** sw9-1 guards. See ruling below. |
| — | Score line on all attract pages | `VWMES` on all 4 phases | not shown on attract | Delivery Finding (clone resets score; board shows highs). Out of scope. |
| — | Copyright block on HIS | `CPYRGHT` "STAR WARS / © 1983 LUCASFILM… / ALL RIGHTS RESERVED / TRADEMARKS…" (TCMES:536-540) | none | Delivery Finding — **DELIBERATE DESCOPE** (do not reproduce a real Lucasfilm/Atari copyright claim in a fan clone). |
| — | Animated STAR WARS logo | `VWBNNR` zoom/brighten VJ-font title, vanishes at BN.CNT≥0xF8 | static "STAR WARS" text whole banner | Delivery Finding — render-fidelity animation, not ordering/timing/text. |
| — | Per-page starfield drift | 4 directions SMVBNR/INS/SCR/HIS (WSMAIN:2244-2269) | uniform drift | Delivery Finding — MOTION axis (sw7-10 F10 carry-forward). |
| — | Coin/credit status + STRTCK page-jump | `VWCOIN` full behavior; yoke jumps pages (WSMAIN:573-591) | none | Delivery Finding — no coin/operator model (sw7-10 already logged STRTCK). |

---

## The inherited canopy-frame ruling (routed here by sw9-1's Reviewer)

**RULING: the cockpit canopy frame does NOT draw during attract. Keep sw9-1's
absent-on-attract guards; do not flip them.**

Evidence: the cabinet's attract loop is the four idle info pages only. The TPHASE table
(WSMAIN.MAC:329-368) places every gameplay phase behind `CN1 ;FIRST COIN` →
`SG1`/`SG2 ;START GAME` → `BGN`; there is **no self-play/demo phase reachable from the
idle loop**, and no `DEMO`/`SELF-PLAY` symbol anywhere in the 1983 source. The
`PLAYER'S GUN SITE` picture set (WSVROM.MAC:1413-1885, sw9-1) is drawn only during those
coin-gated gameplay phases, so there is nothing for the frame to overlay on attract. The
"gameplay in the longplay" the design spec cites (§1, wave-4 combat) is a human PLAYING —
not the attract loop. sw9-1's `render.cockpit-frame.test.ts` AC-6 guards
("ABSENT on the attract screen") are therefore **correct and are kept unchanged**.

---

## Acceptance Criteria (defined by TEA in RED)

- **AC-1 (RED driver): the start invitation persists on every attract page.**
  `render()` draws "PULL TRIGGER TO START" (`MS.STR`, TCMES.MAC:549 — drawn by `VWCOIN`
  on all four attract phases) on the **banner AND instructions AND scoring AND hiscore**
  pages. Today it renders only on the banner → RED on the three non-banner pages.
  - Paired guard (GREEN, must hold after the fix): the banner-only marquee title
    "STAR WARS" (`VWBNNR`, our `drawBannerPage` render.ts:1503) must remain **banner-only**
    — it must NOT appear on the text/board pages. This forces the fix to add ONLY the
    persistent invitation (mirroring `VWCOIN`), not to render the whole banner everywhere.
  - Exact-text guard: the invitation is the ROM `MS.STR` string, not "PRESS START"
    (reinforces sw7-3 H-010 across all pages).

- **AC-2 (test re-seat, required by AC-1): fix the sw7-10 "F5" fallthrough guard's
  sentinel.** `render.attract-pages.test.ts:115-130` asserts "PULL TRIGGER TO START" is
  ABSENT on the non-banner pages, using it as a proxy for "the banner didn't silently
  fall through the `drawAttract` switch." That sentinel is wrong per parity (the ROM draws
  `MS.STR` on all four pages). Re-seat the guard to a genuinely banner-only sentinel —
  **"STAR WARS"** (the marquee title) — preserving F5's real intent (no page silently
  renders the banner) while removing the false coupling to the start invitation. Logged as
  a Design Deviation.

- **AC-3 (parity, already GREEN — no new test, cross-referenced):** ordering (gap #1),
  timing (#2), and all page text (#3–#6) already match the ROM and are pinned by the
  sw7-10 suites. This story does not re-pin them; it holds them beside the ROM and finds
  them faithful.

## Out of scope (filed as Delivery Findings, not scoped in)
Score-on-attract (`VWMES`), the copyright block (deliberate legal descope), the animated
STAR WARS logo, per-page starfield drift (sw7-10 F10), coin/credit status + STRTCK
page-jump. Each is either a different axis (motion/animation), needs a model the clone
lacks (coin/operator), or is a deliberate descope.

## Test files
- **new** `star-wars/tests/shell/render.attract-start-prompt.test.ts` — AC-1.
- **re-seated** `star-wars/tests/shell/render.attract-pages.test.ts` (F5 sentinel) — AC-2.

## Boundaries
Shell-only fix (the persistent invitation is a render concern, like `VWCOIN`). No
`src/core` change; the core/shell purity boundary and the sw9-1 canopy-frame guards hold.

---
_Authored by TEA (O'Brien) during the sw9-3 RED phase; the stub from `pf context create`
is superseded._
