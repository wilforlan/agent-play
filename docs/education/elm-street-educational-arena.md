# Elm Street Educational Arena — Full Design Spec

**Status:** Historical campus design. **Day gate / street placement shipped.** For faculties, interiors, tuition, and lesson cards, use the current package: [README](./README.md) → [change summary](./change-summary-faculty-classroom.md).

**Working name:** Educational Arena  
**Street:** Elm Street (`streetId: "elm"`, label `"Elm Street"` — already in `STREET_NAME_POOL`)  
**Zone id (proposed):** `zone-education-campus`  
**Primary group (proposed):** `education`  
**Parallel product:** Maple Ave Arcade ([games/README.md](../games/README.md)) — same “eight doors on a street” metaphor, different economy and outcomes

> **Superseded naming:** This document refers to “educational centers.” The active product language is **faculties** (Art, Science, Medicine, Education). Keep this file for street/ambience history; do not implement new work from §3–§8 without reconciling the faculty PRD.

---

## 1. Product orientation

### 1.1 One-sentence promise

Walk Elm Street like a school campus, enter giant educational centers, pay a clear daily gate, and practice structured courses that make you a better master of education — on the same world map as agents, amenities, and the arcade.

### 1.2 Who it is for

| Audience | What they want on Elm Street |
|----------|------------------------------|
| **Aspiring educators** | Pedagogy practice, lesson design, assessment literacy, classroom craft |
| **Working teachers / tutors** | Short daily drills, rubrics, inclusive practice, leadership scenarios |
| **Students of education** | Topic breadth across centers; visible mastery ladder; portfolio of completed modules |
| **Agents & human visitors** | Shared campus presence; teach / coach / study roles without leaving Agent Play World |
| **Curious walkers** | Campus beauty, benches, trees, birds; readable building identities before they buy a pass |

### 1.3 Product pillars

1. **Campus first** — The street must feel like a school environment before it feels like a shop or arcade.
2. **Centers as giants** — Up to eight educational centers are large, unique buildings, not cabinet-scale doors.
3. **Honest gate** — 5 APU (or dual-tender equivalent) **per center, per UTC day**, charged at entry — no surprise micro-fees inside the gate.
4. **Mastery, not grind** — Learning paths and courses reward completion quality and reflection; they do not compete with Maple Ave’s APU earn loop.
5. **Same money story** — Settlement uses the existing APU / APW$ dual-tender wallet and scanner ledger patterns.

### 1.4 Positioning vs Maple Ave Arcade

| Dimension | Maple Ave Arcade | Elm Street Educational Arena |
|-----------|------------------|------------------------------|
| Metaphor | Arcade strip / cabinets | School campus / giant centers |
| Count | 8 cabinets | Up to 8 educational centers |
| Access | Day / week strip pass (25 / 140 APU) | **5 APU per center per UTC day** |
| Primary outcome | Earn APU (PU) up to daily cap | Learn, progress paths, earn **mastery marks** (not APU by default) |
| Interior | Mini-game stage | Learning stage (modules, drills, assessments, coach dialogue) |
| Ambience | Neon / play energy | Trees, benches, birds, quiet campus motion |
| Onboarding | Arrival step “Play a cabinet” | New arrival / awareness path “Visit Elm Street” |

Elm Street does **not** replace Maple Ave. It is the education counterpart: spend to learn; arcade remains the primary APU earn street.

### 1.5 Success metrics (product)

- **Awareness:** % of signed-in visitors who reach Elm Street within first 3 sessions
- **First gate:** % who complete at least one center gate purchase
- **Retention:** Returning entrants to the same center on later UTC days
- **Learning depth:** Modules completed per center; path milestones reached
- **Clarity:** Gate modal completion without abandon due to price/tender confusion
- **Calm campus:** Ambient layer stays below distraction thresholds (bird density, motion budget)

---

## 2. Street design (visual & spatial)

### 2.1 Campus layout goals

Elm Street should read as a **linear school campus**:

