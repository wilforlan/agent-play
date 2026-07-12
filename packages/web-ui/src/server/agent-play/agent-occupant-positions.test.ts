import { describe, expect, it } from "vitest";
import { occupancyKeyForPosition } from "@agent-play/sdk";
import { materializeAgentOccupantCoordinatesForLayout } from "./agent-occupant-positions.js";
import {
  getDefaultPreviewWorldLayoutJson,
  type PreviewWorldMapOccupantJson,
} from "./preview-serialize.js";

describe("materializeAgentOccupantCoordinatesForLayout", () => {
  it("fills x and y from streetId when coordinates are omitted", () => {
    const layout = getDefaultPreviewWorldLayoutJson();
    const agentStreet = layout.zones.find((z) => z.primaryGroup === "agent");
    if (agentStreet === undefined) {
      throw new Error("expected agent zone");
    }
    const occupants: PreviewWorldMapOccupantJson[] = [
      {
        kind: "agent",
        agentId: "a1",
        name: "One",
        streetId: agentStreet.streetId,
      },
    ];
    const next = materializeAgentOccupantCoordinatesForLayout(occupants, layout);
    const row = next[0];
    expect(row?.kind).toBe("agent");
    if (row?.kind !== "agent") {
      return;
    }
    expect(typeof row.x).toBe("number");
    expect(typeof row.y).toBe("number");
    expect(row.streetId).toBe(agentStreet.streetId);
  });

  it("assigns different cells for two agents on the same street without stored coordinates", () => {
    const layout = getDefaultPreviewWorldLayoutJson();
    const agentStreet = layout.zones.find((z) => z.primaryGroup === "agent");
    if (agentStreet === undefined) {
      throw new Error("expected agent zone");
    }
    const occupants: PreviewWorldMapOccupantJson[] = [
      {
        kind: "agent",
        agentId: "zebra",
        name: "Z",
        streetId: agentStreet.streetId,
      },
      {
        kind: "agent",
        agentId: "alpha",
        name: "A",
        streetId: agentStreet.streetId,
      },
    ];
    const next = materializeAgentOccupantCoordinatesForLayout(occupants, layout);
    const a = next.find((o) => o.kind === "agent" && o.agentId === "alpha");
    const z = next.find((o) => o.kind === "agent" && o.agentId === "zebra");
    expect(a?.kind).toBe("agent");
    expect(z?.kind).toBe("agent");
    if (a?.kind !== "agent" || z?.kind !== "agent") {
      return;
    }
    expect(a.x === z.x && a.y === z.y).toBe(false);
  });

  it("re-places colliding agents when two rows share the same x,y", () => {
    const layout = getDefaultPreviewWorldLayoutJson();
    const agentStreet = layout.zones.find((z) => z.primaryGroup === "agent");
    if (agentStreet === undefined) {
      throw new Error("expected agent zone");
    }
    const [placed] = materializeAgentOccupantCoordinatesForLayout(
      [
        {
          kind: "agent",
          agentId: "anchor",
          name: "Anchor",
          streetId: agentStreet.streetId,
        },
      ],
      layout
    );
    if (placed?.kind !== "agent") {
      throw new Error("expected placed agent");
    }
    const sharedX = placed.x;
    const sharedY = placed.y;
    const occupants: PreviewWorldMapOccupantJson[] = [
      {
        kind: "agent",
        agentId: "alpha",
        name: "A",
        streetId: agentStreet.streetId,
        x: sharedX,
        y: sharedY,
      },
      {
        kind: "agent",
        agentId: "beta",
        name: "B",
        streetId: agentStreet.streetId,
        x: sharedX,
        y: sharedY,
      },
    ];
    const next = materializeAgentOccupantCoordinatesForLayout(occupants, layout);
    const alpha = next.find((o) => o.kind === "agent" && o.agentId === "alpha");
    const beta = next.find((o) => o.kind === "agent" && o.agentId === "beta");
    expect(alpha?.kind).toBe("agent");
    expect(beta?.kind).toBe("agent");
    if (alpha?.kind !== "agent" || beta?.kind !== "agent") {
      return;
    }
    expect(
      occupancyKeyForPosition(alpha.x, alpha.y) ===
        occupancyKeyForPosition(beta.x, beta.y)
    ).toBe(false);
  });

  it("preserves non-colliding stored coords when a third agent is added without coordinates", () => {
    const layout = getDefaultPreviewWorldLayoutJson();
    const agentStreet = layout.zones.find((z) => z.primaryGroup === "agent");
    if (agentStreet === undefined) {
      throw new Error("expected agent zone");
    }
    const placed = materializeAgentOccupantCoordinatesForLayout(
      [
        {
          kind: "agent",
          agentId: "alpha",
          name: "A",
          streetId: agentStreet.streetId,
        },
        {
          kind: "agent",
          agentId: "beta",
          name: "B",
          streetId: agentStreet.streetId,
        },
      ],
      layout
    );
    const alphaBefore = placed.find(
      (o) => o.kind === "agent" && o.agentId === "alpha"
    );
    const betaBefore = placed.find(
      (o) => o.kind === "agent" && o.agentId === "beta"
    );
    if (alphaBefore?.kind !== "agent" || betaBefore?.kind !== "agent") {
      throw new Error("expected placed agents");
    }
    const withThird: PreviewWorldMapOccupantJson[] = [
      { ...alphaBefore },
      { ...betaBefore },
      {
        kind: "agent",
        agentId: "gamma",
        name: "G",
        streetId: agentStreet.streetId,
      },
    ];
    const next = materializeAgentOccupantCoordinatesForLayout(withThird, layout);
    const alpha = next.find((o) => o.kind === "agent" && o.agentId === "alpha");
    const beta = next.find((o) => o.kind === "agent" && o.agentId === "beta");
    const gamma = next.find((o) => o.kind === "agent" && o.agentId === "gamma");
    expect(alpha?.kind).toBe("agent");
    expect(beta?.kind).toBe("agent");
    expect(gamma?.kind).toBe("agent");
    if (
      alpha?.kind !== "agent" ||
      beta?.kind !== "agent" ||
      gamma?.kind !== "agent"
    ) {
      return;
    }
    expect(alpha.x).toBe(alphaBefore.x);
    expect(alpha.y).toBe(alphaBefore.y);
    expect(beta.x).toBe(betaBefore.x);
    expect(beta.y).toBe(betaBefore.y);
    expect(
      occupancyKeyForPosition(gamma.x, gamma.y) ===
        occupancyKeyForPosition(alpha.x, alpha.y)
    ).toBe(false);
    expect(
      occupancyKeyForPosition(gamma.x, gamma.y) ===
        occupancyKeyForPosition(beta.x, beta.y)
    ).toBe(false);
  });
});
