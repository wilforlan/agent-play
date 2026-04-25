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
  /** When **`"on"`**, {@link registerBuiltinAgents} attaches `@agent-play/p2a-audio` for this builtin. */
  enableP2a?: "on" | "off";
};
