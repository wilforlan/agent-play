/**
 * @module @agent-play/play-ui/invite-friends-modal
 * Post-credentials network-effects invite quest for Agent Play World.
 */

export const INVITE_FRIENDS_STORAGE_KEY = "agent-play:invite-friends:v1";
export const REFERRAL_REWARD_APU_COPY = "+25 APU";

type InviteFriendsProgress = {
  readonly dismissed: boolean;
};

export type ShowInviteFriendsModalOptions = {
  readonly nodeId: string;
  readonly playWorldBaseUrl?: string;
  readonly parent?: HTMLElement;
  readonly onDismiss?: () => void;
  readonly fetchImpl?: typeof fetch;
};

const STYLE_ID = "agent-play-invite-friends-styles";

const readProgress = (): InviteFriendsProgress | null => {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(INVITE_FRIENDS_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return {
      dismissed: (parsed as { dismissed?: unknown }).dismissed === true,
    };
  } catch {
    return null;
  }
};

const writeProgress = (progress: InviteFriendsProgress): void => {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(INVITE_FRIENDS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    return;
  }
};

export const clearInviteFriendsDismissed = (): void => {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(INVITE_FRIENDS_STORAGE_KEY);
  } catch {
    return;
  }
};

export const dismissInviteFriendsModal = (): void => {
  writeProgress({ dismissed: true });
};

export const shouldShowInviteFriendsModal = (input: {
  readonly guest: boolean;
  readonly hasCredentials: boolean;
}): boolean => {
  if (!input.hasCredentials || input.guest) {
    return false;
  }
  const progress = readProgress();
  return progress === null || !progress.dismissed;
};

const resolvePlayWorldBaseUrl = (override?: string): string => {
  if (override !== undefined && override.trim().length > 0) {
    return override.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "https://agent-play.com";
};

const ensureStyles = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(STYLE_ID) !== null) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap");

