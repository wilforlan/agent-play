import { randomUUID } from "node:crypto";
import type { PlayAgentInformation, PlatformAgentInformation } from "./@types/agent.js";
import type {
  Journey,
  PositionedStep,
  SpaceNode,
  SpaceOwner,
  StructureNode,
  WorldJourneyUpdate,
  WorldPlayerLocation,
  WorldSpaceTransition,
} from "./@types/world.js";
import {
  configureAgentPlayDebug,
  agentPlayDebug,
  agentPlayVerbose,
} from "./agent-play-debug.js";
import {
  HttpPlayTransport,
  InMemoryPlayBus,
  PLAYER_ADDED_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_SPACE_TRANSITION_EVENT,
  WORLD_FANOUT_PLAYER_ID,
} from "./play-transport.js";
import type {
  WorldAgentSignalPayload,
  WorldInteractionPayload,
  WorldInteractionRole,
  WorldSpaceTransitionPayload,
} from "./play-transport.js";
import type { AgentRepository } from "./agent-repository.js";
import type {
  SessionStore,
  SpaceAmenityLogEntry,
} from "./session-store.js";
import {
  assertAgentToolContract,
  extractAssistToolNames,
} from "./agent-tool-contract.js";
import {
  serializeWorldJourneyUpdate,
  buildSnapshotWorldLayout,
  normalizePreviewSnapshot,
  snapshotWorldMapWithResolvedAgents,
  type PreviewSnapshotJson,
  type PreviewWorldMapAgentOccupantJson,
  type PreviewWorldMapHumanOccupantJson,
  type PreviewWorldMapMcpOccupantJson,
  type PreviewWorldMapOccupantJson,
  type PreviewWorldMapStructureOccupantJson,
  type SpaceCatalogEntryJson,
  type WorldJourneyUpdateJson,
} from "./preview-serialize.js";
import type { RedisFanoutItem } from "./world-redis-sync.js";
import { runStoredWorldMutation } from "./world-mutation-pipeline.js";
import {
  applyBoundsFieldUpdateToLayout,
  clampWorldPosition,
  pickZoneForGroup,
  type WorldBounds,
  type WorldLayout,
  type WorldLayoutBoundsField,
} from "@agent-play/sdk";
import type { StoredAgentRecord } from "./agent-repository.js";
import {
  finiteOccupantPositions,
  resolveAgentMapCellForJourney,
} from "./agent-journey-cell.js";
import {
  computeArcadeCabinetAnchor,
  computeRandomFreeMapCell,
  computeSpaceStructureAnchor,
  occupiedKeysFromSnapshot,
  resolveStructureAnchorsAtRuntime,
} from "./grid-allocate.js";
import { buildPlayerChainFanoutNotify } from "./player-chain/index.js";
import type { SpaceAmenityKind } from "./space-amenity.js";
import { MAX_SPACE_AMENITIES } from "./space-amenity.js";
import {
  deriveStructureAmenityFields,
  emptySnapshot,
  ensureWorldSnapshot,
  removeOccupantsForPlayer,
  upsertAgentOccupant,
  upsertSpaceCatalogEntry,
  upsertStructureOccupant,
} from "./world-snapshot-helpers.js";
import {
  bootstrapWorldLayoutIfNeeded,
  createDefaultSeededPlayLayout,
} from "./world-layout-bootstrap.js";
import { ensureArcadeCabinetsInSnapshot, buildArcadeCabinetRow } from "./arcade-cabinet-bootstrap.js";
import type { GameId } from "@agent-play/sdk";
import type { WorldLayoutRepository } from "./world-layout-repository.js";

function hasArcadeCabinetAtOrigin(snapshot: PreviewSnapshotJson): boolean {
  return snapshot.worldMap.occupants.some(
    (occupant) =>
      occupant.kind === "structure" &&
      typeof occupant.gameId === "string" &&
      occupant.gameId.length > 0 &&
      occupant.x === 0 &&
      occupant.y === 0
  );
}

function clampPathToBounds(
  path: PositionedStep[],
  bounds: WorldBounds
): PositionedStep[] {
  return path.map((step) => {
    if (typeof step.x === "number" && typeof step.y === "number") {
      const c = clampWorldPosition({ x: step.x, y: step.y }, bounds);
      return { ...step, x: c.x, y: c.y };
    }
    return step;
  });
}

function journeyPathFromCellAndJourney(
  playerId: string,
  journey: Journey,
  cell: { x: number; y: number },
  bounds: WorldBounds
): PositionedStep[] {
  const placement = { x: cell.x, y: cell.y, id: `agent:${playerId}` };
  const pathRaw = journey.steps.map((step): PositionedStep => {
    if (step.type === "origin" || step.type === "structure") {
      return {
        ...step,
        x: placement.x,
        y: placement.y,
        structureId: placement.id,
      };
    }
    return {
      ...step,
      x: placement.x,
      y: placement.y,
      structureId: placement.id,
    };
  });
  return clampPathToBounds(pathRaw, bounds);
}

function snapshotWithOccupants(
  base: PreviewSnapshotJson,
  occupants: PreviewWorldMapOccupantJson[]
): PreviewSnapshotJson {
  const normalized = normalizePreviewSnapshot({
    ...base,
    worldMap: { ...base.worldMap, occupants },
  });
  return {
    ...normalized,
    worldMap: snapshotWorldMapWithResolvedAgents(
      normalized.worldMap,
      normalized.worldLayout
    ),
  };
}

function refreshStructureOccupantsForCatalog(
  occupants: PreviewWorldMapOccupantJson[],
  catalog: readonly SpaceCatalogEntryJson[]
): PreviewWorldMapOccupantJson[] {
  return occupants.map((o) => {
    if (o.kind !== "structure") {
      return o;
    }
    const fields = deriveStructureAmenityFields(o.spaceIds, catalog);
    const next: PreviewWorldMapStructureOccupantJson = {
      ...o,
      ...(fields.primaryAmenity !== undefined
        ? { primaryAmenity: fields.primaryAmenity }
        : {}),
      ...(fields.amenities.length > 0 ? { amenities: fields.amenities } : {}),
    };
    return next;
  });
}

function patchAgentLastUpdate(
  base: PreviewSnapshotJson,
  playerId: string,
  lastUpdate: WorldJourneyUpdateJson
): PreviewSnapshotJson {
  const occ = base.worldMap.occupants.map((o) => {
    if (o.kind === "agent" && o.agentId === playerId) {
      return {
        ...o,
        lastUpdate,
        stationary: false,
      };
    }
    return o;
  });
  return snapshotWithOccupants(base, occ);
}

export type AssistToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type LangChainAgentRegistration = {
  type: "langchain";
  toolNames: string[];
  assistTools?: AssistToolSpec[];
};

export type P2aEnableFlag = "on" | "off";

export type AddPlayerInput = PlatformAgentInformation & {
  agent: LangChainAgentRegistration;
  mainNodeId?: string;
  passwHash?: string;
  agentId: string;
  connectionId?: string;
  leaseTtlSeconds?: number;
  enableP2a?: P2aEnableFlag;
  realtimeInstructions?: string;
  realtimeWebrtc?: {
    clientSecret: string;
    expiresAt?: string;
    model: string;
    voice?: string;
  };
};

export type RegisteredAgentSummary = {
  agentId: string;
  name: string;
  toolNames: string[];
  zoneCount: number;
  yieldCount: number;
  flagged: boolean;
};

export type RegisteredPlayer = PlayAgentInformation & {
  previewUrl: string;
  registeredAgent: RegisteredAgentSummary;
  enableP2a: P2aEnableFlag;
  realtimeWebrtc?: {
    clientSecret: string;
    expiresAt?: string;
    model: string;
    voice?: string;
  };
};

