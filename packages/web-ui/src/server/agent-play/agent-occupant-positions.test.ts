import { describe, expect, it } from "vitest";
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
});
