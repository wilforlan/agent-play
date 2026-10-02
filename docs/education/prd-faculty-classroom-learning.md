# PRD — Elm Street Faculty Classrooms & Learning Paths

**Product:** Agent Play World · Educational Arena (Elm Street)  
**Milestone:** Faculty interiors, annual school fees, in-class lesson cards  
**Audience level:** Senior High  
**Status:** Requirements locked for engineering kickoff  
**Related:** [Change summary](./change-summary-faculty-classroom.md) · [Architecture](./architecture-faculty-classroom.md) · [Engineering](./engineering-faculty-classroom.md)

---

## 1. Problem

Learners can buy a day gate to an Elm Street building, but nothing useful happens next. There is no interior, no curriculum choice, no lasting enrollment, and no classroom interaction. The street feels like a payment booth instead of a school.

## 2. Vision

Elm Street faculties behave like a small university campus for Senior High students: pay the day gate to enter the building, walk a classroom that showcases curricula, enroll in a learning path for a school year, then attend class by interacting with lesson cards that teach real course content.

## 3. Goals

1. **Post-gate agency** — After day-gate payment, proximity enables meaningful verbs (**P / A / C**).  
2. **Faculty identity** — Four faculties with clear objectives and Senior High curricula.  
3. **Honest money** — Day gate (short access) vs annual fees (path enrollment) are separate, readable products.  
4. **Learn by reading** — Class mode reveals authored course content at lesson cards.  
5. **Content in repo** — Outlines and lessons are versioned files, migratable to a DB later.  
6. **No arcade bleed** — Fees and mastery stay education products; Maple Ave remains the APU earn street.

## 4. Non-goals

- Eight faculties (design may still mention later expansion; ship **four**)  
- Live teacher multiplayer / agent co-teaching in v1  
- Auto-graded exams or certificate NFTs in v1  
- Changing the **5 APU** day-gate rule  
- Database-backed CMS in v1  

## 5. Personas

| Persona | Need |
|---------|------|
| Senior High learner | Clear path, fair fees, readable lessons |
| Returning visitor | Day gate again tomorrow; annual enrollment still valid |
| Wallet-aware player | Dual tender quotes; no surprise charges |
| Campus walker | Beautiful buildings; prompts only when relevant |

## 6. Faculty catalog (locked)

| facultyId | Display name | Objective |
|-----------|--------------|-----------|
| `faculty-art` | Faculty of Art | Languages, history, philosophy, visual arts |
| `faculty-science` | Faculty of Science | Mathematics, physics, chemistry, biology, computer science |
| `faculty-medicine` | Faculty of Medicine | Clinical training, nursing, medical research |
| `faculty-education` | Faculty of Education | Teacher training and pedagogical studies |

**Migration:** Replace prior center ids (`foundations-hall`, `curriculum-tower`, `assessment-atelier`, `classroom-studio`) via layout/content remap + purchase-key compatibility notes in engineering.

## 7. Learning paths (per faculty)

Each faculty ships **three Senior High paths** at three complexity tiers. Tiers drive **annual school fees** in APW$:

| Tier | Complexity | Target annual fee (APW$) | Typical character |
|------|------------|---------------------------|-------------------|
| `foundation` | Lower | **450** | Core literacy for the faculty |
| `intermediate` | Mid | **675** | Multi-topic synthesis |
| `advanced` | Higher | **900** | Capstone / research / studio depth |

Exact path ids and titles:

### Faculty of Art (`faculty-art`)

| pathId | Tier | Title |
|--------|------|-------|
| `art-languages-communication` | foundation | Languages & Communication |
| `art-history-philosophy` | intermediate | History & Philosophy |
| `art-visual-studio` | advanced | Visual Arts Studio |

### Faculty of Science (`faculty-science`)

| pathId | Tier | Title |
|--------|------|-------|
| `sci-mathematics` | foundation | Mathematics Foundations |
| `sci-physical-life` | intermediate | Physical & Life Sciences |
| `sci-computer-modeling` | advanced | Computer Science & Modeling |

### Faculty of Medicine (`faculty-medicine`)

| pathId | Tier | Title |
|--------|------|-------|
| `med-nursing-fundamentals` | foundation | Nursing Fundamentals |
| `med-clinical-foundations` | intermediate | Clinical Foundations |
| `med-research-methods` | advanced | Medical Research Methods |

### Faculty of Education (`faculty-education`)

| pathId | Tier | Title |
|--------|------|-------|
| `edu-pedagogy-foundations` | foundation | Pedagogical Foundations |
| `edu-classroom-practice` | intermediate | Classroom Practice |
| `edu-curriculum-assessment` | advanced | Curriculum & Assessment Design |

Each path must include:

- Short description (1–2 sentences)  
- Learning objectives (Senior High appropriate)  
- Ordered course outline (modules / lessons)  
- Per-lesson body content suitable for in-class reading cards  

## 8. User journeys

### 8.1 Day gate (existing, must keep)

1. Learner approaches faculty on Elm Street.  
2. Without UTC-day pass → payment prompt (5 APU / APW$).  
3. Purchase succeeds → day pass active for that faculty.

### 8.2 Enter classroom (`P`)

1. Day pass active.  
2. Proximity legend: `P: enter · A: choose path · C: start class` (wording may vary by state).  
3. Press **P** → enter **faculty interior stage** (classroom world).  
4. Esc / exit door returns to overworld (standard enclosed-stage pattern).

### 8.3 Choose path & pay fees (`A`)

