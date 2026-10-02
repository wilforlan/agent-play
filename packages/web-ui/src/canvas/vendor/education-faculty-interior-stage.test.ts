/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import {
  FACULTY_CLASSROOM_BOUNDS,
  buildFacultyClassroomStage,
  clampFacultyClassroomPosition,
  facultyClassroomSpawnPosition,
} from "./education-faculty-interior-stage.js";

describe("faculty classroom interior stage", () => {
  it("places the exit door near the top-left of the stage", () => {
    const handle = buildFacultyClassroomStage({
      facultyId: "faculty-science",
      mode: "browse",
      cellScale: 32,
    });
    expect(handle.exitDoor.x).toBeLessThan(3);
    expect(handle.exitDoor.y).toBeLessThan(2);
    expect(handle.exitDoor.x).toBeGreaterThanOrEqual(
      FACULTY_CLASSROOM_BOUNDS.minX
    );
    expect(handle.exitDoor.y).toBeGreaterThanOrEqual(
      FACULTY_CLASSROOM_BOUNDS.minY
    );
    handle.destroy();
  });

  it("spawns the player away from the top-left exit door", () => {
    const spawn = facultyClassroomSpawnPosition();
    expect(spawn.x).toBeGreaterThan(FACULTY_CLASSROOM_BOUNDS.maxX / 2);
    expect(spawn.y).toBeGreaterThan(FACULTY_CLASSROOM_BOUNDS.maxY / 2);
    const distToTopLeft = Math.hypot(spawn.x - 1.2, spawn.y - 0.7);
    expect(distToTopLeft).toBeGreaterThan(4);
  });

  it("clamps player movement inside classroom bounds", () => {
    const clamped = clampFacultyClassroomPosition({ x: -4, y: 99 });
    expect(clamped.x).toBe(FACULTY_CLASSROOM_BOUNDS.minX + 0.4);
    expect(clamped.y).toBe(FACULTY_CLASSROOM_BOUNDS.maxY - 0.4);
  });

  it("builds three learning-path scroll anchors in browse mode", () => {
    const handle = buildFacultyClassroomStage({
      facultyId: "faculty-science",
      mode: "browse",
      cellScale: 32,
    });
    expect(handle.pathAnchors).toHaveLength(3);
    expect(handle.pathAnchors.every((path) => path.presentation === "scroll")).toBe(
      true
    );
    expect(handle.lessonAnchors).toHaveLength(0);
    handle.destroy();
  });

  it("builds lesson card anchors in class mode", () => {
    const handle = buildFacultyClassroomStage({
      facultyId: "faculty-science",
      mode: "class",
      pathId: "sci-computer-modeling",
      cellScale: 32,
    });
    expect(handle.lessonAnchors.length).toBeGreaterThan(0);
    expect(handle.pathId).toBe("sci-computer-modeling");
    handle.destroy();
  });
});
