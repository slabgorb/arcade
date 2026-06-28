# Narrative

## Problem Statement
Problem: Visiting the arcade's front door (`arcade.slabgorb.com`) sent players directly into the *Tempest* game instead of the lobby. Why it matters: An arcade without a lobby is like a theme park where the entrance dumps you onto one random ride — there's no welcome experience, no way to browse or choose, and no sense of place. First impressions matter, and the old behavior was confusing and unprofessional.

---

## What Changed
Think of the arcade like a shopping mall. The lobby is the main entrance with a directory. *Tempest* is one of the stores inside.

Before this fix, typing the arcade's address into a browser skipped the lobby entirely and dropped you straight inside *Tempest*. We corrected the traffic signs — the front door now opens into the lobby, where players can see what's available and choose where to go. *Tempest* still has its own direct address (`/tempest/`) for players who want to go straight there.

---

## Why This Approach
The routing fix was made at the network layer — specifically in the Cloudflare tunnel configuration that controls how web addresses map to running services. This is the right place to fix it because:

1. **It's the single source of truth.** All traffic passes through this one config before it reaches any game or page.
2. **No application code changed.** The games themselves didn't need to be touched, which means no risk of introducing new bugs in the game logic.
3. **It scales.** When we add a second or third game, we add one new routing rule — the lobby stays the front door automatically.

---

## Before/After
| | Before | After |
|---|---|---|
| **User visits `arcade.slabgorb.com`** | Lands directly in *Tempest* game | Lands in arcade lobby |
| **Player experience** | Disorienting — no context, no choice | Welcomed — can browse and select |
| **Discovery of other games** | Impossible from root URL | Lobby lists available games |
| **Direct game URL (`/tempest/`)** | Works | Still works — unchanged |
| **Risk of change** | — | Zero (no application code modified) |
| **Who was affected** | Any user who typed or bookmarked the root domain | Fixed for all users automatically |
