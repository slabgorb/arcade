import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'joust',
  title: 'JOUST',
  year: 1982,
  color: '#f0a828',
  controls: ['MOVE — ←→ / A D', 'FLAP — Space / Shift'],
  order: 6,
  listed: true,
  showcase: false,
  version,
}
