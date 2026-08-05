# Story cp7-5 Context

## Title
The spider is too fast because the OPTNS difficulty DIP is declared and never passed

## Metadata
- **Story ID:** cp7-5
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Centipede playtest followups — four shell defects on a byte-correct core, one unwired DIP, and the pause the cabinet never had

## Problem
THE PLAYTEST REPORT WAS "the spider is much too fast", AND THE PLAYER IS RIGHT WHILE THE VELOCITY BYTE IS INNOCENT. Both cheap explanations were tested against the vendored source at filing and BOTH ARE REFUTED. Do not re-run them.

REFUTED (1) — THE RADIX TRAP DOES NOT APPLY HERE. BUGOFF picks the speed at CENTI4.MAC:254-264 with "LDY I,2" (:255) and "LDY I,1" (:263). CENTI4.MAC inherits .RADIX 16, so bare literals are hex — but hex 2 and hex 1 ARE decimal 2 and 1. There is no misreading available. SPIDER_DV_FAST = 2 and SPIDER_DV_SLOW = 1 (src/core/spider.ts:47-48) are byte-correct and OFF LIMITS.

REFUTED (2) — THERE IS NO MISSING FRAME GATE. BUGMV's only FRAME test is "LDA FRAME / AND I,03 / BNE 20$ ;SLOW DOWN FACE CHANGES" (CENTI4.MAC:303-305), and its branch target 20$ at :314 falls straight through to the move at 40$ (:342-356), which is UNCONDITIONAL. The mainloop blocks on VBLANK ("1$: LSR SYNC / BCC 1$ ;WAIT FOR IRQ TO GET TO VBLANK", :17-18) and issues JSR BUGMV at :33 exactly once per frame; SYNC is incremented once per frame inside VBLANK by the IRQ (CENIR4.MAC:264-269) and the watchdog at CENIR4.MAC:281-283 confirms one pass per frame is the design point. Our chain matches it exactly: stepSpider is called from precisely one site (src/core/sim.ts:513), stepSim from one live site (src/main.ts:195 inside pumpFrame), and advanceFixedSteps (src/shared/loop.ts:40-53) is a plain accumulator running one step per FRAME_DT = 1/(15750/263). One core step per video frame, 1 ROM unit to 1 screen pixel (layout.ts:92-116). Every other spider constant was checked against its cited line at filing and all match.

THE ACTUAL DEFECT IS AN UNWIRED OPTION, AND IT IS A DEAD FEATURE OF A SHAPE THIS PROJECT HAS RECORDED TWICE BEFORE: a correct, unit-tested pure function whose input field EVERY producer hard-codes, so only one branch ever runs in play. SpiderOptions.easy (src/core/spider.ts:151-157) is declared, tested, and NEVER PASSED BY ANYTHING. All four createSpider paths default it — src/core/sim.ts:308 (createSpider(rng, 0)), src/core/sim.ts:894 (createSpider(state.rng, score)), and spider.ts:383 / :505 which forward an opts that is always empty because SpiderStepCtx.easy (spider.ts:279) is never set by sim.ts:513-518. spider.ts:55-59 ALREADY ADMITS "The DIP itself is not modelled anywhere in the sim yet" — it was written down and then left.

SO THE CLONE PERMANENTLY RUNS THE HARD OPTNS BRANCH, and that is what the player felt, in two compounding ways. (a) THE FAST SPIDER ARRIVES FIVE TIMES TOO EARLY: CENTI4.MAC:258-262 reads "LDA OPTNS / AND I,40 ;GET DIFFICULTY SWITCH / ORA I,10 ;EITHER 100(HARD) OR 5000 (EASY) / CMP X,SCORE1-1 / BCC 10$ ;IF SCORE < 1000,USE SLOW SPIDER", so the 2px spider begins at 1,100 points on hard and 5,100 on easy. (b) IT ZIG-ZAGS HALF AS MUCH AND THEREFORE COVERS MORE GROUND: the per-turn vertical reversal is masked by (OPTNS & 40) | 20 (CENTI4.MAC:332-336), which on hard is 0x20 alone — a 1-in-2 no-change instead of 1-in-4. A spider that reaches full speed at a fifth of the score and turns half as often is "much too fast" without a single wrong constant.

THE STORY IS TO MODEL THE DIP, NOT TO SLOW ANYTHING DOWN. Thread easy from a sim-level option through src/core/sim.ts:308 and :894 and through sim.ts:513-518 into SpiderStepCtx, so both the score threshold and the reversal mask read it. Then RULE ON THE DEFAULT and write the reasoning down, because that ruling is the actual product decision in this story: a factory cabinet ships with a DIP position, and which one we default to is what the player will experience. Do not bury it in a constant.

DO NOT CHANGE src/core/spider.ts:47-48. A Dev who halves the velocity to make the symptom go away has laundered a byte-verified constant AND will break an invariant that is load-bearing elsewhere — tests/spider.test.ts:512-551 walks 1200 frames asserting |dh| === 2 never changes magnitude and that h stays ODD, and that odd parity is what makes the h === 0xFF exit comparison an equality rather than a threshold. Halving the speed breaks the exit condition, not just the test.

