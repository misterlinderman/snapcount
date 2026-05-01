# Admin console

> Browser-based tooling for tuning the meta and supporting users. Lives at `/admin/*` in the client. Every admin action is server-gated by `requireAdmin`.

## Purpose

The whole point of building this on a server with editable content is so the meta isn't frozen at deploy time. The admin console exists to:

1. **Tune balance** without redeploying — adjust card power, matchup modifiers, playmaker boosts.
2. **Curate content** — add new cards, retire old ones, define new upgrades.
3. **Support users** — find a stuck session, inspect a user's deck, grant DP if a bug ate theirs.
4. **Monitor health** — see active users, win rates, average yards per matchup, abandoned sessions.

It is not a CMS. It is not a marketing tool. Anything outside the four bullets above belongs in a different surface.

## Navigation

```
/admin
  /dashboard          Health and balance metrics
  /cards              Catalog: list, edit, create, retire
  /playmakers         Catalog: list, edit, create, retire
  /matchups           The full matrix as an editable grid
  /upgrades           Catalog
  /users              User search, deck inspection, role assignment
  /sessions           Recent sessions for debugging
  /audit              Audit log of admin actions
```

Top-level admin layout has a sidebar. The whole tree is wrapped with `<RequireAdmin>` on the client and every `/api/admin/*` route is gated server-side.

## Screens

### Dashboard

A single page with five tiles:

- **Active users (24h)** — count + sparkline (7d).
- **Active sessions** — current count + bucket by season node.
- **Card win rate distribution** — histogram. Outliers (above 0.6 or below 0.35) are flagged red.
- **Matchup yard average heatmap** — the matrix grid colored by average yards gained for each off×def cell. Compares actual yards-per-play to the matrix's intended modifier so you can spot cells that play hotter or colder than designed.
- **Recent admin actions** — last 10 entries from the audit log.

Data comes from `GET /api/admin/stats`, recomputed every 5 minutes.

### Cards

Table with columns: Side, Type, Name, Base Power, Rarity, Active, Edit. Filters: side, type, rarity, active/inactive, name search.

Edit modal: same fields plus `notes`. Saving bumps the content cache version. Soft-delete only — the catalog never hard-deletes a card because existing sessions reference it.

### Playmakers

Same pattern as Cards. Fields: Side, Position, Name, Base Boost, Affinity Types (multi-select), Rarity, Recruit Cost, Special Effect.

### Matchups

The signature screen. The full matrix rendered as an editable grid. Each cell shows the modifier, the actual average yards from recent plays (so admins see where intent and reality diverge), and a label tooltip.

```
       Run D   Zone   Man   Blitz   Prevent
Run In   0      +4     +3    +1      +3      [edit row]
Run Out −2     +4     +2    +1      +2      [edit row]
...
```

Edit modes:
- **Cell** — click a cell, change the value inline.
- **Bulk** — switch to "Edit mode," change multiple cells, click Save.

Save bumps the matrix `version` field. Active sessions in mid-play continue to use the version they were already resolved against (the engine's content cache is keyed by version), so no in-flight game changes meaning beneath a player.

A label editor lives below the grid for the human-readable matchup descriptions ("Screen destroys the blitz!").

### Upgrades

Table: Base card → Upgrade name → Effect summary → DP cost → Active. Edit modal supports the structured `effect` field.

### Users

Search by email or display name. Click a user to see:

- Profile (email, displayName, role, stats, createdAt).
- All decks (read-only summary).
- Last 10 sessions with status and result.
- Buttons: **Promote to admin** / **Demote**, **Grant DP** (with reason), **Reset active session** (sets status to abandoned), **Impersonate read-only** (loads their session in view-only mode).

Every action is audit-logged.

### Sessions

Debugging surface. Filter by status, user, date range. Click a session to see:

- Full state and play log (timestamped events).
- Replay viewer — step through events one at a time, see what state existed before each play.
- **Force end** button — for stuck sessions. Audit-logged with a required reason.

### Audit log

Append-only. Every admin write — card edit, matrix change, user promotion, DP grant — appends a record:

```
{
  actor: 'auth0|abc',
  action: 'card.update',
  target: 'hb-dive',
  before: { basePower: 5 },
  after: { basePower: 6 },
  reason?: string,
  timestamp: Date
}
```

Filterable by actor, action, target, time range. Export to CSV.

## Safety rails

- **Soft delete only.** Cards, playmakers, upgrades all have `isActive`. Hard delete would orphan references.
- **Confirm dialogs** for destructive actions (deactivate card, force-end session, grant DP).
- **Reason required** for any user-impacting action (DP grants, force-end, impersonation).
- **Audit log is append-only.** No edits, no deletes. Cannot be turned off.
- **Two-admin rule for promotions.** Role changes require a second admin's confirmation. Implemented via a pending-promotions queue (post-v1.0).

## What admins can NOT do

- Read another user's password (Auth0 holds those, Snapcount never sees them).
- Edit another user's deck or session contents directly. They can grant DP, end a session, or annotate — never edit play history.
- Bypass the engine. Admin "force end" still goes through a route that emits a `GAME_END` event so analytics stay consistent.

## Implementation order

The admin console comes online in phases — see `docs/build/BUILD_PLAN.md`. Phase 4 ships read-only dashboards and the user search. Phase 5 ships the catalog editors (cards, playmakers, upgrades). Phase 6 ships the matchup matrix editor and audit log. Don't build the matrix editor before the catalog editors — the matrix grid needs a working `Card` admin to test against.
