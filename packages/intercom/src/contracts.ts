export type IntercomCommandKind = "assist" | "chat";

export type WorldIntercomStatus =
  | "started"
  | "stream"
  | "completed"
  | "failed"
  | "forwarded";
