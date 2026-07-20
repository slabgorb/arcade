---
story_id: td1-8
jira_key: td1-8
epic: td1
workflow: tdd
---
# Story td1-8: just serve swallows a failed launch — bare wait returns 0, fleet looks healthy with one game silently missing

## Story Details
- **ID:** td1-8
- **Jira Key:** td1-8
- **Workflow:** tdd
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Repos:** .
- **Branch:** none — orchestrator is trunk-based, commits to main

## Story Description

Found by the td1-1 reviewer-silent-failure-hunter (2026-07-20), empirically reproduced. PRE-EXISTING — not introduced by td1-1 — but directly undermines the guarantee td1-1 was meant to make trustworthy, which is why it belongs to this epic.

### THE DEFECT (justfile:139-164, the 'serve' recipe):
1. Line 141's 'set -euo pipefail' does NOT catch a failure inside a backgrounded subshell (lines 156-163).
2. Lines 147-154 print all eight 'ready' URLs UNCONDITIONALLY, BEFORE any server has attempted to bind — the banner claims success for a repo whose npm run dev is about to EADDRINUSE.
3. Line 164's bare 'wait' returns 0 regardless of which jobs died. The recipe's exit code carries no health information; a caller checking $? sees success with a dead server.

### REPRODUCTION (synthetic, exact shape of the recipe):
```bash
set -euo pipefail
( sleep 0.2; exit 7 ) &
( sleep 5 ) &
wait
echo reached
```
-> 'reached' prints, outer exit code 0. The failed job is invisible.

### CONSEQUENCE:
Because the other seven dev servers are long-running, 'wait' blocks forever with 7 up and 1 dead. The operator's only signal is that repo's vite stack trace interleaved with seven repos' concurrent startup chatter. No summary line, no non-zero exit.

### WHY IT MATTERS HERE:
td1-1 fixed vite so a port collision fails LOUDLY at the process level — verified at the socket layer (EADDRINUSE, exit 1). This wrapper then re-attenuates that signal back toward silence. 'The fleet looks healthy with one game silently missing' is the SAME failure shape as the wrong-checkout trap CLAUDE.md warns about: you believe you are serving your own tree, and you are not. Fixing vite while leaving 'just serve' deaf gets much less than the fix is worth.

### SUGGESTED FIX (from the specialist):
Track each backgrounded PID and wait individually (or 'wait -n' in a loop), exiting non-zero with a NAMED summary line (e.g. 'FAILED: red-baron did not start') when any job dies. Also consider moving the ready-URL banner to AFTER a successful bind, so it stops asserting readiness it has not observed.

### RELATED — OPEN SCOPE DECISION:
td1-1 also surfaced that vite.config.ts is excluded from type-checking everywhere in the fleet (every tsconfig include is [src,tests]; no ESLint; CI runs only build+test). Proven by injecting 'host: 5150' (a number where string|boolean is required) into lobby/vite.config.ts — 'npm run build' passed cleanly. **Decide whether to fold a scoped config type-check into this story or file it separately, and RECORD the decision.**

