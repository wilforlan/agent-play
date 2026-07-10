# Price Check

**Cabinet:** Price Tag (`price-check`)

## Play loop

Three rounds of higher/lower guesses against catalog item prices from the default space content model.

## PU rules

| Event | PU |
|-------|-----|
| Correct guess | +4 |
| Wrong guess (round 1) | 0 |
| Wrong guess (later rounds) | −1 |

## Stage

`gamePriceCheck` in `packages/play-ui/src/game-price-check-stage.ts`
