# Migration manifest — 2026-07-30T11:52:51Z

Source of truth for where each tree came from. History is squashed on import;
this file and the archived repos are the only provenance record.

Fleet released to parity immediately before the migration (`just release-all patch`):
3 apps had unreleased work and shipped; 5 were already at parity and were skipped.
Every app now has `main == develop` at the tag below — the per-game rollback target.

| repo | source SHA (develop) | version | release tag | released now? |
|---|---|---|---|---|
| lobby | `b52bbf37dbc371bd8b6775f651564059ff2a5867` | 0.0.22 | v0.0.22 | yes |
| tempest | `8b2e21b9e90fb861b227f3032765ec5e23fcc4fc` | 1.0.28 | v1.0.28 | no — already at parity |
| star-wars | `822ee06469f5f994008eb04f75a92913b14514e6` | 0.0.33 | v0.0.33 | yes |
| asteroids | `38795fbcb33fe69d4e53dc81a4d7bf4c84bbfa36` | 1.0.14 | v1.0.14 | no — already at parity |
| battlezone | `413bb0cbe6786cd892385117acd7021b093d93ae` | 1.0.3 | v1.0.3 | no — already at parity |
| red-baron | `d7f7870683db8c4f54f0a34f13a79fa0010156dd` | 0.0.23 | v0.0.23 | no — already at parity |
| centipede | `cde70464fd8f839fdc847647a8445bdc98e82892` | 0.0.6 | v0.0.6 | no — already at parity |
| joust | `b644f7d7d537c6811a9da856aef367b29ac1385e` | 0.0.8 | v0.0.8 | yes |
| arcade-shared | `3d3d7346ddab1460dee2b1159e2c63613d0f5864` | 0.17.0 | v0.17.0 | n/a (library) |

## R2 inventory (verified from the Cloudflare account, not from docs)

`docs/ops/hosting.md` listed 6 buckets (including red-baron, omitting centipede and
joust); `lobby/src/core/registry.ts` listed 6 (including centipede and joust, omitting
red-baron). **Both were wrong.** All 8 app buckets exist and all 8 custom domains are
active. `arcade-joust` was created 2026-07-26 — an earlier note that it was missing is
out of date.

| bucket | custom domain | role after migration |
|---|---|---|
| `arcade-lobby` | arcade.slabgorb.com | **the cabinet** — keeps serving; games move in under key prefixes |
| `arcade-tempest` | tempest.slabgorb.com | redirect, then delete |
| `arcade-star-wars` | star-wars.slabgorb.com | redirect, then delete |
| `arcade-asteroids` | asteroids.slabgorb.com | redirect, then delete |
| `arcade-battlezone` | battlezone.slabgorb.com | redirect, then delete |
| `arcade-red-baron` | red-baron.slabgorb.com | redirect, then delete |
| `arcade-centipede` | centipede.slabgorb.com | redirect, then delete |
| `arcade-joust` | joust.slabgorb.com | redirect, then delete |
| `arcade` | arcade-assets.slabgorb.com | **assets — untouched.** Name does not match its domain (known exception) |

Unrelated buckets in the same account, not part of the arcade: `pennyfarthing`,
`sidequest`, `slabgorb`. Do not touch.
