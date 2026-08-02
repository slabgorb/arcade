# Arcade plugin host — collapsing nine repos onto one origin

**Date:** 2026-07-30
**Author:** Architect
**Status:** Proposed — pending implementation plan
**Amended:** 2026-07-30 — §4.3's boot helper deferred to a follow-up epic; its premise of
fleet-wide `main.ts` uniformity was measured and found false. See §4.3.
**Supersedes:** ADR-0001 (Option 4 → Option 2), ADR-0004 (single-origin now adopted)
**Model:** `~/Projects/words` — a self-hosted plugin host where "adding a new game is one
folder plus one registry line."

---

## 1. Problem

The arcade is nine independent git repos — eight browser apps plus `arcade-shared` —
gitignored inside an orchestrator that holds only tooling. That topology was chosen
deliberately (ADR-0001) and it now costs on four axes, all four of which the owner
confirmed as live pain:

**Duplicated tooling.** Eight `vite.config.ts`, eight `tsconfig.json`, eight
`package.json` each re-declaring vite/vitest/typescript, eight `deploy.yml` callers, a
bucket and a custom domain per shipped game, eight pinned dev ports. Every scaffold change
is an eight-way copy-paste. The port pinning is itself a documented trap: `strictPort`
alone does not protect a pin (td1-1), and a sibling checkout can silently answer on the
port you are screenshotting.

The published inventory is itself inconsistent, which matters for the teardown steps:
`docs/ops/hosting.md` lists six buckets including red-baron but omitting centipede and
joust, while `lobby/src/core/registry.ts` lists centipede and joust but omits red-baron,
and joust's bucket is known never to have been created at all. **The epic must reconcile
the real set from the Cloudflare account rather than from either document.**

**Shared-code drift.** `@arcade/shared` is consumed as a version-pinned git-URL
dependency, so the fleet sits on four different versions simultaneously — tempest
`v0.13.1`, centipede `v0.15.0`, lobby `v0.16.0`, star-wars `v0.17.0`. Bumping the library
moves nothing until each game re-pins. There are effectively four "currents".

**The lobby registry is a hand-maintained lie.** `lobby/src/core/registry.ts` hardcodes
each game's `launchUrl`, `version`, `color` and `controls`. Nothing generates it and
nothing checks it, so it rots silently — red-baron is provisioned in production but absent
from the list, and every tile's version string is a manual transcription.

**Nine repos of git ceremony.** Nine histories, nine `develop` branches, per-game gitflow
PRs, per-game `just release`, plus sibling-checkout races on the same backlog. Adding a
game is a repo-creation project rather than one folder.

A fifth cost is structural rather than felt: because each game is served from its own
origin, `localStorage` is partitioned away from the lobby. ADR-0004 worked around this
with a cookie on the registrable domain. That workaround exists **only** because of the
topology this spec dissolves.

## 2. Decision

**Collapse the nine repos into the orchestrator as a single monorepo with a plugin
contract, served from a single origin, while preserving per-game independent releases.**

Four constraints were set by the owner and every subsequent decision derives from them:

| Constraint | Ruling |
|---|---|
| Per-game subdomains | **Dropped.** Redirected to the single origin. |
| Per-game release + version | **Preserved.** A red joust test must not block a tempest release. |
| Per-game git history | **Dropped.** Squashed import is acceptable. |
| Standalone game clone builds | **Dropped.** This is what unlocks direct shared imports. |
| Contract depth | Manifest only in this epic; the boot helper is deferred (§4.3). |
| Sequencing | Flag day — one epic, all nine at once. |
| Branch strategy | Trunk-based on `main`. |

**One origin does not mean one build.** This is the crux that makes "single origin" and
"per-game release" compatible: each game builds independently into its own `dist/<id>/`
and uploads to **only its own key prefix** in one bucket. Per-game version, per-game test
gate and per-game release survive intact.

## 3. Repository layout

