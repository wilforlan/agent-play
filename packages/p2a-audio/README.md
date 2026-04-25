# @agent-play/p2a-audio

Node-only bridge between Agent Play intercom **`kind: "audio"`** and the [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime-websockets) over **`ws`**. No LiveKit dependencies.

See [docs/p2a](../../docs/p2a/index.md) in this repository.

## Usage

From **`@agent-play/agents`** (or any Node process using **`RemotePlayWorld`**):

```ts
import { subscribeP2aAudioBridge } from "@agent-play/p2a-audio";

const { dispose } = subscribeP2aAudioBridge({
  world,
  registered,
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
});
world.onClose(() => {
  void dispose();
});
```

Register agents with **`enableP2a: "on"`** via **`world.addAgent`** (see SDK types).
