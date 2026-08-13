import * as Y from "yjs";
import { GEOGRAPHY_MAP_KEY } from "./constants.js";
import {
  GeographyPoseSchema,
  type GeographyPose,
} from "./schemas.js";

const getGeographyRoot = (doc: Y.Doc): Y.Map<unknown> => {
  return doc.getMap(GEOGRAPHY_MAP_KEY);
};

const getOrCreateHumanMap = (
  root: Y.Map<unknown>,
  humanId: string
): Y.Map<unknown> => {
  const existing = root.get(humanId);
  if (existing instanceof Y.Map) {
    return existing;
  }
  const created = new Y.Map<unknown>();
  root.set(humanId, created);
  return created;
};

export const applyPoseToGeographyMap = (
  doc: Y.Doc,
  pose: GeographyPose
): void => {
  const parsed = GeographyPoseSchema.parse(pose);
  doc.transact(() => {
    const root = getGeographyRoot(doc);
    const human = getOrCreateHumanMap(root, parsed.id);
    human.set("id", parsed.id);
    human.set("name", parsed.name);
    human.set("x", parsed.x);
    human.set("y", parsed.y);
    if (parsed.facing !== undefined) {
      human.set("facing", parsed.facing);
    } else {
      human.delete("facing");
    }
    if (parsed.isMoving !== undefined) {
      human.set("isMoving", parsed.isMoving);
    } else {
      human.delete("isMoving");
    }
    if (parsed.stage !== undefined) {
      human.set("stage", parsed.stage);
    } else {
      human.delete("stage");
    }
    if (parsed.revisedAt !== undefined) {
      human.set("revisedAt", parsed.revisedAt);
    } else {
      human.delete("revisedAt");
    }
  });
};

export const readPoseFromGeographyMap = (
  doc: Y.Doc,
  humanId: string
): GeographyPose | null => {
  const root = getGeographyRoot(doc);
  const raw = root.get(humanId);
  if (!(raw instanceof Y.Map)) {
    return null;
  }
  const record: Record<string, unknown> = {};
  raw.forEach((value, key) => {
    record[key] = value;
  });
  const parsed = GeographyPoseSchema.safeParse(record);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
};

export const removePoseFromGeographyMap = (
  doc: Y.Doc,
  humanId: string
): void => {
  doc.transact(() => {
    const root = getGeographyRoot(doc);
    root.delete(humanId);
  });
};

export const listGeographyHumanIds = (doc: Y.Doc): string[] => {
  const root = getGeographyRoot(doc);
  const ids: string[] = [];
  root.forEach((_value, key) => {
    ids.push(key);
  });
  return ids;
};
