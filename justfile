# arcade — project tasks
# Framework recipes imported from .pennyfarthing/justfile.pf

import '.pennyfarthing/justfile.pf'

root := justfile_directory()

default:
    @just --list

# ============================================
# GAMES (the plugins/ directories)
# ============================================
# Space-separated list of plugin directory names; add a new game here.
#
# There is no `subrepos` list any more, and no concept for one to name: the eight
# gitignored sibling checkouts are one repo. The lobby is not in this list because
# it is not a game — recipes that mean "every app" say `{{games}} lobby`.
games := "tempest star-wars asteroids battlezone red-baron centipede joust"

# One install for the whole cabinet. The eight per-subrepo installs are gone, and
# with them the `@arcade/shared` git-dep pin they had to be reconciled against
# (scripts/deps-doctor.mjs, deleted): the shared library is in-tree at src/shared,
# reached through the `@shared` alias, so there is no pin left to drift.
install-all:
    @npm install

# One vitest run across every project — the whole cabinet in ONE process.
#
# The old recipe looped eight subrepos running `npm test` in each, which is why it
# needed the failure accumulator below (td1-10: a `for` loop's exit status is only
# its LAST iteration's, so six of seven red games read as green). One process has
# one exit status; there is nothing left to mask.
#
# Deliberately NOT `npm test`: that is `vitest run --passWithNoTests`, which is the
# right stance for a per-app script but the wrong one for the fleet gate — a config
# that stopped matching any test file would sail through it.
test-all:
    @npx vitest run

# One app's project only — what the release gate runs.
# `--project <unknown>` is a startup error in vitest, not a silent zero-test pass.
test-one name:
    @npx vitest run --project {{name}}

# Build every app: the seven games plus the lobby, each through the one builder
# (scripts/build-app.mjs) that CI also runs. Unlike test-all this is still a loop —
# one build per app is the point ("one origin does not mean one build") — so it
# keeps td1-10's explicit per-iteration failure accumulator: every app is attempted,
# and the summary names the FULL set of broken ones rather than only the last.
#
# The lobby builds LAST. Its outDir is dist/, the parent of every game's dist/<id>/,
# so it is the app whose output the others sit inside; building it last means a
# `just build-all` leaves a complete tree even if cleanLobbyOutput ever regressed.
build-all:
    #!/usr/bin/env bash
    set -uo pipefail
    failed=""
    for g in {{games}} lobby; do
      echo "==> $g"
      if ! node {{root}}/scripts/build-app.mjs "$g"; then
        failed="$failed $g"
      fi
    done
    if [ -n "$failed" ]; then
      echo
      echo "!! build-all FAILED:$failed"
      exit 1
    fi
    echo
    echo "build-all: all apps built."

# Run the orchestrator's own checks (node:test — vitest never sees these files)
test-orchestrator:
    @node --test 'tests/**/*.test.mjs'

# `pull` and `status` are gone with the thing they orchestrated. Both looped
# `git -C {{root}}/$g` over eight sibling checkouts, each with its own remote and
# its own `develop`; there is one repo and one history now, so `git pull` and
# `git status` are the whole of what they did. Their subtlety — never rebase a
# feature branch onto develop, advance the ref with a refspec fetch instead —
# was about the games' gitflow remotes, which no longer exist.

# ============================================
# VENDOR ORIGINAL SOURCE (historicalsource/*)
# ============================================
# Clone a preserved original-source repo into ~/Projects as a pristine git clone
# PLUS a greppable (LF-normalized ASCII) copy, and record it in
# docs/reference-sources.md. Grep the `*-source-text` copy; the originals are
# CR-terminated non-UTF8 (grep flags them binary).

# Vendor one repo, e.g. `just vendor-source historicalsource/red-baron [5355b76]`
vendor-source repo ref="":
    @node {{root}}/scripts/vendor-source.mjs {{repo}} {{ if ref != "" { "--ref " + ref } else { "" } }}

# Vendor every game's original source from the manifest in scripts/vendor-source.mjs
vendor-source-all:
    @node {{root}}/scripts/vendor-source.mjs --all

# Bake a game's ROM source into its committed contact-sheet artifact
bake-models game="star-wars":
    @node {{root}}/scripts/bake-models.mjs {{game}}

# Audit one game's sounds against the original ROM, e.g. `just extract-audio battlezone`
extract-audio game *FLAGS:
    @node {{root}}/scripts/extract-audio.mjs {{game}} {{FLAGS}}

