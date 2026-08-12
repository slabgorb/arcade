// tests/enemy-ground-facing-jt11-11.test.ts
//
// Story jt11-11 — RED phase (Han Solo / TEA). The enemy ground step is
// facing-blind, so a left-moving buzzard parks a RIGHTWARD launch airspeed.
//
// ─── THE DEFECT ──────────────────────────────────────────────────────────────
// jt11-3 made `stepGround` maintain `velXIndex` from the new state row's FLYVEL,
// signed by the caller-threaded `facing` (the UPDNO2 write). `frame.ts`'s
// `stepPlayerEntity` threads the player's PFACE in. `enemy.ts`'s `stepEntity`
// does NOT — it calls the 2-arg legacy form:
//
//     s = stepGround(s, input)              // enemy.ts, in `stepEntity`
//
// With `facing` undefined, `stepGround` takes its legacy branch and writes
// `+flyVel` unconditionally. So EVERY grounded enemy — whichever way it is
// walking — parks a POSITIVE (rightward) PVELX, and because takeoff (STFLY)
// inherits PVELX verbatim, a left-facing buzzard that flaps off a cliff launches
// to the RIGHT. That is the player-visible bug.
//
// ─── THE ROM GROUND TRUTH, MEASURED (not assumed) ────────────────────────────
// The story asks us to check "the ROM enemy ground loop, which signs PVELX by
// PFACE like UPDNO2". Measured against the vendored source, the truth is
// STRONGER than "like": there is no separate enemy ground loop. The enemy
// process is created at `CREEM` (JOUSTRV4.SRC:5663) and, once its transporter
// materialisation finishes, ends:
//
//     BSR   PLYINT      RE-INCARNATED ENEMY/PLAYER          (:5904)
//     LDD   CURJOY      GIVE CURRENT JOYSTICK               (:5905)
//     BRA   PLYRS2                                          (:5906)
//
// — and `PLYRS2` (:5952) is INSIDE the loop the file itself labels "MAIN
// RUNNING/STANDING/SKIDDING LOOP" (:5946-5948), the very loop players run. The
// enemy therefore executes UPDNO2 ITSELF, at the same addresses, with `U`
// pointing at its own workspace:
//
//     UPDNO2  LDX  PSTATE,U
//             LDA  6,X       UPDATE FICTISIOUS VELX FOR BUMPING   (:6000)
//             STA  PVELX,U                                        (:6001)
//     …       LDA  PFACE,U / BPL PL2RIT / NEG PVELX,U        (:6006-6008)
//
// Two corroborations that this sharing is deliberate, not incidental: the
// joystick is read through an INDIRECTION, `JSR [PJOY,U]` (:5951), which is the
// real stick for a player and the AI decision block for an enemy — exactly the
// `input` this port hands `stepEntity`; and the author's own branch comments in
// that loop read "BR=PLAYER/ENEMY WANTS TO MOVE / …TO FLAP" (:5836,:5841).
//
// PFACE is live for enemies, so the bug bites in play rather than only in
// theory: BODIR (:3876), B2DIR's `CLR PFACE,U` / `STA PFACE,U` (:4122,:4141)
// and SHDIRA (:4353,:4372,:4381) all write it.
//
// ─── WHAT THIS FIXES, AND WHAT IT DOES NOT ───────────────────────────────────
// Threading `facing` changes the SIGN of the maintained index. It does NOT
// re-route the enemy's ground-state transitions, because every brain in
// `enemy.ts` aims its `dir` at its own facing (`dir = enemy.facing`, and the
// shadow's `shdira` bump-aim is mirrored onto `facing` by `stepEnemyDetailed`).
// `dir === facing` means `onPlus` under BOTH the faced and the legacy branch.
// That premise is load-bearing — if it ever stops holding, the onMinus skid
// chain opens up for enemies — so it is pinned as an observation below rather
// than assumed silently. See the TEA assessment's Delivery Findings.
//
// ─── APPARATUS ───────────────────────────────────────────────────────────────
// Everything is driven through `stepEnemyDetailed` / `stepEnemy`, the seams
// production actually calls (`stepEntity` is module-private). Expected values
// are hand-read from the ROM STATE rows in the transcription pin below, so a
// mutated GROUND_STATES entry reddens IN THIS FILE rather than moving expected
// and actual together.

