import type {
  Journey,
  WorldJourneyUpdate,
} from "../@types/world.js";
import type { PreviewWorldMapJson } from "./world-map.js";
import type { WorldInteractionRole } from "./play-transport.js";

export type JourneyJson = {
  steps: Journey["steps"];
  startedAt: string;
  completedAt: string;
};

export type WorldJourneyUpdateJson = Omit<WorldJourneyUpdate, "journey"> & {
  journey: JourneyJson;
};

export type PreviewInteractionEntryJson = {
  role: WorldInteractionRole;
  text: string;
  at: string;
  seq: number;
};

export type PreviewPlayerSnapshotJson = {
  playerId: string;
  name: string;
  type?: string;
  structures: WorldJourneyUpdate["structures"];
  lastUpdate?: WorldJourneyUpdateJson;
  recentInteractions?: PreviewInteractionEntryJson[];
};

export type PreviewSnapshotJson = {
  sid: string;
  players: PreviewPlayerSnapshotJson[];
  worldMap: PreviewWorldMapJson;
};

export function serializeJourney(journey: Journey): JourneyJson {
  return {
    steps: journey.steps,
    startedAt: journey.startedAt.toISOString(),
    completedAt: journey.completedAt.toISOString(),
  };
}

export function serializeWorldJourneyUpdate(
  update: WorldJourneyUpdate
): WorldJourneyUpdateJson {
  return {
    playerId: update.playerId,
    journey: serializeJourney(update.journey),
    path: update.path,
    structures: update.structures,
  };
}