## Acceptance Criteria
- The `just serve` recipe detects and reports a failed server launch by name (e.g. 'FAILED: red-baron did not start').
- The recipe's exit code is non-zero when any backgrounded dev server fails to start.
- The orchestrator test suite tests/extract-audio.test.mjs confirms the fix (td1-4 left tests there; check what it left behind).
- The ready-URL banner only prints AFTER a successful bind (or equivalently, it is replaced with a summary banner reporting which servers started and which failed).
- **OPEN DECISION RECORDED:** Scope question on vite.config.ts type-checking — is it in-scope for this story or filed separately?

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-20T14:36:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T14:36:00Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): AC3 names the wrong file. It says "the orchestrator test suite tests/extract-audio.test.mjs confirms the fix (td1-4 left tests there)". `tests/extract-audio.test.mjs` is the ROM-audio auditor's suite and has no relationship to `just serve`; td1-4 left nothing there that bears on the launcher. The td1-8 tests live in `tests/serve-launcher.test.mjs`. Affects the AC text in `sprint/epic-td1.yaml` (should name the serve-launcher suite, or just say "the orchestrator suite"). *Found by TEA during test design.*
- **Improvement** (non-blocking): a dev server that RUNS but never BINDS (hung, not dead) is a third failure shape neither the story nor these tests make fatal. The RED suite pins that such a server never gets a ready URL printed and never appears in `ready` — but deliberately leaves its exit-code semantics unspecified, because "how long is too long to bind" is a judgement call that would put a flaky timeout inside a 2-point story. Worth a follow-up: a bind deadline after which the launcher declares the server hung and fails. Affects `scripts/serve.mjs` (a `readyTimeoutMs` and a hung-server verdict). *Found by TEA during test design.*
- **Gap** (non-blocking): **`just test-all` and `just build-all` mask every failure except the last game's — and `just ci` depends on both.** justfile:28-33 are single-line `@for g in {{games}}; do echo "==> $g"; (cd {{root}}/$g && npm test); done` recipes. A `for` loop's exit status is the status of its LAST iteration, and there is no `set -e` (these are plain recipe lines, not `#!/usr/bin/env bash` bodies), so an earlier game's failure is discarded. Empirically confirmed:
  ```
  sh -c 'for g in a b c; do echo "==> $g"; (if [ "$g" = "b" ]; then exit 3; fi); done'; echo $?
    ==> a / ==> b / ==> c   ->  exit 0     # middle failure MASKED
  sh -c 'for g in a b c; do echo "==> $g"; (if [ "$g" = "c" ]; then exit 3; fi); done'; echo $?
    ->  exit 3                             # only the LAST game propagates
  ```
  `games := "tempest star-wars asteroids battlezone red-baron centipede joust"`, so only **joust**'s failure is visible; the other six are silently swallowed. `ci: test-orchestrator test-all build-all` then prints "CI passed!" with six of seven games red. This is the SAME failure shape as td1-8 (the fleet looks healthy; the evidence is buried in the scroll-back) in a different recipe, and it is arguably worse — it can green a release gate. Out of scope for td1-8, which is scoped to `serve`. Affects `justfile` `test-all` / `build-all` / `ci` (accumulate failures and exit non-zero naming each failed game). **Recommend filing as a td1 story.** *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Test file location:** AC3 said the fix is confirmed in `tests/extract-audio.test.mjs`. Tests are in the new `tests/serve-launcher.test.mjs` instead. Reason: extract-audio's suite is the ROM-audio auditor and shares nothing with the launcher; putting serve tests there would bury them. Filed as a Delivery Finding above.