- A walkable spine (sidewalk + soft lawn strip)
- Giant center buildings along one or both long edges
- Trees at regular but imperfect intervals
- Benches at conversational pauses (near gates, under trees, facing the spine)
- **Street lights** along the campus spine (campus poles with soft lamps — not arcade neon)
- **Street name strip** reading “Elm Street” — painted / inlaid along the road or sidewalk edge, **without a T-sign post**
- Center name plaques + a campus directory near the entry end
- Soft lighting (day campus feel; evening wash later if themes support it)
- No arcade neon; no parking-bay density; no supermarket facade language
- **No street T-sign / sign-post** on Elm Street (Oak Lane and column streets may keep theirs; Elm uses the name strip instead)

### 2.2 Zone geometry (locked location)

**Decision:** Elm Street sits **directly above Oak Lane**. **Do not expand world bounds.** Fit by repartitioning rows inside the existing map rectangle.

**Visibility rule (locked):** Elm Street must **not** sit beside or against the three column streets (St. John / Peterson / Maple Ave.). A **buffer gap** stays between the column band and the Oak+Elm block so campus buildings are not on-screen next to those streets. You reach Elm by walking toward Oak Lane’s side of the map — not by glancing across from a column sidewalk.

#### How the map is stacked today (engine)

In world coordinates, **higher Y is toward the top of the watch screen**:

| Screen / map | Y band (default today) | What is there |
|--------------|------------------------|---------------|
| Top | Education rows (e.g. Y 10–12) | **Elm Street** (to be / now seeded) |
| Next | Parking rows (e.g. Y 6–9) | **Oak Lane** |
| Middle | Gap (`PARKING_COLUMN_GAP_ROWS`) | Empty separator |
| Bottom | Column rows (e.g. Y 0–2) | St. John · Peterson · Maple Ave. (left → right) |

So Oak Lane is already **above** the three columns. Elm Street sits **above Oak Lane** (higher Y). Playable world stays `MINIMUM_PLAY_WORLD_BOUNDS` (maxY 19); street layout claims Y through the education band without growing the playable map.

#### Locked stack after Elm Street

| Screen / map | Zone | Street |
|--------------|------|--------|
| **Top** | **`zone-education-campus`** | **Elm Street** |
| Next down | `zone-parking-strip` | Oak Lane |
| Buffer gap | (empty / lawn separator) | — keeps Elm+Oak away from column streets |
| **Bottom** | Agent / Space / Arcade columns | St. John · Peterson · Maple Ave. |

ASCII (top of screen at top of diagram):

```
┌─────────────────────────────────────────┐
│  ELM STREET  (educational campus)       │  ← above Oak Lane
├─────────────────────────────────────────┤
│  OAK LANE    (parking)                  │
├─────────────────────────────────────────┤
│           buffer gap (no centers)       │  ← not near the three columns
├──────────┬──────────────┬───────────────┤
│ St. John │  Peterson    │  Maple Ave.   │  ← three column streets
└──────────┴──────────────┴───────────────┘
```

#### Engineering intent

- Add `primaryGroup: "education"`.
- Seed full-width `zone-education-campus` on street `elm`, same `minX`→`maxX` as parking, **max-Y side of the map** (above Oak Lane).
- Shift / shrink the parking band **down** (toward the columns) enough to free Elm’s rows — still inside current `WorldBounds`.
- **Keep a real buffer** between the top of the column band and the bottom of Oak Lane so Elm Street centers are never co-visible with column facades at normal walking zoom.
- Do **not** place education tiles inside `zone-agent-strip`, `zone-space-strip`, or `zone-arcade-strip`.
- Up to **8** center anchors live only on the Elm band.
- Trees / benches / birds: decor on Elm (and optional buffer lawn) only.
- Migration: rematerialize in place; pin education label to `elm` / `Elm Street`.

### 2.3 Giant building language

Each educational center is a **giant building**:

| Trait | Requirement |
|-------|-------------|
| Scale | Visibly larger than shop / cabinet structures; readable from mid-street |
| Uniqueness | Distinct silhouette, facade materials, roof, entrance, accent color |
| Identity at distance | Iconic roof mark or tower element unique per center |
| Entrance | Clear gate / door / porch where proximity prompt appears |
| Depth | Suggest multi-story massing without blocking walkability |
| Realism | Grounded school-architecture palette (brick, stone, slate, timber, glass atrium) — not cartoon kiosks |

### 2.4 Campus ambient: trees, benches, birds

#### Trees

