import { version } from './package.json'
import type { GameMeta, BuildSpec } from '@host/contract'

export const meta: GameMeta = {
  id: 'star-wars',
  title: 'STAR WARS',
  year: 1983,
  color: '#ffe81f',
  controls: ['AIM — Mouse', 'FIRE — Click / Space'],
  order: 2,
  listed: true,
  showcase: false,
  version,
}

// star-wars ships TWO dev-tool pages alongside the game.
export const build: BuildSpec = { entries: ['models.html', 'scenes.html'] }
