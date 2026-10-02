# Architecture — Faculty Classrooms, Fees & Class Sessions

**Status:** Target architecture for the Faculty Classroom milestone  
**Inputs:** [PRD](./prd-faculty-classroom-learning.md) · shipped Elm Street day-gate stack  
**Companion:** [Engineering](./engineering-faculty-classroom.md)

---

## 1. Context

Agent Play already has:

- Overworld Pixi campus (`educationCampusLayer`) with four buildings and day-gate proximity payment  
- Enclosed stages (house, amenity, arcade games) with Esc/exit patterns  
- Dual-tender catalogs + session-store purchase CAS + scanner indexing  
- Wallet inventory surface for `education_pass`

This milestone adds **faculty interiors**, **tuition enrollments**, **class sessions**, and a **file-backed curriculum pack**.

```text
┌─────────────────────────────────────────────────────────────┐
│ Overworld (Elm Street)                                      │
│  faculty buildings · day gate · P/A/C prompts               │
└───────────────┬─────────────────────────────────────────────┘
                │ P / C
                ▼
┌─────────────────────────────────────────────────────────────┐
│ Faculty Interior Stage (classroom)                          │
│  curriculum sections · path boards · exit door              │
│  class mode: lesson cards                                   │
└───────────────┬─────────────────────────────────────────────┘
                │ A (path) / A (lesson)
                ▼
┌─────────────────────────────────────────────────────────────┐
│ DOM panels                                                  │
│  path picker · tuition gate · lesson reader                 │
└─────────────────────────────────────────────────────────────┘
                │ RPC
                ▼
┌─────────────────────────────────────────────────────────────┐
│ web-ui session store + SDK catalogs                         │
│  day pass · tuition enrollment · wallet · scanner           │
└─────────────────────────────────────────────────────────────┘
                ▲
                │ static import
┌─────────────────────────────────────────────────────────────┐
│ play-ui education content pack (repo folders)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Domain model

### 2.1 Identities

| Concept | Id type | Example |
|---------|---------|---------|
| Faculty | `EducationFacultyId` | `faculty-science` |
| Learning path | `EducationPathId` | `sci-mathematics` |
| Lesson | `EducationLessonId` | `sci-mathematics/03-linear-relations` |
| Day pass | existing `EducationAccessPass` | per faculty UTC day |
| Enrollment | `EducationTuitionEnrollment` | per faculty+path, 365d |

### 2.2 Relationships

```text
Faculty 1──* Path 1──* Lesson
Player 1──* DayPass(faculty, utcDay)
Player 1──* Enrollment(faculty, path, expiresAt)
Player 0──1 ActiveClassSession(faculty, path)   // client stage state; server may mirror later
```

### 2.3 Access rules (authoritative)

| Action | Requires |
|--------|----------|
| Show post-gate prompts | Active day pass for faculty |
| Enter interior (`P`) | Active day pass |
| Open path picker (`A`) | Active day pass |
| Purchase tuition | Active day pass **recommended** for UX; server may allow tuition without day pass but client only offers **A** when gated |
| Start class (`C`) | Active day pass **and** unexpired enrollment for a path in that faculty |
| Open lesson | Active class session for that path (client) + day pass still nice-to-have same UTC day |

**PRD client rule:** tuition chooser only from gated proximity/interior.  
**Server rule:** tuition purchase validates path id + funds; optionally requires day pass for anti-abuse (engineering recommendation: **require day pass**).

---

## 3. Runtime surfaces

### 3.1 play-ui (watch canvas)

| Module (proposed) | Responsibility |
|-------------------|----------------|
| `education-campus-layer` | Faculty facades, plaques, lights, name strip (rename specs) |
| `education-campus-proximity` | Nearest faculty + prompt copy by access state |
| `education-access-*` | Day gate (existing) |
| `education-faculty-interior-stage` | Classroom graphics, sections, cards, exit |
| `education-path-panel` | Path picker UI |
| `education-tuition-panel` | Annual fee confirmation (dual tender) |
| `education-lesson-panel` | Lesson reader |
| `education/content/**` | Static curriculum pack |
| `main.ts` | Wire proximity keys P/A/C, stage enter, panels |

### 3.2 web-ui / SDK

| Layer | Responsibility |
|-------|----------------|
| `education-access-catalog` | Day gate (existing) + faculty id rename |
| `education-tuition-catalog` (new) | Path tiers, APW$ sticker, dual tender resolve |
| Session store | `getEducationTuition` / `purchaseEducationTuition` (+ list enrollments) |
| RPC route | Mirror store ops |
| Scanner | `education_tuition` → `purchaseEducationTuition` |
| Wallet DTO | Show tuition rows |

### 3.3 Content pack (repo)

```text
packages/play-ui/src/education/content/
  README.md
  catalog.ts                 # typed index: faculties → paths → lessons + fee tier
  faculties/
    art/
      faculty.md
      art-languages-communication/
        outline.md
        lessons/
          01-....md
      ...
    science/
    medicine/
    education/
```

Runtime loads via `catalog.ts` (import Markdown as raw strings through Vite `?raw` or precompiled JSON generated in build — engineering picks one; architecture requires **file-per-lesson** source of truth).

---

## 4. Stage architecture

### 4.1 Stage id

Proposed: `facultyClassroom` (or `educationFaculty`) on `StageController`.

Lifecycle mirrors `houseInterior` / `spaceYard`:

1. `enterFacultyClassroom({ facultyId, mode: "browse" | "class", pathId? })`  
2. Build stage handle with bounds, exit door, local player  
3. `back()` on Esc / exit proximity  

### 4.2 Modes

| Mode | Contents |
|------|----------|
| `browse` | Curriculum section boards for 3 paths; plaques; no lesson cards (or dimmed) |
| `class` | Lesson cards for active `pathId`; section boards may remain as wayfinding |

Transition `browse → class` on successful **C** (or enter directly in class mode).

### 4.3 Spatial layout (logical)

```text
     [Board: Faculty title]
[Path A] [Path B] [Path C]     ← browse sections
        [Teacher desk]
   card1 card2 card3 card4     ← class mode only
        [Exit door]
```

World units local to stage (not overworld cells), same pattern as yard/house.

---

## 5. Input priority

When multiple systems compete:

1. Modal open (tuition / path / lesson / day gate) → consume Esc first  
2. Agent partner proximity (assist/chat) on overworld  
3. Faculty post-gate **P / A / C** when nearest faculty & day pass  
4. Faculty day-gate payment when no pass  
5. House / parking / structure / arcade  

Inside faculty stage:

1. Lesson panel / path panel open  
2. Exit door  
3. Lesson-card **A**  
4. Path-section **A** (browse)  
5. Movement  

**C** on overworld with enrollment: enter interior in class mode if not inside.

---

## 6. Money flows

### 6.1 Day gate (existing)

`education_pass` · 5 APU · UTC day · `purchaseEducationAccess`

### 6.2 Tuition (new)

```text
Client A → path select → tuition panel
  getEducationTuition({ facultyId, pathId })
    → quoteApw, apuCost, preferredTender, existing enrollment?
  purchaseEducationTuition({ facultyId, pathId })
    → debit APU or APW$
    → Enrollment { purchasedAt, expiresAt: +365d, tier, apwCharged, apuCost }
    → PurchaseRecord amenityKind: education_tuition
    → scanner op: purchaseEducationTuition
```

Fee table (APW$ sticker):

| tier | quoteApw |
|------|----------|
| foundation | 450 |
| intermediate | 675 |
| advanced | 900 |

APU side derived from live `apwPerApu` via shared dual-tender helper.

---

## 7. Client state caches

| Cache | Shape |
|-------|-------|
| `educationAccessPassCache` | `Map<facultyId, DayPass>` (existing, rename keys) |
| `educationTuitionCache` | `Map<`${facultyId}:${pathId}`, Enrollment>` |
| `activeClassPathByFaculty` | `Map<facultyId, pathId>` |
| `openedLessons` | optional Set for HUD (can be localStorage later) |

Invalidate / refresh from RPC after purchases and on enter proximity (throttled).

---

## 8. Data migration

### 8.1 Faculty id remap

| Legacy centerId | New facultyId |
|-----------------|---------------|
| `foundations-hall` | `faculty-art` |
| `curriculum-tower` | `faculty-science` |
| `assessment-atelier` | `faculty-medicine` |
| `classroom-studio` | `faculty-education` |

Day passes stored under old ids: on read, map legacy → new; new writes use faculty ids only.

### 8.2 Content → DB (future)

Keep `catalog.ts` as adapter boundary. Future `ContentRepository` can swap file loaders for HTTP/CMS without changing stage/panels.

---

## 9. Security & abuse

- All charges server-authoritative  
- Tuition amount taken from server catalog, never client-stated price  
- CAS on wallet debit  
- Scanner mirror failures must not silently skip wallet mutation (same as existing purchases)  
- Lesson content is public static; no secrets in Markdown  

---

## 10. Observability

- Verbose logs: enter faculty, tuition quote/purchase, class start, lesson open  
- Analytics events (proposed): `education_faculty_enter`, `education_tuition_purchase`, `education_class_start`, `education_lesson_open`  

---

## 11. Testing architecture

| Layer | Examples |
|-------|----------|
| Pure catalog | Tier → 450/675/900; remap ids; enrollment active |
| Session store | Tuition purchase, insufficient funds, idempotent active enrollment |
| RPC | get/purchase tuition; invalid path 400 |
| Proximity pure fn | Prompt verbs by pass/enrollment/class state |
| Panel DOM | Path select → tuition; lesson open |
| Content pack | Catalog references existing files; every path ≥4 lessons |

---

## 12. Phased delivery (architectural)

1. **Rename & gate unlock** — faculty ids/labels; post-gate P/A/C prompts (P/A/C may stub)  
2. **Interior browse** — classroom stage + exit  
3. **Tuition** — catalog, store, panels, wallet/scanner  
4. **Class mode** — cards + lesson reader wired to content pack  
5. **Polish** — copy, mobile layout, analytics  

Dependencies: (1) before (2–4); (3) before meaningful (4); content pack can land in parallel from phase 1.
