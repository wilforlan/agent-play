import fs from "node:fs";
import path from "node:path";

const root = path.join("packages/play-ui/src/education/content");

const faculties = {
  art: {
    title: "Faculty of Art",
    objective:
      "Languages, history, philosophy, and visual arts for Senior High learners.",
    paths: [
      {
        id: "art-languages-communication",
        tier: "foundation",
        fee: 450,
        title: "Languages & Communication",
        summary:
          "Build precise reading, writing, and speaking skills for academic and civic life.",
        lessons: [
          [
            "01-rhetoric-everyday",
            "Rhetoric in Everyday Speech",
            "How claims, reasons, and evidence show up in ordinary conversation and school debate.",
          ],
          [
            "02-close-reading",
            "Close Reading for Argument",
            "Annotate informational and literary texts to uncover purpose and bias.",
          ],
          [
            "03-academic-paragraphs",
            "Academic Paragraph Craft",
            "Topic sentences, evidence weaving, and commentary that earns marks.",
          ],
          [
            "04-oral-presentation",
            "Oral Presentation Studio",
            "Structure a 3–5 minute talk with clear signposting and audience awareness.",
          ],
          [
            "05-language-across-cultures",
            "Language Across Cultures",
            "Register, translation pitfalls, and respectful multilingual communication.",
          ],
        ],
      },
      {
        id: "art-history-philosophy",
        tier: "intermediate",
        fee: 675,
        title: "History & Philosophy",
        summary:
          "Trace ideas and events that shaped modern societies, then practice ethical reasoning.",
        lessons: [
          [
            "01-timelines-and-causation",
            "Timelines and Causation",
            "Distinguish correlation from multi-causal historical explanation.",
          ],
          [
            "02-primary-sources",
            "Working with Primary Sources",
            "Sourcing, contextualization, and corroboration drills.",
          ],
          [
            "03-ethics-dilemmas",
            "Ethics Dilemmas Lab",
            "Apply utilitarian, deontological, and virtue lenses to Senior High cases.",
          ],
          [
            "04-political-ideas",
            "Political Ideas in Brief",
            "Liberty, equality, and authority in accessible philosophy texts.",
          ],
          [
            "05-local-to-global",
            "Local Histories, Global Frames",
            "Connect community history projects to world-system themes.",
          ],
        ],
      },
      {
        id: "art-visual-studio",
        tier: "advanced",
        fee: 900,
        title: "Visual Arts Studio",
        summary:
          "Develop a personal studio practice through observation, composition, and critique.",
        lessons: [
          [
            "01-seeing-drawing",
            "Seeing Before Drawing",
            "Contour, negative space, and measurement for observational accuracy.",
          ],
          [
            "02-color-and-light",
            "Color and Light",
            "Value scales, limited palettes, and mood through chroma.",
          ],
          [
            "03-composition-systems",
            "Composition Systems",
            "Rule of thirds, rhythm, and hierarchy in still life and poster design.",
          ],
          [
            "04-critique-circle",
            "Critique Circle",
            "Describe, analyze, interpret, evaluate — giving and receiving feedback.",
          ],
          [
            "05-portfolio-capstone",
            "Portfolio Capstone",
            "Select, sequence, and write artist statements for a mini-portfolio.",
          ],
        ],
      },
    ],
  },
  science: {
    title: "Faculty of Science",
    objective:
      "Mathematics, physics, chemistry, biology, and computer science for Senior High learners.",
    paths: [
      {
        id: "sci-mathematics",
        tier: "foundation",
        fee: 450,
        title: "Mathematics Foundations",
        summary:
          "Strengthen algebra, functions, and quantitative reasoning used across STEM.",
        lessons: [
          [
            "01-linear-relations",
            "Linear Relations",
            "Slope, intercept, and modeling with real data tables.",
          ],
          [
            "02-equations-systems",
            "Equations and Systems",
            "Solve and interpret systems in word problems.",
          ],
          [
            "03-functions-graphs",
            "Functions and Graphs",
            "Domain, range, and transforming basic function families.",
          ],
          [
            "04-exponents-growth",
            "Exponents and Growth",
            "Percent change, compound growth, and decay stories.",
          ],
          [
            "05-problem-solving-lab",
            "Problem-Solving Lab",
            "Polya-style habits: understand, plan, execute, check.",
          ],
        ],
      },
      {
        id: "sci-physical-life",
        tier: "intermediate",
        fee: 675,
        title: "Physical & Life Sciences",
        summary:
          "Integrate core physics, chemistry, and biology ideas through inquiry.",
        lessons: [
          [
            "01-forces-motion",
            "Forces and Motion",
            "Newton’s laws with classroom-scale experiments.",
          ],
          [
            "02-energy-systems",
            "Energy Systems",
            "Conservation, transfers, and efficiency calculations.",
          ],
          [
            "03-particles-reactions",
            "Particles and Reactions",
            "Atomic models, bonding basics, and balanced equations.",
          ],
          [
            "04-cells-systems",
            "Cells to Systems",
            "Organelles to organs; homeostasis case studies.",
          ],
          [
            "05-inquiry-writeup",
            "Inquiry Write-Up",
            "Question, method, data, uncertainty, and conclusion.",
          ],
        ],
      },
      {
        id: "sci-computer-modeling",
        tier: "advanced",
        fee: 900,
        title: "Computer Science & Modeling",
        summary:
          "Learn algorithmic thinking and simple models that simulate scientific ideas.",
        lessons: [
          [
            "01-algorithms-pseudocode",
            "Algorithms and Pseudocode",
            "Decomposition, patterns, and readable procedure design.",
          ],
          [
            "02-data-structures-lite",
            "Data Structures Lite",
            "Lists, maps, and when to choose each.",
          ],
          [
            "03-simulation-loops",
            "Simulation Loops",
            "Discrete time steps for population or physics toys.",
          ],
          [
            "04-debugging-mindset",
            "Debugging Mindset",
            "Reproduce, isolate, fix, regress — lab notebook habits.",
          ],
          [
            "05-model-critique",
            "Model Critique",
            "Assumptions, limits, and ethical use of simulations.",
          ],
        ],
      },
    ],
  },
  medicine: {
    title: "Faculty of Medicine",
    objective:
      "Clinical training foundations, nursing, and medical research literacy for Senior High learners.",
    paths: [
      {
        id: "med-nursing-fundamentals",
        tier: "foundation",
        fee: 450,
        title: "Nursing Fundamentals",
        summary: "Patient dignity, vital signs literacy, and safe helper habits.",
        lessons: [
          [
            "01-care-ethics",
            "Care Ethics at the Bedside",
            "Consent, privacy, and respectful communication.",
          ],
          [
            "02-vital-signs",
            "Vital Signs Literacy",
            "Pulse, temperature, respiration, BP — what numbers suggest.",
          ],
          [
            "03-infection-control",
            "Infection Control Basics",
            "Hand hygiene, PPE logic, and chain of infection.",
          ],
          [
            "04-documentation",
            "Documentation Habits",
            "Clear notes, timestamps, and avoiding charting errors.",
          ],
          [
            "05-team-roles",
            "Team Roles in Care",
            "How nurses coordinate with physicians, techs, and families.",
          ],
        ],
      },
      {
        id: "med-clinical-foundations",
        tier: "intermediate",
        fee: 675,
        title: "Clinical Foundations",
        summary:
          "Build clinical reasoning with history, exam logic, and triage thinking.",
        lessons: [
          [
            "01-history-taking",
            "History Taking",
            "Chief complaint, HPI structure, and open vs closed questions.",
          ],
          [
            "02-systems-overview",
            "Systems Overview",
            "Cardio, resp, neuro red flags at Senior High depth.",
          ],
          [
            "03-triage-thinking",
            "Triage Thinking",
            "Urgency ranking with limited information.",
          ],
          [
            "04-case-vignettes",
            "Case Vignettes",
            "Practice differentials without claiming diagnosis rights.",
          ],
          [
            "05-safety-first",
            "Safety First",
            "Escalation, scope of practice, and when to get help.",
          ],
        ],
      },
      {
        id: "med-research-methods",
        tier: "advanced",
        fee: 900,
        title: "Medical Research Methods",
        summary:
          "Read studies critically and design ethical mini-investigations.",
        lessons: [
          [
            "01-question-pico",
            "Questions with PICO",
            "Patient, intervention, comparison, outcome framing.",
          ],
          [
            "02-study-designs",
            "Study Designs",
            "Observational vs experimental; bias sources.",
          ],
          [
            "03-stats-sense",
            "Stats Sense",
            "Means, risk, and why p-values are not magic.",
          ],
          [
            "04-ethics-irb",
            "Ethics and Review",
            "Consent, minors, and why review boards exist.",
          ],
          [
            "05-poster-defense",
            "Poster Defense",
            "Present a mini-protocol and answer hard questions.",
          ],
        ],
      },
    ],
  },
  education: {
    title: "Faculty of Education",
    objective:
      "Teacher training and pedagogical studies for Senior High learners exploring education careers.",
    paths: [
      {
        id: "edu-pedagogy-foundations",
        tier: "foundation",
        fee: 450,
        title: "Pedagogical Foundations",
        summary: "How learning works and why instructional choices matter.",
        lessons: [
          [
            "01-how-learning-works",
            "How Learning Works",
            "Attention, memory, and desirable difficulties.",
          ],
          [
            "02-objectives-clarity",
            "Objectives with Clarity",
            "Write observable learning goals.",
          ],
          [
            "03-explanations",
            "Explanations that Stick",
            "Worked examples, dual coding, and checking understanding.",
          ],
          [
            "04-motivation",
            "Motivation in Class",
            "Autonomy, belonging, and mastery goals.",
          ],
          [
            "05-reflective-teacher",
            "The Reflective Teacher",
            "After-action notes that improve tomorrow’s lesson.",
          ],
        ],
      },
      {
        id: "edu-classroom-practice",
        tier: "intermediate",
        fee: 675,
        title: "Classroom Practice",
        summary: "Facilitation, routines, and inclusive presence in real rooms.",
        lessons: [
          [
            "01-routines-culture",
            "Routines and Culture",
            "Entry tasks, transitions, and shared norms.",
          ],
          [
            "02-questioning",
            "Questioning Techniques",
            "Cold call kindness, wait time, and bounce-back.",
          ],
          [
            "03-groupwork",
            "Groupwork that Works",
            "Roles, accountability, and equitable talk.",
          ],
          [
            "04-behavior-support",
            "Behavior Support",
            "Prevent, teach, reinforce — without humiliation.",
          ],
          [
            "05-microteaching",
            "Microteaching Lab",
            "Plan a 7-minute teach and peer feedback cycle.",
          ],
        ],
      },
      {
        id: "edu-curriculum-assessment",
        tier: "advanced",
        fee: 900,
        title: "Curriculum & Assessment Design",
        summary: "Sequence learning and assess with fairness and usefulness.",
        lessons: [
          [
            "01-backward-design",
            "Backward Design",
            "Outcomes → evidence → experiences.",
          ],
          [
            "02-rubrics",
            "Rubrics that Teach",
            "Criteria, levels, and student-friendly language.",
          ],
          [
            "03-formative-loops",
            "Formative Loops",
            "Exit tickets, feedback timing, and reteach decisions.",
          ],
          [
            "04-inclusive-assessment",
            "Inclusive Assessment",
            "Access tools without lowering the learning bar.",
          ],
          [
            "05-unit-blueprint",
            "Unit Blueprint Capstone",
            "Draft a two-week unit with assessments aligned.",
          ],
        ],
      },
    ],
  },
};