- **The fix moves out of the justfile:** the story's SUGGESTED FIX is bash-local ("track each backgrounded PID and wait individually, or `wait -n` in a loop"). The tests instead pin the launch/supervise logic into a new `scripts/serve.mjs` that the recipe calls. Reason: this epic's recurring failure is assertions that cannot fail (td1-4's finding; td1-5 exists to sweep them out of joust), and a bash recipe that backgrounds eight `npm run dev` jobs cannot be tested for whether it *notices one dying* without launching the real fleet. A node module can be handed synthetic servers that exit 7 after 200ms. The recipe already delegates its preflight to `node scripts/deps-doctor.mjs`, so this is the established idiom, not an invention. Dev is free to satisfy the behaviour differently, but a text-match on the justfile will not pass this suite.
- **Drain window before teardown:** the multiple-dead-jobs test spaces two deaths 100ms apart and requires BOTH be named. This implies the launcher cannot kill survivors the instant the first job dies. Not stated in the story; added because port collisions arrive in a burst (a sibling checkout holding three ports fails three servers within milliseconds) and an operator told about one of them fixes one port, re-runs, and meets the next.

### Dev (implementation)
- **Child stdio is piped and re-prefixed, not inherited (`scripts/serve.mjs` `pipeWithPrefix`).** `spawn()`'s stdio default is `'pipe'` with nothing draining it, which silently discarded every dev server's stdout/stderr — including the exact vite stack trace the story is about. Chose piping + per-line `[name] ` prefixing over `stdio: 'inherit'`: the story's actual complaint is attribution ("that repo's vite stack trace interleaved with seven repos' concurrent startup chatter"), not volume, so prefixing is strictly better than restoring the old unattributed interleaving.
- **Known, accepted cost: children lose color and TTY-aware formatting.** `stdio:'inherit'` shares the parent's fd, so if `just serve` runs at a real terminal, a backgrounded `npm run dev` (the old recipe) had a real TTY on its stdout and vite rendered in color. An OS pipe (`stdio:'pipe'`) is never a TTY regardless of what the launcher's own stdout is, so `isatty()` is false in every child now, and vite/picocolors will drop color and switch to non-TTY output. This is inherent to the piping approach (no pty allocation, which would be its own dependency for a 2-point story), not a bug — recording it here per the reviewer's request so it's a known tradeoff, not a surprise found later.
- **Confirmed NOT a regression: vite's interactive shortcuts (`r`/`q`/`h`) were already dead before this story.** Checked empirically (`lsof` on a backgrounded job inside a non-interactive bash script): bash itself redirects an async job's stdin to `/dev/null` when job control is off, which is exactly how a `just` recipe body executes. So the pre-td1-8 recipe's eight backgrounded jobs already had no usable stdin — `stdio: ['ignore', 'pipe', 'pipe']` is behaviourally identical on this axis, not a new loss.
- **Backpressure on the launcher's own stdout/stderr writes is unchecked (no `drain` handling on `target.write()`'s return value).** Considered, not fixed: the only proven risk in this area (TEA's 2MB-into-an-undrained-pipe probe) is about the *child's* pipe filling and hanging the child, which is handled — we always drain child stdout/stderr via the `'data'` listener. Backpressure on the *launcher's* own stdout would only matter if `just serve`'s output is itself redirected to a slow consumer (e.g. piped into something that stalls), which is not this story's usage pattern (an operator's terminal, or Ctrl-C). Scoped out as disproportionate to a 2-point bugfix; flagging rather than silently skipping.

## OPEN SCOPE DECISION — vite.config.ts type-checking

**DECISION: FILE SEPARATELY. Not folded into td1-8.**

The gap is real and confirmed: every subrepo's tsconfig `include` is `[src, tests]`, there
is no ESLint, and CI runs build+test only — so `vite.config.ts` is type-checked by nothing.
td1-1 proved it by injecting `host: 5150` (a number where `string | boolean` is required)
into `lobby/vite.config.ts`; `npm run build` passed clean.

**Rationale:**

1. **Different blast radius, different git workflow.** td1-8 is orchestrator-only and
   trunk-based — commit straight to `main`, no branch, no PR. The config type-check is
   fleet-wide: eight subrepos, each with its own remote, its own `develop`, its own PR,
   its own release. Folding them makes one 2-point story span nine repos under two
   different branching rules.
2. **Nothing is shared.** No common code, no common test, no common file. The launcher fix
   and the config gap touch disjoint surfaces; bundling them buys no efficiency and makes
   the story's diff impossible to review as one thing.
3. **Different failure modes, different verification.** td1-8 is a runtime lie — the
   launcher reports health it has not observed. The config gap is a build-time blind spot —
   a type error in build config is never surfaced. td1-8 is verified by the behavioural
   suite written here; the config gap needs its own RED, per repo, by the td1-1 method
   (inject a deliberate type error, prove the build now fails) — and that method has to be
   re-proved eight times, because a tsconfig change that works for lobby may not for a game
   with a different `include` shape.
4. **It is bigger than td1-8 is.** td1-8 is 2 points and already carries a real behavioural
   fix plus a new script. The config work is at minimum a tsconfig/`tsc --noEmit` change in
   eight repos plus a CI gate; that is its own story, plausibly its own multi-point one.

**⚠️ This is the SECOND time this epic has surfaced "the config file nobody checks"** —
td1-7 was the first. That recurrence is the strongest argument *for* a story of its own
rather than a footnote inside a launcher bugfix: a structural gap that keeps reappearing
as a rider on unrelated stories never gets systematically closed. It should be tracked as
the fleet-wide gap it is, with its own ACs, so the third occurrence has somewhere to land.

