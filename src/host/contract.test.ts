// src/host/contract.test.ts — the gate's own tests.
//
// validateMeta exists to REJECT. Seven manifests and every future game pass
// through it, so a test suite that only feeds it valid input would be the same
// defect in a new place: a check that reports success while checking nothing.
// Every field below therefore has at least one case that proves rejection, and
// the two failure modes that motivated the contract get their own cases —
// silent defaulting (`showcase`) and silent truthiness coercion (`listed`,
// `showcase`).

import { describe, it, expect } from 'vitest'
import { validateMeta } from './contract'

const valid = {
  id: 'tempest',
  title: 'TEMPEST',
  year: 1981,
  color: '#00eaff',
  controls: ['ROTATE — Wheel / ←→', 'FIRE — Click / Space'],
  order: 1,
  listed: true,
  showcase: true,
  version: '1.0.29',
}

/** `valid` minus one key — the shape a manifest that simply forgot a field has. */
function without(key: keyof typeof valid): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...valid }
  delete copy[key]
  return copy
}

describe('validateMeta', () => {
  it('accepts a well-formed manifest and returns it', () => {
    expect(validateMeta(valid, 'tempest')).toEqual(valid)
  })

  it('rejects an id that does not match its directory', () => {
    expect(() => validateMeta({ ...valid, id: 'tempest' }, 'star-wars')).toThrow(
      /id 'tempest' does not match directory 'star-wars'/,
    )
  })

  it('rejects a non-url-safe id', () => {
    expect(() => validateMeta({ ...valid, id: 'Tempest' }, 'Tempest')).toThrow(/url-safe/)
    expect(() => validateMeta({ ...valid, id: '1980s' }, '1980s')).toThrow(/url-safe/)
  })

  it('rejects an empty title', () => {
    expect(() => validateMeta({ ...valid, title: '' }, 'tempest')).toThrow(/title/)
  })

  it('rejects a non-hex colour', () => {
    expect(() => validateMeta({ ...valid, color: 'cyan' }, 'tempest')).toThrow(/color/)
  })

  it('rejects empty controls', () => {
    expect(() => validateMeta({ ...valid, controls: [] }, 'tempest')).toThrow(/controls/)
  })

  it('rejects a missing version', () => {
    const { version: _drop, ...noVersion } = valid
    expect(() => validateMeta(noVersion, 'tempest')).toThrow(/version/)
  })

  it('rejects a missing showcase flag rather than defaulting it', () => {
    // A falsy default would let a new game drop out of the carousel silently —
    // the exact invisible absence the flag exists to prevent.
    const { showcase: _drop, ...noShowcase } = valid
    expect(() => validateMeta(noShowcase, 'tempest')).toThrow(/showcase/)
  })

  it('rejects a non-object', () => {
    expect(() => validateMeta(null, 'tempest')).toThrow(/not an object/)
  })

  // ---------------------------------------------------------------------------
  // Beyond the brief: one rejection case per field, plus the coercion guards.
  // ---------------------------------------------------------------------------

  describe('shape', () => {
    it('rejects undefined, primitives and arrays as "not an object"', () => {
      // An array is `typeof 'object'` and would otherwise fall through to the id
      // check and be reported as a bad id — a misleading message for a manifest
      // that is not a manifest at all.
      for (const bad of [undefined, 'tempest', 42, true, [], [valid]]) {
        expect(() => validateMeta(bad, 'tempest')).toThrow(/not an object/)
      }
    })

    it('names the offending plugin in every message', () => {
      // The generator validates seven manifests in a loop; a message that does not
      // say which one is a hunt rather than a diagnosis.
      expect(() => validateMeta(null, 'joust')).toThrow(/plugins\/joust\/plugin\.ts/)
      expect(() => validateMeta({ ...valid, title: '' }, 'tempest')).toThrow(
        /plugins\/tempest\/plugin\.ts/,
      )
    })
  })

  describe('id', () => {
    it('rejects a missing or non-string id', () => {
      expect(() => validateMeta(without('id'), 'tempest')).toThrow(/id must be url-safe/)
      expect(() => validateMeta({ ...valid, id: 42 }, 'tempest')).toThrow(/id must be url-safe/)
    })

    it('rejects ids with characters that are not url-safe', () => {
      for (const id of ['star_wars', 'star wars', 'star.wars', 'STAR-WARS', '-tempest', 'tempest/']) {
        expect(() => validateMeta({ ...valid, id }, id)).toThrow(/url-safe/)
      }
    })

    it('accepts the seven real cabinet ids against their own directories', () => {
      // These are the directory names the migration actually created; the pattern
      // must not be so strict that it rejects the fleet it was written for.
      for (const id of [
        'tempest',
        'star-wars',
        'asteroids',
        'battlezone',
        'red-baron',
        'centipede',
        'joust',
      ]) {
        expect(validateMeta({ ...valid, id }, id).id).toBe(id)
      }
    })
  })

  describe('title', () => {
    it('rejects a missing or non-string title', () => {
      expect(() => validateMeta(without('title'), 'tempest')).toThrow(/title/)
      expect(() => validateMeta({ ...valid, title: 42 }, 'tempest')).toThrow(/title/)
    })
  })

  describe('year', () => {
    it('rejects a missing, non-numeric or fractional year', () => {
      expect(() => validateMeta(without('year'), 'tempest')).toThrow(/year/)
      expect(() => validateMeta({ ...valid, year: '1981' }, 'tempest')).toThrow(/year/)
      expect(() => validateMeta({ ...valid, year: 1981.5 }, 'tempest')).toThrow(/year/)
      expect(() => validateMeta({ ...valid, year: NaN }, 'tempest')).toThrow(/year/)
    })
  })

  describe('color', () => {
    it('rejects a missing, unprefixed, too-short or too-long hex colour', () => {
      expect(() => validateMeta(without('color'), 'tempest')).toThrow(/color/)
      expect(() => validateMeta({ ...valid, color: '00eaff' }, 'tempest')).toThrow(/color/)
      expect(() => validateMeta({ ...valid, color: '#12' }, 'tempest')).toThrow(/color/)
      expect(() => validateMeta({ ...valid, color: '#00eaff000' }, 'tempest')).toThrow(/color/)
      expect(() => validateMeta({ ...valid, color: '#gggggg' }, 'tempest')).toThrow(/color/)
    })

    it('accepts every colour the cabinet actually ships', () => {
      for (const color of ['#00eaff', '#ffe81f', '#ff6a00', '#00ff41', '#d43b3b', '#2aa358', '#f0a828']) {
        expect(validateMeta({ ...valid, color }, 'tempest').color).toBe(color)
      }
    })
  })

  describe('controls', () => {
    it('rejects a missing controls list, a non-array, and non-string entries', () => {
      expect(() => validateMeta(without('controls'), 'tempest')).toThrow(/controls/)
      expect(() => validateMeta({ ...valid, controls: 'FIRE — Space' }, 'tempest')).toThrow(/controls/)
      expect(() => validateMeta({ ...valid, controls: ['FIRE', 42] }, 'tempest')).toThrow(/controls/)
      expect(() => validateMeta({ ...valid, controls: [null] }, 'tempest')).toThrow(/controls/)
    })
  })

  describe('order', () => {
    it('rejects a missing, non-numeric or fractional order', () => {
      // Missing `order` is the live hazard: the tile sequence is curated, and an
      // absent field would sort the cabinet by whatever the generator coerced.
      expect(() => validateMeta(without('order'), 'tempest')).toThrow(/order/)
      expect(() => validateMeta({ ...valid, order: '1' }, 'tempest')).toThrow(/order/)
      expect(() => validateMeta({ ...valid, order: 1.5 }, 'tempest')).toThrow(/order/)
    })
  })

  describe('listed', () => {
    it('rejects a missing listed flag', () => {
      expect(() => validateMeta(without('listed'), 'tempest')).toThrow(/listed/)
    })

    it('does not coerce truthy or falsy values into a boolean', () => {
      // 'false' is truthy. A validator that accepted strings here would list a game
      // its manifest tried to hide.
      for (const listed of ['true', 'false', 0, 1, null]) {
        expect(() => validateMeta({ ...valid, listed }, 'tempest')).toThrow(/listed must be a boolean/)
      }
    })

    it('accepts an explicit false', () => {
      // red-baron's deliberate opt-out must survive validation, not trip it.
      expect(validateMeta({ ...valid, listed: false }, 'tempest').listed).toBe(false)
    })
  })

  describe('showcase', () => {
    it('does not coerce truthy or falsy values into a boolean', () => {
      for (const showcase of ['true', 'false', 0, 1, null]) {
        expect(() => validateMeta({ ...valid, showcase }, 'tempest')).toThrow(
          /showcase must be a boolean/,
        )
      }
    })

    it('accepts an explicit false without turning it into an omission', () => {
      expect(validateMeta({ ...valid, showcase: false }, 'tempest').showcase).toBe(false)
    })
  })

  describe('version', () => {
    it('rejects an empty or non-string version', () => {
      expect(() => validateMeta({ ...valid, version: '' }, 'tempest')).toThrow(/version/)
      expect(() => validateMeta({ ...valid, version: 1.0 }, 'tempest')).toThrow(/version/)
    })
  })

  describe('no silent coercion, defaulting or dropping', () => {
    it('returns exactly the keys it was given — nothing added', () => {
      // If a default ever creeps in, this is where it shows up.
      expect(Object.keys(validateMeta(valid, 'tempest')).sort()).toEqual(Object.keys(valid).sort())
    })

    it('preserves values byte-for-byte, including the em-dashes in controls', () => {
      const out = validateMeta(valid, 'tempest')
      expect(out).toEqual(valid)
      expect(out.controls).toEqual(['ROTATE — Wheel / ←→', 'FIRE — Click / Space'])
    })

    it('rejects an unknown key rather than passing it through', () => {
      // Deliberate: the manifests are copied from a registry whose shape had extra
      // fields, so an unknown key is far likelier to be stale data or a typo than
      // an intentional extension. Passing it through would carry it into the
      // generated registry unchecked.
      expect(() => validateMeta({ ...valid, colour: '#00eaff' }, 'tempest')).toThrow(
        /unknown key 'colour'/,
      )
    })

    it('names launchUrl specifically, because that is the key that will be copied in', () => {
      // The old hand-maintained registry keyed each tile to an absolute subdomain.
      // Every game now lives at /<id>/ on one origin, so a copied launchUrl is a
      // stale fact, not a field.
      expect(() =>
        validateMeta({ ...valid, launchUrl: 'https://tempest.slabgorb.com/' }, 'tempest'),
      ).toThrow(/launchUrl/)
      expect(() =>
        validateMeta({ ...valid, launchUrl: 'https://tempest.slabgorb.com/' }, 'tempest'),
      ).toThrow(/derived/)
    })
  })
})
