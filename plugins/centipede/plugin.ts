import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'centipede',
  title: 'CENTIPEDE',
  year: 1981,
  color: '#2aa358',
  controls: ['Mouse'],
  order: 5,
  listed: true,
  showcase: true,
  version,
}
