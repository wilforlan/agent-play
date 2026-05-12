import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tokenizeAql } from "./aql-lexer";
import { parseAql } from "./aql-parser";
import { validateAql } from "./aql-validator";

const PHRASE = "alpha bravo charlie delta echo foxtrot golf hotel india juliet";

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = resolve(here, "../../../../../../scripts/seed-amenities.aql");

const loadSeedSource = (): string =>
  readFileSync(seedPath, "utf8")
    .replace(/<BRAVO_TOWERS_PASSPHRASE>/g, PHRASE)
    .replace(/<MY_PLAZA_PASSPHRASE>/g, PHRASE)
    .replace(/<SANDMILL_CIRCLE_PASSPHRASE>/g, PHRASE);

describe("scripts/seed-amenities.aql", () => {
  it("lexes + parses without diagnostics", () => {
    const parsed = parseAql(tokenizeAql(loadSeedSource()));
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.program.statements.length).toBeGreaterThan(0);
  });

  it("validates without diagnostics", () => {
    const parsed = parseAql(tokenizeAql(loadSeedSource()));
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics).toEqual([]);
  });

  it("seeds the right shape of content per amenity kind", () => {
    const parsed = parseAql(tokenizeAql(loadSeedSource()));
    const byKind: Record<string, number> = {};
    for (const statement of parsed.program.statements) {
      byKind[statement.kind] = (byKind[statement.kind] ?? 0) + 1;
    }
    expect(byKind.UseSpaceNodeStmt).toBe(3);
    expect(byKind.AddShopItemStmt).toBeGreaterThanOrEqual(10);
    expect(byKind.AddSupermarketItemStmt).toBeGreaterThanOrEqual(20);
    expect(byKind.AddCarWashCarStmt).toBeGreaterThanOrEqual(15);
  });
});
