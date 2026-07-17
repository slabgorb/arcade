# Reviewer Gotchas

Common pitfalls encountered during code review.

---

### A rework that hardens input-validation on ONE side of a trust boundary (encode/sanitize) must be checked on the OTHER side (decode) — and its own test may round-trip past the untouched side

**Situation:** Re-reviewing a rework whose commit message says it "strips control chars from
names" / "hardens the untrusted input" at a serialization boundary (a cookie, a query string, a
wire format). Story lb2-8 round-trip 1: `bf1e2f9` added a C0/DEL strip to `sanitizeName`, which
is called ONLY from `encodeRows` (the WRITE side). `rule_checker` was ENABLED and caught it; the
disabled `security`/`test_analyzer` would have been the usual finders.

**Problem:** `decodeRows` — the function that parses the GENUINELY untrusted value (any subdomain
can write the cookie, a player can hand-edit it) — never sanitized the extracted name at all; it
only checked non-emptiness and validated the score. So the write path stripped more than the read
path re-validated, WIDENING an asymmetry the module's own comment claimed to close ("sanitized on
the way in and re-validated on the way back"). The rework's OWN new test built the hostile name
with `save()` → `encodeRows`, so it round-tripped through the side that WAS fixed and never
exercised `decodeRows` against a RAW poisoned cookie. Green proved nothing about the read path.
Verified by code-trace + a throwaway probe seeding `makeCookieJar({ [COOKIE]: 'A=B:9000' })`
directly: name `A=B` (the `=`) survives decode untouched. `;`/`,`/`:` can't traverse the
cookie/split boundaries and browsers reject raw control chars in `document.cookie`, so `=` is the
only realistic survivor; textContent render means no XSS and there's no read→re-encode path, so
it's cosmetic/self-inflicted (graffiti-tier) — NON-BLOCKING, but a real rule-#10 gap + a lying
comment. Confirmed (not dismissed), rated MEDIUM, routed to a follow-up.

**Prevention:** When a fix touches validation/sanitization at a boundary, enumerate BOTH the
encode and decode functions and confirm the fix is symmetric — a strip added to the writer means
nothing if the reader is the untrusted-input parser. And when the rework adds a test for that fix,
check WHICH side it drives: a test that builds its hostile input through the encoder can't prove
the decoder is hardened. Seed the raw wire value directly (bypass the encoder) and assert the
decoded output. Don't let a green round-trip test stand in for read-path coverage.

**Disposition:** the blocking finding was elsewhere (the AC-6 teardown, fixed + mutation-proven);
this read-side asymmetry pre-existed round 0 and is textContent-safe, so it did not re-block —
recorded as a non-blocking Delivery Finding (apply `sanitizeName` inside `decodeRows`, correct the
comment, add a raw-cookie decode test). APPROVED with the follow-up.

---

### A rotation/teardown test that advances N×period where N ≡ 0 (mod cycle length) wraps the index back to its start — the "stopped" assertion passes even if stop() is a NO-OP

**Situation:** Reviewing a cycling/rotating UI component with a teardown AC (a lobby board that
rotates through the registry on a `setInterval`, a carousel, an attract-mode loop) whose test
proves "stop() halts rotation" by advancing fake timers and asserting the active item didn't
move. `test_analyzer` was DISABLED (toggles: `test_analyzer`), so the mutation check was mine.

