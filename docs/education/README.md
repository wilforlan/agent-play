# Elm Street — Educational Arena

**Status:** Design documentation only. No implementation until this package is explicitly approved for coding.

Elm Street is Agent Play World’s **Educational Arena**: a school-campus street where visitors walk among up to **eight giant educational centers**, buy a **per-center daily gate pass** (5 APU or dual-tender equivalent), and progress through structured learning paths toward education mastery.

| Document | Contents |
|----------|----------|
| [Educational Arena design](./elm-street-educational-arena.md) | Product intent, street design, centers, sprites & ambience, onboarding, transactions, learning paths, course outlines, interaction model, engineering plan, phased delivery |

## Relationship to existing streets

**Placement (locked):** On the watch, **higher Y is the top of the screen**. Today Oak Lane (parking) is already above the three column streets. Elm Street goes **above Oak Lane** (further toward the top). A **buffer gap** stays between that Elm+Oak block and St. John / Peterson / Maple so the campus is **not visible next to** those column streets. **World bounds stay the same.**

| Screen position | Zone | Street (typical) | Role |
|-----------------|------|------------------|------|
| **Top** | **Education** | **Elm Street** | **Eight educational centers, learning paths, mastery** |
| Below Elm | Parking | Oak Lane (pool) | Parking street commerce |
| Buffer | — | — | Keeps campus/parking away from column streets |
| Bottom L | Agents | St. John St. | Meet and talk with agents |
| Bottom mid | Spaces / amenities | Peterson St. | Owned spaces, shop / supermarket / car wash |
| Bottom R | Arcade | Maple Ave. | Eight game cabinets, arcade access pass, APU earn |

`Elm Street` already exists in the street name pool (`id: "elm"`). The Educational Arena pins that label to `zone-education-campus` above parking — not between the column sidewalks.

## Non-goals for this doc phase

- No production code, schemas, RPCs, sprites, or layout migrations yet
- No live course content authoring until the interaction shell is approved
- No change to Maple Ave arcade pricing or PU earn rules

When implementation begins, start from [elm-street-educational-arena.md](./elm-street-educational-arena.md) § Engineering and § Delivery phases.
