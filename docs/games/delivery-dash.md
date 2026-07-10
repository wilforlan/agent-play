# Delivery Dash

**Cabinet:** Courier Lane (`delivery-dash`)

## Play loop

Move across a grid from start to goal using arrow keys. Fewer moves and fewer wall hits earn more PU.

## PU rules

| Finish band | PU |
|-------------|-----|
| Fast (≤8 moves) | +15 |
| OK (≤14 moves) | +8 |
| Slow | +3 |
| Per obstacle hit | −2 |

## Stage

`gameDeliveryDash` in `packages/play-ui/src/game-delivery-dash-stage.ts`