- Species mix: elm-leaning canopy + companion campus trees (oak / maple accents allowed as secondary)
- Placement: irregular grid along lawn strip; avoid blocking entrances
- Layers: trunk shadow, canopy, occasional fallen-leaf tint (season later)
- Interaction: none required for v1 (visual only)

#### Benches

- Paired or single benches at 4–8 campus pause points
- Orient toward the street spine or a center facade
- Optional proximity flavor text later (“Rest · Elm Street campus”) — no charge

#### Flying birds (randomized, non-distracting)

Birds model **intermittent campus life**, not a game mechanic.

| Parameter | Proposed default | Notes |
|-----------|------------------|-------|
| Spawn interval | 8–20s jittered | Independent of player movement |
| Flock size | Uniform random **1–5** birds per wave | Occasional solo; rare larger flock |
| Idle gap | 12–40s with no birds | Important for calm |
| Motion | Smooth horizontal / arc paths above canopy | No dive-bombing player |
| Audio | Optional soft ambient only if global SFX bus allows; default **off** in v1 |
| Max concurrent | Hard cap **6** on screen | Prevent distraction |
| Player interaction | None | Birds ignore avatar; avatar cannot collide |

Implementation sketch (later): a paint-layer particle/sprite system with seeded randomness per session minute, not server-synced per bird (purely cosmetic, client-local).

### 2.5 Street furniture, name strip & wayfinding

#### Street lights

- Place a row of **campus street lights** along the Elm Street spine (both sides or staggered).
- Style: slender school/campus poles with soft warm lamps — readable at play zoom, calmer than parking furniture if scaled differently.
- Count: enough to mark the full-width band (target **6–8** lights across the street, or one near each center entrance).
- Placement: beside sidewalks / lawn edges; **do not** overlap center doorways, directory, or gate prompts.
- Day: subtle pole silhouette; dusk/theme later may brighten lamp glow (optional).
- Lights are **cosmetic only** — no interaction, no purchase.

#### Street name strip (no sign post)

- Render the street identity as a **name strip** on the pavement or curb line: the words **“Elm Street”** (and optional short “Educational Arena” caption).
- **No T-sign, no pole, no hanging panel** for the street name on this zone.
- Strip should read clearly while walking the spine; may repeat once or twice across the full-width band if the street is long.
- Contrast: dark strip / light lettering (or inverse) so it stays legible on campus asphalt/lawn tones.
- Distinct from Oak Lane’s enlarged T-sign + multi-light furniture and from column-street T-posts.

#### Other wayfinding

1. **Campus directory board** near zone entry: lists all centers + brief discipline tag
2. **Per-center plaque:** full name + short subtitle (e.g. “Assessment Atelier · Rubrics & feedback”)
3. **Gate badge:** when in proximity without today’s pass — “5 APU · Day entry”
4. **Progress ribbon (optional HUD):** active path name when inside a center stage

### 2.6 Input priority (aligned with arcade)

Proposed priority when multiple prompts overlap:

1. Agent partner interactions (assist / chat / push)
2. Educational center gate / enter
3. Space structures / amenities
4. Arcade cabinets
5. Ambient flavor only

---

## 3. The eight educational centers

Up to eight centers. All eight are in scope for the design; shipping may phase 4 → 8.

| # | centerId | Display name | Discipline focus | Building character (sprite brief) |
|---|----------|--------------|------------------|-----------------------------------|
| 1 | `foundations-hall` | Foundations Hall | Learning science & teaching foundations | Broad brick lecture hall, columned porch, clock pediment |
| 2 | `curriculum-tower` | Curriculum Tower | Curriculum design & sequencing | Tall stone tower with spiral stair windows, slate roof |
| 3 | `assessment-atelier` | Assessment Atelier | Rubrics, feedback, authentic assessment | Glass-front studio wing, drafting lamps, copper accents |
| 4 | `classroom-studio` | Classroom Studio | Facilitation, management, presence | Two-story classroom block, large windows, courtyard door |
| 5 | `literacy-library` | Literacy Library | Reading & writing pedagogy | Grand library facade, arched windows, reading steps |
| 6 | `stem-observatory` | STEM Observatory | Math & science teaching craft | Dome observatory + lab annex, metal + glass |
| 7 | `inclusion-pavilion` | Inclusion Pavilion | Inclusive & special education practice | Low pavilion, warm timber, accessible ramps, garden court |
| 8 | `leadership-forum` | Leadership Forum | Mentoring, coaching, school leadership | Rotunda / forum, circular steps, banner poles |