# Audit the whole fleet; non-zero exit if any sound is MISMATCH or UNVERIFIED
extract-audio-all:
    @node {{root}}/scripts/extract-audio.mjs --all

# Full CI sweep: orchestrator checks + every game
ci: test-orchestrator test-all build-all
    @echo "CI passed!"

# ============================================
# SERVE THE ARCADE (canonical dev loop)
# ============================================
# ONE dev server for the cabinet, on ONE port. It replaces eight servers on eight
# pinned ports, and with them scripts/serve.mjs — the supervisor that existed only
# to launch, watch and tear down a fleet of them (td1-8). One process has one exit
# status, so there is no fleet left to mask a dead member of.
#
# Dev-only. The live arcade is R2 static hosting, updated by `just release <app>`
# (a tag triggers CI) or `just deploy` (manual fallback). `just install-all` once
# on a fresh checkout first.
#
# The port and the host pin come from vite.config.ts, NOT from CLI flags, so a bare
# `npx vite` at the repo root is pinned too — not only invocations that remember
# `--port 5270 --strictPort`. Read the comment on that config's `server` block: the
# pin still matters with one port, because a-1/a-2/a-3 now race THAT one, and an
# unpinned host lets a sibling checkout bind [::1]:5270 beside your 127.0.0.1:5270
# with no collision error and serve the whole cabinet from the wrong working tree.
#
# ⚠ WHAT THIS SERVES TODAY: the LOBBY, at every path. MEASURED, not assumed — the
# root vite.config.ts default-exports `defineAppConfig({ id: 'lobby' })`, whose
# `root` is lobby/, so /, /tempest/, /tempest/models.html and the nonsense control
# /banana/ all return 200 with <title>Slabcade</title> and identical bytes. The
# identical control is the proof: it is a blanket SPA fallback, not a route table.
# So a screenshot taken at /tempest/ is the LOBBY — do not verify a game's render
# here. Pinned by `the dev server serves the LOBBY at every path` in
# tests/canonical-serve.test.mjs, which reddens the day the games are really wired
# in and this paragraph has to change.
serve:
    @npx vite

# ============================================
# DEPLOY (R2 static hosting)
# ============================================
# MANUAL FALLBACK. It bypasses the tag and CI entirely, and is therefore the only
# way production can diverge from a release. Prefer `just release <app>`.
#
# ONE bucket for the whole cabinet — `arcade-lobby`. The seven `arcade-<game>`
# buckets are retired: the lobby owns the bucket ROOT (that is what makes it the
# front door at /) and every game owns its own `<id>/` key prefix. Requires
# `wrangler` logged in.
#
# `--lobby-only` on the lobby's leg is NOT cosmetic — see scripts/deploy-r2.mjs.
# The lobby's dist dir IS dist/, the parent of every game's dist/<id>/, and the
# lobby's build deliberately no longer empties it (emptying deleted all seven
# games), so an unrestricted upload here republishes every game sitting on disk:
# 34 objects, 29 of them games. Deploy one app, ship eight — from whatever build
# happens to be lying around, at whatever commit.
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    node {{root}}/scripts/build-app.mjs lobby
    node {{root}}/scripts/deploy-r2.mjs {{root}}/dist arcade-lobby --lobby-only
    for g in {{games}}; do
      echo "==> $g"
      node {{root}}/scripts/build-app.mjs "$g"
      node {{root}}/scripts/deploy-r2.mjs "{{root}}/dist/$g" arcade-lobby "$g"
    done
    echo "Deploy complete."

# Deploy a single app (e.g. `just deploy-one tempest`, `just deploy-one lobby`)
deploy-one name:
    #!/usr/bin/env bash
    set -euo pipefail
    node {{root}}/scripts/build-app.mjs {{name}}
    if [ "{{name}}" = "lobby" ]; then
      node {{root}}/scripts/deploy-r2.mjs {{root}}/dist arcade-lobby --lobby-only
    else
      node {{root}}/scripts/deploy-r2.mjs {{root}}/dist/{{name}} arcade-lobby {{name}}
    fi

