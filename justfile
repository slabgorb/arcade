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
games := "tempest star-wars asteroids battlezone red-baron"

# Every servable subrepo (the lobby shell + all games), in launch order.
# `serve` and the install recipe below iterate this; game-only recipes use {{games}}.
subrepos := "lobby tempest star-wars asteroids battlezone red-baron"

# Install dependencies in every subrepo (lobby + games)
install-all:
    @for g in {{subrepos}}; do echo "==> $g"; (cd {{root}}/$g && npm install); done

# Run tests in every game
test-all:
    @for g in {{games}}; do echo "==> $g"; (cd {{root}}/$g && npm test); done

# Build every game
build-all:
    @for g in {{games}}; do echo "==> $g"; (cd {{root}}/$g && npm run build); done

# Git status across orchestrator + every game
status:
    @echo "=== arcade (orchestrator) ===" && git -C {{root}} status --short
    @for g in {{games}}; do echo "=== $g ==="; git -C {{root}}/$g status --short; done

# Run the orchestrator's own checks (canonical-serve contract regression guard)
test-orchestrator:
    @node --test 'tests/**/*.test.mjs'

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
# Serve the whole arcade (lobby :5270 + games) from this canonical checkout — Ctrl-C stops all
serve:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Serving the arcade from {{root}} (the canonical checkout)"
    echo "  lobby      → http://localhost:5270/lobby/"
    echo "  tempest    → http://localhost:5273/tempest/"
    echo "  star-wars  → http://localhost:5274/star-wars/"
    echo "  asteroids  → http://localhost:5275/asteroids/"
    echo "  battlezone → http://localhost:5276/battlezone/"
    echo "  red-baron  → http://localhost:5277/red-baron/"
    trap 'kill 0' EXIT
    (cd {{root}}/lobby && npm run dev) &
    (cd {{root}}/tempest && npm run dev) &
    (cd {{root}}/star-wars && npm run dev) &
    (cd {{root}}/asteroids && npm run dev) &
    (cd {{root}}/battlezone && npm run dev) &
    (cd {{root}}/red-baron && npm run dev) &
    wait

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
# RELEASE (develop → main + tag → CI deploys to R2)
# ============================================
# Cut a semver release of one subrepo: gate on tests+build, bump version on
# develop, merge to main, tag vX.Y.Z, push. The push to main triggers the
# repo's GitHub Actions deploy workflow (R2 upload).
# e.g. `just release tempest` (patch) or `just release tempest minor`
release name level="patch":
    node {{root}}/scripts/release.mjs {{root}}/{{name}} {{level}}

# Release every servable subrepo (lobby + games) at the same bump level
release-all level="patch":
    #!/usr/bin/env bash
    set -euo pipefail
    for s in {{subrepos}}; do
      echo "==> releasing $s"
      node {{root}}/scripts/release.mjs {{root}}/$s {{level}}
    done

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