const lessonBody = (facultyTitle, pathTitle, lessonTitle, hook, order, total) =>
  `# ${lessonTitle}

**Faculty:** ${facultyTitle}  
**Path:** ${pathTitle}  
**Lesson ${String(order)} of ${String(total)}** · Senior High

## Why this lesson matters

${hook} In Senior High, you are training for independence: you must explain your thinking, not only recall a fact.

## Learning objectives

By the end of this lesson you should be able to:

1. State the core idea of **${lessonTitle}** in your own words.
2. Apply the idea to a short Senior High scenario.
3. Check your work with a simple self-test question.

## Core teaching

### Concept

Treat **${lessonTitle}** as a tool, not a trivia item. Start from a concrete example you already know from school or daily life, then name the pattern. Patterns transfer; isolated facts fade.

### Worked example

Imagine a classmate is stuck. You do not dump a definition. You ask what they already tried, show one modeled step, then ask them to complete the next step while you watch. That is how experts teach — and how you should study this card: example first, label second, practice third.

### Practice prompt

Write five to eight sentences that:

- define the idea behind **${lessonTitle}**
- give one original example
- name one common mistake and how to avoid it

### Self-check

If you can teach the idea to a peer in under two minutes without reading the card, you are ready for the next lesson. If not, reread the worked example and rewrite your practice response.

## Stretch (optional)

Connect this lesson to another subject you take this year. Where else does the same pattern appear? Note one transfer example in your notebook.

## Closing

Close the card when you have a written practice response. Progress in Elm Street faculties comes from honest attempts, not speed-running cards.
`;

