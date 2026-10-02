# What is changing — Faculty classrooms, fees & in-class learning

**Status:** Design package for the next Elm Street education milestone.  
**Baseline (already in product):** Elm Street campus strip, four day-gated buildings, 5 APU dual-tender day entry, left-edge name strip, lights beside buildings, proximity payment panel.  
**This package:** Rename buildings to **faculties**, unlock post-gate proximity verbs, faculty **interior classrooms**, **learning-path enrollment (annual school fees)**, and **in-class lesson cards** with authored Senior High content in the repo.

---

## 1. One-line delta

After a learner buys a faculty day gate, they can **enter the faculty classroom (`P`)**, **choose a learning path and pay annual school fees (`A`)**, and **start class (`C`)** — then walk lesson cards and press **`A`** to read course content.

---

## 2. What stays the same

| Locked / kept | Notes |
|---------------|--------|
| Elm Street above Oak Lane, buffer from column streets, no world-bounds expand | Unchanged |
| Day gate: **5 APU** (or APW$) **per faculty per UTC day** | Still required before interior / class verbs |
| Dual-tender wallet + scanner ledger patterns | Extended to a new fee product |
| Four buildings on the campus strip (v1) | Renamed / remapped; not expanded to eight in this milestone |
| Maple Ave arcade economy | Untouched |

---

## 3. What changes

### 3.1 Naming & identity

| Before (shipped ids / labels) | After |
|-------------------------------|--------|
| Educational “centers” | **Faculties** |
| `foundations-hall` · Foundations | **`faculty-art`** · Faculty of Art |
| `curriculum-tower` · Curriculum | **`faculty-science`** · Faculty of Science |
| `assessment-atelier` · Assessment | **`faculty-medicine`** · Faculty of Medicine |
| `classroom-studio` · Classroom | **`faculty-education`** · Faculty of Education |

Faculty objectives (locked):

- **Art** — languages, history, philosophy, visual arts  
- **Science** — mathematics, physics, chemistry, biology, computer science  
- **Medicine** — clinical training, nursing, medical research  
- **Education** — teacher training and pedagogical studies  

Audience for authored courses: **Senior High** (≈ grades 10–12 / ages 15–18).

### 3.2 Proximity verbs (overworld, after day gate)

| Key | Without day gate | With active day gate |
|-----|------------------|----------------------|
| (proximity) | Day-entry payment prompt | Legend + floating prompt for **P / A / C** |
| **P** | — | **Enter faculty interior** (classroom world) |
| **A** | — | **Choose learning path** → annual school-fees payment |
| **C** | — | **Start class** (requires enrolled path with active fees) |

Without a day gate, behavior stays: prompt to buy **5 APU** day entry for that faculty.

### 3.3 New economic product — annual school fees

| Attribute | Rule |
|-----------|------|
| Product | **Learning-path school fees** (enrollment) |
| Duration | **One year** from purchase timestamp (or UTC year policy — see PRD §Fees) |
| Price band | **APW$ 450–900** (dual tender: APU or APW$ at live rate) |
| Pricing basis | **Complexity tier of the learning path** (not the faculty day gate) |
| Scope | One `{ facultyId, pathId }` enrollment |
| Prerequisite | Active **day gate** for that faculty to open the path chooser from proximity; fees themselves are annual and persist across days |

### 3.4 Faculty interior

Each faculty gets an **internal classroom world** (enclosed stage, parallel to house / amenity / game stages):

- Looks like a classroom (boards, desks, section rails)
- Sections **showcase the curriculum** (path cards / boards)
- Learner can **inspect paths** and select one (`A` flow)
- After fees + **Start class (`C`)**, the room populates **lesson cards**
- Near a card, **`A`** reveals **course content** (read / learn UI)

### 3.5 Content packaging

Course outlines and lesson bodies live **in the repo** (file tree, not DB yet), organized by faculty → path → lessons, so they can later migrate to a CMS/DB without rewriting the player UX.

Canonical tree (implementation target):

```text
packages/play-ui/src/education/content/faculties/
  art/
  science/
  medicine/
  education/
```

Each faculty folder holds path folders with `outline.md` + `lessons/*.md` and a typed catalog index.

---

## 4. Document map (this package)

| Document | Role |
|----------|------|
| [README](./README.md) | Index + status |
| [Change summary](./change-summary-faculty-classroom.md) | This file — delta vs shipped |
| [PRD](./prd-faculty-classroom-learning.md) | Product requirements & acceptance |
| [Architecture](./architecture-faculty-classroom.md) | Systems, stages, data, money flows |
| [Engineering](./engineering-faculty-classroom.md) | Schemas, RPCs, UI, TDD, phases, migration |
| [Content pack](../../packages/play-ui/src/education/content/README.md) | Faculty course outlines & lessons in-repo |

Historical campus design (still useful for street/ambience): [elm-street-educational-arena.md](./elm-street-educational-arena.md). Prefer this package for faculties, interiors, fees, and class cards.

---

## 5. Explicit non-goals (this milestone)

- Expanding from 4 → 8 faculties  
- Mastery marks ledger / public scanner vanity (may stay later)  
- Multiplayer co-taught interiors  
- Moving content into a database (folder layout must make that migration obvious)  
- Changing day-gate price (stays 5 APU)  
- Arcade / parking / house systems except shared stage/proximity patterns  

---

## 6. Acceptance snapshot

Done when:

1. Faculties are renamed and labeled on Elm Street.  
2. Day gate still required; after payment, **P / A / C** prompts appear.  
3. **P** opens that faculty’s classroom interior.  
4. **A** opens path selection → complexity-priced annual fees (450–900 APW$ dual tender).  
5. **C** starts class only with active enrollment.  
6. Class mode shows lesson cards; proximity **`A`** reveals authored content.  
7. All four faculties ship Senior High outlines + lesson content under the content tree.  
