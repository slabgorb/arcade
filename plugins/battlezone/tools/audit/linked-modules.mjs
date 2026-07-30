// The modules that actually shipped in the 1-SEP-81 Battlezone build. The
// authority is the LINK COMMAND STRING in BZONE.MAP, corroborated by BZONE.MAC:25's
// own header — NOT the directory listing, which is littered with decoys.
//
//   BIN:BZONE,BZONE.XX=OBJ:BZMTNS,BZONE,BZSOUN,VGUT,BZSTST
//
// Plus every module those objects pull in via `.INCLUDE` at assemble time — an
// included module produces real bytes/symbols just as surely as a linked one.
// Present in the quarry and citable:
//   VGMC    — BZMTNS.MAC:7, BZSTST.MAC:46 (VG macro set)
//   MBDIAG  — BZSTST.MAC:380 (Math Box diagnostic; shipped via the self-test)
//
// Shipped but ABSENT from the quarry — we cannot open them, so nothing can be
// cited against them (recorded as limitations, NOT citable):
//   VGAN   — BZMTNS.MAC:186          ASCVG  — BZONE.MAC:4267, BZSTST.MAC:44
//   TC65   — BZONE.MAC:1238 (coin)   COND65 — BZSOUN.MAC:3
//
// Rejected as never-shipped — the decoys that sit beside the real files:
//   BZSADG — stand-alone VG diagnostic (own .ASECT/.=0 org, MAXTST=5). Not linked.
//   COIN65 — present on disk but never included; the game includes TC65. COIN65 is
//            the *successor* coin routine ("ALL NEW PROGRAMS SHOULD USE THIS"), so it
//            looks authoritative and is code the cabinet never ran.
//   STATE2 — "VECTOR ROM ANALOG" AVG state-PROM utility. Absent from every link.
//   VCRMAN — "VECTOR ROM AUTONORMALIZING" build utility. Absent from every link.
//   MBUCOD — Math Box 2901 microcode. Real silicon, ported in @shared/math3d;
//            battlezone audits only its usage sites, never cites the microcode.
//   DLXAST — a stray Deluxe Asteroids binary. Not battlezone at all.
//
// Before adding anything: it must be on the BZONE.MAP link string, or `.INCLUDE`d
// (directly or transitively) by something that is. Anything else, however
// plausibly named, never assembled into the cabinet.
export const LINKED_MODULES = [
  // link string (BZONE.MAP)
  'BZMTNS', 'BZONE', 'BZSOUN', 'VGUT', 'BZSTST',
  // .INCLUDEd transitively, present in the quarry
  'VGMC', 'MBDIAG',
]
