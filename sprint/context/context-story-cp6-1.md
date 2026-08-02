# Story cp6-1 Context

## Title
The POKEY dossier and the fourteen-cues-over-six-tables ruling — what centipede's ROM actually sounds like

## Description

Establish ground truth BEFORE anything bakes a byte, because the expensive failure mode here is a baker that invents authenticity nobody asked for. Read CENTI4.MAC:2322-2465 completely — the SOUNDS routine and its six tables — and record it in plugins/centipede/docs/rom-study/ as claims the citation gate can re-open, in the shape cp1 established for this game. Cite the VENDORED tree only: reference/atari-source/centipede/revision.v4/CENTI4.MAC (2686 lines, verified present at setup). The ~/Projects/centipede-source copy is off by one from line 44 (CRLF plus form-feeds) and every line number in this epic was taken against the vendored file.

THE RULING THIS STORY EXISTS FOR: shell/audio.ts declares FOURTEEN cues (measured at setup: fire, mushroom, segmentKill, spiderKill, fleaKill, scorpionKill, headBottom, playerDeath, waveClear, bonusLife, march, spiderLoop, fleaLoop, scorpionLoop — audio.ts:44-62), and the ROM offers SIX tables plus one derived variant (the player explosion is FREQ0/CONT0 with ADC I,02 at :2444-2449, not a table of its own). Go cue by cue through SOUNDS and record, for each of the fourteen, either the table and channel it transcribes or that it is an INVENTION with no ROM source. Expect several kill cues to collapse onto CHAN0's single ';EXPLOSION SOUND' table — that collapse is the machine's behaviour and recording it is the deliverable, not a problem to design around. Do NOT edit the manifest in this story: a cue whose name survives while its sound is shared is fine and is exactly what the CHANNELS map's voice-stealing already models; a cue that turns out to be a pure invention is a note for cp6-2 to bake honestly, not a deletion to smuggle in here.