function toRegisteredSummary(row: StoredAgentRecord): RegisteredAgentSummary {
  return {
    agentId: row.agentId,
    name: row.name,
    toolNames: [...row.toolNames],
    zoneCount: row.zoneCount,
    yieldCount: row.yieldCount,
    flagged: row.flagged,
  };
}

export type PlayWorldOptions = {
  previewBaseUrl?: string;
  playApiBase?: string;
  debug?: boolean;
  repository?: AgentRepository;
  sessionStore: SessionStore;
  worldLayoutRepository?: WorldLayoutRepository;
};

export const HUMAN_VIEWER_PLAYER_ID = "__human__";

type OccupantRefIndexValue =
  | PreviewWorldMapHumanOccupantJson
  | PreviewWorldMapAgentOccupantJson
  | PreviewWorldMapMcpOccupantJson
  | PreviewWorldMapStructureOccupantJson;

function buildOccupantRefIndex(
  snap: PreviewSnapshotJson
): Map<string, OccupantRefIndexValue> {
  const byRef = new Map<string, OccupantRefIndexValue>();
  for (const occ of snap.worldMap.occupants) {
    if (occ.kind === "human") {
      byRef.set(`human:${occ.id}`, occ);
    } else if (occ.kind === "agent") {
      byRef.set(`agent:${occ.agentId}`, occ);
    } else if (occ.kind === "mcp") {
      byRef.set(`mcp:${occ.id}`, occ);
    } else {
      byRef.set(`structure:${occ.id}`, occ);
    }
  }
  return byRef;
}

function resolveProximityFromPlayerRef(
  fromRaw: string,
  options: {
    byRef: Map<string, OccupantRefIndexValue>;
    snapshotMainNodeId: string | null;
    chainGenesisHumanId: string;
  }
): string {
  if (fromRaw.startsWith("human:") || fromRaw.startsWith("agent:")) {
    return fromRaw;
  }
  const { byRef, snapshotMainNodeId, chainGenesisHumanId } = options;
  if (fromRaw === HUMAN_VIEWER_PLAYER_ID) {
    return `human:${HUMAN_VIEWER_PLAYER_ID}`;
  }
  if (byRef.has(`human:${fromRaw}`)) {
    return `human:${fromRaw}`;
  }
  if (snapshotMainNodeId !== null && fromRaw === snapshotMainNodeId) {
    return `human:${fromRaw}`;
  }
  if (fromRaw === chainGenesisHumanId) {
    return `human:${fromRaw}`;
  }
  return `agent:${fromRaw}`;
}

export const MAX_WORLD_OCCUPANTS = 100;
const PRESENCE_LEASE_TTL_SECONDS_DEFAULT = 45;
const PRESENCE_SWEEP_INTERVAL_MS = 5_000;

export type RecordInteractionInput = {
  playerId: string;
  role: WorldInteractionRole;
  text: string;
};

export type ProximityActionKind = "assist" | "chat" | "zone" | "yield";

export type RecordProximityActionInput = {
  fromPlayerId: string;
  toPlayerId: string;
  action: ProximityActionKind;
};

export type RegisterSpaceNodeInput = {
  id?: string;
  name: string;
  description?: string;
  designKey: string;
  owner?: SpaceOwner;
  amenities: SpaceAmenityKind[];
  activityObjectIds?: string[];
};

export type RegisterStructureNodeInput = {
  id?: string;
  name: string;
  /**
   * @deprecated Structure anchors are now derived from the worldLayout space zone.
   * Any caller-provided value is ignored; structures are auto-placed alongside agents.
   */
  x?: number;
  /**
   * @deprecated Structure anchors are now derived from the worldLayout space zone.
   * Any caller-provided value is ignored; structures are auto-placed alongside agents.
   */
  y?: number;
  worldId?: string;
  spaceIds: string[];
  /** Defaults true (fixed map anchor for authored spaces). */
  stationary?: boolean;
};

export type RegisterArcadeCabinetInput = {
  id?: string;
  name: string;
  gameId: GameId;
};

export type EnterStructureSpaceInput = {
  playerId: string;
  structureId: string;
  spaceId?: string;
};

export type CreateSpaceWithNodeInput = {
  name: string;
  description?: string;
  designKey: string;
  ownerDisplayName: string;
  structureName?: string;
};

function spaceCatalogEntryFromRegisterInput(
  input: RegisterSpaceNodeInput,
  id: string
): SpaceCatalogEntryJson {
  const amenities = input.amenities;
  const owner: SpaceOwner = input.owner ?? { displayName: "Unknown" };
  const displayName = owner.displayName.trim();
  if (displayName.length === 0) {
    throw new Error("registerSpaceNode: owner.displayName must not be empty");
  }
  const description = input.description?.trim() ?? "";
  const designKey = input.designKey.trim();
  if (designKey.length === 0) {
    throw new Error("registerSpaceNode: designKey must not be empty");
  }
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error("registerSpaceNode: name must not be empty");
  }
  const entry: SpaceCatalogEntryJson = {
    id,
    name,
    description,
    designKey,
    owner: {
      displayName,
      ...(owner.playerId !== undefined && owner.playerId.trim().length > 0
        ? { playerId: owner.playerId.trim() }
        : {}),
      ...(owner.nodeId !== undefined && owner.nodeId.trim().length > 0
        ? { nodeId: owner.nodeId.trim() }
        : {}),
    },
    amenities: [...amenities],
  };
  if (input.activityObjectIds !== undefined && input.activityObjectIds.length > 0) {
    entry.activityObjectIds = [...input.activityObjectIds];
  }
  return entry;
}

function spaceNodeFromCatalog(entry: SpaceCatalogEntryJson): SpaceNode {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    designKey: entry.designKey,
    owner: { ...entry.owner },
    amenities: [...entry.amenities],
    activityObjectIds: [...(entry.activityObjectIds ?? [])],
  };
}

const PROXIMITY_ACTION_LABEL: Record<ProximityActionKind, string> = {
  assist: "Assist",
  chat: "Chat",
  zone: "Zone",
  yield: "Yield",
};

