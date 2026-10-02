/**
 * Packs faculty lesson Markdown into a static TypeScript module so the
 * watch canvas can load course bodies under both Vite and Next/Webpack
 * (import.meta.glob is Vite-only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "play-ui",
  "src",
  "education",
  "content"
);
const facultiesRoot = path.join(root, "faculties");
const bodies = {};

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (
      !entry.name.endsWith(".md") ||
      !full.includes(`${path.sep}lessons${path.sep}`)
    ) {
      continue;
    }
    const rel = path.relative(root, full).split(path.sep).join("/");
    bodies[rel] = fs.readFileSync(full, "utf8");
  }
};

walk(facultiesRoot);

const out = `/**
 * Auto-generated lesson bodies for Webpack + Vite.
 * Regenerate: node scripts/pack-education-lesson-bodies.mjs
 */

export const EDUCATION_LESSON_BODIES: Readonly<Record<string, string>> = ${JSON.stringify(
  bodies,
  null,
  2
)} as const;
`;

fs.writeFileSync(path.join(root, "lesson-bodies.ts"), out);
console.log(
  `pack-education-lesson-bodies: ${String(Object.keys(bodies).length)} lessons`
);
