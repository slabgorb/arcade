import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'centipede',
  title: 'CENTIPEDE',
  year: 1981,
  color: '#2aa358',
  controls: ['MOVE — Mouse / Arrows / WASD', 'FIRE — Click / Space'],
  order: 5,
  listed: true,
  showcase: true,
  version,
}
