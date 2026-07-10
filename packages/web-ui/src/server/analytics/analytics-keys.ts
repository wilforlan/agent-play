export const analyticsKeyPrefix = (hostId: string): string =>
  `agent-play:${hostId}:analytics`;

export const analyticsEventsStreamKey = (hostId: string): string =>
  `${analyticsKeyPrefix(hostId)}:events`;

export const analyticsEventByNameKey = (hostId: string, eventName: string): string =>
  `${analyticsKeyPrefix(hostId)}:event:${eventName}`;

export const analyticsByUserKey = (hostId: string, distinctId: string): string =>
  `${analyticsKeyPrefix(hostId)}:by-user:${distinctId}`;

export const analyticsEventBodyKey = (hostId: string, messageId: string): string =>
  `${analyticsKeyPrefix(hostId)}:event-body:${messageId}`;

export const analyticsTraitsKey = (hostId: string, distinctId: string): string =>
  `${analyticsKeyPrefix(hostId)}:traits:${distinctId}`;

export const analyticsEventCountKey = (hostId: string, eventName: string): string =>
  `${analyticsKeyPrefix(hostId)}:agg:count:${eventName}`;

export const analyticsPropertyAggKey = (
  hostId: string,
  eventName: string,
  property: string
): string => `${analyticsKeyPrefix(hostId)}:agg:prop:${eventName}:${property}`;

export const analyticsMigrationStateKey = (hostId: string): string =>
  `${analyticsKeyPrefix(hostId)}:migration:state`;

export const ANALYTICS_STREAM_MAXLEN = 100_000;

export const ANALYTICS_EVENT_BODY_TTL_SECONDS = 60 * 60 * 24 * 90;
