# arcade — project tasks
# Framework recipes imported from .pennyfarthing/justfile.pf

import '.pennyfarthing/justfile.pf'

root := justfile_directory()

default:
    @just --list

# ============================================
# GAMES (subrepos registered in repos.yaml)
# ============================================
# Space-separated list; add new game subrepos here.
games := "tempest star-wars asteroids battlezone red-baron centipede joust"

# Every servable subrepo (the lobby shell + all games), in launch order.
# `serve` and the install recipe below iterate this; game-only recipes use {{games}}.
subrepos := "lobby tempest star-wars asteroids battlezone red-baron centipede joust"

# Install dependencies in every subrepo (lobby + games), reconciling each subrepo's
# installed @arcade/shared against its pinned version. Uses `npm ci` where a git-dep pin
# has drifted (plain `npm install` keeps the cached old commit) — see scripts/deps-doctor.mjs.
install-all:
    @node {{root}}/scripts/deps-doctor.mjs {{subrepos}}

# Run tests in every game. A plain `@for ... ; done` one-liner runs under just's
# default `sh` with no `set -e` and no per-iteration tracking — a `for` loop's exit
# status is only its LAST iteration's, so every game's failure but the last was
# silently discarded (td1-10). Ported the `pull` recipe's pattern (below): explicit
# per-iteration failure accumulator, run every game (a fleet sweep should report the
# FULL set of red games, not just the first), then exit non-zero with a named summary.
test-all:
    #!/usr/bin/env bash
    set -uo pipefail
    failed=""
    for g in {{games}}; do
      echo "==> $g"
      if ! (cd {{root}}/$g && npm test); then
        failed="$failed $g"
      fi
    done
    if [ -n "$failed" ]; then
      echo
      echo "!! test-all FAILED:$failed"
      exit 1
    fi
    echo
    echo "test-all: all games passed."

# Build every game. Same masking defect and same fix as test-all (td1-10).
build-all:
    #!/usr/bin/env bash
    set -uo pipefail
    failed=""
    for g in {{games}}; do
      echo "==> $g"
      if ! (cd {{root}}/$g && npm run build); then
        failed="$failed $g"
      fi
    done
    if [ -n "$failed" ]; then
      echo
      echo "!! build-all FAILED:$failed"
      exit 1
    fi
    echo
    echo "build-all: all games passed."

# Git status across orchestrator + every game. Shares test-all/build-all's masking
# shape; fixed for consistency (td1-10) even though a `git status --short` failure
# here is rarer (a repo missing/not-a-checkout) and no test requires it.
status:
    #!/usr/bin/env bash
    set -uo pipefail
    failed=""
    echo "=== arcade (orchestrator) ==="
    if ! git -C {{root}} status --short; then
      failed="$failed arcade"
    fi
    for g in {{games}}; do
      echo "=== $g ==="
      if ! git -C {{root}}/$g status --short; then
        failed="$failed $g"
      fi
    done
    if [ -n "$failed" ]; then
      echo
      echo "!! status FAILED:$failed"
      exit 1
    fi

# Run the orchestrator's own checks (canonical-serve contract regression guard)
test-orchestrator:
    @node --test 'tests/**/*.test.mjs'

# Pull the orchestrator + every game, each onto its OWN default branch (main here,
# develop in the games) — never onto whatever branch happens to be checked out.
#
# `git pull --rebase origin develop` rebases the CURRENT branch onto origin/develop.
# Sitting on a feature branch, that replays your commits onto develop — and if the
# branch was already squash-merged, every file the story added returns as an add/add
# conflict and the checkout wedges mid-rebase. Git cannot see squash containment
# (a squash's patch-id matches none of the originals), so `git branch --merged` and
# `--cherry-mark` both insist the shipped work is unmerged. star-wars sat exactly
# there on 2026-07-16: feat/sw7-8-… had already shipped in v0.0.20, four files
# conflicting with themselves.
#
# So: only pull when the default branch is checked out. Otherwise advance the local
# ref with a refspec fetch (`git fetch origin develop:develop`), which updates develop
# without touching your working tree and is fast-forward-only — a diverged local
# develop fails loudly instead of being quietly rebased. Every repo is attempted even
# if an earlier one fails; the recipe exits non-zero listing whatever didn't land.
#
# Pull orchestrator + games onto their default branches (feature branches left alone)
pull:
    #!/usr/bin/env bash
    set -uo pipefail
    failed=""
    pull_one() {
      dir="$1"; name="$2"; target="$3"
      echo "==> $name"
      if ! cur=$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null); then
        echo "    !! not a git checkout — skipped"
        failed="$failed $name"
        return
      fi
      if [ "$cur" = "$target" ]; then
        git -C "$dir" pull --rebase --autostash origin "$target" || failed="$failed $name"
      else
        echo "    on '$cur', not '$target' — your checkout is left alone; advancing $target"
        if ! git -C "$dir" fetch origin "$target:$target"; then
          echo "    !! could not fast-forward $target — it has diverged from origin."
          echo "       Fetched anyway; reconcile by hand: git -C $dir log $target..origin/$target"
          git -C "$dir" fetch origin "$target"
          failed="$failed $name"
        fi
      fi
    }
    pull_one {{root}} "arcade (orchestrator)" main
    for g in {{games}}; do pull_one {{root}}/$g "$g" develop; done
    if [ -n "$failed" ]; then
      echo
      echo "!! pull incomplete:$failed"
      exit 1
    fi
    echo
    echo "pull complete."

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
# `just serve` is the ONE authoritative way to serve the arcade in dev. It runs
# the whole cabinet — the lobby shell plus every game — from THIS checkout on
# their pinned ports. Dev-only: the live arcade is R2 static hosting, updated by
# `just release <name>` (CI deploys on merge to main) or `just deploy` (manual
# fallback). Run `just install-all` once on a fresh checkout first.
#
# Serve the whole arcade (lobby :5270 + games) from this canonical checkout — Ctrl-C stops all.
# The launch/supervise logic lives in scripts/serve.mjs (td1-8): it names a server that
# fails to start, exits non-zero when one does, tears the rest down instead of hanging on
# a bare `wait`, and only prints a ready URL once that port is observed accepting a
# connection — see tests/serve-launcher.test.mjs for the behaviour this is required to have.
serve:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Serving the arcade from {{root}} (the canonical checkout)"
    # Preflight: a bumped @arcade/shared pin does not re-install under plain `npm install`,
    # so node_modules can serve stale bytes (the lobby once 500'd this way on a missing
    # /glow export). Reconcile installed vs pinned BEFORE launching — abort loudly on failure.
    node {{root}}/scripts/deps-doctor.mjs {{subrepos}}
    # No `trap ... EXIT` here on purpose: `kill 0` would SIGTERM this recipe's own
    # shell along with the fleet, so the recipe always died of signal 15 (143) no
    # matter what serve.mjs computed — silently re-erasing the exit code this story
    # exists to carry. Teardown (including each server's vite grandchild) now lives
    # in scripts/serve.mjs itself, so the code below simply propagates as this
    # recipe's own exit status.
    node {{root}}/scripts/serve.mjs {{root}}

