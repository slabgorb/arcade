---
story_id: "jt1-8"
jira_key: "jt1-8"
epic: "jt1"
workflow: "tdd"
---
# Story jt1-8: Qualify the dossier's 128 bare-:N citations — every citation enters the machine gate

## Story Details
- **ID:** jt1-8
- **Jira Key:** jt1-8
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T03:54:10Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T03:33:43Z | 2026-07-20T03:35:00Z | 1m 17s |
| red | 2026-07-20T03:35:00Z | 2026-07-20T03:38:55Z | 3m 55s |
| green | 2026-07-20T03:38:55Z | 2026-07-20T03:51:06Z | 12m 11s |
| review | 2026-07-20T03:51:06Z | 2026-07-20T03:54:10Z | 3m 4s |
| finish | 2026-07-20T03:54:10Z | - | - |

## Delivery Findings

### TEA (test design)
- **Gap** (non-blocking, and the reason this story needs more than a canary flip): **one citation-shaped string already escapes the sweep parser** — `` `JOUSTRV4.SRC:2407+` `` in `pictures.md`. It reads as fully qualified to a human, but the extractor only enumerates `FILE:N`, `FILE:N-M` and comma lists, so it is silently dropped and invisible to every coverage test. That matters beyond the one instance: **qualifying the 127 into such a shape would take the canary to zero while the coverage sweeps passed having never seen them.** Now pinned by a negative canary over the three swept files. *Found by TEA during test design.*
- **Gap** (non-blocking): **a canary that only counts bare citations can be satisfied by DELETING them.** Nothing in the existing rails distinguishes "qualified" from "removed". Added an enumeration floor: 186 citations were parser-visible before this story and 127 bare ones must be qualified, so the sweep must now see ≥300. A floor rather than an equality, since consolidating a duplicate or splitting a comma list are both legitimate while qualifying. *Found by TEA during test design.*
- **Question** (non-blocking): **135 of the 287 existing claims carry no FILE:LINESPEC in their claim text**, so the jt1-2 R2 standard cannot be asserted fleet-wide without retrofitting them. I scoped the mechanical rule to this story's `JT8-` prefix. Whether the other 135 get retrofitted is a real decision — jt1-10 showed the cost of a claim whose prose nobody can check (`SUB-001`/`002` cited real lines byte-for-byte while asserting a wrong layout, and the gate, which never reads `claim`, stayed green for four stories). Affects a possible follow-up story. *Found by TEA during test design.*
- **Improvement** (non-blocking): **"no header-anchoring over data" is not mechanically pinnable and I did not fake it.** Rule A (claim text names its own line) is asserted; the header-anchoring half is a judgement about whether the cited line is the *right* line, which no regex can decide. Left as a Reviewer check rather than a test that would pass on anchor-shaped nonsense. *Found by TEA during test design.*

## Design Deviations

### TEA (test design)
- **Built nothing new — all four rails live in the existing `tests/audit/citations.test.ts`.** The brief warned against machinery the suite already has, and it was right: the coverage sweeps automatically widen to cover the qualified citations the moment they take `FILE:LINESPEC` form, so "widening the AC-2 sweep" needed no code at all. The work was flipping one canary and adding three guards around the ways a flip can lie.
- **Did NOT mechanise the ambiguity resolution, by design.** `:175` sits inside both RAMDEF.SRC and JOUSTRV4.SRC; `:5934` cannot be the nearest-named SYSTEM.SRC. Any extractor that guessed would author claims against the wrong file — worse than the gap, because it would look green. The rails pin only that the RESULT is fully qualified, parser-visible and byte-verified, whatever file the human judgement lands on. The 127 calls stay Dev's, per the jt1-2 split: the sweep has teeth only if the qualification is genuinely someone else's work.
- **Scoped the claim-text rule to the `JT8-` prefix** rather than all claims — see the finding. This does oblige Dev to use a consistent prefix, which matches the existing `JT4-`/`JT5-` convention.
- **Left the extractor decision to Dev, and logged it as required.** My rails do not commit a maintained extractor: they are a parser-visibility canary plus a count floor, which constrain the RESULT without prescribing the METHOD. If Dev commits an extraction tool it owes tests (the jt1-3 tool ruling); if Dev qualifies by hand and records the method, the same rails hold. Recording the choice is Dev's obligation either way.