**Recommend SM file it as a new td1 story** (fleet-wide: bring `vite.config.ts` under
type-checking, verified per repo by the td1-1 injection method), citing td1-7 and td1-8 as
the two prior sightings.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a

**Test Files:**
- `tests/serve-launcher.test.mjs` — 16 tests pinning the launcher's behaviour under a failed launch

**Tests Written:** 16 tests covering 4 of the 5 ACs (AC5 is the scope decision recorded above; AC3 redirected — see Design Deviations)
**Status:** RED (failing — ready for Dev)

**Suite totals:** 269 tests — 253 pass (the exact SM baseline, unchanged), 16 fail (all td1-8).
No pre-existing test broke.

**Anti-vacuity control (this epic's recurring defect):** the RED was validated in both
directions before handoff, with two throwaway probes placed at `scripts/serve.mjs`, run,
and deleted.
- A straw-man reproducing today's exact defect (banner printed up front, every job
  backgrounded, always return 0) **reds 13 of 16**. The 3 it passes are the ones that
  should pass — the file exists, and its `SERVERS` table matches the justfile and CLAUDE.md.
- A reference launcher **greens all 13 non-justfile tests**; only the 3 justfile-wiring
  tests stay red, correctly, because the probe did not touch the justfile.
So the suite is neither vacuous nor an impossible contract. A text-match on the justfile
cannot pass it.

**Handoff:** To Dev for implementation

## TEA Assessment — VERIFY phase (re-aim of collided tests)

Dev's implementation landed GREEN on all 16 td1-8 tests but collided with 6 pre-existing
assertions across 5 files owned by 4 other stories. The collision was a strict logical
contradiction: td1-8 asserts the `serve` recipe body contains no `npm run dev`; the
bootstrap suites asserted it contains `(cd {{root}}/red-baron && npm run dev) &`. No
recipe body satisfies both.

**All 6 pinned IMPLEMENTATION (literal bash lines), not CONTRACT.** Every contract they
existed to protect is still true under the new design, so all 6 were RE-AIMED at the new
evidence — none deleted, none weakened. Each carries a comment naming td1-8 as the re-aimer
and preserving its original story's intent, so a later reader cannot mistake this for a
guard being quietly dropped.

The irony is worth stating: these 6 were themselves implementation-coupled text-matches —
the exact disease td1-5 exists to sweep out of joust. Two of them (centipede, joust) were
also matching against the WHOLE justfile rather than the `serve` recipe body, so they would
have passed had the launch line appeared in any unrelated recipe. Re-aiming is a genuine
improvement, not damage control.

| # | Test | Asserted BEFORE | Asserts NOW |
|---|------|-----------------|-------------|
| 1 | red-baron-bootstrap: `serve` launches red-baron | `/\(cd \{\{root\}\}\/red-baron && npm run dev\) &/` on recipe body | `jobsFor()` yields red-baron with command `npm`, args `run dev`, cwd `<root>/red-baron`, port 5277 — plus the recipe invoking serve.mjs |
| 2 | battlezone-bootstrap: `serve` launches battlezone | `/battlezone/` anywhere in recipe body | same spawn-spec form as red-baron (this one was the weak "bare mention" its sibling warned about) |
| 3 | centipede-bootstrap: `serve` launches centipede | `{{root}}/centipede && npm run dev` + a `centipede…localhost:5278` echo, both against the whole justfile | spawn spec + pinned port 5278, scoped to the fleet the supervisor launches |
| 4 | joust-bootstrap: `serve` launches joust | as centipede, port 5279 | as centipede, port 5279 |
| 5 | canonical-serve AC2: launches lobby + games | `/lobby/i` and `/tempest\|games/i` on recipe body | fleet includes `lobby` AND every game in the justfile `games` list — strictly stronger |
| 6 | deps-doctor: preflight before launching | `indexOf('deps-doctor.mjs') < search(/npm run dev/)` | `indexOf('deps-doctor.mjs') < indexOf('serve.mjs')` — same property, new launch anchor |