```
arcade/
├── package.json            # the ONLY package.json with dependencies
├── vite.config.ts          # a config FACTORY, parameterised by app id
├── vitest.config.ts        # projects: one per app, root = that app's own dir
├── tsconfig.json           # base; each app extends it
├── src/
│   ├── shared/             # was @arcade/shared — direct imports, no pinning
│   │   ├── math3d.ts rng.ts highscore.ts loop.ts font.ts
│   │   └── pause.ts glow.ts view.ts audio.ts synth.ts esc-overlay.ts name-entry.ts
│   └── host/
│       ├── contract.ts     # GameMeta, validateMeta  (boot.ts deferred — §4.3)
│       └── registry.ts     # GENERATED from every plugins/*/plugin.ts
├── plugins/
│   ├── tempest/
│   │   ├── plugin.ts       # the manifest — the contract
│   │   ├── package.json    # {name, version, private} ONLY — no deps, no scripts
│   │   ├── index.html
│   │   ├── main.ts         # unchanged by this epic
│   │   ├── src/core/  src/shell/
│   │   ├── tests/  tools/  docs/  public/
│   │   └── tsconfig.json   # extends the root base
│   ├── star-wars/  asteroids/  battlezone/
│   └── red-baron/  centipede/  joust/
├── lobby/                  # the front door. Not a plugin; builds to root keys.
├── scripts/                # build-app.mjs, release.mjs, deploy-r2.mjs, gen-registry.mjs
├── sprint/  docs/  justfile
```

Each game directory keeps its **internal shape byte-for-byte** — `src/core`, `src/shell`,
`tests/`, `tools/audit/`, `docs/rom-study/`. This is not cosmetic conservatism: it is what
keeps 655 test files, every citation gate and every purity scanner working without a
rewrite (see §7).

The per-game `package.json` carries `{name, version, private}` and nothing else. It exists
so `npm version` still works per game and so `plugin.ts` can import its own version.
Eight package.jsons each re-declaring vite/vitest/typescript would re-create the
duplication being deleted.

`lobby/` sits outside `plugins/` because it is the host shell, not a game. It builds to
root keys and is the thing `arcade.slabgorb.com/` serves.

## 4. The plugin contract

Two files per game. The manifest is data; the boot call is the shell.

### 4.1 The manifest

```ts
// plugins/tempest/plugin.ts — the only thing the lobby ever reads
import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'tempest',          // MUST equal the directory name
  title: 'TEMPEST',
  year: 1981,
  color: '#00eaff',
  controls: ['ROTATE — Wheel / ←→', 'FIRE — Click / Space'],
  listed: true,           // red-baron ships `false` until it is ready
  version,
}
```

`validateMeta()` mirrors words' `validatePlugin`: `id` must be url-safe
(`/^[a-z][a-z0-9-]*$/`) and equal to the directory name, `title` must be non-empty,
`color` must be a hex colour, `controls` must be a non-empty string array. It runs at
build time via `gen-registry.mjs`, so a malformed manifest **fails the build** rather than
producing a broken tile.

### 4.2 The generated registry

`src/host/registry.ts` is generated by globbing `plugins/*/plugin.ts` and collecting each
`meta`. `lobby/src/core/registry.ts` — with its six hardcoded `launchUrl`s and six
hardcoded version strings — is **deleted**.

Consequences, which are the entire point:

- A game cannot exist and be unlisted by accident. `listed: false` becomes a deliberate,
  visible statement rather than an omission nobody noticed (red-baron's current state).
- A tile's version is the game's actual shipped version by construction, not a manual
  transcription that drifts.
- `launchUrl` ceases to exist as a concept. Tiles link to `/<id>/` — a relative path on
  the same origin.

The generated file is committed (not gitignored) so the diff is reviewable and the lobby
builds without a pre-step; `gen-registry.mjs` runs in CI and fails if the committed file
is stale.

### 4.3 The boot helper — DEFERRED to a follow-up epic

**Amended 2026-07-30, before planning.** The original draft of this section specified a
`bootGame(meta, create, opts)` helper owning canvas lookup, DPR resize, audio unlock, the
Escape pause gate, high-score construction and the rAF loop, on the stated grounds that
this is "exactly what all seven games' `main.ts` files repeat today."

**That premise was false**, and it was drawn from tempest's `main.ts` on the assumption the
fleet followed it. Measured across all seven:

> ⚠ **The table below is a snapshot of 2026-07-30 and two of its cells are now wrong.**
> It records centipede and joust as having no audio unlock; both gained one within
> 48 hours of it being written (joust `2cafac2`, jt5-1, 2026-07-31; centipede
> `6c2bf1a`, cp5-2, 2026-08-01). It is kept as the record of what was measured when
> the deferral was decided — the reasoning below rests on it and stands.
>
> **For what the fleet does today, and which helper each game adopts, read
> [`docs/ops/shell-adoption-matrix.md`](../../ops/shell-adoption-matrix.md)** — the live
> table sc1-1 landed, which records only the adoption DECISION and derives the
> behaviour census from the tree on every test run, precisely so it cannot rot the
> way this one did.

| game | resize | audio unlock | Esc pause | high scores | loop |
|---|---|---|---|---|---|
| tempest | `resizeToDisplay` | ✅ | ✅ | shared factory | **own** `shell/loop` |
| star-wars | `resizeToDisplay` | ✅ | ✅ | shared + own core module | shared |
| asteroids | `resizeToDisplay` | ✅ | ✅ | shared factory | shared |
| battlezone | **own** `applyLetterbox` | ✅ | **own** `shell/pause`, no overlay | shared factory | shared |
| red-baron | **none** | ✅ | ✅ | **none** | **own** |
| centipede | **own** `fitIntegerScale` | **none** | **none** | shared factory | **own** `pumpFrame` |
| joust | **none** | **none** | **none** | **none** | **own** timebase |

The only element common to all seven is `document.querySelector('#game')` followed by
`getContext('2d')` — not an abstraction worth a helper. Even tempest's `createLoop` is not
the shared one: it is a bespoke state-machine loop with `dispatch()`, `getState()`,
`onModeChange` and `onSubStep`. red-baron's `main.ts` is 918 lines and uses neither the
shared loop nor shared storage.

**Decision: this epic ships the manifest and the generated registry (§4.1–4.2) and no boot
helper.** Shell convergence becomes its own follow-up epic, planned against the real
matrix above rather than an assumed one.

Two reasons beyond the false premise:

1. **Bisectability.** The flag day is a pure-infrastructure change — every file moves, but
   no runtime behaviour changes. Folding in a shell refactor that *does* change behaviour
   means a post-migration bug cannot be bisected to "the move" or "the refactor."
2. **ROM fidelity.** centipede and joust run the cabinets' own cadences (centipede's
   15750/263 Hz accumulator). Converging them onto a shared loop is exactly the class of
   change that silently alters game behaviour, and it must not ride along inside a
   migration whose acceptance criteria are about paths and buckets.

The follow-up epic's likely shape is **compositional** rather than monolithic — small
independent helpers (`mountCanvas`, `installAudioUnlock`, `installPauseToggle`) that each
game adopts only where it already does that thing — but that is a decision for that epic's
own design, not a commitment made here.

Nothing in this epic forecloses it: after the collapse, all seven `main.ts` files live in
one repo behind one `tsconfig`, which is strictly easier ground for that work than seven
repos on four different `@arcade/shared` pins.

## 5. Shared code

`@arcade/shared` becomes `src/shared/`, reached through a `@shared/*` path alias (with
`@host/*` alongside it for the contract and generated registry) declared once in the root
`tsconfig.json` and once in the Vite factory.

Deleted along with the package boundary: the git-URL dependency, tag pinning, the
`prepare` build step, the `dist/` staleness class, the `npm link` inner loop, and the
force-reinstall incantation for git-dep lock staleness.

**On ADR-0001's determinism driver.** ADR-0001 chose per-consumer pinning so that "a
frozen game must be able to pin an exact revision of shared code, so a shared change
cannot silently alter a game's determinism/replay behavior." That requirement is answered
*better* by the monorepo, not abandoned by it. A change to `src/shared/rng.ts` that alters
tempest's replay behaviour now fails tempest's tests **in the same commit**. Under pinning
it lies dormant behind `#v0.13.1` until someone re-pins months later, at which point forty
shared changes land at once and the bisect is expensive. The pin was never protection; it
was deferral with a green suite attached.

