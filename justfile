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
games := "tempest"

# Install dependencies in every game
install-all:
    @for g in {{games}}; do echo "==> $g"; (cd {{root}}/$g && npm install); done

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

# Full CI sweep across all games
ci: test-all build-all
    @echo "CI passed!"

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