## Sm Assessment

**Story:** jt1-8 (3pt, p2, tdd) — qualify the 127 remaining bare-:N citations by hand against the vendored tree; canary → 0; sweep widened to ALL citations; negative canary for unparsed forms (three swept files only). Each qualification is a judgment call, not a rewrite — jt1-2 proved both mechanical inheritance rules wrong by counterexample. The jt1-2 R2 claim-text standard applies (justifying clause kept; no header anchors over data).

**Setup verified:** session + context + branch `chore/jt1-8-qualify-citations` off develop (68fbf34; p1 slice complete, 373/373, 286 claims, canary 127). Extractor decision (commit-with-tests vs re-improvise) is TEA/Dev's to make and log.

**Routing:** setup → red, owner tea.
## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — the rails define done-ness for 127 human judgement calls. No chore bypass.

**Test Files:**
- `joust/tests/audit/citations.test.ts` — modified. Four rails; **no new files, no new machinery.**

**Tests Written:** 4 rails (1 flipped, 3 new)
**Status:** RED — **4 failed / 372 passed** (376). Baseline green, `tsc --noEmit` exit 0.

| Rail | Fails with |
|---|---|
| bare `:N` → exactly 0 | `127 bare citations remain` (and names them) |
| no citation-shaped string escapes the parser | `pictures.md \`JOUSTRV4.SRC:2407+\`` |
| sweep enumerates ≥300, not fewer | `expected 186 to be >= 300` |
| every `JT8-` claim names its own FILE:LINESPEC | no `JT8-` claims yet |

### Why this is more than a canary flip

Two ways a canary can be driven to zero while the gap stays open, both now closed:

1. **Qualify into a shape the parser cannot read.** The sweep enumerates `FILE:N`, `FILE:N-M` and comma lists only. Anything else is citation-shaped, reads as qualified to a human, and is **silently dropped** — so coverage would pass having never seen it. One such string exists today: `` `JOUSTRV4.SRC:2407+` ``.
2. **Delete the citations instead of qualifying them.** Nothing distinguished the two. The enumeration floor (186 before, ≥300 after) closes it.

### What I deliberately did not do

**No mechanical ambiguity resolution.** `:175` sits inside both `RAMDEF.SRC` and `JOUSTRV4.SRC`; `:5934` cannot be the nearest-named `SYSTEM.SRC`. A guessing extractor would author claims against the wrong file — worse than the gap, because it looks green. The rails pin only that the result is fully qualified, parser-visible and byte-verified, whatever the human judgement decides.

**No new machinery.** The AC-2 sweep widens by itself the moment citations take `FILE:LINESPEC` form. The brief warned against rebuilding what the suite has, and that was correct.

**No faked header-anchoring check.** Rule A (claim text names its own line) is asserted. The "no header-anchoring over data" half is a judgement about whether the cited line is the *right* one — left to the Reviewer rather than a regex that would pass on anchor-shaped nonsense.

**Commit:** joust `chore/jt1-8-qualify-citations` — `2903445`

**Handoff:** To Dev for implementation (GREEN).
## Delivery Findings — Dev (implementation)

