/**
 * Example 06 — Financial advisor (long-running Express + preview + CLI human-in-the-loop)
 *
 * Demonstrates a multi-tool planning agent aligned with typical CFP-style practice areas:
 * client discovery, risk tolerance, cash flow, emergency fund, debt payoff strategies,
 * retirement heuristics, portfolio illustrations, insurance gap narrative, education savings,
 * goal feasibility, simplified tax-bracket illustration, estate checklist items,
 * and Social Security framing (all educational—not licensed advice).
 *
 * The agent can pause for **human approval** or **free-text input** via tools that read
 * from this same terminal (`request_human_approval`, `request_human_input`).
 *
 * Run: `npm run build:preview && npm run example:advisor`
 * Env: `OPENAI_API_KEY`, optional `PORT` (default 3333)
 */

import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { AIMessage, type BaseMessage, HumanMessage } from "@langchain/core/messages";
import express from "express";
import {
  attachLangChainInvoke,
  langchainRegistration,
} from "../src/index.js";
import { PlayWorld } from "../../web-ui/src/server/agent-play/play-world.js";
import { mountExpressPreview } from "../../web-ui/src/server/agent-play/preview/mount-express-preview.js";
import { createFinancialAdvisorTools } from "./lib/financial-advisor-tools.js";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

const PORT = Number(process.env.PORT ?? 3333);
const PREVIEW_BASE = "/agent-play";

const ADVISOR_SYSTEM = `You are an educational financial planning assistant in a terminal demo, modeled on how CFP®-style professionals structure conversations: understand the client, quantify tradeoffs, and use tools for illustrations—not final advice.

Rules:
- Call session_disclosure once when you begin substantive planning with a new topic.
- Never claim licenses you do not have. Encourage CPAs, estate attorneys, insurance specialists, and investment fiduciaries for implementation.
- When a numeric fact is missing, call request_human_input with one clear question instead of guessing.
- When proposing a material change of direction (e.g., aggressive debt strategy, large allocation shift, big trade-off), call request_human_approval first.
- Prefer tools for calculations and checklists; narrate results in plain language and stress-test assumptions (returns, inflation, job loss).
- If the user types exit/quit, acknowledge and summarize next steps briefly.`;

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? "gpt-4.1",
  temperature: 0.3,
});

const cli = createInterface({ input, output });
const tools = createFinancialAdvisorTools(cli);

const agent = createAgent({
  name: "financial-advisor-demo",
  model,
  tools,
  systemPrompt: ADVISOR_SYSTEM,
});

const app = express();
const world = new PlayWorld({
  previewBaseUrl: `http://127.0.0.1:${PORT}${PREVIEW_BASE}/watch`,
});

await world.start();

const player = await world.addPlayer({
  name: "financial-advisor",
  type: "langchain",
  agent: langchainRegistration(agent),
});
await attachLangChainInvoke(agent, world, player.id);

mountExpressPreview(app, world, { basePath: PREVIEW_BASE });

function lastAssistantText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m && AIMessage.isInstance(m)) {
      const c = m.content;
      return typeof c === "string" ? c : JSON.stringify(c);
    }
  }
  return "";
}

async function runRepl(): Promise<void> {
  let conversation: BaseMessage[] = [];
  console.log(
    "\nChat with your advisor (terminal). Commands: exit | quit — ends the session.\n"
  );
  while (true) {
    const line = (await cli.question("You: ")).trim();
    if (line === "exit" || line === "quit") {
      console.log("Goodbye.");
      break;
    }
    if (line.length === 0) continue;
    conversation.push(new HumanMessage(line));
    try {
      const result = await agent.invoke({ messages: conversation });
      if (
        result !== null &&
        typeof result === "object" &&
        "messages" in result &&
        Array.isArray((result as { messages: unknown }).messages)
      ) {
        conversation = (result as { messages: BaseMessage[] }).messages;
      }
      const reply = lastAssistantText(conversation);
      if (reply.length > 0) console.log(`\nAdvisor: ${reply}\n`);
    } catch (err) {
      console.error("Agent error:", err);
      conversation.pop();
    }
  }
}

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Preview (multiverse): ${player.previewUrl}`);
  console.log(
    `Snapshot JSON: http://127.0.0.1:${PORT}${PREVIEW_BASE}/snapshot.json?sid=${world.getSessionId()}`
  );
  void runRepl().finally(() => {
    server.close();
    cli.close();
    process.exit(0);
  });
});
