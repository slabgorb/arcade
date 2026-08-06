import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'asteroids',
  title: 'ASTEROIDS',
  year: 1979,
  color: '#ff6a00',
  controls: ['ROTATE/THRUST — ←→↑ / WASD', 'FIRE — Space / K'],
  order: 3,
  listed: true,
  showcase: true,
  version,
}
