// vite.config.ts — one factory, parameterised by app id. Replaces eight
// near-identical per-repo configs.
//
// Every game is served under /<id>/ on the single origin; the lobby is the root.
// The old per-repo `strictPort` + `host: '127.0.0.1'` pinning is gone: there is
// exactly one dev server now, so there is no eight-way port collision to guard.
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
  }
}

// Bare `vite` / `vite dev` at the repo root serves the whole cabinet from the
// lobby's root: / is the lobby, /<id>/ is each game.
export default defineConfig(defineAppConfig({ id: 'lobby' }))
