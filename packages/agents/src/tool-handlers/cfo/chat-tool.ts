import { z } from "zod";

const chatInputSchema = z.object({
  text: z.string().trim().min(1),
});

export function executeChatTool(input: { text: string }): {
  message: string;
  mode: "chat";
} {
  const parsed = chatInputSchema.parse(input);
  return {
    mode: "chat",
    message: parsed.text,
  };
}
