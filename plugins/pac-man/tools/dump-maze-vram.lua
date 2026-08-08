-- plugins/pac-man/tools/dump-maze-vram.lua
-- Dumps Pac-Man video RAM (0x4000-0x43ff) + colour RAM (0x4400-0x47ff) to a
-- flat 2048-byte file once the attract-mode maze has drawn. MAME 0.288 API.
-- Env: MAZE_VRAM_OUT (output path), MAZE_VRAM_FRAME (frame to dump at).
--
-- NOTE (pm3-8 task 1): the brief specified emu.add_machine_frame_notifier, but
-- on this MAME 0.288 build that callback silently stops firing after ~200
-- invocations (no error, no machine reset, CPU/game keep running normally —
-- confirmed across -video none/-sound none/-nothrottle permutations and their
-- absence). emu.register_frame_done is the same per-frame-callback family in
-- the same `emu` Lua table and was verified to fire reliably past 1500+
-- frames, so it is used here instead.
local out = assert(os.getenv("MAZE_VRAM_OUT"), "set MAZE_VRAM_OUT")
local target = tonumber(os.getenv("MAZE_VRAM_FRAME") or "1500")
local n, done = 0, false
emu.register_frame_done(function()
  if done then return end
  n = n + 1
  if n < target then return end
  done = true
  local mem = manager.machine.devices[":maincpu"].spaces["program"]
  local f = assert(io.open(out, "wb"))
  for addr = 0x4000, 0x47ff do
    f:write(string.char(mem:read_u8(addr)))
  end
  f:close()
  print(string.format("[dump-maze-vram] wrote %s at frame %d", out, n))
  manager.machine:exit()
end)
