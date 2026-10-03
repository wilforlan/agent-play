# Engineering — Faculty Classrooms, Tuition & Lesson Cards

**Status:** Implementation guide for the Faculty Classroom milestone  
**Must satisfy:** [PRD](./prd-faculty-classroom-learning.md) · [Architecture](./architecture-faculty-classroom.md) · [Change summary](./change-summary-faculty-classroom.md)  
**Practice:** TDD (failing behavior test → minimal code → refactor). No production code without a failing test.

---

## 1. Scope checklist (do not ship partial silently)

### Already shipped (preserve)

- [x] Elm Street zone above Oak + gap  
- [x] Left-edge name strip; lights beside buildings  
- [x] Day gate 5 APU dual tender (`education_pass`)  
- [x] `getEducationAccess` / `purchaseEducationAccess`  
- [x] Proximity payment panel on approach  

### This milestone (all required)

- [ ] Rename 4 buildings → faculties (ids + labels + docs + content)  
- [ ] Legacy centerId → facultyId remap in SDK + stores  
- [ ] Post-day-pass proximity: **P / A / C** prompts and key handlers  
- [ ] Faculty interior classroom stage (`P`)  
- [ ] Path picker (`A`) with 3 paths / faculty  
- [ ] Annual tuition 450 / 675 / 900 APW$ dual tender  
- [ ] Enrollment persistence + expiry (365d)  
- [ ] Start class (`C`) gated on enrollment  
- [ ] Lesson cards + reader (`A` in class)  
- [ ] In-repo content pack for all 12 paths  
- [ ] Wallet + scanner for `education_tuition`  
- [ ] Vendor copy play-ui → web-ui  
- [ ] Tests + README index updates  

---

## 2. Package touch map

| Package | Areas |
|---------|--------|
| `@agent-play/joe` | Lesson teacher schemas, relevance gating, `runJoeTurn`, OpenAI adapter, pluggable chat store |
| `@agent-play/sdk` | Faculty/path schemas; tuition catalog; scanner op; purchase amenity kinds; remap helpers; browser exports |
| `@agent-play/play-ui` | Campus specs rename; proximity state machine; interior stage; panels; Joe chat UX; content pack; `main.ts` wiring |
| `@agent-play/web-ui` | Session store interface + redis + test-double; Joe RPC; scanner indexer; vendor copy |

---

## 3. Schemas & catalogs (SDK)

### 3.1 Faculty ids

```ts
export const EDUCATION_FACULTY_IDS = [
  "faculty-art",
  "faculty-science",
  "faculty-medicine",
  "faculty-education",
] as const;
```

Legacy map:

```ts
export const LEGACY_EDUCATION_CENTER_TO_FACULTY = {
  "foundations-hall": "faculty-art",
  "curriculum-tower": "faculty-science",
  "assessment-atelier": "faculty-medicine",
  "classroom-studio": "faculty-education",
} as const;
```

`isEducationCenterId` → rename to `isEducationFacultyId` (keep deprecated alias during migration).

### 3.2 Path catalog (server source of truth for price)

```ts
type EducationPathTier = "foundation" | "intermediate" | "advanced";

type EducationPathDef = {
  pathId: EducationPathId;
  facultyId: EducationFacultyId;
  tier: EducationPathTier;
  title: string;
  summary: string;
};

export const EDUCATION_TUITION_APW_BY_TIER = {
  foundation: 450,
  intermediate: 675,
  advanced: 900,
} as const;
```

Helpers:

- `quoteEducationTuitionApw({ tier })`  
- `quoteEducationTuitionApu({ tier, apwPerApu })`  
- `resolveEducationTuitionTender(...)` (mirror arcade/education day pass)  
- `buildEducationTuitionEnrollment(...)` → `{ facultyId, pathId, purchasedAt, expiresAt, tier, tender, apwCharged, apuCost }`  
- `isEducationTuitionActive(enrollment, now)` → `now < expiresAt`  
- `expiresAt = purchasedAt + 365 days` (ms)

### 3.3 Purchase record

Extend `PurchaseRecordSchema`:

- `amenityKind`: add `education_tuition`  
- `itemRef.kind`: add `education_tuition`  
- `itemRef.id`: `${facultyId}:${pathId}:${enrollmentKey}` (e.g. purchase iso day or uuid)

Scanner:

- `ScannerTxOpSchema`: add `purchaseEducationTuition`  
- `amenityKindToScannerOp`: `education_tuition` → `purchaseEducationTuition`

### 3.4 Day pass field rename

Internally treat `centerId` as `facultyId` (Zod field rename with `.centerId` deprecated alias **or** migrate field to `facultyId` and accept both on parse). Prefer **`facultyId`** going forward; dual-parse for one release.

---

## 4. Session store & RPC

### 4.1 Interface additions

