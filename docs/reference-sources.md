# Reference sources — vendored original Atari source

Machine-local clones of the preserved original source for each game, produced
by `just vendor-source`. The clones live under `~/Projects` and are **not** in
any repo — this table is the durable record of what exists and where.

**Grep the greppable copy** (`*-source-text`, LF-normalized ASCII); the pristine
clone is CR-terminated non-UTF8 and grep flags it binary. Recreate any row with
`just vendor-source <org/repo>` (or the whole fleet with `just vendor-source-all`).

| Name | Repo | Pinned SHA | Pristine clone | Greppable copy | Vendored |
|------|------|------------|----------------|----------------|----------|
| red-baron | historicalsource/red-baron | 5ceb7b4 | ~/Projects/red-baron-source | ~/Projects/red-baron-source-text | 2026-07-12 |
| star-wars-1983 | historicalsource/star-wars | 5355b76 | ~/Projects/star-wars-1983-source | ~/Projects/star-wars-1983-source-text | 2026-07-12 |
| tempest | historicalsource/tempest | 6c783be | ~/Projects/tempest-source | ~/Projects/tempest-source-text | 2026-07-12 |
| asteroids | historicalsource/asteroids | fafcd40 | ~/Projects/asteroids-source | ~/Projects/asteroids-source-text | 2026-07-12 |
| battlezone | historicalsource/battlezone | 38d0b07 | ~/Projects/battlezone-source | ~/Projects/battlezone-source-text | 2026-07-12 |
