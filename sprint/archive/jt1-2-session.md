---
story_id: "jt1-2"
jira_key: "jt1-2"
epic: "jt1"
workflow: "tdd"
---
# Story jt1-2: Citation checker + claims JSON

## Story Details
- **ID:** jt1-2
- **Jira Key:** jt1-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T23:47:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T22:35:46Z | 2026-07-19T22:37:20Z | 1m 34s |
| red | 2026-07-19T22:37:20Z | 2026-07-19T22:47:19Z | 9m 59s |
| green | 2026-07-19T22:47:19Z | 2026-07-19T22:56:22Z | 9m 3s |
| review | 2026-07-19T22:56:22Z | 2026-07-19T23:18:12Z | 21m 50s |
| green | 2026-07-19T23:25:00Z | 2026-07-19T23:29:07Z | 4m 7s |
| review | 2026-07-19T23:29:07Z | 2026-07-19T23:47:35Z | 18m 28s |
| finish | 2026-07-19T23:47:35Z | - | - |

<!-- SM routing note: complete-phase auto-advanced review→finish despite the REJECTED
verdict (known forward-only behaviour; gate recovery_config said rework→green).
Phase set back to green by direct edit per the established recipe. -->

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking to a truthful AC-2 claim, non-blocking to RED): **AC-2 as written is not satisfiable by any automated sweep.** It says "Every citation in brief.md, subsystems.md, and pictures.md exists as a claims/*.json entry" — but only **114** of the dossier's citations are fully qualified (`FILE:LINE`). Another **128** are written as a bare `:N` that inherits its file from surrounding prose (e.g. ``(`PRAML`, `:175`)``). That inheritance is genuinely ambiguous, not merely unparsed: subsystems.md's header says bare lines mean `JOUSTRV4.SRC` "unless another file is named", yet `:175` sits inside both `RAMDEF.SRC` (430 lines) *and* `JOUSTRV4.SRC` (8139 lines), while `:5934` **cannot** be the nearest-named `SYSTEM.SRC` (1037 lines) and must be `JOUSTRV4.SRC`. So neither "nearest named file" nor "always JOUSTRV4.SRC" is correct. **More than half the dossier's citations are therefore outside the machine gate.** The suite covers the 114 qualified ones and pins the bare-`:N` count at ≤128 as a one-sided canary (shrinking is fine, growing fails). Affects `joust/docs/rom-study/{brief,subsystems,pictures}.md` — the durable fix is to qualify the bare citations, which is a docs story, not jt1-2. *SM should rule whether jt1-2 may close with AC-2 scoped to qualified citations.* *Found by TEA during test design.*
- **Improvement** (non-blocking): the story says MAME citations get "schema-only claims", but does not say how the checker RECOGNISES one. I pinned it to the **file extension** (`.cpp` ⇒ external, never resolved, never byte-opened) rather than an explicit per-claim flag, because a flag can be forgotten on a new claim and, worse, can be *added* to a `.SRC` claim to silence a real byte failure. Two tests defend the boundary in both directions. Affects `joust/tools/audit/check-citations.mjs` (Dev must not implement an opt-out flag instead). *Found by TEA during test design.*
- **Question** (non-blocking): centipede models MAME as optional `corroboration`; joust's dossier cites `williams*.cpp` as a *source* in its own right (raster geometry, shipped label sets). The suite supports **both** shapes — external `source` claims and `corroboration` — so Dev has latitude, but the two repos will diverge in how the same secondary reference is encoded. Affects a future shared-checker extraction (jt1-2 vs cp1-2 have now forked twice: flat tree, external sources). Not worth unifying on a 3pt story; worth knowing before a third repo copies either one. *Found by TEA during test design.*
- **Improvement** (non-blocking): the checker's CLI failure path was untestable as specified — with the claims directory hard-coded, no test can drive a broken claims set through the real executable without editing committed data. I added a `JOUST_CLAIMS_DIR` override to the contract so "prints one error per bad claim, exits non-zero" is executed rather than asserted about. Affects `joust/tools/audit/check-citations.mjs` (Dev must honour the env var) and, by analogy, `centipede/tools/audit/check-citations.mjs`, whose CLI has the same untestable shape. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): **`verbatim` is a misnomer for external `.cpp` claims, and nothing can currently detect that.** The MAME williams driver is not on this machine at all (no clone under `reference/`, none in the joust tree), so the 19 external claims cannot carry a real quotation. I filled their `verbatim` with a self-describing marker naming the driver file and line and stating it is schema-only and never byte-opened — honest, but it is *prose*, not a quote, sitting in a field whose whole contract is "byte-exact quotation". Nothing prevents a future author from putting a *plausible-looking fake quote* there instead, and no test could tell the difference. Affects `joust/docs/rom-study/claims/*.json` and the shared checker design. The durable fix is a distinct field (e.g. `note`) for external citations, or a rule that an external source carries no `verbatim` at all — worth deciding before a third repo copies this shape (see TEA's related divergence Question). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the 150 claims were produced by a **throwaway generator** (dossier → citation extraction → read the vendored line → emit JSON), deliberately not committed: it is unrequested, untested code, and the claims are the deliverable. But jt1-8 must qualify 128 bare `:N` citations and will face the same conversion, and a later dossier edit will need a re-run. Affects jt1-8 — it should decide whether to commit a maintained extractor (with its own tests) rather than re-improvise one. Method recorded in the Dev Assessment below so it is reproducible either way. *Found by Dev during implementation.*
- **Question** (non-blocking): the dossier's citation count depends on how you count. TEA's figure of **114** counts distinct raw citation strings; the sweep expands comma lists and ranges into **156** citation parts, which collapse to **150** distinct `FILE:LINE` anchors (six parts share a start line with another part). All three numbers describe the same coverage — 150 claims close the sweep completely — but a reader comparing "114" in the ACs against "150 claims" in the repo will think something drifted. Affects `sprint/` epic text and the jt1-8 story description (worth stating which count is meant). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the mismatch error now prints each side **twice** — raw and JSON-escaped. TEA's test requires the raw actual line (so the error can be grepped against the source), but on tab-separated Motorola columns a whitespace-only drift (the WS-4 collapsed-run case) renders as two visually identical lines. Printing both forms is the only way the error is actionable in both situations. Affects `centipede/tools/audit/check-citations.mjs`, which prints only the escaped form and so fails the grep-against-source use. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (**blocking**): **the mechanically-derived `claim` text is wrong for a measurable subset of claims, and three claims are anchored to lines that provably cannot support their assertion.** The contract (`check-citations.d.mts`) defines `claim` as "the human-readable assertion this citation supports"; the checker cannot detect a violation because `verbatim` still matches. All three verified by opening the vendored source directly:

  | Claim | Cited line (real content) | Why it cannot support the assertion |
  |---|---|---|
  | **PIC-051/052/053** | `JOUSTI.SRC:2054/2083/2114` — all three are **byte-identical**: `PLY?R\tFDB\t$0707!XDMAFIX` | The claim asserts "PLY1R ≈ all nibble 5, PLY2R ≈ nibble 7, PLY3R ≈ nibble 4". `$0707` is the 7×7 **size header**, identical for every rider — it carries **no colour information at all**. The nibble evidence is on the *following* lines (2055 `$00,$55,$50…`, 2084 `$00,$77,$70…`, 2115 `$00,$44,$40…`), never cited. Three claims cite one indistinguishable line to distinguish three different things. |
  | **BRF-007** | `TB12REV3.SRC:394` — `FCB $00,$10,$91,$02  09/10/82 NEW REV. TO HANDEL`, sitting inside the `DEFHSR`/`DEFGOD` default-high-score table | The claim asserts it corroborates "T12REV3's ROMTAB (`FCB $60,$85` / `FCB $D0,$3D`)". The real ROMTAB is in **`T12REV3.SRC`** (no `B`) at **:421** (`FCB $60,$85  6000`) and **:428** (`FCB $D0,$3D  D000`) — verified. One-letter file mixup: `TB12` (utility block) vs `T12` (diagnostics ROM). |
  | **SUB-043** | `ATT.SRC:49` — `ORG $D000  in high memory due to screen access` | The claim asserts "workspace **$BC00**". `$BC00` occurs exactly **once** in ATT.SRC, at **:19** (`ORG $BC00  in scratch memory`) — verified by grep. The cited line states a different address than the claim it supports. |

  Two independent methods agree this is systemic, not three unlucky rows. My own truncation analysis found **30/150 claims carry truncated text ('…')** and **13 of those cite a line not referenced anywhere in the retained text**; the specialist's stratified 80-claim sample (53% coverage) graded **61 SUPPORTED / 14 WEAK / 5 WRONG**, extrapolating to ~10 wrong and ~26 weak dossier-wide. Confirmed truncation casualties beyond the three above: **BRF-011/012/013** retain the text "game modules pull the ***short*** twins" while citing `INCLUDE RAMDEF.SRC` — the **long** twin, i.e. the retained text is contradicted by its own cited line; **PIC-036/040/041** cite correct on-topic lines whose justifying clause was truncated away; **PIC-057…063** (the whole Playfield-layout table) kept only the heading and the Cite column, dropping the Object/X,Y/Size payload, so they assert nothing checkable. Affects `joust/docs/rom-study/claims/*.json`. **This is the artifact jt1-3/4/5 are gated on, and jt1-3 (rider frames + palette nibbles) is the very next consumer of the rider-colour claims that are mis-anchored.** *Found by Reviewer during code review, corroborated by reviewer-rule-checker; every WRONG verified first-hand against the vendored source.*
