import type {
  PreviewWorldMapAgentOccupantJson,
  PreviewWorldMapOccupantJson,
} from "./preview-serialize.js";

export function finiteOccupantPosition(
  o: Pick<PreviewWorldMapOccupantJson, "x" | "y">
): { x: number; y: number } | null {
  const x = o.x;
  const y = o.y;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return null;
  }
  return { x, y };
}

export function finiteOccupantPositions(
  occupants: readonly PreviewWorldMapOccupantJson[]
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  for (const o of occupants) {
    const position = finiteOccupantPosition(o);
    if (position !== null) {
      positions.push(position);
    }
  }
  return positions;
}

export function resolveAgentMapCellForJourney(
  occ: PreviewWorldMapAgentOccupantJson | undefined
): { x: number; y: number } {
  if (occ === undefined) {
    return { x: 0, y: 0 };
  }
  return finiteOccupantPosition(occ) ?? { x: 0, y: 0 };
}