1. From overworld proximity **or** interior path-section proximity, press **A**.  
2. UI lists that faculty’s three paths with tier, fee quote (APW$ + APU equivalent), and short blurb.  
3. Learner selects a path.  
4. System shows **school fees** confirmation (annual, dual tender).  
5. On success → enrollment active for one year for `{ facultyId, pathId }`.  
6. If already enrolled in that path with unexpired fees → show “Enrolled” (no double charge).  
7. Switching paths: allowed only by purchasing the new path’s fees (v1: multiple enrollments may coexist; active class path is the one selected for **C**).

### 8.4 Start class (`C`)

1. Requires: active day gate for faculty **and** at least one unexpired enrollment for that faculty.  
2. If multiple enrollments → picker defaults to last selected path, or forces choose if none selected.  
3. Press **C** → class session starts (interior if not already inside; otherwise transforms classroom to class mode).  
4. Lesson cards appear for the active path’s outline order.

### 8.5 Learn at cards (`A` in class)

1. Learner walks near a lesson card.  
2. Prompt: `A: open lesson · <title>`.  
3. Press **A** → content panel shows lesson text (outline section + body).  
4. Dismiss returns to classroom; progress may mark lesson “opened” (v1: open = progress; no exam gate).

## 9. Interaction state machine (product view)

```text
[Approach faculty]
    │
    ├─ no day pass ──► Day gate payment ──► day_pass_active
    │
    └─ day_pass_active
            │
            ├─ P ──► interior_classroom
            ├─ A ──► path_picker ──► fees_payment ──► enrolled
            └─ C ──► (needs enrolled) ──► class_session
                                              │
                                              └─ near card + A ──► lesson_reader
```

## 10. Pricing requirements

### 10.1 Day gate (unchanged)

- 5 APU or APW$ equivalent  
- Per faculty per UTC day  

### 10.2 Annual school fees (new)

| Requirement | Detail |
|-------------|--------|
| Quote display | Always show **APW$** sticker price and **APU** dual-tender equivalent |
| Band | 450 / 675 / 900 APW$ by tier |
| Dual tender | Same preference rules as arcade / education day pass |
| Duration | **365 days** from `purchasedAt` (engineering may document UTC-year alternative; PRD locks rolling 365d) |
| Amenity kind | `education_tuition` (proposed; see engineering) |
| Idempotency | `{ playerId, facultyId, pathId, enrollmentYearKey }` or expiry-window CAS |
| Scanner | Index tuition purchases like other wallet spends |

APU cost = `ceil(apwPrice / apwPerApu)` or exact dual-tender helper consistent with existing catalogs (engineering locks formula).

## 11. Classroom UX requirements

### 11.1 Look & feel

- Classroom: desks, chalkboard / digital board, side boards for curriculum sections, soft daylight  
- Distinct accent color per faculty (Art warm, Science cool, Medicine clinical white/teal, Education chalk green)  
- Curriculum sections as walkable boards or pedestals listing path titles  

### 11.2 Class mode

- Lesson cards laid out in a readable path (row or arc)  
- Card shows lesson number + short title  
- Content panel is readable on mobile widths; scrollable body; no emoji iconography requirement  

### 11.3 Copy tone

- Senior High teacher voice: clear, encouraging, precise  
- No dark-pattern upsell beyond one honest fee confirmation  

## 12. Content requirements

1. All four faculties have complete path outlines in-repo.  
2. Each path has ≥ **4 lessons** with full readable bodies (target **5**).  
3. Lesson bodies teach real Senior High material aligned to faculty objective.  
4. Folder layout: `faculties/<faculty>/<pathId>/outline.md` + `lessons/<nn>-<slug>.md`.  
5. Typed catalog index exports ids, tiers, fees, and lesson order for the runtime.  

## 13. Success metrics

| Metric | Signal |
|--------|--------|
| Gate→enter | % of day-gate buyers who press **P** same day |
| Enroll | % who complete tuition for ≥1 path |
| Class start | % of enrolled who press **C** |
| Lesson depth | Median lessons opened per class session |
| Fee clarity | Tuition modal abandon rate |
| Content QA | Zero missing lesson files for catalogued paths |

## 14. Acceptance criteria (ship checklist)

- [ ] Campus plaques/labels show Faculty of Art / Science / Medicine / Education  
- [ ] Day gate still 5 APU dual tender; ids migrated  
- [ ] With day pass, proximity enables **P**, **A**, **C** with correct gating  
- [ ] **P** opens faculty-specific classroom interior  
- [ ] **A** lists three paths with 450 / 675 / 900 APW$ quotes and completes dual-tender tuition  
- [ ] **C** blocked without enrollment; starts class with lesson cards when enrolled  
- [ ] Card proximity **A** opens lesson content from in-repo files  
- [ ] Wallet / scanner show tuition purchases  
- [ ] Tests cover access rules, fee tiers, enrollment expiry, proximity gating  
- [ ] Content pack complete for all 12 paths  

## 15. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Fee sticker shock | Clear day-gate vs tuition copy; show APU equivalent |
| Id migration breaks old passes | Compatibility map + reseed guidance |
| Content too thin | PRD minimum lesson count + content review before merge |
| Verb conflicts (A assist vs A path) | Priority: agent partner > education verbs when both apply; document in architecture |
| Class without interior confusion | If **C** from overworld, auto-enter interior then start class |

## 16. Open decisions (resolved in this PRD)

| Topic | Decision |
|-------|----------|
| Fee duration | Rolling **365 days** from purchase |
| Path count per faculty | **3** (foundation / intermediate / advanced) |
| Fee amounts | **450 / 675 / 900** APW$ |
| Faculty count this milestone | **4** |
| Content storage | **Repo folders** now; DB later |
| Progress model v1 | Lesson **opened** counts; no exams |
