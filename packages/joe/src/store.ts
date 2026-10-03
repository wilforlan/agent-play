import {
  JoeThreadSchema,
  joeThreadKey,
  type JoeMessage,
  type JoeThread,
} from "./schemas.js";

export type JoeChatStore = {
  getThread(input: {
    facultyId: string;
    pathId: string;
    lessonId: string;
  }): Promise<JoeThread>;
  appendMessage(input: {
    facultyId: string;
    pathId: string;
    lessonId: string;
    message: JoeMessage;
  }): Promise<JoeThread>;
};

export const createInMemoryJoeChatStore = (): JoeChatStore => {
  const threads = new Map<string, JoeThread>();

  const empty = (input: {
    facultyId: string;
    pathId: string;
    lessonId: string;
  }): JoeThread =>
    JoeThreadSchema.parse({
      facultyId: input.facultyId,
      pathId: input.pathId,
      lessonId: input.lessonId,
      messages: [],
    });

  return {
    getThread: async (input) => {
      const key = joeThreadKey(input);
      return threads.get(key) ?? empty(input);
    },
    appendMessage: async (input) => {
      const key = joeThreadKey(input);
      const current = threads.get(key) ?? empty(input);
      const next = JoeThreadSchema.parse({
        ...current,
        messages: [...current.messages, input.message],
      });
      threads.set(key, next);
      return next;
    },
  };
};