- **Gap** (non-blocking, and it quantifies why this story existed): **the two candidate inheritance rules are not merely imperfect — they are wrong at scale, and I measured both.** Of 127 bare citations, **44 nearest-named candidates are impossible**: the cited line is past that file's EOF. `SHRAMDEF.SRC` (434 lines) was the nearest name for **38** of them; `SYSTEM.SRC` (1038) was nearest for a `:5934`. And of the 42 citations where surrounding-context tokens identify the file unambiguously, **only 21 agree with nearest-named** — a coin flip exactly where it is checkable. The dossier's own stated default (JOUSTRV4.SRC unless another file is named) fares better but is not sufficient either: 24 of the resolutions are to some other file. Affects any future dossier convention — the honest rule is "qualify at write time", not "infer at read time". *Found by Dev during implementation.*
- **Improvement** (non-blocking): **the resolution that best justifies the human-judgment requirement is `:284-290`.** It sits in §6, headed *Attract mode (`ATT.SRC` + game module)*, immediately after an `ATT.SRC` mention — so both mechanical rules point at `ATT.SRC`, and `ATT.SRC:284-290` exists and looks like plausible code. It is the MARQUE colour table and supports nothing in the sentence. The real referent is `JOUSTRV4.SRC:284-290`: the `!!!!!!!!!BECAREFULL!!!!!!!!!!` hand-computed-branch block containing `ANDA #$7F` (clearing the bit-7 font flag) and `JSR ETEXT35` (the small-font entry) — precisely what the prose describes. A plausible wrong file with a plausible wrong line is exactly the failure a mechanical sweep cannot see. *Found by Dev during implementation.*
- **Question** (non-blocking): **20 of the 125 distinct anchors were already claimed by jt1-2/3/4/5, and my first pass skipped them — which broke the sweep.** The AC-2 coverage test requires a claim per citation PART (comma lists expand), and dedup-by-start-line missed range parts, leaving 10 uncovered. Emitting a JT8 claim for every part regardless of prior coverage fixed it and is what the ≥120 rail wants, but it means some source lines now carry two claims from different stories with different prose. That is not wrong — one is the constant, one is the qualification — but a future reader will find duplicates and should know they are deliberate. Affects `docs/rom-study/claims/`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **`DOWNLDS.COM` is 11 lines, which resolved a citation that looked file-adjacent.** brief.md's tooling sentence reads "…`COMPACT.COM` …, `DOWNLDS.COM`, `:39-42`", so the citation appears to belong to the file just named. It cannot — and `JOUST.DOC:39-42` is exactly the `UTILITIES` block listing both `.COM` tools. The whole sentence enumerates JOUST.DOC sections (`:14-30`, `:32-34`, `:36-37`, `:39-42`), which also confirms the module-map citation beside it. *Found by Dev during implementation.*

## Design Deviations — Dev (implementation)

- **One-shot extractor, not a committed tool — a deliberate reversal of my jt1-2 note.** jt1-2's assessment suggested jt1-8 might want a maintained extractor. It should not: the extraction is trivial (one regex) and the WORK is judgment that cannot be encoded — 19 citations were decided by reading vendored context, and a tool that automated the other 108 would invite the next author to trust it on the 19. The pipeline is recorded step by step below so it is reproducible without being re-runnable-by-default. **The canary is the durable guard**: it asserts 0, so any regression reddens immediately, which is a better investment than a tool.
- **Resolution priority, applied in order and logged per citation:** (1) content match — a prose symbol appearing within ±2 lines of the candidate, (2) the dossier's stated default where the line exists and is not blank/comment-only, (3) nearest-named, (4) human reading. Every one of the 127 was then verified to exist in its resolved file.
- **`JOUSTRV4.SRC:2407+` became `:2407-2414`** rather than teaching the parser the open-ended form. The `+` was shorthand for WCLFTB's four records, which end at :2414; stating the real extent is more useful than a parser rule that legitimises open ends.

## Dev Assessment

**Implementation Complete:** Yes

**Counts:**

| Metric | Result |
|---|---|
| bare `:N` citations qualified | **127** (brief 10, subsystems 102, pictures 15) |
| canary | **0** (was 127) |
| JT8- claims added | **136** — one per distinct anchor across every citation part |
| claims total | 287 → **423**, all byte-verified |
| unparsed citation forms | **0** |
| suite | **376/376** (was 372 + 4 red rails) |
| `npm run build` | **exit 0** |

**Resolution provenance for all 127:** content match **42** · dossier default **61** · nearest-named **5** · human reading **19**.

**Final file distribution:** JOUSTRV4.SRC 102 · JOUSTI.SRC 10 · JOUST.DOC 5 · SYSTEM.SRC 5 · MESSAGE.SRC 4 · TB12REV3.SRC 1.

**The 19 ambiguous cases and their resolutions:**

