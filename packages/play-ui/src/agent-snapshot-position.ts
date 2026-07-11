export type WorldPosition = {
  x: number;
  y: number;
};

export function isFiniteAgentHome(
  home: WorldPosition | null
): home is WorldPosition {
  if (home === null) {
    return false;
  }
  return (
    typeof home.x === "number" &&
    typeof home.y === "number" &&
    Number.isFinite(home.x) &&
    Number.isFinite(home.y)
  );
}
