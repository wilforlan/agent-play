import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { GEOGRAPHY_MAP_KEY } from "./constants.js";
import {
  applyPoseToGeographyMap,
  readPoseFromGeographyMap,
  removePoseFromGeographyMap,
} from "./pose-yjs.js";
import { GeographyPoseSchema } from "./schemas.js";

describe("pose yjs helpers", () => {
  it("writes and reads a pose on a Y.Doc", () => {
    const doc = new Y.Doc();
    applyPoseToGeographyMap(doc, {
      id: "node-a",
      name: "Ada",
      x: 1,
      y: 2,
      facing: "left",
      isMoving: true,
      revisedAt: 10,
    });
    const pose = readPoseFromGeographyMap(doc, "node-a");
    expect(pose).toEqual({
      id: "node-a",
      name: "Ada",
      x: 1,
      y: 2,
      facing: "left",
      isMoving: true,
      revisedAt: 10,
    });
    expect(GeographyPoseSchema.parse(pose)).toEqual(pose);
  });

  it("merges concurrent poses across two docs via applyUpdate", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    applyPoseToGeographyMap(a, {
      id: "node-a",
      name: "Ada",
      x: 0,
      y: 0,
      revisedAt: 1,
    });
    applyPoseToGeographyMap(b, {
      id: "node-b",
      name: "Bob",
      x: 5,
      y: 5,
      revisedAt: 1,
    });
    const updateA = Y.encodeStateAsUpdate(a);
    const updateB = Y.encodeStateAsUpdate(b);
    Y.applyUpdate(a, updateB);
    Y.applyUpdate(b, updateA);
    expect(readPoseFromGeographyMap(a, "node-b")?.x).toBe(5);
    expect(readPoseFromGeographyMap(b, "node-a")?.x).toBe(0);
  });

  it("removes a pose", () => {
    const doc = new Y.Doc();
    applyPoseToGeographyMap(doc, {
      id: "node-a",
      name: "Ada",
      x: 1,
      y: 2,
    });
    removePoseFromGeographyMap(doc, "node-a");
    expect(readPoseFromGeographyMap(doc, "node-a")).toBeNull();
    const root = doc.getMap(GEOGRAPHY_MAP_KEY);
    expect(root.has("node-a")).toBe(false);
  });

  it("latest field write wins for coordinates", () => {
    const doc = new Y.Doc();
    applyPoseToGeographyMap(doc, {
      id: "node-a",
      name: "Ada",
      x: 1,
      y: 1,
    });
    applyPoseToGeographyMap(doc, {
      id: "node-a",
      name: "Ada",
      x: 9,
      y: 8,
      isMoving: false,
    });
    expect(readPoseFromGeographyMap(doc, "node-a")).toMatchObject({
      x: 9,
      y: 8,
      isMoving: false,
    });
  });
});
