/**
 * @module @agent-play/play-ui/geography-mesh-session
 * AOI WebRTC + Yjs geography mesh (Domain B). Host signaling only for poses.
 */

import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import {
  GEOGRAPHY_COARSE_MAX_HZ,
  GEOGRAPHY_MESH_DEGREE_MAX,
  WORLD_GEOGRAPHY_NEIGHBORS_EVENT,
  WORLD_GEOGRAPHY_SIGNAL_EVENT,
  applyPoseToGeographyMap,
  listGeographyHumanIds,
  readPoseFromGeographyMap,
  removePoseFromGeographyMap,
  shouldPublishPose,
  type GeographyNeighborsPayload,
  type GeographyPose,
  type GeographySignalBody,
  GeographyNeighborsPayloadSchema,
  GeographySignalBodySchema,
} from "@agent-play/geography-mesh";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import {
  postGeographyCoarse,
  postGeographyMembership,
  postGeographySignal,
} from "./preview-geography-mesh-api.js";

export type GeographyMeshRemotePose = GeographyPose;

export type GeographyMeshSessionStatus =
  | "idle"
  | "joining"
  | "active"
  | "cap_reached"
  | "error";

export type GeographyMeshSessionCallbacks = {
  onRemotePoses: (poses: GeographyMeshRemotePose[]) => void;
  onStatus: (status: GeographyMeshSessionStatus, detail?: string) => void;
  onNeighborsChanged: (payload: {
    neighborIds: string[];
    truncated: boolean;
    memberCount: number;
  }) => void;
};

export type GeographyMeshSessionOptions = {
  apiBase: string;
  sid: string;
  humanId: string;
  displayName: string;
  iceServers?: RTCIceServer[];
  callbacks: GeographyMeshSessionCallbacks;
};

type PeerSlot = {
  humanId: string;
  pc: RTCPeerConnection;
  channel: RTCDataChannel | null;
  makingOffer: boolean;
};

const messageSync = 0;

const defaultIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
  ];
  const turnUrl = import.meta.env?.VITE_GEOGRAPHY_TURN_URL as
    | string
    | undefined;
  const turnUser = import.meta.env?.VITE_GEOGRAPHY_TURN_USERNAME as
    | string
    | undefined;
  const turnCred = import.meta.env?.VITE_GEOGRAPHY_TURN_CREDENTIAL as
    | string
    | undefined;
  if (turnUrl !== undefined && turnUrl.trim().length > 0) {
    servers.push({
      urls: turnUrl.trim(),
      ...(turnUser !== undefined && turnUser.length > 0
        ? { username: turnUser }
        : {}),
      ...(turnCred !== undefined && turnCred.length > 0
        ? { credential: turnCred }
        : {}),
    });
  }
  return servers;
};

export class GeographyMeshSession {
  private readonly options: GeographyMeshSessionOptions;
  private readonly doc = new Y.Doc();
  private readonly peers = new Map<string, PeerSlot>();
  private neighborIds: string[] = [];
  private truncated = false;
  private memberCount = 0;
  private status: GeographyMeshSessionStatus = "idle";
  private lastPose: GeographyPose | null = null;
  private lastPosePublishMs: number | null = null;
  private lastCoarseMs = 0;
  private lastCoarsePos: { x: number; y: number } | null = null;
  private disposed = false;
  private readonly iceServers: RTCIceServer[];

