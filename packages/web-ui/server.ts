import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";
import { attachAgentPlayWs } from "./src/server/ws-handler.js";
import { startStartupWatchdog } from "./src/server/startup-watchdog.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const cancelStartupWatchdog = startStartupWatchdog({
  timeoutMs: 60_000,
  log: (message) => {
    console.error(message);
  },
});

try {
  await app.prepare();
} catch (error) {
  console.error("[agent-play] debug: Next.js prepare failed", error);
  throw error;
} finally {
  cancelStartupWatchdog();
}

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url ?? "", true);
  void handle(req, res, parsedUrl);
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const { pathname } = parse(request.url ?? "", true);
  if (pathname === "/ws/agent-play") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      void attachAgentPlayWs(ws);
    });
  }
});

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