**MUTATION EVIDENCE — 26 probes, all RED.** Every re-aimed assertion was proved to fail when
the contract it guards is actually broken. Mutations applied to `scripts/serve.mjs` /
`justfile`, run, then reverted (implementation restored byte-identical, sha verified).

- drop red-baron / battlezone / centipede / joust from `SERVERS` -> that game's test RED
- drop `lobby` from `SERVERS` -> canonical-serve AC2 RED
- drop `asteroids` (a game with no bootstrap test here) -> canonical-serve AC2 RED
- change centipede 5278 / joust 5279 / red-baron 5277 to 9999 -> that game's port half RED
- `cwd: join(root, name)` -> `cwd: root` -> all four games' cwd half RED
- `command: 'npm'` -> `'true'` (listed but not launched) -> LAUNCHED half RED
- recipe stops calling serve.mjs (SERVERS becomes a dead table) -> all 5 delegation halves
  RED, plus deps-doctor RED
- deps-doctor moved AFTER the launch -> deps-doctor RED
- recipe re-grows an inlined `(cd .../lobby && npm run dev) &` -> td1-8's own guard RED
- recipe re-grows the unconditional ready banner -> td1-8's banner guard RED

**Suite: 269 tests, 269 pass, 0 fail.** Only test files edited; `justfile` and
`scripts/serve.mjs` are Dev's, untouched (sha-verified against a pre-mutation backup).

### Decision on td1-8's own `doesNotMatch(/npm run dev/)`

**KEPT, and tightened — not kept by inertia.** It is the one property the behavioural tests
cannot reach: they prove `scripts/serve.mjs` supervises correctly, but say nothing about the
justfile ALSO launching servers behind its back. Two launchers, one untested, is exactly the
state td1-8 exists to end, and only a text guard on the recipe can detect it.

Tightened in one way: it now strips `#` comments first. The recipe legitimately *describes*
what it used to do, and prose mentioning `npm run dev` should not red a guard aimed at
executable text — the same false-positive class `extract-audio.test.mjs`'s `stripComments()`
exists to avoid. That was the only real overreach.

Deliberately kept BROAD (any `npm run dev` in executable recipe text) rather than narrowed to
the old spelling `(cd {{root}}/X && npm run dev) &`: the anti-goal is "the recipe launches a
dev server itself", not "the recipe uses that particular syntax". A narrower pattern would
wave through `cd x; npm run dev &` or a for-loop rewrite — the same defect in different
clothes. Mutation-proved (M14).

### ⚠️ BLOCKING FINDING — the new design does NOT preserve child output

Not one of the 6 (all text matches; none covered this) and not caught by my RED suite either
— **that gap is mine**: I specified what the launcher must PRINT via an injected `log` sink,
and never specified that it must not SWALLOW its children's output.

`scripts/serve.mjs:115` is `spawn(job.command, job.args, { cwd: job.cwd })`. With no `stdio`
option, node defaults to `'pipe'`, and nothing ever reads those pipes — **every dev server's
stdout and stderr is discarded.** Measured, not inferred: a child printing
`VITE-STYLE-OUTPUT-FROM-CHILD` produced 0 occurrences in the launcher's combined output; the
only line the operator sees is `[launcher] FAILED: demo did not start (exit code 1)`.

Why this is blocking, not cosmetic: it partially defeats td1-8's own purpose. The story's
complaint was that the operator's ONLY signal was "that repo's vite stack trace interleaved
with seven repos' chatter". The fix was supposed to ADD a clear named summary on top of that
signal — instead it REPLACED the diagnosis with silence. `just serve` now says
"FAILED: red-baron did not start (exit code 1)" and gives no way to learn why. In normal
operation the loss is worse: no "VITE ready in 340ms", no HMR messages, no compile errors,
for any of the eight servers. The old recipe inherited the terminal and showed all of it.

I checked one hypothesis and **disproved it, so it is not part of this finding**: undrained
pipes do NOT deadlock the children at realistic volumes — a child wrote 2MB and exited
normally in 485ms. The defect is output loss, not a hang.