### 3.1 Unique realistic sprite requirements

Each center needs a **dedicated sprite set** (or vector structure art module), not a recolored clone:

- Base facade (day)
- Entrance highlight (proximity / focus)
- Optional dusk variant (theme-aware later)
- Gate locked / unlocked badge overlay
- Directory thumbnail (smaller icon for campus board)
- Interior stage backdrop cue matching exterior identity

Art direction:

- Realistic school / campus architecture
- Readable at play-ui zoom levels used on Maple Ave / Peterson
- Distinct silhouette so players can navigate by skyline
- Accessibility: high-contrast door frames; name plaques remain legible at mobile widths

### 3.2 Center capacity & co-presence

- Multiple humans and agents may stand on the street outside centers.
- Interior learning stages: start with **solo learner sessions** (server-authoritative progress). Optional later: tutor/agent coach present in-stage.
- Occupancy of the street zone follows existing world occupant caps; centers do not each hold infinite interiors in the overworld snapshot.

---

## 4. Gate pass & transactions

### 4.1 Price rule (locked for design)

| Item | Rule |
|------|------|
| Product | **Educational center day entry** |
| Price | **5 APU** or **APW$ equivalent** at live `apwPerApu` |
| Scope | **One center** (`centerId`) |
| Duration | Until end of **UTC day** (same day-boundary convention as arcade / PU caps) |
| Re-entry | Unlimited re-entry to **that** center while the day pass is active |
| Other centers | Each other center requires its **own** 5 APU day entry |
| Weekly strip pass | **Out of scope for v1** (explicitly different from Maple Ave) |

Visiting all eight centers on one UTC day costs **40 APU** (or dual-tender equivalents), if the learner chooses breadth over depth.

### 4.2 Dual tender (same pattern as arcade)

Settlement mirrors Maple Ave arcade access:

1. Quote shows **5 APU** and live **APW$** equivalent.
2. Preferred tender = wallet side with **higher APW$-valued balance**, with fallback to the other if needed.
3. APU tender **burns APU** (`powerUps` debit) and writes scanner/wallet history.
4. APW$ tender debits `balanceUsd`.
5. Purchase row uses a new amenity kind, proposed: `amenityKind: "education_pass"`.
6. Idempotent purchase keyed by `{ playerId, centerId, utcDay }` so double-taps do not double-charge.

Proposed purchase field helper (parallel to `buildArcadePassPurchaseFields`):

- `creditSource: education:pass:{centerId}:{utcDay}`
- `token: "APU" | "USD"`
- Scanner op maps `education_pass` → `purchaseEducationAccess`

### 4.3 RPCs (proposed)

| RPC | Purpose |
|-----|---------|
| `getEducationAccess` | For a center (or all): active day passes, live quotes, preferred tender, progress summary |
| `purchaseEducationAccess` | Buy today’s pass for `{ centerId }` via dual tender |
| `getEducationProgress` | Paths, modules completed, mastery marks, current course pointer |
| `submitEducationStep` | Server-authoritative step completion (answers / reflections / drill outcomes) |
| `enterEducationCenter` | Transition overworld → learning stage after access check |

Access check on enter:

1. If valid day pass for `centerId` → enter stage.
2. Else → open gate modal (purchase → enter).
3. Insufficient funds → clear error, link to wallet / Maple Ave earn awareness.

### 4.4 What the gate does **not** charge

Inside a paid center for the day:

- Module navigation
- Practice drills
- Formative checks
- Saving progress
- Talking to an in-center coach agent (if present) — **talk billing remains separate** under existing P2A / peer talk rules

Optional future: certificate mint or portfolio export fees — **not** in v1.

### 4.5 Ledger & scanner visibility

- Wallet history shows human-readable detail: `Elm Street · Foundations Hall · day entry`
- Scanner indexes `education_pass` purchases like `arcade_pass`
- Analytics: per-center gate revenue, tender mix, repeat day entries

### 4.6 Economy relationship to APU earn

Elm Street is primarily an **APU sink for learning**, not an earn street.

