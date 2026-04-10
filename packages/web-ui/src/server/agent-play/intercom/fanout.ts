import type { SessionStore } from "../session-store.js";
import { WORLD_INTERCOM_EVENT } from "./shared-intercom.js";
import type { WorldIntercomEventPayload } from "./shared-intercom.js";

export async function publishWorldIntercomEvent(options: {
  store: SessionStore;
  payload: WorldIntercomEventPayload;
}): Promise<void> {
  const rev = await options.store.getSnapshotRev();
  await options.store.publishWorldFanout(rev, WORLD_INTERCOM_EVENT, options.payload);
}