`arcade-shared` the repo is archived.

## 6. Build, deploy, dev

### 6.1 Build

`scripts/build-app.mjs <id>` invokes Vite programmatically with the config factory:

| App | root | base | outDir |
|---|---|---|---|
| a game | `plugins/<id>` | `/<id>/` | `dist/<id>` |
| lobby | `lobby` | `/` | `dist` |

(This mirrors words' own `scripts/build-clients.mjs`, which builds each plugin's client
bundle from one root config.)

Games with extra HTML entries keep them — tempest's `models.html` contact sheet and
star-wars' equivalents. These are declared in a **separate optional export** beside the
manifest, not inside `GameMeta`:

```ts
// plugins/tempest/plugin.ts
export const build = { entries: ['models.html'] }   // read by build-app.mjs only
```

`GameMeta` stays purely lobby-facing data; build configuration has no business travelling
into the tile renderer. `build-app.mjs` merges `entries` into `rollupOptions.input`, so the
per-game configs still disappear.

### 6.2 Deploy

One bucket, key prefixes per game:

```
arcade-lobby/                 ← arcade.slabgorb.com
├── index.html  assets/       ← the lobby, at root keys
├── tempest/                  ← plugins/tempest's dist
├── star-wars/
└── …
```

The bucket is the **existing `arcade-lobby`**, already bound to `arcade.slabgorb.com`, so
this needs zero new Cloudflare resources. Note it is *not* the bucket literally named
`arcade` — that one is the assets bucket behind `arcade-assets.slabgorb.com`, an
established naming exception. After the migration `arcade-lobby` is a mild misnomer;
rebinding the custom domain to a fresh `arcade-cabinet` is optional and costs one
custom-domain swap.

Upload writes **only** the game's own key prefix, which is what preserves per-game deploy
isolation. `scripts/deploy-r2.mjs` already sets an explicit `--content-type` per file and
that behaviour is unchanged.

### 6.3 Release and CI

Tags need a prefix — one repo cannot hold two `v1.0.29`. Releases become `tempest-v1.0.29`
and the deploy trigger moves from *push to `main`* to *push of a matching tag*:

```yaml
on: { push: { tags: ['*-v*'] } }   # the game id is parsed from the tag
```

This replaces eight ten-line `deploy.yml` callers **and** the reusable
`deploy-r2.yml` with a single workflow.

`just release <name> [level]` loses the develop→main `--no-ff` merge entirely:

1. preflight — clean tree, on `main`, in sync with origin
2. gate — `npm test -- --project <name>` and `npm run build -- <name>`
3. bump `plugins/<name>/package.json`, commit
4. annotated tag `<name>-vX.Y.Z`
5. push `main` and the tag

A red joust test cannot block a tempest release because step 2 runs only tempest's
project. `just release-all` iterates and still stops at the first failure.

### 6.4 Dev

One Vite dev server on one port. `localhost:5270/` is the lobby;
`localhost:5270/tempest/` is Tempest.

This deletes `just serve`'s eight servers, the eight pinned ports, the
`strictPort`-does-not-protect-the-pin gap that td1-1 closed fleet-wide, and shrinks
CLAUDE.md's "the port may belong to a different checkout" hazard from eight ports to one.

