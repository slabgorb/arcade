# Reference sources — vendored original Atari source

The preserved original Atari source for each game, vendored **into this repo** at
`reference/atari-source/<name>/`. This table records where each tree came from and
the commit it is pinned to.

It used to live under `~/Projects`, machine-local and in no repo. That made every
ROM-fidelity claim unfalsifiable by anyone but the one laptop that had the trees —
the audit's own tests crashed with `ENOENT` everywhere else. The source is the
evidence; it belongs with the code that cites it.

**One tree per game, not two.** Text is LF-normalized to plain ASCII so you can grep
it directly (the upstream files are CR-terminated non-UTF8 — grep flags them binary
and silently returns nothing). Binaries — `.lda`, `.sav`, `.prg`, numbered ROM
dumps — are passed through **verbatim**, so the ROM images here are byte-identical
to the upstream clone. That is what makes them a legitimate oracle for
`just extract-audio`, and why a separate "pristine" tree is not needed.

Refresh a row with `just vendor-source <org/repo> --ref <sha>` (or the fleet with
`just vendor-source-all`). A pristine clone is cached at `~/Projects/<name>-source`;
no tool reads it. **Pin the ref** when refreshing — re-vendoring at upstream `HEAD`
can change the audited bytes underneath the fidelity oracles.

| Name | Repo | Pinned SHA | Clone cache | In-repo source | Vendored |
|------|------|------------|----------------|----------------|----------|
| red-baron | historicalsource/red-baron | 5ceb7b4 | ~/Projects/red-baron-source | reference/atari-source/red-baron | 2026-07-12 |
| star-wars-1983 | historicalsource/star-wars | 5355b76 | ~/Projects/star-wars-1983-source | reference/atari-source/star-wars-1983 | 2026-07-12 |
| tempest | historicalsource/tempest | 6c783be | ~/Projects/tempest-source | reference/atari-source/tempest | 2026-07-12 |
| asteroids | historicalsource/asteroids | fafcd40 | ~/Projects/asteroids-source | reference/atari-source/asteroids | 2026-07-12 |
| battlezone | historicalsource/battlezone | 38d0b07 | ~/Projects/battlezone-source | reference/atari-source/battlezone | 2026-07-12 |
| centipede | historicalsource/centipede | dbbe6de | ~/Projects/centipede-source | ~/Projects/a-1/reference/atari-source/centipede | 2026-07-18 |