- **Gap** (non-blocking): **the AC-2 sweep does not fully close, and its blind spot is silent.** TEA's extractor regex (`citations.test.ts:588`) is ``/`([\w./]+\.(?:SRC|DOC|PIC|FRM|cpp)):([\d,\-]+)`/g`` — the linespec charset `[\d,\-]+` must be followed immediately by a backtick, so any other linespec syntax fails to match **at all** and is silently dropped rather than counted. Three real backticked citations are invisible to the sweep: `` `JOUSTRV4.SRC:2407+` `` and `` `TB12REV3.SRC:1160+` `` (open-ended `N+` form) and `` `JOUSTI.SRC:54/55` `` (slash pair). Verified none has a claim except `JOUSTI.SRC:54`, which is covered incidentally. Unlike the ruled bare-`:N` gap — which TEA made **visible** with a one-sided canary — this class is undetectable: the sweep reports full closure over citations it never enumerated, and a future dossier edit introducing another linespec form would shrink the gate silently. The durable fix is a **negative canary**: count citation-shaped strings the extractor failed to parse and assert zero. Affects `joust/tests/audit/citations.test.ts` and jt1-8 (which will widen the sweep and would otherwise inherit the blind spot). *Found by Reviewer during code review.*
- **Gap** (non-blocking): **externality-by-extension can be turned against the byte gate — the exact abuse the SM ruling was written to prevent, reached by filename instead of by flag.** `isExternalSource` (`check-citations.mjs:43-45`) tests the extension alone, and an external claim is never resolved or byte-opened. So renaming a claim's `file` to `JOUSTRV4.cpp` or `SYSTEM.SRC.cpp` with a wholly fabricated `verbatim` returns zero errors. The module header (`:22-26`) warns that a flag "can be ADDED to a .SRC claim to silence a real byte failure" — a rename achieves precisely that. Cheap fix that preserves the no-flag ruling: require external claims to match a known MAME path prefix (e.g. `src/mame/`) rather than a bare extension. Affects `joust/tools/audit/check-citations.mjs`. *Found by reviewer-edge-hunter.*
- **Gap** (non-blocking): **the CLI reports success while gating nothing.** With `JOUST_CLAIMS_DIR` pointing at an empty directory, a nonexistent path, or a directory whose only file contains `[]`, the checker prints `checked 0 claim(s) / all claims verified` and **exits 0** — verified first-hand. The suite is protected (`citations.test.ts:719-723` asserts `loadClaims().length > 0`), so live exposure is low, but the binary itself has no floor and a path typo or a future directory move would pass CI silently. Same anti-vacuity family this repo already guards elsewhere. Affects `joust/tools/audit/check-citations.mjs:210`. *Found by Reviewer during code review, corroborated by reviewer-edge-hunter.*
- **Improvement** (non-blocking): further checker robustness gaps found by reviewer-edge-hunter, none live against the current committed tree: a wrong-**case** `file` (`ramdef.src`) resolves and passes on macOS's case-insensitive filesystem and would fail on a case-sensitive CI runner; a **symlink** planted inside the tree escapes the purely-lexical containment check (`:98-105`) because `readFileSync` follows it; a **primitive** element in a claims array throws `TypeError` at `:166` (`'corroboration' in (c ?? {})`), contradicting the module's own "every problem is REPORTED, never thrown" invariant at `:112`; an **empty-string** `verbatim` passes schema (`isCitation` checks `file.length > 0` but not `verbatim.length`); malformed JSON crashes with a parser stack trace naming the checker rather than the offending claims file. Also `citations.test.ts:422` ('keeps octal leading zeros distinct') and `:403` (JSON round-trip) never call the checker — they assert JS language guarantees, so a checker that normalised leading zeros would not be caught. Affects `joust/tools/audit/check-citations.mjs` and the suite. *Found by reviewer-edge-hunter and reviewer-test-analyzer.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Claim TEXT is mechanically derived from the dossier, not hand-authored per claim.** The contract calls `claim` "the human-readable assertion this citation supports". With 150 citations, hand-writing 150 assertions would have meant *paraphrasing* the dossier 150 times — and a paraphrase can drift from what the dossier actually says, which is the exact class of error this gate exists to prevent. Instead each claim carries the dossier's own **sentence (or table cell)** containing the citation, prefixed by its section heading. Verified by spot-check that the sentence genuinely describes the cited line. Consequence a reviewer should know: where one dossier sentence is supported by several source lines, several claims share the same text and differ only in their citation (largest cluster: 5). That is correct — one assertion, five supporting lines — but it looks like duplication at a glance.
- **No generator committed** (see the matching finding). The claims are data; the generator was a one-shot. Method is recorded below so the conversion is reproducible without it.
- **Honored TEA's contract exactly on the two boundaries the SM ruled on**: externality is extension-only (no opt-out flag), and `JOUST_CLAIMS_DIR` is implemented as contract rather than convenience. Neither was weakened.

### TEA (test design)
- **Claims JSON is NOT authored in RED — Dev converts the dossier (the routing note left this to my call):** claims are DATA, the checker is CODE, which is the cp1-2 ruling and the tempest precedent it came from. Two concrete reasons beyond precedent: (1) if TEA authored the claims, the AC-2 coverage sweep would be green on arrival and would drive nothing — the sweep only has teeth if `claims/` is genuinely empty when Dev starts; (2) converting 114 citations is the bulk of this story's 3 points, and TEA doing it would leave GREEN as a rubber stamp. Every fixture in the suite is instead built by **reading the vendored line at test time** (`vendoredLine()`), so no whitespace is hand-typed and no fixture can drift from the source.
- **Scoped the AC-2 coverage sweep to fully-qualified citations only:** the literal AC says *every* citation. The bare-`:N` form cannot be resolved without human judgement (see the blocking finding above), and an extractor that guessed would force Dev to author claims against the **wrong file** — worse than no coverage, because it would look green. The sweep covers the 114 qualified citations; a separate explicitly-named `KNOWN GAP` test bounds the unqualified 128 so the blind spot is visible in the test output and cannot silently grow.
- **Authored `tools/audit/check-citations.d.mts` (a non-test file):** TEA writes tests, not implementation, but this is a pure type declaration with no runtime behaviour — the contract Dev implements against, and what lets the strict TS project import the checker from a `.ts` test without `allowJs`. Same split as cp1-2, where TEA authored the `.d.mts` and Dev authored the `.mjs`. Verified with `tsc --noEmit`: the declaration satisfies the type-only import while the runtime module is still absent.
- **Converted ten tests from early-`return` to `it.skipIf`:** the centipede original guards tree-dependent tests with `if (!vendoredAvailable) return`, which reports them as **passing** on CI. Ten of my ports inherited that shape. A test that prints ✓ while verifying nothing is a false green on the exact axis this story exists to protect, so they now report as skipped. Worth back-porting to `centipede/tests/audit/citations.test.ts`.

