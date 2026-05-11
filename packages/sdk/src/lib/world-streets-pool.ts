export type StreetPoolEntry = {
  id: string;
  label: string;
};

export const STREET_NAME_POOL: readonly StreetPoolEntry[] = [
  { id: "st-john", label: "St. John St." },
  { id: "peterson", label: "Peterson St." },
  { id: "maple", label: "Maple Ave." },
  { id: "oak", label: "Oak Lane" },
  { id: "cedar", label: "Cedar Blvd." },
  { id: "elm", label: "Elm Street" },
  { id: "birch", label: "Birch Way" },
  { id: "willow", label: "Willow Dr." },
  { id: "pine", label: "Pine Rd." },
  { id: "ash", label: "Ash Court" },
  { id: "laurel", label: "Laurel Pl." },
  { id: "hawthorn", label: "Hawthorn Row" },
  { id: "chestnut", label: "Chestnut Sq." },
  { id: "alder", label: "Alder Ave." },
  { id: "poplar", label: "Poplar St." },
  { id: "sycamore", label: "Sycamore Ln." },
  { id: "magnolia", label: "Magnolia Dr." },
  { id: "dogwood", label: "Dogwood Ct." },
  { id: "cypress", label: "Cypress Ring" },
  { id: "redwood", label: "Redwood Rise" },
  { id: "sequoia", label: "Sequoia Path" },
] as const;

export function getStreetPoolEntryById(id: string): StreetPoolEntry | undefined {
  return STREET_NAME_POOL.find((s) => s.id === id);
}
