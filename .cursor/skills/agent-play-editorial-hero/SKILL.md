---
name: agent-play-editorial-hero
description: >-
  Generates Agent Play editorial hero illustrations — cartoon lifestyle narrative
  scenes for blog posts, announcements, and marketing covers. Use when the user
  asks for an Agent Play graphic, blog hero image, illustration, PNG cover art,
  cartoon scene, or visual for a post theme.
---

# Agent Play Editorial Hero Illustration

## What this produces

A single **editorial hero illustration**: a full-bleed cartoon lifestyle scene that visualizes one post theme. Not a logo, icon, UI mock, diagram, or screenshot.

**Style name to use in prompts:** contemporary cartoon lifestyle / soft cel storybook commercial illustration.

## Workflow

1. **Lock the story beat** — one sentence: who is doing what, where, and why it matches the post theme (e.g. "two colleagues mid coffee-break career talk in a warm office").
2. **Read post context if available** — open the related `docs/blog/*.md` (or draft) and pull the primary metaphor/setting. Do not invent product features the post does not claim.
3. **Compose the image prompt** using the recipe below.
4. **Generate** with `GenerateImage` (PNG). Default aspect ratio `16:9` unless the user asks otherwise (`1:1` for social square, `4:3` for card).
5. **Save into the repo** at `docs/blog/<kebab-theme>.png` (copy from the generated assets path if needed).
6. **Confirm with the user** — path + one-line description. Offer a regenerate only if they want a different crop, cast, or setting.

## Prompt recipe

Build one detailed `description` for `GenerateImage`. Always include all of these blocks:

```text
Cartoon illustration for Agent Play marketing blog, warm and friendly storybook
style (not 3D CGI, not photoreal, not anime, not chibi). Wide [aspect] composition.

Scene: [1–2 characters mid-interaction that expresses the theme]. [Specific props
that make the beat readable — coffee, map floor, desk plants, wall clock, etc.].
Body language open and human; soft rounded features.

Setting: [place that fits Agent Play's spatial thesis when relevant — office floor,
shared workspace, walkable cartoon world interior — without looking like a game HUD].
Soft daylight, gentle shadows, clean line art with flat-to-soft cel shading.

Palette: warm cream, sage green, soft teal, coral accents, honey wood.
Mood: [theme mood — approachable, short conversation, shared world presence, etc.].

Hard bans: NO purple gradients, NO neon glow, NO dark mode, NO floating UI badges,
NO tech holograms, NO emojis, NO logos, NO readable product text or title overlays.
```

### Filename

`agent-play-<kebab-case-theme>.png`  
Example: `agent-play-coffee-break-conversation.png`

## Visual doctrine

| Do | Don't |
|----|-------|
| One clear story beat in the foreground | Crowded multi-plot collage |
| Characters interacting like people at work | Disembodied chat bubbles as the main subject |
| Lived-in cartoon interiors (plants, light, desks) | Flat single-color void backgrounds |
| Soft cel / storybook commercial look | Photoreal, anime, chibi, hyper-3D Pixar |
| Warm cream / sage / teal / coral | Purple-on-white, indigo glow, terracotta-cream cliché stacks |
| Spatial world hinted as place | Detached "AI chatbot in a void" tropes |
| Image alone carries the theme | Text, logos, watermarks, or UI chrome in the frame |

## Theme → scene mapping

Translate the post's metaphor into a **visible human beat**:

| Post idea | Scene direction |
|-----------|-----------------|
| Coffee-break conversation | Two people talking by a window with mugs; calm office behind |
| Agents need places | People/agents as characters on a walkable floor or amenity room — still cartoon-lifestyle, not a wireframe map |
| Shared world / watch together | Colleagues looking at the same lively space (not a terminal dump) |
| Short finishable talk | Clock or natural daylight cue; intimate foreground, quiet activity behind |
| Career / HR presence | Approachable counterpart, not a support ticket counter |

Prefer **office-and-world hybrid** when the post is about Agent Play itself: human conversation first, spatial product second.

## Aspect ratios

| Use | Ratio |
|-----|-------|
| Blog hero / default | `16:9` |
| Social / avatar card | `1:1` |
| Thumbnail / embed | `4:3` |

## Quality checklist

Before finishing:

- [ ] One readable story beat (could caption it in six words)
- [ ] Cartoon lifestyle / soft cel — not photoreal or anime
- [ ] Palette and bans respected
- [ ] No text, logos, or UI overlays in the image
- [ ] PNG saved under `docs/blog/` with a theme-based filename
- [ ] Scene matches the post honestly (no feature theater)

## Reference example

Successful coffee-break hero (keep as style north star, do not copy composition verbatim every time):

- File: `docs/blog/agent-play-coffee-break-conversation.png`
- Theme: "The conversation that fits in a coffee break"
- Beat: two cartoon professionals mid office coffee chat; warm sage/cream interior; soft daylight
