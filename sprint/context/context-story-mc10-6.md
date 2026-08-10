# Story mc10-6 Context

## Title
Harden the mc citations AC3 un-cited-literal gate: it currently checks only global value-membership across ALL claims, so an un-cited core literal passes whenever ANY unrelated claim shares its number (e.g. cursor.ts LOGICAL_WIDTH=0x100 passes only via the ICBM-speed-scale claim value 256). Require a symbol/line-anchored citation (claimCovers on the literal's own file:line), not bare value membership, in citations.test.ts

## Metadata
- **Story ID:** mc10-6
- **Type:** chore (test-hardening)
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** mc10 — Missile Command: authentic look & feel, round 2

## Problem (measured against the current tree, 2026-08-10 — the title IS the spec)

The AC3 core-literal guard in `plugins/missile-command/tests/citations.test.ts`
— section 4, *"src/core carries no un-cited numeric literal (AC3 guard)"*, the
`it.each(coreFiles)` block at **lines ~254–273** — computes:

```js
const claimedValues = new Set(loadClaims().map((c) => Number(c.value)).filter(Number.isFinite))
// …
expect(claimedValues.has(v), `core/${file}:${n} has un-cited game-constant literal ${v}…`).toBe(true)
```

`claimedValues` is a **global set of every claim's decoded value across ALL
claims**. The guard asserts only that the literal's number appears *somewhere*
in that set — it never checks that the claim carrying value `v` actually **cites
the literal's own `file:line`**. So an un-cited core literal passes whenever ANY
unrelated claim shares its number.

**Confirmed illustration:** `plugins/missile-command/src/core/cursor.ts:61` is
`export const LOGICAL_WIDTH = 0x100 // 256`. It survives the guard on global
value-membership of `256`, not on a claim anchored to `cursor.ts:61`.

**Current state: the suite is GREEN** —
`npx vitest run --project missile-command -t "un-cited numeric literal"` → 20 passed.
The hardening makes the guard STRICTER; the RED test should prove the current
gate is fooled by a cross-claim value collision, and GREEN re-anchors it.

## Technical Approach (hints — TEA/Dev refine)

The prescribed fix references an **already-existing** helper:
`claimCovers(claims, file, start, end)` in
`plugins/missile-command/tests/helpers/claims.ts`, already used in THIS test at
lines ~137/140 for W3COMN skeleton-constant coverage. Re-anchor the AC3
core-literal guard to require a symbol/line-anchored citation via `claimCovers`
on the literal's OWN `file:line`, not bare value membership.

- The `gameLiterals()` helper (lines ~244–252) strips `//` and `/* */` comments;
  the un-cited-literal gate is **line-based** (project memory: "mc citations
  scanner leaks JSDoc numbers" — JSDoc block numbers can leak, use `//`).
- Double-entry design: `citations.test.ts` (claim half) + `citations-source.test.ts`
  (byte-verifies the radix decode against vendored source). Claims live in
  `docs/rom-study/claims/*.json` with the mc-extended shape
  `{id, symbol, value, meaning, source:{file,line,verbatim}}`.
- `reference/source/` (vendored MC source) is gitignored and present ONLY in the
  a-1 checkout; section 3 is `describe.skipIf(!sourceAvailable)`, so that is fine.

## Scope
- **In scope:** re-anchor the AC3 core-literal guard's coverage check from bare
  global value-membership to a per-literal `file:line` citation via `claimCovers`.
- **Out of scope:** the mc2-6 dossier prose sweep (section 5), the byte-checker
  CLI, and unrelated changes. Do not change comment structure to satisfy the guard.

## Acceptance Criteria (SM-derived from the title — epic YAML `acceptance_criteria` is `null`; TEA to ratify/refine in RED)

- **AC1** — The AC3 core-literal guard checks each core numeric literal is covered
  by a symbol/line-anchored citation via `claimCovers` on the literal's own
  `file:line`, **not** bare global value-membership.
- **AC2** — A core literal that is un-cited (no claim anchored to its file:line)
  fails the guard with a clear error naming the file, line, and value — even when
  an unrelated claim shares that value. (The mutation proof: the `cursor.ts`
  `0x100`/256 collision must no longer pass by coincidence.)
- **AC3** — Every existing claim in `docs/rom-study/claims/*.json` and the real
  `src/core` literals remain valid under the stricter guard (or the story
  surfaces + resolves any literal the old gate was masking).
- **AC4** — Only the guard's coverage logic changes; comment structure is not
  edited to make literals pass.

---
_Enriched by SM (Baldur) from measured facts; supersedes the `pf context create`
stub. Mirrors `.session/mc10-6-session.md` Background + ACs._
