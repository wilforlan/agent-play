export type IntercomCommandKind = "assist" | "chat";

export type IntercomCommandPayload = {
  requestId: string;
  mainNodeId: string;
  fromPlayerId: string;
  toPlayerId: string;
  kind: IntercomCommandKind;
  toolName?: string | undefined;
  args?: Record<string, unknown> | undefined;
  text?: string | undefined;
};

export type WorldIntercomStatus =
  | "started"
  | "stream"
  | "completed"
  | "failed"
  | "forwarded";

export type WorldIntercomEventPayload = {
  requestId: string;
  mainNodeId: string;
  toPlayerId: string;
  fromPlayerId: string;
  kind: IntercomCommandKind;
  status: WorldIntercomStatus;
  toolName?: string | undefined;
  message?: string | undefined;
  result?: Record<string, unknown> | undefined;
  error?: string | null | undefined;
  ts: string;
  channelKey?: string | undefined;
  command?: IntercomCommandPayload | undefined;
};

export type IntercomResponsePayload = {
  requestId: string;
  mainNodeId: string;
  toPlayerId: string;
  fromPlayerId: string;
  kind: IntercomCommandKind;
  status: "stream" | "completed" | "failed";
  toolName?: string | undefined;
  message?: string | undefined;
  result?: Record<string, unknown> | undefined;
  error?: string | null | undefined;
  ts: string;
};

export type CreateHumanNodePayload = {
  consent: boolean;
  passw: string;
};
