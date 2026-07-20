# Story jt1-11: Purity-scanner evasion tail

**Epic:** jt1 — Joust foundation slice

**Type:** chore

**Points:** 1 (p3)

**Workflow:** tdd

## Overview

The remaining evasion tail from the jt1-7 review, deliberately not smuggled into the 2pt story. The jt1-7 review found four major categories of evasions beyond the original five false negatives (accidental-evasion channels — SHELL case-insensitivity, bare Function() — were fixed pre-merge at jt1-7). These need deliberate circumvention or documented limits.

## Acceptance Criteria

### AC-1: Paren/NonNull/satisfies-wrapped banned expressions are caught

- Parenthesized alias (const M = (Math)) — must be caught
- NonNull assertion (Math!.random()) — must be caught
- Satisfies expression-wrapped identifier — must be caught
- Math['random']() is caught via the member table
- Each case proven red once before fix

### AC-2: The dataflow-shaped evasions and the shadowing strictness are documented as stated limits

- Spread/Object.assign/Reflect.get/reassignment-aliasing/class-extends documented as stated limits
- Not half-implemented, but honestly documented in the scanner header
- Shadowing false positive (local Math parameter with banned member is flagged) documented
- Scanner operates as intended; known limits are explicit

### AC-3: Scanner failure messages name file + line

- Failure messages carry file + line via node.getStart()
- Suite stays green
- All coverage tests pass

## Context from jt1-7 Review

**From the Reviewer Addendum (post-approval fold-back list):**

Before centipede and tempest port the scanner, close in roughly this order:

1. `i` flag on `SHELL_SPECIFIER` for case-insensitivity (one character, genuinely reachable on macOS) — **DONE at jt1-7**
2. `Function` into `BANNED_CALLS` (bare-call code-gen hole) — **DONE at jt1-7**
3. **Unwrap `Parenthesized`/`NonNull`/`satisfies` before the identifier checks** (closes the parenthesized alias and `Math!.random()`) — **jt1-11 AC-1**
4. **`ElementAccessExpression` with a string-literal argument → run it through `BANNED_MEMBERS`** (closes `Math['random']()` and the optional-chained form) — **jt1-11 AC-1**
5. Fix the anti-fallback test fixture (Reviewer's MEDIUM) — **DONE at jt1-7**
6. **Document the rest — spread/`Object.assign`/`Reflect`/binding-graph aliasing — as known limits** (dataflow analysis needed; half-implementation is worse than a documented boundary) — **jt1-11 AC-2**

**Reviewer's ruling on dataflow-shaped evasions:**

> They need dataflow analysis and half-implementing it is worse than an honest boundary.

Document them in the scanner header as stated limits, not as holes to fix.

**Deliberate evasion cases beyond the original five:**

The Reviewer found these require dataflow:
- `Math["random"]()` (computed member) — close via ElementAccessExpression + string-literal
- `const m = {...Math}; m.random()` (spread) — document as limit
- `Object.assign({}, Math).random()` — document as limit
- `Reflect.get(Math,'random')()` — document as limit

**Shadowing false positive:**

A local parameter named Math with a banned member IS flagged:
```typescript
function f(Math: {random(): number}) { return Math.random() }  // flagged
```

This is overly strict but has ~nil impact in core sim code. Document as a stated limitation.

**Fold-back guidance:**

centipede and tempest carry the same six holes from jt1-1 and will port the five ban tables + case table from jt1-7. They should port this tail once it lands in joust.

## Implementation Notes

**File to modify:** `joust/tests/helpers/purity-scanner.ts`

The scanner already uses the TypeScript compiler API (ts.createSourceFile) per the jt1-7 implementation. The five ban tables and case table are established:
- `BANNED_OBJECTS` (object identifier, e.g., Math, Date)
- `BANNED_MEMBERS` (object.member pairs)
- `BANNED_IDENTIFIERS` (bare identifiers, including type positions)
- `BANNED_CALLS` (function calls, including Function)
- `BANNED_CONSTRUCTORS` (new expressions)
- `ALIASING_TABLE` (aliasing patterns)

**Test files:** `joust/tests/purity-scanner.test.ts` and `joust/tests/purity.test.ts`

The test suite is established at 244/244 (post-jt1-7 fixes). Each AC-1 evasion should be added as a must-flip case (red then green), and the limits documented in the scanner header per AC-2.

## Constraints

- Session file EXACTLY `.session/jt1-11-session.md`
- Branch `chore/jt1-11-scanner-tail` in joust/ off develop
- No Jira integration (jira_key = jt1-11 is the story ID only)
- This tail lands BEFORE centipede/tempest fold-back copies the shape

## Related Stories

- **jt1-1:** Scaffold + purity guard (reproduced the original five false negatives)
- **jt1-7:** Purity-scanner hardening (tokenizer, fixed accidental channels, found deliberate evasions)