| Loop | Role |
|------|------|
| Maple Ave | Earn APU |
| Talk / other earn paths | Earn APU |
| Elm Street gates | Spend APU (or APW$) to learn |
| Mastery marks | Non-currency progression (see §6) |

If a future design adds small mastery bonuses in APU, they must stay **below** arcade earn rates and never fund infinite gate farming.

---

## 5. Visitor onboarding & awareness

### 5.1 Awareness surfaces

1. **Campus skyline** — giant buildings visible when approaching the education zone
2. **Street name strip + street lights** — “Elm Street” on the pavement strip (no T-post); campus lights mark the band
3. **Arrival / coach copy** — new optional Arrival Quest step after Maple Ave (or parallel branch for education-curious visitors)
4. **Directory board** — lists centers without requiring purchase
5. **Games / Units SEO & home articles** — “Educational Arena on Elm Street” companion to Maple Ave games content
6. **Wallet chip education tip** — after first arcade earn: “Spend APU on Elm Street centers”
7. **In-app `/doc`** — this documentation package once shipped to docs browser

### 5.2 First-visit flow

```
Enter Elm Street zone
  → soft coach toast: "Educational Arena — eight centers. 5 APU opens a center for today."
  → walk to directory OR any center
  → proximity: center name + gate price
  → A / Enter → gate modal (dual tender)
  → purchase success → enter learning stage
  → first-module orientation card (what mastery means here)
  → complete one short module → celebrate mastery mark + invite path choice
```

### 5.3 Coach / arrival copy (draft)

| Moment | Title | Body |
|--------|-------|------|
| Zone enter | Elm Street | Educational Arena. Giant centers for teaching mastery. Five APU opens one center until UTC midnight. |
| First gate open | Day entry | One pass covers this center for today. Other centers need their own pass. |
| First module done | Mastery mark | Progress sticks to your node. Come back tomorrow for another day entry — or continue other centers. |
| Funds short | Earn then return | Play Maple Ave cabinets for APU, then walk back to Elm Street. |

### 5.4 Guest vs signed-in

- Guests may **walk the campus** and read directory / plaques.
- Gate purchase and progress require the **credentialed main node wallet** (same identity rule as amenity purchase / arcade pass).
- Guest coach: “Claim your place to open a center.”

### 5.5 Accessibility & clarity

- Price always shown as **APU and APW$** together
- UTC day end explained once in gate modal footer
- Color is not the only locked/unlocked signal (icon + text)
- Mobile: gate modal matches arcade access panel patterns for familiarity

---

## 6. Learning paths & mastery model

### 6.1 Definitions

| Term | Meaning |
|------|---------|
| **Center** | One of up to eight campus buildings; gated per UTC day |
| **Course** | Ordered sequence of modules inside a center |
| **Module** | One learning sitting (10–20 minutes target): teach → practice → check → reflect |
| **Path** | Cross-center recommended sequence toward a mastery identity |
| **Mastery mark** | Server-granted badge/counter for completing modules / courses (not APU) |
| **Portfolio** | Soft collection of completed reflections / lesson artifacts (v1: stored progress + titles) |

### 6.2 Mastery identities (paths)

Four flagship paths stitch centers together. Learners may also free-roam center-by-center.

#### Path A — Classroom Craftsperson

**Goal:** Facilitate clear, humane lessons with strong presence.

1. Foundations Hall — How learning works  
2. Classroom Studio — Presence & routines  
3. Literacy Library **or** STEM Observatory — Domain craft elective  
4. Assessment Atelier — Feedback that teaches  
5. Inclusion Pavilion — Access for every learner  
6. Leadership Forum — Peer coaching intro  

#### Path B — Curriculum Architect

**Goal:** Design coherent sequences and assessments.

1. Foundations Hall — Learning science baseline  
2. Curriculum Tower — Scope & sequence  
3. Assessment Atelier — Evidence of learning  
4. STEM Observatory **or** Literacy Library — Domain deep dive  
5. Inclusion Pavilion — Universal design for learning  
6. Leadership Forum — Aligning teams to a curriculum  

#### Path C — Inclusive Practitioner

**Goal:** Teach as if every learner belongs.

1. Foundations Hall — Variability is the default  
2. Inclusion Pavilion — Core inclusive practices  
3. Classroom Studio — Accessible routines  
4. Assessment Atelier — Fair measures  
5. Literacy Library — Language access  
6. Leadership Forum — Advocating for systems change  

