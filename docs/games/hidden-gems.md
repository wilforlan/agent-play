# Hidden Gems

**Cabinet:** Gem Chest (`hidden-gems`)

## Play loop

Open six chest slots in order. Correct picks earn PU; wrong picks cost PU after the tutorial round.

## PU rules

| Event | PU |
|-------|-----|
| Correct chest (tutorial) | +5 |
| Correct chest | +8 |
| Wrong chest (post-tutorial) | −2 |

## First-session hook

The server guarantees a net positive PU outcome on the player's first ever completed arcade round when the raw delta would be lower.

## Stage

`gameHiddenGems` in `packages/play-ui/src/game-hidden-gems-stage.ts`
