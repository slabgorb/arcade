# Installation

How to get Tempest running locally. For gameplay, controls, and architecture, see
**[README.md](README.md)**.

> **Tempest is one app inside the `arcade` monorepo.** It has no repo, no
> lockfile, no `vite.config.ts` and no scripts of its own — `package.json` here is
> a `{name, version, private}` stub. Everything below runs from the **repo root**,
> not from inside `plugins/tempest/`.

---

## Prerequisites

- **Node.js 20.19+** (or 22.12+) — required by Vite 8. A current LTS release is
  recommended. (Developed on Node 25.9.)
- **npm 10+** — ships with Node. (Developed on npm 11.12.)
- A modern browser with HTML5 Canvas 2D support (any current Chrome, Firefox,
  Safari, or Edge).

Check your versions:

```bash
node --version
npm --version
```

---

## 1. Get the code

```bash
git clone https://github.com/slabgorb/arcade
cd arcade
```

---

## 2. Install dependencies

```bash
npm install
```

One install covers the whole cabinet — there is no per-app `npm install`. This
brings in the dev dependencies (TypeScript, Vite, Vitest). There are no runtime
dependencies: the game is plain TypeScript and the Canvas 2D API, and the shared
library it consumes (`@shared/*`) lives in this same repo at `src/shared/`.

---

## 3. Run the dev server — `just serve`

From the repo root:

```bash
just serve
```

One Vite dev server holds the whole cabinet on `http://127.0.0.1:5270/` — the
lobby at `/` and tempest at `/tempest/` (its `models.html` dev tool at
`/tempest/models.html`), served from these plugin sources. mg1-2 landed that; the
old per-game `npm run dev` on port 5273 went with the deleted `vite.config.ts`.

Unknown paths still fall back to the lobby's SPA shell, so an all-`200` sweep
proves nothing — a fallback answers 200 to everything. What tells routing from a
fallback is comparing a game path against a nonsense control and seeing them
DIFFER: `/tempest/` serves tempest while `/banana/` serves the lobby. That is what
`tests/canonical-serve.test.mjs` pins. Hot reload does not reach the games;
refresh the browser (mg1-14).

---

## 4. Run the tests

```bash
npm test                                      # every project in the monorepo
npx vitest run --project tempest              # tempest's suite only
npx vitest run --project tempest geometry     # a single file or pattern
npm run test:watch                            # re-run on change
```

Type-check everything with `npm run lint` (`tsc --noEmit` over the monorepo).

Tempest's fidelity audit carries a **citation gate** that must stay green:

```bash
npx vitest run --project tempest citations
```

That filter matches 4 files / 25 tests — the live gate only; `citation-gate-freeze`
is deliberately not named `*citations*`. The gate reads tempest's code as it stood
at the audit commit `4232ed4` via `git show`, so it needs the full history — a
shallow clone will fail it.

---

## 5. Build for production

Build tempest with `node scripts/build-app.mjs tempest` (→ `dist/tempest/`) from
the repo root. It emits two entries — the game (`index.html`) and the model
contact-sheet dev tool (`models.html`) — as a fully static site with no backend
or environment configuration. High scores are stored in the browser's
`localStorage`.

Releases and the Cloudflare R2 deploy path are described in the root
`justfile` and `docs/ops/hosting.md`. Release tags are `tempest-vX.Y.Z`.

---

## Troubleshooting

| Symptom | Cause & fix |
|---------|-------------|
| `npm install` fails on an engine/syntax error | Your Node is too old. Upgrade to Node 20.19+ (or 22.12+) — see [Prerequisites](#prerequisites). |
| The citation gate fails with a git error | Your clone is shallow, or the `audit/tempest` tag was not fetched. `git fetch --unshallow --tags`. |
| `npx vite` shows the lobby when you asked for `/tempest/` | Working as currently built — see [step 3](#3-run-the-dev-server--not-yet-available-for-tempest). Not a misconfiguration on your end. |

The gameplay-side symptoms this file used to list (blank canvas, mousewheel
scrolling the page, high scores not persisting) are held back until a dev server
can actually load tempest — there is no point troubleshooting a screen you cannot
reach yet.
