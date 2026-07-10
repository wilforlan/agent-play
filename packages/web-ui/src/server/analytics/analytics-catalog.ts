import {
  ANALYTICS_EVENT_NAMES,
  type AnalyticsEvent,
  type PurchaseRecord,
} from "@agent-play/sdk";

export const purchaseRecordToAnalyticsEvent = (input: {
  hostId: string;
  record: PurchaseRecord;
  messageId?: string;
  backfilled?: boolean;
}): AnalyticsEvent => {
  const { record } = input;
  const messageId = input.messageId ?? `purchase:${record.id}`;
  const base = {
    messageId,
    distinctId: record.playerId,
    timestamp: record.at,
    context: {
      hostId: input.hostId,
      library: "agent-play-server" as const,
    },
  };

  if (record.amenityKind === "wallet_bundle") {
    return {
      ...base,
      event: ANALYTICS_EVENT_NAMES.walletBundleRedeemed,
      properties: {
        bundleId: record.itemRef.id,
        powerUpsSpent: record.powerUpsSpent ?? 0,
        creditUsd: record.priceUsd ?? 0,
        spaceId: record.spaceId,
        backfilled: input.backfilled ?? false,
      },
    };
  }

  if (
    record.amenityKind === "apu_credit" ||
    record.amenityKind === "apu_debit"
  ) {
    return {
      ...base,
      event: ANALYTICS_EVENT_NAMES.gameRoundCompleted,
      properties: {
        gameId: record.itemRef.kind === "game" ? record.itemRef.id : record.itemRef.id,
        netPu: record.powerUpsDelta ?? 0,
        creditSource: record.creditSource ?? null,
        debitSource: record.debitSource ?? null,
        token: record.token ?? null,
        backfilled: input.backfilled ?? false,
      },
    };
  }

  if (record.amenityKind === "talk_time") {
    return {
      ...base,
      event: ANALYTICS_EVENT_NAMES.talkSessionBilled,
      properties: {
        agentId: record.counterpartyNodeId ?? record.itemRef.id,
        chargedUsd: record.priceUsd ?? 0,
        apuEarned: record.powerUpsEarned ?? 0,
        backfilled: input.backfilled ?? false,
      },
    };
  }

  return {
    ...base,
    event: ANALYTICS_EVENT_NAMES.purchaseCompleted,
    properties: {
      spaceId: record.spaceId,
      amenityKind: record.amenityKind,
      itemId: record.itemRef.id,
      itemKind: record.itemRef.kind,
      priceUsd: record.priceUsd ?? 0,
      powerUpsEarned: record.powerUpsEarned ?? 0,
      debitSource: record.debitSource ?? null,
      creditSource: record.creditSource ?? null,
      backfilled: input.backfilled ?? false,
    },
  };
};

export const sessionEventTypeToAnalyticsEvent = (input: {
  hostId: string;
  type: string;
  at: string;
  summary: string;
  messageId: string;
  backfilled?: boolean;
}): AnalyticsEvent | null => {
  const backfilled = input.backfilled ?? false;
  const distinctId = "system";
  const context = {
    hostId: input.hostId,
    library: "agent-play-server" as const,
  };

  if (input.type === "world:journey") {
    return {
      messageId: input.messageId,
      event: ANALYTICS_EVENT_NAMES.worldJourneyRecorded,
      distinctId,
      timestamp: input.at,
      properties: { summary: input.summary, backfilled },
      context,
    };
  }
  if (input.type === "world:interaction") {
    return {
      messageId: input.messageId,
      event: ANALYTICS_EVENT_NAMES.worldInteractionRecorded,
      distinctId,
      timestamp: input.at,
      properties: { summary: input.summary, backfilled },
      context,
    };
  }
  if (input.type === "world:player_added") {
    return {
      messageId: input.messageId,
      event: ANALYTICS_EVENT_NAMES.playerAdded,
      distinctId,
      timestamp: input.at,
      properties: { summary: input.summary, backfilled },
      context,
    };
  }
  if (input.type === "world:agent_signal") {
    return {
      messageId: input.messageId,
      event: ANALYTICS_EVENT_NAMES.chainRevisionPublished,
      distinctId,
      timestamp: input.at,
      properties: { summary: input.summary, backfilled },
      context,
    };
  }
  return null;
};