**Recommend Dev fix before this is committed** (`stdio: 'inherit'`, or pipe-and-prefix each
line with its server name, which would be better than the old interleaved chatter). I have
not added the failing test, because the coordinator set a 269/0 target and owns the commit —
but the test is one line of intent: *supervise must forward a child's stdout to the
operator*, and it should land with the fix. **Green here does not mean correct.**

## TEA Assessment — RED (child output forwarding)

Closing the gap in my own RED suite, found at verify. **272 tests: 269 pass, 3 fail.**
The 3 failures are the new ones; no pre-existing test broke. `scripts/serve.mjs` and
`justfile` are Dev's, byte-identical (sha-verified) — Dev owns the fix.

**New tests** (`tests/serve-launcher.test.mjs`):
1. a dead server's STDOUT reaches the operator
2. a dead server's STDERR reaches the operator — asserted SEPARATELY, because a fix
   forwarding only stdout would pass (1) while still destroying the vite stack trace,
   which is the one piece of output the story text actually names
3. a HEALTHY server's output reaches the operator too — guards a fix that buffers child
   output and flushes it only on death, which would still lose every HMR message and
   compile error in a normal session

Real red (identical shape for all three) — by assertion at ~537ms, not by timeout:
```
AssertionError: the launcher discarded the server's stdout. Naming a dead server while
destroying its output leaves the operator no way to diagnose it. Captured:
""
```
`Captured: ""` — the launcher's own `log` is silenced inside the test driver, so anything
captured could only have come from a child. Nothing did.

**MECHANISM DELIBERATELY NOT PINNED.** Both candidate fixes had to pass, or the test would
make Dev's design decision for him — the implementation-coupling disease this story just
spent a phase curing on six other tests. Observation is at the FD level: a subprocess runs
`supervise` and its stdout/stderr are read. Under `stdio: 'inherit'` the child writes
straight to those fds; under pipe-and-prefix the launcher writes to them. Either way the
text lands in the same place, and neither spawn options nor the `log` sink are inspected.

Probed all three states, implementation restored pristine after each:

| Implementation | STDOUT test | STDERR test | HEALTHY test |
|---|---|---|---|
| (a) `stdio: 'inherit'` | green | green | green |
| (b) pipe + prefix each line with server name | green | green | green |
| (c) **trap:** forwards stdout only | green | **RED** | **RED** |
| pristine (today) | RED | RED | RED |

Row (c) is the point of splitting stdout and stderr into separate tests.

**Attribution (which server said what) is deliberately NOT asserted.** (b) satisfies it and
(a) does not; pinning it would force (b) through the back door. Worth stating as a
recommendation rather than a test: (b) leaves `just serve` better than it was before td1-8,
because it answers the story's actual grievance — "interleaved with seven repos' concurrent
startup chatter" is a complaint about missing ATTRIBUTION, not about volume. (a) merely
restores the interleaving the story was complaining about.

**DO NOT "FIX" A HANG — there isn't one.** The tempting adjacent theory is that undrained
pipes fill and deadlock the children. Tested and DISPROVED: a child wrote 2MB to an unread
pipe and exited normally in 485ms; a drained control passed 2,050,173 bytes. The defect is
output loss, full stop. Recorded here so nobody spends a phase on a deadlock that does not
exist.

## TEA Assessment — RED (recipe-layer exit code; Reviewer round)

Reviewer REJECTED on two HIGH findings, both mine to answer. Both confirmed and both now
have RED tests. **274 tests: 272 pass, 2 fail.** The 2 failures are the new recipe-layer
tests; no pre-existing test broke. `scripts/serve.mjs` and `justfile` are Dev's,
byte-identical (sha-verified) — Dev owns the fix.

### Finding 1 — the core defect survives at the recipe layer (CONFIRMED, not contradicted)

The coordinator asked me to contradict this with proof if I could. I can't — I reproduced
it independently, isolated in its own process group so `trap 'kill 0'` could not reach my
shell:
```
stub exits 0 (healthy):        {"status":null,"signal":"SIGTERM"}
stub exits 1 (a server died):  {"status":null,"signal":"SIGTERM"}
```
Identical. `justfile`'s `trap 'kill 0' EXIT` SIGTERMs the recipe's own shell, so the recipe
returns 143 (128+15) regardless of what `scripts/serve.mjs` computed. td1-8 was filed
because "the recipe's exit code carries no health information"; the launcher went from
ALWAYS 0 to ALWAYS 143. The script computes the right answer and the trap throws it away one
line later. **Real defect. Real fix required from Dev.**

