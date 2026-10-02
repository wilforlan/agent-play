/**
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
  [
  {
    "facultyId": "faculty-art",
    "title": "Faculty of Art",
    "objective": "Languages, history, philosophy, and visual arts for Senior High learners.",
    "paths": [
      {
        "pathId": "art-languages-communication",
        "facultyId": "faculty-art",
        "tier": "foundation",
        "title": "Languages & Communication",
        "summary": "Build precise reading, writing, and speaking skills for academic and civic life.",
        "tuitionApw": 450,
        "outlineFile": "faculties/art/art-languages-communication/outline.md",
        "lessons": [
          {
            "id": "art-languages-communication/01-rhetoric-everyday",
            "order": 1,
            "title": "Rhetoric in Everyday Speech",
            "file": "faculties/art/art-languages-communication/lessons/01-rhetoric-everyday.md"
          },
          {
            "id": "art-languages-communication/02-close-reading",
            "order": 2,
            "title": "Close Reading for Argument",
            "file": "faculties/art/art-languages-communication/lessons/02-close-reading.md"
          },
          {
            "id": "art-languages-communication/03-academic-paragraphs",
            "order": 3,
            "title": "Academic Paragraph Craft",
            "file": "faculties/art/art-languages-communication/lessons/03-academic-paragraphs.md"
          },
          {
            "id": "art-languages-communication/04-oral-presentation",
            "order": 4,
            "title": "Oral Presentation Studio",
            "file": "faculties/art/art-languages-communication/lessons/04-oral-presentation.md"
          },
          {
            "id": "art-languages-communication/05-language-across-cultures",
            "order": 5,
            "title": "Language Across Cultures",
            "file": "faculties/art/art-languages-communication/lessons/05-language-across-cultures.md"
          }
        ]
      },
      {
        "pathId": "art-history-philosophy",
        "facultyId": "faculty-art",
        "tier": "intermediate",
        "title": "History & Philosophy",
        "summary": "Trace ideas and events that shaped modern societies, then practice ethical reasoning.",
        "tuitionApw": 675,
        "outlineFile": "faculties/art/art-history-philosophy/outline.md",
        "lessons": [
          {
            "id": "art-history-philosophy/01-timelines-and-causation",
            "order": 1,
            "title": "Timelines and Causation",
            "file": "faculties/art/art-history-philosophy/lessons/01-timelines-and-causation.md"
          },
          {
            "id": "art-history-philosophy/02-primary-sources",
            "order": 2,
            "title": "Working with Primary Sources",
            "file": "faculties/art/art-history-philosophy/lessons/02-primary-sources.md"
          },
          {
            "id": "art-history-philosophy/03-ethics-dilemmas",
            "order": 3,
            "title": "Ethics Dilemmas Lab",
            "file": "faculties/art/art-history-philosophy/lessons/03-ethics-dilemmas.md"
          },
          {
            "id": "art-history-philosophy/04-political-ideas",
            "order": 4,
            "title": "Political Ideas in Brief",
            "file": "faculties/art/art-history-philosophy/lessons/04-political-ideas.md"
          },
          {
            "id": "art-history-philosophy/05-local-to-global",
            "order": 5,
            "title": "Local Histories, Global Frames",
            "file": "faculties/art/art-history-philosophy/lessons/05-local-to-global.md"
          }
        ]
      },
      {
        "pathId": "art-visual-studio",
        "facultyId": "faculty-art",
        "tier": "advanced",
        "title": "Visual Arts Studio",
        "summary": "Develop a personal studio practice through observation, composition, and critique.",
        "tuitionApw": 900,
        "outlineFile": "faculties/art/art-visual-studio/outline.md",
        "lessons": [
          {
            "id": "art-visual-studio/01-seeing-drawing",
            "order": 1,
            "title": "Seeing Before Drawing",
            "file": "faculties/art/art-visual-studio/lessons/01-seeing-drawing.md"
          },
          {
            "id": "art-visual-studio/02-color-and-light",
            "order": 2,
            "title": "Color and Light",
            "file": "faculties/art/art-visual-studio/lessons/02-color-and-light.md"
          },
          {
            "id": "art-visual-studio/03-composition-systems",
            "order": 3,
            "title": "Composition Systems",
            "file": "faculties/art/art-visual-studio/lessons/03-composition-systems.md"
          },
          {
            "id": "art-visual-studio/04-critique-circle",
            "order": 4,
            "title": "Critique Circle",
            "file": "faculties/art/art-visual-studio/lessons/04-critique-circle.md"
          },
          {
            "id": "art-visual-studio/05-portfolio-capstone",
            "order": 5,
            "title": "Portfolio Capstone",
            "file": "faculties/art/art-visual-studio/lessons/05-portfolio-capstone.md"
          }
        ]
      }
    ]
  },
  {
    "facultyId": "faculty-science",
    "title": "Faculty of Science",
    "objective": "Mathematics, physics, chemistry, biology, and computer science for Senior High learners.",
    "paths": [
      {
        "pathId": "sci-mathematics",
        "facultyId": "faculty-science",
        "tier": "foundation",
        "title": "Mathematics Foundations",
        "summary": "Strengthen algebra, functions, and quantitative reasoning used across STEM.",
        "tuitionApw": 450,
        "outlineFile": "faculties/science/sci-mathematics/outline.md",
        "lessons": [
          {
            "id": "sci-mathematics/01-linear-relations",
            "order": 1,
            "title": "Linear Relations",
            "file": "faculties/science/sci-mathematics/lessons/01-linear-relations.md"
          },
          {
            "id": "sci-mathematics/02-equations-systems",
            "order": 2,
            "title": "Equations and Systems",
            "file": "faculties/science/sci-mathematics/lessons/02-equations-systems.md"
          },
          {
            "id": "sci-mathematics/03-functions-graphs",
            "order": 3,
            "title": "Functions and Graphs",
            "file": "faculties/science/sci-mathematics/lessons/03-functions-graphs.md"
          },
          {
            "id": "sci-mathematics/04-exponents-growth",
            "order": 4,
            "title": "Exponents and Growth",
            "file": "faculties/science/sci-mathematics/lessons/04-exponents-growth.md"
          },
          {
            "id": "sci-mathematics/05-problem-solving-lab",
            "order": 5,
            "title": "Problem-Solving Lab",
            "file": "faculties/science/sci-mathematics/lessons/05-problem-solving-lab.md"
          }
        ]
      },
      {
        "pathId": "sci-physical-life",
        "facultyId": "faculty-science",
        "tier": "intermediate",
        "title": "Physical & Life Sciences",
        "summary": "Integrate core physics, chemistry, and biology ideas through inquiry.",
        "tuitionApw": 675,
        "outlineFile": "faculties/science/sci-physical-life/outline.md",
        "lessons": [
          {
            "id": "sci-physical-life/01-forces-motion",
            "order": 1,
            "title": "Forces and Motion",
            "file": "faculties/science/sci-physical-life/lessons/01-forces-motion.md"
          },
          {
            "id": "sci-physical-life/02-energy-systems",
            "order": 2,
            "title": "Energy Systems",
            "file": "faculties/science/sci-physical-life/lessons/02-energy-systems.md"
          },
          {
            "id": "sci-physical-life/03-particles-reactions",
            "order": 3,
            "title": "Particles and Reactions",
            "file": "faculties/science/sci-physical-life/lessons/03-particles-reactions.md"
          },
          {
            "id": "sci-physical-life/04-cells-systems",
            "order": 4,
            "title": "Cells to Systems",
            "file": "faculties/science/sci-physical-life/lessons/04-cells-systems.md"
          },
          {
            "id": "sci-physical-life/05-inquiry-writeup",
            "order": 5,
            "title": "Inquiry Write-Up",
            "file": "faculties/science/sci-physical-life/lessons/05-inquiry-writeup.md"
          }
        ]
      },
      {
        "pathId": "sci-computer-modeling",
        "facultyId": "faculty-science",
        "tier": "advanced",
        "title": "Computer Science & Modeling",
        "summary": "Learn algorithmic thinking and simple models that simulate scientific ideas.",
        "tuitionApw": 900,
        "outlineFile": "faculties/science/sci-computer-modeling/outline.md",
        "lessons": [
          {
            "id": "sci-computer-modeling/01-algorithms-pseudocode",
            "order": 1,
            "title": "Algorithms and Pseudocode",
            "file": "faculties/science/sci-computer-modeling/lessons/01-algorithms-pseudocode.md"
          },
          {
            "id": "sci-computer-modeling/02-data-structures-lite",
            "order": 2,
            "title": "Data Structures Lite",
            "file": "faculties/science/sci-computer-modeling/lessons/02-data-structures-lite.md"
          },
          {
            "id": "sci-computer-modeling/03-simulation-loops",
            "order": 3,
            "title": "Simulation Loops",
            "file": "faculties/science/sci-computer-modeling/lessons/03-simulation-loops.md"
          },
          {
            "id": "sci-computer-modeling/04-debugging-mindset",
            "order": 4,
            "title": "Debugging Mindset",
            "file": "faculties/science/sci-computer-modeling/lessons/04-debugging-mindset.md"
          },
          {
            "id": "sci-computer-modeling/05-model-critique",
            "order": 5,
            "title": "Model Critique",
            "file": "faculties/science/sci-computer-modeling/lessons/05-model-critique.md"
          }
        ]
      }
    ]
  },
  {
    "facultyId": "faculty-medicine",
    "title": "Faculty of Medicine",
    "objective": "Clinical training foundations, nursing, and medical research literacy for Senior High learners.",
    "paths": [
      {
        "pathId": "med-nursing-fundamentals",
        "facultyId": "faculty-medicine",
        "tier": "foundation",
        "title": "Nursing Fundamentals",
        "summary": "Patient dignity, vital signs literacy, and safe helper habits.",
        "tuitionApw": 450,
        "outlineFile": "faculties/medicine/med-nursing-fundamentals/outline.md",
        "lessons": [
          {
            "id": "med-nursing-fundamentals/01-care-ethics",
            "order": 1,
            "title": "Care Ethics at the Bedside",
            "file": "faculties/medicine/med-nursing-fundamentals/lessons/01-care-ethics.md"
          },
          {
            "id": "med-nursing-fundamentals/02-vital-signs",
            "order": 2,
            "title": "Vital Signs Literacy",
            "file": "faculties/medicine/med-nursing-fundamentals/lessons/02-vital-signs.md"
          },
          {
            "id": "med-nursing-fundamentals/03-infection-control",
            "order": 3,
            "title": "Infection Control Basics",
            "file": "faculties/medicine/med-nursing-fundamentals/lessons/03-infection-control.md"
          },
          {
            "id": "med-nursing-fundamentals/04-documentation",
            "order": 4,
            "title": "Documentation Habits",
            "file": "faculties/medicine/med-nursing-fundamentals/lessons/04-documentation.md"
          },
          {
            "id": "med-nursing-fundamentals/05-team-roles",
            "order": 5,
            "title": "Team Roles in Care",
            "file": "faculties/medicine/med-nursing-fundamentals/lessons/05-team-roles.md"
          }
        ]
      },
      {
        "pathId": "med-clinical-foundations",
        "facultyId": "faculty-medicine",
        "tier": "intermediate",
        "title": "Clinical Foundations",
        "summary": "Build clinical reasoning with history, exam logic, and triage thinking.",
        "tuitionApw": 675,
        "outlineFile": "faculties/medicine/med-clinical-foundations/outline.md",
        "lessons": [
          {
            "id": "med-clinical-foundations/01-history-taking",
            "order": 1,
            "title": "History Taking",
            "file": "faculties/medicine/med-clinical-foundations/lessons/01-history-taking.md"
          },
          {
            "id": "med-clinical-foundations/02-systems-overview",
            "order": 2,
            "title": "Systems Overview",
            "file": "faculties/medicine/med-clinical-foundations/lessons/02-systems-overview.md"
          },
          {
            "id": "med-clinical-foundations/03-triage-thinking",
            "order": 3,
            "title": "Triage Thinking",
            "file": "faculties/medicine/med-clinical-foundations/lessons/03-triage-thinking.md"
          },
          {
            "id": "med-clinical-foundations/04-case-vignettes",
            "order": 4,
            "title": "Case Vignettes",
            "file": "faculties/medicine/med-clinical-foundations/lessons/04-case-vignettes.md"
          },
          {
            "id": "med-clinical-foundations/05-safety-first",
            "order": 5,
            "title": "Safety First",
            "file": "faculties/medicine/med-clinical-foundations/lessons/05-safety-first.md"
          }
        ]
      },
      {
        "pathId": "med-research-methods",
        "facultyId": "faculty-medicine",
        "tier": "advanced",
        "title": "Medical Research Methods",
        "summary": "Read studies critically and design ethical mini-investigations.",
        "tuitionApw": 900,
        "outlineFile": "faculties/medicine/med-research-methods/outline.md",
        "lessons": [
          {
            "id": "med-research-methods/01-question-pico",
            "order": 1,
            "title": "Questions with PICO",
            "file": "faculties/medicine/med-research-methods/lessons/01-question-pico.md"
          },
          {
            "id": "med-research-methods/02-study-designs",
            "order": 2,
            "title": "Study Designs",
            "file": "faculties/medicine/med-research-methods/lessons/02-study-designs.md"
          },
          {
            "id": "med-research-methods/03-stats-sense",
            "order": 3,
            "title": "Stats Sense",
            "file": "faculties/medicine/med-research-methods/lessons/03-stats-sense.md"
          },
          {
            "id": "med-research-methods/04-ethics-irb",
            "order": 4,
            "title": "Ethics and Review",
            "file": "faculties/medicine/med-research-methods/lessons/04-ethics-irb.md"
          },
          {
            "id": "med-research-methods/05-poster-defense",
            "order": 5,
            "title": "Poster Defense",
            "file": "faculties/medicine/med-research-methods/lessons/05-poster-defense.md"
          }
        ]
      }
    ]
  },
  {
    "facultyId": "faculty-education",
    "title": "Faculty of Education",
    "objective": "Teacher training and pedagogical studies for Senior High learners exploring education careers.",
    "paths": [
      {
        "pathId": "edu-pedagogy-foundations",
        "facultyId": "faculty-education",
        "tier": "foundation",
        "title": "Pedagogical Foundations",
        "summary": "How learning works and why instructional choices matter.",
        "tuitionApw": 450,
        "outlineFile": "faculties/education/edu-pedagogy-foundations/outline.md",
        "lessons": [
          {
            "id": "edu-pedagogy-foundations/01-how-learning-works",
            "order": 1,
            "title": "How Learning Works",
            "file": "faculties/education/edu-pedagogy-foundations/lessons/01-how-learning-works.md"
          },
          {
            "id": "edu-pedagogy-foundations/02-objectives-clarity",
            "order": 2,
            "title": "Objectives with Clarity",
            "file": "faculties/education/edu-pedagogy-foundations/lessons/02-objectives-clarity.md"
          },
          {
            "id": "edu-pedagogy-foundations/03-explanations",
            "order": 3,
            "title": "Explanations that Stick",
            "file": "faculties/education/edu-pedagogy-foundations/lessons/03-explanations.md"
          },
          {
            "id": "edu-pedagogy-foundations/04-motivation",
            "order": 4,
            "title": "Motivation in Class",
            "file": "faculties/education/edu-pedagogy-foundations/lessons/04-motivation.md"
          },
          {
            "id": "edu-pedagogy-foundations/05-reflective-teacher",
            "order": 5,
            "title": "The Reflective Teacher",
            "file": "faculties/education/edu-pedagogy-foundations/lessons/05-reflective-teacher.md"
          }
        ]
      },
      {
        "pathId": "edu-classroom-practice",
        "facultyId": "faculty-education",
        "tier": "intermediate",
        "title": "Classroom Practice",
        "summary": "Facilitation, routines, and inclusive presence in real rooms.",
        "tuitionApw": 675,
        "outlineFile": "faculties/education/edu-classroom-practice/outline.md",
        "lessons": [
          {
            "id": "edu-classroom-practice/01-routines-culture",
            "order": 1,
            "title": "Routines and Culture",
            "file": "faculties/education/edu-classroom-practice/lessons/01-routines-culture.md"
          },
          {
            "id": "edu-classroom-practice/02-questioning",
            "order": 2,
            "title": "Questioning Techniques",
            "file": "faculties/education/edu-classroom-practice/lessons/02-questioning.md"
          },
          {
            "id": "edu-classroom-practice/03-groupwork",
            "order": 3,
            "title": "Groupwork that Works",
            "file": "faculties/education/edu-classroom-practice/lessons/03-groupwork.md"
          },
          {
            "id": "edu-classroom-practice/04-behavior-support",
            "order": 4,
            "title": "Behavior Support",
            "file": "faculties/education/edu-classroom-practice/lessons/04-behavior-support.md"
          },
          {
            "id": "edu-classroom-practice/05-microteaching",
            "order": 5,
            "title": "Microteaching Lab",
            "file": "faculties/education/edu-classroom-practice/lessons/05-microteaching.md"
          }
        ]
      },
      {
        "pathId": "edu-curriculum-assessment",
        "facultyId": "faculty-education",
        "tier": "advanced",
        "title": "Curriculum & Assessment Design",
        "summary": "Sequence learning and assess with fairness and usefulness.",
        "tuitionApw": 900,
        "outlineFile": "faculties/education/edu-curriculum-assessment/outline.md",
        "lessons": [
          {
            "id": "edu-curriculum-assessment/01-backward-design",
            "order": 1,
            "title": "Backward Design",
            "file": "faculties/education/edu-curriculum-assessment/lessons/01-backward-design.md"
          },
          {
            "id": "edu-curriculum-assessment/02-rubrics",
            "order": 2,
            "title": "Rubrics that Teach",
            "file": "faculties/education/edu-curriculum-assessment/lessons/02-rubrics.md"
          },
          {
            "id": "edu-curriculum-assessment/03-formative-loops",
            "order": 3,
            "title": "Formative Loops",
            "file": "faculties/education/edu-curriculum-assessment/lessons/03-formative-loops.md"
          },
          {
            "id": "edu-curriculum-assessment/04-inclusive-assessment",
            "order": 4,
            "title": "Inclusive Assessment",
            "file": "faculties/education/edu-curriculum-assessment/lessons/04-inclusive-assessment.md"
          },
          {
            "id": "edu-curriculum-assessment/05-unit-blueprint",
            "order": 5,
            "title": "Unit Blueprint Capstone",
            "file": "faculties/education/edu-curriculum-assessment/lessons/05-unit-blueprint.md"
          }
        ]
      }
    ]
  }
] as const;

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
