import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'pac-man',
  title: 'PAC-MAN',
  year: 1980,
  color: '#ffcc00',
  controls: ['Joystick — ←↑↓→ / WASD'],
  order: 9,
  listed: true,
  showcase: false,
  version,
}
