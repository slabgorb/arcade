# DevOps Gotchas

Common pitfalls encountered during DevOps (infra / hosting / release) work.

---

### Adding a game to Cloudflare (R2 bucket + DNS custom domain) with the LOCAL wrangler OAuth login — `zone (read)` is enough, and wrangler CANNOT touch the rewrite rule

**Situation:** Step 1 of `docs/ops/hosting.md` "Adding a new game" — create the `arcade-<name>` R2
bucket and connect `<name>.slabgorb.com` — run from a dev machine using the LOCAL `wrangler` OAuth
login (`slabgorb@gmail.com`), NOT the per-repo `CLOUDFLARE_API_TOKEN` GH secret (that one is only
for CI's `dist/` upload).

**Commands (both reversible):**
```bash
wrangler r2 bucket create arcade-<name>
wrangler r2 bucket domain add arcade-<name> \
  --domain <name>.slabgorb.com \
  --zone-id fb170c3b3aef7d88f30ab94c5b6378c2 \
  --min-tls 1.2 -y
wrangler r2 bucket domain list arcade-<name>   # want enabled/ownership/ssl = active
```

**Gotcha — the `whoami` scope readout lies.** `wrangler whoami` shows only `zone (read)` (no `r2`,
no `zone`/`dns` write) — yet BOTH `r2 bucket create` AND `r2 bucket domain add` (which writes a DNS
record + provisions an edge cert into the LIVE zone) succeed. The R2 custom-domain flow does not
need a visible zone-write scope. Don't refuse the task on the scope list — attempt it.

**Gotcha — the zone id is NOT the account id.** `--zone-id` for slabgorb.com is
`fb170c3b3aef7d88f30ab94c5b6378c2`; the ACCOUNT id baked into the deploy workflow is
`a55aafa9b0691f828cd6864be28c1674`. Passing the account id where a zone id is wanted fails. Read the
real zone id off any sibling: `wrangler r2 bucket domain list arcade-tempest`.

**Gotcha — bucket-naming exception.** Every game bucket is `arcade-<name>` matching its domain —
EXCEPT the shared assets bucket, which is plain `arcade` (`arcade-assets.slabgorb.com` is a custom
domain on it). A wrong guess answers with the unhelpful "The specified bucket does not exist."

**Gotcha — wrangler CANNOT edit the zone rewrite rule.** The runbook's "confirm the zone
URL-rewrite rule's host list covers it" (the Transform Rule that appends `index.html` to
`/`-terminated paths) is a zone ruleset wrangler does not expose. If it is an explicit host list
rather than a `*.slabgorb.com` wildcard, the new host 404s at `/` until the host is added in the
Cloudflare dashboard. It only bites once `dist/` is deployed, so provisioning looks "done" while
the eventual site root is broken.

**Example (centipede, 2026-07-19):** `arcade-centipede` created and `centipede.slabgorb.com`
connected (ssl/ownership active, resolves to Cloudflare IPs). Still needed before it actually
serves: the game repo's `.github/workflows/deploy.yml` (copy a sibling, set `bucket: arcade-centipede`),
the `CLOUDFLARE_API_TOKEN` secret on the repo, and `just release centipede`. The lobby tile in
`registry.ts` was already added by the user.
