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

## 3. Run the dev server

```bash
npx vite
```

One Vite dev server serves the whole cabinet from the repo root. Hot module
replacement means edits under `plugins/tempest/src/` refresh the game
automatically.

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

It reads tempest's code as it stood at the audit commit `4232ed4` via
`git show`, so it needs the full history — a shallow clone will fail it.

---

## 5. Build for production

The monorepo's root build lands in a later stage of the migration; there is no
working `npm run build` yet. Don't run it expecting a tempest bundle. Once it
exists, tempest emits two entries — the game (`index.html`) and the model
contact-sheet dev tool (`models.html`) — as a fully static site with no backend
or environment configuration. High scores are stored in the browser's
`localStorage`.

Releases and the Cloudflare R2 deploy path are described in the root
`justfile` and `docs/ops/hosting.md`. Release tags are `tempest-vX.Y.Z`.

---

## Troubleshooting

| Symptom | Cause & fix |
|---------|-------------|
| The dev server's port is already in use | Stop whatever holds it (`lsof -i :<port>`), or pass `--port`. The cabinet's port is configured once, at the root. |
| `npm install` fails on an engine/syntax error | Your Node is too old. Upgrade to Node 20.19+ (or 22.12+) — see [Prerequisites](#prerequisites). |
| Blank black screen, no tube | Open the browser devtools console for errors, and confirm the dev server compiled without TypeScript errors. |
| Mousewheel scrolls the page instead of spinning | Click the canvas once to give it focus, then use the wheel. |
| High scores don't persist | The game uses `localStorage`. Private/incognito windows and "block all cookies" settings can disable it. |
| The citation gate fails with a git error | Your clone is shallow, or the `audit/tempest` tag was not fetched. `git fetch --unshallow --tags`. |
