# Example: vision-style Agent Play post

Below is a reference output shape. **Do not reuse this text verbatim** in new posts—treat it as tone, structure, and metaphor density.

---

# The Floor Plan Era: Why the Next Generation of Agents Needs a World, Not a Window

> For a decade we taught machines to talk. The next decade asks them to *occupy*—to move, to wait, to act where others can see the consequence. Agent Play is our bet that agent infrastructure will look less like a chat transcript and more like a live floor plan: **owned spaces** with amenities, paths for journeys, and rooms where humans and agents share the same facts.

---

## The interface debt

Every major agent demo still ends the same way: a scrolling column of text and a blinking cursor. That interface was borrowed from messaging apps because it was expedient, not because it matches how teams actually debug, govern, or design autonomous software.

Engineers live in traces. Product managers live in flows. Designers live in states and transitions. None of those professions default to "read paragraph 847 again." Yet that is what we ask them to do when an agent calls five tools, retries twice, and silently succeeds.

The cost is not aesthetic. It is **trust**. When you cannot see where an agent went, you cannot explain what it did to a customer, a regulator, or your future self at 2 a.m.

## A different question

Agent Play starts from a spatial question: **what if agent work had geography?**

Not metaphorical geography in a prompt—actual coordinates on a canvas where:

- **Owned spaces** (with amenities and leases) are authored and acquired by individuals—not inferred from LangChain tool names
- **Journeys** draw the path from origin through steps and back
- **Callouts** carry the reasoning without burying it in a log file
- **Snapshots** keep every watcher—human or machine—aligned on the same world state

The SDK (`@agent-play/sdk`) runs on your infrastructure and records what your agents do. The watch UI (`@agent-play/play-ui`, hosted via `@agent-play/web-ui`) renders it in real time. Your API keys stay on your servers; the browser is a lens, not the brain.

That split matters for the same reason CI logs and production dashboards are separate: observation should not require co-locating secrets with pixels.

## Places, not pins

Recent releases pushed the model further. A **space** is not a label on a map—it is a destination you enter. Inside it, **amenities** are stages with their own rules: a shop with inventory, a grid supermarket, a car lot with finite slots.

Walk in, press a key, buy an item, watch it flip to **sold** on every connected screen. That is a small interaction with a large implication. An agent that can spend currency and change shared state is an agent whose actions are **externally verifiable**. Chat can simulate conviction; a snapshot cannot.

We author those worlds in **AQL**, a declarative language small enough to review in a pull request and serious enough to run in production. The demo spaces we seed are plain text files—not wizards, not opaque JSON. Worlds become artifacts you can diff, revert, and discuss in design review the same way you discuss code.

## Who this is for

**Engineers** integrating LangChain or multi-agent runtimes get a honest observability surface: journeys, owned spaces, SSE events, Redis fanout when you scale horizontally.

**Product managers** get a narrative they can screenshot: where the agent went, what it touched, what changed for everyone watching.

**Designers** get something rare in agent tooling—a **stateful stage** with thresholds, proximity, and exit paths. Action keys belong to places, not characters. That is a UX pattern worth stealing for any product where autonomy meets accountability.

## The future we are building toward

We do not claim the map is finished. Multi-agent social semantics, agent-authored content, payment amenities, and richer replay are direction—not dated promises. What ships today is a **credible slice**: live motion, shared economy semantics, and a language to grow the world without redeploying fairy dust.

The broader thesis is simpler: as agents take on real work, **the interface must carry consequence**. Text alone flattening time, space, and side effects will feel as dated as debugging distributed systems with `printf`.

Agent Play is our attempt to pay that interface debt early—while the category is still deciding what "production-ready agent" means.

Walk your agent's journey once on the canvas. The transcript will still be there when you need it. But you may find you need it less.

---

### Try it

- Run the monorepo dev server and open the watch UI
- Explore AQL at `/playground` — see `docs/aql/introduction.md`
- Read the architecture overview in `docs/architecture.md`
