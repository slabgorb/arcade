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
    // Excluded from `vite build`. That is ALL this flag does here.
    //
    // It is specifically NOT what prevents this plugin recursing into the child
    // servers it creates. An earlier revision of this comment claimed it was, and
    // review refuted it against Vite's own source: `createServer()` always resolves
    // its config with command `'serve'` — `middlewareMode` included — and the plugin
    // filter KEEPS plugins whose `apply` equals the command. So an `apply: 'serve'`
    // plugin that reached a child's plugin list would run `configureServer` again
    // and spawn children forever.
    //
    // Two structural facts are the real guards, and both must hold:
    //   1. `defineAppConfig()` — the one thing shared between the build and every
    //      child — declares no `plugins` field at all, so a child spread from it
    //      has nothing to recurse with. Do not add one.
    //   2. `configFile: false` on the child `createServer()` call below stops Vite
    //      auto-discovering THIS file, whose default export is what actually
    //      carries `plugins: [serveTheCabinet()]`.
    // Removing either — on the belief that `apply` protects you — reintroduces
    // silent infinite recursion at server start.
    apply: 'serve',

    async configureServer(server) {
      for (const id of gameIds()) {
        children.set(
          id,
          await createServer({
            configFile: false,
            ...defineAppConfig({ id }),
            // ⚠ HOT RELOAD DOES NOT REACH THE GAMES. Sharing the parent's server
            // is what stops each child opening its own websocket on Vite's default
            // 24678, where six of the seven lose and print `Port is already in use`
            // on every start. But the parent's own socket then wins every upgrade,
            // so a game's HMR messages go nowhere. MEASURED: editing a file under
            // plugins/tempest/ delivers nothing to a game client, while editing one
            // under lobby/ delivers `full-reload` to the lobby's.
            //
            // The dev server is still fully usable — each child's WATCHER is live
            // and re-requesting a module returns fresh content, so a manual browser
            // refresh picks up every change. Only the automatic push is missing,
            // and no game had hot reload before this story either.
            //
            // Do not "fix" this by dropping the shared server: that trades a silent
            // gap for six errors per start AND still leaves six games without HMR.
            // `hmr: { server, path: '/<id>/@hmr' }` was tried and does not route
            // either. A real fix needs a per-child HMR port or a dispatching
            // websocket layer — filed as mg1-14.
            server: { middlewareMode: true, hmr: { server: server.httpServer ?? undefined } },
          }),
        )
      }

      // Installed BEFORE Vite's internal middlewares (a bare `use`, not a returned
      // post-hook) because the lobby's SPA fallback is one of them and would
      // otherwise answer `/tempest/` first — which is precisely the bug.
      server.middlewares.use((req: Connect.IncomingMessage, res, next: Connect.NextFunction) => {
        // The id is the first path segment, ended by `/`, `?`, `#` or the end of
        // the URL. A LOOKAHEAD, not a consuming match: `(?:\/|$)` looked equivalent
        // and silently dropped `/tempest?x=1` — the segment is followed by `?`,
        // which is neither a slash nor the end, so the whole match failed and the
        // request fell through to the lobby. A game path quietly serving the lobby
        // is the exact defect this story exists to remove, so the four shapes
        // `/tempest`, `/tempest/`, `/tempest?x=1` and `/tempest/?x=1` are pinned in
        // tests/canonical-serve.test.mjs.
        const id = /^\/([^/?#]+)(?=[/?#]|$)/.exec(req.url ?? '')?.[1]
        const child = id === undefined ? undefined : children.get(id)
        if (!child) return next()
        child.middlewares(req, res, next)
      })

      // The only cleanup path. A `closeBundle` hook stood here too and was deleted:
      // this plugin is `apply: 'serve'`, so it is excluded from builds entirely and
      // that build-only hook could never fire. Dead code shaped like the cleanup
      // path invites someone to fix a leak by editing the half that never runs.
      server.httpServer?.on('close', () => {
        // `.catch`, not a bare `void`: close() returns a promise, and a child whose
        // socket has already gone rejects — during teardown, where an unhandled
        // rejection is noise at best and a non-zero exit at worst. Nothing can be
        // done about a child that fails to close while the parent is closing, so
        // the rejection is swallowed deliberately rather than by omission.
        for (const child of children.values()) void child.close().catch(() => {})
      })
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
