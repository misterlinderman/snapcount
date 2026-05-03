# Game design — Gridiron Rogue

> The rules. When this document and the code disagree, this document wins until it's updated. The HTML POC `gridiron-rogue-v2.html` is the visual reference and the math reference.

## Concept

Gridiron Rogue is a player-vs-CPU card football game. Two cards resolve against each other; higher effective power wins; the margin determines yards gained or lost. The football layer (4 downs, possession, field position, scoring, turnovers) gives that resolution meaning. A rogue-like season wraps it: 5 games, Draft Points (DP) earned through play, decks built between games.

The strategic tension lives in two decisions: **card selection** (which play type beats which defensive scheme) and **playmaker assignment** (which personnel multiplies your card's power). Reading the CPU's tendencies and matching the right playmaker to the right card type is the skill the game rewards.

## Design pillars

- **Accessible.** Playable in under 60 seconds. No rulebook required.
- **Mobile-first.** Single taps. One-handed.
- **Possession-authentic.** Roles hold for the full drive, the way real football works.
- **Read-and-react depth.** Matchup matrix rewards correct play-calling over raw power.
- **Rogue progression.** Deck identity builds across a 5-game season.

## Game loop

```
SEASON MAP (5 nodes)
   └── COIN TOSS — pick offense or defense for opening drive
        └── GAME (4 quarters × 8 plays)
             ├── DEAL — role-locked hand of 4 cards + 1 playmaker
             ├── SELECT — tap a card, tap a playmaker
             ├── SNAP — engine resolves, resolution stays on screen
             └── NEXT PLAY — manual advance to the next snap
        └── On TD: pick 1 of 3 reward upgrades, possession flips
        └── On Q4 end: Final Whistle
   └── LOCKER ROOM — spend DP on draft / upgrade / recruit
   └── Next node
Win all 5 → season complete
```

## Roles & possession

Roles are assigned at the **coin toss** and held for the entire drive. They flip on:

| Event | Result |
|-------|--------|
| Touchdown | Scoring team kicks off; receiving team takes over; roles flip |
| 4th-down failure | Turnover on downs; possession and roles flip |
| Fumble | Possession flips at the spot |
| Interception | Possession flips + 15-yard return in the new offense's direction |

Field direction: Red (Blitz FC) drives toward yard 100, Blue (Storm SC) toward yard 0. Yards in the engine are always offense-relative — positive = gain, negative = loss. A `dir` multiplier (+1 or −1) converts to field position.

## Cards

Cards are split into two completely separate pools. Players only ever receive cards matching their current role.

### Offensive cards

| Type | Label | Cards | Power | Notes |
|------|-------|-------|-------|-------|
| Run — Inside | `run-in` | HB Dive, FB Smash, Draw Play | 5–7 | Reliable; beats zone hard |
| Run — Outside | `run-out` | Sweep Right, Stretch Run | 5 | Higher upside; punished by Run D |
| Pass — Short | `pass-s` | Slant Route, Screen Pass, Curl Route | 5 | Beats blitz; weak vs. man |
| Pass — Medium | `pass-m` | Cross Route, Dig Route | 7 | Balanced; beats stacked box |
| Pass — Deep | `pass-d` | Post Route, Deep Ball | 8–9 | High ceiling; INT risk on big losses |
| Option / Trick | `option` | Read Option, Flea Flicker | 7–8 | ±3 chaos modifier on resolve |
| Rogue | `rogue` | Hail Mary, Film Study | 0 / 10 | Special effects |

### Defensive cards

| Type | Label | Cards | Power | Notes |
|------|-------|-------|-------|-------|
| Run Defense | `run-d` | Stack the Box, Gap Shoot, LB Blitz | 6–8 | Crushes runs; exposed to pass |
| Zone Coverage | `zone` | Cover 2, Cover 3 | 5–6 | Limits deep ball; screen-vulnerable |
| Man Coverage | `man` | Press Man, Bump & Run | 6–7 | Shuts short; big-play risk |
| Blitz | `blitz` | Safety Blitz, DB Blitz | 7–8 | Disrupts everything; countered by screen |
| Prevent | `prevent` | Prevent D | 4 | Low risk; situational late game |

### Special card rules

- **Film Study** (Offense / Rogue) — reveals the CPU's defense card for this play at no power cost. The matchup hint is shown in the resolution panel even when not played.
- **Hail Mary** (Offense / Rogue) — coin flip on snap: power becomes `20` or `0`.
- **False Start tendency penalty** — if the offense plays the same card type three plays in a row, the CPU reads it and the offense gets `−5 yards` applied to the result.

## Matchup matrix

Every snap applies a yard modifier based on the offensive type vs. the defensive type. The modifier is added to offensive power and subtracted from defensive power (i.e. it shifts the margin) before final comparison.

| Off ↓ / Def → | Run D | Zone | Man | Blitz | Prevent |
|----------------|-------|------|-----|-------|---------|
| **Run In**    | 0   | +4  | +3 | +1   | +3 |
| **Run Out**   | −2  | +4  | +2 | +1   | +2 |
| **Pass S**    | +3  | +1  | −2 | +3   | +2 |
| **Pass M**    | +4  |  0  | +1 | +2   | +2 |
| **Pass D**    | +5  |  0  | +2 | +4   |  0 |
| **Option**    | +1  | +2  | +1 | +1   | +2 |
| **Rogue**     |  0  |  0  |  0 |  0   |  0 |

Positive = favors offense. Negative = favors defense. The matchup label (e.g. "Screen destroys the blitz!") is shown in the resolution panel.

After a card is selected on offense, the **matchup hint panel** shows that card's edges against all defensive schemes — rewarding players who study tendencies.

## Power resolution formula

```
effective_power = (base_power + card_bonuses + power_boost) × playmaker_mult
final_power      = effective_power + matchup_modifier
```

### Card bonuses (applied before the multiplier)

| Condition | Bonus |
|-----------|-------|
| Sweep Right + RB playmaker | +3 |
| Screen Pass + QB playmaker | +3 (or +4 with Tunnel Screen upgrade) |
| Slant Route vs. opponent Blitz | +3 (or +4 with Hot Route upgrade) |
| Any Blitz card + LB playmaker | +1 |
| Any Run D card + MLB playmaker | +2 |

### Yards from the margin

```
margin = offense_final_power − defense_final_power

if margin > 0:   yards = max(1, round(margin × 1.2 + 2))     // offense wins
if margin < 0:   yards = −max(1, round(|margin| × 1.0))       // defense wins
if margin == 0:  yards = 1                                    // exact tie
```

Yards apply offense-relative; the engine multiplies by `dir` when updating field position.

## Playmakers

Two completely separate pools. The hand always includes one playmaker matching the current role.

### Offensive (starter)

| Pos | Name | Boost | Affinity |
|-----|------|-------|----------|
| QB | D. Sterling | ×1.5 | Pass S, Pass M, Pass D, Rogue |
| RB | J. Cannon | ×1.4 | Run In, Run Out |
| WR | T. Flash | ×1.3 | Pass S, Pass M, Pass D, Option |
| TE | M. Anchor | ×1.25 | Pass S, Pass M, Run In, Option |
| OL | B. Wall | ×1.2 | Run In (sack risk removed) |

### Defensive (starter)

| Pos | Name | Boost | Affinity |
|-----|------|-------|----------|
| DT | R. Mountain | ×1.4 | Run D |
| LB | K. Hammer | ×1.35 | Run D, Blitz |
| CB | D. Shadow | ×1.4 | Man |
| S  | L. Rover | ×1.3 | Zone, Blitz |
| DE | T. Edge | ×1.35 | Blitz, Run D |

**Affinity rule:** a playmaker's full boost only applies to a card in their affinity types. A mismatched assignment (QB on a Run card) still applies the base boost, but at a lower rate. This rewards reads without hard-blocking experimentation.

## Field & scoring

- Field is a 0–100 yard scale.
- 0 = Red (Blitz FC) endzone. 100 = Blue (Storm SC) endzone.
- Ball starts at 50 on kickoff and after scores.
- Red drives toward 100 (`dir = +1`), Blue toward 0 (`dir = −1`).
- **First down:** gain ≥ yardsToGo → reset down to 1, yardsToGo to 10.
- **4th-down field goal (v0.3):** when the user is on offense and it is 4th down, they may attempt a **field goal** (see v0.3 section) instead of a normal snap.
- **4th-down failure (snap):** possession flips at the spot, down resets.
- **Touchdown:** ball ≥ 95 (Red) or ≤ 5 (Blue) → 7 points (6 + auto PAT). Possession flips on the kickoff.
- **Interception:** possession flips + 15-yard return in the new offense's direction.
- **Fumble:** possession flips at the spot.
- **Quarter:** 8 plays. Game: 4 quarters.

## Rogue progression

### Draft Points (DP)

Earned during gameplay, spent in the Locker Room.

| Event | DP earned |
|-------|-----------|
| Offense wins a play | +1 |
| Defense wins a play | +1 |
| Touchdown | +2 |
| Game win | +3 (at Final Whistle) |

### TD reward picks

After every touchdown, three randomly drawn upgrades. Pick one:

| Upgrade | Effect |
|---------|--------|
| Hail Mary Card | Adds Hail Mary to the offense deck if not present |
| +2 Power Boost | All play cards +2 power for the rest of this game |
| Star Playmaker | Playmaker boost rises to ×1.8 for the rest of this game |
| +1 Draft Point | Bonus DP added immediately |

### Locker Room (between games)

Three spend tracks.

**Deck size (v0.3).** Total card **copies** in the deck (sum of all row `count` on offense and defense) is capped at **20**. Drafting while at the cap requires a **forced cut**: the client sends `cutCardIds` (ordered list of catalog card slugs); each entry removes **one copy** from the deck (first matching row on either side) **before** the new card is added.

**Track A — Draft new cards.** A random pool of 5 cards drawn each session.

| Rarity | DP cost | Examples |
|--------|---------|----------|
| Common | 1 | FB Smash, Cover 3, Bump & Run |
| Uncommon | 2 | Cross Route, Post Route, DB Blitz |
| Rare | 3 | Flea Flicker, LB Blitz, Hail Mary |
| Legendary | 5 | Film Study |

**Track B — Upgrade existing cards.** 2 DP each, one upgrade per card.

| Base | Upgrade | Effect |
|------|---------|--------|
| HB Dive | Power Run | Power 5 → 8 |
| Slant Route | Hot Route | +4 vs. Blitz (was +3) |
| Deep Ball | Touch Pass | INT risk removed on close losses |
| Safety Blitz | All-Out Blitz | Power 9; offense loss by 7+ → +10 yards |
| Cover 2 | Cover 2 Robber | Power 7; 30% INT chance on deep-ball losses |
| Screen Pass | Tunnel Screen | +4 vs. Blitz (was +3) |

**Track C — Recruit star playmakers.**

*Offensive recruits:*

| Pos | Name | Boost | DP |
|-----|------|-------|----|
| eQB | E. Knight | ×1.6 Pass + pre-snap peek (1×/game) | 4 |
| sRB | B. Rocket | ×1.55 Run — breaks tackles | 3 |
| sWR | C. Blaze | ×1.45 Short — auto +2 vs. Blitz | 3 |

*Defensive recruits:*

| Pos | Name | Boost | DP |
|-----|------|-------|----|
| MLB | T. Stone | ×1.5 Run D — stuffs every carry | 3 |
| FS | R. Banks | ×1.45 Zone — INT on deep losses | 3 |
| sCB | J. Lock | ×1.5 Man — nullifies top WR | 4 |
| OLB | D. Wreck | ×1.5 Blitz — forces fumble on TFLs | 4 |

### Deck guard rails

- Offensive playmaker pool cap: 4. Recruiting a 5th forces a drop.
- Defensive playmaker pool cap: 4.
- Card upgrades: one per card maximum.
- **Deck size (v0.3):** max **20** card copies; at-cap drafting uses **forced cut** (`cutCardIds`) as described under Locker Room.
- **Acquisition order:** each newly drafted card id is appended to `cardAcquisitionOrder` on the deck document for **rogue death**.

## v0.3 — Redraw, field goal, CPU weights, rogue death

### Redraw

- Costs **1 DP** per redraw.
- **At most 1 redraw per possession**; the flag resets when possession changes.

### Field goal (user on offense, 4th down only)

- Alternative to a normal snap. **3 points** if good.
- **Automatic make** if distance to the opponent goal line is **≤ 45 yards** (for Red offense: `100 - ballYard`; for Blue: `ballYard`).
- **Longer attempts:** success uses a random roll with probability decreasing as distance increases (see engine); a miss is a **turnover at the line of scrimmage** (possession flips, spot unchanged).
- Advances the **play clock** like any other scrimmage play.

### CPU play calling

- The CPU picks among its dealt cards using **weighted random** weights:  
  `effective power (with its dealt playmaker) + mean matchup modifier` vs. the **user’s dealt hand** on the relevant side (offense row vs. user defense types when the CPU is on offense; defense column vs. user offense types when the CPU is on defense).

### Rogue death

- When the **player loses** and the opponent’s margin is **≥ 14 points**, remove **up to three** cards by walking **`cardAcquisitionOrder` from the end** (most recent last), deleting one copy per entry until three cards are removed or the log is empty.

## Season map

5 game nodes on a linear progress track. Each game win advances one node. Win all 5 → season complete. The CPU's defensive card pool scales with `rogueWins` — starts at 4 cards, gains 1 per node.

## Visual & UI

The art direction is **newspaper sports desk meets broadcast scoreboard.** Ink-black masthead. Cream background. Red and blue strictly separated by team. Green for the field and active selection. Gold for playmaker accents and the status ticker.

### Type

- `Playfair Display SC` — scores, team names, positions, card power numerals, button labels.
- `Playfair Display` italic — card names, section headers, overlay titles.
- `Source Serif 4` italic — body text, card effects, instructions, labels.

### Color tokens

| Token | Hex | Use |
|-------|-----|-----|
| `--ink` | `#1a1814` | Text, masthead |
| `--ink2` | `#3d3a34` | Secondary bg, rogue bar |
| `--cream` | `#faf8f4` | Page bg, CPU section |
| `--white` | `#ffffff` | Card bg, player section |
| `--muted` | `#8a8478` | Labels |
| `--rule` | `#dbd7ce` | Dividers, borders |
| `--red` / `--red-mid` | `#b91c1c` / `#dc2626` | Blitz FC |
| `--blue` / `--blue-mid` | `#1d4ed8` / `#2563eb` | Storm SC |
| `--green-field` | `#166534` | Field, selection |
| `--green-turf` | `#14532d` | Field bg |
| `--gold` | `#b45309` | PM, ticker, DP |

### Card type badges

Each badge has a class. Don't add new ones without a doc update.

| Class | Type |
|-------|------|
| `badge-run-in` | Run Inside |
| `badge-run-out` | Run Outside |
| `badge-pass-s` | Pass Short |
| `badge-pass-m` | Pass Medium |
| `badge-pass-d` | Pass Deep |
| `badge-option` | Option / Trick |
| `badge-rd` | Run Defense |
| `badge-zone` | Zone Coverage |
| `badge-man` | Man Coverage |
| `badge-blitz` | Blitz |
| `badge-prevent` | Prevent |
| `badge-rogue` | Rogue |

### UI components

**Status ticker.** Two lines. `LIVE` shows the current instruction or play outcome. `LAST` shows the previous play, persisting across downs.

**Action bar.** Sticky bottom. Two slots whose contents change with phase:

| Phase | Left | Right |
|-------|------|-------|
| Select | ↺ Redraw (1 DP, 1× / possession) · FG on 4th | ⚡ Snap Play (disabled until card + PM picked) |
| Resolved | ↺ Redraw (disabled) | ▶ Next Play (pulsing) |

**Resolution panel.** After every snap, both cards (badge + name + effective power), the matchup label, and the play result. Winner highlighted green, loser dimmed. Stays on screen until the player taps Next Play.

**Overlays.** Coin Toss, TD Reward, Final Whistle, Locker Room, Deck Overview.

## Known issues / flags for the next pass

- Quarter clock is play-count based, not real time.
- Penalty system still partial beyond False Start.

## Versioning

This doc is updated for **v0.3** (Snapcount MERN). The HTML POC remains the legacy math reference where not superseded above. When adding rules, update this doc first, then the engine (server + client mirror), then routes and UI.
