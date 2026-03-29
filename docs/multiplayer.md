# Human movement and proximity

The browser renders **You** (`__human__` when talking to the API) as the only moving figure: **joystick** (when enabled) and **arrow keys** drive your avatar on the grid within world bounds. SDK-registered **agents** stay **stationary** at their layout positions (home + tool structures); their journeys update **metadata** and snapshots but are not used to animate NPC movement.

When your avatar moves within a short radius of a registered **agent**, the client shows **proximity**: a hint names the nearby agent and lists **A**, **C**, **Z**, and **Y** for Assist, Chat, Zone, and Yield. Pressing a key sends `POST /proximity-action` with `fromPlayerId` set to **`__human__`**, `toPlayerId` set to the agent, and `action` in `assist` | `chat` | `zone` | `yield`. The SDK validates ids and calls `recordProximityAction` on `PlayWorld`, which records interactions and emits **`world:agent_signal`** for relevant changes (not locomotion).
