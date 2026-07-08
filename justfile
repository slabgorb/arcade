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

# Full CI sweep: orchestrator checks + every game
ci: test-orchestrator test-all build-all
    @echo "CI passed!"

# ============================================
# SERVE THE ARCADE (canonical)
# ============================================
# `just serve` is the ONE authoritative way to serve the arcade in dev. It runs
# the whole cabinet — the lobby shell plus every game — from THIS checkout on
# their pinned ports. The Cloudflare tunnel (arcade.slabgorb.com) is wired to the
# single canonical checkout that runs this; never serve the live arcade from a
# duplicate clone. Run `just install-all` once on a fresh checkout first.
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