```ts
getEducationTuition(input: {
  playerId: string;
  facultyId: EducationFacultyId;
  pathId: EducationPathId;
  now: string;
}): Promise<{
  enrollment: EducationTuitionEnrollment | null;
  apwPerApu: number;
  quoteApw: number;
  apuCost: number;
  preferredTender: EducationTender;
  wallet: PlayerWallet;
  path: { title: string; tier: EducationPathTier; summary: string };
}>;

purchaseEducationTuition(input: {
  playerId: string;
  facultyId: EducationFacultyId;
  pathId: EducationPathId;
  now: string;
  recordId: string;
}): Promise<
  | { ok: true; wallet; enrollment; purchase; tender }
  | { ok: false; error: "INSUFFICIENT_FUNDS" | "RATE_UNAVAILABLE" | "INVALID_PATH" | "DAY_PASS_REQUIRED" }
>;

listEducationTuition(input: {
  playerId: string;
  facultyId?: EducationFacultyId;
  now: string;
}): Promise<{ enrollments: EducationTuitionEnrollment[] }>;
```

**Policy:** `purchaseEducationTuition` requires active day pass for `facultyId` (`DAY_PASS_REQUIRED`).

### 4.2 Redis keys (proposal)

- `education:tuition:{playerId}` → hash field `{facultyId}:{pathId}` → JSON enrollment  
- Keep day passes under existing key; migrate center→faculty on read  

### 4.3 RPC ops

- `getEducationTuition`  
- `purchaseEducationTuition`  
- `listEducationTuition`  

Client modules: `education-tuition-client.ts` (parallel to education-access-client).

### 4.4 Tests (write first)

- `education-tuition-catalog.test.ts` — tiers → 450/675/900; expiry 365d  
- `session-store-education-tuition.test.ts` — purchase, idempotent active, insufficient funds, day pass required, path isolation  
- `route-education-tuition.test.ts` — 200/400/409  

---

## 5. play-ui proximity & keys

### 5.1 Prompt matrix

| dayPass | enrollment | classSession | Legend / prompt |
|---------|------------|--------------|-----------------|
| no | — | — | Day entry 5 APU (existing) |
| yes | no | no | `P: enter · A: choose path · C: start class (needs fees)` |
| yes | yes | no | `P: class · A: class · C: class` (enter enrolled classroom) |
| yes | yes | yes | Outline HUD + `A: outline · C: choose · P: start` near lesson |

Dev school fees: set `AGENT_PLAY_EDUCATION_DEV_FEES=1` for 5/7/10 APU by tier (prod stays 450/675/900 APW$). Progress persists in Redis via `getEducationProgress` / `recordEducationLessonComplete` (ungraded reflection).

**Joe lesson teacher** (`@agent-play/joe`):

- Redis key `agent-play:{hostId}:player:{playerId}:education-joe-chat` → map by `facultyId:pathId:lessonId`
- RPC `getJoeLessonChat` / `sendJoeLessonMessage` (day pass + tuition required; OpenAI via `OPENAI_API_KEY`, optional `JOE_MODEL`)
- Lesson panel split: markdown reader + robotic Joe chat dock (structured concept/example/probe/checkpoint replies; relevance target ≥ 0.8)

### 5.2 Key handlers (`main.ts`)

Overworld, nearest faculty, day pass active, no modal:

- **P** → if enrolled: class mode; else browse mode  
- **A** → if enrolled: class mode; else path/tuition picker  
- **C** → `startFacultyClass` (class mode when enrolled)  

Inside class mode:

- **A** → show course outline / progress HUD  
- **C** near lesson → choose/select lesson (outline highlight)  
- **P** → start selected or nearest lesson → reader + Joe chat + optional reflection → mark complete (no grading)  
- Browse mode **A** near path scroll → tuition/enroll  
- Exit door / Esc → leave stage  

### 5.3 Pure helpers (test without Pixi)

`education-faculty-prompt.ts`:

```ts
resolveFacultyProximityActions({
  hasDayPass: boolean;
  hasEnrollment: boolean;
  inClassSession: boolean;
}): {
  canEnter: boolean;
  canChoosePath: boolean;
  canStartClass: boolean;
  legend: string;
  prompt: string;
}
```

---

## 6. Faculty interior stage

### 6.1 File

`education-faculty-interior-stage.ts` (+ test for layout anchors / card positions).

### 6.2 Build inputs

```ts
buildFacultyClassroomStage({
  facultyId,
  mode: "browse" | "class",
  pathId?: EducationPathId,
  cellScale,
  palette,
  catalog: FacultyContentView,
})
```

### 6.3 Behaviors

- Browse: 3 section anchors from catalog paths  
- Class: N lesson card anchors from path lessons  
- Exit door proximity  
- Distinct wall/board colors per faculty  

### 6.4 Stage controller

Register stage id; wire enter/leave like house interior. Vendor-copy after green.

---

## 7. Panels

