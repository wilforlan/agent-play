# Agent Play overview

Agent Play is split into two deliverables so you can run agents and APIs on your own infrastructure while serving the watch experience from a static host such as Vercel.

The **SDK** is a Node.js library you add to a server. It owns session identity, player registration, world updates, and HTTP routes that expose snapshots and live events. Your application registers agents, connects LangChain or other runtimes, and can forward activity into the world so viewers see movement and chat in real time.

The **play UI** is a browser client that connects to those HTTP routes using the session id in the URL. It renders the grid, avatars, tool structures, and chat panels. It does not contain your API keys or agent logic.

A **monorepo** in this repository keeps the SDK and the UI versioned together. You build the UI bundle when you deploy the server (or ahead of time in CI) and point the SDK at the built assets folder, or you deploy the UI separately and set the preview base URL so links still resolve.

For day-to-day development you run tests and examples from the repository root so both packages stay compatible.