#### Path D — Education Leader

**Goal:** Coach others and hold a learning culture.

1. Foundations Hall — Shared language of learning  
2. Classroom Studio — Observation literacy  
3. Assessment Atelier — Data without cruelty  
4. Curriculum Tower — Program coherence  
5. Inclusion Pavilion — Equity leadership  
6. Leadership Forum — Mentoring & forums  

### 6.3 Progress rules

- Progress is **per credentialed node**, persisted server-side.
- Completing a module grants **mastery marks** for that center/path.
- Paths are **recommendations**; modules remain completable out of order inside a center (except where a course declares hard prerequisites).
- Soft gates: path UI highlights next recommended center but does not block exploration if the day pass is paid.
- Daily return: new UTC day requires a new 5 APU entry to continue inside that center; **progress does not reset**.

### 6.4 Mastery marks (non-currency)

Proposed counters:

- `marksByCenter[centerId]`
- `marksTotal`
- `coursesCompleted[]`
- `pathsUnlocked[]` / `pathsCompleted[]`

Display: campus ribbon / education panel (key binding TBD, not conflicting with `G` streak / `W` wallet).

---

## 7. Structured course outlines (per center)

Each center ships with **one flagship course** of **4 modules** for v1. Additional courses can layer later.

Module pattern (all centers):

1. **Orient** — concept + why it matters in real classrooms  
2. **Model** — worked example / demonstration  
3. **Practice** — interactive drill or scenario choice  
4. **Reflect** — short written or structured reflection (saved to portfolio title list)

### 7.1 Foundations Hall — *Learning Science for Teachers*

| Module | Title | Outcomes |
|--------|-------|----------|
| F1 | Attention & memory | Name limits of working memory; design one chunking move |
| F2 | Motivation & belonging | Distinguish extrinsic hooks from belonging cues |
| F3 | Practice & spacing | Build a micro spacing plan for one skill |
| F4 | Transfer | Spot near vs far transfer; rewrite one task for transfer |

### 7.2 Curriculum Tower — *Scope, Sequence, Coherence*

| Module | Title | Outcomes |
|--------|-------|----------|
| C1 | From standards to story | Turn a standard into a learner-facing throughline |
| C2 | Sequencing | Order three skills with prerequisite logic |
| C3 | Vertical coherence | Align one concept across two “grade bands” (simulated) |
| C4 | Trim for mastery | Cut busywork; keep evidence-producing tasks |

### 7.3 Assessment Atelier — *Evidence & Feedback*

| Module | Title | Outcomes |
|--------|-------|----------|
| A1 | Rubric craft | Write a 3-level rubric for one performance |
| A2 | Feedback that teaches | Convert a vague comment into actionable feedback |
| A3 | Formative loops | Design an exit ticket that changes tomorrow’s plan |
| A4 | Fairness checks | Audit a quiz for bias / accessibility issues |

### 7.4 Classroom Studio — *Presence, Routines, Discourse*

| Module | Title | Outcomes |
|--------|-------|----------|
| S1 | Opening routines | Design a 3-minute open that settles a room |
| S2 | Questioning | Upgrade one question from recall to thinking |
| S3 | Behavior as skill | Replace a punishment script with a teachable skill |
| S4 | Closure | End a lesson with visible evidence of learning |

### 7.5 Literacy Library — *Reading & Writing Pedagogy*

| Module | Title | Outcomes |
|--------|-------|----------|
| L1 | Decoding & meaning | Balance word work with comprehension purpose |
| L2 | Text talk | Run a short accountable talk protocol |
| L3 | Writing scaffolds | Build a scaffold that still leaves student voice |
| L4 | Multilingual strength | Plan one translanguaging-friendly move |

### 7.6 STEM Observatory — *Math & Science Teaching Craft*

| Module | Title | Outcomes |
|--------|-------|----------|
| M1 | Representations | Move a concept across symbolic / visual / verbal |
| M2 | Productive struggle | Design a struggle window without abandonment |
| M3 | Lab talk | Turn a procedure into a claim-evidence habit |
| M4 | Error as data | Use a common misconception as the lesson engine |

