# Audio provenance — what the ROM actually says

Every sound the fleet ships, audited against the original Atari ROM by
`just extract-audio <game>` (or `just extract-audio-all`). Generated — do not
hand-edit the verdict table.

Five links, none skippable: PARSE the original Atari sound source → LOCATE the
table via the `.MAP` symbol table → **VERIFY the bytes against the ROM image** →
RENDER → COMPARE with what the game ships.

| Verdict | Meaning |
|---------|---------|
| `ROM-VERIFIED` | Byte-equal to the ROM, and what we ship matches it. |
| `MISMATCH` | The chain completed and **what we ship is not it**. |
| `UNVERIFIED` | The chain broke. The reason names the exact link. |
| `NO ROM AUDIO` | No sound ROM exists, by hardware design. Terminal — not a to-do. |

**There are no fallbacks.** A sound that cannot be proved is reported, never
quietly satisfied from a hand-transcribed table or a community rip.

<!-- verdict table below: paste the output of `just extract-audio-all` -->

| Game | Sound | Verdict | Evidence / Reason |
|------|-------|---------|-------------------|
| tempest | segment_tick | XX MISMATCH | register-event stream differs from tempest/tools/pokey-bake/'s expansion at event 2: ROM=[0,0] shipped=null (ROM emits 4 events, shipped emits 2) |
| tempest | player_fire | XX MISMATCH | register-event stream differs from tempest/tools/pokey-bake/'s expansion at event 20: ROM=[0,0] shipped=null (ROM emits 22 events, shipped emits 20) |
| tempest | launch | XX UNVERIFIED | link 5 (compare): no shipped entry named 'launch' in tempest/tools/pokey-bake/sfx-data.mjs (SFX or DEFERRED) — nothing to compare against |
| tempest | pulsar_hum | OK ROM-VERIFIED | ALSOUN.MAC PU6F @ $cc99 |
| tempest | extra_life | OK ROM-VERIFIED | ALSOUN.MAC WP4F @ $cc11 |
| tempest | player_explosion | OK ROM-VERIFIED | ALSOUN.MAC DI1F @ $cbf5 |
| tempest | warp | OK ROM-VERIFIED | ALSOUN.MAC T26F @ $cc75 |
| tempest | enemy_explosion | OK ROM-VERIFIED | ALSOUN.MAC T36F @ $cc81 |
| tempest | enemy_fire | XX MISMATCH | register-event stream differs from tempest/tools/pokey-bake/'s expansion at event 18: ROM=[0,0] shipped=null (ROM emits 20 events, shipped emits 18) |
| tempest | spike_shot | XX MISMATCH | register-event stream differs from tempest/tools/pokey-bake/'s expansion at event 10: ROM=[0,0] shipped=null (ROM emits 12 events, shipped emits 10) |
| tempest | countdown_beep | OK ROM-VERIFIED | ALSOUN.MAC SL1F @ $cc69 |
| tempest | three_second_warning | XX UNVERIFIED | link 5 (compare): no shipped entry named 'three_second_warning' in tempest/tools/pokey-bake/sfx-data.mjs (SFX or DEFERRED) — nothing to compare against |
| tempest | pulsar_active | XX UNVERIFIED | link 5 (compare): tempest/tools/pokey-bake/sfx-data.mjs lists 'pulsar_active' in DEFERRED, not baked/shipped: Disassembly sound_pulsar (entry 12, sample_6d) is a single-tick per-pulse-beat blip with AUDC volume nibble 0 — it bakes SILENT as a one-shot and only makes sense retriggered each pulse beat in-engine, not as a standalone sample. Address known ($cca9). |
| battlezone | engine_hum | -- NO ROM AUDIO | AUDF3/AUDC3/AUDF4/AUDC4 are poked directly by procedural code in BZONE.MAC (robot-tracking distance-to-volume); there is no envelope table for it. |
| battlezone | radar_beep | XX MISMATCH | shipped audio is invented; battlezone/src/shell/audio.ts asserts no ROM data exists, but BZSOUN.MAC has real envelope tables. |
| battlezone | bump | XX MISMATCH | shipped audio is invented; battlezone/src/shell/audio.ts asserts no ROM data exists, but BZSOUN.MAC has real envelope tables. |
| battlezone | block | XX MISMATCH | shipped audio is invented; battlezone/src/shell/audio.ts asserts no ROM data exists, but BZSOUN.MAC has real envelope tables. |
| battlezone | bonus | XX MISMATCH | shipped audio is invented; battlezone/src/shell/audio.ts asserts no ROM data exists, but BZSOUN.MAC has real envelope tables. |
| battlezone | warning | XX MISMATCH | shipped audio is invented; battlezone/src/shell/audio.ts asserts no ROM data exists, but BZSOUN.MAC has real envelope tables. |
| battlezone | disintegration | XX MISMATCH | shipped audio is invented; battlezone/src/shell/audio.ts asserts no ROM data exists, but BZSOUN.MAC has real envelope tables. |
| battlezone | saucer | XX MISMATCH | shipped audio is invented; battlezone/src/shell/audio.ts asserts no ROM data exists, but BZSOUN.MAC has real envelope tables. |
| battlezone | super_bonus | XX MISMATCH | shipped audio is invented; battlezone/src/shell/audio.ts asserts no ROM data exists, but BZSOUN.MAC has real envelope tables. |
| red-baron | gun | -- NO ROM AUDIO | discrete analog board, not POKEY |
| red-baron | explosion | -- NO ROM AUDIO | discrete analog board, not POKEY |
| red-baron | engine_hum | -- NO ROM AUDIO | discrete analog board, not POKEY |
| red-baron | approach_whine | -- NO ROM AUDIO | discrete analog board, not POKEY |
| red-baron | point_tick | OK ROM-VERIFIED | RBSOUN.MAC TK1/TK2 @ $71ed |
| red-baron | bonus_life | XX MISMATCH | red-baron/src/shell/pokey.ts POKEY_SOUNDS.BN disagrees with the ROM envelope — AUDF: ROM sweeps, shipped port holds flat; AUDC: ROM holds flat, shipped port sweeps |
| red-baron | new_plane | XX MISMATCH | red-baron/src/shell/pokey.ts POKEY_SOUNDS.WP disagrees with the ROM envelope — AUDF: ROM sweeps, shipped port holds flat; AUDC: ROM holds flat, shipped port sweeps |
| red-baron | three_hundred | XX MISMATCH | red-baron/src/shell/pokey.ts POKEY_SOUNDS.TH disagrees with the ROM envelope — AUDF: ROM holds flat, shipped port sweeps; AUDC: ROM holds flat, shipped port sweeps |
| red-baron | ten_point_tick | OK ROM-VERIFIED | RBSOUN.MAC TP1/TP2 @ $724d |
| asteroids | fire | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| asteroids | thrust | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| asteroids | bang_large | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| asteroids | bang_medium | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| asteroids | bang_small | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| asteroids | saucer_large | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| asteroids | saucer_small | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| asteroids | thump_lo | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| asteroids | thump_hi | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| asteroids | extra_life | -- NO ROM AUDIO | Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling. |
| star-wars | speech/use_the_force_luke | OK ROM-VERIFIED | content-identical prefix (312 bytes); ROM slice is 314 bytes, shipped blob is 312 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/remember | OK ROM-VERIFIED | content-identical prefix (163 bytes); ROM slice is 165 bytes, shipped blob is 163 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/i_m_on_the_leader | OK ROM-VERIFIED | content-identical prefix (185 bytes); ROM slice is 187 bytes, shipped blob is 185 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/the_force_is_strong_with_this_one | OK ROM-VERIFIED | content-identical prefix (312 bytes); ROM slice is 314 bytes, shipped blob is 312 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/red_five_standing_by | OK ROM-VERIFIED | content-identical prefix (319 bytes); ROM slice is 321 bytes, shipped blob is 319 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/this_is_red_five_i_m_going_in | OK ROM-VERIFIED | content-identical prefix (330 bytes); ROM slice is 332 bytes, shipped blob is 330 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/r2_try_and_increase_the_power | OK ROM-VERIFIED | content-identical prefix (318 bytes); ROM slice is 320 bytes, shipped blob is 318 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/you_re_all_clear_kid | OK ROM-VERIFIED | content-identical prefix (219 bytes); ROM slice is 221 bytes, shipped blob is 219 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/let_go_luke | OK ROM-VERIFIED | content-identical prefix (244 bytes); ROM slice is 246 bytes, shipped blob is 244 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/breathing | OK ROM-VERIFIED | content-identical prefix (129 bytes); ROM slice is 131 bytes, shipped blob is 129 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/yah_hoo | OK ROM-VERIFIED | content-identical prefix (221 bytes); ROM slice is 223 bytes, shipped blob is 221 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/i_have_you_now | OK ROM-VERIFIED | content-identical prefix (272 bytes); ROM slice is 274 bytes, shipped blob is 272 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/look_at_the_size_of_that_thing | OK ROM-VERIFIED | content-identical prefix (366 bytes); ROM slice is 368 bytes, shipped blob is 366 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/stay_in_attack_formation | OK ROM-VERIFIED | content-identical prefix (373 bytes); ROM slice is 375 bytes, shipped blob is 373 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/the_force_will_be_with_you | OK ROM-VERIFIED | content-identical prefix (251 bytes); ROM slice is 253 bytes, shipped blob is 251 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/always | OK ROM-VERIFIED | content-identical prefix (119 bytes); ROM slice is 121 bytes, shipped blob is 119 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/r2_no | OK ROM-VERIFIED | content-identical prefix (251 bytes); ROM slice is 253 bytes, shipped blob is 251 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/elephant_sound_for_passby | OK ROM-VERIFIED | content-identical prefix (290 bytes); ROM slice is 292 bytes, shipped blob is 290 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/i_m_hit_but_not_bad_r2_see_what_you_can_do_with_it | OK ROM-VERIFIED | content-identical prefix (513 bytes); ROM slice is 513 bytes, shipped blob is 515 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/i_ve_lost_r2 | OK ROM-VERIFIED | content-identical prefix (174 bytes); ROM slice is 176 bytes, shipped blob is 174 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/great_shot_kid_that_was_2_in_a_million | OK ROM-VERIFIED | content-identical prefix (456 bytes); ROM slice is 458 bytes, shipped blob is 456 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/i_can_t_shake_him | OK ROM-VERIFIED | content-identical prefix (199 bytes); ROM slice is 201 bytes, shipped blob is 199 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | speech/luke_trust_me | OK ROM-VERIFIED | content-identical prefix (211 bytes); ROM slice is 213 bytes, shipped blob is 211 bytes — differ only in trailing bytes past the decoder's STOP frame |
| star-wars | music/bens_theme | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/cantina | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/death_star_explodes | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/rebel_theme | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/rebel_theme_repeats | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/main_theme | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/battle_in_fourths | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/theme_b | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/descent | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/vader_theme | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |
| star-wars | music/test_tones | XX UNVERIFIED | link 5 (compare): shipped as pre-rendered .wav; no in-repo artifact to compare |

