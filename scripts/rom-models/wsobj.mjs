// star-wars WSOBJ.MAC parser.
//
// RADIX: WSOBJ.MAC has NO .RADIX of its own — it does `.INCLUDE WSCOMN`
// (WSOBJ.MAC:2), and WSCOMN.MAC:5 is `.RADIX 16`. So the file assembles in HEX
// and we seed the parser at 16. The two vertex macros differ ONLY in whether
// they force decimal:
//     .MACRO .P  -> .WORD .1'.*.S   the '. appends a decimal point -> DECIMAL
//     .MACRO .PH -> .WORD .1'*.S    no point -> current radix -> HEX
// `.PH` = "Point, Hex". Decoding those 26 vertices as decimal yields geometry
// at ~60% of true magnitude that looks plausible and is silently wrong.
//
// CONNECT: .LD a,b,c -> .BYTE a*4   (draw)  for every arg
//          .BD a,b,c -> .BYTE a*4+1 (pen UP) for the FIRST arg, then delegates
//                       the REST to .LD (draw). So .BD begins a new stroke.
//          .WL2 NAME aliases the previous .WL list (TW3/BK1/BK2/BK3/WG1 share TW1's).
//          .LEND ends a list.
//
// .WGD is NOT a .WL alias: it flags a "ground type" object (PORT, WPN, WFF,
// WFG, GND, WGA, WGB, BNK, TWR, STB) drawn by a direct-executing routine the
// dispatcher `JMP (U)`s into, rather than the interpretable .LD/.BD list. But
// direct-executing is not unstructured — the bodies are NOTHING BUT macro calls
// over point-table indices (PLOT / DRAWTO / BDRAWTO / ENDPLOT, plus MOVD for VG
// state), and BDRAWTO/DRAWTO is the very same pen idiom as .BD/.LD. So they
// parse into the SAME ConnectOp IR and all ten objects DO get connect data.
// Their indices are DECIMAL (DRAWTO forces it with the same trailing-dot trick
// .LD uses), so the .RADIX 16 hex trap does not bite here.
//
// ONE ROM ANOMALY SURVIVES: WFG's routine (WSOBJ.MAC:1844) is `DRAWTO 6,3`, but
// WFG shares WFF's SIX-point table (0..5) — index 6 does not exist. At runtime
// that reads a stale 7th slot of the transform scratch page: an out-of-bounds
// read in the original 1983 ROM, not a parser error. (Proof it is not our
// off-by-one: the other nine ground objects land EXACTLY filling [0, len-1].)
// It is transcribed verbatim, not clamped — this parser reports ROM truth and
// lets consumers filter, the same way the degenerate self-edge in RTH's .BD
// list is kept and filtered downstream.
//
// ANCHOR: a leading `.P 0,0,0` is the object centre — metadata, not a drawn
// point. It is CONDITIONAL: TIE has one, WFF does not. Draw lists index the
// table INCLUDING the anchor, so dropping it rebases the indices by -1.
//
// CONDITIONAL ASSEMBLY: `.IF NE,0` / `.ENDC` is MACRO-11's `#if 0` — "assemble
// if 0 != 0" is never true. WSOBJ.MAC wraps X-Wing's and Y-Wing's ENTIRE
// vertex bodies and draw-list bodies (not their `.WP`/`.WL` header lines) in
// `.IF NE,0`: they were compiled out of the shipped ROM. Skipped lines are
// never read as data. The `.WP XW`/`.WL XW` headers and XW's dropped
// `.P 0,0,0` anchor still execute (they sit BEFORE the `.IF`), so XW/YW would
// otherwise linger as content-free stubs (0 vertices, 0 connect); an object
// that had real data conditioned out from under it and ended up with
// NEITHER is reported as absent rather than as a misleading empty entry.
// Only `.IF NE,0` (always false) and `.IF EQ,0` (always true) are
// statically resolvable; any other `.IF` form throws rather than guessing.
//
// MACRO DEFINITIONS: `.MACRO name ... .ENDM` bodies are never data, tracked
// by a plain boolean so a `.S=` between a `.WP` and its first `.PH` row
// (WPN/WGA/WFF/PORT/GND all do this) can still re-sync the OPEN table even
// if a local macro (GND's `.PGND`) was defined in between.
//
// UNRECOGNIZED DIRECTIVES: inside an open `.WL` draw list OR an open `.WP`
// vertex table, any `.`-directive this parser doesn't recognize (e.g. `.D`,
// damage points) throws instead of silently dropping a point/row.
//
// .PGND: GND (the ground laser tower, WSOBJ.MAC:524-554) defines and uses a
// LOCAL vertex macro instead of `.P`/`.PH`:
//     .MACRO .PGND .A,.B,.C
//     .WORD .A'*.S,.B'*.S,.C'*.S-GD$MDT
//     .ENDM
// No arg carries a decimal-forcing dot (`.A'*.S`, not `.A'.*.S`) — same
// `.PH`-class trap: all three args are read in the CURRENT RADIX (hex), not
// decimal. The third coordinate also carries a left-to-right (MACRO-11 has
// no operator precedence) offset: `(C*S) - GD$MDT`. GD$MDT==0F00
// (WSOBJ.MAC:5, hex) = 3840; corroborated by WSMAIN.MAC:2599's independent
// `GD$MDT==1C00-200/2+200`, which left-to-right is
// `((0x1C00-0x200)/2)+0x200 = 0xF00` — same value. GND's leading
// `.PGND 0,0,0` is the object anchor (like `.P 0,0,0`), but because of the
// `-GD$MDT` offset its COMPUTED vertex is `[0,0,-3840]`, not `[0,0,0]` — so
// the anchor test below must run on the raw pre-scale/pre-offset args, not
// the computed vertex.
//
// PARTIAL CONDITIONAL DISABLE: an object that had SOME rows skipped by a
// false `.IF` but still ends up with real (nonzero) content left over is a
// state this data model cannot represent faithfully — reporting only the
// survivors as "the object" would silently misrepresent ROM truth. That
// throws. An object that ends up with NO content at all (XW/YW: their
// entire bodies sit inside the false `.IF`) is still dropped silently, same
// as before — the "compiled out entirely" case is unambiguous.
//
// .WL2 ALIAS SCOPE: `.WL2 NAME` aliases the IMMEDIATELY PRECEDING `.WL`
// list, not merely "the last `.WL` ever seen" — its macro (`.W$ LN,\TD$'A1
// ',.-1`, WSOBJ.MAC:1310) points at `. - 1`, valid only while the location
// counter still sits just past that `.WL`'s own `.BYTE 0` terminator. A
// `.LEND` (emits `.BYTE 0FF`) or a `.WGD` (switches to hand-coded ground-
// object assembly, WSOBJ.MAC:1313-1317) moves `.` past that window, so
// `lastList` is cleared on both — a `.WL2` after either has nothing valid
// to alias and throws via the existing "no preceding .WL" guard.
//
// .WPZ vs .WPZ2: `.WPZ` (WSOBJ.MAC:113-116) takes no name and only closes
// the open vertex TABLE ("GET START PC" / "CALC # OF POINTS" for the
// current TD$EQ entry). `.WPZ2 NAME` (WSOBJ.MAC:126-133) does that SAME
// close, but also allocates a brand-new shape ID for NAME and points its PC
// field at `.W0` — the just-closed table's own start address — so NAME
// shares that table's vertices, not a copy. `.W0` is a side effect of `.W$`
// (WSOBJ.MAC:109-110: `.W0=TD'A2''A1`), so `.WPZ2`'s first line ("GET START
// PC") re-reads whatever TD$EQ currently points at: if a `.WP` table is
// still open, THAT table is what gets closed and aliased; if it was already
// closed by a bare `.WPZ`, the alias chains to that same table instead —
// which is how three straight `.WPZ2` lines (TWR/BNK/STB, WSOBJ.MAC:555-557)
// all end up sharing GND's single vertex table. Real usage never leaves a
// dangling `.WPZ2` with nothing behind it, but a `.WPZ2` with no table ever
// closed (table and lastTable both null) throws rather than guessing.

