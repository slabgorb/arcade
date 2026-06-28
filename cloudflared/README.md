# Cloudflare tunnel — arcade routing

The live arcade ([arcade.slabgorb.com](https://arcade.slabgorb.com)) is served
through a Cloudflare tunnel. This directory is the **canonical, checked-in
reference** for how that tunnel routes the arcade host. It exists because the
runtime config lives outside the repo and would otherwise be lost on a fresh
machine.

## The front door is the lobby

`arcade.slabgorb.com` must land on the **lobby** (the vector menu), not drop
visitors straight into a game. Routing is path-based across the cabinet's
separate Vite dev servers:

| Request | Origin | Why |
|---|---|---|
| `/tempest/*` | `http://localhost:5273` | Tempest dev server (Vite base `/tempest/`) |
| `/star-wars/*` | `http://localhost:5274` | Star Wars dev server (Vite base `/star-wars/`) |
| `/lobby/*` | `http://localhost:5270` | Lobby dev server (Vite base `/lobby/`) |
| `/` (root) | `http://localhost:5270` | Lobby; Vite 302-redirects `/` → `/lobby/` |
| everything else | `http://localhost:5270` | Lobby catch-all |

Rules are evaluated **first-match, top-to-bottom**, so the per-game rules
(`/tempest/`, `/star-wars/`) must come before the lobby catch-all (see
[`config.yml`](./config.yml)).

> **Regression guarded against:** previously the arcade host pointed straight at
> `:5273`, and Tempest's Vite base (`/tempest/`) 302-redirected the root into
> `/tempest/` — so the root bounced into the game and the lobby was unreachable.

## The runtime file is shared — do not clobber it

cloudflared reads `~/.cloudflared/config.yml`. **That file is shared with other,
non-arcade tunnels on this host** (e.g. `sidequest.slabgorb.com`). Do **not**
copy this directory's `config.yml` over it — you would delete the other routes.
Instead, splice the arcade ingress rules into the live file's `ingress:` list,
keeping them ahead of the terminal `- service: http_status:404`.

The credential `*.json` referenced by `credentials-file` is a secret and is
**not** checked in.

## Apply a change

1. Edit `~/.cloudflared/config.yml` (back it up first), mirroring the arcade
   block in this directory's [`config.yml`](./config.yml).
2. Validate before restarting (no downtime):
   ```bash
   cloudflared tunnel ingress validate
   # Confirm each route resolves as expected:
   cloudflared tunnel ingress rule https://arcade.slabgorb.com/          # -> :5270 (lobby)
   cloudflared tunnel ingress rule https://arcade.slabgorb.com/tempest/  # -> :5273 (tempest)
   cloudflared tunnel ingress rule https://sidequest.slabgorb.com/       # -> :5173 (unchanged)
   ```
3. Restart the tunnel that serves the arcade host so it re-reads the config.
   On this host the arcade is served by the manually-run `sidequest` tunnel
   process (`cloudflared tunnel run sidequest`, reading the default
   `~/.cloudflared/config.yml`):
   ```bash
   pkill -f 'cloudflared tunnel run sidequest'
   cloudflared tunnel run sidequest      # or however that process is normally launched
   ```
   > Restarting briefly drops **both** `arcade.slabgorb.com` and
   > `sidequest.slabgorb.com` (they share this tunnel). Do it intentionally.
4. Verify end-to-end (with `just serve` running so `:5270`/`:5273` are up):
   ```bash
   curl -sI https://arcade.slabgorb.com/          # 302 -> /lobby/
   curl -sI https://arcade.slabgorb.com/lobby/    # 200 (lobby)
   curl -sI https://arcade.slabgorb.com/tempest/  # 200 (tempest)
   ```