# ============================================
# ASSETS (the arcade-assets bucket — sfx / speech / music)
# ============================================
# Bake star-wars's POKEY music from the 1983 source and upload it to the assets
# bucket under star-wars/music/.
#
# ⚠ THE BUCKET IS CALLED `arcade`, NOT `arcade-assets`. The public hostname is
# arcade-assets.slabgorb.com, but the R2 bucket behind it is plain `arcade` —
# there is no bucket named arcade-assets, and asking for one fails with the
# gloriously unhelpful "The specified bucket does not exist". The apps' own bucket
# now matches its domain the same way the retired per-game ones did
# (arcade-lobby ← arcade.slabgorb.com), so this remains the one exception.
#
# This is NOT part of CI, and deliberately so. The deploy workflow ships each app's
# dist/ and nothing else, so the assets bucket has always been filled by hand —
# which is exactly how star-wars shipped a complete music path pointing at four
# .wav files that did not exist, and stayed silent for an entire epic without a
# single error in the console.
#
# ⚠ THE BAKE SCRIPTS MOVED WITH THE MONOREPO IMPORT: they are under
# plugins/star-wars/tools/, not the retired root-level star-wars/. This recipe
# pointed at the old paths for the whole of the migration and died on `node:
# cannot find module` before uploading anything — while its only watcher stayed
# green, because that watcher asserted the STRING `star-wars/music` appears
# somewhere in this file and the `mkdir -p` line below satisfies it. The guard now
# resolves the paths this recipe actually invokes and asserts they exist on disk:
# plugins/star-wars/tools/music-bake/deploy-assets.test.mjs.
#
# The bake is deterministic: re-running it re-uploads byte-identical files. The
# staging tree mirrors the bucket keys, so deploy-r2.mjs (which keys objects by
# their path relative to the dir it is given, and already knows audio/wav) needs
# no changes.
assets_bucket := "arcade"

deploy-assets:
    #!/usr/bin/env bash
    set -euo pipefail
    staging="$(mktemp -d)"
    trap 'rm -rf "$staging"' EXIT
    mkdir -p "$staging/star-wars/music" "$staging/star-wars/sfx"
    echo "==> baking star-wars music"
    node {{root}}/plugins/star-wars/tools/music-bake/bake-music.mjs "$staging/star-wars/music"
    echo "==> baking star-wars sfx"
    node {{root}}/plugins/star-wars/tools/pokey-bake/bake-sfx.mjs "$staging/star-wars/sfx"
    echo "==> uploading -> {{assets_bucket}}/star-wars/{music,sfx}/  (served at arcade-assets.slabgorb.com)"
    node {{root}}/scripts/deploy-r2.mjs "$staging" {{assets_bucket}}
    echo "Done. Verify: curl -sI https://arcade-assets.slabgorb.com/star-wars/music/space_theme.wav"

# Prove every game's URL actually answers — not just the ones the lobby
# showcases today. The loop below iterates the whole fleet regardless of a
# game's `showcase` flag in the lobby's registry; there is no per-showcase
# filtering here.
#
# The lobby CANNOT detect a broken build behind a cross-origin frame: iframe.onload
# fires for error pages too, and same-origin policy hides everything else. So
# liveness is checked HERE rather than pretended at in CI, where a network
# assertion on a GitHub runner is a flaky red that teaches everyone to ignore it.
#
# The game list is no longer duplicated here. It is READ from the generated
# registry (src/host/registry.ts) — node strips the types on import, so bash can
# ask the same source of truth the lobby renders, and adding a game needs no edit
# to this recipe. The old hand-kept `for u in tempest star-wars ...` list is
# exactly the drift this migration exists to remove.
#
# That list is fetched into a VARIABLE and checked before the loop, not piped
# straight into `while read`. Reading a process substitution directly discards the
# producer's exit status — `set -uo pipefail` without `-e` does not cover it — so a
# failed import (registry renamed, a syntax error in the generated file, a Node
# below 22.18 with no type-stripping) yields empty stdout, zero iterations, and
# `exit 0`. The recipe would report success having probed NOTHING, which is worse
# than the hardcoded list it replaced: that one always probed six URLs. The whole
# point of this check is to not be lied to, so it fails loudly instead.
#
# URL scheme, and why it is not flipped yet: after the origin collapse every game
# is served at ARCADE_ORIGIN/<id>/ — but the cutover of the live hostnames is
# Task 23's step 4, and it is the owner's to make. Until it happens the games
# answer on their own subdomains and NOWHERE else, so probing the single origin
# today would report a six-line outage that isn't one — and a check that cries
# wolf is worse than no check, which is the reason this recipe exists at all.
# So: subdomains by default, single origin on request. After the cutover, set
# ARCADE_ORIGIN=https://arcade.slabgorb.com in the environment (or make it the
# default here — the paths already come from gamePath()).
check-showcase:
    #!/usr/bin/env bash
    set -uo pipefail
    fail=0
    probed=0
    origin="${ARCADE_ORIGIN:-}"
    # id + path pairs, straight from the registry's own gamePath(). LISTED_GAMES,
    # not GAMES: red-baron is `listed: false` and has no live URL to probe.
    if ! games=$(node -e "import('{{root}}/src/host/registry.ts').then(m => console.log(m.LISTED_GAMES.map(g => g.id + ' ' + m.gamePath(g.id)).join('\n')))"); then
      echo "check-showcase: could not read the game list from src/host/registry.ts — nothing was probed" >&2
      exit 2
    fi
    if [ -z "${games//[[:space:]]/}" ]; then
      echo "check-showcase: the registry yielded no listed games — nothing was probed" >&2
      exit 2
    fi
    while read -r id path; do
      if [ -n "$origin" ]; then url="$origin$path"; else url="https://$id.slabgorb.com/"; fi
      # curl already prints 000 itself via -w on a connection failure (and also
      # exits non-zero, which `set -uo pipefail` without `-e` tolerates) — an
      # `|| echo 000` fallback here would double that into "000000" instead of
      # reporting cleanly. -L so a redirect (e.g. Task 23's Single Redirect rules
      # from the old hostnames) is not mistaken for an outage — it reports the
      # FINAL response's status. --connect-timeout/--max-time so a host that
      # stalls after the TCP handshake cannot wedge this check forever; a timeout
      # also surfaces as curl's own 000, landing in the same non-200 path with no
      # extra logic.
      code=$(curl -sL --connect-timeout 5 --max-time 15 -o /dev/null -w "%{http_code}" "$url")
      printf "%-12s %-46s %s\n" "$id" "$url" "$code"
      [ "$code" = "200" ] || fail=1
      probed=$((probed + 1))
    done <<< "$games"
    # Belt and braces on the same failure: if the list somehow survived both guards
    # and still produced no probe, say so rather than exiting 0 on an empty run.
    if [ "$probed" -eq 0 ]; then
      echo "check-showcase: zero URLs probed" >&2
      exit 2
    fi
    exit $fail