ALSO RECORD, because the baker needs them and guessing them is how tones come out wrong: the per-cue LENGTH, which is the ROM's own countdown window (the CHANn seed decremented once per SOUNDS pass) over centipede's frame rate FRAME_HZ = 15750/263, which EXISTS as a named constant at plugins/centipede/src/shell/timebase.ts:20 — consume it, do not re-derive it — the same way joust derived its FRAME_DURATIONS from STMR; the FRAME gating, which is not uniform; and which cues LOOP rather than one-shot, which the tables say out loud (CONT1 ';MUST BE REPEATED' :2458, CONT3 ';WELL REPEAT UNTIL TURNED OFF' :2462, and CHAN6's ';CONTINOUS LOOP' :2388 block reseeding 'LDY I,20.' :2389).

THREE CITATION CORRECTIONS, MEASURED AT SETUP AGAINST THE VENDORED FILE — the earlier spelling of this story was wrong in all three and one of them was actively dangerous. USE THESE, and note that a story whose deliverable is citations having had three of its own rot is the argument for the gate, not against it:
(1) THE FRAME GATE IS :2338-2340, NOT :2339-2340. The three quoted instructions are 'LDA FRAME' :2338, 'LSR' :2339, 'BCC 30$ ;EVERY OTHER FRAME CHANGE BUG SOUND' :2340 — the old range named three instructions but spanned two lines and cut off the LDA.
(2) THE OUT-OF-SCOPE ALARM IS :2360-2371, NOT :2358-2368, AND THE OLD RANGE ATE AN IN-SCOPE CONSTANT. The 15-second alarm actually runs 'LDA SCORE2+1' :2360 through 'BNE 44$ ;ALWAYS' :2371. The old range was wrong at BOTH ends: it ended at 2368 while the ';ALTERNATE TONE BETWEEN OFF AND ON' comment it quotes is at :2369, and — the dangerous half — it began at :2358, so it declared 'LDA I,64' :2358 / 'STA AUDC2' :2359 out of scope. Those two lines are NOT the alarm: they are the SHOT cue's AUDC2 control/volume byte, FREQ2's companion, and cp6-2's baker needs them. Do not skip them.
(3) ATTRACT SILENCE IS :2329-2336, NOT :2329-2338. SOUNDS opens at :2329 and the attract path RTSes at :2336; :2337 is blank and :2338 is '5$: LDA FRAME', which is the start of the IN-SCOPE frame gate above.
Confirmed unchanged at setup and safe to rely on: the channel-allocation header :2325-2328; FREQ0/CONT0 :2455-2456 ';EXPLOSION SOUND'; FREQ1/CONT1 :2457-2458; FREQ2 :2459 ';SHOT SOUND'; FREQ3/CONT3 :2461-2462; FREQ4 :2463-2464; FREQ6 :2465; the absence of any FREQ5; the player-explosion gate 'LDA FRAME / AND I,3' :2438-2439; and the bonus gate 'AND I,07' :2376, which setup confirmed is the ONLY 'AND I,07' anywhere in :2322-2465.

WHERE THE DOSSIER GOES, AND WHY THIS IS A RULING AND NOT A PREFERENCE — READ BEFORE WRITING A LINE. centipede's citation gate has TWO halves and only one of them would watch a new doc. (a) The BYTE half re-opens every claim in docs/rom-study/claims/*.json — loadClaims() globs the whole directory (tests/audit/citations.test.ts:432-438), so a new 16-sound.json IS byte-verified against the vendored file and AC-2 is achievable through it. (b) The COVERAGE half — 'every primary-source citation has a covering claim' — is HARDCODED to brief.md + glossary.md (tests/audit/citations.test.ts:441-442 and :458-461). A new sound.md dropped into docs/rom-study/ would be swept by NOTHING, and its prose citations would rot exactly as this story's own three just did. Worse, the extractor only matches BACKTICK-WRAPPED `FILE:LINESPEC` (the regex at :420), so even in a swept file an unbackticked or bare-colon citation is invisible. THE RULING: follow joust, which already solved this — plugins/joust/tests/audit/citations.test.ts:603 replaced the hardcoded pair with a DOSSIER_FILES list ['brief.md', 'subsystems.md', 'pictures.md'] and sweeps three. Generalise centipede's sweep to the same list shape and put this story's sound doc IN it. That is measured precedent from the sibling game this epic explicitly models, not taste. SCOPE FENCE: centipede already carries subsystems.md, pictures.md and open-questions.md that its own sweep does not scan — enrolling THOSE is a separate finding, filed rather than fixed here. This story adds its OWN doc to the list and stops.

RADIX DISCIPLINE IS NOT OPTIONAL: .RADIX 16 is inherited from CENDE4, so bare literals are hex and only a trailing period means decimal — 'LDY I,20.' :2389 is decimal 20 while 'LDA I,14' :2346 (the CHAN3 spider reset) is decimal 20 as well, by a different route, and that pair is exactly the kind of coincidence that hides a systematic misread. Every constant recorded here carries a radix-cited comment.

## Metadata
- **Epic ID:** cp6
- **Story ID:** cp6-1
- **Repo:** arcade
- **Points:** 3
- **Workflow:** tdd

## Acceptance Criteria

1. All fourteen SOUNDS entries are accounted for individually — each names the ROM table and channel it transcribes, or is recorded explicitly as an invention with no source, and no cue is silently presented as authentic.
2. Every transcribed constant carries a radix-cited comment and a claims entry the live citation gate re-opens against the vendored CENTI4.MAC, so a wrong line number fails rather than reads plausibly.
3. Per-cue length and loop-versus-one-shot are derived from the ROM's own countdown window and table comments, not chosen by ear, and the derivation is written down so cp6-2 consumes a number rather than a judgement.
4. The non-uniform frame gating is recorded per cue (the spider's every-other-frame LSR, the bonus AND 07, the player explosion AND 03) rather than flattened into one cadence.
5. The manifest and the CHANNELS map are UNCHANGED by this story — it rules, it does not edit — and any cue the ruling finds unsourced is handed to cp6-2 as a named decision rather than quietly deleted.
6. centipede is still silent when this story closes, and the story says so plainly rather than implying progress toward sound.
7. The sound dossier is ENROLLED in the coverage sweep, not merely written beside it: centipede's hardcoded brief.md+glossary.md pair (tests/audit/citations.test.ts:441-442, :458-461) is generalised to a DOSSIER_FILES list in joust's shape (plugins/joust/tests/audit/citations.test.ts:603) with this story's doc in it, and the enrollment is mutation-proved — deleting a citation's claim must redden the sweep, or the doc is unwatched prose that reads gated. Pre-existing unswept docs (subsystems.md, pictures.md, open-questions.md) are FILED as a follow-up, not fixed here.

---
_Generated by `pf context create story cp6-1` from the sprint YAML._
