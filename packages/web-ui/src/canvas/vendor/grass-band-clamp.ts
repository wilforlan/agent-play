export function clampAgentAnchorToGrassBand(options: {
  y: number;
  grassTopY: number | null;
}): number {
  const { y, grassTopY } = options;
  if (grassTopY === null) {
    return y;
  }
  return Math.max(y, grassTopY);
}
