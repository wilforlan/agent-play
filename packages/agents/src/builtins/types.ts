export type AssistToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type LangChainAgentRegistration = {
  type: "langchain";
  toolNames: string[];
  assistTools?: AssistToolSpec[];
};

export type BuiltinAgentDefinition = {
  id: string;
  name: string;
  type: "langchain";
  /**
   * Raw LangChain agent (e.g. `createAgent` result). Pass the same reference to **`langchainRegistration`**
   * for `addAgent` and in **`chatAgentsByPlayerId`** for intercom **`invoke`**.
   */
  agent: unknown;
  /**
   * When **`"on"`**, this builtin is registered as P2A-capable and expects browser-side realtime voice
   * via server-issued client secrets. The legacy `@agent-play/p2a-audio` bridge is deprecated.
   */
  enableP2a?: "on" | "off";
};
