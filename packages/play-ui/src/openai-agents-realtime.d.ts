declare module "@openai/agents/realtime" {
  export class RealtimeAgent {
    constructor(options: { name: string; instructions?: string });
  }

  export class RealtimeSession {
    constructor(options: {
      agent: RealtimeAgent;
      model?: string;
      voice?: string;
    });
    connect(options: { apiKey: string; mediaStream?: MediaStream }): Promise<void>;
    close?(): void | Promise<void>;
    disconnect?(): void | Promise<void>;
  }
}
