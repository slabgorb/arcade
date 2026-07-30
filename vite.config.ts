// vite.config.ts — one factory, parameterised by app id. Replaces eight
// near-identical per-repo configs.
//
// Every game is served under /<id>/ on the single origin; the lobby is the root.
import { defineConfig, type UserConfig } from 'vite'
import { resolve } from 'node:path'

const root = import.meta.dirname

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

// Bare `vite` / `vite dev` at the repo root serves the whole cabinet from the
// lobby's root: / is the lobby, /<id>/ is each game.
export default defineConfig(defineAppConfig({ id: 'lobby' }))