| # | Citation | Nearest said | Resolved | Evidence |
|---|---|---|---|---|
| 1 | brief `:14-30` | JOUST.DOC | **JOUST.DOC** | `:14` = "FILES TO ASSEMBLE;" — the module map itself |
| 2 | brief `:39-42` | SUMMER.SRC | **JOUST.DOC** | `DOWNLDS.COM` is 11 lines; JOUST.DOC:39-42 is the `UTILITIES` block naming both .COM tools |
| 3 | subsys `:959` | SYSTEM.SRC | **JOUSTRV4.SRC** | `:959` = `LDA #90  1 1/2 SECOND…` verbatim; SYSTEM.SRC:959 is a pixel-line advance |
| 4 | subsys `:146` | SHRAMDEF.SRC | **JOUSTRV4.SRC** | `:146` = `ORG PPOSX`, the exact directive quoted |
| 5 | subsys `:1585-1595` | JOUSTRV4.SRC | **JOUSTRV4.SRC** | `:1585` = "PTERODACTYLS X VELOCITY TABLE" header |
| 6 | subsys `:2135-2148` | JOUSTRV4.SRC | **JOUSTRV4.SRC** | `:2135` is a `********` comment row — the prose cites the preserved RV3 originals |
| 7 | subsys `:7340-7366` | JOUSTRV4.SRC | **JOUSTRV4.SRC** | `:7340` = "INCREMENT SCORE BY THOUSANDS AND HUNDREDS" |
| 8 | subsys `:6268` | JOUSTRV4.SRC | **JOUSTRV4.SRC** | `:6268` = "PATCHES TO PREVENT PLAYER FROM PTERODACTYL HUNTING" — the header cited |
| 9 | subsys `:91-92` | MESSAGE.SRC | **MESSAGE.SRC** | `:91` = `LDB #$1A  READ SERIAL, WRITE BLOCK, CONSTANT SUBB` |
| 10 | subsys `:213-222` | MESSAGE.SRC | **MESSAGE.SRC** | `:213` = `OUTTEXT CLR FLAG  CLEAR THE ERASE FLAG` |
| 11 | subsys `:284-290` | ATT.SRC | **JOUSTRV4.SRC** | the `!!!!BECAREFULL!!!!` block with `ANDA #$7F` + `ETEXT35`; ATT.SRC:284-290 is the MARQUE colour table |
| 12 | subsys `:835-837` | TB12REV3.SRC | **TB12REV3.SRC** | `:835` = `EXG X,Y   X=CMOS, Y=DEST` |
| 13-19 | pictures `:781`, `:1668`, `:2046-2206`, `:2376`, `:2481`, `:2564`, `:2601` | JOUSTI.SRC | **JOUSTI.SRC** | each line is exactly the entity label the table row names — `STORK EQU *`, `BUZARD EQU *`, `PLYR1`, `ILAVAT`, `IFLAME`, `POOF1`, `IPTERO` |

**Method (reproducible; the extractor was one-shot by decision — see Deviations):** extract every `` `:N` `` with its dossier line and prose context → compute nearest-named-before-the-citation → falsify candidates whose line exceeds the file's length → score remaining candidates by prose-symbol match within ±2 lines → apply the priority order → read the residue → verify every resolution exists → rewrite the three files in place → emit one JT8 claim per citation part with its justifying clause and its own `FILE:LINESPEC`.

**Commit:** `b8ac9de` — pushed.

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 0 | reviewer-preflight | **Not spawned — executed directly by the Reviewer** | clean | **376/376** across 14 files; citation gate **423 claims verified**; bare-`:N` canary **0** and unparsed-form negative canary **0**, both by my own count; **290** qualified citation strings across the three swept files; tree clean. | Ran directly. |
| 1 | reviewer-rule-checker | **OUTSTANDING — no result at write-up** | outstanding | Dispatched on a stratified 25+ sample of the 127 resolutions, biased toward low line numbers and file-adjacent traps. | Not failed (standing rule). I verified the rails and the single most diagnostic resolution myself; **the breadth sample is the gap in this review** — named below rather than implied. |

**All received: Yes** — preflight executed directly; the rule-checker is **outstanding** with the load-bearing case re-covered first-hand.

## Reviewer Assessment

**Verdict:** APPROVED

### The rails hold, and I checked them independently [RULE]

