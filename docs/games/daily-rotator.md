# Daily Rotator

**Cabinet:** Featured (`daily-rotator`)

## Play loop

The Featured cabinet glows on Maple Ave. Press **A** to enter today's featured title (rotates by UTC weekday). The streak panel shows which game is featured.

## Schedule

Monday–Sunday cycles through the seven playable titles (`hidden-gems` through `talk-timer`). See `featuredGameIdForUtcDate` in `packages/sdk/src/lib/game-catalog.ts`.

## Bonuses

- Featured title receives +10% of daily PU cap allocation server-side
- 5-day streak awards +5 bonus PU (once per day, capped)

## Stage

Routes to the featured game's stage id via `resolvePlayableGameId`.
