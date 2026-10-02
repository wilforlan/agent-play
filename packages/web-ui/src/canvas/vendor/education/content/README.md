# Elm Street education content pack

Senior High curricula for the four Elm Street **faculties**. This folder is the **source of truth** until a database/CMS migration (see [engineering doc](../../../../docs/education/engineering-faculty-classroom.md)).

## Layout

```text
content/
  README.md
  catalog.ts          # typed index: faculties → paths → lessons + tuition tier
  faculties/
    art|science|medicine|education/
      faculty.md
      <pathId>/
        outline.md
        lessons/
          01-<slug>.md
          ...
```

## Faculties

| Folder | facultyId | Objective |
|--------|-----------|-----------|
| `art/` | `faculty-art` | Languages, history, philosophy, visual arts |
| `science/` | `faculty-science` | Math, physics, chemistry, biology, CS |
| `medicine/` | `faculty-medicine` | Clinical training, nursing, medical research |
| `education/` | `faculty-education` | Teacher training and pedagogical studies |

## Paths & fees

Each faculty has **three** paths:

| Tier | APW$ / year (dual tender) |
|------|---------------------------|
| `foundation` | 450 |
| `intermediate` | 675 |
| `advanced` | 900 |

See `catalog.ts` for path ids and lesson file paths.

## Authoring rules

- Audience: **Senior High**
- Each path: `outline.md` + **≥4 lessons** (pack ships **5**)
- Lesson body: objectives, teaching, practice prompt, self-check
- Keep filenames stable once referenced by `catalog.ts`

## Runtime loading

Lesson Markdown is packed into `lesson-bodies.ts` for Next/Webpack and Vite:

```bash
node scripts/pack-education-lesson-bodies.mjs
```

`loadEducationLessonBody()` reads that static map — do not use `import.meta.glob` (Vite-only).

## Regenerating scaffolds

```bash
node scripts/seed-education-content.mjs
node scripts/pack-education-lesson-bodies.mjs
```

`seed-education-content.mjs` overwrites Markdown and `catalog.ts`. Re-pack bodies after editing lesson files.