By my own count over the three swept files: **bare `:N` = 0** (the canary's assertion), **unparsed citation forms = 0** (so the `2407+` class that I filed as an invisible blind spot at jt1-2 R1 is now closed), and **290** qualified citation strings. Gates: **376/376**, **423 claims verified**, tree clean. A seeded regression — reintroducing one bare `:N` into a temp copy of `docs/` — takes the canary count to 1 against an assertion of 0, so the rail fails as designed.

### The qualifications are genuine judgment, and one case proves it

The deliverable here is 127 human decisions that no gate can check, because a wrong file whose line happens to carry a matching verbatim passes green — the exact hole I identified in jt1-2. So the question is whether these are reasoned or extracted. **Dev's `:284-290` case settles it, and I verified it at source:**

- Both mechanical rules point at **`ATT.SRC`** — it is the nearest named file, and §6 is headed *"Attract mode (`ATT.SRC` + game module)"*.
- `ATT.SRC:284-290` **exists and looks entirely plausible**: `MARCOL FCB $00,$00,$07,$3F,$05,@377,$E8,@350` — the MARQUE colour table.
- It supports **nothing** in the sentence.
- The real referent is `JOUSTRV4.SRC:284-290`: the `!!!!!!!!!BECAREFULL!!!!!!!!!!` hand-computed-branch block carrying `ANDA #$7F` and `JSR ETEXT35` — precisely the font-flag clearing and small-font entry the prose describes.

A plausible wrong file at a plausible line, invisible to the checker, correctly rejected. That is the failure mode I said a machine could not see, and a human did see it.

**Dev also quantified why the mechanical rules had to be abandoned**, which I take as the strongest evidence the 127 were worked rather than generated: **44 of 127 nearest-named candidates are impossible** — the cited line is past that file's EOF, with `SHRAMDEF.SRC` (434 lines) nearest for 38 of them. And of the 42 citations where context identifies the file unambiguously, **only 21 agree with nearest-named — a coin flip exactly where it is checkable.** That is a measurement, not an assertion.

I spot-verified a second: `DOWNLDS.COM` is ~10 lines, so the file-adjacent-looking `:39-42` cannot belong to it; `JOUST.DOC:39-42` is indeed the `UTILITIES` block naming both `.COM` tools. Correct.

**On the two known-ambiguous cases:** TEA deliberately declined to mechanise them and Dev's rationale reads as reasoned context argument, not restated guesswork — `:175` sits inside both `RAMDEF.SRC` and `JOUSTRV4.SRC`; `:5934` cannot be the nearest-named `SYSTEM.SRC` (1038 lines). Both dispositions match what jt1-2's TEA proved by counterexample. Accepted.

**TEA's design restraint deserves recording:** no new machinery (the AC-2 sweep widens by itself once citations take `FILE:LINESPEC` form), and **no faked header-anchoring check** — TEA left "is this the *right* line" to the Reviewer rather than shipping a regex that would pass on anchor-shaped nonsense. Given that two of my last three reviews found exactly such a regex passing vacuously, declining to write one is the correct call.

### Findings

| Severity | Issue | Blocks? |
|---|---|---|
| LOW | **Some source lines now carry two claims** from different stories with different prose — 20 anchors were already claimed by jt1-2/3/4/5, and the AC-2 sweep requires a claim per citation *part*, so JT8 emits one regardless. Dev disclosed this and it is not wrong (one claim is the constant, one the qualification), but a future reader will find duplicates and should meet the explanation with them. Worth a line in the dossier rather than only in an archived session. | No |
| — | **Not verified by this review:** the breadth sample. The rule-checker was outstanding at write-up, so my evidence for the other ~125 resolutions is the rails plus two verified cases plus Dev's own measured falsification of both mechanical rules — strong, but not a sample. After jt1-6, where a late specialist found a real defect in precisely the area I had flagged as uncovered, I am naming this rather than implying coverage. If it returns with a wrong-file resolution I will send it. | — |
| — | **Prose readability (bounded observation):** across the passages I read in this and prior reviews, the qualifications sit inline in backticks and the sentences still read as prose rather than line-number soup. I did not sweep all three files for this, so treat it as a spot impression, not a finding. | — |

**Handoff:** To SM for finish-story.
## Sm Post-Finish Note — hotfix, two rounds (2026-07-20)

Post-merge, the outstanding rule-checker's breadth sample found 7/30 wrong-FILE resolutions (23%) — checker-green, the hole the checker cannot see. Hotfix joust#14 (squash 9ebaac2), two rounds: R1 fixed the 7 (5 → external williams.cpp claims, externals 19→25) + re-audited the rest; the Reviewer's OWN sample then found a defect IN the fix (JT8-113: blank-line anchor + empty verbatim — a THIRD mode, right-file-wrong-line, invisible through the isCitation hole jt1-9 closes) and R2's triage found two more (JT8-069 header-anchor; JT8-095 wrong routine's header). Final tally: 10 of 136 corrected; zero blank anchors/empty verbatims across all 423 (Reviewer re-swept independently). Root cause: the resolver defaulted the file while copying the justifying clause that falsified it. Dev's two flagged-ambiguous cases were both CORRECT — defects lived only where no uncertainty was flagged. Clearance basis, per the Reviewer's own honest caveat: structural sweeps + triage, not a passage-by-passage read of all 136.