### 7.7 Inclusion Pavilion — *Access by Design*

| Module | Title | Outcomes |
|--------|-------|----------|
| I1 | Learner variability | Map one lesson for multiple means of engagement |
| I2 | Barriers inventory | Find three barriers in a sample lesson |
| I3 | Accommodation vs redesign | Choose redesign when accommodation is insufficient |
| I4 | Partnership | Draft a learner/family partnership ask |

### 7.8 Leadership Forum — *Coach, Align, Sustain*

| Module | Title | Outcomes |
|--------|-------|----------|
| E1 | Observation without judgment | Write low-inference notes from a vignette |
| E2 | Coaching conversation | Structure a 5-turn coaching dialogue |
| E3 | Team learning | Design a short PLC protocol |
| E4 | Culture signals | Identify adult culture signals that affect students |

---

## 8. Educational interaction model

### 8.1 Overworld interactions

| Action | Control (proposed) | Result |
|--------|--------------------|--------|
| Approach center | Walk | Proximity label: name + pass state |
| Open gate / enter | **A** or mobile **Enter** | Modal or stage enter |
| Read directory | **A** near directory | Non-purchase info panel |
| Sit flavor (optional) | Near bench | Toast only |

### 8.2 Learning stage interactions

Inside a center stage:

| Element | Behavior |
|---------|----------|
| Module map | List of 4 modules with completion state |
| Lesson panel | Short teaching copy (readable, not a textbook dump) |
| Worked example | Step reveal or annotated sample |
| Practice | Multiple choice, order-the-steps, scenario branch, or short constructed response |
| Check | Immediate formative result; server validates where scoring is objective |
| Reflect | Prompt with length guidance; save on submit |
| Coach agent (optional) | Proximity/talk inside stage uses existing talk policies |
| Exit | Esc / exit door → Elm Street overworld; progress saved |

### 8.3 Feedback philosophy

- Prefer **teachable feedback** over score humiliation
- Objective drills: correct / incorrect with explanation
- Scenario drills: rubric-aligned preferred choice + rationale
- Reflections: completeness + optional self-rubric; no public shaming feed in v1

### 8.4 Agents on campus

- Agents may occupy Elm Street like any walkable zone (policy TBD in layout allow-list).
- Education-specialist agents can be authored later as campus coaches.
- Human↔agent assist/chat still beats center enter when both are in range (priority list §2.6).

### 8.5 Anti-distraction rules (birds & motion)

- Birds never steal focus highlight from gate prompts
- No bird click targets
- Motion budget: campus ambient ≤ low percentage of frame work vs occupants
- Disable birds option in settings if accessibility needs demand it (implementation phase)

---

## 9. Engineering plan (when we code)

Documentation-only now. Implementation should follow TDD and existing Agent Play patterns.

### 9.1 Likely surface areas

| Area | Change type |
|------|-------------|
| `world-bounds` / layout model | Place Elm **above** parking (higher Y); shift Oak down; keep buffer above columns; same bounds |
| `world-streets-pool` / layout seed | Pin education to `elm`; Oak remains the parking street below Elm |
| `OccupantGroup` | Add `"education"` |
| Session store / Redis | Education day passes + progress documents |
| Wallet / purchase | `education_pass` amenity kind; dual tender helper |
| Scanner | Index education passes |
| play-ui / web-ui canvas | Campus paint, giant sprites, birds, benches, trees, gate modal, stages |
| Arrival quest / onboarding | Elm Street awareness step |
| SEO / games content | Educational Arena pages |
| Docs `/doc` | Already covered by this folder once copied |

### 9.2 Data sketches (not implemented)

```ts
// Illustrative only — finalize with Zod schemas at coding kickoff
type EducationDayPass = {
  playerId: string;
  centerId: string;
  utcDay: string; // YYYY-MM-DD
  tender: "apu" | "apw";
  apuCost: number;
  apwCharged: number;
  purchasedAt: string;
};

type EducationProgress = {
  playerId: string;
  marksTotal: number;
  marksByCenter: Record<string, number>;
  modulesCompleted: string[]; // e.g. "foundations-hall:F1"
  coursesCompleted: string[];
  paths: {
    pathId: string;
    status: "available" | "active" | "completed";
  }[];
  reflections: { moduleId: string; excerpt: string; savedAt: string }[];
  updatedAt: string;
};
```

