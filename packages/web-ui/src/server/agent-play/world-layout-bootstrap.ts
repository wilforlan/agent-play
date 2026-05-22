import {
  MINIMUM_STREET_LAYOUT_BOUNDS,
  STREET_NAME_POOL,
  createVerticalStripSeedLayout,
  type WorldLayout,
} from "@agent-play/sdk";
import type { WorldLayoutRepository } from "./world-layout-repository.js";

export function createDefaultSeededPlayLayout(): WorldLayout {
  const s0 = STREET_NAME_POOL[0];
  const s1 = STREET_NAME_POOL[1];
  const s2 = STREET_NAME_POOL[2];
  if (s0 === undefined || s1 === undefined || s2 === undefined) {
    throw new Error("createDefaultSeededPlayLayout: STREET_NAME_POOL too small");
  }
  return createVerticalStripSeedLayout({
    bounds: MINIMUM_STREET_LAYOUT_BOUNDS,
    streets: [s0, s1, s2],
  });
}

export type BootstrapWorldLayoutInput = {
  repo: WorldLayoutRepository;
};

export async function bootstrapWorldLayoutIfNeeded(
  input: BootstrapWorldLayoutInput
): Promise<WorldLayout> {
  const existing = await input.repo.getLayout();
  if (existing !== null) {
    return existing;
  }
  const layout = createDefaultSeededPlayLayout();
  await input.repo.saveLayout(layout);
  return layout;
}
