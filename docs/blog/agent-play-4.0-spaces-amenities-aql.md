# Agent Play 4.0: Introducing Spaces, Amenities and AQL

> Agents are no longer guests at a chat window. They live in *places*. Places have *things to do*. And the whole world — its destinations, its inventory, its economy — can now be authored in a single, well-typed language.

## Excerpt

For most of the AI-agent boom, the runtime has been a text box. You type, it answers, you wonder where it lives the rest of the time. With **Agent Play 4.0**, we are answering that question for ourselves: agents and humans now share a multi-stage world made of **Spaces**, populated by **Amenities** you can walk into, and authored end-to-end with **AQL** — a small, declarative language for everything from "create a space" to "stock the bookstore". This is not a UI polish release. It is a category shift.

---

## Why we call it 4.0

We have been on the **3.1** line for a while, shipping incremental improvements — better proximity, cleaner wire protocols, sharper intercom semantics. Honest, useful, undramatic work. **4.0** is dramatic on purpose.

Three things landed together that, by themselves, would have been point releases. Together, they change what Agent Play *is*:

1. **Spaces** stopped being decorations. They are now first-class destinations in the world.
2. **Amenities** turned spaces into places — there is somewhere to *go* inside a space, and *something to do* once you arrive.
3. **AQL** matured into a real authoring surface. The world is not configured from a JSON file or a wizard; it is *programmed*.

Each of those would be a reasonable headline. Shipping them in the same release means the runtime now has destinations, activities, and a language — the three pieces of a world rather than a demo.

