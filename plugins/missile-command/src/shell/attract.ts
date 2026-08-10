// plugins/missile-command/src/shell/attract.ts
//
// Story mc6-5 — RED stub (Han Solo / TEA). The attract-presentation layer:
// scrolling attract messages, the "THE END" screen, and the reserved high-score
// display SLOT that story mc7-4 later fills with the ladder. This is the SHELL
// side (render/layout) — the pure state machine + 'attract' phase already exist
// (mc6-1/6-4). Nothing here touches the seeded default ladder values (mc7-1 owns
// core/highscore.ts DEFAULT_HIGH_SCORES); this story only renders the container.
//
// ─── WHY THIS IS AN EMPTY STUB ───────────────────────────────────────────────
// The RED tests (tests/mc6-5-attract-presentation.test.ts) reach these exports
// through a dynamic-import namespace cast so `tsc --noEmit` stays green while the
// symbols are still undefined — every assertion then fails as "not implemented"
// rather than as a compile error. Dev fills this in during GREEN and files the
// MC-ATTRACT-* claims in docs/rom-study/claims/attract.json.
//
// Intended surface (defined by the RED tests, ground truth REV-01):
//   • MSG_PRESS_START  = 'PRESS START'   EPRESS  W3DSUP.MAC:3328
//   • MSG_THE_END      = 'THE END'       ETHEEND W3DSUP.MAC:3338
//   • TITLE_LINE_1     = 'MISSILE'       EMISIL  W3DSUP.MAC:3384
//   • TITLE_LINE_2     = 'COMMAND'       ECOMAN  W3DSUP.MAC:3386
//   • MSG_HIGH_SCORES  = 'HIGH SCORES'   EHISCR  W3DSUP.MAC:3368
//   • ATTRACT_SCROLL_MESSAGES: readonly string[]  (includes MSG_PRESS_START)
//   • SCROLL_FRAMES_PER_STEP = 2   (REFRESH gate LDA FRAME/LSR/IFCC, W3MAIN.MAC:5313-5319)
//   • scrollStepsAt(frame): number          — pure, deterministic; steps every 2 frames
//   • highScoreSlot(width, height): { x, y, w, h, rows }  — rows === ladder depth (5)
//
// NOTE (Delivery Finding): the message STRINGS live in W3DSUP.MAC (English
// literals :3324-3390); W3MAIN.MAC:5277/5331 is only the display LOGIC
// (REFRESH/SCROLL). "THE END" is displayed in the game-over explosion
// (W3MAIN.MAC:4719, phase 'over').

export {}
