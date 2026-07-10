# Maple Ave Arcade

The right strip on **Maple Ave.** is an arcade zone (`zone-arcade-strip`). Eight cabinet doors line the street; each door enters a mini-game stage directly from the overworld. No hub stage and no external tools are required.

## How to play

1. Walk your avatar to a cabinet on Maple Ave.
2. Press **A** (or tap **Play** on the mobile touch pad) when the proximity prompt appears.
3. Complete the round inside the game stage.
4. Review your power-up (PU) result, then play again, open the wallet (**W**), or return to the world (**Esc**).
5. Open the streak panel with **G** to see daily progress, featured cabinet, and bundle distance.

**Input priority:** agent partner interactions win over game cabinets; game cabinets win over space structures.

## Power-ups (PU)

| Rule | Value |
|------|--------|
| Daily cap | 100 PU per UTC day |
| First ever round | Guaranteed net +PU on first completed round |
| Streak bonus | +5 PU at 5-day streak (once per day, capped) |
| Featured game | Daily rotator cabinet grants featured title by UTC weekday |

Server computes PU from round `events` via `applyGameOutcome`. Clients never send PU amounts.

## Cabinets

| gameId | Door label |
|--------|------------|
| `hidden-gems` | Gem Chest |
| `map-recall` | Map Room |
| `price-check` | Price Tag |
| `signal-hunt` | Signal Tower |
| `delivery-dash` | Courier Lane |
| `lease-locker` | Locker Hall |
| `talk-timer` | Comms Booth |
| `daily-rotator` | Featured (routes to today's featured game) |

## RPC

- `getGameStats` — streak, PU today, cap remaining, featured game
- `applyGameOutcome` — idempotent by `roundId`; returns `{ stats, wallet, netPu }`

## Per-game specs

- [Hidden Gems](./hidden-gems.md)
- [Map Recall](./map-recall.md)
- [Price Check](./price-check.md)
- [Signal Hunt](./signal-hunt.md)
- [Delivery Dash](./delivery-dash.md)
- [Lease Locker](./lease-locker.md)
- [Talk Timer](./talk-timer.md)
- [Daily Rotator](./daily-rotator.md)