We bumped the major version because the **conceptual surface** changed, not because we broke the wire format. (We didn't.)

---

## Spaces: places, not pins

In every previous version of Agent Play, a "space" was, frankly, a hand-wave. It existed on the world map. It had a name. You could walk near it. That was the end of the story.

In 4.0, we made a deliberate split that we should have made a year ago:

### Structures vs. spaces

A **structure** is the *thing on the canvas* — the building, the pin, the sprite you can stand next to. A **space** is the *catalog entity* — the record that owns amenities, leases, content, and policy. One space can have multiple structures pointing at it; one structure always anchors exactly one space. Anchoring is computed at runtime from zone membership, so theme rebuilds and zone migrations don't break alignment.

This is the kind of split that sounds boring until you start wiring features through it. After the split, every question we used to dread — "what does this building actually own?", "where do amenities live?", "what does it mean to 'be in' a space?" — has a one-line answer.

### Every space has a yard

When you walk up to a structure and press **A**, the camera doesn't slide. The canvas eases out — alpha to zero, scale to 0.96, over about 280 milliseconds — and a new stage eases in. You are now inside the space.

The first thing you see is the **space yard**: a small, fenced compound with up to three large pads, one per amenity. Each pad shows the amenity sprite and a clear sign. There is a single exit door anchored at the yard's local origin. Walk into the door (or press **Esc**) and the camera eases back out to the overworld where you came from.

The yard is intentionally not a passage. It is a *foyer*. The space-as-destination metaphor only works if entering it feels like crossing a threshold, and crossing a threshold has to feel like *something*. So we made the world go quiet, the music change, and the new floor have its own light. (Metaphorically. Pixi is not opinionated about music.)

---

## Amenities: the things you do inside a space

Each amenity is its own stage, with its own art, its own bounds, and its own interaction language. Today we ship three.

### The shop — a bookstore that knows about coffee

The shop is built like a small independent bookstore: a back wall of items, a clear shelf, a tooltip-driven buying flow. It carries three kinds of items: **books**, **music**, and **coffee**. Each item has a name, a description, a price, and a sale state. When you walk up to an item, a small card appears with everything you need to decide. There is a Buy button. Sometimes there is a SOLD banner instead.

The shop is the simplest amenity, and that is the point. It is the place we use to test new ideas about sale flows, item lifecycles, and tooltip semantics before they ripen into the bigger amenities. The shop has more code per square pixel than any other stage. That is also the point.

### The supermarket — a grid you can walk

The supermarket is a 4×5 grid: four labelled rows (Fruits, Mens, Womens, Kids) and five columns. Each cell can hold one item, and each item is a small sprite that varies its silhouette by the row it lives in — a banana for fruits, a t-shirt for menswear, a teddy bear for kids. The grid is fixed; the contents are not. You can populate any subset of the 20 cells, and the empty cells render as faint placeholders so the lot still feels like a shop and not a half-built room.

The supermarket is where we tested the idea that **art should be a function of the data, not a duplicate of it**. We do not ship a sprite per item; we ship a small set of variant renderers, and a tiny function maps item names and rows to the right variant. Add a new fruit through AQL, and the supermarket already knows how to draw it.

### The car wash — nine slots and a paint chip

The car wash is a different kind of stage. It is a *lot*: nine parking slots arranged in three rows of three, each slot holding at most one car. Cars have a model, a year, a price, and — the small detail we love most — a **paint colour** as a single hex string. The sprite renderer reads that colour and uses it as the primary panel paint, so every car in the lot is visually distinct without needing a single hand-drawn asset.

The car wash is where we worked out how to make an amenity that is **bounded but premium**. You cannot infinitely stock a car lot the way you can a bookshelf. Nine is the number. If you want to add a tenth car, you have to sell one first.

### Sold is a state machine, not a flag

Buying an item is not "set a boolean". It is a small, atomic transaction at the server:

1. Read the wallet and the target item under a Redis `WATCH`.
2. Inside a `MULTI`, decrement the wallet, set `sale.status = "sold"`, record `soldToPlayerId` and `soldAt`, and append an audit row.
3. Fan the updated snapshot out to every connected client.

The "fan out" is the magic part. Two players can both be standing in the same supermarket. When one buys the last apple, the other one's screen repaints — the apple desaturates to a luminance-preserving grey, a red diagonal **SOLD** banner appears, the Buy button becomes a disabled chip that reads *Bought by <playerId>*. We didn't have to write the multiplayer code for any of that. The snapshot already does it.

### Every wallet starts at $70

The first time a player asks for their wallet, the server seeds it at exactly **$70** — inside the same `MULTI`, so two concurrent first-reads don't double up. We picked $70 because it lets you make a few wrong purchases before the world gets serious, and we wanted the *first* experience of any new player to be one of light, low-stakes possibility, not a tutorial about how to earn currency.

This is also where the bigger design point lives: an economy that bootstraps itself is an economy that *feels alive on the first frame*. No "press X to start", no zero balance, no tutorial popup. You arrive, you have money, you buy a book. Then we can have a conversation about everything else.

---

## AQL: the world is a language

The most consequential thing in 4.0 is not visible on the canvas. It is the language we now write the world *with*.

### Why we wrote a language

We could have shipped a CMS. We could have built a settings panel with tabs and forms and a publish button. We considered both. We decided neither one was honest about what the work actually is.

Authoring a world is not data entry. It is small, ordered programs that depend on context — "this command runs against *this* space, after I've connected, before the next thing". The natural shape for that is a *script*, not a form. So we wrote a small one.

**AQL** — the Agent Query Language — is a single-pass, statement-oriented language with the smallest grammar that could hold the world:

- `CONNECT`, `USE AGENT NODE`, `USE SPACE NODE` set the context.
- `CREATE SPACE`, `ADD SPACE AMENITY` shape the topology.
- `ADD SHOP ITEM`, `ADD SUPERMARKET ITEM`, `ADD CARWASH CAR` stock the world.
- `INSPECT SPACE`, `INSPECT AMENITY`, `INSPECT WALLET` read it back.
- `SET WALLET`, `CREATE LEASE` administer it.
- `LET`, `MACRO` and `CALL` give you reuse without dragging in a full programming language.

That is the entire surface. It is not a general-purpose language, and it shouldn't be. It is a language with strong opinions about *what worlds are made of*, which is what makes it useful.

### What it looks like, in one breath

```aql
USE SPACE NODE "node:b80024…" PASSPHRASE "<ten words>"

ADD SHOP ITEM TYPE "book" NAME "Atomic Habits"
  DESCRIPTION "Tiny changes, remarkable results" PRICE 18.50

ADD SUPERMARKET ITEM ROW 1 NAME "Apple"
  DESCRIPTION "Crisp Honeycrisp" PRICE 1.25

ADD CARWASH CAR SLOT 1 NAME "Cullinan" MODEL "Rolls-Royce"
  YEAR 2024 PRICE 450000 COLOR "#1c2540"
```

You can read it. That is the design goal.

What you cannot see is everything underneath: every statement is parsed, validated against the schema, type-checked for the active context, executed against a transactional RPC, and finally surfaces in the snapshot. A bad command does not produce a crash; it produces an inline diagnostic with a line and column, pointing at the exact token that was wrong. The error catalog is short and named: `AMENITY_NOT_ON_SPACE`, `ITEM_ALREADY_SOLD`, `INSUFFICIENT_FUNDS`. If you have ever debugged a JSON config by guessing which field the server rejected, you already understand why we did this.

### The playground is the IDE

AQL runs from a **playground** at `/playground` — a small editor with diagnostics, autocomplete, response inspection, and a history of every statement you've executed in the session. We wrote it because writing a language without a place to run it is a research project; writing a language with a place to run it is a tool. We wanted a tool.

The playground also doubles as the migration runner. We have already used it to stock our own demo spaces from a single script — three `USE SPACE NODE` blocks and a few dozen `ADD …` statements, executed top-to-bottom, idempotent enough for ops work, readable enough for design review. The whole script is a flat text file. That, more than anything else, is the proof that the language was the right call.

---

## Under the hood: the stage architecture

The most visible change is the world switch. The least visible change is what makes it possible.

### One Pixi app, three sibling stages

Every previous version of the play canvas had a single mounted scene that we rebuilt in-place when the world changed. That worked for a single map. It does not work for three.

In 4.0, the canvas is owned by a tiny **`stage-controller`** that keeps a stack of `StageHandle`s and orchestrates `enter` / `back` / `destroy`. Three stages live in the runtime — `overworld`, `spaceYard`, and `amenity` — and only one is mounted at a time. The controller does not know what Pixi is; it operates on a minimal contract (`alpha`, `scale`, `addChild`, `removeChild`) so it can be tested with stubs and reused for any rendering backend we point at it later.

The result is that adding a new top-level scene is now a small, contained change. You write a `StageHandle`, you give it to the controller, you do not touch the overworld code.

### Easing as a primitive, not a flourish

We tweened the stage transitions on purpose. The outgoing stage fades to alpha zero and scales down to 0.96; the incoming stage fades in from alpha zero and scales down from 1.04 to 1.0. The whole transition is ~280 ms, cubic-eased.

Numbers chosen because:

- 280 ms is the longest you can hold a player's attention without them feeling stuck.
- Scaling *toward* the centre rather than fading flat tells the player that the world is reorganising around a focal point, which is exactly what is happening.
- The slight overshoot on the incoming scale (1.04 → 1.0) is just enough to feel like the new stage is *arriving*, not appearing.

This is the kind of detail that, the day you ship it, nobody notices. Six months later, nobody can imagine the product without it. That is generally how you know you got it right.

### Proximity learned to speak about objects

Pre-4.0, the proximity resolver was player-versus-player. It answered "who is near me?" and that was the entire universe.

The new resolver is **object-centric**. It answers "who or what is near me?" — and the answer is a small, typed union: another player, a structure, an amenity pad, an amenity item, or an exit door. Each kind has its own keymap, scoped per stage. **A** enters a space; **P** enters an amenity or opens an item card; **Esc** exits one level up; walking into the exit door does the same thing as Esc.

The fact that one verb (`A`) means three different things depending on which stage you're standing in is not a confusion problem. It is the *correct* shape of an in-world UX. Action keys belong to *places*, not to characters. We finally built it that way.

---

## What this unlocks

A release is a list of features. A version jump is a list of consequences. The consequences here are interesting.

### Agents that can buy things

The economy is real. Wallets are server-authoritative. Purchases are atomic. The same `purchase` RPC that backs a human's Buy button can be invoked by an agent. We have not lit that fuse yet, but the wiring is done. The first thing an autonomous agent will be able to do, in this codebase, that no chat-window agent can do, is *spend money on an item that becomes unavailable to anyone else*.

That is the simplest possible test of "is your agent really doing things in the world". We are now ready for it.

### Places that evolve

A space is data. The snapshot fans out item changes to every client in real time. That means a space can be *curated over a session* — items can come in, sell out, get restocked, get retired — and every connected human and agent sees the same world.

This is not a small thing. The classic problem with "AI worlds" has been that they are either fully procedural (and feel random) or fully scripted (and feel dead). A snapshot-driven, AQL-authored world sits in the middle: the authors set the shape, the runtime keeps it coherent, and the agents — eventually — fill in the texture.

### Worlds you can script

The single biggest practical consequence of AQL is that **worlds are now version-controllable**. You can check in an `.aql` file, review changes in a pull request, run it in CI against a staging server, and ship a curated update to production by re-running the same script.

We are running our own demo spaces this way already. The seed for our three sample spaces — Bravo Towers, My Plaza, and SandMill Circle — is a single 165-line text file. It parses, validates, and executes. When we want a new car in Bravo Towers, we open the file in an editor, add a line, and rerun.

The world has joined the artifacts you can `git diff`. That is a small revolution.

---

## What's next

A short roadmap, with the same honesty we used for the version number.

- **Agent-side authorship.** Today AQL is run by humans in the playground. Next it gets a programmatic surface — an authenticated HTTP endpoint and an SDK helper — so trusted agents can author content within their own spaces.
- **More amenities.** A library, a music hall, a workshop. We picked shop / supermarket / car wash because each one demanded a different layout idiom — shelf, grid, lot. The next round will push on time, scarcity, and scheduling.
- **Multiplayer purchase semantics.** We have the atomic write; we have the snapshot fanout. The next pass is on the *social* layer — bid, hold, gift, refund — because once you can buy a thing, you start wanting to do verbs about it.
- **An AQL standard library.** Right now you write `ADD SUPERMARKET ITEM` lines by hand or behind `MACRO`. Soon we'll ship a small set of named seed packs you can import in one statement.
- **A typed protocol for "amenity content snapshots".** The current shape is good for the three amenities we have. The next set will pressure-test it.

---

## Coda

We started Agent Play because the world's smartest researchers were demoing the world's stupidest interface — agents talking through chat boxes, in worlds with no walls, with no things in them, with no consequences for what they said.

**4.0** is our reply: agents *and* humans, sharing a world that has **places** you can stand in, **things** you can buy and sell, and a **language** you can write the whole thing with. None of those three is novel by itself. Together, in one runtime, on one canvas — that is the thing we have not seen anywhere else, and that is the thing we wanted to build.

Walk up to a space. Press **A**. Walk to the bookstore pad. Press **P**. Buy something.

That sequence of four actions is the smallest demo of what 4.0 is for. Try it once and the previous version of the product will feel like it was missing the second half.

— *The Agent Play team*

---

### Try it now

- Update to the **4.0** monorepo line.
- Visit **`/playground`** in your deployment, connect with your main passphrase, and run any of the recipes in [`docs/aql/language-reference.md`](../aql/language-reference.md).
- The full release notes — every file that moved and why — live in [`docs/releases/`](../releases/).
