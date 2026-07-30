import { version } from './package.json'
import type { GameMeta, BuildSpec } from '@host/contract'

// listed: false — red-baron is provisioned but not finished enough for the
// cabinet floor. Under the old hand-maintained registry this was an OMISSION
// nobody had recorded a reason for; here it is a statement.
export const meta: GameMeta = {
  id: 'red-baron',
  title: 'RED BARON',
  year: 1980,
  color: '#d43b3b',
  controls: ['FLY — Mouse / Arrows', 'FIRE — Click / Space'],
  order: 7,
  listed: false,
  showcase: false,
  version,
}

// red-baron ships the model contact sheet too.
export const build: BuildSpec = { entries: ['models.html'] }