# ============================================
# DEPLOY (R2 static hosting)
# ============================================
# Build every servable subrepo and push its dist/ to its R2 bucket
# (arcade-<name>) with correct content-types. Requires `wrangler` logged in.
# This is how the live arcade is updated — no local server, no tunnel.
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    for s in {{subrepos}}; do
      echo "==> building $s"
      (cd {{root}}/$s && npm run build)
      echo "==> deploying $s -> arcade-$s"
      node {{root}}/scripts/deploy-r2.mjs {{root}}/$s/dist "arcade-$s"
    done
    echo "Deploy complete."

# Deploy a single subrepo (e.g. `just deploy-one tempest`)
deploy-one name:
    #!/usr/bin/env bash
    set -euo pipefail
    (cd {{root}}/{{name}} && npm run build)
    node {{root}}/scripts/deploy-r2.mjs {{root}}/{{name}}/dist "arcade-{{name}}"

# ============================================
# ASSETS (the arcade-assets bucket — sfx / speech / music)
# ============================================
# Bake star-wars's POKEY music from the 1983 source and upload it to the assets
# bucket under star-wars/music/.
#
# ⚠ THE BUCKET IS CALLED `arcade`, NOT `arcade-assets`. The public hostname is
# arcade-assets.slabgorb.com, but the R2 bucket behind it is plain `arcade` —
# there is no bucket named arcade-assets, and asking for one fails with the
# gloriously unhelpful "The specified bucket does not exist". Every other bucket
# DOES match its domain (arcade-tempest, arcade-star-wars, …), so this one is the
# exception that will burn you.
#
# This is NOT part of CI, and deliberately so. The deploy workflows ship each
# app's dist/ and nothing else, so the assets bucket has always been filled by
# hand — which is exactly how star-wars shipped a complete music path pointing at
# four .wav files that did not exist, and stayed silent for an entire epic without
# a single error in the console.
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
    node {{root}}/star-wars/tools/music-bake/bake-music.mjs "$staging/star-wars/music"
    echo "==> baking star-wars sfx"
    node {{root}}/star-wars/tools/pokey-bake/bake-sfx.mjs "$staging/star-wars/sfx"
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
# RELEASE (develop → main + tag → CI deploys to R2)
# ============================================
# Cut a semver release of one subrepo: gate on tests+build, bump version on
# develop, merge to main, tag vX.Y.Z, push. The push to main triggers the
# repo's GitHub Actions deploy workflow (R2 upload).
# e.g. `just release tempest` (patch) or `just release tempest minor`
release name level="patch":
    node {{root}}/scripts/release.mjs {{root}}/{{name}} {{level}}

# Release every servable subrepo (lobby + games) at the same bump level.
# Games release FIRST so each one's version-bump lands on the lobby's develop
# (scripts/release.mjs syncs the tile via syncLobbyTileVersion); the lobby
# releases LAST so a single lobby deploy ships every accumulated tile bump.
# {{subrepos}} itself stays in launch order (lobby first) for serve/deploy —
# only the release order is special here.
release-all level="patch":
    #!/usr/bin/env bash
    set -euo pipefail
    for s in {{subrepos}}; do
      [ "$s" = "lobby" ] && continue
      echo "==> releasing $s"
      node {{root}}/scripts/release.mjs {{root}}/$s {{level}}
    done
    echo "==> releasing lobby (last — ships accumulated tile-version bumps)"
    node {{root}}/scripts/release.mjs {{root}}/lobby {{level}}

# ============================================
# tempest
# ============================================

# Start the tempest dev server (http://localhost:5273)
dev-tempest:
    cd {{root}}/tempest && npm run dev

# Run tempest tests
test-tempest:
    cd {{root}}/tempest && npm test

# Build tempest
build-tempest:
    cd {{root}}/tempest && npm run build

# ============================================
# lobby
# ============================================

# Start the lobby dev server (http://localhost:5270/lobby/)
dev-lobby:
    cd {{root}}/lobby && npm run dev

# Build the lobby
build-lobby:
    cd {{root}}/lobby && npm run build