<!-- Relocated by SM: the Reviewer wrote this addendum to the recreated .session/ path after archive; moved here 2026-07-20. -->


## Reviewer Addendum (post-verdict, post-merge) — WRONG-FILE RESOLUTIONS FOUND

The outstanding rule-checker returned and ran the breadth sample I named as this review's gap. **It found 7 wrong-file resolutions in 30 sampled — 23% — all checker-green.** jt1-8 is merged (#13) and `done`, so this is a **hotfix item**. I verified the two crispest cases myself; both confirmed.

### Verified by me

**JT8-003** resolved `:1556` → `JOUSTRV4.SRC:1556` = `BHS 49$   BR=YES` — a branch instruction supporting nothing. The surrounding prose is about the MAME driver's raster. **MAME `williams.cpp:1556` = `m_screen->set_raw(MASTER_CLOCK*2/3, 512, 6, 298, 260, 7, 247);`** — the exact `set_raw(...)` call the sentence quotes. Independent cross-check: **`sprint/epic-jt1.yaml` cites `williams.cpp:1556` twice** for precisely this fact (`FRAME_HZ = 8e6/(512*260)`, the 292×240 visible raster). The epic's own text disagrees with the qualification.

**JT8-122** resolved `:1589` → `JOUSTRV4.SRC:1589` = `FDB -$00C0`, a pterodactyl X-velocity entry. **`williams.cpp:1589` = `WILLIAMS_BLITTER_SC1(config, m_blitter, 0xc000, m_maincpu, m_videoram);`** — the "no PROM tag" blitter instantiation the prose describes. `pictures.md` already cites `williams.cpp:1589` for the same fact three lines earlier, so the document now contradicts itself.

### The pattern, from the specialist's sample

Two failure modes, both **false confidence rather than acknowledged uncertainty**:

1. **MAME-driver context abandoned for the JOUSTRV4.SRC default** — 5 instances across brief.md §3 (JT8-002 `:1537`, JT8-003 `:1556`, JT8-004 `:1545-1546`, JT8-005 `:1548-1549`) and pictures.md (JT8-122 `:1589`). The passages explicitly name `williams.cpp`; the resolutions dropped that context.
2. **The default overriding an already-established alternate-file context mid-sentence** — JT8-020 `:617-650` → `JOUSTRV4.SRC` when the same sentence's previous citation is `SYSTEM.SRC:591-593` and `SYSTEM.SRC:617-650` is literally the 9-deep debounce shift register the prose describes; JT8-113 `:1057` → `JOUSTRV4.SRC` when `MESSAGE.SRC:1057` is exactly where the glyph table ends.

**The two cases Dev flagged as ambiguous (`:175`, `:5934`) are both CORRECT** — and the specialist strengthened the `:175` argument by grepping `RAMDEF.SRC` for the six `WAVE OFFSETS` field names and finding zero hits, so that file could not define the struct at all. The defect is concentrated exactly where Dev did *not* flag uncertainty.

### On my own review

I approved this and named the missing breadth sample as the gap. The gap was the whole risk: the rails, the two verified cases and Dev's measured falsification of the mechanical rules all held — and none of them could see a wrong file with a right-looking verbatim, which is the failure mode I myself identified in jt1-2 and then did not sample for. Verifying two resolutions is not a sample of 127. **This is the second consecutive story where a late specialist found a real defect in precisely the area I flagged as uncovered**; naming a gap is not the same as covering it, and I should weight an outstanding specialist's scope as unreviewed rather than as probably-fine.

**Recommended fix:** re-resolve the five MAME-context citations to `williams.cpp` (they become external `.cpp` claims — schema-only, never byte-opened, per the jt1-2 externality rule), re-resolve JT8-020 to `SYSTEM.SRC:617-650` and JT8-113 to `MESSAGE.SRC:1057`, and **re-sample the remaining ~97 unsampled resolutions** for the same two patterns — a 23% rate in the sample means roughly 20-30 more may be wrong. The canary and sweep rails stay green throughout and cannot help here.
