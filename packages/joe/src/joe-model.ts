export type JoeModelChatMessage = {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
};

export type JoeModel = {
  complete(input: {
    system: string;
    messages: readonly JoeModelChatMessage[];
  }): Promise<string>;
};
