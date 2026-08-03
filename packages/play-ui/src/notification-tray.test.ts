// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMessageLikeNotification } from "@agent-play/intercom";
import {
  computeNotificationTrayPlacement,
  createNotificationTray,
  NOTIFICATION_TRAY_WIDE_MEDIA_QUERY,
} from "./notification-tray.js";

describe("computeNotificationTrayPlacement", () => {
  it("anchors the panel directly underneath the world chat room", () => {
    const placement = computeNotificationTrayPlacement({
      anchorRect: { left: 24, top: 16, width: 360, height: 220 },
      viewport: { width: 1280, height: 800 },
      gapPx: 12,
      preferredWidthPx: 280,
    });
    expect(placement.leftPx).toBe(24);
    expect(placement.topPx).toBe(248);
    expect(placement.widthPx).toBe(280);
  });

  it("clamps width to the chat panel width when the chat is narrower", () => {
    const placement = computeNotificationTrayPlacement({
      anchorRect: { left: 16, top: 16, width: 200, height: 180 },
      viewport: { width: 1280, height: 800 },
      preferredWidthPx: 280,
    });
    expect(placement.widthPx).toBe(200);
  });

  it("keeps the panel inside the viewport edges", () => {
    const placement = computeNotificationTrayPlacement({
      anchorRect: { left: 1100, top: 700, width: 360, height: 120 },
      viewport: { width: 1280, height: 800 },
      preferredWidthPx: 280,
      gapPx: 12,
    });
    expect(placement.leftPx).toBeGreaterThanOrEqual(0);
    expect(placement.leftPx + placement.widthPx).toBeLessThanOrEqual(1280);
    expect(placement.topPx).toBeGreaterThanOrEqual(0);
    expect(placement.topPx).toBeLessThan(800);
  });
});