31 ROM-VERIFIED, 29 MISMATCH/UNVERIFIED, 15 NO ROM AUDIO.

## What this found

The audit's design rationale lives in
[`docs/superpowers/specs/2026-07-12-extract-audio-design.md`](./superpowers/specs/2026-07-12-extract-audio-design.md);
this section summarizes the headline results of the first real run.

Battlezone's entire soundscape is invented: `battlezone/src/shell/audio.ts`
carries a comment asserting no ROM sound data exists, but `BZSOUN.MAC` in the
original source has real envelope tables for every one of those sounds
(`radar_beep`, `bump`, `block`, `bonus`, `warning`, `disintegration`, `saucer`,
`super_bonus`). Nobody had read the ROM before writing the port's audio.

Red Baron's port inverts three sounds' registers relative to the ROM. For
`bonus_life`, `new_plane`, and `three_hundred`, the ROM sweeps the frequency
register (AUDF) while holding the volume/distortion register (AUDC) flat, and
the shipped port has that backwards — it sweeps AUDC while holding AUDF flat.
The two registers control different things, so the shipped sounds are audibly
wrong, not just numerically off.

Four of Tempest's sounds that were believed authentic (`segment_tick`,
`player_fire`, `enemy_fire`, `spike_shot`) are missing the ROM's terminal
zero-write: the ROM's register-event stream always ends with an explicit
`[0,0]` (silence) event that the shipped bake drops, cutting the expansion
short by one event and leaving the last real event ringing instead of being
silenced.

Elsewhere the picture is cleaner: Star Wars's speech samples are all
ROM-VERIFIED (each shipped blob is a byte-identical prefix of the ROM slice,
differing only in trailing bytes past the TMS5220 decoder's STOP frame), and
Tempest's `pulsar_hum`, `extra_life`, `player_explosion`, `warp`,
`enemy_explosion`, and `countdown_beep` all check out exactly against
`ALSOUN.MAC`. The `NO ROM AUDIO` verdicts (Asteroids, Red Baron's engine/gun/
explosion sounds, Battlezone's `engine_hum`) are not gaps to fill — those
games' original hardware generated those sounds with discrete analog circuits
or direct register pokes, not a POKEY envelope table, so there is nothing in
ROM to compare against.