OTHER TESTS THAT WILL REACT: tests/spider.test.ts:57-58 restates both velocity constants with their :255 and :263 citations; :285-307 is the fast/slow score-gate table AND ALREADY EXERCISES easy: true AT 5100 — the pure function's easy branch is already covered, which is exactly why nobody noticed nothing passes it. That is the tell to look for elsewhere in this game, and if you find another such field, file it. tests/timebase.test.ts:34-39, tests/main-loop.test.ts:28-31 and :65-68, and tests/frame-order.test.ts pin the timing chain and must all stay green untouched — if one reddens, you have changed the pacing rather than the difficulty.

ALSO IN SCOPE BECAUSE IT IS THE SAME DIP AND THE SAME REGISTER, and leaving it half-modelled invites a second story: CENTI4.MAC:380-399 lowers the spider's ceiling from 0x60 by 8 for every 20,000 points past the 60K BCD datum, capped at 5 steps (:391 "LDA I,5"). Confirm whether our port models it and say so either way rather than leaving it unstated.

## PRODUCT RULING (settled at setup by the user)

**DEFAULT DIP POSITION: EASY**

The playtest complaint was "the spider is much too fast." The clone currently runs the HARD branch permanently because SpiderOptions.easy is declared but never passed by callers. The user has ruled that the modelled DIP defaults to EASY, deferring the fast spider to 5,100 pts per CENTI4.MAC:258-262 and applying the 1-in-4 reversal mask 0x60 per CENTI4.MAC:332-336.

**Reasoning:** This resolves the complaint by choosing the gentler experience. The EASY default may not match the real Atari factory-shipped DIP position (unmeasured), but it addresses the user complaint that the spider is "much too fast." Dev must wire `easy` to default true and write this reasoning down in the code (not buried in a bare constant), per AC4.

## Technical Approach

Thread `easy` from a sim-level option through two sites:

1. **src/core/sim.ts:308** (createSpider in newSim) and **src/core/sim.ts:894** (createSpider in updateSpider) — pass the option when creating the spider
2. **src/core/sim.ts:513-518** (stepSpider call site) — thread `easy` into SpiderStepCtx
3. **src/core/spider.ts:279** (SpiderStepCtx) — read `easy` and pass it to the two consumers:
   - The score threshold gate (line 55-59 comment, CENTI4.MAC:258-262): compare against 5100 (EASY) instead of 1100 (HARD)
   - The reversal mask (CENTI4.MAC:332-336): use (easy ? 0x60 : 0x20) for the 1-in-4 vs 1-in-2 vertical reversal

The RED test must observe PLAY with the same seed under two DIP positions and verify different spider behaviour end-to-end. The existing pure-function coverage at tests/spider.test.ts:285-307 is what made this defect invisible and does NOT satisfy AC2 — PLAY-level observation is required.

**Do NOT change velocity constants.** src/core/spider.ts:47-48 (SPIDER_DV_FAST and SPIDER_DV_SLOW) are byte-correct and off-limits. Halving the speed would break the h === 0xFF exit equality condition, not just a test.

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- SpiderOptions.easy reaches stepSpider in live play: the DIP is threaded from a sim-level option through src/core/sim.ts:308, :894 and :513-518 into SpiderStepCtx, and BOTH consumers read it — the score threshold (CENTI4.MAC:258-262) and the reversal mask (CENTI4.MAC:332-336).
- A test proves the wiring by observing PLAY, not the pure function: the same seed under the two DIP positions produces different spider behaviour end to end. The existing easy: true coverage at tests/spider.test.ts:285-307 is exactly what made this invisible and does not satisfy this criterion.
- SPIDER_DV_FAST and SPIDER_DV_SLOW (src/core/spider.ts:47-48) are UNCHANGED, and tests/spider.test.ts:512-551 stays green including the odd-h parity that makes the h === 0xFF exit an equality — the story states that halving the velocity would break the exit condition, not merely a test.
- The default DIP position is RULED ON explicitly with the reasoning written down as a product decision, not buried in a constant — it determines what every player experiences.
- The comment at src/core/spider.ts:55-59 ('The DIP itself is not modelled anywhere in the sim yet') is now false and is corrected.
- The 60K spider-ceiling scaling (CENTI4.MAC:380-399, 8 per 20,000 past the datum, capped at 5 by :391) is confirmed present or absent in our port and the answer is stated either way rather than left unexamined.
- The timing chain is untouched: tests/timebase.test.ts:34-39, tests/main-loop.test.ts:28-31 and :65-68, and tests/frame-order.test.ts stay green — a red one means pacing was changed instead of difficulty.
- The story is played and the spider reported on in prose, since the whole finding originated as a feel complaint that no constant could have revealed.

---
_Generated by `pf context create story cp7-5` from the sprint YAML._
