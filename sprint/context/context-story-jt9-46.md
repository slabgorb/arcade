# Story jt9-46 Context

## Title
Enemy buzzards are drawn RIDERLESS — draw the DPLYR knight rider per enemy species (the buzzards carry PLYR3/4/5, JOUSTRV4.SRC:109)

## Metadata
- **Story ID:** jt9-46
- **Type:** refactor
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
Filed by the Architect from a user playtest, 2026-08-05: "I never see ANY figures riding
the buzzards", and "I still have yet to see any enemies spawn besides buzzards". Both trace
to ONE render-selection gap.

WHAT THE PORT DOES NOW. drawList (demo.ts:2284-2286) emits exactly ONE op per enemy — the
buzzard-body frame enemyFrame(p) returns (BRFLAP / BRRUN1-4 / BRSTND, all sourced from the
BRUN*/BFLY* BIRD sprites, pictures.ts:1685-1693). A PLAYER (demo.ts:2281-2283) instead loops
playerDrawList(p), which returns TWO stacked sprites: the bird mount PLUS the knight rider
(PLYR1 / PLYR2, demo.ts:2201-2210). So the player has a rider and the enemy has none — every
enemy renders as a bare bird. The enemy-knight rider sprite is already transcribed and unused:
PLYR3 (source PLY3R, JOUSTI.SRC:2106), PLYR4 (PLY4R, :2155), PLYR5 (PLY5R, :2208), all at
POSOFF word 751 like PLYR1/2.

WHAT THE ROM DOES. Every bird+rider is TWO objects. The decision block for each enemy species
carries a DPLYR field — `DPLYR RMB 2   RIDERS IMAGE` (field 6, offset 10, JOUSTRV4.SRC:109) —
naming that species' rider sprite, exactly as the player's block does. This is already pinned
as an oracle by tests/audio-ptero-wing-source.test.ts:132-139 ("field 6 is DPLYR, the RIDERS
IMAGE"), whose sibling note (:48-50) records that the buzzard blocks carry PLYR3/4/5 in that
field while the pterodactyl (P7DEC) carries 0 because a ptero has no rider. The enemy buzzard
sound rows are at :5560 / :5564 / :5568 / :5572 (P3DEC-P6DEC), and the DPLYR field is the
rider on the same rows.

WHY THIS IS ALSO "only buzzards, never hunters/lords". The three ground species (bounder,
hunter, shadow lord) are distinguished in the ROM by WHICH rider sprite they carry — the
PLYR3/4/5 records differ (PLY3R's colour nibble is at JOUSTI.SRC:2114; nibble 4 is the enemy
knight red, COLOR1[4] = 0o017, pinned pictures.test.ts:262-266). Hunters DO spawn from wave 4
(WAVE_TABLE wave 4 = 3 bounders + 3 hunters, wave.ts:78) — the player just cannot tell them
apart, because the port draws no rider at all and so encodes no per-species appearance. Drawing
the DPLYR rider per species fixes BOTH reports at once; they are one mechanism, not two stories.

THE MAPPING IS A RED-PHASE READ, NOT A GUESS. Which species maps to PLYR3 vs 4 vs 5 must be
read from the actual PxDEC DPLYR fields in the vendored source at RED — do not hardcode a
mapping from this filing. (The Architect confirmed the STRUCTURE from the test oracle but did
not read the per-block field values; the vendored tree is not in this checkout — like
red-baron's, it lives in a sibling a-2 checkout, and these suites degrade to committed
fixtures on CI via vendoredAvailable. See the joust-source helper.)

SHAPE. Add a pure `enemyDrawList(p): string[]` mirroring playerDrawList — [ enemyFrame(p),
<rider for p.enemyType> ] — and have drawList loop it for every kind:'enemy' process, so the
hatched remount buzzard (remountEnemyProcess, a kind:'enemy' process) gets its rider for free
too. Keep it in the pure render-SELECTION seam (demo.ts:2111 "routing≠geometry"): it returns
DATA (frame names), the shell blits them, and each op is tagged with the enemy's facing so the
shell mirrors a left-facer exactly as it does for the player.

OUT OF SCOPE, FILE SEPARATELY: remountEnemyProcess (demo.ts:1056-1082) HARDCODES type:'bounder',
so a hatched hunter/shadow-lord remounts — and now, after this story, VISIBLY re-rides — as a
bounder, losing its species (the ROM keeps PID/PEGG across the remount, :3251-3252). That is a
SIM bug, not a render one; this story makes it more visible but must not absorb it. Recommended
follow-up jt9-47. SM owns filing it at finish if this story descopes it, per the descoped-finding
rule.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- AC-1 EVERY ENEMY DRAWS A MOUNT AND A RIDER. A pure enemyDrawList(p) returns TWO ordered sprite names for a kind:'enemy' process — the buzzard-body frame (unchanged from enemyFrame) and the species' DPLYR rider — and drawList emits both, tagged with the enemy's facing, mirroring the player path (demo.ts:2281-2286 vs the current single-op :2284-2286). Guard: a fresh wave's enemy produces a rider op stacked on its BR* mount. MUTATION: dropping the rider op (reverting to the single mount op) must redden a named test.
- AC-2 THE RIDER IS THE SPECIES' OWN DPLYR SPRITE, READ FROM THE ROM. bounder / hunter / shadow-lord each map to the PLYR3/4/5 sprite named in their PxDEC DPLYR field (field 6 / offset 10, JOUSTRV4.SRC:109; buzzard blocks at :5560/:5564/:5568/:5572). The mapping is read from the vendored source at RED, not transcribed from this filing. Guard each of the three species maps to a DISTINCT rider record. MUTATION: swapping two species' riders must redden. Degrades to the committed fixture on CI (vendoredAvailable), like the sibling oracle in audio-ptero-wing-source.test.ts.
- AC-3 NO HAND-AUTHORED PIXELS, NO INVENTED COLOUR. The rider sprites are the already-transcribed PLYR3/4/5 records (sources PLY3R/PLY4R/PLY5R, JOUSTI.SRC:2106/2155/2208) drawn through the existing atlas; the enemy-knight colour is the transcribed COLOR1 nibble (nibble 4 = 0o017 red, pictures.test.ts:262-266), never a literal. The purity/denylist scans stay clean and the byte-gate is untouched — this story authors zero new pixel data.
- AC-4 THE HATCHED REMOUNT BUZZARD ALSO GETS A RIDER. remountEnemyProcess builds a kind:'enemy' process (demo.ts:1056-1082), so enemyDrawList must cover it with no special case. Assert a matured-egg remount bird carries a rider op. NOTE in the test that its species is bounder ONLY because remountEnemyProcess hardcodes it today (the jt9-47 follow-up), so this AC pins that the rider is DRAWN, not which species it is.
- AC-5 THE RIDER SITS ON THE BUZZARD (POSOFF). The rider op carries the PLYR* record's own transcribed POSOFF (posOffset, demo.ts:2234-2244; PLYR3/4/5 position word 751) so it stacks on the mount rather than at the feet. Pin the rider op's placement offset against the record; the exact on-buzzard alignment (751 was authored over the ostrich/stork) is a HUMAN visual-verification point — call it out for the reviewer with a `just serve` screenshot at /joust/, do not claim it from a unit test alone.

---
_Generated by `pf context create story jt9-46` from the sprint YAML._
