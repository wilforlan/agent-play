import { Container, Graphics, Text } from "pixi.js";
import { getFacultyContent, getPathContent } from "./education/content/catalog.js";

export type FacultyClassroomMode = "browse" | "class";

export type FacultyClassroomLessonAnchor = {
  readonly lessonId: string;
  readonly title: string;
  readonly order: number;
  readonly x: number;
  readonly y: number;
};

export type FacultyClassroomPathAnchor = {
  readonly pathId: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly presentation: "scroll";
};

export type FacultyClassroomStageHandle = {
  readonly root: Container;
  readonly exitDoor: { x: number; y: number };
  readonly pathAnchors: readonly FacultyClassroomPathAnchor[];
  readonly lessonAnchors: readonly FacultyClassroomLessonAnchor[];
  readonly mode: FacultyClassroomMode;
  readonly pathId: string | null;
  readonly playerLayer: Container;
  clampPosition(pos: { x: number; y: number }): { x: number; y: number };
  destroy(): void;
};

const FACULTY_WALL: Record<string, number> = {
  "faculty-art": 0xfef3c7,
  "faculty-science": 0xe2e8f0,
  "faculty-medicine": 0xccfbf1,
  "faculty-education": 0xdbeafe,
};

export const FACULTY_CLASSROOM_BOUNDS = {
  minX: 0,
  maxX: 14,
  minY: 0,
  maxY: 10,
} as const;

const EDGE_INSET = 0.4;

export const clampFacultyClassroomPosition = (pos: {
  x: number;
  y: number;
}): { x: number; y: number } => ({
  x: Math.min(
    FACULTY_CLASSROOM_BOUNDS.maxX - EDGE_INSET,
    Math.max(FACULTY_CLASSROOM_BOUNDS.minX + EDGE_INSET, pos.x)
  ),
  y: Math.min(
    FACULTY_CLASSROOM_BOUNDS.maxY - EDGE_INSET,
    Math.max(FACULTY_CLASSROOM_BOUNDS.minY + EDGE_INSET, pos.y)
  ),
});

export const facultyClassroomSpawnPosition = (): { x: number; y: number } =>
  clampFacultyClassroomPosition({
    x: FACULTY_CLASSROOM_BOUNDS.maxX - 2.2,
    y: FACULTY_CLASSROOM_BOUNDS.maxY - 1.6,
  });

const drawLearningPathScroll = (input: {
  root: Container;
  scale: number;
  x: number;
  y: number;
  title: string;
  tierLabel: string;
}): void => {
  const { root, scale, x, y, title, tierLabel } = input;
  const scroll = new Graphics({ roundPixels: true });
  const bodyW = scale * 2.4;
  const bodyH = scale * 2.8;
  const left = -bodyW / 2;
  const top = -bodyH / 2;

  scroll.roundRect(left, top + scale * 0.22, bodyW, bodyH - scale * 0.44, 4);
  scroll.fill({ color: 0xf5e6c8, alpha: 0.98 });
  scroll.stroke({ width: 1.5, color: 0xb45309, alpha: 0.55 });

  scroll.ellipse(0, top + scale * 0.18, bodyW * 0.52, scale * 0.22);
  scroll.fill({ color: 0xd6b27a, alpha: 0.98 });
  scroll.stroke({ width: 1.2, color: 0x92400e, alpha: 0.7 });

  scroll.ellipse(0, top + bodyH - scale * 0.18, bodyW * 0.52, scale * 0.22);
  scroll.fill({ color: 0xd6b27a, alpha: 0.98 });
  scroll.stroke({ width: 1.2, color: 0x92400e, alpha: 0.7 });

  scroll.roundRect(-scale * 0.12, top + scale * 0.55, scale * 0.24, scale * 1.7, 2);
  scroll.fill({ color: 0xb91c1c, alpha: 0.85 });

  scroll.position.set(x * scale, y * scale);
  root.addChild(scroll);

  const rubric = new Text({
    text: "RUBRIC",
    style: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: Math.max(7, Math.round(scale * 0.2)),
      fontWeight: "700",
      fill: 0x7c2d12,
      letterSpacing: 1,
    },
  });
  rubric.anchor.set(0.5, 0.5);
  rubric.position.set(x * scale, (y - 0.95) * scale);
  root.addChild(rubric);

  const label = new Text({
    text: title,
    style: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: Math.max(9, Math.round(scale * 0.26)),
      fontWeight: "700",
      fill: 0x451a03,
      align: "center",
      wordWrap: true,
      wordWrapWidth: scale * 2.0,
    },
  });
  label.anchor.set(0.5, 0.5);
  label.position.set(x * scale, (y + 0.15) * scale);
  root.addChild(label);

  const tier = new Text({
    text: tierLabel,
    style: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: Math.max(8, Math.round(scale * 0.22)),
      fontWeight: "600",
      fill: 0x92400e,
      align: "center",
    },
  });
  tier.anchor.set(0.5, 0.5);
  tier.position.set(x * scale, (y + 0.95) * scale);
  root.addChild(tier);
};

