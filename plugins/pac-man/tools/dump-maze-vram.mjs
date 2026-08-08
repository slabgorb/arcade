#!/usr/bin/env node
// tools/dump-maze-vram.mjs — run MAME headless on the vendored `pacman` romset
// and dump video+colour RAM to reference/graphics/maze-vram.bin (pm3-8).
// One-time / human-run; never CI, never runtime. Requires MAME + ~/roms/pacman.zip.
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const toolsDir = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(toolsDir, '..')
const out = join(pluginRoot, 'reference', 'graphics', 'maze-vram.bin')
const romPath = process.env.PACMAN_ROMPATH || join(homedir(), 'roms')
// Default 1550: attract-mode maze draws in a burst around frame ~1520 and
// stays fully-dotted (240 dot tiles) through ~1630 before demo-play attract
// gameplay starts eating dots, so 1550 sits mid-plateau. Measured by scanning
// dot-tile counts every 10 frames across a full run (pm3-8 task 1).
const frame = process.env.MAZE_VRAM_FRAME || '1550'
// 90s: -nothrottle speed is not constant across the run (observed
// 5800%-8300%), and a MAZE_VRAM_FRAME retry up to 3000 (per the task brief's
// re-run guidance) took ~90 wall-clock seconds to land; 40s was too tight.
const seconds = process.env.MAZE_VRAM_SECONDS || '90'

const args = [
  'pacman',
  '-rompath', romPath,
  '-video', 'none',
  '-sound', 'none',
  '-nothrottle',
  '-seconds_to_run', seconds,
  '-autoboot_script', join(toolsDir, 'dump-maze-vram.lua'),
]
const r = spawnSync(process.env.MAME_BIN || 'mame', args, {
  stdio: 'inherit',
  env: { ...process.env, MAZE_VRAM_OUT: out, MAZE_VRAM_FRAME: frame },
})
if (r.status !== 0) {
  console.error(`mame exited ${r.status}; is MAME installed and ${romPath}/pacman.zip present?`)
  process.exit(1)
}
console.log(`dump complete: ${out}`)