# ============================================
# RELEASE (tag <app>-vX.Y.Z on main → CI deploys to R2)
# ============================================
# Cut a semver release of ONE app out of the monorepo: gate on that app's vitest
# project and its own build, bump plugins/<name>/package.json (or
# lobby/package.json), regenerate src/host/registry.ts into the SAME commit, tag
# <name>-vX.Y.Z and push. The TAG is the deploy trigger — main carries every app's
# commits, so a push to main cannot say which app to ship.
#
# The argument is an APP ID now (`tempest`), not a subrepo path: there are no
# subrepos, and scripts/release.mjs validates the id against plugins/ + lobby.
# e.g. `just release tempest` (patch) or `just release tempest minor`
#
# The third parameter exists so the remedy the skip message names is reachable
# from the interface people actually use: `just release tempest patch --force`.
# Without it just reads `--force` as another recipe name and dies with
# "Justfile does not contain recipe `--force`" — measured, which is how it got
# here. Empty by default, and an unquoted empty expansion adds no argument.
release name level="patch" force="":
    node {{root}}/scripts/release.mjs {{name}} {{level}} {{force}}

# Release every app at the same bump level. Games first and the lobby LAST: each
# game's bump is baked into the generated registry, and the lobby's tiles read
# their versions from there — so one lobby release at the end ships every
# accumulated tile bump. An app with nothing to ship skips itself.
release-all level="patch" force="":
    #!/usr/bin/env bash
    set -euo pipefail
    for g in {{games}}; do
      echo "==> releasing $g"
      node {{root}}/scripts/release.mjs "$g" {{level}} {{force}}
    done
    echo "==> releasing lobby (last — ships the accumulated tile-version bumps)"
    node {{root}}/scripts/release.mjs lobby {{level}} {{force}}

# ============================================
# PER-APP RECIPES — retired, and what replaced each one
# ============================================
# dev-tempest / dev-lobby   -> `just serve`   (one dev server for the cabinet)
# test-tempest              -> `just test-one tempest`
# build-tempest/build-lobby -> `node scripts/build-app.mjs <id>`, or `just build-all`
#
# Every one of them was `cd {{root}}/<name> && npm run …`, and each named a script
# in a per-subrepo package.json. There are no subrepo directories and no per-app
# scripts: the root package.json is the only one with any. Left in place they would
# have failed on `cd` into a directory that does not exist — a per-game recipe is
# not worth keeping alive as a synonym for a generic one that takes the id.