export class PlayWorld {
  private readonly bus = new InMemoryPlayBus();
  private httpTransport: HttpPlayTransport | null = null;
  private readonly repository: AgentRepository | null;
  private readonly sessionStore: SessionStore;
  private readonly locationsByPlayerId = new Map<string, WorldPlayerLocation>();
  private layout: WorldLayout | null = null;
  private mainNodeId: string | null = null;
  private presenceSweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: PlayWorldOptions) {
    this.repository = options.repository ?? null;
    this.sessionStore = options.sessionStore;
  }

  async start(): Promise<void> {
    configureAgentPlayDebug(
      this.options.debug !== undefined
        ? { debug: this.options.debug }
        : {}
    );
    const sid = await this.sessionStore.loadOrCreateSessionId();
    this.mainNodeId = this.sessionStore.playerChainGenesis;
    agentPlayDebug("play-world", "start", { sessionId: sid });
    if (this.layout === null) {
      if (this.options.worldLayoutRepository !== undefined) {
        this.layout = await bootstrapWorldLayoutIfNeeded({
          repo: this.options.worldLayoutRepository,
        });
      } else {
        this.layout = createDefaultSeededPlayLayout();
      }
    }
    const layoutWire = buildSnapshotWorldLayout(this.layout);
    if (this.options.playApiBase !== undefined) {
      this.httpTransport = new HttpPlayTransport({
        baseUrl: this.options.playApiBase,
        sessionId: this.sessionStore.getSessionId(),
      });
    }
    const existingSnapshot = await this.sessionStore.getSnapshotJson();
    const genesis = this.sessionStore.playerChainGenesis;
    if (existingSnapshot === null) {
      const initialSnapshot = emptySnapshot(genesis, layoutWire);
      const withCabinets = ensureArcadeCabinetsInSnapshot({
        snapshot: initialSnapshot,
        worldLayout: this.getWorldLayout(),
      });
      await this.sessionStore.persistSnapshot(withCabinets);
    } else {
      const legacy = existingSnapshot as { worldLayout?: unknown };
      const normalized = normalizePreviewSnapshot(existingSnapshot);
      const withLayout = { ...normalized, worldLayout: layoutWire };
      const withCabinets = ensureArcadeCabinetsInSnapshot({
        snapshot: withLayout,
        worldLayout: this.getWorldLayout(),
      });
      const resolved = resolveStructureAnchorsAtRuntime({
        ...withCabinets,
        worldMap: snapshotWorldMapWithResolvedAgents(
          withCabinets.worldMap,
          withCabinets.worldLayout
        ),
      });
      const shouldPersist =
        legacy.worldLayout === undefined ||
        withCabinets.worldMap.occupants.length !==
          normalized.worldMap.occupants.length ||
        JSON.stringify(resolved.worldLayout) !==
          JSON.stringify(normalized.worldLayout) ||
        hasArcadeCabinetAtOrigin(resolved);
      if (shouldPersist) {
        await this.sessionStore.persistSnapshot(resolved);
      }
    }
    if (this.presenceSweepTimer === null) {
      this.presenceSweepTimer = setInterval(() => {
        void this.sweepStaleAgentOccupants();
      }, PRESENCE_SWEEP_INTERVAL_MS);
      this.presenceSweepTimer.unref?.();
    }
  }

  getWorldLayout(): WorldLayout {
    if (this.layout === null) {
      throw new Error("PlayWorld.getWorldLayout: layout not initialized");
    }
    return this.layout;
  }

  async updateLayoutBoundsField(input: {
    field: WorldLayoutBoundsField;
    value: number;
  }): Promise<WorldLayout> {
    const current = this.getWorldLayout();
    const nextLayout = applyBoundsFieldUpdateToLayout({
      layout: current,
      field: input.field,
      value: input.value,
    });
    if (this.options.worldLayoutRepository !== undefined) {
      await this.options.worldLayoutRepository.saveLayout(nextLayout);
    }
    this.layout = nextLayout;
    const layoutWire = buildSnapshotWorldLayout(nextLayout);
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const next: PreviewSnapshotJson = {
          ...base,
          worldLayout: layoutWire,
        };
        return { next, fanout: this.metadataFanout() };
      },
    });
    agentPlayDebug("play-world", "updateLayoutBoundsField", {
      field: input.field,
      value: input.value,
      rev: nextLayout.rev,
    });
    return nextLayout;
  }

  async isSessionSid(sid: string): Promise<boolean> {
    const trimmed = sid.trim();
    if (trimmed.length === 0) {
      return false;
    }
    try {
      if (trimmed === this.sessionStore.getSessionId()) {
        return true;
      }
    } catch {
      return false;
    }
    if (this.repository === null) {
      return false;
    }
    const node = await this.repository.getNode(trimmed);
    return node !== null && node.kind === "agent";
  }

  private metadataFanout(): RedisFanoutItem[] {
    return [
      {
        event: WORLD_AGENT_SIGNAL_EVENT,
        data: {
          playerId: WORLD_FANOUT_PLAYER_ID,
          kind: "metadata" as const,
          data: {},
        },
      },
    ];
  }

  async resetSession(): Promise<string> {
    this.sessionStore.getSessionId();
    const newSid = randomUUID();
    const prev = await this.sessionStore.getSnapshotJson();
    await this.sessionStore.replaceSessionWithNewSid(newSid);
    if (this.options.playApiBase !== undefined) {
      this.httpTransport = new HttpPlayTransport({
        baseUrl: this.options.playApiBase,
        sessionId: this.sessionStore.getSessionId(),
      });
    }
    const snap = emptySnapshot(
      this.sessionStore.playerChainGenesis,
      buildSnapshotWorldLayout(this.getWorldLayout())
    );
    const { rev, merkleRootHex, merkleLeafCount } =
      await this.sessionStore.persistSnapshotReturningRev(snap);
    const playerChainNotify = buildPlayerChainFanoutNotify({
      prev,
      next: snap,
      playerChainGenesisUtf8: this.sessionStore.playerChainGenesis,
    });
    await this.sessionStore.publishWorldFanout(
      rev,
      WORLD_AGENT_SIGNAL_EVENT,
      {
        playerId: WORLD_FANOUT_PLAYER_ID,
        kind: "metadata",
        data: {},
      },
      {
        merkleRootHex,
        merkleLeafCount,
        ...(playerChainNotify !== undefined ? { playerChainNotify } : {}),
      }
    );
    agentPlayDebug("play-world", "resetSession", { sessionId: newSid });
    agentPlayVerbose("play-world", "resetSession complete", {
      newSidPrefix: `${newSid.slice(0, 8)}…`,
    });
    return newSid;
  }

  getPreviewUrl(): string {
    const base =
      this.options.previewBaseUrl ??
      process.env.PLAY_PREVIEW_BASE_URL ??
      "https://agent-play.vercel.app";
    const u = new URL(base.includes("://") ? base : `https://${base}`);
    u.search = "";
    return u.toString();
  }

  async getSnapshotJson(): Promise<PreviewSnapshotJson> {
    const mainNodeId = this.mainNodeId ?? this.sessionStore.playerChainGenesis;
    const raw = await this.sessionStore.getSnapshotJson();
    if (raw === null) {
      if (this.layout !== null) {
        return emptySnapshot(
          mainNodeId,
          buildSnapshotWorldLayout(this.layout)
        );
      }
      return emptySnapshot(mainNodeId);
    }
    const n = normalizePreviewSnapshot(raw);
    const withAgents = {
      ...n,
      worldMap: snapshotWorldMapWithResolvedAgents(n.worldMap, n.worldLayout),
    };
    const normalized = resolveStructureAnchorsAtRuntime(withAgents);
    const withAmenities = await this.hydrateAmenityContent(normalized);
    return this.hydrateParkingStreet(withAmenities);
  }

  private async hydrateParkingStreet(
    snapshot: PreviewSnapshotJson
  ): Promise<PreviewSnapshotJson> {
    const nowIso = new Date().toISOString();
    const parkingStreet = await this.sessionStore.tickParkingExpiry(nowIso);
    return { ...snapshot, parkingStreet };
  }

  /**
   * Enrich each space catalog entry with its sidecar amenity content (shop
   * items, supermarket items, car-wash cars) so clients can render the amenity
   * stages directly from the snapshot.
   *
   * @remarks
   * Only reads sidecars for amenities actually present on the space, so the
   * Redis round-trips scale with content rather than the total catalog.
   */
  private async hydrateAmenityContent(
    snapshot: PreviewSnapshotJson
  ): Promise<PreviewSnapshotJson> {
    const spaces = snapshot.spaces;
    if (spaces === undefined || spaces.length === 0) {
      return snapshot;
    }
    const next: typeof spaces = [];
    for (const space of spaces) {
      const content: NonNullable<typeof space.amenityContent> = {};
      if (space.amenities.includes("shop")) {
        const items = await this.sessionStore.listShopItems(space.id);
        if (items.length > 0) content.shopItems = items;
      }
      if (space.amenities.includes("supermarket")) {
        const items = await this.sessionStore.listSupermarketItems(space.id);
        if (items.length > 0) content.supermarketItems = items;
      }
      if (space.amenities.includes("car_wash")) {
        const cars = await this.sessionStore.listCarWashCars(space.id);
        if (cars.length > 0) content.carWashCars = cars;
      }
      next.push(
        Object.keys(content).length > 0
          ? { ...space, amenityContent: content }
          : { ...space }
      );
    }
    return { ...snapshot, spaces: next };
  }

  /**
   * Maps a raw proximity actor id to a stable ref: `human:…` or `agent:…`.
   * Used by the proximity-action API before {@link recordProximityAction}.
   */
  async normalizeProximityFromPlayerId(fromPlayerId: string): Promise<string> {
    const trimmed = fromPlayerId.trim();
    const snap = await this.getSnapshotJson();
    const byRef = buildOccupantRefIndex(snap);
    const snapshotMainNodeId =
      typeof snap.mainNodeId === "string" && snap.mainNodeId.trim().length > 0
        ? snap.mainNodeId.trim()
        : null;
    const chainGenesisHumanId =
      this.mainNodeId ?? this.sessionStore.playerChainGenesis;
    return resolveProximityFromPlayerRef(trimmed, {
      byRef,
      snapshotMainNodeId,
      chainGenesisHumanId,
    });
  }

  async recordProximityAction(
    input: RecordProximityActionInput
  ): Promise<void> {
    const snap = await this.getSnapshotJson();
    const byRef = buildOccupantRefIndex(snap);
    const snapshotMainNodeId =
      typeof snap.mainNodeId === "string" && snap.mainNodeId.trim().length > 0
        ? snap.mainNodeId.trim()
        : null;
    const chainGenesisHumanId =
      this.mainNodeId ?? this.sessionStore.playerChainGenesis;
    const fromRaw = input.fromPlayerId;
    const fromRef = resolveProximityFromPlayerRef(fromRaw, {
      byRef,
      snapshotMainNodeId,
      chainGenesisHumanId,
    });
    const toRef = input.toPlayerId.includes(":")
      ? input.toPlayerId
      : `agent:${input.toPlayerId}`;
    const syntheticViewerHuman = (
      id: string
    ): PreviewWorldMapHumanOccupantJson => ({
      kind: "human",
      id,
      name: "Viewer",
      x: 0,
      y: 0,
      interactive: false,
    });
    const fromOcc =
      byRef.get(fromRef) ??
      (fromRef === `human:${HUMAN_VIEWER_PLAYER_ID}`
        ? syntheticViewerHuman(HUMAN_VIEWER_PLAYER_ID)
        : fromRef.startsWith("human:")
          ? (() => {
              const hid = fromRef.slice("human:".length);
              if (
                hid.length > 0 &&
                (snapshotMainNodeId === hid || hid === chainGenesisHumanId)
              ) {
                return syntheticViewerHuman(hid);
              }
              return undefined;
            })()
          : undefined);
    const toOcc =
      byRef.get(toRef) ??
      (toRef === `human:${HUMAN_VIEWER_PLAYER_ID}`
        ? {
            kind: "human" as const,
            id: HUMAN_VIEWER_PLAYER_ID,
            name: "Viewer",
            x: 0,
            y: 0,
            interactive: false,
          }
        : undefined);
    if (fromOcc === undefined) {
      throw new Error(
        `recordProximityAction: unknown fromPlayerId "${input.fromPlayerId}"`
      );
    }
    if (toOcc === undefined) {
      throw new Error(
        `recordProximityAction: unknown toPlayerId "${input.toPlayerId}"`
      );
    }
    if (fromOcc.kind === "human" && toOcc.kind === "human") {
      throw new Error("recordProximityAction: human to human is not allowed");
    }
    if (toOcc.kind === "mcp" && (input.action === "zone" || input.action === "yield")) {
      throw new Error("recordProximityAction: zone/yield require an agent target");
    }
    const label = PROXIMITY_ACTION_LABEL[input.action];
    if (fromOcc.kind === "agent") {
      await this.recordInteraction({
        playerId: fromOcc.agentId,
        role: "user",
        text: `[proximity ${label}] toward ${toOcc.name}`,
      });
    }
    const sourceLabel =
      fromOcc.kind === "human" ? "viewer" : fromOcc.name;
    if (toOcc.kind === "agent") {
      await this.recordInteraction({
        playerId: toOcc.agentId,
        role: "tool",
        text:
          fromOcc.kind === "human"
            ? `Proximity viewer: ${label}`
            : `Proximity: ${sourceLabel} — ${label}`,
      });
    } else if (toOcc.kind === "mcp") {
      const payload: WorldInteractionPayload = {
        playerId: `mcp:${toOcc.id}`,
        role: "tool",
        text:
          fromOcc.kind === "human"
            ? `MCP proximity viewer: ${label}`
            : `MCP proximity: ${sourceLabel} — ${label}`,
        at: new Date().toISOString(),
        seq: 0,
      };
      this.bus.emit(WORLD_INTERACTION_EVENT, payload);
      void this.forwardHttp(WORLD_INTERACTION_EVENT, payload);
      const rev = await this.sessionStore.getSnapshotRev();
      await this.sessionStore.publishWorldFanout(
        rev,
        WORLD_INTERACTION_EVENT,
        payload
      );
    }
    if (
      toOcc.kind === "agent" &&
      (input.action === "assist" || input.action === "chat")
    ) {
      const sig: WorldAgentSignalPayload = {
        playerId: toOcc.agentId,
        kind: input.action,
        data: { fromPlayerId: fromRef },
      };
      this.emitAgentSignal(toOcc.agentId, {
        kind: input.action,
        data: { fromPlayerId: fromRef },
      });
      const rev = await this.sessionStore.getSnapshotRev();
      await this.sessionStore.publishWorldFanout(rev, WORLD_AGENT_SIGNAL_EVENT, sig);
    }
    if (toOcc.kind === "agent" && input.action === "zone") {
      await this.applyZoneIncrement(toOcc.agentId);
    }
    if (toOcc.kind === "agent" && input.action === "yield") {
      await this.applyYieldIncrement(toOcc.agentId);
    }
  }

  private emitAgentSignal(
    playerId: string,
    payload: Omit<WorldAgentSignalPayload, "playerId">
  ): void {
    const full: WorldAgentSignalPayload = { playerId, ...payload };
    this.bus.emit(WORLD_AGENT_SIGNAL_EVENT, full);
    void this.forwardHttp(WORLD_AGENT_SIGNAL_EVENT, full);
  }

  private async applyZoneIncrement(agentId: string): Promise<void> {
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const occ = base.worldMap.occupants.find(
          (o): o is PreviewWorldMapAgentOccupantJson =>
            o.kind === "agent" && o.agentId === agentId
        );
        if (occ === undefined) {
          throw new Error("applyZoneIncrement: unknown agent");
        }
        if (this.repository === null) {
          const zoneCount = (occ.zoneCount ?? 0) + 1;
          const flagged = zoneCount >= 100;
          const atZ = new Date().toISOString();
          const row: PreviewWorldMapAgentOccupantJson = {
            ...occ,
            zoneCount,
            flagged,
            onZone: { zoneCount, flagged, at: atZ },
          };
          const nextOccupants = upsertAgentOccupant(base.worldMap.occupants, row);
          const next = snapshotWithOccupants(base, nextOccupants);
          this.emitAgentSignal(agentId, { kind: "zone", data: { zoneCount, flagged } });
          return {
            next,
            fanout: [
              {
                event: WORLD_AGENT_SIGNAL_EVENT,
                data: {
                  playerId: agentId,
                  kind: "zone" as const,
                  data: { zoneCount, flagged },
                },
              },
            ],
          };
        }
        const nextStored = await this.repository.incrementZoneCount(agentId);
        if (nextStored === null) {
          return { next: base, fanout: this.metadataFanout() };
        }
        const row: PreviewWorldMapAgentOccupantJson = {
          ...occ,
          zoneCount: nextStored.zoneCount,
          yieldCount: nextStored.yieldCount,
          flagged: nextStored.flagged,
          onZone: {
            zoneCount: nextStored.zoneCount,
            flagged: nextStored.flagged,
            at: new Date().toISOString(),
          },
        };
        const nextOccupants = upsertAgentOccupant(base.worldMap.occupants, row);
        const next = snapshotWithOccupants(base, nextOccupants);
        this.emitAgentSignal(agentId, {
          kind: "zone",
          data: {
            zoneCount: nextStored.zoneCount,
            flagged: nextStored.flagged,
          },
        });
        return {
          next,
          fanout: [
            {
              event: WORLD_AGENT_SIGNAL_EVENT,
              data: {
                playerId: agentId,
                kind: "zone" as const,
                data: {
                  zoneCount: nextStored.zoneCount,
                  flagged: nextStored.flagged,
                },
              },
            },
          ],
        };
      },
    });
  }

  private async applyYieldIncrement(agentId: string): Promise<void> {
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const occ = base.worldMap.occupants.find(
          (o): o is PreviewWorldMapAgentOccupantJson =>
            o.kind === "agent" && o.agentId === agentId
        );
        if (occ === undefined) {
          throw new Error("applyYieldIncrement: unknown agent");
        }
        if (this.repository === null) {
          const yieldCount = (occ.yieldCount ?? 0) + 1;
          const flagged = occ.flagged ?? false;
          const atY = new Date().toISOString();
          const row: PreviewWorldMapAgentOccupantJson = {
            ...occ,
            yieldCount,
            onYield: { yieldCount, at: atY },
          };
          const nextOccupants = upsertAgentOccupant(base.worldMap.occupants, row);
          const next = snapshotWithOccupants(base, nextOccupants);
          this.emitAgentSignal(agentId, { kind: "yield", data: { yieldCount } });
          return {
            next,
            fanout: [
              {
                event: WORLD_AGENT_SIGNAL_EVENT,
                data: {
                  playerId: agentId,
                  kind: "yield" as const,
                  data: { yieldCount },
                },
              },
            ],
          };
        }
        const nextStored = await this.repository.incrementYieldCount(agentId);
        if (nextStored === null) {
          return { next: base, fanout: this.metadataFanout() };
        }
        const row: PreviewWorldMapAgentOccupantJson = {
          ...occ,
          zoneCount: nextStored.zoneCount,
          yieldCount: nextStored.yieldCount,
          flagged: nextStored.flagged,
          onYield: {
            yieldCount: nextStored.yieldCount,
            at: new Date().toISOString(),
          },
        };
        const nextOccupants = upsertAgentOccupant(base.worldMap.occupants, row);
        const next = snapshotWithOccupants(base, nextOccupants);
        this.emitAgentSignal(agentId, {
          kind: "yield",
          data: { yieldCount: nextStored.yieldCount },
        });
        return {
          next,
          fanout: [
            {
              event: WORLD_AGENT_SIGNAL_EVENT,
              data: {
                playerId: agentId,
                kind: "yield" as const,
                data: { yieldCount: nextStored.yieldCount },
              },
            },
          ],
        };
      },
    });
  }

  async recordInteraction(
    input: RecordInteractionInput
  ): Promise<WorldInteractionPayload | null> {
    const snap = await this.getSnapshotJson();
    if (
      !snap.worldMap.occupants.some(
        (o) => o.kind === "agent" && o.agentId === input.playerId
      )
    ) {
      throw new Error(
        `recordInteraction: unknown playerId "${input.playerId}"`
      );
    }
    const trimmed = input.text.trim();
    if (trimmed.length === 0) return null;
    const at = new Date().toISOString();
    const payload: WorldInteractionPayload = {
      playerId: input.playerId,
      role: input.role,
      text: trimmed.slice(0, 4000),
      at,
      seq: 0,
    };
    this.bus.emit(WORLD_INTERACTION_EVENT, payload);
    void this.forwardHttp(WORLD_INTERACTION_EVENT, payload);
    agentPlayDebug("play-world", "recordInteraction", {
      playerId: input.playerId,
      role: input.role,
    });
    const rev = await this.sessionStore.getSnapshotRev();
    await this.sessionStore.publishWorldFanout(
      rev,
      WORLD_INTERACTION_EVENT,
      payload
    );
    return payload;
  }

  async recordAssistToolInvocation(input: {
    targetPlayerId: string;
    toolName: string;
    args: Record<string, unknown>;
  }): Promise<void> {
    const { targetPlayerId, toolName, args } = input;
    const snap = await this.getSnapshotJson();
    const occ = snap.worldMap.occupants.find(
      (o): o is PreviewWorldMapAgentOccupantJson =>
        o.kind === "agent" && o.agentId === targetPlayerId
    );
    if (occ === undefined) {
      throw new Error(
        `recordAssistToolInvocation: unknown playerId "${targetPlayerId}"`
      );
    }
    const allowed = occ.assistTools ?? [];
    if (!allowed.some((t) => t.name === toolName)) {
      throw new Error(
        `recordAssistToolInvocation: "${toolName}" is not a registered assist_* tool for this player`
      );
    }
    const argStr = JSON.stringify(args);
    await this.recordInteraction({
      playerId: targetPlayerId,
      role: "user",
      text: `[assist] ${toolName}(${argStr})`,
    });
    await this.recordInteraction({
      playerId: targetPlayerId,
      role: "assistant",
      text: `Assist ${toolName}: received. Your agent process can execute the tool and stream results via the SDK.`,
    });
  }

  async addPlayer(input: AddPlayerInput): Promise<RegisteredPlayer> {
    this.sessionStore.getSessionId();
    assertAgentToolContract(input.agent.toolNames);
    const trimmedId = input.agentId.trim();
    if (trimmedId.length === 0) {
      throw new Error(
        'addPlayer: agentId is required (use an id from `agent-play create` when using a repository)'
      );
    }

    let registered: RegisteredPlayer | undefined;

    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        let stored: StoredAgentRecord | null = null;
        let playerId = trimmedId;

        if (this.repository !== null) {
          if (input.passwHash === undefined || input.passwHash.length === 0) {
            throw new Error(
              "addPlayer: passwHash is required when repository is configured"
            );
          }
          const resolvedMainNodeId =
            input.mainNodeId !== undefined && input.mainNodeId.length > 0
              ? input.mainNodeId
              : await this.repository.findAccountIdForAgentNode(trimmedId);
          if (resolvedMainNodeId === null) {
            throw new Error(
              "addPlayer: unable to resolve main node for agentId"
            );
          }
          const row = await this.repository.getAgent(trimmedId);
          if (row === null) {
            const mainNode = await this.repository.getNode(resolvedMainNodeId);
            const attachedAgentIds = mainNode?.agentNodeIds ?? [];
            if (!attachedAgentIds.includes(trimmedId)) {
              throw new Error(
                "addPlayer: unknown agentId; create an agent node with `agent-play create-agent-node`"
              );
            }
            stored = null;
            playerId = trimmedId;
          } else {
            if (row.nodeId !== resolvedMainNodeId) {
              throw new Error("addPlayer: agent does not belong to mainNodeId");
            }
            stored = row;
            playerId = row.agentId;
          }

          const validPasswHash = await this.repository.verifyNodePasswHash({
            nodeId: trimmedId,
            passwHash: input.passwHash,
          });
          if (!validPasswHash) {
            throw new Error("addPlayer: invalid passwHash");
          }
        } else if (
          base.worldMap.occupants.some(
            (o) => o.kind === "agent" && o.agentId === playerId
          )
        ) {
          throw new Error(
            `addPlayer: agentId already present in session "${playerId}"`
          );
        }

        if (base.worldMap.occupants.length >= MAX_WORLD_OCCUPANTS) {
          throw new Error(
            `addPlayer: world occupant limit reached (${MAX_WORLD_OCCUPANTS})`
          );
        }

        const registeredSummary: RegisteredAgentSummary =
          stored !== null
            ? toRegisteredSummary(stored)
            : {
                agentId: playerId,
                name: input.name,
                toolNames: [...input.agent.toolNames],
                zoneCount: 0,
                yieldCount: 0,
                flagged: false,
              };
        const effectiveToolNames =
          input.agent.toolNames.length > 0
            ? input.agent.toolNames
            : stored?.toolNames ?? [];
        const summaryName =
          input.name.trim().length > 0 ? input.name : (stored?.name ?? input.name);
        const summaryForWorld: RegisteredAgentSummary = {
          ...registeredSummary,
          name: summaryName,
          toolNames: [...effectiveToolNames],
        };
        const agentStreet = pickZoneForGroup(this.getWorldLayout(), "agent");
        const assistList =
          input.agent.assistTools !== undefined
            ? input.agent.assistTools.map((t) => ({ ...t }))
            : [];

        const row: PreviewWorldMapAgentOccupantJson = {
          kind: "agent",
          nodeId: stored?.nodeId ?? input.mainNodeId,
          agentId: playerId,
          name: summaryName,
          streetId: agentStreet.streetId,
          platform: input.type,
          toolNames: [...effectiveToolNames],
          stationary: true,
          assistToolNames: extractAssistToolNames(effectiveToolNames),
          hasChatTool: effectiveToolNames.includes("chat_tool"),
          enableP2a: input.enableP2a ?? "off",
          ...(input.realtimeInstructions !== undefined
            ? { realtimeInstructions: input.realtimeInstructions }
            : {}),
          ...(input.realtimeWebrtc !== undefined
            ? { realtimeWebrtc: input.realtimeWebrtc }
            : {}),
        };
        if (assistList.length > 0) {
          row.assistTools = assistList;
        }
        if (stored !== null) {
          row.zoneCount = stored.zoneCount;
          row.yieldCount = stored.yieldCount;
          row.flagged = stored.flagged;
        }

        const nextOccupants = upsertAgentOccupant(
          base.worldMap.occupants,
          row
        );
        const next = snapshotWithOccupants(base, nextOccupants);

        const player: PlayAgentInformation = {
          id: playerId,
          name: summaryName,
          sid: this.sessionStore.getSessionId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        registered = {
          ...player,
          previewUrl: this.getPreviewUrl(),
          registeredAgent: summaryForWorld,
          enableP2a: input.enableP2a ?? "off",
        };

        const added = { player: row };
        this.bus.emit(PLAYER_ADDED_EVENT, added);
        void this.forwardHttp(PLAYER_ADDED_EVENT, added);

        agentPlayDebug("play-world", "addPlayer", {
          playerId: player.id,
          name: player.name,
          toolCount: effectiveToolNames.length,
        });

        return {
          next,
          fanout: [{ event: PLAYER_ADDED_EVENT, data: added }],
        };
      },
    });

    if (registered === undefined) {
      throw new Error("addPlayer failed");
    }
    if (
      input.connectionId !== undefined &&
      input.connectionId.length > 0
    ) {
      await this.sessionStore.upsertPresenceLease({
        playerId: registered.id,
        agentId: input.agentId,
        sid: registered.sid,
        connectionId: input.connectionId,
        ttlSeconds:
          input.leaseTtlSeconds ?? PRESENCE_LEASE_TTL_SECONDS_DEFAULT,
      });
    }
    this.locationsByPlayerId.set(registered.id, {
      playerId: registered.id,
      worldId: "overworld",
    });
    return registered;
  }

  async heartbeatPlayerConnection(input: {
    playerId: string;
    connectionId: string;
    leaseTtlSeconds?: number;
  }): Promise<void> {
    const ok = await this.sessionStore.touchPresenceLease({
      playerId: input.playerId,
      connectionId: input.connectionId,
      ttlSeconds:
        input.leaseTtlSeconds ?? PRESENCE_LEASE_TTL_SECONDS_DEFAULT,
    });
    if (!ok) {
      throw new Error("heartbeat: unknown or stale connection");
    }
  }

  async disconnectPlayerConnection(input: {
    playerId: string;
    connectionId: string;
  }): Promise<void> {
    await this.sessionStore.removePresenceLease({
      playerId: input.playerId,
      connectionId: input.connectionId,
    });
    await this.removePlayer(input.playerId);
  }

  async recordJourney(playerId: string, journey: Journey): Promise<void> {
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const update = this.buildWorldJourneyUpdate(base, playerId, journey);
        const lastJson = serializeWorldJourneyUpdate(update);
        const next = patchAgentLastUpdate(base, playerId, lastJson);
        this.bus.emit(WORLD_JOURNEY_EVENT, update);
        void this.forwardHttp(WORLD_JOURNEY_EVENT, update);
        const signal: WorldAgentSignalPayload = {
          playerId,
          kind: "journey",
          data: { stepCount: journey.steps.length },
        };
        this.bus.emit(WORLD_AGENT_SIGNAL_EVENT, signal);
        void this.forwardHttp(WORLD_AGENT_SIGNAL_EVENT, signal);
        agentPlayDebug("play-world", "recordJourney", {
          playerId,
          stepCount: journey.steps.length,
        });
        return {
          next,
          fanout: [
            { event: WORLD_JOURNEY_EVENT, data: lastJson },
            { event: WORLD_AGENT_SIGNAL_EVENT, data: signal },
          ],
        };
      },
    });
  }

  private buildWorldJourneyUpdate(
    base: PreviewSnapshotJson,
    playerId: string,
    journey: Journey
  ): WorldJourneyUpdate {
    const occ = base.worldMap.occupants.find(
      (o): o is PreviewWorldMapAgentOccupantJson =>
        o.kind === "agent" && o.agentId === playerId
    );
    const cell = resolveAgentMapCellForJourney(occ);
    const path = journeyPathFromCellAndJourney(
      playerId,
      journey,
      cell,
      base.worldMap.bounds
    );
    return { playerId, journey, path };
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    this.bus.on(event, listener);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.bus.off(event, listener);
  }

  async removePlayer(id: string): Promise<void> {
    await this.sessionStore.removePresenceLease({ playerId: id });
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const nextOccupants = removeOccupantsForPlayer(
          base.worldMap.occupants,
          id
        );
        const next = snapshotWithOccupants(base, nextOccupants);
        agentPlayDebug("play-world", "removePlayer", { playerId: id });
        return { next, fanout: this.metadataFanout() };
      },
    });
    this.locationsByPlayerId.delete(id);
  }

  async registerSpaceNode(input: RegisterSpaceNodeInput): Promise<SpaceNode> {
    let created: SpaceNode | undefined;
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const normalized = normalizePreviewSnapshot(base);
        const id = input.id?.trim() ?? randomUUID();
        if (id.length === 0) {
          throw new Error("registerSpaceNode: id must not be empty");
        }
        const spaces = normalized.spaces ?? [];
        if (spaces.some((s) => s.id === id)) {
          throw new Error(`registerSpaceNode: id already exists "${id}"`);
        }
        const catalogEntry = spaceCatalogEntryFromRegisterInput(input, id);
        const nextSpaces = upsertSpaceCatalogEntry(spaces, catalogEntry);
        const next: PreviewSnapshotJson = {
          ...normalized,
          spaces: nextSpaces,
        };
        created = spaceNodeFromCatalog(catalogEntry);
        agentPlayDebug("play-world", "registerSpaceNode", { spaceId: id });
        return { next, fanout: this.metadataFanout() };
      },
    });
    if (created === undefined) {
      throw new Error("registerSpaceNode failed");
    }
    return created;
  }

  async createSpaceWithNode(input: CreateSpaceWithNodeInput): Promise<{
    spaceId: string;
    nodeId: string;
    phrase: string;
    structure: StructureNode;
  }> {
    if (this.repository === null) {
      throw new Error("createSpaceWithNode: repository not configured");
    }
    const spaceId = randomUUID();
    const created = await this.repository.createNode({
      kind: "space",
      spaceId,
    });
    if (created.phrase === undefined) {
      throw new Error("createSpaceWithNode: expected server-generated passphrase");
    }
    await this.registerSpaceNode({
      id: spaceId,
      name: input.name,
      description: input.description,
      designKey: input.designKey,
      owner: { displayName: input.ownerDisplayName, nodeId: created.nodeId },
      amenities: [],
    });
    const structure = await this.registerStructureNode({
      id: `st-${spaceId}`,
      name:
        input.structureName?.trim() !== undefined &&
        input.structureName.trim().length > 0
          ? input.structureName.trim()
          : input.name.trim(),
      spaceIds: [spaceId],
      stationary: true,
    });
    await this.sessionStore.appendSpaceAmenityLog({
      spaceId,
      amenityKind: "supermarket",
      entry: {
        at: new Date().toISOString(),
        action: "space_created",
        detail: { nodeId: created.nodeId, structureId: structure.id },
      },
    });
    return {
      spaceId,
      nodeId: created.nodeId,
      phrase: created.phrase,
      structure,
    };
  }

  async addSpaceAmenity(
    spaceId: string,
    kind: SpaceAmenityKind
  ): Promise<SpaceNode> {
    let updated: SpaceNode | undefined;
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const normalized = normalizePreviewSnapshot(base);
        const catalog = normalized.spaces ?? [];
        const row = catalog.find((s) => s.id === spaceId);
        if (row === undefined) {
          throw new Error(`addSpaceAmenity: unknown space "${spaceId}"`);
        }
        if (row.amenities.includes(kind)) {
          throw new Error("addSpaceAmenity: amenity kind already present");
        }
        if (row.amenities.length >= MAX_SPACE_AMENITIES) {
          throw new Error(
            `addSpaceAmenity: at most ${String(MAX_SPACE_AMENITIES)} amenities`
          );
        }
        const nextEntry: SpaceCatalogEntryJson = {
          ...row,
          amenities: [...row.amenities, kind].sort((a, b) => a.localeCompare(b)),
        };
        const nextSpaces = upsertSpaceCatalogEntry(catalog, nextEntry);
        const occ = refreshStructureOccupantsForCatalog(
          normalized.worldMap.occupants,
          nextSpaces
        );
        const next = snapshotWithOccupants({ ...normalized, spaces: nextSpaces }, occ);
        updated = spaceNodeFromCatalog(nextEntry);
        agentPlayDebug("play-world", "addSpaceAmenity", { spaceId, kind });
        return { next, fanout: this.metadataFanout() };
      },
    });
    if (updated === undefined) {
      throw new Error("addSpaceAmenity failed");
    }
    await this.sessionStore.appendSpaceAmenityLog({
      spaceId,
      amenityKind: kind,
      entry: {
        at: new Date().toISOString(),
        action: "amenity_added",
        detail: { kind },
      },
    });
    return updated;
  }

  async removeSpaceAmenity(
    spaceId: string,
    kind: SpaceAmenityKind
  ): Promise<SpaceNode> {
    let updated: SpaceNode | undefined;
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const normalized = normalizePreviewSnapshot(base);
        const catalog = normalized.spaces ?? [];
        const row = catalog.find((s) => s.id === spaceId);
        if (row === undefined) {
          throw new Error(`removeSpaceAmenity: unknown space "${spaceId}"`);
        }
        if (!row.amenities.includes(kind)) {
          throw new Error("removeSpaceAmenity: amenity kind not present");
        }
        const nextEntry: SpaceCatalogEntryJson = {
          ...row,
          amenities: row.amenities.filter((k) => k !== kind),
        };
        const nextSpaces = upsertSpaceCatalogEntry(catalog, nextEntry);
        const occ = refreshStructureOccupantsForCatalog(
          normalized.worldMap.occupants,
          nextSpaces
        );
        const next = snapshotWithOccupants({ ...normalized, spaces: nextSpaces }, occ);
        updated = spaceNodeFromCatalog(nextEntry);
        agentPlayDebug("play-world", "removeSpaceAmenity", { spaceId, kind });
        return { next, fanout: this.metadataFanout() };
      },
    });
    if (updated === undefined) {
      throw new Error("removeSpaceAmenity failed");
    }
    await this.sessionStore.appendSpaceAmenityLog({
      spaceId,
      amenityKind: kind,
      entry: {
        at: new Date().toISOString(),
        action: "amenity_removed",
        detail: { kind },
      },
    });
    return updated;
  }

  async removeSpaceNode(
    spaceId: string,
    options?: { force?: boolean; ownerNodeId?: string }
  ): Promise<void> {
    const snapBefore = await this.getSnapshotJson();
    const ownerFromCatalog =
      snapBefore?.spaces?.find((s) => s.id === spaceId)?.owner.nodeId?.trim() ??
      "";
    const ownerNodeId =
      options?.ownerNodeId !== undefined && options.ownerNodeId.trim().length > 0
        ? options.ownerNodeId.trim()
        : ownerFromCatalog;
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const normalized = normalizePreviewSnapshot(base);
        const spaces = (normalized.spaces ?? []).filter((s) => s.id !== spaceId);
        const occ = normalized.worldMap.occupants
          .map((o) => {
            if (o.kind !== "structure") {
              return o;
            }
            if (!o.spaceIds.includes(spaceId)) {
              return o;
            }
            const nextIds = o.spaceIds.filter((id) => id !== spaceId);
            if (nextIds.length === 0) {
              return null;
            }
            const fields = deriveStructureAmenityFields(nextIds, spaces);
            const nextRow: PreviewWorldMapStructureOccupantJson = {
              ...o,
              spaceIds: nextIds,
              ...(fields.primaryAmenity !== undefined
                ? { primaryAmenity: fields.primaryAmenity }
                : {}),
              ...(fields.amenities.length > 0
                ? { amenities: fields.amenities }
                : {}),
            };
            return nextRow;
          })
          .filter((o): o is PreviewWorldMapOccupantJson => o !== null);
        const next = snapshotWithOccupants({ ...normalized, spaces }, occ);
        agentPlayDebug("play-world", "removeSpaceNode", { spaceId });
        return { next, fanout: this.metadataFanout() };
      },
    });
    await this.sessionStore.deleteSpaceSidecar(spaceId);
    if (ownerNodeId.length > 0 && this.repository !== null) {
      await this.repository.deleteMainNodeCascade(ownerNodeId);
    }
  }

  async listSpaceNodes(): Promise<readonly SpaceNode[]> {
    const snap = await this.getSnapshotJson();
    return (snap.spaces ?? []).map((row) => spaceNodeFromCatalog(row));
  }

  async getSpaceDetail(spaceId: string): Promise<{
    catalog: SpaceNode | null;
    logs: SpaceAmenityLogEntry[];
  }> {
    const snap = await this.getSnapshotJson();
    const row = snap.spaces?.find((s) => s.id === spaceId);
    const logs = await this.sessionStore.listSpaceAmenityLogs({
      spaceId,
      limit: 200,
    });
    return {
      catalog: row !== undefined ? spaceNodeFromCatalog(row) : null,
      logs,
    };
  }

  async registerStructureNode(
    input: RegisterStructureNodeInput
  ): Promise<StructureNode> {
    let created: StructureNode | undefined;
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const normalized = normalizePreviewSnapshot(base);
        const occupantList = normalized.worldMap.occupants;
        const id = input.id?.trim() ?? randomUUID();
        const name = input.name.trim();
        const worldId = input.worldId?.trim() ?? "overworld";
        if (id.length === 0) {
          throw new Error("registerStructureNode: id must not be empty");
        }
        if (name.length === 0) {
          throw new Error("registerStructureNode: name must not be empty");
        }
        if (input.spaceIds.length === 0) {
          throw new Error(
            "registerStructureNode: at least one spaceId is required"
          );
        }
        const uniqueSpaceIds = Array.from(
          new Set(input.spaceIds.map((spaceId) => spaceId.trim()))
        );
        const catalog = normalized.spaces ?? [];
        if (
          uniqueSpaceIds.some(
            (spaceId) => !catalog.some((row) => row.id === spaceId)
          )
        ) {
          throw new Error("registerStructureNode: unknown spaceId");
        }
        const alreadyStructure = occupantList.some(
          (o) => o.kind === "structure" && o.id === id
        );
        if (!alreadyStructure && occupantList.length >= MAX_WORLD_OCCUPANTS) {
          throw new Error(
            `registerStructureNode: world occupant limit reached (${MAX_WORLD_OCCUPANTS})`
          );
        }
        const structureAnchors = occupantList
          .filter(
            (o): o is PreviewWorldMapStructureOccupantJson =>
              o.kind === "structure" && o.id !== id
          )
          .map((o) => ({ x: o.x, y: o.y }));
        const existingOccupants = finiteOccupantPositions(
          occupantList.filter((o) => !(o.kind === "structure" && o.id === id))
        );
        const anchor = computeSpaceStructureAnchor({
          occupied: occupiedKeysFromSnapshot(normalized),
          existingOccupants,
          structureAnchors,
          worldLayout: this.getWorldLayout(),
        });
        const amenityFields = deriveStructureAmenityFields(
          uniqueSpaceIds,
          catalog
        );
        const stationary = input.stationary !== false;
        const row: PreviewWorldMapStructureOccupantJson = {
          kind: "structure",
          id,
          name,
          x: anchor.x,
          y: anchor.y,
          worldId,
          spaceIds: uniqueSpaceIds,
          ...(stationary ? { stationary: true } : {}),
          ...(amenityFields.primaryAmenity !== undefined
            ? { primaryAmenity: amenityFields.primaryAmenity }
            : {}),
          ...(amenityFields.amenities.length > 0
            ? { amenities: amenityFields.amenities }
            : {}),
        };
        const nextOccupants = upsertStructureOccupant(occupantList, row);
        const next = snapshotWithOccupants(normalized, nextOccupants);
        created = {
          id,
          name,
          x: row.x,
          y: row.y,
          worldId,
          spaceIds: uniqueSpaceIds,
        };
        agentPlayDebug("play-world", "registerStructureNode", {
          structureId: id,
        });
        return { next, fanout: this.metadataFanout() };
      },
    });
    if (created === undefined) {
      throw new Error("registerStructureNode failed");
    }
    return created;
  }

  async registerArcadeCabinet(
    input: RegisterArcadeCabinetInput
  ): Promise<StructureNode> {
    let created: StructureNode | undefined;
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const normalized = normalizePreviewSnapshot(base);
        const occupantList = normalized.worldMap.occupants;
        const id = input.id?.trim() ?? `arcade-${input.gameId}`;
        const name = input.name.trim();
        if (id.length === 0 || name.length === 0) {
          throw new Error("registerArcadeCabinet: id and name required");
        }
        const structureAnchors = occupantList
          .filter(
            (o): o is PreviewWorldMapStructureOccupantJson =>
              o.kind === "structure" && o.id !== id
          )
          .map((o) => ({ x: o.x, y: o.y }));
        const existingOccupants = finiteOccupantPositions(
          occupantList.filter((o) => !(o.kind === "structure" && o.id === id))
        );
        const anchor = computeArcadeCabinetAnchor({
          occupied: occupiedKeysFromSnapshot(normalized),
          existingOccupants,
          structureAnchors,
          worldLayout: this.getWorldLayout(),
        });
        const row = buildArcadeCabinetRow({
          id,
          name,
          gameId: input.gameId,
          x: anchor.x,
          y: anchor.y,
        });
        const nextOccupants = upsertStructureOccupant(occupantList, row);
        const next = snapshotWithOccupants(normalized, nextOccupants);
        created = {
          id,
          name,
          x: row.x,
          y: row.y,
          worldId: row.worldId,
          spaceIds: [],
        };
        return { next, fanout: this.metadataFanout() };
      },
    });
    if (created === undefined) {
      throw new Error("registerArcadeCabinet failed");
    }
    return created;
  }

  async listStructureNodes(): Promise<readonly StructureNode[]> {
    const snap = await this.getSnapshotJson();
    return snap.worldMap.occupants
      .filter(
        (o): o is PreviewWorldMapStructureOccupantJson =>
          o.kind === "structure"
      )
      .map((o) => ({
        id: o.id,
        name: o.name,
        x: o.x,
        y: o.y,
        worldId: o.worldId,
        spaceIds: [...o.spaceIds],
      }));
  }

  getPlayerLocation(playerId: string): WorldPlayerLocation | null {
    const current = this.locationsByPlayerId.get(playerId);
    if (current === undefined) {
      return null;
    }
    return { ...current };
  }

  async enterStructureSpace(
    input: EnterStructureSpaceInput
  ): Promise<WorldSpaceTransitionPayload> {
    const snap = await this.getSnapshotJson();
    const playerExists = snap.worldMap.occupants.some(
      (o) => o.kind === "agent" && o.agentId === input.playerId
    );
    if (!playerExists) {
      throw new Error(
        `enterStructureSpace: unknown playerId "${input.playerId}"`
      );
    }
    const structureOcc = snap.worldMap.occupants.find(
      (o): o is PreviewWorldMapStructureOccupantJson =>
        o.kind === "structure" && o.id === input.structureId
    );
    if (structureOcc === undefined) {
      throw new Error(
        `enterStructureSpace: unknown structureId "${input.structureId}"`
      );
    }
    const selectedSpaceId = input.spaceId ?? structureOcc.spaceIds[0];
    if (selectedSpaceId === undefined) {
      throw new Error(
        `enterStructureSpace: structure "${input.structureId}" has no attached spaces`
      );
    }
    if (!structureOcc.spaceIds.includes(selectedSpaceId)) {
      throw new Error(
        `enterStructureSpace: space "${selectedSpaceId}" is not attached to structure "${input.structureId}"`
      );
    }
    const current = this.locationsByPlayerId.get(input.playerId) ?? {
      playerId: input.playerId,
      worldId: structureOcc.worldId,
    };
    const nextLocation: WorldPlayerLocation = {
      playerId: input.playerId,
      worldId: structureOcc.worldId,
      structureId: structureOcc.id,
      spaceId: selectedSpaceId,
    };
    this.locationsByPlayerId.set(input.playerId, nextLocation);
    const transition: WorldSpaceTransition = {
      playerId: input.playerId,
      from: current,
      to: nextLocation,
      at: new Date().toISOString(),
    };
    const payload: WorldSpaceTransitionPayload = transition;
    this.bus.emit(WORLD_SPACE_TRANSITION_EVENT, payload);
    void this.forwardHttp(WORLD_SPACE_TRANSITION_EVENT, payload);
    const rev = await this.sessionStore.getSnapshotRev();
    await this.sessionStore.publishWorldFanout(
      rev,
      WORLD_SPACE_TRANSITION_EVENT,
      payload
    );
    return payload;
  }

  async registerMCP(_options: { name: string; url?: string }): Promise<string> {
    agentPlayDebug("play-world", "registerMCP:deprecated", {});
    return "";
  }

  async listMcpRegistrations(): Promise<
    readonly { id: string; name: string; url?: string }[]
  > {
    const snap = await this.getSnapshotJson();
    return snap.worldMap.occupants
      .filter((o) => o.kind === "mcp")
      .map((o) => ({ id: o.id, name: o.name, ...(o.url ? { url: o.url } : {}) }));
  }

  getSessionStore(): SessionStore {
    return this.sessionStore;
  }

  private async sweepStaleAgentOccupants(): Promise<void> {
    const snapshot = await this.getSnapshotJson();
    const staleAgentIds: string[] = [];
    for (const occ of snapshot.worldMap.occupants) {
      if (occ.kind !== "agent") continue;
      const hasLease = await this.sessionStore.hasPresenceLease(occ.agentId);
      if (!hasLease) {
        staleAgentIds.push(occ.agentId);
      }
    }
    for (const agentId of staleAgentIds) {
      await this.removePlayer(agentId);
    }
  }

  private forwardHttp(event: string, payload: unknown): Promise<void> {
    if (this.httpTransport === null) return Promise.resolve();
    return this.httpTransport.emit(event, payload).catch((err) => {
      agentPlayDebug("play-world", "forwardHttp", { event, payload, error: err });
      return undefined;
    });
  }
}