**Base-path audit.** Every app is `base: '/'` today and becomes `base: '/<id>/'`. Some
asset references already assume the prefix (tempest's sfx resolve at `/tempest/sfx/`),
others do not. This is a per-game audit item — a known, bounded task, not a design
unknown. Each game's story in the epic carries it.

## 7. Test topology

One `vitest.config.ts` using `projects`, one project per app, each with
`root: 'plugins/<id>'` (or `'lobby'`).

That single decision is what keeps 655 test files working untouched:

- **Citation gates** (`tools/audit/check-citations.mjs` in tempest, star-wars, centipede)
  read paths like `src/core/sim.ts` through a bare `readFileSync`, resolved against cwd.
  Per-game root means the path never changes and **no re-anchoring is needed**. This is
  the single largest avoided cost in the migration — re-anchoring pinned line numbers by
  hand across three games' findings corpora is exactly the class of work that has
  historically gone green on the wrong code.
- **Purity scanners** (core/shell boundary guards) scan relative source paths and are
  likewise unaffected.

Per-project `environment` covers the split: lobby needs `jsdom`, games run `node`.

`npm test` runs the whole cabinet; `npm test -- --project tempest` is the release gate, so
per-game CI time is unchanged.

**One test must be rewritten.** arcade-shared's `tests/purity.test.ts` scans the built
`dist/` as source text and depends on a `pretest` build. With no package boundary there is
no `dist/`; it scans `src/shared/` directly and the `pretest` build is deleted. The
scanner's comment-inclusive behaviour is preserved — it must still catch a forbidden
global named inside a comment.

## 8. High-score migration — the one player-visible risk

Existing player tables live in `localStorage` on `tempest.slabgorb.com` and its five
siblings. Once those hosts redirect, `arcade.slabgorb.com/tempest/` **cannot reach them**.
That is real data loss and the design owns it rather than discovering it in production.

**ADR-0004's cookie is the bridge.** It is scoped `Domain=slabgorb.com`, so it is readable
from the new origin, and since the lb2-8 amendment it carries a five-row name+score ladder
rather than a bare number. `readTopScores(gameId): TopScoreRow[]` returns those rows,
capped at `PUBLISHED_SUMMARY_DEPTH = 5`.

### 8.1 The domain field cannot survive the bridge

`TopScoreRow` is `{ name, score }` and nothing else. The game's own domain field — `level`
for tempest, `wave` for centipede — is **deliberately** excluded, so the lobby could never
accidentally depend on a game-private value.

That collides with the row guard. `makeHighScoreRowGuard('level')` returns
`isHighScoreRow(v) && Number.isFinite(row['level'])`, and `load()` filters every row
through it. **A row seeded naively from the cookie has no `level`, so the guard drops it on
the very next load** — the migration would appear to work, then silently erase itself. This
is the failure mode the whole design must avoid, and it is invisible to any test that
seeds and reads in one pass without a reload.

Fabricating a plausible `level` is not an option: it is the cabinet inventing a fact about
a player's game, the same lie ADR-0004's amendment rejected when it refused to invent
initials for a nameless ladder.

**Decision: migrated rows carry the domain field as `null`, and the guard is widened to
accept `null` — but only `null`, never a missing or non-numeric value.**

```ts
// widened guard: a finite number, or an explicit null meaning "migrated, unknown"
Number.isFinite(row[domainKey]) || row[domainKey] === null
```

The board renders a blank in that column for migrated rows. A player sees their real name
and their real score with an honest gap where the cabinet genuinely does not know the
level, rather than a fabricated number or a vanished record. Rows written after migration
always carry a real value, so the `null` state is strictly transitional and self-clearing
as new scores displace old ones.

This widening touches `makeHighScoreRowGuard`, the `HighScoreEntry<DomainKey>` type, and
every board renderer that formats the domain column. It is small, but it is not zero, and
it must be its own story rather than a footnote inside the migration story.

### 8.2 Sequence

1. On first boot at the new origin, if same-origin `localStorage` for that game is empty
   **and** the cookie yields rows, seed the table from those rows with `domainKey: null`.
2. Thereafter `localStorage` is authoritative, same-origin, exactly as ADR-0001 originally
   intended.
3. The cookie transport (`cookieTopScoreTransport`, the publish inside `save()`, the
   republish-on-load helper) is retired; the lobby reads `localStorage` directly.

**Top five scores survive without their level; rows six through ten are lost.** That is
the honest cost, it is one-time, and no player is shown an empty board. A legacy
bare-number cookie (pre-lb2-8) yields no rows and therefore seeds nothing — the game starts
empty rather than inventing initials, consistent with the house fail-soft rule.

**Test bar:** the migration test must seed, then **reload through a real `load()`**, and
assert the rows survive. A single-pass seed-and-read test would certify a feature that
erases itself, which is precisely the class of green-suite-over-broken-behaviour that
ADR-0004's own risk table called out for the lobby's storage tests.

red-baron and joust persist no high scores at all and have nothing to migrate. (ADR-0004
named only red-baron; joust postdates it.)

**Unfiled follow-up to file during this epic.** ADR-0004 logged three follow-ups that were
never turned into stories. The live one: Safari's ITP purges script-writable storage after
seven days without user interaction, which covers `localStorage` universally since Safari
13.1 — so a player who does not return within seven days can lose their table outright.
This is a pre-existing production bug, unaffected by this migration and not fixed by it,
and it must be filed as its own story rather than left in an archive note again.

## 9. pf / sprint tooling

`repos.yaml` goes from nine entries to one. It is the file pf actually enforces against,
so this is the widest-blast-radius change in the toolchain.

**Branch strategy: `trunk-based` on `main`.** Sprint and session YAML keep committing
directly to `main` exactly as today. Game stories still use `feat/{story}-{description}`
branches and PRs by convention and through the pf reviewer workflow, but the
branch-protection hook no longer *enforces* it.

This is a deliberate trade, stated plainly: hook-enforced protection of game code is
exchanged for the sprint tooling continuing to work unchanged. The alternative — setting
`gitflow` so the hook protects `main` — would require every `sprint/` and `.session/`
write to go through a branch and a PR, which is a substantial change to how `/pf-sm` and
`/pf-sprint` operate day to day.

The value **must** remain the literal string `trunk-based`; pf compares against that exact
spelling and any other value silently falls through to the gitflow path and protects
`main`, blocking the direct sprint commits this repo depends on.

Also updated: `CLAUDE.md` (repository structure, serving, releasing, git workflow, the
whole port-trap section), `docs/ops/hosting.md` (one bucket, key prefixes, tag-triggered
deploy, the redirect rules), and the `justfile` (`serve`, `install-all`, `release`,
`deploy`, `deploy-one`).

**Sibling checkouts.** After flag day, a-2 and a-3 hold stale *gitignored* game
directories that are now *tracked*; pulling will fight them. The clean remedy is a fresh
clone of both.

## 10. Flag-day sequence

1. a-2 commits and pushes `feat/sw8-8-incoming-fire-reaction-window` (15 dirty files), or
   accepts replaying it by hand into `plugins/star-wars/`.
2. Release every game once more from the old world, so production sits at a known tag.
3. Import each tree as one squashed commit recording its source SHA in the message.
   Archive — do not delete — the nine repos, so per-file blame stays reachable.
4. Collapse tooling: root `package.json`, Vite factory, vitest projects, tsconfig aliases.
5. Write `src/host/contract.ts` (`GameMeta`, `validateMeta`) and seven `plugin.ts`
   manifests. No `main.ts` is touched — the boot helper is deferred (§4.3).
6. Generate the registry; delete the lobby's hardcoded one.
7. Re-base every app to `/<id>/`; audit asset paths per game.
8. One tag-triggered deploy workflow; delete the eight callers and the reusable workflow.
9. Widen the row guard to accept `null` domain values (§8.1); ship the seed-from-cookie
   path and its reload-survival test.
10. Reconcile the real bucket/custom-domain inventory from the Cloudflare account (§1).
    Then, per live hostname: unbind the R2 custom domain, point the host at the zone
    (proxied), add a Single Redirect rule → `arcade.slabgorb.com/<id>/`.
11. Retire the cookie transport.
12. Update CLAUDE.md, repos.yaml, hosting.md, ADR-0001, ADR-0004.
13. **Last, and only after the new origin is verified end to end:** delete the old
    per-game buckets.

Steps 10 and 13 are the irreversible pair and are deliberately last. Until step 10 flips,
the old buckets keep serving the last good build, so rollback is simply *not flipping
DNS*.

**Redirect mechanism.** A DNS record alone cannot produce a path redirect. Each hostname
is currently an R2 custom-domain binding; it must be unbound, pointed at the zone
(proxied), and given a Cloudflare **Single Redirect** rule. This is free-tier and needs
neither a Worker nor Enterprise Origin Rules.

**Verification bar for step 13.** "Verified end to end" means a real `200` on the new
origin for each game's `index.html` and its assets — not a green test suite. The audio and
asset layers degrade silently by design, so a 404 is indistinguishable from working code
in any vitest run; only a live fetch against the bucket proves the upload landed.

**Sizing.** ~14 stories, ~60k LOC moved, no per-game escape hatch. With the boot helper
deferred, every story in this epic is infrastructure: files move, configs collapse, nothing
a player can see changes except the URL and the high-score bridge. That is the cost of a
flag day, chosen deliberately. The fleet currently has **zero open PRs across all nine
repos**, which is the best window available.

## 11. What this supersedes

**ADR-0001** selected the version-pinned git dependency (Option 4) and rejected the
workspace/monorepo (Option 2) because it "directly contradicts the topology — games are
independent repos with separate remotes and histories." That was correct when written. The
topology is precisely what changes here, so the objection dissolves rather than being
overruled. ADR-0001's decision drivers "independence preserved" and "a standalone game
clone must still build" are explicitly retired by owner ruling; its determinism driver is
retained and better served (§5).

**ADR-0004** rejected the single-origin collapse "on cost, not merit" and **priced it
wrong**. It assumed path routing to *multiple buckets*, which does require Enterprise-only
Origin Rules. One bucket with key prefixes requires neither that nor a Worker, and the
six subdomain redirects are free-tier Single Redirects. ADR-0004's own closing note — "kept
cheap to revisit: because the transport sits behind an interface, collapsing later swaps
one adapter" — is honoured here: the cookie becomes a one-time migration bridge and is
then deleted.

ADR-0002 (font strategy) and ADR-0003 (render surface extraction) are untouched.

Both superseded ADRs get a status amendment in the same epic, not a silent overwrite.

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Flag day half-lands | Nothing ships until it is finished | Old buckets keep serving until step 10; rollback is not flipping DNS |
| Base-path rebase breaks assets per game | A game 404s its own sfx/fonts | Per-game audit item in that game's story; verified against a real build, not a green vitest — a silent-degrade audio path hides a 404 as convincingly as a bug |
| a-2's `sw8-8` work is stranded | 15 files of star-wars work lost | Step 1 gates the entire epic on committing or accepting replay |
| Scores six through ten lost per player | Minor, one-time, invisible to most | Accepted and documented; top five survive via the cookie bridge |
| Seeded rows silently dropped by the row guard | Migration appears to work, then erases itself on the next load | Guard widened to accept `null` domain values (§8.1); the test must reload through a real `load()`, not seed-and-read in one pass |
| Bucket/domain inventory is wrong in two docs | A live hostname is missed at teardown, or a dead one is "redirected" | Step 10 reconciles from the Cloudflare account, not from `hosting.md` or the lobby registry |
| Sibling checkouts break on pull | a-2/a-3 unusable until fixed | Fresh clone; documented in the epic |
| Shared change now breaks a game immediately | A previously-dormant break becomes a red suite | This is the intended behaviour, not a regression — see §5 |
| `repos.yaml` branch_strategy typo | Direct sprint commits silently blocked | The literal-string requirement is called out in §9 and already carries a comment in the file |

## 13. Out of scope

- **The boot helper / shell convergence.** Deferred to its own epic — see §4.3 for the
  measured adoption matrix and the reasoning. This epic touches no game's `main.ts`.
- **Full `mount()` host / single-page cabinet.** Words' actual shape — one `index.html`,
  games as lazy-loaded chunks the host swaps in place — is *not* adopted, because it is
  incompatible with per-game independent releases. It remains reachable later, but only
  after the shell convergence above.
- **Cross-device leaderboards.** Still declined; the no-backend constraint holds.
- **The Safari ITP purge fix.** Named in §8, to be filed as its own story, explicitly not
  fixed by this work.
- **`arcade-cabinet` bucket rename.** Optional cosmetic follow-up.

---

*Design produced through the superpowers brainstorming skill, 2026-07-30.*