const outlineBody = (facultyTitle, path) => {
  const rows = path.lessons
    .map(
      (l, i) => `| ${String(i + 1)} | ${l[1]} | \`lessons/${l[0]}.md\` |`
    )
    .join("\n");
  return `# ${path.title} — Course Outline

**Faculty:** ${facultyTitle}  
**Path id:** \`${path.id}\`  
**Tier:** ${path.tier} · **Annual school fees:** APW$ ${String(path.fee)} (dual tender)  
**Audience:** Senior High

## Description

${path.summary}

## Objectives

- Build Senior High competence aligned to the faculty mission.
- Complete each lesson card with a written practice response.
- Be ready to discuss ideas aloud in class mode.

## Lesson sequence

| # | Lesson | File |
|---|--------|------|
${rows}

## Assessment (v1)

Opening a lesson card and engaging the practice prompt counts as progress. Formal exams are out of scope for this content pack version.
`;
};

for (const [facultyKey, faculty] of Object.entries(faculties)) {
  const fullFacultyId = `faculty-${facultyKey}`;
  const fdir = path.join(root, "faculties", facultyKey);
  fs.mkdirSync(fdir, { recursive: true });
  fs.writeFileSync(
    path.join(fdir, "faculty.md"),
    `# ${faculty.title}

**facultyId:** \`${fullFacultyId}\`

## Objective

${faculty.objective}

## Learning paths

${faculty.paths
  .map(
    (p) =>
      `- **${p.title}** (\`${p.id}\`) — tier \`${p.tier}\`, APW$ ${String(p.fee)}/year`
  )
  .join("\n")}
`
  );

  for (const p of faculty.paths) {
    const pdir = path.join(fdir, p.id);
    const ldir = path.join(pdir, "lessons");
    fs.mkdirSync(ldir, { recursive: true });
    fs.writeFileSync(path.join(pdir, "outline.md"), outlineBody(faculty.title, p));
    p.lessons.forEach((lesson, idx) => {
      const [slug, title, hook] = lesson;
      fs.writeFileSync(
        path.join(ldir, `${slug}.md`),
        lessonBody(
          faculty.title,
          p.title,
          title,
          hook,
          idx + 1,
          p.lessons.length
        )
      );
    });
  }
}

const facultiesMeta = Object.entries(faculties).map(([key, faculty]) => ({
  facultyId: `faculty-${key}`,
  title: faculty.title,
  objective: faculty.objective,
  paths: faculty.paths.map((p) => ({
    pathId: p.id,
    facultyId: `faculty-${key}`,
    tier: p.tier,
    title: p.title,
    summary: p.summary,
    tuitionApw: p.fee,
    outlineFile: `faculties/${key}/${p.id}/outline.md`,
    lessons: p.lessons.map((l, i) => ({
      id: `${p.id}/${l[0]}`,
      order: i + 1,
      title: l[1],
      file: `faculties/${key}/${p.id}/lessons/${l[0]}.md`,
    })),
  })),
}));

const catalogSrc = `/**
 * Typed index for Elm Street faculty curricula (Senior High).
 * Markdown sources live under ./faculties/** — load with Vite ?raw at runtime.
 */

export const EDUCATION_TUITION_APW_BY_TIER = {
  foundation: 450,
  intermediate: 675,
  advanced: 900,
} as const;

export type EducationPathTier = keyof typeof EDUCATION_TUITION_APW_BY_TIER;

export type EducationFacultyId =
  | "faculty-art"
  | "faculty-science"
  | "faculty-medicine"
  | "faculty-education";

export type EducationContentLessonMeta = {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly file: string;
};

export type EducationContentPathMeta = {
  readonly pathId: string;
  readonly facultyId: EducationFacultyId;
  readonly tier: EducationPathTier;
  readonly title: string;
  readonly summary: string;
  readonly tuitionApw: number;
  readonly outlineFile: string;
  readonly lessons: readonly EducationContentLessonMeta[];
};

export type EducationContentFacultyMeta = {
  readonly facultyId: EducationFacultyId;
  readonly title: string;
  readonly objective: string;
  readonly paths: readonly EducationContentPathMeta[];
};

export const EDUCATION_CONTENT_FACULTIES: readonly EducationContentFacultyMeta[] =
  ${JSON.stringify(facultiesMeta, null, 2)} as const;

export const getFacultyContent = (
  facultyId: EducationFacultyId
): EducationContentFacultyMeta | undefined =>
  EDUCATION_CONTENT_FACULTIES.find((f) => f.facultyId === facultyId);

export const getPathContent = (
  pathId: string
): EducationContentPathMeta | undefined => {
  for (const faculty of EDUCATION_CONTENT_FACULTIES) {
    const pathMeta = faculty.paths.find((p) => p.pathId === pathId);
    if (pathMeta !== undefined) return pathMeta;
  }
  return undefined;
};

export const listAllPaths = (): readonly EducationContentPathMeta[] =>
  EDUCATION_CONTENT_FACULTIES.flatMap((f) => [...f.paths]);
`;

fs.writeFileSync(path.join(root, "catalog.ts"), catalogSrc);
console.log(
  "content pack ready",
  facultiesMeta.length,
  "faculties",
  facultiesMeta.reduce((n, f) => n + f.paths.length, 0),
  "paths"
);

const { spawnSync } = await import("node:child_process");
const pack = spawnSync(
  process.execPath,
  [path.join("scripts", "pack-education-lesson-bodies.mjs")],
  { stdio: "inherit" }
);
if (pack.status !== 0) {
  process.exit(pack.status ?? 1);
}
