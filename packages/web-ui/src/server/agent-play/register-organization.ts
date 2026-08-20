import { createNodeCredentialMaterial } from "@agent-play/node-tools";
import type { AgentRepository } from "./agent-repository.js";

export type OrganizationWriteRedis = {
  hset(key: string, fields: Record<string, string>): Promise<unknown>;
  hgetall(key: string): Promise<Record<string, string>>;
  sadd(key: string, member: string): Promise<unknown>;
};

export type OrganizationListRedis = {
  hgetall(key: string): Promise<Record<string, string>>;
  smembers(key: string): Promise<string[]>;
};

export type OrganizationRedis = OrganizationWriteRedis & OrganizationListRedis;

export type RegisterOrganizationInput = {
  organizationName: string;
  email: string;
  website?: string;
  details?: string;
};

export type OrganizationRecord = {
  organizationName: string;
  email: string;
  website: string;
  details: string;
  nodeId: string;
  createdAt: string;
};

export type PublicOrganizationListing = {
  nodeId: string;
  organizationName: string;
  website: string;
  details: string;
  createdAt: string;
};

export type OrganizationCredentialsFile = {
  serverUrl: string;
  nodeId: string;
  passw: string;
};

export type OrganizationCliNextSteps = {
  cliDocHref: string;
  initializeDocHref: string;
  installCommand: string;
};

export const ORGANIZATION_CLI_NEXT_STEPS: OrganizationCliNextSteps = {
  cliDocHref: "/doc/cli",
  initializeDocHref: "/doc/initialize-agent-server-and-template",
  installCommand: "npx agent-play initialize",
};

export type RegisterOrganizationResult = {
  organization: OrganizationRecord;
  credentials: OrganizationCredentialsFile;
  nextSteps: OrganizationCliNextSteps;
};

export type ParseRegisterOrganizationBodyResult =
  | { ok: true; input: RegisterOrganizationInput }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const organizationKey = (hostId: string, nodeId: string): string =>
  `agent-play:${hostId}:organization:${nodeId}`;

export const organizationsIndexKey = (hostId: string): string =>
  `agent-play:${hostId}:organizations`;

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const parseRegisterOrganizationBody = (
  body: unknown,
): ParseRegisterOrganizationBodyResult => {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid body" };
  }
  const raw = body as {
    organizationName?: unknown;
    email?: unknown;
    website?: unknown;
    details?: unknown;
  };
  if (!nonEmpty(raw.organizationName)) {
    return { ok: false, error: "organizationName required" };
  }
  if (!nonEmpty(raw.email) || !EMAIL_PATTERN.test(raw.email.trim())) {
    return { ok: false, error: "email required" };
  }
  return {
    ok: true,
    input: {
      organizationName: raw.organizationName.trim(),
      email: raw.email.trim(),
      ...(nonEmpty(raw.website) ? { website: raw.website.trim() } : {}),
      ...(nonEmpty(raw.details) ? { details: raw.details.trim() } : {}),
    },
  };
};

export const registerOrganization = async (options: {
  repository: AgentRepository;
  redis: OrganizationWriteRedis;
  hostId: string;
  serverUrl: string;
  input: RegisterOrganizationInput;
  now?: () => string;
  createCredential?: (rootKey: string) => {
    phrase: string;
    passwHash: string;
    nodeId: string;
  };
}): Promise<RegisterOrganizationResult> => {
  const createCredential =
    options.createCredential ??
    ((rootKey: string) => createNodeCredentialMaterial({ rootKey }));
  const credential = createCredential(options.repository.getGenesisNodeId());
  const created = await options.repository.createNode({
    kind: "main",
    nodeId: credential.nodeId,
    passwHash: credential.passwHash,
  });
  const createdAt = (options.now ?? (() => new Date().toISOString()))();
  const organization: OrganizationRecord = {
    organizationName: options.input.organizationName,
    email: options.input.email,
    website: options.input.website ?? "",
    details: options.input.details ?? "",
    nodeId: created.nodeId,
    createdAt,
  };
  const key = organizationKey(options.hostId, created.nodeId);
  await options.redis.hset(key, {
    organizationName: organization.organizationName,
    email: organization.email,
    website: organization.website,
    details: organization.details,
    nodeId: organization.nodeId,
    createdAt: organization.createdAt,
  });
  await options.redis.sadd(
    organizationsIndexKey(options.hostId),
    created.nodeId,
  );
  return {
    organization,
    credentials: {
      serverUrl: options.serverUrl.replace(/\/$/, ""),
      nodeId: created.nodeId,
      passw: credential.phrase,
    },
    nextSteps: ORGANIZATION_CLI_NEXT_STEPS,
  };
};

export const parseOrganizationRecord = (
  fields: Record<string, string>,
): OrganizationRecord | null => {
  if (
    !nonEmpty(fields.organizationName) ||
    !nonEmpty(fields.email) ||
    !nonEmpty(fields.nodeId) ||
    !nonEmpty(fields.createdAt)
  ) {
    return null;
  }
  return {
    organizationName: fields.organizationName.trim(),
    email: fields.email.trim(),
    website: nonEmpty(fields.website) ? fields.website.trim() : "",
    details: nonEmpty(fields.details) ? fields.details.trim() : "",
    nodeId: fields.nodeId.trim(),
    createdAt: fields.createdAt.trim(),
  };
};

export const toPublicOrganizationListing = (
  organization: OrganizationRecord,
): PublicOrganizationListing => {
  return {
    nodeId: organization.nodeId,
    organizationName: organization.organizationName,
    website: organization.website,
    details: organization.details,
    createdAt: organization.createdAt,
  };
};

const compareCreatedAtDesc = (
  left: OrganizationRecord,
  right: OrganizationRecord,
): number => {
  if (left.createdAt === right.createdAt) {
    return 0;
  }
  return left.createdAt < right.createdAt ? 1 : -1;
};

export const listOrganizations = async (options: {
  redis: OrganizationListRedis;
  hostId: string;
}): Promise<PublicOrganizationListing[]> => {
  const ids = await options.redis.smembers(organizationsIndexKey(options.hostId));
  const records = await Promise.all(
    ids.map(async (nodeId) => {
      const fields = await options.redis.hgetall(
        organizationKey(options.hostId, nodeId),
      );
      return parseOrganizationRecord(fields);
    }),
  );

  return records
    .filter((record): record is OrganizationRecord => record !== null)
    .sort(compareCreatedAtDesc)
    .map(toPublicOrganizationListing);
};
