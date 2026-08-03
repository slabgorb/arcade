<gate name="typescript-review-checklist" model="haiku">

<purpose>
TypeScript-specific self-review checklist for dev agent before handoff.
Extends JavaScript checks with type system concerns. Catches patterns
that compile successfully but produce runtime errors or defeat type safety.
</purpose>

<pass>
Scan all files changed in this PR (`git diff --name-only develop...HEAD`)
that end in `.ts` or `.tsx`. For each file, check the following rules.

**1. Type safety escapes**
Search for patterns that defeat the type system:
- `as any` — must have a comment explaining why, and a TODO to remove
- `as unknown as T` — double-cast bypass, almost always wrong
- `@ts-ignore` without specific error code — use `@ts-expect-error` with code
- `@ts-expect-error` without the next line actually producing an error — dead suppression
- `!` (non-null assertion) on values that CAN be null at runtime
- Type predicates (`is` functions) without runtime validation inside

**2. Generic and interface pitfalls**
- `Record<string, any>` — use a proper interface or `Record<string, unknown>`
- `object` type — too broad, use specific interface
- `Function` type — use specific signature `(arg: T) => R`
- Missing `readonly` on array/object parameters that should not be mutated
- `Partial<T>` used where only specific fields are optional — loses required constraints
- `Omit<T, string>` — literal string removes nothing, use union type

**3. Enum anti-patterns**
- `const enum` in library code — breaks declaration emit, can't be used across packages
- Numeric enums without explicit values — fragile to reordering
- String enums where a union type suffices — enums have runtime cost
- Missing exhaustiveness check in switch/case on enum (no `default: assertNever(x)`)

**4. Null/undefined handling**
- Optional chaining `?.` followed by method call without null check on result
- `x ?? defaultValue` where x can be `0` or `""` (falsy but valid) — correct
- `x || defaultValue` where x can be `0` or `""` — BUG, use `??`
- Destructuring without defaults on optional fields: `const { name } = config`
  when `name` might be undefined
- `Map.get()` result used without undefined check

**5. Module and declaration issues**
- Re-exporting types without `export type` — ships runtime code for type-only exports
- `import type` for values that are used at runtime — compile error in isolatedModules
- Ambient declarations (`declare`) that shadow actual implementations
- `.js` extension missing in relative imports (required for ESM/Node16+ resolution)
- `/// <reference>` directives in source files — use proper imports

**6. React/JSX specific (for .tsx files)**
- `useEffect` with missing dependency array — runs on every render
- `useEffect` dependency on object/array literal — infinite re-render loop
- `useMemo`/`useCallback` with empty deps when closure captures changing values
- `key={index}` on lists where items can be reordered/inserted/deleted
- State updates on unmounted components — check if component is still mounted
- `dangerouslySetInnerHTML` with user input — XSS (CWE-79)
- Event handlers not using `useCallback` in performance-critical render paths

