export type StreetEntry = {
  id: string;
  label: string;
  anchorWorld: { x: number; y: number };
};

export const STREETS: readonly StreetEntry[] = [
  { id: "st-john", label: "St. John St.", anchorWorld: { x: 2, y: 17 } },
  { id: "peterson", label: "Peterson St.", anchorWorld: { x: 5, y: 17 } },
  { id: "maple", label: "Maple Ave.", anchorWorld: { x: 8, y: 17 } },
  { id: "oak", label: "Oak Lane", anchorWorld: { x: 11, y: 17 } },
  { id: "cedar", label: "Cedar Blvd.", anchorWorld: { x: 14, y: 17 } },
  { id: "elm", label: "Elm Street", anchorWorld: { x: 17, y: 17 } },
  { id: "birch", label: "Birch Way", anchorWorld: { x: 2, y: 14 } },
  { id: "willow", label: "Willow Dr.", anchorWorld: { x: 5, y: 14 } },
  { id: "pine", label: "Pine Rd.", anchorWorld: { x: 8, y: 14 } },
  { id: "ash", label: "Ash Court", anchorWorld: { x: 11, y: 14 } },
  { id: "laurel", label: "Laurel Pl.", anchorWorld: { x: 14, y: 14 } },
  { id: "hawthorn", label: "Hawthorn Row", anchorWorld: { x: 17, y: 14 } },
  { id: "chestnut", label: "Chestnut Sq.", anchorWorld: { x: 2, y: 11 } },
  { id: "alder", label: "Alder Ave.", anchorWorld: { x: 5, y: 11 } },
  { id: "poplar", label: "Poplar St.", anchorWorld: { x: 8, y: 11 } },
  { id: "sycamore", label: "Sycamore Ln.", anchorWorld: { x: 11, y: 11 } },
  { id: "magnolia", label: "Magnolia Dr.", anchorWorld: { x: 14, y: 11 } },
  { id: "dogwood", label: "Dogwood Ct.", anchorWorld: { x: 17, y: 11 } },
  { id: "cypress", label: "Cypress Ring", anchorWorld: { x: 3, y: 8 } },
  { id: "redwood", label: "Redwood Rise", anchorWorld: { x: 10, y: 8 } },
  { id: "sequoia", label: "Sequoia Path", anchorWorld: { x: 16, y: 8 } },
];

export function getStreetById(id: string): StreetEntry | undefined {
  return STREETS.find((s) => s.id === id);
}
