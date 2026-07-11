import type { HouseId, HouseSlot, HouseStreetContent } from "@agent-play/sdk/browser";
import {
  findHouseSlot,
  HOUSE_WORLD_X,
  isHouseOwned,
  PARKING_HOUSE_COUNT,
} from "@agent-play/sdk/browser";
import { PARKING_BAY_ANCHORS } from "./parking-street-proximity.js";

export type HouseDoorAnchor = {
  houseId: HouseId;
  bay: HouseSlot["bay"];
  x: number;
  y: number;
};

export const HOUSE_DOOR_PROXIMITY_RADIUS = 2.0;

export const buildHouseDoorAnchors = (input: {
  parkingZoneMaxY: number;
}): readonly HouseDoorAnchor[] =>
  HOUSE_WORLD_X.map((worldX, index) => {
    const houseId = (index + 1) as HouseId;
    return {
      houseId,
      bay: houseId,
      x: worldX,
      y: input.parkingZoneMaxY - 0.2,
    };
  });

export const HOUSE_DOOR_ANCHORS: readonly HouseDoorAnchor[] = buildHouseDoorAnchors({
  parkingZoneMaxY: 9,
});

export const findNearestHouseDoor = (input: {
  playerWorld: { x: number; y: number };
  maxDistance?: number;
}): (HouseDoorAnchor & { distance: number }) | null => {
  const maxDistance = input.maxDistance ?? HOUSE_DOOR_PROXIMITY_RADIUS;
  let best: (HouseDoorAnchor & { distance: number }) | null = null;
  for (const anchor of HOUSE_DOOR_ANCHORS) {
    const distance = Math.hypot(
      input.playerWorld.x - anchor.x,
      input.playerWorld.y - anchor.y
    );
    if (distance > maxDistance) {
      continue;
    }
    if (best === null || distance < best.distance) {
      best = { ...anchor, distance };
    }
  }
  return best;
};

export const canEnterHouseAsOwner = (input: {
  viewerNodeId: string | null;
  house: HouseSlot;
}): boolean => {
  if (input.viewerNodeId === null || !isHouseOwned(input.house)) {
    return false;
  }
  return input.house.ownerNodeId === input.viewerNodeId;
};

export const resolveHouseSlotForDoor = (
  houseStreet: HouseStreetContent,
  houseId: HouseId
): HouseSlot | undefined => findHouseSlot(houseStreet, houseId);

export const houseDoorAnchorCount = (): number => PARKING_HOUSE_COUNT;