### Finding 2 — a test gap, mine, in two parts (both closed)

**Part 1 — tightened the CLI assertion** (`tests/serve-launcher.test.mjs`, the AC2 CLI
test). `notEqual(status, 0)` passes at 143 exactly as at 1 — it cannot tell "correctly
non-zero because a server died" from "signal-killed, code discarded". Added:
`Number.isInteger(status) && status > 0 && status < 128` (a genuine exit code, not the
128+N a shell reports for a signal-kill, not null). Stays GREEN today because that test
drives `node scripts/serve.mjs` directly, which genuinely exits 1 — but it can no longer be
satisfied by a signal-death.

**Part 2 — the recipe seam was untested at all.** Every prior test drove
`node scripts/serve.mjs` directly; nothing exercised the justfile, which is exactly where
the bug lived. Two new tests now drive the REAL recipe text:
- `the serve recipe exits 0 when the launcher shut down healthy`
- `the serve recipe exit code DISTINGUISHES a dead server from a healthy fleet`

Real red (both by assertion — 105ms / 197ms, not timeout):
```
AssertionError: a healthy shutdown must be a genuine exit, not a signal-kill — the recipe's
`trap 'kill 0' EXIT` SIGTERMs its own shell (got signal=SIGTERM, status=null)
  'SIGTERM' !== null

AssertionError: a dead server and a healthy fleet produced the SAME recipe result
({"status":null,"signal":"SIGTERM"}); the recipe's exit code carries no health information —
exactly the defect td1-8 was filed to fix
```

### How the recipe is tested without binding the eight pinned ports (HARD CONSTRAINT)

The test extracts the REAL recipe body via `recipeBody(read('justfile'), 'serve')` — the
same helper the other suites use, never a hand-pasted copy (which would be the vacuity this
epic keeps killing) — renders just's `{{root}}`/`{{subrepos}}` against a throwaway fixture,
and points `{{root}}` at it. The fixture's `scripts/serve.mjs` is a one-line STUB
(`process.exit(code)`): no vite, no npm, no ports. The recipe runs its real
preflight+trap+delegation shape; only the launcher's computed code is faked. The recipe is
spawned `detached: true` so its `kill 0` reaches only its own process group, never the test
runner. **Verified no pinned port (5270/5273-5279) was held after the run.** The real
`just serve` was never invoked.

### Mechanism NOT pinned — proved satisfiable under BOTH reviewer-named fixes

The trap is load-bearing (it reaps the vite grandchildren `serve.mjs`'s killAll doesn't
reach), so it cannot just be deleted. The tests assert only the observable contract (exit
code distinguishes healthy from dead; a signal-kill is not a health signal) and were proved
green under both candidate shapes, justfile restored byte-identical after each:

| Recipe shape | exits-0-healthy | distinguishes | wiring guards |
|---|---|---|---|
| (a) keep trap during launch, disarm it, `exit $rc` | green | green | green |
| (b) no trap in recipe; teardown moved into script (detached children) | green | green | green |
| pristine (Dev's current, always-143) | **RED** | **RED** | green |

### The transferable lesson of td1-8 (naming it, as asked)

This is the THIRD time this story was saved by refusing to treat a green suite as done, and
twice now the miss was the same shape: **I validated the component and not the wiring.**
- RED phase: 16 tests on `scripts/serve.mjs`, zero on the justfile that calls it → the recipe
  layer shipped the original defect intact.
- Verify phase: tests on what the launcher PRINTS via the `log` sink, none on what it does to
  its children's real fds → total stdout/stderr loss.
- This phase: same root, one layer out — the recipe seam, the thing the operator actually
  runs, was untested, and that is precisely where the bug lived.
The rule going forward: **test the seam the user invokes, not just the unit under it.** A
component test and a wiring test are different tests; passing the first says nothing about
the second.
