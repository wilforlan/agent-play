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
  agent: LangChainAgentRegistration;
};