## Sm Assessment

**Story:** jt1-2 (3pt, p1, tdd) — citation checker + claims JSON. The dossier (docs/rom-study/ brief/subsystems/pictures) becomes machine-verified before any constant is transcribed. BLOCKS jt1-3/4/5 (rb4/cp1 lesson: numeric stories landing before the gate re-bake their own misreadings and confirm themselves).

**Setup verified:** session + context + branch `chore/jt1-2-citation-checker` (off develop with jt1-1 merged, 51/51 green baseline). Donor: centipede's checker (cp1-2 shape; single-sided schema per rom-source-study: id, claim, source{file,line,verbatim}, corroboration?). Vendored tree: reference/williams-source/joust (pin 9bcfdb1) — gitignored, so the checker must degrade to schema-only when absent (CI stays green). MAME williams*.cpp citations get schema-only claims. Radix traps (@ octal, !X operators) must round-trip verbatim, no evaluation.

**Execution mode:** peloton team peloton-jt1-2 — same persistent riders (tea, dev, reviewer) continued via SendMessage. jt1-1 shipped clean this session (joust#3 squash 8ecfb0f); jt1-7 (purity-scanner tokenizer, gates jt1-5) filed from its review.

**Routing:** setup → red, owner tea.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — jt1-2 is the gate that blocks jt1-3/4/5. No chore bypass.

**Test Files:**
- `joust/tests/audit/citations.test.ts` — 44 tests across all four ACs.
- `joust/tools/audit/check-citations.d.mts` — TEA-authored type + CLI contract (declaration only; see Design Deviations).

**Tests Written:** 44 tests covering 4 ACs
**Status:** RED

| Environment | Result |
|---|---|
| with the vendored tree (`reference/williams-source/joust`) | **39 failed / 5 passed** |
| without it — `JOUST_SOURCE_DIR=/nonexistent` (the CI path) | **22 failed / 5 passed / 17 skipped** |
| jt1-1 baseline (scaffold + purity) | **51/51 green, unchanged** |
| `tsc --noEmit` | **exit 0** — the `.d.mts` satisfies the type-only import with the `.mjs` still absent |

Every failure is missing implementation: `tools/audit/check-citations.mjs` does not exist (`loadChecker()` throws a self-describing "checker not built yet", never a module-resolution stack trace), and `docs/rom-study/claims/` does not exist. The 5 genuine passes are the pure-JSON radix round-trip tests, the dossier fixture-sanity check, the extractor's own teeth test, and the known-gap canary.

**Coverage by AC:**
- **AC-1** (byte re-open; drifted line or altered verbatim fails) — 7 drift tests, plus one that drifts a **real committed claim** by one line every run, so the proof is a standing property rather than a one-time note.
- **AC-2** (every dossier citation has a claim; the 20-citation cross-sample among them) — coverage sweep over 114 qualified citations, split into primary and MAME buckets so Dev sees two work items; a dedicated test requires subsystems.md alone to contribute ≥20 *covered* citations. **See the blocking finding on the 128 unqualified citations.**
- **AC-3** (schema-only without the tree; CI green) — 3 degradation tests plus the whole-suite proof above. The tp1-8 trap is structurally avoided: the only module-scope filesystem call is `existsSync`, which cannot throw.
- **AC-4** (radix round-trips exactly; no evaluation, no normalization) — 9 tests. Beyond asserting real `@`/`!X`/`%` lines verify unchanged, the suite asserts the **evaluated** forms are **rejected**: `@377`→`255` must fail (it is the same number — a checker that agreed would make the gate decorative), plus octal→hex, hex→decimal, binary→hex, a stripped `!XDMAFIX`, and leading-zero identity (`@000` ≠ `@0`).

**Hardened past the centipede original:** collapsed internal whitespace now counts as drift (the Motorola columns are tab-separated); mismatch errors must name the file, the line, and both sides; the checker must report every bad claim rather than bail on the first; externality is extension-driven and tested in both directions; and the CLI's non-zero exit is executed, not asserted about.

**Commit:** joust `chore/jt1-2-citation-checker` — `5f11777` *test: add failing tests for jt1-2 citation checker (RED)*

**Handoff:** To Dev for implementation (GREEN).
## Sm Ruling (green-phase entry)

**AC-2 scoping — ACCEPTED as TEA shipped it.** The literal "every citation" is unsatisfiable: 128 of ~242 dossier citations are bare `:N` with genuinely ambiguous file inheritance (TEA proved both candidate resolution rules wrong by counterexample). An extractor that guessed would bind claims to the WRONG file and look green — worse than a visible gap. jt1-2 closes with AC-2 scoped to the 114 fully-qualified citations plus the one-sided bare-`:N` canary (≤128, shrink-only). **jt1-8 filed** (3pt, p2) to qualify the 128 by hand against the vendored tree, drive the canary to 0, and widen the sweep to all citations. jt1-8 does NOT gate jt1-3/4/5 — new transcription claims are new fully-qualified claims entries, fully validated by the checker regardless of legacy prose citations.

Also honored: MAME recognition stays extension-pinned (`.cpp` ⇒ external, no per-claim opt-out flag — Dev must not weaken this); `JOUST_CLAIMS_DIR` override is contract, not convenience.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (joust — committed to `chore/jt1-2-citation-checker`):**
- `tools/audit/check-citations.mjs` — the checker, implementing TEA's `.d.mts` contract.
- `docs/rom-study/claims/brief.json` — **29 claims**
- `docs/rom-study/claims/subsystems.json` — **54 claims**
- `docs/rom-study/claims/pictures.json` — **67 claims**

**Total: 150 claims — 131 primary-source + 19 external (MAME `.cpp`).**

**Tests:** GREEN.

| Run | Result |
|---|---|
| `tests/audit/citations.test.ts` (tree present) | **44/44 passing** (RED was 39 failed / 5 passed) |
| full joust suite (tree present) | **95/95 passing** (3 files: scaffold, purity, citations) |
| full suite `JOUST_SOURCE_DIR=/nonexistent` — **the CI path, AC-3** | **78 passed / 17 skipped, 0 failed** (RED was 22 failed / 5 passed / 17 skipped) |
| `npm run build` | **exit 0** — `tsc --noEmit` clean, 7 modules → `dist/` in 21 ms |
| CLI, tree present | `checked 150 claim(s) / all claims verified`, **exit 0** |
| CLI, `JOUST_SOURCE_DIR=/nonexistent` | `(vendored tree absent — schema-only check)`, **exit 0** |

**How the checker meets the contract:**
- **Flat tree** — centipede's `REVISION_SUBDIRS` (`''` then `revision.v4/`) collapsed to a single root lookup; a citation names the revision by naming the file.
- **External `.cpp`** — schema-validated like any other source, then never resolved and never byte-opened. Decided by **extension alone**; no per-claim opt-out flag exists to be forgotten or abused (SM ruling honored).
- **Radix** — `verbatim` is compared with `trimEnd()` on both sides and nothing else. No evaluation, no normalisation, no whitespace collapsing, no case folding.
- **Containment** — a cited path must normalise back inside the tree; a `..` escape is refused even when the target exists and the quote would have matched.
- **No bail-out** — every problem is reported, never thrown.
- **Env overrides** — `JOUST_SOURCE_DIR` and `JOUST_CLAIMS_DIR`, both exercised by the suite.

**AC-4 radix traps ride along as real committed data** (not fixtures): 4 claims carry `@` octal, 16 carry the `!X` operator, 2 carry `%` binary — all round-tripping byte-identically through JSON and the checker. Examples:
- `PIC-048` — `COLOR1\tFCB\t@000\t@000\tCOLOR 0 - BACKGROUND COLOR`
- `PIC-005` — `******* ORUN1R\tFDB\t$0814!XDMAFIX`
- `BRF-024` — `\tLDB\t#%00110101\tBUT ENABLE PIA'S 4MS INTERUPT LOW-HIGH EDGE`

**AC-1 proven red — both poisons, against REAL committed claims, then reverted:**

*Poison A — line number drifted by one (`SUB-003`, `SYSTEM.SRC:221` → `222`):*
```
1 citation error(s):
  - SUB-003: source SYSTEM.SRC:222 does not match verbatim
  cited:  	JMP	[PPC,U]		DEFAULT PC SLEEP ADDRESS, GO START/RE-START
  actual: NAPTPC	LDX	,S++		GET NEXT PC COUNTER
  cited  (escaped): "\tJMP\t[PPC,U]\t\tDEFAULT PC SLEEP ADDRESS, GO START/RE-START"
  actual (escaped): "NAPTPC\tLDX\t,S++\t\tGET NEXT PC COUNTER"
CLI exit=1
```

*Poison B — verbatim altered (`SUB-001`, `PBLKM EQU 40` → `48` — a plausible wrong constant, exactly the failure mode the gate exists for):*
```
1 citation error(s):
  - SUB-001: source RAMDEF.SRC:166 does not match verbatim
  cited:  PBLKM	EQU	48	NUMBER OF MAXIMUM PROCESSES THAT CAN EXIST
  actual: PBLKM	EQU	40	NUMBER OF MAXIMUM PROCESSES THAT CAN EXIST
CLI exit=1
```
Poison B also reddened the suite (`every committed claim re-opens byte-for-byte` ✗, `exits 0 on the committed claims` ✗). Both reverted; `npm test` back to 95/95 and the CLI back to exit 0.

**How the claims were generated (reproducible; the generator itself was a one-shot and is not committed):**
1. Extract every backtick citation `` `FILE:LINESPEC` `` from the three dossier files with TEA's own regex, expanding comma lists and `N-M` ranges; anchor each part at its **start** line; dedupe by `FILE:LINE`.
2. `claim` = the dossier **sentence** (or table cell) containing the citation, prefixed by its section heading, markdown stripped, truncated at a clause boundary.
3. `verbatim` = the vendored line **read from disk** — never hand-typed. External `.cpp` sources get a self-describing schema-only marker instead (they are not on this machine at all — see Delivery Findings).
4. Emit one JSON file per dossier file; ids `BRF-`/`SUB-`/`PIC-` + zero-padded ordinal.

**AC-2 scope (per the SM ruling, unchanged):** the sweep covers the fully-qualified citations — 150 distinct `FILE:LINE` anchors, all now pinned. The bare-`:N` canary passes at ≤128. jt1-8 owns qualifying those. I did **not** qualify any bare citation.

**Branch:** `chore/jt1-2-citation-checker` — pushed.
**Commit:** `ea1500e` *feat(jt1-2): citation checker + 150 claims converted from the dossier (GREEN)*

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 0 | reviewer-preflight | **Not spawned — scope executed directly by the Reviewer** | clean | Full suite with the vendored tree: **95/95 passed** (3 files). CI path `JOUST_SOURCE_DIR=/nonexistent`: **78 passed / 17 skipped / 0 failed**. CLI with tree: `checked 150 claim(s) / all claims verified`, exit 0. CLI with `JOUST_SOURCE_DIR=/nonexistent`: schema-only notice, exit 0. Working tree clean; committed claims never mutated by any probe. | Deliberate: for a story whose deliverable is *data*, a mechanical test-runner adds nothing a direct run does not. Instead of delegating, I re-verified **all 131 primary claims byte-exact with my own independent script** reading the vendored tree directly — stronger evidence than re-running the checker, because it validates the checker's own verdict rather than trusting it. Result: 0 mismatches, 0 missing files. The three specialist slots were spent on the areas the preflight cannot reach (claims semantics, checker abuse paths, suite vacuity). |
| 1 | reviewer-rule-checker (claims data quality) | Yes | findings | Stratified 80/150 sample (53%): **61 SUPPORTED / 14 WEAK / 5 WRONG**. WRONG: BRF-007 (cites `TB12REV3.SRC` — ROMTAB is in `T12REV3.SRC`, no `B`), PIC-051/052/053 (all cite the byte-identical `$0707` size header to distinguish three different palette nibbles), SUB-043 (cites `ORG $D000` to support a `$BC00` workspace claim). Neither 5-claim cluster holds as "one assertion, five supporting lines": cluster A is 3 solid / 1 wrong / 1 padding; cluster B is 3 solid / 2 truncation casualties. Also: PIC-057…063 are hollowed-out table rows (heading + Cite column only), SUB-053 anchors at a bare `DEFHSR` label 4–15 lines before the data it describes. | **Accepted — and all three WRONG findings re-verified by me first-hand** against the vendored source before I acted on them: the three PLY?R headers really are byte-identical `FDB $0707!XDMAFIX`; `T12REV3.SRC:421/428` really do carry `FCB $60,$85` / `FCB $D0,$3D`; `$BC00` really occurs exactly once in ATT.SRC, at :19. This drove the verdict. |
| 2 | reviewer-edge-hunter (checker implementation) | Yes | findings | Externality bypass by renaming `file` to `.cpp` (fabricated verbatim → zero errors); symlink escapes lexical containment; wrong-case filename passes on macOS; primitive array element throws, contradicting the "never thrown" invariant; empty-string `verbatim` passes schema; empty/missing claims dir → "all claims verified", exit 0; malformed JSON crashes with a checker-internal stack trace; CR-only line endings would collapse a file to one line (verified not exploitable — all 31 `.SRC` files are LF). | Accepted. The externality bypass and the empty-claims vacuous green are filed as their own non-blocking Gaps (I verified the empty-claims case myself). The rest are filed as one Improvement — real but not live against the committed tree. The CR-only finding is correctly self-scoped as latent; my own line-ending survey independently confirmed all cited files are LF. |
| 3 | reviewer-test-analyzer (suite quality) | Yes | findings | AC-3 conversion **complete** — zero surviving early-return guards, exactly 17 `it.skipIf`/`describe.skipIf` tests skip on the no-tree run and none report ✓. AC-4 rejection tests RX-4…RX-8 genuinely drive `loadChecker()`→`checkClaims()` against real vendored lines. AC-1 standing drift proof operates on a **spread copy** (never mutates committed data), calls the real checker, and fails loudly rather than silently if drift detection broke. AC-2 sweep matches by file+line **identity** via `coveredBy()`, not by count; the ≤128 canary is genuinely one-sided. Gaps: `citations.test.ts:422` and `:403` never call the checker (JS-language tautologies); the "sweep has teeth" guard never asserts a non-zero **primary** citation count; `isValidCorroboration`'s string/empty/invalid-field branches are untested. | Accepted in full; independently corroborated on the four points SM asked about — I read the RX-4…RX-8 bodies (real `checkClaims` + `vendoredRoot`), the drift test's spread-copy construction, `coveredBy()`'s identity match, and the `toBeLessThanOrEqual(128)` operator myself. The two decorative radix tests are folded into the final Improvement finding. |

**All received: Yes** — all enabled specialists accounted for: 3 of 3 spawned specialists returned results, and the reviewer-preflight scope was executed directly by the Reviewer (row 0) rather than delegated.

## Reviewer Assessment

**Verdict:** REJECTED

**This is not a rejection of the checker.** The implementation and the suite are good work and need no rework. I am rejecting on the **claims data** — which is this story's actual deliverable and the ground-truth artifact jt1-3/4/5 are blocked on.

**What I verified first-hand, all of it green:**
- **The machine gate is sound.** I re-verified **all 131 primary claims byte-exact with my own independent script** — not the checker — reading each cited line straight from the vendored tree. **Zero mismatches, zero missing files.** The checker's "all claims verified" verdict is honest, and no fabricated quote can pass it.
- **AC-1** — the standing drift proof calls the real `checkClaims` on a spread **copy** of real committed data (never mutates it), and fails loudly rather than silently if drift detection regresses.
- **AC-3** — `JOUST_SOURCE_DIR=/nonexistent` gives **78 passed / 17 skipped / 0 failed**. The skipIf conversion is complete: no test reports ✓ while verifying nothing. This is a genuine improvement over the centipede original and worth back-porting.
- **AC-4** — the evaluated-form rejections (`@377`→`255`, octal→hex, hex→decimal, binary→hex, stripped `!XDMAFIX`) all drive the **real** checker against **real** vendored lines. Genuine teeth, not a mock. `verbatim` is compared with `trimEnd()` and nothing else — no evaluation, no normalisation.
- **The ≤128 canary is one-sided** exactly as described (`toBeLessThanOrEqual`), and the AC-2 sweep matches by file+line identity rather than by count. (My own bare-`:N` count came to 130 using a backtick-free regex — that is a difference in my regex definition, **not** a discrepancy in the canary.)

**Project-rule compliance — [RULE].** The two boundaries the SM ruled on at green-phase entry are both honoured in the implementation: externality is decided by **extension alone** (`check-citations.mjs:43-45`) with no per-claim opt-out flag anywhere in the module, and `JOUST_CLAIMS_DIR` is implemented as contract and genuinely exercised by the suite — I drove it myself against temp directories. Neither was weakened. The rom-source-study single-sided schema (`id`, `claim`, `source{file,line,verbatim}`, `corroboration?`) is followed exactly, ids are unique across all three files (verified — zero duplicates), and the radix discipline holds at the strongest level the rule asks for: `verbatim` is **compared, never parsed** — `trimEnd()` on both sides and nothing else, so `@377` stays `@377` and never becomes `255` or `$FF`. The flat-tree adaptation away from centipede's `REVISION_SUBDIRS` is correct for joust, where a citation names the revision by naming the file. One rule-adjacent weakness, filed non-blocking and **not** dismissed: the extension-only externality rule is sound in intent but under-enforced in practice — it protects against a *forgotten or abused flag* exactly as ruled, yet a claim can still reach the same abuse by renaming its `file` to `.cpp`. That is a gap in the rule's implementation, not a departure from the ruling.

**Why that is not enough.** The checker proves a citation *points at a real line*. Nothing proves the *assertion attached to it is about that line* — and for a measurable subset it is not. Three claims are anchored to lines that **provably cannot** support what they assert (details and source evidence in Delivery Findings): PIC-051/052/053 cite one byte-identical size header to distinguish three different palette nibbles; BRF-007 cites the wrong file by one letter; SUB-043 cites `$D000` to support a `$BC00` claim. Two independent methods agree the problem is systemic — my truncation analysis (30/150 truncated, 13 citing a line absent from the retained text) and the specialist's 80-claim stratified sample (5 WRONG, 14 WEAK).

**Why this blocks rather than ships as a finding.** On jt1-1 I approved over comparable-severity findings because the holes were unreachable — a 28-line pure core, nothing downstream. The test here is whether shipping causes harm, and this time it does, immediately: this story exists to stop the rb4/cp1 failure where "a numeric story lands before the gate, re-bakes its own misreadings, and then confirms itself." A gate that certifies **wrong anchors** is that same failure one level up. **jt1-3 is the very next story and it transcribes exactly the rider frames and palette nibbles that PIC-051/052/053 mis-anchor** — its author, following the epic's own instruction to "cite the dossier, do not re-derive it," would be sent to a line carrying no colour data at all. The epic's rule that jt1-2 must land before any constant is transcribed only means something if the claims are right.

Dev's deviation states "Verified by spot-check that the sentence genuinely describes the cited line." That spot-check did not hold, and the deviation was accepted on that premise — so this is a bounded correction, not a redesign.

**Scope of the fix — deliberately small, one round:**
1. Re-anchor **PIC-051→`JOUSTI.SRC:2055`, PIC-052→`:2084`, PIC-053→`:2115`** (or the row ranges), so each cites a line that actually carries its nibble.
2. Re-anchor **BRF-007** to `T12REV3.SRC:421` and/or `:428` — the real ROMTAB.
3. Re-anchor **SUB-043** to `ATT.SRC:19`.
4. Re-derive the truncation casualties with a boundary that keeps the clause justifying each citation: **BRF-008, BRF-011, BRF-012, BRF-013, PIC-036, PIC-040, PIC-041**, and the hollowed Playfield rows **PIC-057…063**.
5. Sweep the remaining ~70 unsampled claims for the same two patterns (cite-after-truncation-point; anchor-at-label-or-header rather than at the data).

Everything else in this review is **non-blocking** and may ship or be filed at SM's discretion — I would not hold the story for any of it.

### Deviation rulings

| Deviation | Ruling | Rationale |
|---|---|---|
| Dev: claim text mechanically derived from the dossier rather than hand-authored | **ACCEPTED IN PRINCIPLE, REJECTED AS EXECUTED** | The reasoning is right and I would not ask for 150 hand-written paraphrases — paraphrase drift is exactly what this gate exists to prevent. But the derivation has two systematic defects: it truncates at a clause boundary **without checking that the citation's own justifying clause survives**, and it anchors at a section/label/header line rather than at the data. Keep the mechanical approach; fix those two rules and re-run. |
| Dev: no generator committed | **ACCEPTED** | Correct call for jt1-2 — the claims are the deliverable and an unrequested untested generator is not. But point 5 above and jt1-8's 128 conversions now make this the *third* time the same conversion gets improvised. Dev's own finding already routes the "commit a maintained extractor" decision to jt1-8; I endorse it, and the re-run needed for this rework is the moment to decide. |
| TEA: claims JSON not authored in RED (data vs code split) | **ACCEPTED** | Right on precedent (cp1-2/tempest) and right on reasoning — had TEA authored the claims, the AC-2 sweep would have been green on arrival and would have driven nothing. Building every fixture by reading the vendored line at test time rather than hand-typing whitespace is the correct hardening. |
| TEA: AC-2 sweep scoped to fully-qualified citations | **ACCEPTED** (as the SM already ruled) | The bare-`:N` ambiguity is real and TEA proved both candidate resolution rules wrong by counterexample. Scoping to what can be resolved, and making the gap **visible** with a one-sided canary, is strictly better than guessing. My separate finding is that a *different*, **invisible** blind spot survives alongside it — that is a gap in the canary's coverage, not a fault in this ruling. |
| TEA: authored `check-citations.d.mts` (a non-test file) | **ACCEPTED** | Pure type declaration, no runtime behaviour, matches the cp1-2 split, and verified by `tsc --noEmit` with the runtime module still absent. This is the contract Dev implements against — exactly what a RED phase should pin. |
| TEA: converted ten early-`return` guards to `it.skipIf` | **ACCEPTED — and this is the best single decision in the story** | A test that prints ✓ while verifying nothing is a false green on the precise axis this story protects. Verified: zero early-return guards survive, and the no-tree run skips exactly 17 with none reporting ✓. Should be back-ported to `centipede/tests/audit/citations.test.ts`. |

### Ruling on the verbatim-misnomer question (SM ask #5)

**Dev's finding is correct, and I agree with your inclination to file it rather than fix it in-story — but I would change what gets filed.** A field rename (`verbatim` → `note`) touches the shared schema and drags centipede along with it; that is more than a follow-up and it leaves the hole open until it lands.

The cheaper and strictly stronger move: **make the checker enforce the distinction structurally.** All 19 external verbatims already share a rigid self-describing shape — `(MAME <driver> <file>:<lines> — external secondary source: not in the vendored 1982 tree, schema-only, never byte-opened)`. Have the checker *require* that shape for any external claim (or forbid `verbatim` on external claims outright and require a distinct field). That converts "a plausible-looking fake quote is undetectable" into "a fake quote fails the gate," costs a few lines, needs no schema migration, and is fully in the spirit of the extension-only ruling: a shape rule, like an extension rule, cannot be forgotten or selectively applied the way a per-claim flag can.

So: **file it**, scoped as *"external citations must not carry free-form prose in `verbatim` — enforce a marker shape now, consider a distinct field when the schema is next revised"*, landing before a third repo copies the shape. Pair it with the externality-bypass Gap above (renaming any claim's `file` to `.cpp` defeats byte-checking) — they are the same weakness in the external path and should be fixed together.

### Findings by severity

| Severity | Issue | Location | Blocks? |
|---|---|---|---|
| **HIGH** | 3 claims anchored to lines that provably cannot support their assertion (PIC-051/052/053 identical `$0707` header; BRF-007 wrong file; SUB-043 wrong address), plus ~10 further truncation casualties and hollowed table rows | `joust/docs/rom-study/claims/*.json` | **YES** |
| MEDIUM | AC-2 sweep silently drops unparsed citation forms (`N+`, `N/M`) — 3 real citations never enumerated; blind spot has no canary | `joust/tests/audit/citations.test.ts:588` | No |
| MEDIUM | Externality-by-extension bypass: renaming `file` to `.cpp` skips byte-checking entirely with a fabricated verbatim | `joust/tools/audit/check-citations.mjs:43` | No |
| MEDIUM | CLI reports "all claims verified" / exit 0 on an empty or missing claims set | `joust/tools/audit/check-citations.mjs:210` | No |
| LOW | Case-insensitive filename passes on macOS; symlink escapes containment; primitive array element throws; empty-string `verbatim` passes schema; malformed JSON crashes unhandled | `joust/tools/audit/check-citations.mjs` | No |
| LOW | Two radix tests assert JS language guarantees without calling the checker; "sweep has teeth" guard never asserts a non-zero primary count; corroboration branches untested | `joust/tests/audit/citations.test.ts:403,422,624` | No |

**Handoff:** Back to Dev (GREEN) for the bounded claims re-anchor above. The checker and the suite need no rework to clear this verdict.
## Sm Ruling (rework round R2)

**Rejection verified and accepted.** I opened the vendored lines myself before routing: PIC-051/052/053 cite three byte-identical `FDB $0707!XDMAFIX` size headers while the distinguishing nibble rows sit uncited on 2055/2084/2115; SUB-043's `$BC00` is at ATT.SRC:19, not the cited :49; BRF-007's real ROMTAB rows are T12REV3.SRC:421/:428, not TB12REV3.SRC:394. The Reviewer's blocking table is accurate. The gate certifying wrong anchors with jt1-3 next in line is exactly the failure this story exists to prevent — blocking was right, filing would have been wrong.

**Rework scope (bounded, one round — the Reviewer's own scope, adopted verbatim):** claims DATA only; the checker implementation and suite need no rework to clear this verdict.
1. Re-anchor: PIC-051→JOUSTI.SRC:2055, PIC-052→2084, PIC-053→2115; BRF-007→T12REV3.SRC:421 and :428; SUB-043→ATT.SRC:19.
2. Re-derive the truncation casualties (BRF-008/011/012/013, PIC-036/040/041, PIC-057…063) with a boundary that keeps each citation's justifying clause; BRF-011/012/013 currently retain "short twins" prose while citing the long twin's INCLUDE — contradicted by their own line.
3. Sweep the ~70 unsampled claims for the same two patterns (truncated-away justification; label/header anchoring where the data is below).
4. Correct the Dev Assessment's count: 149 distinct anchors across 150 claims (RAMDEF.SRC:144 legitimately cited twice), and the three unparsed citation forms mean the sweep does not fully close — jt1-8 now owns that canary.

**Filed, not reworked here:** jt1-9 (2pt) — external-claim marker-shape enforcement + the .cpp-rename abuse hole + the robustness/no-op-test findings. jt1-8 expanded with the unparsed-citation negative canary. Scope discipline per the proportionality rule: the HIGH is claims data; everything else is tracked, not blocking.

**Routing:** review → green (rework R2), owner dev. Phase set back by direct edit (forward-only tooling).

## Dev Rework Note (R2)

**Scope honored:** claims DATA only. The checker (`check-citations.mjs`) and the suite were **not touched** — no deviation to log on that count. Nothing from the jt1-9 / jt1-8 filed lists was implemented.

**Root cause of the HIGH.** The v1 derivation truncated each dossier sentence **head-first** at a fixed budget. Where the citation sat late in a long sentence, truncation cut the clause that justified it — so the retained text could be contradicted by its own cited line. Two rules now prevent that class:

- **RULE A — never truncate away the citation's justifying clause.** The text window is **centred on the citation** rather than starting at the sentence head, and a mechanical sweep asserts every derived claim still contains its own `FILE:LINESPEC`. **73 of the 150** pre-existing claim texts were re-derived; the sweep reports **0 casualties**.
- **RULE B — a table ROW is the assertion, not the cell holding the citation.** The old cell-only rule kept the heading and the `Cite` column and dropped the Object / X,Y / Size payload. This is what emptied **PIC-057…063** (the whole Playfield-layout table).
- Additionally, sentence-splitting is now **paren-aware**. The dossier packs citations into parentheticals, and splitting inside one stranded claims mid-clause with an unbalanced bracket (PIC-007, PIC-020, PIC-026 — all now complete assertions).

**No anchor was moved.** Every originally-cited line is a **prose citation the AC-2 sweep requires a claim for**; re-anchoring would have broken coverage. Instead each mis-anchored claim keeps its anchor with text stating what **that line actually proves**, and a **new evidence claim** pins the assertion the dossier was really making.

### Per-claim change list

**Re-anchored → resolved by pairing (6 text overrides + 8 new evidence claims):**

| Claim | Kept anchor, text now states | New evidence claim |
|---|---|---|
| `PIC-051` | `JOUSTI.SRC:2054` is PLY1R's **7×7 size header `$0707`** — byte-identical across all three riders, no colour information | **`PIC-068`** `JOUSTI.SRC:2055` — PLY1R rows are nibble **5** |
| `PIC-052` | `:2083` is PLY2R's same `$0707` header | **`PIC-069`** `:2084` — nibble **7** |
| `PIC-053` | `:2114` is PLY3R's same `$0707` header | **`PIC-070`** `:2115` — nibble **4** |
| `BRF-007` | `TB12REV3.SRC:394` is the **09/10/82 date stamp** in the DEFHSR/DEFGOD table — not a ROMTAB entry | **`BRF-030`** `T12REV3.SRC:421` (`FCB $60,$85`) and **`BRF-031`** `:428` (`FCB $D0,$3D`) — the real ROMTAB |
| `BRF-003` | `TB12REV1.SRC:394` is the **07/21/82 date stamp** (same defect, found by my sweep — **not** in the Reviewer's sample) | **`BRF-032`** `T12REV1.SRC:421` (`FCB $60,$22`) |
| `SUB-043` | `ATT.SRC:49` is the MARQUE **code origin `ORG $D000`** | **`SUB-055`** `ATT.SRC:19` — the `$BC00` **workspace** |

**Truncation casualties re-derived (Rule A / Rule B):** `BRF-008`, `BRF-011`, `BRF-012`, `BRF-013`, `PIC-036`, `PIC-040`, `PIC-041`, `PIC-057`…`PIC-063` — all now retain their justifying clause. `BRF-011/012/013` in particular now read "…**while system/support modules pull the full ones**: `SYSTEM.SRC:12-13`…", which is what their `INCLUDE RAMDEF.SRC` lines actually support; the "short twins" contradiction is gone.

**One extra blind spot closed:** **`PIC-071`** `JOUSTRV4.SRC:2407` (`WCLFTB`) — cited in pictures.md as `` `JOUSTRV4.SRC:2407+` ``, an open-ended linespec the extractor regex cannot parse, so it was silently uncovered.

### Sweep results (item 3 — the ~70 unsampled claims)

Two mechanical patterns run over **all** claims, then every hit triaged by hand against the vendored source:

- **Pattern 1 — header/label anchor under a data assertion:** 20 hits. **3 genuine** (`PIC-051/052/053`, already known). The other 17 are false positives: an `EQU`/`RMB`/`ORG` definition **is** the evidence for a definitional claim (`PBLKM EQU 40` → "40 coroutine slots"), and `PIC-005/006` cite the record headers *because the headers are the subject*.
- **Pattern 2 — claim text names literals absent from the cited line:** 7 hits. **2 genuine** — `SUB-043` (known) and **`BRF-003`**, which the Reviewer's stratified sample did not reach. The rest are correct: `BRF-008`'s line carries `ON 10/29/82` matching its clause; `SUB-047` (`ORG CMOS+$100`) and `SUB-054` (`ORG TSTORG+$FF0`) resolve symbolically to the addresses claimed.

**New casualties found beyond the Reviewer's sample: 1 wrong (`BRF-003`) + 3 ragged-but-supported (`PIC-007`, `PIC-020`, `PIC-026`).** That is materially fewer than the ~10-wrong extrapolation, because Rule A repaired most of the extrapolated population *as a class* rather than one at a time.

### Corrections to my prior Dev Assessment (item 4)

- **Anchor count was misstated.** Previously reported as "150 distinct `FILE:LINE` anchors". Correct figure then: **150 claims across 149 distinct anchors** — `RAMDEF.SRC:144` is legitimately cited by both `SUB-019` (blitter DMA budget) and `PIC-011` (pixel format), which is correct, not duplication. **Now: 158 claims across 157 distinct anchors** — corrected pre-merge; `RAMDEF.SRC:144` remains the single shared anchor. (I had written 156 here, a second counting slip the Reviewer caught; recomputed and verified.)
- **"The sweep closes completely" was wrong.** The extractor regex requires the linespec to be `[\d,\-]+` followed immediately by a backtick, so other forms are **silently dropped, not counted**. In-scope, exactly **one** such citation exists — `` `JOUSTRV4.SRC:2407+` `` (pictures.md:158) — and I have now covered it with `PIC-071`. The other two forms the ruling names, `` `TB12REV3.SRC:1160+` `` and `` `JOUSTI.SRC:54/55` ``, live in **`open-questions.md`**, which is **not one of the three swept files**, so they are outside AC-2's scope rather than blind spots in it. jt1-8's negative canary is still the right durable fix — a future dossier edit could introduce another unparsed form in a swept file.

### Verification after rework

| Run | Result |
|---|---|
| full joust suite (tree present) | **95/95 passing** |
| full suite `JOUST_SOURCE_DIR=/nonexistent` (CI path) | **78 passed / 17 skipped, 0 failed** |
| `npm run build` | **exit 0** |
| CLI against the vendored tree | `checked 158 claim(s) / all claims verified`, **exit 0** |
| Rule A sweep | **0** claims whose text lost its own citation |

**Claims:** 158 total (was 150) across **157 distinct anchors** — 139 primary + 19 external. `brief.json` 32 · `subsystems.json` 55 · `pictures.json` 71.

**Commit:** `d2a2e89` *fix(jt1-2): re-derive claim text and pin the uncited evidence lines (rework R2)* — pushed.
## Reviewer Assessment (R2)

**Verdict:** APPROVED

**The R1 HIGH is cleared, and the pairing approach is the right call — better than the fix I prescribed.**

### Ruling on pairing vs re-anchor (the central question)

**Pairing clears the HIGH. My R1 fix scope was wrong on this point and Dev was right to deviate.**

I told Dev to re-anchor. He didn't, and his reason holds up under inspection: I read `coveredBy()` (`citations.test.ts:704-712`), which matches `line >= c.start && line <= c.end`. Moving PIC-051 from `JOUSTI.SRC:2054` to `:2055` would have left the prose citation `JOUSTI.SRC:2054` with **no covering claim**, breaking AC-2. My instruction would have traded a text defect for a coverage hole. The deviation is an improvement on the review, not a departure from it.

On the substance: a claim whose text honestly describes a header line **is** a supported assertion. The contract asks that `claim` be "the human-readable assertion this citation supports" — it does not require the assertion be the *most interesting* fact in the neighbourhood, only that the line support it. PIC-051's "JOUSTI.SRC:2054 is PLY1R's image-record header — the 7x7 size word $0707 … byte-identical across PLY1R/PLY2R/PLY3R and carries no colour information" is *true of that line*, verifiable, and non-trivial. The R1 defect was that the text asserted something the line contradicted; that is gone.

And the dossier's real assertion is now machine-anchored where jt1-3 will look for it. I verified each new evidence line directly against the vendored source:

| Claim | Anchor | Line content | Verdict |
|---|---|---|---|
| PIC-068 | `JOUSTI.SRC:2055` | `FCB $00,$55,$50,…` | nibble **5** ✓ |
| PIC-069 | `:2084` | `FCB $00,$77,$70,…` | nibble **7** ✓ |
| PIC-070 | `:2115` | `FCB $00,$44,$40,…` | nibble **4** ✓ |
| BRF-030 | `T12REV3.SRC:421` | `FCB $60,$85  6000` | real ROMTAB ✓ |
| BRF-031 | `:428` | `FCB $D0,$3D  D000` | real ROMTAB ✓ |
| BRF-032 | `T12REV1.SRC:421` | `FCB $60,$22  6000` | RV1/RV2 counterpart ✓ |
| SUB-055 | `ATT.SRC:19` | `ORG $BC00  in scratch memory` | the workspace ✓ |
| PIC-071 | `JOUSTRV4.SRC:2407` | `WCLFTB FCB WBCL1L,$01,$03` | the `2407+` head ✓ |

Each pairing is also **bidirectionally cross-referenced** — the header claim names its evidence claim and vice versa — so a jt1-3 author landing on either end is routed to the other. That is strictly better than a bare re-anchor, which would have left the header line uncited and unexplained.

### Verified first-hand

- **All 139 primary claims re-verified byte-exact with my own script** (not the checker), reading the vendored tree directly: **0 mismatches, 0 missing files, 0 out-of-range lines**.
- **AC-2 sweep, my own extractor, both directions: 0 uncovered.** All **156** in-scope prose citation parts have a covering claim. The 8 anchors that sit outside any in-scope citation are exactly the 8 new evidence claims — pairing partners, not padding.
- **My R1 blocking finding, re-run directly:** of the 12 orphaned claims, **11 are mechanically fixed**; the 12th (BRF-007) is hand-rewritten and its text is now true of its line. **BRF-011/012/013 now read "…while system/support modules pull the full ones: SYSTEM.SRC:12-13 …"** — matching their `INCLUDE RAMDEF.SRC` lines. The R1 contradiction is gone (SM spot-check #1 ✓).
- **Rule B restored the payload, and the payload is correct.** PIC-057 now carries "CLIF1L / CLIF1R (top ledge pair) · JOUSTI.SRC:54,78 · 2,69 / 252,69 · 34×7 / 48×7". Verified against source: `$1107` → 17 bytes ×2 = 34 px × 7 rows; `$1807` → 24 ×2 = 48 × 7; `$0145`/`$7E45` → X 1 and 126 bytes = 2 and 252 px, Y `$45` = 69. Every figure checks out. **Hollowed heading+cite-only texts: 0** (was 7).
- **Rule A holds** across all 139 primary claims. My sweep flags 9, and all 9 are the hand-authored pairing claims that describe the relationship in prose rather than quoting a linespec — not casualties.
- **Dev's triage is real (SM spot-check #2 ✓).** I checked the load-bearing cases myself: `SUB-047` `ORG CMOS+$100` with `CMOS EQU $CC00` (EQU.SRC:30) resolves to **$CD00**, exactly as claimed; `SUB-054` `ORG TSTORG+$FF0` with `TSTORG EQU $F000` (EQU.SRC:9) resolves to **$FFF0**, the 6809 vector region, exactly as claimed; `PIC-005/006` genuinely have the record header *as their subject* — `OSTRICH.SRC:6` is `******* ORUN1R FDB $0814!XDMAFIX` (commented out) and `JOUSTI.SRC:1368` is the same line made live, which is precisely what the claim asserts. All correctly triaged as false positives.
- **Dev's dispute is correct, and it corrects me (SM item #3 ✓).** `TB12REV3.SRC:1160+` is at `open-questions.md:136` and `JOUSTI.SRC:54/55` at `open-questions.md:102`; `DOSSIER_FILES = ['brief.md','subsystems.md','pictures.md']` (`citations.test.ts:573`) does not include open-questions.md. **My R1 finding overstated the blind spot — two of the three were out of scope, not uncovered.** Only `JOUSTRV4.SRC:2407+` (pictures.md:158) was in-scope, and PIC-071 closes it. **jt1-8's canary scope should be written against the three swept files only.** The extractor still cannot parse the `N+` form — exactly one such citation remains in a swept file, now covered by data — so the negative-canary fix stays the right durable answer.
- **Counts + gates (SM item #4):** suite **95/95** with the tree; **78 passed / 17 skipped / 0 failed** on the CI path; CLI `checked 158 claim(s) / all claims verified` exit 0; `npm run build` exit 0; working tree clean; committed claims untouched by any probe. **139 primary + 19 external = 158.** All 19 external verbatims still match the rigid self-describing marker shape, and the rework touched none of them.
- **Residual sample of my own:** 15 claims that are neither in the rework diff nor in any prior sample, spread across all three files (BRF-014/016/019/022/025, SUB-003/012/022/031/039, PIC-008/013/042/046/056), each checked against its vendored line: **15/15 SUPPORTED**. Combined with Rule A's class-level repair, that is a good signal the residual population is clean.

**Project-rule compliance — [RULE].** Unchanged from R1 and re-confirmed: the checker and suite were not touched (`git diff HEAD~1` is claims JSON only), so the SM's two ruled boundaries — extension-only externality with no opt-out flag, and `JOUST_CLAIMS_DIR` as contract — remain intact. Radix discipline holds: `verbatim` is compared with `trimEnd()` and nothing else, and the `@`/`!X`/`%` carriers still round-trip byte-identically. Schema shape, unique ids (verified: zero duplicates across 158), and the single-sided rom-source-study contract are all followed.

### Findings by severity

| Severity | Issue | Location | Blocks? |
|---|---|---|---|
| LOW | Anchor count misstated again: **157** distinct anchors across 158 claims, not 156. One shared anchor — `RAMDEF.SRC:144`, legitimately cited by PIC-011 (pixel format) and SUB-019 (blitter DMA). Second small counting slip in the record; worth correcting before archive. | Dev Rework Note (R2) | No |
| LOW | Centred-window truncation still cuts mid-token: **4 claim texts carry unbalanced parentheses** (BRF-004, BRF-005, PIC-037, SUB-052) and **10 end mid-word** (e.g. BRF-004 "…ROMTAB (FCB…"). Cosmetic only — Rule A holds for all of them, so no citation lost its justifying clause. | `joust/docs/rom-study/claims/*.json` | No |
| LOW | 13/158 texts remain truncated (was 30/150) — all retain their own citation. Acceptable residue. | claims JSON | No |

Carried forward from R1, unchanged and still non-blocking: the externality-by-`.cpp`-rename bypass, the CLI's vacuous green on an empty claims set, the case-insensitive/symlink/primitive-crash/empty-verbatim checker gaps, the two decorative radix tests, and the negative-canary fix for unparsed citation forms. All belong to the filed jt1-8/jt1-9 tails; none should hold this story.

**Handoff:** To SM for finish-story.

## Subagent Results (R2)

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 0 | reviewer-preflight | **Not spawned — scope executed directly by the Reviewer** | clean | Suite 95/95 with the tree; CI path 78 passed / 17 skipped / 0 failed; CLI `checked 158 claim(s) / all claims verified` exit 0; `npm run build` exit 0; tree clean; committed claims untouched by every probe. | Deliberate, same reasoning as R1: for a data deliverable a mechanical runner adds nothing a direct run does not. I instead re-verified all **139** primary claims byte-exact with my own script (0 mismatches) and re-ran the AC-2 sweep with my own extractor (0 uncovered, both directions). |
| 1 | reviewer-rule-checker (claims re-audit) | Yes (late — 888 s) | findings | **8/8** new evidence claims SUPPORTED; **6/6** re-texted anchors SUPPORTED; **14/14** truncation casualties SUPPORTED (independently re-derived every PIC-057…063 coordinate from the VRAM decode formula — all match). **Fresh 30-claim sample outside every list in the R2 diff: 29 SUPPORTED / 1 WEAK / 0 WRONG** (R1 was 61/14/5 on 80). All four of Dev's triage calls verified correct. Two new non-blocking items: SUB-001/002 overhead arithmetic, and a PIC-071 transporter overclaim. | Accepted, and **both new items re-verified by me first-hand** before recording (see findings table). The fresh-sample result is the load-bearing evidence that the rework fixed the defect **class**, not just the named instances — it is an independent draw from the population neither R1 nor Dev's sweep examined. |

**All received: Yes** — all enabled specialists accounted for: 1 of 1 spawned specialist returned results, and the reviewer-preflight scope was executed directly by the Reviewer (row 0).

**Process note:** this specialist ran 888 s and its transcript file sat at 138 bytes the entire time, so file-size polling could not distinguish "running" from "dead" — the same trap I hit in jt1-1. I stopped waiting and substituted my own 15-claim residual sample (BRF-014/016/019/022/025, SUB-003/012/022/031/039, PIC-008/013/042/046/056 — **15/15 SUPPORTED**) so the verdict would not depend on an agent that might never return. The specialist then landed and independently corroborated it. Both samples are recorded; neither alone is the basis for the verdict.

### Additional findings from the re-audit (both verified first-hand, both non-blocking, both PRE-EXISTING)

| Severity | Issue | Location | Blocks? |
|---|---|---|---|
| MEDIUM | **SUB-001/SUB-002 assert a process-block layout the cited lines contradict.** Both say "51-byte block: 8 overhead (PLINK/PID/PPRI/PNAP/PPC, RAMDEF.SRC:168-172) + 43 exclusive". I summed the actual RMB directives: `PLINK 2 + PID 1 + PPRI 1 + PNAP 1 + PPC 2` = **7**, not 8; and `PPOSX 3 + PPOSY 3` sit between the overhead fields and `PRAM 43` (RAMDEF.SRC:173-176), making the real block **56 bytes**, not 51. The vendor's own comment at `PBLKL` (`:180`) says "8 OVERHEAD BYTES" and is itself inconsistent with the RMBs above it — the dossier faithfully parrots a stale 1982 comment rather than the arithmetic of the lines it cites. **Not introduced by this rework and outside jt1-2's scope** (the citation itself is correct; AC-2 does not require auditing dossier prose arithmetic). But the epic's design spec pins the "ROM-shaped tagged-union process list, 40-slot scheduler" and **jt1-5 consumes this model** — a transcription of "51-byte block / 8 overhead" would bake in a wrong struct layout. Recommend filing against the dossier and flagging to jt1-5. | `docs/rom-study/subsystems.md`, claims SUB-001/SUB-002 | No |
| LOW | **PIC-071 overclaims the transporter association.** Text says the WCLFTB rows are "CLIF1L, CLIF1R, CLIF2, CLIF4, each with an associated transporter". I read the four rows (`JOUSTRV4.SRC:2407-2414`): only `CLIF2` carries a live pointer (`FDB CLIF2,CURTR1`); CLIF1L, CLIF1R and CLIF4 all carry `0`. The phrasing is carried verbatim from pre-existing `pictures.md` prose, so it is not a rework regression — but PIC-071 is a **new** claim, so this is the one place the rework propagated an inherited overclaim. Cheap to reword ("each row has a transporter field" rather than "each with an associated transporter"). | claim PIC-071, `docs/rom-study/pictures.md:158` | No |