.invite-friends-overlay {
  position: fixed;
  inset: 0;
  z-index: 13000;
  display: grid;
  place-items: center;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  box-sizing: border-box;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(200, 245, 66, 0.18), transparent 55%),
    rgba(7, 16, 24, 0.72);
  font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  color: #e8eef5;
}
.invite-friends-card {
  position: relative;
  width: min(440px, 100%);
  max-height: min(88dvh, 720px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 24px;
  padding: 22px 20px 18px;
  display: grid;
  gap: 14px;
  background:
    radial-gradient(90% 70% at 90% 0%, rgba(56, 189, 248, 0.16), transparent 50%),
    linear-gradient(165deg, #12202c 0%, #0c1620 55%, #09131b 100%);
  border: 1px solid rgba(200, 245, 66, 0.28);
  box-shadow:
    0 0 0 1px rgba(232, 238, 245, 0.04) inset,
    0 24px 60px rgba(0, 0, 0, 0.45);
}
.invite-friends-card::before {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: 18px;
  border: 1px dashed rgba(200, 245, 66, 0.22);
  pointer-events: none;
}
.invite-friends-kicker {
  position: relative;
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #c8f542;
}
.invite-friends-card h2 {
  position: relative;
  margin: 0;
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(1.55rem, 4vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: #f7fafc;
}
.invite-friends-card p {
  position: relative;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(232, 238, 245, 0.78);
}
.invite-friends-rewards {
  position: relative;
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
}
.invite-friends-reward {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(232, 238, 245, 0.12);
  background: rgba(7, 16, 24, 0.45);
  font-size: 13px;
  font-weight: 600;
  color: #dbe7f3;
}
.invite-friends-reward span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  min-height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  background: #c8f542;
  color: #071018;
  font-size: 12px;
  font-weight: 700;
}
.invite-friends-link-box {
  position: relative;
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(56, 189, 248, 0.28);
  background: rgba(7, 16, 24, 0.55);
}
.invite-friends-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: #7dd3fc;
}
.invite-friends-link {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
  color: #e8eef5;
}
.invite-friends-status {
  position: relative;
  min-height: 18px;
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #c8f542;
}
.invite-friends-actions {
  position: relative;
  display: grid;
  gap: 8px;
}
.invite-friends-actions--stacked {
  grid-template-columns: 1fr;
}
.invite-friends-actions button {
  min-height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(200, 245, 66, 0.55);
  background: #c8f542;
  color: #071018;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  padding: 12px 14px;
}
.invite-friends-actions button.secondary {
  background: transparent;
  color: #e8eef5;
  border-color: rgba(232, 238, 245, 0.22);
}
.invite-friends-actions button:disabled {
  opacity: 0.55;
  cursor: wait;
}
@media (min-width: 768px) {
  .invite-friends-rewards {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 767px) {
  .invite-friends-overlay {
    place-items: end center;
    align-items: end;
    padding-left: max(0px, env(safe-area-inset-left));
    padding-right: max(0px, env(safe-area-inset-right));
    padding-bottom: 0;
  }
  .invite-friends-card {
    width: 100%;
    max-width: none;
    border-radius: 22px 22px 0 0;
    max-height: min(88dvh, 720px);
    padding: 20px 16px max(16px, env(safe-area-inset-bottom));
  }
}
`;
  document.head.append(style);
};

type EnsureResponse = {
  readonly ok?: boolean;
  readonly code?: string;
  readonly link?: string;
  readonly rewardApu?: number;
  readonly error?: string;
};

export const showInviteFriendsModal = (
  options: ShowInviteFriendsModalOptions,
): { destroy(): void } => {
  ensureStyles();
  const parent = options.parent ?? document.body;
  const existing = parent.querySelector("[data-invite-friends-modal='1']");
  if (existing !== null) {
    return {
      destroy: () => {
        existing.remove();
      },
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const playWorldBaseUrl = resolvePlayWorldBaseUrl(options.playWorldBaseUrl);
  let inviteLink = `${playWorldBaseUrl}/?rc=--------`;
  let inviteCode = "--------";

  const overlay = document.createElement("div");
  overlay.className = "invite-friends-overlay";
  overlay.setAttribute("data-invite-friends-modal", "1");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "invite-friends-title");

  const card = document.createElement("div");
  card.className = "invite-friends-card";

  const kicker = document.createElement("p");
  kicker.className = "invite-friends-kicker";
  kicker.textContent = "Party quest";

  const title = document.createElement("h2");
  title.id = "invite-friends-title";
  title.textContent = "Invite friends to complete your world";

  const lead = document.createElement("p");
  lead.textContent =
    "A solo city is only half built. Share your invite so friends can join, earn with you, and help co-build Agent Play World.";

  const rewards = document.createElement("div");
  rewards.className = "invite-friends-rewards";
  const rewardApu = document.createElement("div");
  rewardApu.className = "invite-friends-reward";
  const rewardBadge = document.createElement("span");
  rewardBadge.textContent = REFERRAL_REWARD_APU_COPY;
  rewardApu.append(rewardBadge, document.createTextNode(" when a friend signs up"));
  const rewardWorld = document.createElement("div");
  rewardWorld.className = "invite-friends-reward";
  const worldBadge = document.createElement("span");
  worldBadge.textContent = "Co-build";
  rewardWorld.append(worldBadge, document.createTextNode(" fill streets together"));
  rewards.append(rewardApu, rewardWorld);

  const linkBox = document.createElement("div");
  linkBox.className = "invite-friends-link-box";
  const codeLabel = document.createElement("div");
  codeLabel.className = "invite-friends-code";
  codeLabel.setAttribute("data-invite-code", "1");
  codeLabel.textContent = `Code ${inviteCode}`;
  const linkLabel = document.createElement("div");
  linkLabel.className = "invite-friends-link";
  linkLabel.setAttribute("data-invite-link", "1");
  linkLabel.textContent = inviteLink;
  linkBox.append(codeLabel, linkLabel);

  const status = document.createElement("p");
  status.className = "invite-friends-status";
  status.setAttribute("data-invite-status", "1");
  status.textContent = "Preparing your invite…";

  const actions = document.createElement("div");
  actions.className = "invite-friends-actions invite-friends-actions--stacked";

  const copyLinkBtn = document.createElement("button");
  copyLinkBtn.type = "button";
  copyLinkBtn.textContent = "Copy invite link";
  copyLinkBtn.disabled = true;

  const copyCodeBtn = document.createElement("button");
  copyCodeBtn.type = "button";
  copyCodeBtn.className = "secondary";
  copyCodeBtn.textContent = "Copy code";
  copyCodeBtn.disabled = true;

  const laterBtn = document.createElement("button");
  laterBtn.type = "button";
  laterBtn.className = "secondary";
  laterBtn.textContent = "Maybe later";

  actions.append(copyLinkBtn, copyCodeBtn, laterBtn);
  card.append(kicker, title, lead, rewards, linkBox, status, actions);
  overlay.append(card);
  parent.append(overlay);

  const setReady = (code: string, link: string): void => {
    inviteCode = code;
    inviteLink = link;
    codeLabel.textContent = `Code ${code}`;
    linkLabel.textContent = link;
    copyLinkBtn.disabled = false;
    copyCodeBtn.disabled = false;
    status.textContent = "Ready to share — send it to a friend.";
  };

  const setCopied = (label: string): void => {
    status.textContent = label;
  };

  const close = (): void => {
    dismissInviteFriendsModal();
    overlay.remove();
    options.onDismiss?.();
  };

  copyLinkBtn.addEventListener("click", () => {
    void navigator.clipboard?.writeText(inviteLink).then(
      () => {
        setCopied("Invite link copied.");
      },
      () => {
        setCopied("Could not copy. Select the link and copy manually.");
      },
    );
  });

  copyCodeBtn.addEventListener("click", () => {
    void navigator.clipboard?.writeText(inviteCode).then(
      () => {
        setCopied("Invite code copied.");
      },
      () => {
        setCopied("Could not copy. Select the code and copy manually.");
      },
    );
  });

  laterBtn.addEventListener("click", close);

  void (async () => {
    try {
      const res = await fetchImpl("/api/referrals/ensure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nodeId: options.nodeId }),
      });
      const json = (await res.json()) as EnsureResponse;
      if (!res.ok || json.ok !== true || typeof json.code !== "string") {
        throw new Error(json.error ?? "Could not create invite");
      }
      const link =
        typeof json.link === "string" && json.link.length > 0
          ? json.link
          : `${playWorldBaseUrl}/?rc=${json.code}`;
      setReady(json.code, link);
    } catch {
      status.textContent =
        "Invite is offline right now. Keep exploring — you can invite friends later.";
    }
  })();

  return {
    destroy: () => {
      overlay.remove();
    },
  };
};
