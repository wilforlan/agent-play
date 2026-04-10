export type IntercomChannelLifecycle = "opened" | "active" | "stale" | "closed";

const channelLifecycle = new Map<string, IntercomChannelLifecycle>();

export function openOrReuseIntercomChannel(
  channelKey: string
): "opened" | "reused" {
  const prev = channelLifecycle.get(channelKey);
  if (prev === undefined) {
    channelLifecycle.set(channelKey, "active");
    return "opened";
  }
  channelLifecycle.set(channelKey, "active");
  return "reused";
}

export function resetIntercomChannelStateForTests(): void {
  channelLifecycle.clear();
}
