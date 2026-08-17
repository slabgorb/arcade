// plugins/defender/src/core/mutants.ts
//
// Story df4-4 (RED — Han Solo / TEA seeds this empty stub). The MUTANT (SCZ / SCHITZO)
// a lander becomes on reaching the top, re-derived from DEFB6.SRC (SCZS0 :592, the
// SCZ00 transform :828, the SCZ0 body :844, NAP 3 :901). GREEN (Yoda) replaces this
// stub with `createMutantBank(sched, deps): MutantBank` and the SCHIZO_NAP constant.
//
// This file is the sanctioned brand-new-module RED seam: it exports nothing runnable,
// so tests/helpers/df4-4-enemies-contract.ts's loadMutants() throws a self-describing
// "not built yet" and every RED assertion reads as an ABSENT FEATURE (the df4-3
// landers.ts precedent). It type-checks as `{}` today, so `npm run lint` stays green.
export {}
