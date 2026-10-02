# Elm Street — Educational Arena

**Status:** Campus day-gate **shipped**. Faculty classrooms / tuition / lesson cards **in implementation** — see engineering doc for remaining polish.

## Document index

| Document | Contents |
|----------|----------|
| [Change summary — faculties & classrooms](./change-summary-faculty-classroom.md) | **Start here** — what changes vs what already shipped |
| [PRD — Faculty classroom learning](./prd-faculty-classroom-learning.md) | Product requirements, journeys, fees, acceptance |
| [Architecture](./architecture-faculty-classroom.md) | Stages, domain model, money flows, content boundary |
| [Engineering](./engineering-faculty-classroom.md) | Schemas, RPCs, TDD sequence, touch map, DoD |
| [Content pack (codebase)](../../packages/play-ui/src/education/content/README.md) | Faculty outlines & lesson Markdown in-repo |
| [Historical campus design](./elm-street-educational-arena.md) | Original arena spec (street, ambience, early 8-center vision) |

## Relationship to existing streets

**Placement (locked):** Higher Y is top of screen. Elm Street sits **above Oak Lane**, with a buffer from St. John / Peterson / Maple. **World bounds stay the same.**

| Screen position | Zone | Street (typical) | Role |
|-----------------|------|------------------|------|
| **Top** | **Education** | **Elm Street** | **Four faculties, day gates, classrooms, paths** |
| Below Elm | Parking | Oak Lane | Parking street commerce |
| Buffer | — | — | Keeps campus away from column streets |
| Bottom L | Agents | St. John St. | Meet and talk with agents |
| Bottom mid | Spaces / amenities | Peterson St. | Owned spaces, shop / supermarket / car wash |
| Bottom R | Arcade | Maple Ave. | Cabinets, arcade pass, APU earn |

## Faculties (this milestone)

| Faculty | Covers |
|---------|--------|
| **Faculty of Art** | Languages, history, philosophy, visual arts |
| **Faculty of Science** | Mathematics, physics, chemistry, biology, computer science |
| **Faculty of Medicine** | Clinical training, nursing, medical research |
| **Faculty of Education** | Teacher training and pedagogical studies |

## Economy (two products)

| Product | Price | Duration | Unlocks |
|---------|-------|----------|---------|
| Day gate | 5 APU (or APW$) | UTC day / faculty | Enter building; path/class verbs |
| School fees | 450 / 675 / 900 APW$ by path tier (dual tender) | 365 days / path | Start class + lesson cards |

## Interaction summary (after day gate)

| Key | Action |
|-----|--------|
| **P** | Enter faculty classroom interior |
| **A** | Choose learning path → pay annual fees (or open lesson when in class near a card) |
| **C** | Start class (requires active enrollment) |

## Implementation kickoff

1. Read [change summary](./change-summary-faculty-classroom.md)  
2. Lock PRD acceptance  
3. Follow [engineering](./engineering-faculty-classroom.md) TDD sequence  
4. Author/verify content under `packages/play-ui/src/education/content/`  

No classroom/tuition production code until this package is explicitly approved for coding beyond the already-shipped day gate.