import { describe, it, expect } from 'vitest'
import { loadEnemy, type EnemyState } from './helpers/enemy-contract.js'
import { loadFlight, type EntityState } from './helpers/flight-contract.js'
import { loadArenaState } from './helpers/arena-state-contract.js'

/** Mid-CLIF5, the bottom island — clear of both lava-shore planks. */
const ISLAND_X = 100
/** `LNDB5` — CLIF5's snap row (arena.ts PLATFORMS, JOUSTRV4.SRC:6759). */
const CLIF5_SNAP_Y = 210

function entity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: ISLAND_X,
    posY: CLIF5_SNAP_Y << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: 'PLYCR',
    plantZ: 0,
    airborne: false,
    animPhase: 0,
    ...over,
  }
}

/**
 * A grounded shadow lord with NO target. Chosen deliberately: `shadow()`'s
 * null-target branch is `{ dir: facing, flap: enemyY > LAVA_ESCAPE_Y }`
 * (LAVA_ESCAPE_Y = $D3 = 211), and the island sits at 210 — so this enemy never
 * flaps and stays on the ground, which is what makes the ground step, rather
 * than a takeoff, the thing under test. Pinned as a premise below.
 */
function stander(facing: -1 | 1, over: Partial<EntityState> = {}): EnemyState {
  return {
    entity: entity(over),
    facing,
    pchase: 1,
    brain: 'shadow',
    decision: 'shadow',
  }
}

/**
 * A grounded DUMB enemy. `linet()` is `{ dir: facing, flap: pixelY > target &&
 * !rising }`; the island's 210 is below the lowest AOFF line ($D0 = 208), so
 * this one DOES flap — the takeoff case. Pinned as a premise below.
 */
