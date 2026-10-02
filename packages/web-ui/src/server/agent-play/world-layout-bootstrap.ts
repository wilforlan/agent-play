import {
  DEFAULT_LAYOUT_BOUNDS_WITH_PARKING,
  getStreetPoolEntryById,
  layoutHasEducationZone,
  layoutHasParkingZone,
  layoutNeedsEducationCampusReseed,
  layoutNeedsParkingColumnGapMigration,
  migrateLayoutToEducationCampus,
  migrateLayoutToParkingColumnGap,
  migrateLayoutToParkingRow,
  STREET_NAME_POOL,
  createWorldLayoutWithEducationCampus,
  type WorldLayout,
} from "@agent-play/sdk";
import type { WorldLayoutRepository } from "./world-layout-repository.js";

export function createDefaultSeededPlayLayout(): WorldLayout {
  const s0 = STREET_NAME_POOL[0];
  const s1 = STREET_NAME_POOL[1];
  const s2 = STREET_NAME_POOL[2];
  const s3 = STREET_NAME_POOL[3];
  const elm = getStreetPoolEntryById("elm");
  if (
    s0 === undefined ||
    s1 === undefined ||
    s2 === undefined ||
    s3 === undefined ||
    elm === undefined
  ) {
    throw new Error("createDefaultSeededPlayLayout: STREET_NAME_POOL too small");
  }
  return createWorldLayoutWithEducationCampus({
    bounds: DEFAULT_LAYOUT_BOUNDS_WITH_PARKING,
    streets: [s0, s1, s2, s3, elm],
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
    let layout = existing;
    if (!layoutHasParkingZone(layout)) {
      layout = migrateLayoutToParkingRow(layout);
      await input.repo.saveLayout(layout);
    }
    if (layoutNeedsParkingColumnGapMigration(layout)) {
      layout = migrateLayoutToParkingColumnGap(layout);
      await input.repo.saveLayout(layout);
    }
    if (
      !layoutHasEducationZone(layout) ||
      layoutNeedsEducationCampusReseed(layout)
    ) {
      layout = migrateLayoutToEducationCampus(layout);
      await input.repo.saveLayout(layout);
    }
    return layout;
  }
  const layout = createDefaultSeededPlayLayout();
  await input.repo.saveLayout(layout);
  return layout;
}