**Problem:** lb2-8's AC-6 (timer torn down, never fires against a detached DOM) had three tests
and ALL THREE were vacuous. The load-bearing one advanced to index 1, called `stop()`, then
`advanceTimersByTime(INTERVAL * 5)` and asserted still `GAMES[1]`. There are exactly **5 games**,
so five more fires walk `1→2→3→4→0→1` — the index returns to 1 whether or not the timer was
cleared. The assertion holds against a `stop()` that does nothing. The other two only asserted
`not.toThrow()`: `render()` on a *detached-but-alive* node (after `panel.remove()`) doesn't throw,
and `clearInterval` twice vs a no-op twice both don't throw — so neither pins teardown either.
Net: a stated AC with **zero effective coverage**; a future regression to `stop()` (memory leak,
detached-DOM writes) ships green-forever. The implementation was correct — the guard was scenery.
This is the tp1-10 verification-integrity pattern (lang-review #8) wearing a modulo-arithmetic hat.

**Prevention:** For any cycling-teardown test, DON'T trust a "still on the same item" assertion —
mutation-prove it. Revert the real teardown (`stop(){}` no-op), run the file: if the teardown
tests stay green, it's vacuous → REJECT to TEA. The blind spot is specifically `advance = k ×
period × cycleLength` (wraps to origin) and `not.toThrow()` (holds for detached-but-alive nodes).

**Fix (hand to TEA):** assert teardown DIRECTLY, independent of cycle-length arithmetic —
`vi.useFakeTimers()` then after `stop()` expect `vi.getTimerCount()` to be `0`; OR advance a
NON-multiple of the cycle length (e.g. one interval) and assert the item DID change if alive /
did NOT if stopped; OR spy `clearInterval`. `getTimerCount()===0` is the cleanest — it pins the
timer, not a downstream side effect, and survives a change to the game count.
### The radix trap bites on the ONE table operand that exceeds 0x09 — a bare (no-dot) CONTOUR start/end ≥ 0x0A is HEX, and a decimal-reading port silently mis-scopes a whole record

**Situation:** Reviewing a tempest tp1 ROM-transcription story that lifts CONTOUR/WTABLE
tables (ALWELG.MAC) into `rules.ts` as `ContourRecord[]` with `start`/`end` wave bounds.
ALWELG.MAC has NO `.RADIX` directive → default is HEX; a trailing dot means DECIMAL
(proof: `TB=0A`/`TR=0C` at :413-414 are invalid decimal; `AND I,1F`, `.BYTE ...,0E0` are
bare hex; decimal values carry dots, `CMP I,98.`). Almost every table bound is either ≤9
(hex==decimal, harmless) or dotted (`16.`,`32.`,`99.`), so a decimal misread is invisible
99% of the time.

**Problem:** tp1-7's WSPIMX record 6, ROM :633 `.BYTE T1,35,39.,1`, has `35` with NO dot
while `39.` has one. `35` = **0x35 = 53**, so the assembled record is `[start=53,end=39]` —
a backwards, DEAD range: the real arcade gives spiker-max 0 on waves 35-39. The port read
`35` as decimal (`{start:35,end:39}`), returning max 1 — a live divergence. It is a genuine
ROM typo (the parallel WSPIMI min table :625 dots it, `35.`, and its min=1 there makes the
assembled max=0 self-contradictory). Nothing caught it: the value isn't consumed by tp1-7
(only `firstNonZeroWave`=4 is), no test pins :633, and the source-rules suite that could
skips in CI anyway. Reading the port's `start: 35` "looks right" — you re-make the author's
radix mistake the same way. Only an INDEPENDENT `od -c` of the raw byte + decoding the radix
from the equates catches it.

**Prevention:** For every `ContourRecord` `start`/`end` (and any `.BYTE` operand) ≥ 10 that
the port stores as a decimal literal, `od -c` the ROM line and confirm the operand carries a
trailing dot. If it does NOT, it is HEX — the port's decimal transcription is wrong. Cross-
check the twin table (min vs max, WSPIMI/WSPIMX) for the same wave: if one dots it and the
other doesn't, the un-dotted one is the typo. This is the ONE finding an independent auditor
earns its keep on across eight otherwise byte-perfect tables — spawn it (subagents were all
toggled off here) and give it the raw ROM path + "mind the radix", exactly as tp1-35 said.

**Disposition:** REJECT even though the shipped behavior is 100% correct and the record is
descoped to the next story (tp1-8) — a "transcribed verbatim" table (AC-1) with an
unnoticed, undocumented radix misread is not done, and it becomes a live, self-contradictory
(min>max) divergence the moment tp1-8's solver reads the full curve. Fix is one line: match
the assembled ROM (`start:53`/drop the record → waves 35-39 = 0, as every other gap in this
table is handled) OR keep `35` as an EXPLICITLY DOCUMENTED deliberate deviation citing the
:633 typo + the WSPIMI min=1 contradiction. Route red→TEA to pin :633's raw byte.

**Re-review closure (what "fixed" looks like):** the correct fix is `{ start: 53, end: 39 }` —
a DEAD DESCENDING range that reads like a bug (start>end). Do NOT re-flag it; it is the verbatim
transcription of the un-dotted hex byte, and it needs its inline citation comment to survive the
next dev's "helpful" un-fix. Verify the fix TWO ways, both mandatory on a self-authored rework:
(1) MUTATION — revert `53`→`35`, run the suite: the CI-SAFE port test (`tp1-7.contour-tables`,
reads rules.ts) must go RED while the ROM-side source-rules pins stay GREEN (they anchor ROM
truth, not the port — that split is correct, not a gap). (2) INDEPENDENT re-decode — a general
auditor re-derives the radix + record from raw bytes and returns CORRECT. Also confirm the ONLY
consumer is unmoved: `firstNonZeroWave(WSPIMX)`=4 is set by record 1, so a latent record-6 change
cannot shift the spiker intro — full suite stays byte-identical (1377/1377, zero RNG ripple).
APPROVE once both confirm and the min>max contradiction is routed to tp1-8 as a blocking finding.

---

### FIRST review step: fetch and grep origin's LOG for the story id — a sibling checkout may have merged the same story mid-flight

**Situation:** Reviewing any story in this multi-checkout arcade setup (a-1/a-2/a-3 all
run the same combined backlog with pf sessions of their own).

**Problem:** tp1-9 went through setup→RED→GREEN here while a sibling checkout ran the
SAME story and merged it (tempest #113) plus archived it in the orchestrator — and
nothing in the pipeline noticed: the SM merge-gate checks OPEN PRs only (a merged PR
is invisible), preflight reported "3 ahead / 2 behind" as routine drift, and the suite
stayed green because the branch never rebased. ~4 hours of duplicated work reached
review before the race was caught — and only because the reviewer chased WHY the
branch was behind instead of accepting it.

**Prevention:** Before any analysis: `git fetch` BOTH the game repo and the
orchestrator, then `git log HEAD..origin/develop --oneline | grep -i {story-id}` and
`git -C <orchestrator> log HEAD..origin/main --oneline | grep -i {story-id}`. A hit
means SUPERSEDED — stop reviewing code quality and start comparing implementations
(what did upstream cover, what is this branch's unique delta, which API won). Also
watch the prime banner: sprint totals moving between agent activations in one session
(261/486 → 271/496) IS a sibling session landing work.

**Disposition pattern:** upstream (merged) wins the API; the local branch's unique
delta re-scopes onto whatever follow-up story upstream filed for its descoped ACs
(tp1-9 → tp1-31). Never hand-merge two implementations of one story under review
pressure — the epic-11-6 lesson.

---

### A `?raw` source-guard test is silently defeated when a story adds a COMMENT containing the searched token near the guarded call site — re-run the mutation test whenever comments change

**Situation:** Reviewing a tempest/star-wars render or shell change where an AC is pinned by the repo's `?raw` convention — a test that reads `render.ts?raw` and asserts a window around a call site `toMatch(/token/)` (render is undrivable in vitest's node env, so the "is the guard present?" seam is a source-text search).

**Problem:** These guards search a fixed-size window of RAW SOURCE TEXT — comments included. tp1-10's AC-3 test did `renderSrc.slice(iStar - 240, iStar).toMatch(/progress/)` to prove the starfield draw sits behind `if (s.warp.progress >= WARP_STARFIELD_GATE)`. Dev's GREEN added a 3-line explanatory comment right above that call — "...gated on the dive **progress**..." — which lands inside the 240-char window. Now the test passes on the COMMENT, not the code: reverting the real `if` to the pre-story unconditional `drawStarfield(...)` — the exact regression the test exists to catch — STILL PASSES. The guard became scenery, and nothing in preflight/tsc/1200-green shows it. This is the [prior lesson: a guard must be mutation-tested] wearing a `?raw` hat: the window matched a TOKEN in prose, not the CLAIM in code.

**Prevention:** For EVERY `?raw` window/`toMatch` guard whose file the story TOUCHED (code OR comments), run the mutation test yourself: revert the real guard in the source, run the guard's test file, require RED, then restore. Do NOT trust it because it's green — a `?raw` guard is green by default. Especially suspect it when the story added/reworded comments near the call site (ROM-fidelity stories add dense citation comments — high risk of a searched token leaking into the window). The reviewer-test-analyzer subagent does this automatically and flagged it high-confidence; if that subagent is disabled (toggles: `test_analyzer`), YOU must do the reversion by hand.

**Fix (hand back):** the durable fix is to stop grepping raw text — extract the guarded decision into a named boolean (`shouldDrawStarfield(s)`) and unit-test THAT, or strip comments from the searched window before matching. A quick unblock is to reword the comment so the token appears only in the guard code within the window — but that's fragile (the next comment re-breaks it), so prefer the extraction.

**Example (tp1-10):** the render comment "the starfield does not open until the dive is ~29% down the well ... gated on the dive **progress**" defeated `tests/shell/tp1-10.starfield-gate.test.ts`'s `/progress/` window check. Mutation-proven (revert the `if` → still 4/4 green). Rejected → TEA to harden. Note the companion `expect(renderSrc).toMatch(/WARP_STARFIELD_GATE/)` was separately trivial — satisfied by the top-of-file `import` alone, regardless of use.

---

### When the reviewer wrote the code (same session did dev+review), the adversarial subagents are your independence — weight their MUTATION-PROVEN findings over your own "it looks right"

**Situation:** A peloton/relay session where one agent ran GREEN as Dev and then relayed straight into `/pf-reviewer` on the same story (context carried over). You "know" the code is correct because you wrote it.

**Problem:** That knowledge is the trap — the whole point of review is independence, and you have none. The reviewer critical rule "DO NOT RUBBER-STAMP" is hardest to honour against your own work: every finding feels like a nitpick because you remember why you wrote it that way. tp1-10 shipped a functionally-correct implementation (all 6 ROM findings delivered, 1200 green, purity + citation gate intact, re-seats sound) — and it would have been easy to APPROVE. The independent subagents, running MUTATION tests, proved a tautological AC guard and two untested new behaviours that "it looks right" completely missed.

**Prevention:** Spawn the subagents and treat their mutation-proven findings as ground truth over your own recollection. A mutation proof (revert the guard/line → suite still green) is not a matter of opinion — it is evidence the behaviour is unverified, and per "PROJECT RULES ARE NOT SUGGESTIONS" (lang-review #8, test quality) you cannot dismiss it. Reject on verification-integrity even when the CODE is correct: a correct implementation with a lying guard is not done. Cost of a rework cycle << cost of a scenery guard reaching green-forever main.

**Example (tp1-10):** self-authored GREEN, relayed to review; test-analyzer + rule-checker (independent) found the tautological starfield guard, two mutation-proven coverage gaps, and 5 dead RED-scaffolding casts. Verdict: REJECTED to TEA despite pristine implementation — the right call.

---

### Re-reviewing a UNIFICATION merge — the signature bug is a surviving DUPLICATE PATH, not a missing one; grep the dropped symbol to zero and mutation-prove the surviving path is SINGLE

**Situation:** Reviewing a merge that reconciled TWO independently-built implementations of the SAME feature (tp1-10's warp fly-in vs tp1-13's warp space-phase — same post-descent beat, opposite wave++ orderings, built in parallel checkouts). Dev unified them to one model and dropped the redundant half.

**Problem:** Normal review hunts for a MISSING guard. A union-merge's unique failure mode is the opposite — a guard/path/counter that should have been DELETED but survived, so BOTH implementations run. Here the live risk was a double wave++ (advance once at the new `beginFlyIn` AND again at a surviving `advanceLevel`) and a double-pay of the skill-step bonus. Vitest can stay green on this: if the old path is only reachable via a fixture the re-seated suite no longer drives, the duplicate is invisible to the suite even though it fires in real play. "1253/1253 green" does NOT prove the dropped half is gone.

**Prevention:** For every symbol the merge claims to have removed (function, field, constant, event-emit, ordering), prove it to ZERO in the working tree, not just "not in the diff": `grep -rn "advanceLevel\|inSpace\|spaceFrames\|WARP_SPACE_FRAMES" src/` must return only comments. Then mutation-prove the SURVIVING path is single: revert the ONE remaining site (delete `startBonus = 0`; change the single wave++) and require a test RED — if the suite stays green, a second live path is silently compensating. Also verify the two merged exhaustive tables (event census + dispatch switch) each still carry a compile-time `never` guard, so a lost arm breaks the BUILD, not just a runtime count.

**Also (concurrent mutation-testing collides in the LIVE tree):** the test-analyzer subagent mutation-tests by editing real source and restoring per-cycle. During review you (or a harness file-change notification) can catch a TRANSIENT mutated state — e.g. audio-dispatch.ts momentarily missing a `stopLoop` — that looks like a real regression or an "external edit to preserve." It is neither. Do NOT act on it, do NOT preserve it. Wait for ALL subagents to finish, confirm `git status --short` is empty (they restore), then run YOUR OWN mutation checks serially. See the dev-side lesson `dont-verify-while-subagents-mutate`.

**Example (tp1-10 round-trip 2):** APPROVED. Confirmed `advanceLevel`/`inSpace`/`spaceFrames`/`WARP_SPACE_FRAMES` all grepped to zero (dead removed), bonus paid in exactly one place (mutation-proven single-pay), 20-event union `never`-guarded in both dispatcher + census. All 6 unified guards RED-on-revert (test-analyzer + my own reversions). One LOW nit: a re-seated test's docstring oversold its LOCAL double-pay coverage (the regression is caught by a sibling test) — non-blocking, recorded as a follow-up.

---

### On a tempest tp1 remediation story, AUDIT THE FINDINGS DIFF for laundering, and expect ONE `ours` line to close findings in MULTIPLE pair files

**Situation:** Reviewing any tp1 story that fixes audit findings — it will edit `glyphs.ts`/`render.ts`
lines the findings cite as `ours`, mark them `remediated_by`, and run `reanchor-citations.mjs`. The
citation gate (`citations.test.ts`) will be GREEN by the time you review (Dev made it so).

**Problem:** A green citation gate does NOT prove the remediation was honest. `remediated_by` freezes a
finding's `ours` quote as history and STOPS the gate re-opening it — so a Dev could smuggle a real
divergence past review by stamping `remediated_by` on a finding they only re-SPELLED (the dev-side
`two-honest-exits` trap), or by editing a finding's `verbatim`/`claim`/`reasoning` PROSE to match the
new code (laundering the audit's own record). The gate can't see either; only the DIFF can.

**Prevention/Fix:** Run `git diff origin/develop...HEAD -- docs/audit/findings/` and confirm every
changed line is EITHER a `"line": N` reanchor OR a `+  "remediated_by": "<story>"` addition — grep the
+/- lines for `verbatim|claim|title|reasoning|"source"` and require EMPTY. Any prose edit is a red flag:
the ROM `source` side and the audit narrative must never change (the 1981 source doesn't change). Then,
for each `remediated_by` stamp, confirm the code actually REMOVED that finding's divergence (not
re-spelled it) — cheapest is to mutation-revert the fixed line and require a unit test RED. And expect
the fix to close findings OUTSIDE the story's named set: tp1-35's one enemy-bolt line was the `ours` of
BOTH V-009 (pair-2) AND DA-018 (pair-3, frame cadence); Dev correctly stamped both. `grep -rl` the
fixed symbol across ALL pair files to be sure no cited finding was left pointing at a deleted line
(that would fail the gate on the NEXT story, not this one).

**Also — when ALL pf reviewer subagents are toggled off (`workflow.reviewer_subagents`) AND the review
is self-authored (Dev+Reviewer one session):** you have ZERO independence. Do not hand-check your own
transcription — you'll read it the same wrong way twice. Spawn an INDEPENDENT general-purpose auditor
to re-decode the ROM coordinate-by-coordinate (mind the radix: ALVROM/ALDISP trailing `.`=decimal else
hex) and mutation-test every load-bearing guard, then re-run one mutation yourself serially after it
leaves the tree clean. tp1-35's auditor caught nothing (transcription was faithful, all 5 guards bit) —
but that NULL result is only trustworthy because it came from independent eyes, not from the author's.

---

### A stroke-structure fix to a point-set geometry pin has THREE mutation axes — merge, split, reorder — and the secondary assertion needs its own liveness proof

**Situation:** Re-reviewing a fix that adds structure pins (a stroke/run COUNT plus a locality
check) on top of a sorted-point-set shape comparison — tp1-19 round 3, the TEMLIT logo's
`toHaveLength(11)` + per-stroke letter-window containment, added after a merged-polyline
mutation (M7) sailed through the point-set pin.

**Problem (axes):** the natural probe set is bigger than the mutation that prompted the fix.
MERGE (bridge two letters) is killed by the count; SPLIT-to-compensate (merge one place, split
another to keep the count) preserves the count and is only killed if the locality check fires
on the bridge and/or the split's duplicated point trips the shape pin; REORDER (permute a run's
interior vertices, multiset preserved) slips ALL of point-set + count + windows — a scrambled
letterform ships green. Judge the reorder residual by REACHABILITY: `flat()` is a refactor's
natural reach, interior permutation is not, and run-direction REVERSAL (the one plausible order
change) draws the identical picture and SHOULD pass. The one-assertion cure that subsumes all
three axes is comparing the SEGMENT multiset (consecutive point pairs, canonical endpoints).

**Problem (liveness):** when a test has a primary count assertion followed by a secondary check,
every natural mutation dies on the count FIRST — so the secondary check can be dead code and
you cannot tell from green/red alone. Construct a count-PRESERVING mutation (M10: merge E→S,
split M) and require the failure message to come from the secondary assertion itself.

**Also (self-authored rounds):** with reviewer subagents toggled off and Dev+Reviewer in one
session, an "expected split" derived from the test file's own transcription is an echo, not
evidence — spawn an independent auditor on the PRIMARY source (mind CRLF + `.RADIX 16`) to
re-derive the pinned number. tp1-19: ALVROM.MAC:1301-1351 independently returned 11 =
[2,2,1,1,2,1,2], matching both the test and the prior round's trace.

---

### A ROM servo ported onto coordinates the ORIGINAL re-projected each frame will drive the target out of a FIXED weapon's reach — and no unit test can see it, because the gun tests hand-build their target and the servo tests never fire

**Situation:** Reviewing a ROM-fidelity story that ports an authentic movement machine (rb4-6: Red
Baron's PLNDEL window-servo — the ROM genuinely reverses AWAY from centre at P.ILIM, `EOR I,0FF`,
:2794-2796) into a clone's existing entity coordinates. Every constant is byte-exact, the suite is
1051/1051 green, `tsc` clean, and the guards mutation-bite. Nothing looks wrong.

**Problem:** The ROM's servo runs on DISPLAY coordinates that TRACK the player's view (PLSTAT+8 is
";X SCREEN POSITION", :3157) — the plane weaves away from wherever the pilot is LOOKING, and the pilot
chases it. Our `enemy.x/y` are STATIC world coords the camera merely looks at (`main.ts:187-197`
builds `projView` for RENDER only; nothing re-projects the enemy), and the gun collides in that same
static space against a shell pinned at `y: 0` for its entire flight (`guns.ts:321`; `guns.step` only
advances `z`), reaching at most `32*sqrt(2)=45.25`. So a servo that pushes |y| away from centre into
`[P.ILIM, P.OLIM]` pushes the plane out of the ONLY region the gun can ever reach. Measured (200
planes/level, isolated worktrees, HEAD vs origin/develop): baseline in-reach for its whole life at
every level; at HEAD, GMLEVL 2/3/4 → avg **1.0** frames in reach (the spawn frame, before step() has
run) and **0/200** planes reachable afterwards. `PLNLVL` hits GMLEVL 2 at **5 kills** → the game
SOFT-LOCKS: no 6th kill is possible. Not a crash, not a red test — the game just quietly stops meaning
anything. This is the `rom-normalization-vs-displacement` trap one level up: Dev correctly refused to
re-apply HORIZN because "our y is already display space" — but our display space is FIXED, not
player-relative, so the deeper premise (that our coords are the ROM's display coords) is only half true.

**Why 1051 green proves nothing:** the two halves of the engagement are each tested in a world where
the other doesn't exist. `engagement.test.ts:47` HAND-BUILDS its target at `y: 0` (so the gun is tested
against a fixture that can't move), and every servo test drives `step()` without ever firing. The seam
is untested, so the regression is invisible. The ONE artifact that did notice — the cockpit determinism
fingerprint moving 52→53 because "one more shell lives out its flight instead of ending early on a
plane that used to sit still in Y" — is the bug FILING ITSELF, and it was re-pinned as benign. A
fingerprint that moves because a shell stopped connecting is a hittability regression wearing a
determinism hat.

**Prevention:** When a story changes WHERE an entity is allowed to be, do not stop at "the constants are
byte-exact." Find the consumer that must REACH that entity (gun, hitbox, cursor, click target) and ask
whether the producer's new range still intersects the consumer's fixed one. Then PROVE it empirically —
`git worktree add --detach <scratch> HEAD` + a second at `origin/develop`, symlink `node_modules`, and
probe both: "what fraction of entities are ever reachable, and for how many frames of their life?"
Report frames-in-reach PER LIFE, not per run — a story that also shortens lifetimes (fly-past) confounds
any per-run hit count, and "EVER reachable" is confounded the other way by the spawn frame (I over-claimed
"never reachable" on a first probe that skipped frame 0; the honest number was 1.0 frames = spawn only).
The worktree is also how you dodge the concurrent-mutation problem — test-analyzer mutates the LIVE tree,
and preflight self-retracted its own counts here after catching a transient `DRINZ`-removed state.

**Disposition:** REJECTED (CRITICAL). Do NOT accept "widen WINDOW_Y" — that hides it. The seam is a user
decision: project enemy x/y through the player's attitude before the gun tests them (what the ROM does),
or bound the servo to the reachable window. Route red→TEA with a reachability guard: spawn → stepWave →
guns.step must land a hit at EVERY GMLEVL. That test is the missing regression seam, and it is what
should have existed before the servo was touched.

---

### "No baked artifact to arbitrate" is a claim, not a fact — grep the assembler's own `.MACRO` block before accepting a descope justified by an unverifiable scale

**Situation:** A ROM-fidelity story descopes a table transcription because the source uses a macro whose
scale can't be confirmed. rb4-6: TEA and Dev BOTH asserted (suite header `enemy-machine.test.ts:40` and
`enemy.ts:122`) that P.ODLX/P.IDLX/P.IIDL's `.2WORD`/`.3WORD` macros "carry an unverified ×2/×3 scale"
with "NO baked artifact to arbitrate a transcription — pinning a byte here would risk the exact 'read the
table, ship a fabricated constant' trap the epic exists to kill."

**Problem:** The claim was FALSE, and falsifying it took one grep. The macros are DEFINED at
RBARON.MAC:20-27 — in the same md5-verified file both agents cite, 47 lines above the `.RADIX 16` at :74
that they DID read: `.MACRO .3WORD .A,.B,.C,.D / .WORD 3*.A,3*.B,3*.C,3*.D` and `.MACRO .2WORD ... /
.WORD 2*.A,...`. Corroborated independently: the author wrote each table's 5th entry LONGHAND (`.WORD
80*2` :2949, `2C*3` :2953, `40*3` :2956) precisely because the macro takes only 4 args — the same
multiplier, spelled out. `.LEVLS=5` (:504) plus `LDA I,.LEVLS*2` / `.LEVLS*4` (:2791/:2797) prove the
three tables are contiguous and indexed zone×GMLEVL, and P.WCHK (:2806-2864) servos the delta TOWARD them
("ACCELERATE SO DELTA=MAX", :2832) — not one symmetric cap. Tables recover with ZERO ambiguity:
P.ODLX=[288,280,264,248,256], P.IDLX=[24,60,84,108,132], P.IIDL=[0,48,72,120,192]. So the story shipped an
INVENTED `weaveSpeedCap(ilim)=sqrt(ACCEL·ilim)` to avoid the risk of inventing something — inverting the
epic's purpose while wearing its vocabulary. AC-1 literally names P.IIDL ("accelerates toward the P.IIDL
target by level"); it survives only as prose in a comment.

**Prevention:** A descope's RATIONALE is reviewable evidence, not context. When a story says a ROM value
is unknowable, spend 60 seconds disproving it before accepting: `grep -n "\.MACRO" <source>` (assemblers
define their macros in the file), check whether a sibling/longhand entry re-states the same arithmetic, and
look for the equate that fixes the table stride (`.LEVLS`-style). A deviation resting on a false premise is
not a deviation — it is an unlogged gap, and it must be FLAGGED, not stamped ACCEPTED, even when TEA
pre-authorised it and Dev honestly labelled the stand-in as "inferred". Honest labelling of a constant does
not make the reason for needing it true. rule-checker initially marked this COMPLIANT ("honestly labelled
inferred, plausible reason") and upgraded to a violation only when handed the ROM evidence — so ASK the
subagent to verify the premise, don't just ask it to check the label.

**Disposition:** FLAGGED the deviation, HIGH finding, REJECTED. Fix = transcribe the three tables with
citations, servo toward the zone target, delete the sqrt, and correct the false claim in BOTH the suite
header and the source comment (the lie is duplicated, so a one-file fix leaves it half-alive).

---

### A regression guard that REIMPLEMENTS its consumer cannot guard it — mutate the named production function and require the guard RED; and a hypot/circumscribed-circle "reach" OVERSTATES a rotated-box hit-test

**Situation:** Re-reviewing rb4-6 round 2 — the rework whose whole deliverable was "the soft-lock
guard": AC-R3 in `display-space.test.ts`, a chase rig asserting frames-in-reach > 10 at every
GMLEVL. The suite's own header says "the guard whose absence let round 1 ship. Never delete this."
Dev's mutation table claimed "collides ignores the eye → 3 RED".

**Problem:** AC-R3 never CALLS the production hit-test. It judges reach as
`Math.hypot(now.x, now.y) <= 32*Math.SQRT2` — its own copy of the window geometry — so reverting
`guns.collides` to ignore its eye (round 1's EXACT defect, the one the guard names) leaves all six
AC-R3 tests green; only AC-R2's two pointwise tests fire (the "3 RED" was 2). Worse, the circle
CIRCUMSCRIBES the real rotated 32×32 box, so the guard's margin systematically overstates the
game's: re-measured through the real `collides` (same rig, boresight shell at the plane's depth),
GMLEVL 4's margin was 10.8, not the reported 11.6 — a future WINDOW_X/Y change moves the real
margin while the guard applauds. Same file, same disease in miniature: the "ramp cannot strand the
player" test asserted `PLNLVL[5] === 2` on its own LOCAL literal while `scoring.ts` EXPORTS the
real table — mutating the real export left all 11 tests green. A literal compared to itself is not
a test.

**Prevention:** For any guard whose story names the production function it protects, run the
guard-vs-defect mutation YOURSELF: re-introduce the named defect in the named function and require
the named guard RED — "some sibling went red" doesn't count (here ace-wiring caught one mutation by
crashing, which proves nothing about the guard). Grep the guard's body for the production symbol:
if the guard never imports/calls it, it is a parallel reimplementation and its green is about
itself. For geometry guards, check the metric: circle-vs-box (or any convex-hull stand-in)
overstates reach; run the measurement THROUGH the production predicate before trusting a thin
margin. For any table/constant assertion in a test, check the operand's provenance: a re-typed
local literal pins nothing — assert the EXPORT.

**Disposition:** REJECTED (HIGH) even though production was proven correct — the Reviewer's own
probe through the real `collides` cleared every level (597.3/112.5/24.1/20.2/10.8 vs bar 10), so
the rework is a guard rewrite, not a code fix. Route red→TEA; expect the honest GMLEVL 4 margin
≈ 10.8 and do NOT let anyone re-tune the bar to manufacture slack.

---

### Approving a round the SAME session authored: the fix's own comment is a CLAIM to verify (check #13 covers prose), and a multi-round session file needs its superseded `## Reviewer Assessment` headings retitled before the approval gate reads it

**Situation:** rb4-6 round 3 — a relay session that ran Reviewer→TEA→Dev→Reviewer, so the review
covered tests and fixes written by itself minutes earlier. The delta was tiny (3 test files + 3
source one-liners) and every author-claimed mutation was already "proven".

**Problem (two):** (1) The NaN-safe clamp fix was correct for what it named — but its COMMENT
claimed to be "the total answer for a degenerate hand-built fixture", and the independent
test-analyzer found NaN DELTAS flow unclamped (self-perpetuating: NaN fails every servo comparison)
into the render-facing `bank`. The code fix matched its spec; the comment overclaimed past it — a
fix-introduced small lie that only an agent who didn't write it caught. The author's own re-read
"verified" the comment because the author remembered what it meant, not what it said. (2) The
`gates/approval` gate hunts the session file for "an explicit APPROVED verdict" under
`## Reviewer Assessment` — and after two rejection rounds the file carried TWO earlier assessments
whose verdict lines read REJECTED. A haiku gate reading the first match would fail (or worse,
waver on) a legitimate approval.

**Prevention:** (1) On any self-authored round, treat every comment the fix ADDED as a falsifiable
claim and hand it to the independent agent with the code — "re-scan the fix diff" (lang-review #13)
includes the prose. Weight the subagent's mutations as the approval's evidence; the author's own
mutation table is testimony, not proof. (2) Before running the approval exit on a multi-round
session file, retitle superseded assessments so exactly ONE heading matches `## Reviewer
Assessment` — e.g. `## Round-2 Reviewer Assessment (REJECTED — superseded by round 3)` — keeping
history intact while making the current verdict unambiguous to a fuzzy gate. Same logic as the
"first ## Reviewer Assessment wins the tag scan" lesson: the gate reads headings, not narrative.

**Disposition:** APPROVED with the comment overclaim + delta-NaN gap as a non-blocking Delivery
Finding (production-unreachable, same class the prior round rated LOW with "optional one-liner").
Rejecting a third round over an adjacent latent edge the spec never named is goalpost-moving; the
right cost is a routed finding, not another cycle.
---

### A fix round convened to DELETE false claims can net-ADD them — re-run every row of its own verification table, and know that a behaviour-PRESERVING revert is uncatchable by construction

**Situation:** Re-reviewing round 2 of a story you rejected for shipping a true fix beside false
comments (sw7-16: the surface gun). Dev/TEA return with a mutation table (M1..M6′) proving every
guard now bites, and the round-1 blocking findings genuinely fixed.

**Problem:** The fix round is the *highest-risk* place for new false claims, because the author is
now writing prose ABOUT their own corrections and nobody re-audits prose. sw7-16 round 2 deleted 3
false claims and added 7: a guard-file header asserting "Round 2 makes `shipPoint` exhaustive over
Phase" (TEA wrote the RED expecting it, Dev deliberately declined, nobody reconciled — so the file
asserts a source property that does not hold); "JSDoc trimmed rather than grown" (measured 22→28,
+27%); "crosshairOn is GONE / One copy" (the trench copy survives and that file doesn't import the
shared helper); and round 1's finding 3 RE-BROKEN — a false pointer replaced by another false
pointer ("`tie-peel-away`… the suite that actually drives these paths (`spawnTie`, `moveEnemy`)" —
it drives `moveEnemy` only; retargeting `spawnTie` alone left 1056/1056 green).

**THE STRUCTURAL TRAP — a behaviour-preserving revert cannot be caught by any value assertion.**
Dev claimed "re-inlining the literal reddens 5". `render.ts` called `surfaceShip(altitude)` and the
test asserted `eyeOf(s)` == `surfaceShip(s.altitude)` — BOTH SIDES CALL THE SAME FUNCTION. Reverting
render.ts to the inline `[0, state.altitude, 0]` returns the IDENTICAL value, so 45/45 stayed green.
"Did you call my function or retype the same literal?" is a question about SOURCE STRUCTURE; a value
test can only ever catch DRIFT. Any "reddens N" claim about such a revert is false *by construction* —
you can refute it from the armchair, but run it anyway (10 s) because the author will not believe
the armchair. Corollary: the RED that drove such a story is often a COLLECTION error from the missing
export, not a behavioural failure — "13 reds → green" proves the export exists, nothing more.

**Prevention:** (1) Treat the fix round's verification table as UNTRUSTED — re-run every row you
would cite. (2) For each round-1 finding, ask "is it FIXED, or re-broken in a new form?" — a comment
pointing at the wrong test is often "fixed" with a comment pointing at a *nearly* right test; mutate
EACH caller the comment names, separately, not the helper as a whole (mutating the helper reddens via
the guarded caller and hides the unguarded one). (3) Grep the fix round's own prose for falsifiable
claims (`trimmed`, `GONE`, `One copy`, `exhaustive`, `every guard`, `reddens N`) and falsify each.
(4) When TEA's test header describes a SOURCE change, diff it against what Dev actually shipped —
a declined "recommended" finding silently strands the header.

**Also — CHECK THE HOUSE STYLE BEFORE FLAGGING PROSE AS ROT.** An independent auditor flagged
"the header says this file won't compile but it's 13/13 green" as a Moderate staleness defect. It is
a repo-wide CONVENTION here (`events.test.ts:20`, `aiming.test.ts:19`, `surface-hazard.test.ts:70`
all preserve present-tense RED narrative in merged code). Dismissed with evidence. Auditors reason
from first principles and don't know the house style — grep for the pattern before confirming.

**Also — when 7/9 pf subagents are toggled off AND the review is self-authored (one session ran
TEA+Dev+Reviewer):** spawn independent auditors for the disabled domains and say so in the table
("Skipped/disabled — covered by independent auditor X"), never claim the disabled row as coverage.
On sw7-16 the four independent auditors produced EVERY sharpest finding (the `spawnTie` mutation
proof, the JSDoc measurement, the NaN inversion). Constrain them READ-ONLY and run all mutations
yourself, serially, after they return and `git status` is clean — round 1's test-analyzer left a live
mutation on disk. One auditor independently chose to mutation-test in a disposable copy with
symlinked `node_modules` — that is the pattern to ask for when you want a mutation from an agent.

**Watch your own perl/sed mutations actually APPLY.** My first M1 silently didn't match; the suite
stayed 32/32 and would have "proven" a guard inert. `git diff --stat` after every mutation, BEFORE
trusting the run — an unapplied mutation looks exactly like a passing guard.

**Disposition:** REJECTED again, on the cluster — specifically round-1 finding 3 unfixed + a
provably false row in the verification table. Fix is ~15 lines of prose + optionally 2 lines of code.
Be explicit that the engineering is right and the round is cheap: a second rejection reads as
ceremony unless you show the mutations. Also record where the author corrected YOU (sw7-16: my
round-1 "88 > COCKPIT_HIT_RADIUS (80)" compared the wrong sphere — 80 is the *player's* hit sphere;
the bolt only needs `TURRET_HIT_RADIUS`=200, so no kill was ever lost). Stamp that ACCEPTED loudly —
a review that only ever finds fault in one direction is not being read as adversarial, just hostile.

---

### A multi-aspect finding whose `ours` cites only the FIXED aspect gets stamped `remediated_by` honestly-looking — audit the CLAIM for aspects with no citation anchor

**Situation:** Reviewing a tp1 remediation story that stamps `remediated_by` on findings whose
cited `ours` line the diff genuinely fixed (tp1-20: V-018's quote was the cycling-colour HUD line,
and the colours WERE fixed).

**Problem:** The citation only anchors ONE aspect of the finding. V-018's claim carries three:
cycling colours (fixed), invented captions (fixed), and the SCORES-template LAYOUT — hi-score under
P1's score, level below, a GREEN SCHIIN initials field — which the story deliberately left alone.
The stamp freezes the WHOLE finding, so the un-cited layout divergence vanishes from the audit
permanently. Everything mechanical is green (quote resolves, reanchor 0 lost, citations pass): the
laundering-audit grep for prose edits also passes, because nothing was edited — the overclaim is in
what the stamp SAYS, not in any diff line. Only reading the claim against the stamp catches it.

**Prevention:** For every `remediated_by` added, read the finding's FULL claim and enumerate its
aspects; for each aspect ask "did this diff remove it?" Any live aspect → the stamp overclaims:
require the half-remediated split (W-030/tp1-24) — drop the stamp, re-point `ours` onto living
evidence of the un-fixed aspect, file a curator note for the now-historical fixed half. The session
record (TEA had logged the layout gap as a follow-up) does NOT substitute: the audit JSON is the
machine-checked record, and it must not overclaim even when the sprint files tell the truth.

