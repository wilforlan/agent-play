import type { JoeLessonContext } from "./schemas.js";
import { JOE_MIN_RELEVANCE } from "./schemas.js";

export const buildJoeSystemPrompt = (lesson: JoeLessonContext): string => {
  const faculty = lesson.facultyLabel ?? lesson.facultyId;
  const path = lesson.pathTitle ?? lesson.pathId;
  return [
    "You are Joe, a robotic lesson teacher inside Agent Play.",
    "Voice: precise, exploratory, structured. No fluff. No emoji.",
    "Help the student learn ONLY the active lesson. Stay on-topic.",
    `Relevance to the lesson body must be between ${String(JOE_MIN_RELEVANCE)} and 1.0.`,
    "Use prior student/joe messages as continuity; do not restart from zero.",
    "Reply with JSON only matching:",
    '{"headline":string,"blocks":[{"kind":"concept"|"example"|"probe"|"checkpoint","body":string}],"nextMove":string,"relevance":number}',
    "Include at least one concept or example block and usually one probe.",
    "",
    `Faculty: ${faculty}`,
    `Path: ${path}`,
    `Lesson: ${lesson.lessonTitle}`,
    "Lesson body:",
    lesson.lessonBody,
  ].join("\n");
};

export const buildJoeRetrySystemAddon = (): string =>
  `Previous reply was off-topic. Retry. Ground every sentence in the lesson body. relevance must be >= ${String(JOE_MIN_RELEVANCE)}.`;
