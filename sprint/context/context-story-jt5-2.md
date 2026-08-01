# Story jt5-2 Context

## Title
The samples — synthesise joust's cues, upload them, and prove a live 200 (count is whatever the manifest holds when this runs, NOT eleven)

## Metadata
- **Story ID:** jt5-2
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust audio — the sound subsystem joust shipped without

## Problem
jt5-1 built the seam and left joust SILENT: eleven ROM-cited cues, zero .wav files, nothing in the assets bucket. This story records or synthesises them and uploads them. COUNT CORRECTION 2026-08-01 (jt5-3's Reviewer): 'eleven' is stale and this story must NOT hardcode a number. jt5-3 added four wing cues (player and enemy, wing-down and wing-up) taking the manifest to fifteen; jt5-4 adds SNPTHD and SNETHD; jt5-6 splits player-materialise onto SNPCR1/SNPCR2 and needs a SECOND SAMPLE, not just a second manifest row; and jt5-10 may or may not add the pterodactyl to the enemy wing pair. DERIVE THE LIST FROM SOUNDS in plugins/joust/src/shell/audio.ts AT THE TIME THIS RUNS and bake exactly that set — the epic's story order (agreed with the user 2026-08-01) deliberately puts this story LAST so the cue set is complete and one upload pass suffices. THE SOUND BOARD'S FIRMWARE IS NOT VENDORED — reference/williams-source/joust/JOUSTSND.DOC is three lines whose entire content is the pointer 'SEE [LIBRARY.SOUND]VSNDRM4.SRC', and no revision carries that file. So nothing here can bake a waveform from source the way tempest's POKEY route does; every sample is a recording or a synthesis, and the manifest's CUE_SOURCES entries say which table each is standing in for. THE ACCEPTANCE TEST IS A LIVE 200, NOT A GREEN VITEST: @shared/audio degrades silently on a 404, on blocked autoplay, and on undecodable data alike, so a passing suite is indistinguishable from a bucket with nothing in it — this is exactly how a star-wars .wav stayed missing from sw7-18 all the way to sw8-14. Upload with 'just deploy-assets' (CI never touches that bucket, which is named plain 'arcade', not 'arcade-assets'; the recipe currently bakes star-wars ONLY and must be extended). Then curl each URL under https://arcade-assets.slabgorb.com/joust/sfx/ and paste the status codes. The filenames are fixed by SOUNDS. Also flip the README status line off 'silent'.

## Background (SM measured facts, verified against the working tree 2026-08-01)

These override any stale count in the Problem prose above (the description's
own "eleven" is explicitly marked stale by its own COUNT CORRECTION sentence).

1. **The cue set today is SEVENTEEN, derived — never hardcode a count as a
   premise.** `plugins/joust/src/shell/audio.ts:98` `export const SOUNDS`
   holds exactly 17 entries: enemyDeath, playerDeath, eggCollected,
   eggHatched, pteroArrives, pteroDeath, playerMaterialise,
   enemyMaterialise, extraMan, waveBounty, cliffDestroyed, playerWingDown,
   playerWingUp, enemyWingDown, enemyWingUp, playerThud, enemyThud. That is
   jt5-1's eleven + jt5-3's four wing cues + jt5-4's two thuds. Phrase any AC
   about the file set as "one file per entry of SOUNDS as it stands at
   implementation time (17 as of 2026-08-01)", not a bare hardcoded number.
2. **Order deviation, recorded not blocking:** the epic's agreed order put
   jt5-2 LAST, but it was explicitly invoked now while jt5-6 (SNPCR2 — needs
   its own SECOND sample per its own description), jt5-8, jt5-9, jt5-15,
   jt5-17 are still backlog. Consequence: when jt5-6 lands it does its own
   incremental sample + upload; jt5-2 bakes exactly today's SOUNDS set and
   that is correct per the story's own operative instruction.
3. **`just deploy-assets` currently bakes star-wars ONLY** — measured at
   `justfile:274-286`: it stages `star-wars/music` + `star-wars/sfx`, and
   `assets_bucket := "arcade"` (`justfile:271` — the bucket really is named
   plain `arcade`, not `arcade-assets`). The recipe must be EXTENDED to also
   stage/upload `joust/sfx/`. CI never touches this bucket.
4. **No sound-board firmware exists to bake from:**
   `reference/williams-source/joust/JOUSTSND.DOC` is a single pointer line
   `SEE [LIBRARY.SOUND]VSNDRM4.SRC`, and no vendored revision carries that
   file (the file itself is 3 lines). So every sample is a recording or
   synthesis — no tempest-style POKEY bake is possible. The manifest's
   `CUE_SOURCES` entries in `audio.ts` name which ROM table each sample
   stands in for.
5. **The acceptance test is a LIVE 200, not a green vitest.** `@shared/audio`
   degrades silently on 404 / blocked autoplay / undecodable data (this is
   how a star-wars `.wav` stayed missing sw7-18→sw8-14), so a passing suite
   proves nothing about the bucket. The final AC requires curl status codes
   for every `https://arcade-assets.slabgorb.com/joust/sfx/<file>` URL
   derived from SOUNDS, pasted into the session.
6. **README status flip:** `plugins/joust/README.md:13` reads "Live at
   **v0.0.8** and **silent**" (and line 27 repeats the silent caveat) — flip
   the status line off "silent" once the 200s are proven.

## Technical Approach

Measured pointers only (design is TEA/Dev's):

- The manifest, channel map, priorities, frame durations and `CUE_SOURCES`
  provenance all live in `plugins/joust/src/shell/audio.ts` (`SOUNDS` at
  `:98`, `DEFAULT_BASE_URL` at `:96`). The filenames the bucket must serve
  are exactly the `SOUNDS` values.
- Fleet precedent for a bake: star-wars keeps its generators in
  `plugins/star-wars/tools/pokey-bake/bake-sfx.mjs` and
  `plugins/star-wars/tools/music-bake/bake-music.mjs`; the `deploy-assets`
  recipe (`justfile:274-286`) stages into a temp dir that mirrors the bucket
  keys and hands the whole dir to `scripts/deploy-r2.mjs`, which keys
  objects by their path relative to that dir and already knows the
  `audio/wav` content type (per the recipe's own comment, `justfile:258-270`).
  A joust generator under `plugins/joust/tools/` would follow that shape.
- Verification is `curl -sI https://arcade-assets.slabgorb.com/joust/sfx/<file>`
  per manifest entry; paste all status codes into the session (AC4).

## Scope
- In scope: one `.wav` per `SOUNDS` entry (17 today, derived at run time);
  the tool or recordings that produce them; extending `just deploy-assets`
  to stage/upload `joust/sfx/`; the upload itself; the live-200 proof; the
  README "silent" flip.
- Out of scope: SNPCR2 (owned by jt5-6, backlog); changes to `@shared/audio`
  or joust's dispatch/manifest code beyond what the bake needs; CI touching
  the assets bucket; other games' bakes.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — derived by the SM from
the description plus the measured facts above; TEA may refine during RED._

- The manifest-derived file list — one `.wav` per entry of `SOUNDS` in
  `plugins/joust/src/shell/audio.ts` as it stands at implementation time (17
  as of 2026-08-01) — is derived programmatically at bake/upload time, never
  hardcoded as a literal count or list anywhere in the implementation.
- Every sample is a recording or a synthesis (no ROM/firmware bake is
  possible — `JOUSTSND.DOC` is an unvendored 3-line pointer), and each
  file's provenance stays traceable to the `CUE_SOURCES` entry it stands in
  for.
- `just deploy-assets` is extended to also stage and upload `joust/sfx/`
  (alongside its existing star-wars staging) into the same `arcade` bucket
  (`assets_bucket` at `justfile:271`) under the `joust/sfx/` key prefix; CI
  is not made to touch this bucket.
- Live 200 proof: for every URL
  `https://arcade-assets.slabgorb.com/joust/sfx/<file>` derived from
  `SOUNDS`, a curl status check returns 200, and the pasted status codes for
  all of them are recorded (a green vitest suite is explicitly NOT
  sufficient evidence — `@shared/audio` degrades silently on 404/blocked
  autoplay/undecodable data).
- `plugins/joust/README.md:13` ("Live at v0.0.8 and silent") and the
  repeated caveat at `plugins/joust/README.md:27` are updated to drop
  "silent" now that the 200s are proven.
- jt5-6's SNPCR2 (a second, still-backlog sample) is explicitly out of scope
  for this story's bake — jt5-2 bakes exactly today's `SOUNDS` set, and
  jt5-6 does its own incremental sample + upload when it lands.
- No regressions: joust's vitest project and the orchestrator suite stay
  green, lint is clean, and the build is clean.

---
_Generated by `pf context create story jt5-2` from the sprint YAML._
