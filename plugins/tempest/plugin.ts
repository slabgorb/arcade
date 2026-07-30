import { version } from './package.json'
import type { GameMeta, BuildSpec } from '@host/contract'

export const meta: GameMeta = {
  id: 'tempest',
  title: 'TEMPEST',
  year: 1981,
  color: '#00eaff',
  controls: ['ROTATE — Wheel / ←→', 'FIRE — Click / Space'],
  listed: true,
  showcase: true,
  order: 1,
  version,
}

// tempest ships the model contact-sheet dev tool alongside the game.
export const build: BuildSpec = { entries: ['models.html'] }
