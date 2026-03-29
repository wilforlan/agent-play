#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  InMemoryAgentRepository,
  createRedisAgentRepository,
  type AgentRepository,
} from "@agent-play/sdk";

async function openRepository(): Promise<{
  repo: AgentRepository;
  close: () => Promise<void>;
}> {
  const redisUrl = process.env.REDIS_URL;
  if (typeof redisUrl === "string" && redisUrl.length > 0) {
    const repo = createRedisAgentRepository({
      redisUrl,
      hostId: process.env.AGENT_PLAY_HOST_ID ?? "default",
    });
    return {
      repo,
      close: () => repo.close(),
    };
  }
  const repo = new InMemoryAgentRepository();
  return {
    repo,
    close: async () => undefined,
  };
}

async function cmdCreate(): Promise<void> {
  const rl = createInterface({ input, output });
  const name = (await rl.question("Agent name: ")).trim() || "agent";
  const toolsRaw = (
    await rl.question(
      "Tool names (comma-separated; must include chat_tool): "
    )
  ).trim();
  const toolNames =
    toolsRaw.length > 0
      ? toolsRaw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : ["chat_tool", "assist_demo"];
  const withChat = toolNames.includes("chat_tool")
    ? toolNames
    : ["chat_tool", ...toolNames];
  rl.close();
  const { repo, close } = await openRepository();
  try {
    const { agentId, plainApiKey } = await repo.createAgent({
      name,
      toolNames: withChat,
    });
    console.log("");
    console.log(`Created agent id: ${agentId}`);
    console.log("API key (store securely; shown once):");
    console.log(plainApiKey);
    console.log("");
  } finally {
    await close();
  }
}

async function cmdDelete(): Promise<void> {
  const { repo, close } = await openRepository();
  try {
    const list = await repo.listAgents();
    if (list.length === 0) {
      console.log("No agents.");
      return;
    }
    list.forEach((a, i) => {
      console.log(`${i + 1}. ${a.agentId} (${a.name})`);
    });
    const rl = createInterface({ input, output });
    const pick = (await rl.question("Agent id to delete (empty = cancel): "))
      .trim();
    rl.close();
    if (pick.length === 0) {
      console.log("Cancelled.");
      return;
    }
    const ok = await repo.deleteAgent(pick);
    console.log(ok ? "Deleted." : "Not found.");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === "create") {
    await cmdCreate();
    return;
  }
  if (cmd === "delete" || cmd === "remove") {
    await cmdDelete();
    return;
  }
  console.error("Usage: agent-play create | delete");
  process.exitCode = 1;
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
