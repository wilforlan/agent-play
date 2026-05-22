import type Redis from "ioredis";
import type { WorldLayout } from "@agent-play/sdk";
import { STREET_NAME_POOL } from "@agent-play/sdk";

export type WorldLayoutRepositoryOptions = {
  redis: Redis;
  hostId: string;
};

function baseKey(hostId: string): string {
  return `agent-play:${hostId}:world`;
}

function keyLayoutRev(hostId: string): string {
  return `${baseKey(hostId)}:layout:rev`;
}

function keyLayoutBlob(hostId: string): string {
  return `${baseKey(hostId)}:layout`;
}

function keyStreetsAssigned(hostId: string): string {
  return `${baseKey(hostId)}:streets:assigned`;
}

function keyStreetsAvailable(hostId: string): string {
  return `${baseKey(hostId)}:streets:available`;
}

function availableStreetIdsForLayout(layout: WorldLayout): string[] {
  const assigned = new Set(layout.zones.map((z) => z.streetId));
  return STREET_NAME_POOL.filter((s) => !assigned.has(s.id)).map((s) => s.id);
}

export class WorldLayoutRepository {
  private readonly redis: Redis;
  private readonly hostId: string;

  constructor(options: WorldLayoutRepositoryOptions) {
    this.redis = options.redis;
    this.hostId = options.hostId;
  }

  async getLayout(): Promise<WorldLayout | null> {
    const raw = await this.redis.get(keyLayoutBlob(this.hostId));
    if (raw === null || raw.length === 0) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("rev" in parsed) ||
      !("zones" in parsed)
    ) {
      throw new Error("WorldLayoutRepository.getLayout: invalid JSON");
    }
    return parsed as WorldLayout;
  }

  async saveLayout(layout: WorldLayout): Promise<void> {
    const availableIds = availableStreetIdsForLayout(layout);
    const multi = this.redis.multi();
    multi.set(keyLayoutRev(this.hostId), String(layout.rev));
    multi.set(keyLayoutBlob(this.hostId), JSON.stringify(layout));
    multi.del(keyStreetsAssigned(this.hostId));
    for (const z of layout.zones) {
      multi.hset(keyStreetsAssigned(this.hostId), z.streetId, z.id);
    }
    multi.del(keyStreetsAvailable(this.hostId));
    if (availableIds.length > 0) {
      multi.rpush(keyStreetsAvailable(this.hostId), ...availableIds);
    }
    await multi.exec();
  }

  async bumpRev(): Promise<number> {
    const current = await this.getLayout();
    if (current === null) {
      throw new Error("WorldLayoutRepository.bumpRev: no layout");
    }
    const next: WorldLayout = { ...current, rev: current.rev + 1 };
    await this.saveLayout(next);
    return next.rev;
  }

  async takeNextStreet(): Promise<{ id: string; label: string }> {
    const id = await this.redis.lpop(keyStreetsAvailable(this.hostId));
    if (id === null || id.length === 0) {
      throw new Error("WorldLayoutRepository.takeNextStreet: pool exhausted");
    }
    const entry = STREET_NAME_POOL.find((s) => s.id === id);
    if (entry === undefined) {
      throw new Error(
        `WorldLayoutRepository.takeNextStreet: unknown street id ${id}`
      );
    }
    return { id: entry.id, label: entry.label };
  }

  async returnStreet(streetId: string): Promise<void> {
    const multi = this.redis.multi();
    multi.rpush(keyStreetsAvailable(this.hostId), streetId);
    await multi.exec();
  }
}

export function createWorldLayoutRepository(
  options: WorldLayoutRepositoryOptions
): WorldLayoutRepository {
  return new WorldLayoutRepository(options);
}