function flapper(facing: -1 | 1, over: Partial<EntityState> = {}): EnemyState {
  return {
    entity: entity(over),
    facing,
    pchase: 0,
    brain: 'linet',
    decision: 'boundr',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The transcription pin — the one place the expected values are hand-read from
// the ROM rather than derived from the module, so a mutated table reddens here.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt11-11 — the STATE rows this story reasons over, hand-read', () => {
  it('PLYCR advances to PLYDR with your facing, and PLYDR carries FLYVEL 4', async () => {
    // JOUSTRV4.SRC:7165-7166, the STATE macro's operands, transcribed by eye.
    const f = await loadFlight()
    expect(f.GROUND_STATES.PLYCR.onPlus).toBe('PLYDR')
    expect(f.GROUND_STATES.PLYDR.flyVel).toBe(4)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Apparatus premises. Each of these can silently turn every test below into a
// vacuous pass, so each is asserted rather than assumed.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt11-11 premises — the fixture really is a grounded, non-flapping enemy', () => {
  it('the island spot is a PLATFORM, so "still grounded" means something', async () => {
    const f = await loadFlight()
    const a = await loadArenaState()
    const arena = a.initialArenaState()
    // The production predicate, at the production sample point: stepEntity asks
    // about the row one pixel BELOW the feet.
    const outcome = a.groundOutcomeInState(arena, f.groundMaskAt(ISLAND_X, CLIF5_SNAP_Y + 1, arena))
    expect(outcome.kind, `(${ISLAND_X}, ${CLIF5_SNAP_Y + 1}) must be CLIF5's deck`).toBe('platform')
  })

  it('the targetless shadow stays on the ground — no flap, no walk-off', async () => {
    const E = await loadEnemy()
    for (const facing of [-1, 1] as const) {
      const after = E.stepEnemyDetailed(stander(facing), { player: null }).enemy
      expect(after.entity.airborne, `facing ${facing}: the stander must not take off`).toBe(false)
      expect(after.entity.groundState, `facing ${facing}: still in a ground state`).not.toBeNull()
    }
  })

  it('the dumb flapper DOES leave the ground — the takeoff cases are real', async () => {
    const E = await loadEnemy()
    for (const facing of [-1, 1] as const) {
      const after = E.stepEnemyDetailed(flapper(facing), { player: null }).enemy
      expect(after.entity.airborne, `facing ${facing}: the flapper must take off`).toBe(true)
    }
  })

  it('the cliff look-ahead does not turn the fixture — the facing under test is the one we set', async () => {
    const E = await loadEnemy()
    for (const facing of [-1, 1] as const) {
      const steered = E.steerWake(stander(facing), null)
      expect(steered.turned, `facing ${facing}: mid-island must not be a cliff turn`).toBe(false)
      expect(steered.enemy.facing, `facing ${facing}: facing survives the look-ahead`).toBe(facing)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the maintained velXIndex is signed by the enemy's OWN facing.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt11-11 AC-1 — the ground step signs velXIndex by the enemy\'s facing', () => {
  it('THE BUG: a LEFT-facing grounded enemy parks a LEFTWARD velXIndex, not a rightward one', async () => {
    const E = await loadEnemy()
    const after = E.stepEnemyDetailed(stander(-1), { player: null }).enemy

    // PLYCR + dir(=facing) → PLYCR.onPlus = PLYDR, FLYVEL 4, negated for left.
    expect(after.entity.groundState, 'the transition itself is unchanged').toBe('PLYDR')
    expect(
      after.entity.velXIndex,
      'a buzzard walking LEFT must carry a LEFTWARD launch airspeed — ' +
        'the facing-less call parks +4 here (NEG PVELX, JOUSTRV4.SRC:6006-6008)',
    ).toBe(-4)
  })

  it('control: a RIGHT-facing grounded enemy is unchanged at +4 — no regression', async () => {
    const E = await loadEnemy()
    const after = E.stepEnemyDetailed(stander(1), { player: null }).enemy
    expect(after.entity.groundState).toBe('PLYDR')
    expect(after.entity.velXIndex, 'right-facing enemies must behave exactly as before').toBe(4)
  })

  it('the same fix reaches the thin `stepEnemy` wrapper, not only the detailed seam', async () => {
    // stepEnemy is what most callers (and tests/helpers/enemy-contract) use. If
    // the facing were threaded only into one of the two paths this reddens.
    const E = await loadEnemy()
    expect(E.stepEnemy(stander(-1), { player: null }).entity.velXIndex).toBe(-4)
    expect(E.stepEnemy(stander(1), { player: null }).entity.velXIndex).toBe(4)
  })

  it('every ground state, both facings: magnitude is the new row\'s FLYVEL, sign is the facing', async () => {
    const E = await loadEnemy()
    const f = await loadFlight()

    for (const st of Object.values(f.GROUND_STATES)) {
      for (const facing of [-1, 1] as const) {
        const after = E.stepEnemyDetailed(stander(facing, { groundState: st.id }), {
          player: null,
        }).enemy

        // Premise for this row: still grounded, facing untouched by the step.
        expect(after.entity.airborne, `${st.id}/${facing}: still grounded`).toBe(false)
        expect(after.facing, `${st.id}/${facing}: facing held`).toBe(facing)

        const nextId = after.entity.groundState
        if (nextId === null) throw new Error(`${st.id}/${facing}: lost its ground state`)
        const flyVel = f.GROUND_STATES[nextId].flyVel

        expect(
          Math.abs(after.entity.velXIndex),
          `${st.id}/${facing} → ${nextId}: magnitude is that row's FLYVEL (LDA 6,X / STA PVELX)`,
        ).toBe(flyVel)

        if (flyVel !== 0) {
          expect(
            Math.sign(after.entity.velXIndex),
            `${st.id}/${facing} → ${nextId}: the sign is PFACE's, not a hardcoded +`,
          ).toBe(facing)
        }

        // AC-5 — `flyVel * facing` leaks an Object.is-visible −0 into every
        // standing left-facing frame and into serialized replay fixtures.
        expect(
          Object.is(after.entity.velXIndex, -0),
          `${st.id}/${facing} → ${nextId}: no negative zero`,
        ).toBe(false)

        // The ladder invariant the facing-less call was already held to.
        expect(Number.isInteger(after.entity.velXIndex), `${st.id}/${facing}: integral`).toBe(true)
        expect(Math.abs(after.entity.velXIndex % 2), `${st.id}/${facing}: even`).toBe(0)
        expect(
          Math.abs(after.entity.velXIndex),
          `${st.id}/${facing}: within the FLYX ladder`,
        ).toBeLessThanOrEqual(f.MAX_VEL_X_INDEX)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — takeoff inherits the corrected direction. This is the felt defect.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt11-11 AC-2 — a left-moving enemy takes off LEFTWARD', () => {
  it('THE FELT BUG: a left-facing buzzard that flaps launches to the LEFT', async () => {
    const E = await loadEnemy()
    const f = await loadFlight()
    const after = E.stepEnemyDetailed(flapper(-1), { player: null }).enemy

    // It really took off (STFLY), rather than walking off an edge — otherwise
    // the velXIndex assertion below could pass for the wrong reason.
    expect(after.entity.airborne, 'premise: airborne').toBe(true)
    expect(after.entity.velY, 'premise: STFLY\'s impulse, not a walk-off\'s zero').toBe(
      f.TAKEOFF_VEL_Y,
    )
    expect(after.entity.groundState, 'premise: STFLY clears the ground state').toBeNull()

    expect(
      after.entity.velXIndex,
      'STFLY inherits PVELX verbatim, so the ground step\'s sign IS the launch ' +
        'direction: a buzzard walking left must not launch rightward',
    ).toBe(-4)
  })

  it('control: a right-facing buzzard still launches to the RIGHT', async () => {
    const E = await loadEnemy()
    const after = E.stepEnemyDetailed(flapper(1), { player: null }).enemy
    expect(after.entity.airborne).toBe(true)
    expect(after.entity.velXIndex, 'right-facing takeoff is unchanged').toBe(4)
  })

  it('the launch airspeed then carries the bird in the direction it was facing', async () => {
    // The end-to-end consequence, one frame further on: FLYX[velXIndex] must
    // move posX the way the bird was walking. Without this the fix could park a
    // correct-looking number that never reaches the integrator.
    const E = await loadEnemy()
    const launched = E.stepEnemyDetailed(flapper(-1), { player: null }).enemy
    const flown = E.stepEnemyDetailed(launched, { player: null }).enemy
    expect(
      flown.entity.posX,
      'a left-launched buzzard must travel LEFT on the next wake',
    ).toBeLessThan(launched.entity.posX)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — routing stays facing-relative, and (given every brain aims dir at its
// own facing) is UNCHANGED for enemies. The fix must be sign-only.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt11-11 AC-3 — threading facing must not re-route the enemy\'s ground states', () => {
  it('the resulting state is the facing-relative transition of the brain\'s own dir', async () => {
    const E = await loadEnemy()
    const f = await loadFlight()

    for (const st of Object.values(f.GROUND_STATES)) {
      for (const facing of [-1, 1] as const) {
        const fixture = stander(facing, { groundState: st.id })
        // Mirror production's order: look-ahead, then brain.
        const steered = E.steerWake(fixture, null)
        expect(steered.turned, `${st.id}/${facing}: premise — no cliff turn`).toBe(false)
        const decision = E.runBrain(steered.enemy, null)

        const row = f.GROUND_STATES[st.id]
        const want =
          decision.dir === 0
            ? row.onZero
            : decision.dir === steered.enemy.facing
              ? row.onPlus
              : row.onMinus

        const after = E.stepEnemyDetailed(fixture, { player: null }).enemy
        expect(
          after.entity.groundState,
          `${st.id}/${facing}: dir ${decision.dir} vs facing ${steered.enemy.facing}`,
        ).toBe(want)
      }
    }
  })

  it('OBSERVATION: every brain aims dir at its own facing, so onMinus stays unreachable', async () => {
    // Not an aspiration — the reason the fix is sign-only. If a future brain
    // ever aims away from its facing this reddens, and whoever sees it must
    // re-open the skid chain question for enemies (TEA Delivery Finding).
    const E = await loadEnemy()
    const f = await loadFlight()

    for (const brain of ['linet', 'boundr', 'b2undr', 'shadow'] as const) {
      for (const facing of [-1, 1] as const) {
        for (const st of Object.values(f.GROUND_STATES)) {
          const fixture: EnemyState = {
            ...stander(facing, { groundState: st.id }),
            brain,
            pchase: brain === 'linet' ? 0 : 1,
            decision: brain === 'linet' ? 'boundr' : brain,
          }
          const decision = E.runBrain(fixture, null)
          expect(
            decision.dir === 0 || decision.dir === facing,
            `${brain}/${st.id}/facing ${facing}: dir ${decision.dir} opposes facing — ` +
              'the onMinus skid chain is now reachable for enemies and needs its own ACs',
          ).toBe(true)
        }
      }
    }
  })
})