| Panel | Behavior |
|-------|----------|
| `education-path-panel` | List 3 paths; show tier + APW$ sticker; select → callback |
| `education-tuition-panel` | Show faculty+path, 365d copy, dual tender, unlock/dismiss |
| `education-lesson-panel` | Title, objectives snippet, scrollable Markdown/HTML body |

Reuse visual language of education day-gate panel (campus green), not arcade teal.

Tests: affordability, select path, open lesson renders title.

---

## 8. Content pack engineering

### 8.1 Layout (locked)

```text
packages/play-ui/src/education/content/
  README.md
  catalog.ts
  faculties/
    art|science|medicine|education/
      faculty.md
      <pathId>/
        outline.md
        lessons/
          01-<slug>.md
          ...
```

### 8.2 `catalog.ts` contract

Exports:

- `EDUCATION_CONTENT_FACULTIES`  
- `getFacultyContent(facultyId)`  
- `getPathContent(pathId)`  
- `listLessons(pathId)`  

Each path entry includes `tier`, `title`, `summary`, `lessonIds[]`.  
Lesson entry includes `title`, `order`, `body` (string).

**Loading strategy (choose one in impl; document in PR):**

1. **Preferred for v1:** Vite `import body from "./lessons/01-x.md?raw"` listed explicitly in `catalog.ts`  
2. Alternative: build script that packs Markdown → `content.generated.json`

Invariant test: every catalog lesson file resolves; every path has ≥4 lessons; tiers match fee table.

### 8.3 Authoring rules

- Senior High voice  
- No emoji required  
- Lesson length: ~400–900 words target (readable in-panel)  
- Outline lists lesson order matching filenames  

---

## 9. Campus layer rename

Update `EDUCATION_CENTER_SPECS` → `EDUCATION_FACULTY_SPECS`:

| id | label | subtitle |
|----|-------|----------|
| faculty-art | Faculty of Art | Languages · History · Philosophy · Visual arts |
| faculty-science | Faculty of Science | Math · Physics · Chemistry · Biology · CS |
| faculty-medicine | Faculty of Medicine | Clinical · Nursing · Research |
| faculty-education | Faculty of Education | Pedagogy · Teacher training |

Keep building silhouette variety (tower vs hall) mapped to new ids.

Update day-pass RPCs payloads to `facultyId` (accept legacy `centerId` in route for one release).

---

## 10. Wallet UI

- `PurchaseRecordDto` unions include `education_tuition`  
- Label: “School fees” / path title from detail  
- Subtitle: faculty · path · expiry  
- No “Open” amenity detail required (like arcade pass)

---

## 11. Implementation sequence (TDD)

1. SDK: faculty ids + remap + tuition catalog tests → implement  
2. Content pack scaffold + invariant test (files may be filled in parallel)  
3. Session store tuition tests → test-double → redis  
4. RPC tuition tests → route cases  
5. Prompt-matrix unit tests → main wiring post-gate verbs (P stub enter)  
6. Interior stage tests (anchors) → stage + P enter  
7. Path + tuition panels tests → A flow  
8. Class cards + lesson panel tests → C + A reader  
9. Scanner + wallet labels  
10. `copy-sources.mjs` · SDK build · play-ui/web-ui targeted tests  

Do not start step 6 UI until step 5 prompt rules are green.  
Do not start step 8 until step 7 tuition persists.

---

## 12. Feature-flag / rollout

Optional env `AGENT_PLAY_EDUCATION_CLASSROOM=1` if needed for staged prod; default on in local/dev once merged. Prefer ship complete milestone behind one flag rather than half-wired keys.

---

## 13. Documentation updates on merge

- [ ] `docs/education/README.md` points at this package as current  
- [ ] `docs/pending-features.md` — mark campus gate shipped; classroom milestone in progress/shipped  
- [ ] `docs/README.md` education blurb  
- [ ] Content `README.md` authoring guide  

---

## 14. Definition of done

A reviewer can:

1. Approach Faculty of Science → buy day gate → see P/A/C  
2. Press P → classroom with three curriculum sections  
3. Press A → pick Advanced path → pay ~900 APW$ (or APU) → enrollment shows in wallet  
4. Press C → lesson cards appear  
5. Walk to card → A → read Senior High lesson body from content pack  
6. All automated tests above pass; vendor copy synced  

---

## 15. Traceability matrix

| PRD requirement | Engineering locus |
|-----------------|-------------------|
| Faculty rename | campus specs, SDK ids, content folders |
| Post-gate P/A/C | proximity helpers + main keydown |
| Interior classroom | faculty interior stage |
| Path choose | path panel + catalog |
| Fees 450–900 dual tender | tuition catalog + store + panel |
| 365d enrollment | `buildEducationTuitionEnrollment` |
| Start class | C handler + class mode |
| Lesson cards + A | card anchors + lesson panel |
| Senior High content | `education/content/faculties/**` |
| Repo folders for later DB | catalog adapter boundary |
