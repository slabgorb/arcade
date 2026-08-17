// plugins/defender/src/core/ufo.ts
//
// Story df4-4 (RED — Han Solo / TEA seeds this empty stub). The UFO / BAITER — the
// timeout pursuer — re-derived from DEFB6.SRC (UFOST :5, the UFOLP loop :26, the
// UFONV player-seek velocity :48, INIT SHOT TIMER :22, NAP 6 :46, DEC UFOCNT :81).
// GREEN (Yoda) replaces this stub with `createUfoBank(sched, deps): UfoBank` plus the
// UFO_SHOT_TIMER_INIT / UFO_NAP constants.
//
// The sanctioned brand-new-module RED seam (see core/mutants.ts / the df4-3 landers.ts
// precedent): exports nothing runnable, so loadUfo() throws a self-describing "not
// built yet"; type-checks as `{}` so `npm run lint` stays green.
export {}
