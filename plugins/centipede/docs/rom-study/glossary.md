# Glossary — the author's names vs ours

Ed Logg's names are not modern names. Translations, cited to the rev-1/rev-4
equates (`CENDEF.MAC` ≡ `CENDE4.MAC` apart from `.TITLE`).

| Source name | Means | Evidence |
|---|---|---|
| `ANT` | the **flea** | `ANTMV-MOVE ANT DOWN SCREEN` (`CENTI4.MAC:46`); `CENTIP.DOC:46` "Flea (ant, bomber, etc.)" |
| `BUG` | the **spider** | `BUGMV-MOVE BUG` (`CENTI4.MAC:285`); slot order (below) |
| `SCORP` | the **scorpion** | `CENTI4.MAC:2000`; `CENTIP.DOC:45` "Scorpion (mermaid, etc.)" |
| `MOBJ*` | the 16 motion-object slots | `MOBJP: .BLKB 16.` (`CENDEF.MAC:129`) |
| slots 0–11 | centipede segments (`NCENT =12.`) | `CENDEF.MAC:119` |
| slot 12 | flea (`ANTP =MOBJP+12.`) | `CENDEF.MAC:138` |
| slot 13 | spider (`BUGP =MOBJP+13.`) | `CENDEF.MAC:139` |
| slot 14 | player shot (`SHOTP =MOBJP+14.`) | `CENDEF.MAC:140` |
| slot 15 | player gun (`PLAYP =MOBJP+15.`) | `CENDEF.MAC:141` |
| `CENTIN` | the wave's centipede **length**, and the flea's spawn gate — no fleas while it is ≥ 12. | boot `CENTI4.MAC:1167-1169`; gate `:64-66`; per-wave walk `:464-470` |
| `CENTIS` | the wave's centipede **speed**, and the counter that paces `CENTIN`'s decrement | boot `CENTI4.MAC:1174-1176`; bumped `:2317`; read+reset `:464-476` |
| `PLYFLD` | playfield RAM `400-7BF`, 30 wide × 32 high | `CENDEF.MAC:61` |
| `SYNC` | the once-per-VBLANK frame flag the mainloop spins on | `CENIRQ.MAC:268`, `CENTI.MAC:17` |
| `FRAME` | 16-bit frame counter | `CENIRQ.MAC:269-271` |
| `GTIME` | BCD game-time counter, +1 per 256 frames ≈ 4 s | `CENDEF.MAC:277` |
| `MOOLAH` | coin-routine entry point (COIN65) | `CENIR4.MAC:398` |
| `WTCHDG` | watchdog register — pet once per frame | `CENTI.MAC:19` |
| `EAROM` | electrically alterable ROM — settings + high-score persistence | `CENTS4.MAC:85-165` |
| `ENDSCN` | end-of-screen/VBLANK status register at `0C00` | defined `CENDEF.MAC:74`; tested `CENIRQ.MAC:264` |
| "HIGH CORES" | high scores (the author's recurring typo) | `CENTI4.MAC:905,1001` |