export const buildFacultyClassroomStage = (input: {
  facultyId: string;
  mode: FacultyClassroomMode;
  pathId?: string;
  cellScale: number;
}): FacultyClassroomStageHandle => {
  const root = new Container();
  const scale = input.cellScale;
  const width = (FACULTY_CLASSROOM_BOUNDS.maxX - FACULTY_CLASSROOM_BOUNDS.minX) * scale;
  const height = (FACULTY_CLASSROOM_BOUNDS.maxY - FACULTY_CLASSROOM_BOUNDS.minY) * scale;
  const wallColor = FACULTY_WALL[input.facultyId] ?? 0xf8fafc;

  const floor = new Graphics({ roundPixels: true });
  floor.rect(0, 0, width, height).fill({ color: wallColor, alpha: 0.95 });
  floor.stroke({ width: 2, color: 0x334155, alpha: 0.35 });
  root.addChild(floor);

  const board = new Graphics({ roundPixels: true });
  board.roundRect(width * 0.28, scale * 0.35, width * 0.56, scale * 1.35, 8);
  board.fill({ color: 0x14532d, alpha: 0.92 });
  root.addChild(board);

  const faculty = getFacultyContent(
    input.facultyId as
      | "faculty-art"
      | "faculty-science"
      | "faculty-medicine"
      | "faculty-education"
  );
  const title = new Text({
    text: faculty?.title ?? "Faculty classroom",
    style: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: Math.max(12, Math.round(scale * 0.42)),
      fontWeight: "700",
      fill: 0xf0fdf4,
    },
  });
  title.anchor.set(0.5, 0.5);
  title.position.set(width * 0.56, scale * 1.0);
  root.addChild(title);

  const pathAnchors: FacultyClassroomPathAnchor[] = [];
  const paths = faculty?.paths ?? [];
  if (input.mode === "browse") {
    paths.forEach((path, index) => {
      const x = 3.2 + index * 4;
      const y = 5.1;
      drawLearningPathScroll({
        root,
        scale,
        x,
        y,
        title: path.title,
        tierLabel: path.tier,
      });
      pathAnchors.push({
        pathId: path.pathId,
        title: path.title,
        x,
        y,
        presentation: "scroll",
      });
    });
  }

  const lessonAnchors: FacultyClassroomLessonAnchor[] = [];
  if (input.mode === "class" && input.pathId !== undefined) {
    const path = getPathContent(input.pathId);
    const lessons = path?.lessons ?? [];
    lessons.forEach((lesson, index) => {
      const col = index % 5;
      const row = Math.floor(index / 5);
      const x = 2.8 + col * 2.4;
      const y = 4.2 + row * 1.5;
      const card = new Graphics({ roundPixels: true });
      card.roundRect(-scale * 0.9, -scale * 0.55, scale * 1.8, scale * 1.1, 5);
      card.fill({ color: 0xfffbeb, alpha: 0.96 });
      card.stroke({ width: 1.5, color: 0xb45309, alpha: 0.7 });
      card.position.set(x * scale, y * scale);
      root.addChild(card);
      const label = new Text({
        text: `${String(lesson.order)}. ${lesson.title}`,
        style: {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: Math.max(8, Math.round(scale * 0.22)),
          fontWeight: "600",
          fill: 0x78350f,
          align: "center",
          wordWrap: true,
          wordWrapWidth: scale * 1.6,
        },
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(x * scale, y * scale);
      root.addChild(label);
      lessonAnchors.push({
        lessonId: lesson.id,
        title: lesson.title,
        order: lesson.order,
        x,
        y,
      });
    });
  }

  const exitDoor = { x: 1.2, y: 0.7 };
  const door = new Graphics({ roundPixels: true });
  door.roundRect(-scale * 0.35, -scale * 0.55, scale * 0.7, scale * 1.1, 4);
  door.fill({ color: 0x1e293b, alpha: 0.9 });
  door.stroke({ width: 1.5, color: 0xf8fafc, alpha: 0.35 });
  door.position.set(exitDoor.x * scale, exitDoor.y * scale);
  root.addChild(door);
  const exitLabel = new Text({
    text: "EXIT",
    style: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: Math.max(9, Math.round(scale * 0.24)),
      fontWeight: "700",
      fill: 0xf8fafc,
    },
  });
  exitLabel.anchor.set(0.5, 0.5);
  exitLabel.position.set(exitDoor.x * scale, exitDoor.y * scale);
  root.addChild(exitLabel);

  const playerLayer = new Container();
  root.addChild(playerLayer);

  return {
    root,
    exitDoor,
    pathAnchors,
    lessonAnchors,
    mode: input.mode,
    pathId: input.pathId ?? null,
    playerLayer,
    clampPosition: clampFacultyClassroomPosition,
    destroy: () => {
      root.destroy({ children: true });
    },
  };
};

export const findNearestFacultyClassroomTarget = (input: {
  player: { x: number; y: number };
  anchors: readonly { x: number; y: number; id: string; label: string }[];
  maxDistance?: number;
}): { id: string; label: string; distance: number; x: number; y: number } | null => {
  const maxDistance = input.maxDistance ?? 1.4;
  let best: { id: string; label: string; distance: number; x: number; y: number } | null =
    null;
  for (const anchor of input.anchors) {
    const distance = Math.hypot(
      input.player.x - anchor.x,
      input.player.y - anchor.y
    );
    if (distance > maxDistance) continue;
    if (best === null || distance < best.distance) {
      best = {
        id: anchor.id,
        label: anchor.label,
        distance,
        x: anchor.x,
        y: anchor.y,
      };
    }
  }
  return best;
};
