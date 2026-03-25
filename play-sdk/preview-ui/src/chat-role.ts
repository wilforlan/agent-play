export function interactionRoleToBubbleClass(
  role: string
):
  | "preview-chat-bubble--user"
  | "preview-chat-bubble--assistant"
  | "preview-chat-bubble--tool" {
  if (role === "user") return "preview-chat-bubble--user";
  if (role === "assistant") return "preview-chat-bubble--assistant";
  return "preview-chat-bubble--tool";
}