**7. Async/Promise patterns**
All JavaScript async checks (#2 from JS checklist) apply, plus:
- `Promise<void>` return type on functions that should return data
- Async functions that never throw returning `Promise<T>` instead of `T`
- `ReturnType<typeof asyncFn>` gives `Promise<T>`, not `T` — use `Awaited<>`
- `try/catch` in async that catches and re-throws without adding context

**8. Test quality**
All JavaScript test checks (#8 from JS checklist) apply, plus:
- `as any` in test assertions to make types match — fix the types instead
- Mock types not matching real implementation signatures
- `jest.mock()` / `vi.mock()` with incorrect generic parameters
- Integration tests that import from `dist/` instead of `src/`
- Missing `@types/*` for test dependencies

**9. Build and config concerns**
- `compilerOptions.strict` disabled or individual strict flags turned off
- `skipLibCheck: true` hiding real type errors in dependencies
- Source maps disabled in development (`sourceMap: false`)
- `outDir` and `rootDir` misconfigured causing flat output structure
- `paths` aliases without corresponding `moduleNameMapper` in test config

**10. Security: type-level input validation**
- User input typed as `string` instead of branded/validated type
- API response typed with `interface` but no runtime validation (Zod, io-ts, etc.)
- `JSON.parse()` typed with `as T` instead of runtime schema validation
- URL/path parameters cast to expected type without validation
- Template literal types that accept arbitrary string interpolation

**11. Error handling**
All JavaScript error checks (#10 from JS checklist) apply, plus:
- `catch (e: any)` — use `catch (e: unknown)` and narrow
- Error types without discriminant field — can't narrow in catch
- `Result<T, E>` patterns without exhaustive error handling
- Async error boundaries that swallow type information

**12. Performance and bundle concerns**
- Large imports from barrel files (`import { x } from '@pkg'`) — tree-shaking issues
- Dynamic `import()` without chunking strategy — unexpected bundle size
- `JSON.stringify()` on large objects in hot paths without caching
- Synchronous `fs` operations in server request handlers

**13. Fix-introduced regressions (meta-check)**
After applying fixes for review findings, re-scan the fix diff against
checks #1-#12 and #14-#24. Common patterns:
- Adding `as any` to silence a type error instead of fixing it
- Adding null checks but using `||` instead of `??`
- Adding runtime validation but not updating the type to match

**14. Derived EDGES computed inside one branch of a state machine**
A value defined as a TRANSITION (`was !== now`) — a loop start/stop, an
enter/exit hook, a "became dirty" flag, a diff emitted to a subscriber — must be
computed where EVERY path that can move it is visible, normally the single exit
of the step function. Computed inside one branch, it silently misses every
transition another branch causes, and the failure is a MISSING output, which no
snapshot or replay test can see.
- `if (was !== now)` / `prev !== next` inside a conditional branch, an early
  return, or one arm of a phase/mode switch
- A reset or teardown that happens on a DIFFERENT path from where the edge is
  taken (a pause exit, a teardown, an error branch, a phase change)
- One member of a family handled centrally and its siblings handled locally —
  the central one is usually the correct model, and the comment explaining why
  it is "special" is usually wrong
- Ask: which functions can change this value? If more than one, and the edge is
  not taken at their common exit, it leaks.
*Origin: cp5-1 I-H1 + I-M1 (creature loop `-stop` dropped at the death pause;
`bonus-life` emitted from one of two award paths)*

**15. Source-text assertions that match a TOKEN, not the CLAIM**
A test that greps a source file for a keyword passes on the keyword appearing in
a COMMENT, a string, or an unrelated identifier — so the guard it claims to
provide can be deleted while the test stays green.
- `expect(src).toMatch(/never/)` / `toContain('readonly')` / any bare-keyword
  regex over source text — anchor to the DECLARATION that does the work
  (`/EVENT_SOUND\s*:\s*Record<\s*Kind\s*,\s*Name\s*>/`), not to the word
- Assertions whose subject file is not the file where the mechanism lives —
  establish where the error actually fires by mutation before writing the anchor
- Universally-quantified loops (`for (…) { if (…) continue; expect(…) }`) whose
  `continue`s can skip every iteration — assert the collected count FIRST, and
  pick a counter that does not shrink under the very defect being guarded
- Bounds far looser than the measured value (`toBeLessThan(18)` where the real
  number is 0) — a leak of a small constant passes forever; pin the number
- **Every guard must be mutation-tested: delete the mechanism and require red.**
*Origin: cp5-1 I-H2 + I-M5 + I-M6 (`/never/` matched two comments in the file
under test; a two-`continue` loop could compare nothing; `< 18` where the true
value was 0)*

**16. Accessible names built by REPLACEMENT instead of composition**
`aria-label` and `aria-labelledby` OVERRIDE an element's content when the
accessible name is computed — they do not add to it. Naming a control with
`aria-label` therefore deletes its visible label from the name, and a
speech-input user who says what they can see ("click show demo") can no longer
operate it. That is WCAG 2.5.3 Label in Name, Level A, and it arrives most often
INSIDE an accessibility fix, which is why it needs its own check rather than a
line under #13.
- `setAttribute('aria-label', …)` or `aria-label=` on a control that already
  renders visible text — compose instead: append a `visually-hidden` span so the
  name CONTAINS the visible label
- A name-computation change that silently retires a sibling mechanism's job: if
  a label now settles the name, the `aria-hidden` that used to keep a glyph out
  of it is no longer doing that, and any comment saying it does is now false
- Reasoning about ONE assistive technology at a time. A fix verified against
  screen readers and never against speech input is the characteristic failure —
  ask which OTHER AT consumes the thing you just changed
- Assert the composed NAME, not the attribute that produces it. A test reading
  `getAttribute('aria-label')` passes for the exact spelling that breaks 2.5.3;
  a test asserting the computed name contains the visible label fails it.
- **Scope — do not flag these.** 2.5.3 governs user-interface COMPONENTS with a
  visible text label, so `aria-label` is correct and idiomatic on landmarks
  (`<nav aria-label="Games">`), and anywhere the element has no visible text to
  replace — including text that is entirely `aria-hidden` decoration, as in a
  wordmark split into per-letter hidden spans. There is no visible label to
  contain, so nothing can fail to contain it. The check is about controls whose
  visible label an `aria-label` would REPLACE.
*Origin: uf1-13 I-F1 (an `aria-label` added to name a SHOW DEMO button replaced
"SHOW DEMO" with "Show ALPHA demo" — a Level A regression shipped as an a11y fix,
with the story text itself prescribing the defect). Scope note added at uf1-13
round-2 review, which found the unqualified check condemning two correct usages
in the same repo.*

**17. Comments and docs that assert a MECHANISM nobody re-ran**
A comment naming a failure mode, an invariant, or what happens if you do X is a
claim about code. It goes stale silently — or ships false on day one, because it
was reasoned out rather than run. Unlike a wrong type, nothing fails; the cost is
paid later by whoever trusts it.
- Two claims added by the SAME diff that cannot both be true. A fix and the
  comment on the code it changed are the usual pair — read them together
- A stated failure mode the named instrument cannot observe (a status-code probe
  cited as evidence about a stale-but-serving build, which answers 200)
- Universal wording for a case-specific truth ("retirement goes through
  `next()`" where one route does not) — narrow it, or name the case
- Where the claim is cheap to run, RUN it and quote the output. Replacing a false
  claim with a second confident one repeats the defect being fixed.
*Origin: uf1-13 I-F4 + I-F5 + I-F2 (two comments eleven lines apart contradicted
each other; "retirement goes through next()" overreached; two of three worked
examples in a runbook named failures that cannot produce the symptom)*

**18. The defect is in the test apparatus, and it fails by PASSING**
#15 asks whether the guard is mutation-tested. This asks the question one level
down: whether the fixture and the helpers could distinguish a broken
implementation at all. When they cannot, every assertion is honest, the suite is
green, and it is measuring itself.
- **A fixture whose value IS the expectation.** `mount([ALPHA])` then
  `expect(name).toContain('ALPHA')` cannot tell `${game.title}` from a hardcoded
  `'ALPHA'` — the interpolation is invisible when the only value ever passed is
  the one asserted. Tell: the same literal appears in the fixture and the
  expectation. Fix: a second fixture with a different value, in the same case or
  a loop. Ask "what would the code have to get wrong for this to notice?"
- **A test helper that REIMPLEMENTS a platform algorithm is untested code**
  (accessible-name computation, URL resolution, CSS specificity, date maths). It
  gets the easy shape right and the nested one wrong, and it fails toward green.
  Mutation-test the helper itself, not just the code it inspects.
- **One concept, two helpers.** Same name and signature in sibling test files
  with different semantics is worse than duplication — the next reader picks the
  wrong one. Extract on the second consumer.
- Helpers shared across test files must not assume a runtime global: a suite can
  span environments (`@vitest-environment jsdom` in one file, `node` plus an
  imported `JSDOM` in another), and `instanceof Element` throws in the second
  while the ambient DOM *types* keep the type checker quiet. Key on data
  (`nodeType`), not on constructor identity.
*Origin: uf1-13 round-2 review I-F1 + I-F2 + I-F3 (a name guard that could not
fail for the defect it named, because the only game ever mounted was the one
asserted; a helper whose shallow aria-hidden walk called a broken implementation
healthy; and its same-named twin one file over)*

**19. The POPULATION is filtered by a neighbouring field, so the case under test
is excluded by construction**
#15 asks whether a loop's `continue`s could skip every iteration. This asks the
question one step earlier: whether the collection the loop walks was already
narrowed by a predicate on a DIFFERENT field from the one the body asserts on.
The floor passes, the loop runs, every assertion is honest — and the one entry
that mattered was never in the set.
- A helper NAMED for the population (`tableCues()`, `activeUsers()`) whose filter
  keys on field A while its call sites assert on field B. Filter on the field the
  body actually reads, in the body's own line of sight — or pass the whole set
  and skip explicitly, with the reason in the skip
- A sweep that enumerates one REGION of a structure (`Object.entries(fixture.cues)`)
  when sibling regions carry the same kind of data. Walk the structure, not the
  region you had in mind while writing it
- Data declared in NO type. A block absent from the interface is absent from every
  sweep that derives its fields from that interface, and the type checker cannot
  miss it because it was never asked
- The tell is that the population floor PASSES: the floor counts what the filter
  admitted, so it can never see what the filter excluded. Mutation-test the
  EXCLUDED case — mutate the entry you believe the sweep does not reach and
  require red. "N of N mutations caught" from a battery aimed at the fields you
  were thinking about is a statement about the battery's aim, not the coverage.
*Origin: cp6-1 I-H4 + I-M1 (the control-byte sweep ran over `tableCues()`, filtered
on `freqTable !== null`, so the single cue whose frequency the ROM COMPUTES carried
an uncited control byte nothing checked — `"0xA4"` → `"0xFF"` left 1075/1075 green;
and the `voiceArbitration` block, declared in no interface and walked by no sweep,
held six wrong citations and the ruling that shipped wrong)*

**20. A quantity measured from an artifact the SAME diff changes**
#17 asks whether a comment's mechanism was re-run. This asks it of numbers, and
adds the case #17 does not reach: a figure that was **true when it was typed and
false by the time the commit closed**, because the diff carrying it also moved
the thing it measures. Nothing goes stale later — it ships wrong, in the same
commit, next to a sentence saying it was measured.
- **A size, count or duration quoted next to code that edits its subject.** A
  bundle figure in a module that adds an import; "the fixture has N cues" in the
  commit that adds one; a test-count baseline in the commit that adds tests. Take
  the figure LAST, after the final edit, not while writing the paragraph
- **A "before" number taken by simulating the before-state** (stubbing the new
  import out of the post-change tree) instead of building the base commit. It
  answers a different question and looks identical
- **A number taken at a ref that later moved.** `git worktree add … <SHA>
  --detach` and `rev-parse` it; "at HEAD" in a permanent record is a claim about
  a moving ref, and a rebase falsifies it silently
- **A figure for an artifact built out of SHARED code** (a bundle assembled from
  `src/shared/`, a count over a common fixture). No story that touches your own
  module can keep it true — a sibling's commit falsifies it. Either pin it to a
  SHA or hedge it with `~`; "exact and current" is not available
- Name the command and the SHAs in the comment. "MEASURED, not waved at" tells the
  next reader not to check; a reproducible recipe invites them to
*Origin: cp6-3, three review rounds on one paragraph of bundle figures. Round 1:
five wrong, the before-size taken by stubbing the import out of the post-change
tree instead of building the base commit. Round 2: corrected, then falsified again
within hours by a rebase that pulled in jt9-6's 13-line edit to
`src/shared/audio.ts` — every digit moved (64.70 → 64.71 kB, joust 139.95 →
139.97) while centipede itself was untouched, which is where the shared-code
bullet above comes from. Two reviewer subagents proposed "tooling drift"; the
refutation was to revert ONLY the shared file in a worktree and rebuild, which
regenerated the original chunk HASH. Round 3 retired the exact figures for `~`
ones. NOTE, because this check's first draft got its own origin wrong: the "19 kB"
figure was never "true when typed" — commit `77ef628` grew the fixture to 23 291
bytes and wrote the "19 kB" wording in the SAME commit, so it described the parent
tree and was already false in the commit that shipped it*

**21. A DEGENERATE-but-not-nullish input reaching numeric or geometric code**
#4 covers `||` vs `??`. This is the case `??` does not reach: a value that is
PRESENT and unusable. `x ?? default` fires only on `null`/`undefined`, so `0`,
`-1`, `NaN` and `±Infinity` all pass straight through to arithmetic that silently
produces a wrong answer instead of an error.
- A measured quantity from the outside world (a viewport, a canvas size, a device
  ratio, a parsed number) defaulted with `??` and never range-checked. A
  zero-width element yields exactly `0`, which is not nullish
- Validate where the value ENTERS the module, not inside the math — one boundary
  guard covers every future reader; a guard inside one formula covers one
- **Then check for a SECOND reader that bypassed the boundary.** A sanitiser is
  only as good as its narrowest consumer, and a codebase that shadows the value
  onto a state object usually has one call site still reading the raw input.
  Grep the raw field name after adding the guard; the comment claiming "this one
  line reaches every exit path" is a claim, not a search
- The trigger to re-examine an existing unvalidated input is its BLAST RADIUS
  growing — a value that used to feed one display field now gating a behaviour
*Origin: sw8-27 F7 + round-2 Dev (`input.aspect ?? 1` let a zero-width canvas set
`aspect = 0`, collapsing a frustum's lateral bound so NOTHING was visible — and
once that gated the gun, the player's laser hit nothing for the whole frame; the
fix at the shadow site alone left a second call site building the aim ray from the
raw input, so the frame would have GATED on 1 and AIMED on 0)*

**22. A REJECT-style rewrite of an ACCEPT-style predicate inverts its NaN safety**
Every comparison against `NaN` is false. So `return d <= r ? hit : null` fails
CLOSED (no hit) and the "equivalent" `if (d > r) return null; … return hit` fails
OPEN (a hit) on exactly the same input. Refactors that invert a comparison to add
an early return change the degenerate-case answer while leaving every ordinary
case identical — which is why tests do not notice.
- Any `<=`/`<` acceptance rewritten as a `>`/`>=` rejection, or the reverse.
  Enumerate the non-finite inputs explicitly; "it can't be NaN here" is the claim
  to check, not the reason to skip
- A docstring invariant quantified over a TYPE rather than the reachable DOMAIN
  ("`dir[2] < 0` for every ray it can return") — find the input that refutes it
  before relying on it
- A fail-open masked by a discard in a DIFFERENT function (a `NaN < best`
  comparison upstream). That is a coincidence, not a guarantee: a single-element
  path, an early return or any rewrite of the caller removes it
- Have the function honour its own `| null` for every input rather than for the
  inputs its author had in mind
*Origin: sw8-27 F8 (a new `spaceSiteHit` rejected with `>` where the `beamHit` it
replaced accepted with `<=`, so a NaN offset cleared both the box and the octagon
and was reported as a hit — reachable because `aimDirection(Infinity, 0, 1)`
returns `[NaN, 0, -0]`, refuting the invariant the code rested on)*

**23. A recorded MUTANT that cannot be re-run, or whose red count is not blast radius**
#15 requires guards to be mutation-tested. This is about the RECORD of that test.
A battery table is written so the next reader re-runs the string instead of
reconstructing the intent, and it fails at that in three distinct ways.
- **Not re-runnable.** A published mutant that is a FRAGMENT plus prose about
  where it goes ("applied to `f`'s body") has more than one reading, and the
  readings differ. Publish a complete replacement UNIT — a whole body, a whole
  line — with nothing left to interpret
- **Silently drops a clause.** A replacement body that omits a check the original
  had (a range clamp, a bounds test) measures a different mutant from the one
  named, and its count is larger for a reason unrelated to the guard
- **The count includes apparatus.** A mutant that changes a file's LINE COUNT, or
  that changes the CONTENT of a line another file quotes verbatim, reddens
  citation/audit tests without touching behaviour. Keep mutants line-preserving,
  and separate behavioural red from apparatus red in the table
- **A survivor is a question about the MUTANT first.** Check operator precedence
  before concluding a guard is uncovered — `if (false && A || B)` collapses to
  `B` and leaves the guard live. Additive mutants of a subset test, and mutants
  redundant by construction, are equivalent and no test can catch them
*Origin: sw8-27 F4 + round-2 Dev (a published mutant reddened 7 tests in 5 files
against a recorded 1 because it dropped a `maxRange` clip and left a variable
undefined; folded to be line-preserving it reddens exactly 1. A later mutant
scored 0 and read as a coverage gap — it was `&&`/`||` precedence leaving half the
guard live)*

**24. A RETIREMENT applied where the AC named it, and nowhere else**
When a story replaces a shape, a threshold or a model, the code changes and the
statements ABOUT it change only where someone was pointed. Everything else keeps
describing the retired thing, in the same commit, and nothing fails.
- **Grep the OLD model's NUMBER, not its name.** The name is what got updated;
  the value is what got left behind (`500 u band` found seven survivors across
  four files in one command)
- **Look in FIXTURE GUARDS, not just prose.** A guard asserting a seat is outside
  the retired region is code, so no prose grep finds it — and check the DIRECTION
  of implication: if the retired region is strictly INSIDE the new one, "outside
  the old" does not imply "outside the new", and the test it protects can go
  vacuous
- **Sweep both citation spellings.** A `file.ts:N` regex does not see a bare `:N`
  that inherits its filename from a sentence above, and a mechanical re-anchor
  will skip it silently
- **A quoted span cited as ONE line when the quote covers several.** The tell is
  an inconsistency inside a parallel construction — one half of a list written as
  ranges and the other as single lines means only one half was checked
- Distinguish LIVE citations from HISTORICAL ones before any mechanical shift: a
  line number recording where something used to be must not be re-anchored
*Origin: sw8-27 F2/F6/F10 + round-2 Dev (a test titled "keeps the band at exactly
twice the kill radius" stayed green when the shipped band was halved, and the
constant it asserted was read by nothing in `src/`; seven prose survivors plus two
fixture guards still encoded the retired disc; a bare `(:1176-1177)` evaded the
sweep and was caught only by the guard ceiling sitting one over)*

If ALL checks pass across all changed `.ts`/`.tsx` files, return:

```yaml
GATE_RESULT:
  status: pass
  gate: typescript-review-checklist
  message: "TypeScript self-review checklist passed (24 checks)"
  checks:
    - name: type-safety-escapes
      status: pass
      detail: "No unwarranted as any, ts-ignore, or non-null assertions"
    - name: generic-interface
      status: pass
      detail: "Proper types used; no Record<string,any> or Function type"
    - name: enum-patterns
      status: pass
      detail: "Enums correctly valued and exhaustively matched"
    - name: null-undefined
      status: pass
      detail: "Nullish coalescing used correctly; optional fields handled"
    - name: module-declarations
      status: pass
      detail: "Type-only exports marked; .js extensions present"
    - name: react-jsx
      status: pass
      detail: "Hooks deps correct; no dangerouslySetInnerHTML with user input"
    - name: async-promises
      status: pass
      detail: "Async patterns correct; Awaited<> used where needed"
    - name: test-quality
      status: pass
      detail: "No as any in tests; mock types match implementations"
    - name: build-config
      status: pass
      detail: "Strict mode enabled; paths and maps consistent"
    - name: input-validation
      status: pass
      detail: "Runtime validation at API boundaries; no as T on JSON.parse"
    - name: error-handling
      status: pass
      detail: "catch(e: unknown) with narrowing; typed errors"
    - name: performance-bundle
      status: pass
      detail: "No barrel file over-imports; async fs in handlers"
    - name: fix-regressions
      status: pass
      detail: "Fix commits re-scanned against checks #1-#12, #14-#24"
```
</pass>

<fail>
List each violation with file, line, and the specific pattern matched:

```yaml
GATE_RESULT:
  status: fail
  gate: typescript-review-checklist
  message: "Found {N} TypeScript review issues"
  checks:
    - name: type-safety-escapes
      status: pass | fail
      detail: "{file}:{line}: as any / @ts-ignore / non-null assertion on nullable"
    - name: generic-interface
      status: pass | fail
      detail: "{file}:{line}: Record<string,any> / Function type / missing readonly"
    - name: enum-patterns
      status: pass | fail
      detail: "{file}:{line}: const enum in library / missing exhaustiveness check"
    - name: null-undefined
      status: pass | fail
      detail: "{file}:{line}: || instead of ?? on nullable / missing undefined check"
    - name: module-declarations
      status: pass | fail
      detail: "{file}:{line}: missing export type / .js extension / reference directive"
    - name: react-jsx
      status: pass | fail
      detail: "{file}:{line}: useEffect missing dep / key={index} / dangerouslySetInnerHTML"
    - name: async-promises
      status: pass | fail
      detail: "{file}:{line}: missing await / ReturnType without Awaited"
    - name: test-quality
      status: pass | fail
      detail: "{file}:{line}: as any in test / mock type mismatch"
    - name: build-config
      status: pass | fail
      detail: "{file}: strict disabled / paths without moduleNameMapper"
    - name: input-validation
      status: pass | fail
      detail: "{file}:{line}: as T on user input without runtime validation"
    - name: error-handling
      status: pass | fail
      detail: "{file}:{line}: catch(e: any) / unnarrowed unknown error"
    - name: performance-bundle
      status: pass | fail
      detail: "{file}:{line}: barrel import / sync fs in handler"
    - name: fix-regressions
      status: pass | fail
      detail: "{file}:{line}: fix introduces same class of bug (check #{N})"
  recovery:
    - "Remove as any; fix the underlying type error or use as unknown with narrowing"
    - "Replace Record<string,any> with typed interface; use specific function signatures"
    - "Add explicit values to numeric enums; add default: assertNever(x) to switches"
    - "Replace || with ?? for nullable values; add undefined checks after Map.get()"
    - "Add export type for type-only re-exports; add .js to relative imports"
    - "Fix useEffect deps; replace key={index} with stable IDs"
    - "Add await to async calls; use Awaited<ReturnType<typeof fn>>"
    - "Fix mock types to match implementation; remove as any from assertions"
    - "Enable strict mode; sync paths aliases with test moduleNameMapper"
    - "Add Zod/io-ts validation at API boundaries; validate JSON.parse results"
    - "Use catch(e: unknown) and narrow with instanceof/type guards"
    - "Import specific exports instead of barrel; use async fs in handlers"
    - "Re-scan fix diffs against checks #1-#12, #14-#24 before handoff"
```
</fail>

</gate>
