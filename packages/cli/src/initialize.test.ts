import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  cmdInitialize,
  parseInitializeArgs,
  patchEnvContent,
  resolveServerUrlForEnvironment,
} from "./initialize";

describe("parseInitializeArgs", () => {
  it("parses bootstrap and agent count flags", () => {
    expect(
      parseInitializeArgs([
        "--dir",
        "./demo",
        "--name",
        "demo-agent",
        "--yes",
        "--environment",
        "test",
        "--server-type",
        "express",
        "--bootstrap-nodes",
        "--agent-count",
        "2",
      ])
    ).toEqual({
      dir: "./demo",
      name: "demo-agent",
      template: "langchain",
      yes: true,
      force: false,
      environment: "test",
      serverType: "express",
      bootstrapNodes: true,
      agentCount: 2,
    });
  });

  it("rejects invalid agent count", () => {
    expect(parseInitializeArgs(["--agent-count", "3"])).toBeNull();
  });

  it("rejects invalid server type", () => {
    expect(parseInitializeArgs(["--server-type", "fastify"])).toBeNull();
  });
});

describe("patchEnvContent", () => {
  it("updates env ids without losing other keys", () => {
    const content = [
      "AGENT_PLAY_WEB_UI_URL=http://127.0.0.1:3000",
      "AGENT_PLAY_MAIN_NODE_ID=",
      "AGENT_PLAY_AGENT_NODE_ID_1=",
      "AGENT_PLAY_AGENT_NODE_ID_2=",
      "OPENAI_API_KEY=",
    ].join("\n");
    const next = patchEnvContent({
      envContent: content,
      serverUrl: "https://test-agent-play.com",
      mainNodeId: "main-1",
      agentNodeIds: ["agent-1", "agent-2"],
    });
    expect(next).toContain("AGENT_PLAY_WEB_UI_URL=https://test-agent-play.com");
    expect(next).toContain("AGENT_PLAY_MAIN_NODE_ID=main-1");
    expect(next).toContain("AGENT_PLAY_AGENT_NODE_ID_1=agent-1");
    expect(next).toContain("AGENT_PLAY_AGENT_NODE_ID_2=agent-2");
    expect(next).toContain("OPENAI_API_KEY=");
  });
});

describe("resolveServerUrlForEnvironment", () => {
  it("maps environment labels to server urls", () => {
    expect(resolveServerUrlForEnvironment("development")).toBe("http://127.0.0.1:3000");
    expect(resolveServerUrlForEnvironment("test")).toBe("https://test-agent-play.com");
    expect(resolveServerUrlForEnvironment("production")).toBe("https://agent-play.com");
  });
});

describe("cmdInitialize", () => {
  it("writes scaffold and hydrates .env when bootstrap is enabled", async () => {
    const targetDir = await mkdtemp(join(tmpdir(), "agent-play-init-"));
    const runtimeApi = {
      bootstrapNodeIds: vi.fn(async () => ({
        mainNodeId: "main-node-id",
        agentNodeIds: ["agent-one", "agent-two"],
      })),
    };
    await cmdInitialize({
      argv: ["--dir", targetDir, "--name", "starter", "--bootstrap-nodes", "--agent-count", "2"],
      promptApi: {
        askEnvironment: async () => "test",
        askServerType: async () => "express",
        askBootstrapNodes: async () => true,
        askAgentCount: async () => 2,
      },
      runtimeApi,
    });
    const envContent = await readFile(join(targetDir, ".env"), "utf8");
    expect(envContent).toContain("AGENT_PLAY_WEB_UI_URL=https://test-agent-play.com");
    expect(envContent).toContain("AGENT_PLAY_MAIN_NODE_ID=main-node-id");
    expect(envContent).toContain("AGENT_PLAY_AGENT_NODE_ID_1=agent-one");
    expect(envContent).toContain("AGENT_PLAY_AGENT_NODE_ID_2=agent-two");
    const registerContent = await readFile(
      join(targetDir, "src/register/register-builtins.ts"),
      "utf8"
    );
    expect(registerContent).toContain("langchainRegistration");
    expect(registerContent).toContain("world.initAudio");
    expect(registerContent).toContain("executeToolCapability");
    expect(registerContent).toContain("enableP2a: \"on\"");
    const definitionsContent = await readFile(
      join(targetDir, "src/builtins/definitions.ts"),
      "utf8"
    );
    expect(definitionsContent).toContain("createAgent");
    expect(definitionsContent).toContain("ChatOpenAI");
    expect(definitionsContent).toContain("Calculator Agent");
    expect(definitionsContent).toContain("Police Report Agent");
    expect(definitionsContent).toContain("assist_calculate_coefficient");
    expect(definitionsContent).toContain("assist_collect_scene_details");
    expect(definitionsContent).toContain("tools: [...calculatorTools]");
    expect(definitionsContent).toContain("tools: [...policeReportTools]");
    const registryContent = await readFile(
      join(targetDir, "src/tool-handlers/tool-capability-registry.ts"),
      "utf8"
    );
    expect(registryContent).toContain("assist_calculate_coefficient");
    expect(registryContent).toContain("assist_collect_scene_details");
    const executeContent = await readFile(
      join(targetDir, "src/tool-handlers/execute-tool-capability.ts"),
      "utf8"
    );
    expect(executeContent).toContain("unknown tool capability");
    const adapterContent = await readFile(
      join(targetDir, "src/register-agents.ts"),
      "utf8"
    );
    expect(adapterContent).not.toContain("__AGENT_REGISTRATIONS__");
    expect(runtimeApi.bootstrapNodeIds).toHaveBeenCalledTimes(1);
    expect(runtimeApi.bootstrapNodeIds).toHaveBeenCalledWith({
      agentCount: 2,
      serverUrl: "https://test-agent-play.com",
    });
  });

  it("generates bare server entry by default", async () => {
    const targetDir = await mkdtemp(join(tmpdir(), "agent-play-init-bare-"));
    await cmdInitialize({
      argv: ["--dir", targetDir, "--name", "starter", "--yes"],
      promptApi: {
        askEnvironment: async () => "development",
        askServerType: async () => "bare",
        askBootstrapNodes: async () => false,
        askAgentCount: async () => 1,
      },
      runtimeApi: {
        bootstrapNodeIds: vi.fn(async () => ({
          mainNodeId: "unused",
          agentNodeIds: ["unused"],
        })),
      },
    });
    const indexContent = await readFile(join(targetDir, "src/index.ts"), "utf8");
    expect(indexContent).toContain('from "./bare-server.js"');
  });

  it("generates express server entry when requested", async () => {
    const targetDir = await mkdtemp(join(tmpdir(), "agent-play-init-express-"));
    await cmdInitialize({
      argv: ["--dir", targetDir, "--name", "starter", "--yes", "--server-type", "express"],
      promptApi: {
        askEnvironment: async () => "development",
        askServerType: async () => "bare",
        askBootstrapNodes: async () => false,
        askAgentCount: async () => 1,
      },
      runtimeApi: {
        bootstrapNodeIds: vi.fn(async () => ({
          mainNodeId: "unused",
          agentNodeIds: ["unused"],
        })),
      },
    });
    const indexContent = await readFile(join(targetDir, "src/index.ts"), "utf8");
    expect(indexContent).toContain('from "./express-server.js"');
  });
});