import { stripComment, parseNum } from './source.mjs';

const WSCOMN_RADIX = 16; // WSCOMN.MAC:5, pulled in by WSOBJ.MAC:2
// WSOBJ.MAC:5 `GD$MDT==0F00`, radix 16 -> 0xF00 = 3840. Independently
// corroborated by WSMAIN.MAC:2599 `GD$MDT==1C00-200/2+200`, which MACRO-11's
// strict left-to-right (no precedence) evaluation resolves to the same
// value: ((0x1C00 - 0x200) / 2) + 0x200 = 0xF00 = 3840.
const GD_MDT = 0xf00;

const isZero = ([x, y, z]) => x === 0 && y === 0 && z === 0;

/** `.S=13.` / `.S=8` / `.S=30.*4` -> a number, in the current radix. */
function parseScale(expr, radix) {
  return expr.split('*').reduce((acc, term) => acc * parseNum(term.trim(), radix), 1);
}

export function parseWsobj(text) {
  const order = [];
  const objects = new Map();
  const get = (name) => {
    if (!objects.has(name)) {
      objects.set(name, {
        name, scale: 1, vertices: [], connect: [],
        anchorDropped: false, hasDrawList: false,
      });
      order.push(name);
    }
    return objects.get(name);
  };

  let radix = WSCOMN_RADIX;
  let scale = 1;
  let table = null;     // object currently receiving .P/.PH rows
  let list = null;      // object currently receiving .LD/.BD rows
  let lastList = null;  // for .WL2 aliasing
  let lastTable = null; // for .WPZ2 aliasing
  let wgd = null;       // object currently receiving PLOT/DRAWTO/BDRAWTO ops
  let lastWgd = null;   // for .WGD2 aliasing
  let inMacro = false; // inside a .MACRO ... .ENDM definition body
  const condStack = [];  // .IF / .ENDC nesting: true = keep, false = skip
  const conditionalActive = () => condStack.every(Boolean);
  // Objects that had real content (vertex or draw-list rows) conditioned
  // out by a false .IF while they were the open table/list. If nothing else
  // ever populated them, they're compiled-out drafts (XW/YW) — report them
  // as absent, not as a misleading zero-vertex stub.
  const disabledByConditional = new Set();

  const push = (obj, indices, firstIsBlank) => {
    indices.forEach((raw, i) => {
      // Draw lists are 1-based when an anchor was dropped; rebase to the
      // stored vertex array.
      const point = obj.anchorDropped ? raw - 1 : raw;
      obj.connect.push({ point, draw: !(firstIsBlank && i === 0) });
    });
  };

  // A `.WGD` body's ops, rebased onto the stored vertex array exactly as `.WL`'s
  // are. `PLOT` and `BDRAWTO`'s FIRST argument lift the pen; everything else
  // draws.
  //
  // THE ANCHOR. `PLOT 0` is commented "ASSUMES STARTING FROM CENTER" — index 0
  // is the object anchor, which this parser drops from `vertices` (rebasing
  // every draw index by -1). A pen-up move to the dropped anchor is therefore
  // metadata in the beam path exactly as the anchor vertex is metadata in the
  // point table: emit NOTHING, rather than a `point: -1` that would poison the
  // IR the moment anything drew from it.
  //
  // Note the anchor test is `raw === 0`, NOT `!raw`: index 0 is the anchor only
  // on the four objects that share GND's anchored table. On WPN/WFF/PORT there
  // is no anchor, so point 0 is a REAL vertex that the ROM both starts from and
  // draws back to (WPN's `DRAWTO 1,2,3,0` closes its outer rectangle onto it).
  const pushWgd = (obj, kind, indices) => {
    indices.forEach((raw, i) => {
      const penUp = kind === 'PLOT' || (kind === 'BDRAWTO' && i === 0);
      if (obj.anchorDropped && raw === 0) {
        // The beam origin IS the dropped anchor — metadata, contributes no op.
        if (kind === 'PLOT') return;
        // Any OTHER reference to it cannot be expressed once the anchor is
        // gone. Throw rather than silently emitting a negative index (or
        // dropping a stroke, which would splice the beam path and fabricate an
        // edge). No routine in WSOBJ.MAC does this — this is a guard.
        throw new Error(`${obj.name}: ${kind} references the dropped anchor (index 0): cannot rebase`);
      }
      obj.connect.push({ point: obj.anchorDropped ? raw - 1 : raw, draw: !penUp });
    });
  };

  for (const raw of String(text).split('\n')) {
    const code = stripComment(raw).trim();
    if (!code) continue;

    let m;

    // A .MACRO definition body must never be read as data — checked first
    // and unconditionally so a macro's OWN .IF/.IFF/.ENDC (MOVD/DRAWTO use
    // these) never touches condStack. `table`/`list` are deliberately left
    // untouched across the macro body: GND opens its table with `.WP GND`,
    // defines `.PGND` inline, then re-syncs its scale with `.S=` AFTER the
    // macro — nulling `table` here would strand that re-sync (finding 2).
    if (/^\.MACRO\b/i.test(code)) { inMacro = true; continue; }
    if (/^\.ENDM\b/i.test(code)) { inMacro = false; continue; }
    if (inMacro) continue;

    // Conditional assembly. Only the two literal forms this file actually
    // uses at top level are statically resolvable; anything else throws
    // rather than guessing which branch a real assembler would take.
    if ((m = /^\.IF\s+(.+)$/i.exec(code))) {
      const cond = m[1].trim();
      if (!conditionalActive()) {
        condStack.push(false); // nested inside an already-skipped block
      } else if (/^NE\s*,\s*0$/i.test(cond)) {
        condStack.push(false); // "assemble if 0 != 0" -> never
      } else if (/^EQ\s*,\s*0$/i.test(cond)) {
        condStack.push(true);  // "assemble if 0 == 0" -> always
      } else {
        throw new Error(`.IF ${cond}: cannot statically evaluate ("${code}")`);
      }
      continue;
    }
    if (/^\.ENDC\b/i.test(code)) {
      if (condStack.length === 0) throw new Error(`.ENDC with no matching .IF: "${code}"`);
      condStack.pop();
      continue;
    }
    if (!conditionalActive()) {
      // Skipped by a false .IF. If a table/list is open, remember it might
      // end up entirely empty because ITS content — not just some unrelated
      // later line — was compiled out.
      if (table) disabledByConditional.add(table);
      if (list) disabledByConditional.add(list);
      continue;
    }

    if ((m = /^\.RADIX\s+(\d+)$/i.exec(code))) { radix = parseInt(m[1], 10); continue; }
    if ((m = /^\.S\s*=\s*(.+)$/i.exec(code))) {
      scale = parseScale(m[1], radix);
      // .S= usually precedes .WP (TIE, XW, YW, ...) but for WPN/WGA/WFF/PORT
      // it comes AFTER .WP (WSOBJ.MAC:560-622) — always before their .P/.PH
      // rows, though. Re-sync the open table so its recorded scale isn't the
      // previous object's stale value. GND additionally opens a local
      // `.PGND` macro BETWEEN `.WP GND` and this `.S=` (WSOBJ.MAC:524-530);
      // the inMacro guard above no longer nulls `table` for that, so this
      // re-sync still lands on GND.
      if (table) table.scale = scale;
      continue;
    }

    if ((m = /^\.WP\s+([A-Z0-9_$]+)$/i.exec(code))) {
      table = get(m[1]); table.scale = scale; continue;
    }
    // Plain end-of-table: no name, nothing aliased. Remember what closed so
    // a following `.WPZ2` (or chain of them) has something to alias.
    if (/^\.WPZ\b/i.test(code)) { lastTable = table; table = null; continue; }
    if ((m = /^\.WPZ2\s+([A-Z0-9_$]+)$/i.exec(code))) {
      // If a table is still open (no bare .WPZ closed it first), .WPZ2
      // closes it right here — same as .WPZ — before aliasing.
      if (table) { lastTable = table; table = null; }
      if (!lastTable) {
        throw new Error(`.WPZ2 ${m[1]} has no preceding table to alias: "${code}"`);
      }
      // Shares the closed table's vertices BY REFERENCE (mirrors .WL2):
      // TWR/BNK/STB all point at GND's single point table, not a copy.
      // hasDrawList/connect stay at get()'s defaults (false/[]) — these are
      // .WGD ground objects with no draw list — unless a later .WL/.WL2
      // gives the alias its own list, which the existing machinery handles.
      const alias = get(m[1]);
      alias.vertices = lastTable.vertices;
      alias.scale = lastTable.scale;
      alias.anchorDropped = lastTable.anchorDropped;
      continue;
    }

    if ((m = /^\.WL\s+([A-Z0-9_$]+)$/i.exec(code))) {
      list = get(m[1]); list.hasDrawList = true; lastList = list; continue;
    }
    if ((m = /^\.WL2\s+([A-Z0-9_$]+)$/i.exec(code))) {
      // Shares the previous list BY REFERENCE, not a snapshot copy: in the
      // real file .WL2 lines for TW3/BK1/BK2/BK3/WG1 all appear right after
      // `.WL TW1` but BEFORE its `.BD` content is parsed (WSOBJ.MAC:1573-
      // 1578), so a copy taken now would capture an empty array. This
      // mirrors the ROM itself — `.WL2`'s `.-1` points the alias's line
      // pointer at the SAME address as the preceding `.WL`, i.e. one
      // physical list shared by every name. `list` is left untouched, so
      // .BD/.LD rows that follow keep landing in this same array.
      if (!lastList) throw new Error(`.WL2 ${m[1]} has no preceding .WL list to alias: "${code}"`);
      const alias = get(m[1]);
      alias.connect = lastList.connect;
      alias.hasDrawList = true;
      continue;
    }
    // .WGD / .WGD2 flag a "ground type" object (WSOBJ.MAC:1313 emits a plain
    // .BYTE 1 dispatch flag, vs. .WL's .BYTE 0) drawn by a direct-executing
    // routine the dispatcher `JMP (U)`s into, rather than the interpretable
    // .LD/.BD point-index list .WL produces. But direct-executing is NOT
    // unstructured: the bodies are nothing but macro calls over point-table
    // indices (see the .WGD BODY block below), so the SAME ConnectOp IR comes
    // out of them and `connectToEdges` needs no change.
    //
    // Both still close any open .WL list and clear `lastList`: a .WGD moves the
    // location counter past the window a following `.WL2`'s `. - 1` would need.
    if ((m = /^\.WGD\s+([A-Z0-9_$]+)$/i.exec(code))) {
      wgd = get(m[1]); wgd.hasDrawList = true; lastWgd = wgd;
      list = null; lastList = null;
      continue;
    }
    // `.WGD2 NAME` aliases the .WGD routine it sits beside — and the body
    // FOLLOWS both lines (`.WGD TWR` / `.WGD2 GND`, WSOBJ.MAC:1729-1730; `.WGD
    // WGA` / `.WGD2 WGB`, :1780-1781). So it must share the connect array BY
    // REFERENCE, exactly as .WL2 does: a snapshot copied at this line would
    // capture an empty array and the alias would ship with zero edges.
    if ((m = /^\.WGD2\s+([A-Z0-9_$]+)$/i.exec(code))) {
      if (!lastWgd) throw new Error(`.WGD2 ${m[1]} has no preceding .WGD routine to alias: "${code}"`);
      const alias = get(m[1]);
      alias.connect = lastWgd.connect;
      alias.hasDrawList = true;
      list = null; lastList = null;
      continue;
    }
    if (/^\.LEND\b/i.test(code)) { list = null; lastList = null; continue; }

    // --- .WGD BODY -----------------------------------------------------------
    // The four macros (WSOBJ.MAC:1629-1696) and their exact semantics:
    //
    //   PLOT n        begin a stroke run; the beam starts at point n, pen UP
    //   DRAWTO a,b,…  `.IRP` over the args — a VISIBLE line to each in turn
    //   BDRAWTO a,b,… BLANK move to `a`, then delegates b,… to DRAWTO
    //   ENDPLOT       end of routine
    //   MOVD …        writes VG scale/colour — STATE, never geometry
    //
    // BDRAWTO/DRAWTO is structurally identical to the .BD/.LD pen idiom above:
    // pen up on the first argument only, then draw the rest.
    //
    // RADIX: DRAWTO's body is `...NEW = ...1'.*10 + M.GDXS`. The `'.` appends a
    // decimal point, so the INDEX is forced DECIMAL — the `.RADIX 16` trap that
    // makes `.PH` vertices hex does NOT bite here. (The `*10` is the 16-byte
    // point-record stride, an address computation, not part of the index.)
    if (wgd) {
      if ((m = /^(PLOT|DRAWTO|BDRAWTO)\s+(.+)$/i.exec(code))) {
        const kind = m[1].toUpperCase();
        const indices = m[2].split(/[,\s]+/).filter(Boolean).map((a) => parseNum(a, 10));
        pushWgd(wgd, kind, indices);
        continue;
      }
      if (/^ENDPLOT\b/i.test(code)) { wgd = null; continue; }
      // MOVD is the ONLY non-geometry macro that occurs inside these bodies
      // (verified across all eight routines). It is skipped EXPLICITLY, by name.
      if (/^MOVD\b/i.test(code)) continue;
      // Anything else inside an open routine is unenumerated. Throw — never
      // widen this into silence, or a real geometry macro could vanish without
      // a trace. (Scoped to an OPEN body: ENDPLOT closes it, and WSOBJ.MAC is
      // full of ordinary 6809 assembly outside these routines.)
      throw new Error(`unrecognized macro inside an open .WGD routine: "${code}"`);
    }

    if (table && (m = /^\.(PH?)\s+(.+)$/i.exec(code))) {
      const hex = m[1].toUpperCase() === 'PH';       // .PH -> current radix (16); .P -> decimal
      const args = m[2].split(',').map((a) => parseNum(a.trim(), hex ? radix : 10));
      if (args.length !== 3) throw new Error(`.${m[1]} needs 3 args: "${code}"`);
      const v = args.map((n) => n * table.scale);
      // A leading (0,0,0) is the object anchor: metadata, dropped, and the
      // draw-list indices rebase by -1 to match.
      if (table.vertices.length === 0 && isZero(v)) { table.anchorDropped = true; continue; }
      table.vertices.push(v);
      continue;
    }

    // `.PGND` — GND's local vertex macro (WSOBJ.MAC:526-528). Like `.PH`,
    // neither arg carries a decimal-forcing dot, so all three read in the
    // CURRENT RADIX (hex), not decimal. The third coordinate then carries a
    // left-to-right `(C*S) - GD$MDT` offset (MACRO-11 has no operator
    // precedence). The anchor test below runs on the RAW args, not the
    // computed vertex, because the `-GD_MDT` offset means `.PGND 0,0,0`
    // computes to `[0,0,-GD_MDT]`, not `[0,0,0]`.
    if (table && (m = /^\.PGND\s+(.+)$/i.exec(code))) {
      const args = m[1].split(',').map((a) => parseNum(a.trim(), radix));
      if (args.length !== 3) throw new Error(`.PGND needs 3 args: "${code}"`);
      const [a, b, c] = args;
      const v = [a * table.scale, b * table.scale, c * table.scale - GD_MDT];
      if (table.vertices.length === 0 && isZero(args)) { table.anchorDropped = true; continue; }
      table.vertices.push(v);
      continue;
    }

    if (list && (m = /^\.(LD|BD)\s+(.+)$/i.exec(code))) {
      const indices = m[2].split(/[,\s]+/).filter(Boolean).map((a) => parseNum(a, 10));
      push(list, indices, m[1].toUpperCase() === 'BD');
      continue;
    }

    // While a draw list OR a vertex table is open, any `.`-directive that
    // fell through every recognized case above is unrecognized — e.g. `.D`
    // (damage point, WSOBJ.MAC:1340) inside a `.WL` list, unused today but
    // would silently drop a point if it ever appeared. Throw instead of
    // ignoring it; this is the same guarantee finding 1 needed for `.PGND`
    // (which silently vanished before this directive existed) generalized
    // so no future unhandled directive can recur.
    if ((table || list) && /^\./.test(code)) {
      const where = list ? '.WL list' : '.WP table';
      throw new Error(`unrecognized directive inside an open ${where}: "${code}"`);
    }
  }

  if (condStack.length !== 0) {
    throw new Error(`unterminated .IF: ${condStack.length} block(s) never closed by .ENDC`);
  }

  // Partial conditional disable: an object that had SOME rows compiled out
  // by a false `.IF` but still ends up with real (nonzero) vertices or
  // connect data left over cannot be reported as authoritative — the
  // survivors alone are not what the ROM actually contains, and there is no
  // way to know what the skipped rows would have added. Throw rather than
  // silently presenting a partially-disabled object as ROM truth. (This does
  // not fire on XW/YW today — their `.IF NE,0` blocks enclose their ENTIRE
  // bodies, so they end up wholly empty and fall through to the drop filter
  // below instead.)
  for (const o of disabledByConditional) {
    if (o.vertices.length > 0 || o.connect.length > 0) {
      throw new Error(
        `${o.name}: partially compiled out by a false .IF — some rows survived `
        + 'alongside skipped ones; cannot represent a partially-disabled object as ROM truth',
      );
    }
  }

  // XW/YW (finding 1): `.WP`/`.WL` headers and a dropped anchor point still
  // execute before their `.IF NE,0`, but every real vertex/draw row does
  // not — leaving a content-free stub. An object whose data was compiled
  // out and never replaced by anything real carries no ground-truth
  // information, so report it as absent rather than as a misleading
  // zero-vertex/zero-connect entry.
  return order
    .map((n) => objects.get(n))
    .filter((o) => !(disabledByConditional.has(o) && o.vertices.length === 0 && o.connect.length === 0));
}