  constructor(options: GeographyMeshSessionOptions) {
    this.options = options;
    this.iceServers = options.iceServers ?? defaultIceServers();
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") {
        this.emitRemotePoses();
        return;
      }
      this.broadcastYjsUpdate(update);
    });
  }

  getStatus(): GeographyMeshSessionStatus {
    return this.status;
  }

  getNeighborIds(): string[] {
    return [...this.neighborIds];
  }

  isTruncated(): boolean {
    return this.truncated;
  }

  getMemberCount(): number {
    return this.memberCount;
  }

  async start(initial: {
    x: number;
    y: number;
    facing?: "left" | "right";
    isMoving?: boolean;
  }): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.setStatus("joining");
    const join = await postGeographyMembership({
      apiBase: this.options.apiBase,
      sid: this.options.sid,
      body: {
        action: "join",
        humanId: this.options.humanId,
        name: this.options.displayName,
        x: initial.x,
        y: initial.y,
      },
    });
    if (!join.ok) {
      if (join.status === 409) {
        this.setStatus(
          "cap_reached",
          join.cap?.message ?? "Geography membership is full (100)."
        );
        return;
      }
      this.setStatus("error", `membership join failed (${join.status})`);
      return;
    }
    if ("neighbors" in join.data) {
      this.applyNeighborPayload(join.data.neighbors);
    }
    this.writeLocalPose({
      id: this.options.humanId,
      name: this.options.displayName,
      x: initial.x,
      y: initial.y,
      ...(initial.facing !== undefined ? { facing: initial.facing } : {}),
      ...(initial.isMoving !== undefined ? { isMoving: initial.isMoving } : {}),
      revisedAt: Date.now(),
    });
    this.setStatus("active");
  }

  tickLocalPose(pose: {
    x: number;
    y: number;
    facing: "left" | "right";
    isMoving: boolean;
    nowMs: number;
  }): void {
    if (this.disposed || this.status !== "active") {
      return;
    }
    const next: GeographyPose = {
      id: this.options.humanId,
      name: this.options.displayName,
      x: pose.x,
      y: pose.y,
      facing: pose.facing,
      isMoving: pose.isMoving,
      revisedAt: pose.nowMs,
    };
    const decision = shouldPublishPose({
      previous: this.lastPose,
      next,
      nowMs: pose.nowMs,
      lastPublishMs: this.lastPosePublishMs,
    });
    if (decision.shouldPublish) {
      this.writeLocalPose(next);
      this.lastPose = next;
      this.lastPosePublishMs = pose.nowMs;
    }
    void this.maybePublishCoarse(pose.x, pose.y, pose.nowMs);
  }

  handleSseEvent(eventName: string, data: unknown): void {
    if (this.disposed) {
      return;
    }
    if (eventName === WORLD_GEOGRAPHY_NEIGHBORS_EVENT) {
      const record =
        typeof data === "object" && data !== null
          ? (data as Record<string, unknown>)
          : null;
      const list = record?.neighbors;
      if (!Array.isArray(list)) {
        return;
      }
      for (const item of list) {
        const parsed = GeographyNeighborsPayloadSchema.safeParse(item);
        if (!parsed.success) {
          continue;
        }
        if (parsed.data.humanId === this.options.humanId) {
          this.applyNeighborPayload(parsed.data);
        }
      }
      return;
    }
    if (eventName === WORLD_GEOGRAPHY_SIGNAL_EVENT) {
      const parsed = GeographySignalBodySchema.safeParse(data);
      if (!parsed.success) {
        return;
      }
      if (parsed.data.toHumanId !== this.options.humanId) {
        return;
      }
      void this.handleSignal(parsed.data);
    }
  }

  async stop(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    removePoseFromGeographyMap(this.doc, this.options.humanId);
    for (const peer of this.peers.values()) {
      try {
        peer.channel?.close();
      } catch {
        /* ignore */
      }
      try {
        peer.pc.close();
      } catch {
        /* ignore */
      }
    }
    this.peers.clear();
    this.neighborIds = [];
    await postGeographyMembership({
      apiBase: this.options.apiBase,
      sid: this.options.sid,
      body: { action: "leave", humanId: this.options.humanId },
    });
    this.options.callbacks.onRemotePoses([]);
    this.setStatus("idle");
  }

  private setStatus(
    status: GeographyMeshSessionStatus,
    detail?: string
  ): void {
    this.status = status;
    this.options.callbacks.onStatus(status, detail);
  }

  private writeLocalPose(pose: GeographyPose): void {
    applyPoseToGeographyMap(this.doc, pose);
  }

  private emitRemotePoses(): void {
    const poses: GeographyPose[] = [];
    for (const id of listGeographyHumanIds(this.doc)) {
      if (id === this.options.humanId) {
        continue;
      }
      const pose = readPoseFromGeographyMap(this.doc, id);
      if (pose !== null) {
        poses.push(pose);
      }
    }
    this.options.callbacks.onRemotePoses(poses);
  }

  private applyNeighborPayload(payload: GeographyNeighborsPayload): void {
    const nextIds = payload.neighborIds.slice(0, GEOGRAPHY_MESH_DEGREE_MAX);
    this.truncated = payload.truncated;
    this.memberCount = payload.memberCount;
    const nextSet = new Set(nextIds);
    for (const id of [...this.peers.keys()]) {
      if (!nextSet.has(id)) {
        this.closePeer(id);
      }
    }
    this.neighborIds = nextIds;
    this.options.callbacks.onNeighborsChanged({
      neighborIds: nextIds,
      truncated: payload.truncated,
      memberCount: payload.memberCount,
    });
    for (const id of nextIds) {
      if (!this.peers.has(id)) {
        void this.ensurePeer(id);
      }
    }
  }

  private async maybePublishCoarse(
    x: number,
    y: number,
    nowMs: number
  ): Promise<void> {
    const minInterval = 1000 / GEOGRAPHY_COARSE_MAX_HZ;
    const moved =
      this.lastCoarsePos === null ||
      Math.hypot(x - this.lastCoarsePos.x, y - this.lastCoarsePos.y) >= 0.75;
    if (!moved && nowMs - this.lastCoarseMs < minInterval) {
      return;
    }
    if (nowMs - this.lastCoarseMs < minInterval && !moved) {
      return;
    }
    this.lastCoarseMs = nowMs;
    this.lastCoarsePos = { x, y };
    const neighbors = await postGeographyCoarse({
      apiBase: this.options.apiBase,
      sid: this.options.sid,
      body: {
        humanId: this.options.humanId,
        x,
        y,
      },
    });
    if (neighbors !== null) {
      this.applyNeighborPayload(neighbors);
    }
  }

  private politeIsSelf(peerId: string): boolean {
    return this.options.humanId < peerId;
  }

  private async ensurePeer(peerId: string): Promise<void> {
    if (this.disposed || this.peers.has(peerId)) {
      return;
    }
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const slot: PeerSlot = {
      humanId: peerId,
      pc,
      channel: null,
      makingOffer: false,
    };
    this.peers.set(peerId, slot);

    pc.onicecandidate = (ev) => {
      if (ev.candidate === null) {
        return;
      }
      void this.sendSignal({
        fromHumanId: this.options.humanId,
        toHumanId: peerId,
        kind: "ice",
        payload: ev.candidate.toJSON(),
      });
    };

    pc.ondatachannel = (ev) => {
      this.bindChannel(slot, ev.channel);
    };

    if (this.politeIsSelf(peerId)) {
      const channel = pc.createDataChannel("geography-yjs", { ordered: true });
      this.bindChannel(slot, channel);
      try {
        slot.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.sendSignal({
          fromHumanId: this.options.humanId,
          toHumanId: peerId,
          kind: "offer",
          payload: pc.localDescription,
        });
      } catch {
        this.options.callbacks.onStatus(
          "error",
          `WebRTC offer failed for ${peerId.slice(0, 8)}`
        );
      } finally {
        slot.makingOffer = false;
      }
    }
  }

  private bindChannel(slot: PeerSlot, channel: RTCDataChannel): void {
    slot.channel = channel;
    channel.binaryType = "arraybuffer";
    channel.onopen = () => {
      this.sendSyncStep1(slot);
    };
    channel.onmessage = (ev) => {
      const buf =
        ev.data instanceof ArrayBuffer
          ? new Uint8Array(ev.data)
          : ev.data instanceof Uint8Array
            ? ev.data
            : null;
      if (buf === null) {
        return;
      }
      this.handleYjsMessage(slot, buf);
    };
    channel.onerror = () => {
      this.options.callbacks.onStatus(
        "error",
        `WebRTC data channel error (${slot.humanId.slice(0, 8)})`
      );
    };
  }

  private sendSyncStep1(slot: PeerSlot): void {
    if (slot.channel === null || slot.channel.readyState !== "open") {
      return;
    }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    slot.channel.send(encoding.toUint8Array(encoder));
  }

  private handleYjsMessage(slot: PeerSlot, buf: Uint8Array): void {
    const decoder = decoding.createDecoder(buf);
    const messageType = decoding.readVarUint(decoder);
    if (messageType !== messageSync) {
      return;
    }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    const syncMessageType = syncProtocol.readSyncMessage(
      decoder,
      encoder,
      this.doc,
      "remote"
    );
    if (
      syncMessageType !== syncProtocol.messageYjsSyncStep1 &&
      encoding.length(encoder) > 1 &&
      slot.channel !== null &&
      slot.channel.readyState === "open"
    ) {
      slot.channel.send(encoding.toUint8Array(encoder));
    } else if (
      syncMessageType === syncProtocol.messageYjsSyncStep1 &&
      encoding.length(encoder) > 1 &&
      slot.channel !== null &&
      slot.channel.readyState === "open"
    ) {
      slot.channel.send(encoding.toUint8Array(encoder));
    }
    this.emitRemotePoses();
  }

  private broadcastYjsUpdate(update: Uint8Array): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const bytes = encoding.toUint8Array(encoder);
    for (const peer of this.peers.values()) {
      if (peer.channel !== null && peer.channel.readyState === "open") {
        peer.channel.send(bytes);
      }
    }
  }

  private async sendSignal(body: GeographySignalBody): Promise<void> {
    await postGeographySignal({
      apiBase: this.options.apiBase,
      sid: this.options.sid,
      body,
    });
  }

  private async handleSignal(signal: GeographySignalBody): Promise<void> {
    let slot = this.peers.get(signal.fromHumanId);
    if (slot === undefined) {
      await this.ensurePeer(signal.fromHumanId);
      slot = this.peers.get(signal.fromHumanId);
    }
    if (slot === undefined) {
      return;
    }
    const { pc } = slot;
    try {
      if (signal.kind === "offer") {
        const desc = signal.payload as RTCSessionDescriptionInit;
        const offerCollision =
          slot.makingOffer || pc.signalingState !== "stable";
        const ignoreOffer = !this.politeIsSelf(signal.fromHumanId) && offerCollision;
        if (ignoreOffer) {
          return;
        }
        await pc.setRemoteDescription(desc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.sendSignal({
          fromHumanId: this.options.humanId,
          toHumanId: signal.fromHumanId,
          kind: "answer",
          payload: pc.localDescription,
        });
      } else if (signal.kind === "answer") {
        await pc.setRemoteDescription(
          signal.payload as RTCSessionDescriptionInit
        );
      } else if (signal.kind === "ice") {
        await pc.addIceCandidate(signal.payload as RTCIceCandidateInit);
      }
    } catch {
      this.options.callbacks.onStatus(
        "error",
        `WebRTC signal failed (${signal.kind})`
      );
    }
  }

  private closePeer(peerId: string): void {
    const slot = this.peers.get(peerId);
    if (slot === undefined) {
      return;
    }
    try {
      slot.channel?.close();
    } catch {
      /* ignore */
    }
    try {
      slot.pc.close();
    } catch {
      /* ignore */
    }
    this.peers.delete(peerId);
    removePoseFromGeographyMap(this.doc, peerId);
    this.emitRemotePoses();
  }
}
