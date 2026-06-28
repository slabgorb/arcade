**Setup before presenting:**
- Open a browser tab to `arcade.slabgorb.com` — let it load fully before the presentation.
- Have a second tab ready at `arcade.slabgorb.com/tempest/` as a reference.
- Have the Cloudflare config diff open in a code editor (dark theme, large font).

---

**Scene 1 — The Problem (Slide 2: Problem) [~2 min]**

Say: *"Let me show you what users experienced before this fix."*

Open a private/incognito browser window. Navigate to `arcade.slabgorb.com`. Show the audience that it lands on *Tempest* immediately — no lobby, no menu, straight into the game.

Say: *"There's no welcome screen. No way to know other games exist. You're just dropped into Tempest."*

Fallback: If live demo isn't available, show the screenshot on Slide 2 of the old behavior with the "Before" label.

---

**Scene 2 — The Fix in Action (Slide 3: What We Built) [~2 min]**

Switch to the pre-loaded tab with `arcade.slabgorb.com`.

Say: *"Here's the arcade today."*

Point to the lobby landing page. Show the navigation/game selector. Click through to *Tempest* via the lobby.

Say: *"Players now arrive at a lobby. They can browse, choose, and the experience feels intentional."*

Navigate directly to `arcade.slabgorb.com/tempest/` to show that the direct link still works.

Say: *"Direct links still work — players who bookmark the game go straight there. Nothing broke; we just fixed the front door."*

Fallback: Show the Before/After slide instead.

---

**Scene 3 — The Change Itself (Slide 4: Why This Approach) [~1 min]**

Switch to the code editor showing the Cloudflare config diff.

Say: *"This is the entire change — a handful of lines in a routing config. The root path `/` now points to the lobby service on port 5270. Tempest stays on its own path at port 5273. Simple, surgical, no game code touched."*

Fallback: Describe it verbally and point to the bullet on Slide 4.

---