import {
  DEFAULT_LAYOUT_BOUNDS_WITH_PARKING,
  layoutHasParkingZone,
  layoutNeedsParkingColumnGapMigration,
  migrateLayoutToParkingColumnGap,
  migrateLayoutToParkingRow,
  STREET_NAME_POOL,
  createWorldLayoutWithParkingRow,
  type WorldLayout,
} from "@agent-play/sdk";
import type { WorldLayoutRepository } from "./world-layout-repository.js";

export function createDefaultSeededPlayLayout(): WorldLayout {
  const s0 = STREET_NAME_POOL[0];
  const s1 = STREET_NAME_POOL[1];
  const s2 = STREET_NAME_POOL[2];
  const s3 = STREET_NAME_POOL[3];
  if (s0 === undefined || s1 === undefined || s2 === undefined || s3 === undefined) {
    throw new Error("createDefaultSeededPlayLayout: STREET_NAME_POOL too small");
  }
  return createWorldLayoutWithParkingRow({
    bounds: DEFAULT_LAYOUT_BOUNDS_WITH_PARKING,
    streets: [s0, s1, s2, s3],
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
    if (!layoutHasParkingZone(existing)) {
      const migrated = migrateLayoutToParkingRow(existing);
      await input.repo.saveLayout(migrated);
      return migrated;
    }
    if (layoutNeedsParkingColumnGapMigration(existing)) {
      const migrated = migrateLayoutToParkingColumnGap(existing);
      await input.repo.saveLayout(migrated);
      return migrated;
    }
    return existing;
  }
  const layout = createDefaultSeededPlayLayout();
  await input.repo.saveLayout(layout);
  return layout;
}