describe("notification tray", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows title, description, and metadata on the tray", () => {
    const tray = createNotificationTray({ parent: document.body });
    tray.push(
      buildMessageLikeNotification({
        id: "n-1",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "alice",
        targetPlayerId: "bob",
        messageRequestId: "msg-1",
        messagePreview: "hello there",
      })
    );
    expect(tray.root.textContent).toContain("New like");
    expect(tray.root.textContent).toContain("alice");
    expect(tray.root.textContent).toContain("hello there");
    expect(tray.root.getAttribute("aria-label")).toContain("Notifications");
    tray.destroy();
  });

  it("wraps long title, description, and metadata within the tray card", () => {
    const longPreview =
      "supercalifragilisticexpialidocious-notification-preview-that-must-wrap";
    const tray = createNotificationTray({ parent: document.body });
    tray.push(
      buildMessageLikeNotification({
        id: "n-wrap",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "alice-with-a-very-long-display-name-segment",
        targetPlayerId: "bob",
        messageRequestId: "msg-1",
        messagePreview: longPreview,
      })
    );
    const style =
      document.getElementById("preview-notification-tray-styles")?.textContent ??
      "";
    expect(style).toMatch(
      /\.preview-notification-tray__title \{[\s\S]*?overflow-wrap:\s*anywhere/
    );
    expect(style).toMatch(
      /\.preview-notification-tray__title \{[\s\S]*?white-space:\s*normal/
    );
    expect(style).not.toMatch(
      /\.preview-notification-tray__title \{[\s\S]*?white-space:\s*nowrap/
    );
    expect(style).toMatch(
      /\.preview-notification-tray__description \{[\s\S]*?overflow-wrap:\s*anywhere/
    );
    expect(style).toMatch(
      /\.preview-notification-tray__description \{[\s\S]*?white-space:\s*normal/
    );
    expect(style).not.toMatch(
      /\.preview-notification-tray__description \{[\s\S]*?white-space:\s*nowrap/
    );
    expect(style).toMatch(
      /\.preview-notification-tray__meta \{[\s\S]*?overflow-wrap:\s*anywhere/
    );
    expect(style).toMatch(
      /\.preview-notification-tray__meta \{[\s\S]*?white-space:\s*normal/
    );
    expect(style).not.toMatch(
      /\.preview-notification-tray__meta \{[\s\S]*?white-space:\s*nowrap/
    );
    expect(tray.root.textContent).toContain(longPreview);
    tray.destroy();
  });

  it("auto-dismisses unfocused notifications after 10 seconds", () => {
    const tray = createNotificationTray({ parent: document.body });
    tray.push(
      buildMessageLikeNotification({
        id: "n-1",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "alice",
        targetPlayerId: "bob",
        messageRequestId: "msg-1",
      })
    );
    expect(tray.root.querySelectorAll("[data-notification-id]")).toHaveLength(1);
    vi.advanceTimersByTime(9999);
    expect(tray.root.querySelectorAll("[data-notification-id]")).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(tray.root.querySelectorAll("[data-notification-id]")).toHaveLength(0);
    tray.destroy();
  });

  it("keeps a focused notification until unfocused or dismissed", () => {
    const tray = createNotificationTray({ parent: document.body });
    tray.push(
      buildMessageLikeNotification({
        id: "n-focus",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "alice",
        targetPlayerId: "bob",
        messageRequestId: "msg-1",
      })
    );
    const item = tray.root.querySelector(
      '[data-notification-id="n-focus"]'
    );
    expect(item).toBeInstanceOf(HTMLElement);
    if (!(item instanceof HTMLElement)) {
      return;
    }
    item.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(15_000);
    expect(tray.root.querySelectorAll("[data-notification-id]")).toHaveLength(1);
    item.dispatchEvent(new Event("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(10_000);
    expect(tray.root.querySelectorAll("[data-notification-id]")).toHaveLength(0);
    tray.destroy();
  });

  it("dismisses immediately when the dismiss control is used", () => {
    const tray = createNotificationTray({ parent: document.body });
    tray.push(
      buildMessageLikeNotification({
        id: "n-dismiss",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "alice",
        targetPlayerId: "bob",
        messageRequestId: "msg-1",
      })
    );
    const button = tray.root.querySelector(
      '[data-notification-id="n-dismiss"] button'
    );
    expect(button).toBeInstanceOf(HTMLButtonElement);
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(tray.root.querySelectorAll("[data-notification-id]")).toHaveLength(0);
    tray.destroy();
  });

  it("uses panel placement under world chat on wide (desktop) layouts", () => {
    const tray = createNotificationTray({
      parent: document.body,
      layoutMode: "panel",
    });
    expect(tray.root.classList.contains("preview-notification-tray--panel")).toBe(
      true
    );
    expect(tray.getLayoutMode()).toBe("panel");
    tray.refreshPlacement({
      anchorRect: { left: 40, top: 20, width: 360, height: 240 },
      viewport: { width: 1400, height: 900 },
    });
    expect(tray.root.style.left).toBe("40px");
    expect(tray.root.style.top).toBe("272px");
    expect(tray.root.style.width).toBe("280px");
    const style = document.getElementById("preview-notification-tray-styles");
    const css = style?.textContent ?? "";
    expect(css).toMatch(
      /\.preview-notification-tray--panel \{[\s\S]*?position:\s*fixed/
    );
    expect(NOTIFICATION_TRAY_WIDE_MEDIA_QUERY).toBe("(min-width: 1024px)");
    tray.destroy();
  });

  it("uses toast overlay placement on small (mobile) screens", () => {
    const tray = createNotificationTray({
      parent: document.body,
      layoutMode: "toast",
    });
    expect(tray.root.classList.contains("preview-notification-tray--toast")).toBe(
      true
    );
    expect(tray.getLayoutMode()).toBe("toast");
    tray.refreshPlacement({
      anchorRect: { left: 40, top: 20, width: 360, height: 240 },
      viewport: { width: 390, height: 844 },
    });
    expect(tray.root.style.left).toBe("");
    expect(tray.root.style.top).toBe("");
    expect(tray.root.style.width).toBe("");
    const style = document.getElementById("preview-notification-tray-styles");
    const css = style?.textContent ?? "";
    expect(css).toMatch(
      /\.preview-notification-tray--toast \{[\s\S]*?position:\s*fixed/
    );
    expect(css).toMatch(
      /\.preview-notification-tray--toast \{[\s\S]*?top:\s*max\(12px/
    );
    tray.destroy();
  });

  it("follows the wide-sidebar breakpoint when syncing layout mode", () => {
    type Listener = (event: { matches: boolean }) => void;
    let listener: Listener | null = null;
    const mm = {
      matches: true,
      addEventListener: vi.fn((_type: string, next: Listener) => {
        listener = next;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => {
        expect(query).toBe(NOTIFICATION_TRAY_WIDE_MEDIA_QUERY);
        return mm;
      })
    );
    const tray = createNotificationTray({
      parent: document.body,
      syncLayoutToViewport: true,
    });
    expect(tray.getLayoutMode()).toBe("panel");
    listener?.({ matches: false });
    expect(tray.getLayoutMode()).toBe("toast");
    listener?.({ matches: true });
    expect(tray.getLayoutMode()).toBe("panel");
    tray.destroy();
    expect(mm.removeEventListener).toHaveBeenCalled();
  });
});
