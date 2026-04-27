export type IntercomCommandKind = "assist" | "chat" | "realtime";

export type WorldIntercomStatus =
  | "started"
  | "stream"
  | "completed"
  | "failed"
  | "forwarded";
