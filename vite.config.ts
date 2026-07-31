// vite.config.ts — one factory, parameterised by app id. Replaces eight
// near-identical per-repo configs.
//
// Every game is served under /<id>/ on the single origin; the lobby is the root.
import { createServer, defineConfig, type Connect, type Plugin, type UserConfig, type ViteDevServer } from 'vite'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = import.meta.dirname

/** Every game id: the directories under plugins/. Read, never listed — the same
 *  rule scripts/build-app.mjs and the deploy workflow already follow. */
function gameIds(): string[] {
  return readdirSync(resolve(root, 'plugins'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

export interface AppSpec {
  /** App id: a game's directory name under plugins/, or 'lobby'. */
  id: string
  /** Extra HTML entries beyond index.html (e.g. tempest's models.html). */
  entries?: readonly string[]
}

export function defineAppConfig({ id, entries = [] }: AppSpec): UserConfig {
  const isLobby = id === 'lobby'
  const appRoot = isLobby ? resolve(root, 'lobby') : resolve(root, 'plugins', id)
  const input: Record<string, string> = { main: resolve(appRoot, 'index.html') }
  for (const entry of entries) {
    input[entry.replace(/\.html$/, '')] = resolve(appRoot, entry)
  }
  return {
    root: appRoot,
    base: isLobby ? '/' : `/${id}/`,
    resolve: {
      alias: {
        '@shared': resolve(root, 'src/shared'),
        '@host': resolve(root, 'src/host'),
      },
    },
    build: {
      outDir: isLobby ? resolve(root, 'dist') : resolve(root, 'dist', id),
      emptyOutDir: true,
      rollupOptions: { input },
    },
    // ONE dev server for the cabinet, but the pin still matters. strictPort alone
    // does NOT protect it: with 127.0.0.1:5270 held by another checkout (a-2, a-3),
    // an unpinned host lets Vite bind [::1]:5270 instead and two servers share the
    // port with no error — the silent-wrong-checkout trap td1-1 closed fleet-wide.
    // Collapsing eight ports to one reduces that surface; it does not remove it,
    // and a wrong-checkout server now serves the whole cabinet, not one game.
    server: { host: '127.0.0.1', port: 5270, strictPort: true },
    preview: { host: '127.0.0.1', port: 5270, strictPort: true },
  }
}

// ---------------------------------------------------------------------------
// The dev server's route table (mg1-2)
// ---------------------------------------------------------------------------
//
// One `vite` at the repo root serves the WHOLE cabinet: the lobby at `/`, and each
// game at `/<id>/` from its own plugin sources. Before mg1-2 it served the lobby at
// every path — `/`, `/tempest/`, `/tempest/models.html` and a nonsense `/banana/`
// all returned byte-identical HTML — because the default export's `root` is lobby/
// and every unmatched path was that one app's SPA fallback.
//
// HOW, and why it is not a URL rewrite. Each game is served by its OWN Vite dev
// server in `middlewareMode`, built from the SAME `defineAppConfig(id)` the build
// uses, and mounted here under its `/<id>/` prefix. That config already sets
// `root` to the plugin and `base` to `/<id>/`, so each child resolves its own
// files, rewrites its own HTML and answers its own `/<id>/src/...` requests
// exactly as it does when built — no path mapping and no HTML rewriting is
// hand-rolled here, and dev cannot drift from the build because there is one
// definition of both.
//
// A hand-rolled rewrite is specifically what this AVOIDS, and the reason is
// concrete: every plugin's index.html AND lobby/index.html reference the same
// absolute specifier `/src/main.ts`. That is unambiguous only because each app is
// served with its own `root`. A single server rooted higher up would hand a game
// the LOBBY's bootstrap — real JavaScript, right content-type, wrong app, and no
// error anywhere. Giving each app its own root keeps the specifier meaning what it
// has always meant.
//
// `/banana/` and any other unknown path still fall through to the lobby's SPA
// fallback, unchanged. That is deliberate: mg1-2 adds routes, it does not change
// how unknown paths are handled.
//
// Pinned behaviourally by `the one dev server serves the whole cabinet, not one
// app at every path` in tests/canonical-serve.test.mjs, which spawns this server
// and compares each game against a nonsense control.
function serveTheCabinet(): Plugin {
  const children = new Map<string, ViteDevServer>()

  return {
    name: 'arcade:serve-the-cabinet',
    // Dev only. `defineAppConfig` is also what each CHILD is built from, so this
    // plugin must never end up inside it — a child that mounted its own children
    // would recurse forever.
    apply: 'serve',

    async configureServer(server) {
      for (const id of gameIds()) {
        children.set(
          id,
          await createServer({
            configFile: false,
            ...defineAppConfig({ id }),
            server: { middlewareMode: true, hmr: { server: server.httpServer ?? undefined } },
          }),
        )
      }

      // Installed BEFORE Vite's internal middlewares (a bare `use`, not a returned
      // post-hook) because the lobby's SPA fallback is one of them and would
      // otherwise answer `/tempest/` first — which is precisely the bug.
      server.middlewares.use((req: Connect.IncomingMessage, res, next: Connect.NextFunction) => {
        const id = /^\/([^/?#]+)(?:\/|$)/.exec(req.url ?? '')?.[1]
        const child = id === undefined ? undefined : children.get(id)
        if (!child) return next()
        child.middlewares(req, res, next)
      })

      server.httpServer?.on('close', () => {
        for (const child of children.values()) void child.close()
      })
    },

    async closeBundle() {
      for (const child of children.values()) await child.close()
      children.clear()
    },
  }
}

// The default export is the LOBBY's config plus the cabinet router above: the
// lobby owns `/` here for the same reason it owns the bucket's root keys in
// production.
export default defineConfig({
  ...defineAppConfig({ id: 'lobby' }),
  plugins: [serveTheCabinet()],
})