### 9.3 Client systems

1. **Education campus layer** — buildings, trees, benches, **street lights**, **street name strip (no sign post)**, directory  
2. **Bird ambience system** — client-local randomized flocks (§2.4)  
3. **Education access panel** — clone patterns from `arcade-access-panel` with per-center day semantics  
4. **Learning stage controller** — parallel to amenity / game stage switches  
5. **Progress panel** — mastery marks & path recommendations  

### 9.4 Testing strategy (when coding)

Behavior-first tests for:

- Dual-tender selection and insufficient funds
- UTC day boundary (pass expires; progress persists)
- Idempotent double purchase same center/day
- Enter blocked without pass; allowed with pass
- Module completion grants marks once (idempotent `stepId`)
- Layout migration: existing worlds gain education zone safely

### 9.5 Explicit non-goals for first engineering milestone

- Weekly campus pass
- APU earn from modules
- Multiplayer classroom interiors
- Full LMS export / SCORM
- User-generated courses
- Seasonal bird species packs

---

## 10. Delivery phases (proposed)

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **0 — Docs** | This package | Stakeholder alignment; kickoff approved |
| **1 — Campus shell** | Zone + 4 giant buildings + trees/benches + birds | Walkable Elm Street feels like a school |
| **2 — Gate economy** | 5 APU dual-tender per center/day + scanner | Buy → enter → re-enter same day free |
| **3 — Learning MVP** | 4 centers × 4 modules (Foundations, Classroom, Assessment, Inclusion) | Complete modules; mastery marks persist |
| **4 — Full eight** | Remaining centers + sprites + paths A–D UI | All eight centers live; paths recommend next |
| **5 — Polish** | Onboarding, SEO, accessibility, coach agents | Arrival awareness + calm campus defaults |

No phase after 0 starts without an explicit “start coding” instruction.

---

## 11. Open decisions (resolve before or during Phase 1)

**Resolved — location:** Elm Street **directly above Oak Lane** (top of map); Oak stays below Elm; **buffer gap** keeps the Elm+Oak block **away from** the three column streets; **no world-bounds expansion** (§2.2).

Still open:

1. **Path UI key:** Which key opens education progress without colliding with `G` / `W`?
2. **Talk inside centers:** Allow P2A coach billing in-stage from day one, or delay?
3. **Marks vanity:** Public scanner display of mastery marks, or private to wallet/education panel only?
4. **Content voice:** First-person coach vs third-person textbook tone?
5. **Birds:** Default on for all devices, or auto-reduce on low-power mobile?
6. **Row budget:** Exact Elm vs Oak vs buffer heights inside existing bounds (implementation tuning only).

---

## 12. Document control

| Field | Value |
|-------|-------|
| Created for | Agent Play World — Elm Street Educational Arena |
| Phase | Documentation only |
| Related | [Maple Ave Arcade](../games/README.md), [Payments & wallets](../payments-wallets-and-talk-billing.md), [Pending features](../pending-features.md) |
| Street pool | `elm` / `Elm Street` already listed in `STREET_NAME_POOL` |
| Next step | Review & approve this design; then kick off Phase 1 with failing tests first |

---

## 13. Summary of what we will build (when ready)

1. An **Elm Street** campus band **above Oak Lane** (top of map, buffered away from the three column streets; no bounds expand): trees, benches, **street lights**, **street name strip without a sign post**, calm randomized birds, advanced giant-building layouts.
2. **Up to eight unique educational centers** with realistic, distinct sprites and clear entrances.
3. A **per-center daily gate** of **5 APU or dual-tender APW$ equivalent**, unlimited re-entry that UTC day, separate passes per center.
4. **Onboarding and awareness** so visitors understand the Educational Arena without confusing it with Maple Ave’s earn loop.
5. **Structured courses** (4 modules each) across foundations, curriculum, assessment, classroom craft, literacy, STEM pedagogy, inclusion, and leadership.
6. **Learning paths** that guide students of education toward mastery identities, with **mastery marks** as progression — not arcade PU.
7. Engineering that reuses **wallet dual tender, scanner ledger, stage transitions, and TDD** patterns already proven on arcade and amenities.

Until kickoff, this document is the source of truth. No code.
