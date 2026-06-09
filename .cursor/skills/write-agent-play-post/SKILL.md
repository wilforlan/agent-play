---
name: write-agent-play-post
description: >-
  Writes marketing-style blog posts about Agent Play for a technical audience. 
  Produces title, excerpt, and body with vision-forward
  narrative, original metaphors, and honest product framing. Use when the user asks
  to write, draft, or publish an Agent Play post, story, announcement, or blog article.
---

# Write Agent Play Post

## Output contract

Deliver exactly three top-level pieces:

1. **Title** — one line, compelling, specific to Agent Play (not generic "AI future" clickbait)
2. **Excerpt** — 2–4 sentences for cards, social, or release notes; standalone hook
3. **Body** — full markdown article (typically 800–2,000 words unless the user specifies length)

Use this skeleton:

```markdown
# [Title]

> [Excerpt — can repeat or tighten the hook paragraph]

---

[Body sections with ## headings]

---

[Optional: Try it now / What's next / Coda — only when appropriate]
```

## Workflow

1. **Clarify intent** (if missing): announcement, vision essay, release story, or integration guide with marketing tone
2. **Read product truth** — scan [product-facts.md](product-facts.md) and, when relevant, `docs/blog/` or `README.md` for current capabilities
3. **Draft title + excerpt first** — they set the narrative spine; body must deliver on both
4. **Write body** — lead with stakes for the reader, not feature bullets
5. **Self-edit** with the quality checklist below before presenting

## Voice

Match the established Agent Play blog voice (`docs/blog/agent-play-4.0-spaces-amenities-aql.md`):

| Do | Don't |
|----|-------|
| Confident, literate, slightly literary | Corporate buzzword soup ("synergy", "paradigm shift" without substance) |
| Honest about what ships today vs vision | Overpromise dates or imply features that are only on the backlog |
| Concrete nouns: spaces, journeys, amenities, snapshot, AQL | Vague "platform" language with no picture |
| Short punchy paragraphs mixed with longer explanatory ones | Walls of identical-length paragraphs |
| Second person sparingly ("you can watch…") | Hype that sounds like every other AI startup |

**Audience**: technical leaders. They respect precision. Explain *why* a spatial model matters to observability, trust, and product design—not only to "cool demos."

## Narrative angle

Anchor every post in **one primary story**:

- **The observability gap** — logs and traces are necessary but not how humans reason about systems in motion
- **Agents need places, not only prompts** — chat windows hide state, context, and consequence
- **Shared worlds** — humans and agents seeing the same snapshot-driven reality
- **Authoring at scale** — worlds as version-controlled programs (AQL), not one-off configs

Tie Agent Play to the **future of AI agents** by arguing a design thesis, not by listing trends. The product is evidence for a claim about where agent UX must go.

## Metaphors

Use **2–4 original metaphors** per post. They should clarify Agent Play's model, not decorate it.

**Good directions** (compose fresh wording each time—do not copy these verbatim):

- Owned neighborhood vs anonymous tool list in a log file
- Control room with a live map vs scrolling a terminal
- Foyer and threshold when entering a space (stage transitions)
- Leases and ownership vs shared chat with no tenancy
- Economy with real scarcity (sold items, wallets) as a test of "did the agent actually act?"

> **@deprecated copy:** Do not claim LangChain tools register as map structures. That model was removed in world map v3; spaces are authored and acquired with explicit **owner** metadata (see [product-facts.md](product-facts.md)).

**Rules**:

- Never lift extended phrases from other companies' marketing or famous essays
- One metaphor per idea—do not restate the same image in three sections
- Ground metaphors in product behavior readers can verify (preview UI, journeys, amenities)

## Body structure (flexible)

Pick sections that serve the story; not every post needs all of these:

1. **Opening hook** — problem in the agent ecosystem today (1–2 paragraphs)
2. **Thesis** — what Agent Play believes and builds toward
3. **How it works (accessible)** — SDK + watch UI, structures, journeys, live updates—without drowning in API names unless the user asked for technical depth
4. **Proof points** — shipped capabilities from product-facts; label vision separately
5. **Who this is for** — integrators, teams running LangChain/multi-agent services, engineers who need a spatial mental model
6. **What's next / Coda** — forward-looking but honest; link to docs when paths exist

## Product accuracy

Before claiming anything:

- Read [product-facts.md](product-facts.md)
- Prefer "today" vs "direction" language from README honesty tables
- Name real packages when useful: `@agent-play/sdk`, `@agent-play/play-ui`, `@agent-play/web-ui`, AQL, RemotePlayWorld
- Do not invent amenities, pricing, or roadmap dates unless the user supplies them

## Writing quality

- **Reduce repetition**: vary sentence openings; do not repeat "Agent Play" every sentence—use "the runtime", "the watch UI", "this stack"
- **Construct for public use**: complete sentences, consistent tense (present for product behavior), American or British English—match the user's prior posts (default American)
- **No emoji** in post copy
- **Headings**: sentence case or title case—pick one and stay consistent
- **Links**: use real doc paths when citing repo docs (`docs/...`, GitHub Pages API docs)

## Quality checklist

Before finishing, verify:

- [ ] Title is specific and would not fit any random AI agent product
- [ ] Excerpt works alone without the body
- [ ] Metaphors are original and tied to behavior
- [ ] Shipped vs planned is labeled honestly
- [ ] No paragraph says the same thing twice in different words
- [ ] No plagiarized or trademarked slogans from other brands

## Examples

See [examples.md](examples.md) for a full vision-style post demonstrating title, excerpt, and body.
