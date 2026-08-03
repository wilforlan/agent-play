/**
 * @module @agent-play/play-ui/preview-human-onboarding
 * Citizen induction onboarding — opaque full-stage passport for Agent Play World.
 */
import { CREATE_HUMAN_NODE_OP } from "@agent-play/intercom";
import { nodeCredentialFromHumanPhrase } from "@agent-play/node-tools/browser";
import { generateNodePassphraseWordCount } from "./passphrase-passw.js";
import { resolveAgentPlayRootKeyForBrowser } from "./preview-agent-play-root-key.js";
import {
  downloadHumanCredentialsJson,
  readHumanCredentials,
  writeHumanCredentials,
} from "./preview-human-credentials.js";
import {
  parseHumanCredentialsUpload,
  resolveDeploymentServerUrlFromApiBase,
  restoreMainNodeFromCredentials,
} from "./preview-human-node-restore.js";
import { requestWatchCanvasFocus } from "./watch-canvas-focus.js";

const ONBOARD_STYLE_ID = "agent-play-human-onboarding-styles";

function ensureOnboardingStyles(): void {
  if (document.getElementById(ONBOARD_STYLE_ID) !== null) {
    return;
  }
  const s = document.createElement("style");
  s.id = ONBOARD_STYLE_ID;
  s.textContent = `
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap");

.human-onboard-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  background: #071018;
  font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  color: #e8eef5;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  box-sizing: border-box;
  overflow: auto;
}
.human-onboard-overlay--opaque {
  background: #071018;
}
.human-onboard-stage {
  position: relative;
  width: min(920px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 28px;
  align-items: stretch;
}
.human-onboard-hero {
  position: relative;
  border-radius: 28px;
  padding: 28px 26px 30px;
  overflow: hidden;
  background:
    radial-gradient(120% 80% at 10% 0%, rgba(200, 245, 66, 0.18), transparent 55%),
    radial-gradient(90% 70% at 90% 100%, rgba(56, 189, 248, 0.16), transparent 50%),
    linear-gradient(160deg, #0d1a24 0%, #0a141c 55%, #081018 100%);
  border: 1px solid rgba(232, 238, 245, 0.1);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
  display: grid;
  gap: 18px;
  align-content: start;
  min-height: 420px;
}
.human-onboard-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent 0 12%, rgba(200, 245, 66, 0.08) 12% 13%, transparent 13% 42%, rgba(56, 189, 248, 0.08) 42% 43%, transparent 43% 71%, rgba(232, 238, 245, 0.06) 71% 72%, transparent 72%),
    linear-gradient(0deg, transparent 0 28%, rgba(232, 238, 245, 0.04) 28% 29%, transparent 29% 58%, rgba(200, 245, 66, 0.05) 58% 59%, transparent 59%);
  pointer-events: none;
}
.human-onboard-brand {
  position: relative;
  margin: 0;
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 0.95;
  color: #f7fafc;
}
.human-onboard-kicker {
  position: relative;
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #c8f542;
}
.human-onboard-hero-copy {
  position: relative;
  margin: 0;
  max-width: 28ch;
  font-size: 15px;
  line-height: 1.55;
  color: rgba(232, 238, 245, 0.78);
}
.human-onboard-street-rail {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}
.human-onboard-street-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(232, 238, 245, 0.14);
  background: rgba(7, 16, 24, 0.55);
  font-size: 12px;
  font-weight: 600;
  color: #dbe7f3;
}
.human-onboard-street-chip::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c8f542;
  box-shadow: 0 0 0 3px rgba(200, 245, 66, 0.15);
}
.human-onboard-street-chip:nth-child(2)::before { background: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15); }
.human-onboard-street-chip:nth-child(3)::before { background: #fbbf24; box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.15); }
.human-onboard-steps {
  position: relative;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.human-onboard-step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(232, 238, 245, 0.45);
  border: 1px solid rgba(232, 238, 245, 0.08);
}
.human-onboard-step.is-active {
  color: #071018;
  background: #c8f542;
  border-color: #c8f542;
}
.human-onboard-step.is-done {
  color: #c8f542;
  border-color: rgba(200, 245, 66, 0.35);
}
.human-onboard-panel {
  position: relative;
  border-radius: 28px;
  padding: 26px 24px;
  background: linear-gradient(180deg, #101c28 0%, #0c1620 100%);
  border: 1px solid rgba(232, 238, 245, 0.12);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
  display: grid;
  gap: 14px;
  align-content: start;
  max-height: min(85dvh, 720px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.human-onboard-panel::after {
  content: "";
  position: absolute;
  top: 18px;
  right: 18px;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 2px dashed rgba(200, 245, 66, 0.35);
  opacity: 0.7;
  pointer-events: none;
}
.human-onboard-title {
  margin: 0;
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(1.55rem, 3vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: #f7fafc;
  padding-right: 48px;
}
.human-onboard-lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(232, 238, 245, 0.72);
}
.human-onboard-panel label {
  font-size: 13px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(7, 16, 24, 0.55);
  border: 1px solid rgba(232, 238, 245, 0.1);
  box-sizing: border-box;
  cursor: pointer;
  color: rgba(232, 238, 245, 0.88);
}
.human-onboard-panel label input {
  margin-top: 2px;
  accent-color: #c8f542;
}
.human-onboard-panel textarea,
.human-onboard-card textarea {
  width: 100%;
  min-height: 96px;
  border-radius: 16px;
  border: 1px solid rgba(200, 245, 66, 0.28);
  background: #071018;
  color: #f7fafc;
  padding: 14px;
  font-size: 16px;
  line-height: 1.45;
  box-sizing: border-box;
  font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
}
.human-onboard-phrase-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 245, 66, 0.85);
}
.human-onboard-node-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  word-break: break-all;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(200, 245, 66, 0.08);
  border: 1px solid rgba(200, 245, 66, 0.22);
  color: #e8f8b0;
}
.human-onboard-seal {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  margin: 4px 0 2px;
  border-radius: 50%;
  border: 3px solid #c8f542;
  color: #c8f542;
  font-family: "Fraunces", Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transform: rotate(-8deg);
  box-shadow: inset 0 0 0 4px rgba(200, 245, 66, 0.12);
}
.human-onboard-file-picker { display: grid; gap: 8px; }
.human-onboard-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.human-onboard-file-zone {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 8px;
  min-height: 96px;
  padding: 22px 16px;
  border-radius: 18px;
  border: 1px dashed rgba(200, 245, 66, 0.35);
  background: rgba(7, 16, 24, 0.65);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.human-onboard-file-zone:hover,
.human-onboard-file-picker.is-dragover .human-onboard-file-zone,
.human-onboard-file-zone:focus-within {
  border-color: rgba(200, 245, 66, 0.8);
  box-shadow: 0 0 0 3px rgba(200, 245, 66, 0.12);
}
.human-onboard-file-zone.has-file {
  border-style: solid;
  border-color: rgba(56, 189, 248, 0.55);
}
.human-onboard-file-picker.is-disabled .human-onboard-file-zone {
  pointer-events: none;
  opacity: 0.65;
  cursor: not-allowed;
}
.human-onboard-file-badge {
  display: grid;
  place-items: center;
  width: 48px;
  height: 56px;
  border-radius: 10px;
  border: 1px solid rgba(200, 245, 66, 0.35);
  background: rgba(200, 245, 66, 0.08);
}
.human-onboard-file-badge span {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #c8f542;
}
.human-onboard-file-prompt {
  font-size: 14px;
  font-weight: 600;
  color: #f7fafc;
}
.human-onboard-file-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #071018;
  background: #c8f542;
  pointer-events: none;
  touch-action: manipulation;
}
.human-onboard-file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(7, 16, 24, 0.65);
  border: 1px solid rgba(232, 238, 245, 0.1);
  font-size: 12px;
  color: rgba(232, 238, 245, 0.7);
}
.human-onboard-file-meta.has-file { color: #dbe7f3; border-color: rgba(56, 189, 248, 0.35); }
.human-onboard-file-meta-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.5);
}
.human-onboard-file-meta.has-file .human-onboard-file-meta-dot {
  background: #38bdf8;
}
.human-onboard-file-meta-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.human-onboard-file-meta:not(.has-file) .human-onboard-file-clear { display: none; }
.human-onboard-file-clear {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #c8f542;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  touch-action: manipulation;
}
.human-onboard-link {
  background: none;
  border: none;
  min-height: 44px;
  padding: 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: #7dd3fc;
  cursor: pointer;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 3px;
  touch-action: manipulation;
}
.human-onboard-link--quiet {
  color: rgba(232, 238, 245, 0.55);
  font-weight: 500;
  text-decoration: none;
}
.human-onboard-link--quiet:hover { color: rgba(232, 238, 245, 0.85); }
.human-onboard-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid #c8f542;
  background: #c8f542;
  color: #071018;
  touch-action: manipulation;
}
.human-onboard-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 4px;
}
.human-onboard-actions button,
.human-onboard-actions .human-onboard-link-btn {
  border-radius: 14px;
  min-height: 48px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #c8f542;
  background: #c8f542;
  color: #071018;
  touch-action: manipulation;
}
.human-onboard-actions button.secondary {
  background: transparent;
  color: #e8eef5;
  border-color: rgba(232, 238, 245, 0.22);
}
.human-onboard-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.human-onboard-btn-wrap {
  position: relative;
  display: inline-flex;
}
.human-onboard-btn-loading {
  display: none;
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
  background: rgba(7, 16, 24, 0.55);
  border-radius: 14px;
  pointer-events: none;
}
.human-onboard-btn-wrap.is-loading .human-onboard-btn-loading { display: flex; }
.human-onboard-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(7, 16, 24, 0.25);
  border-top-color: #071018;
  border-radius: 50%;
  animation: human-onboard-spin 0.65s linear infinite;
}
@keyframes human-onboard-spin {
  to { transform: rotate(360deg); }
}
.human-onboard-error { font-size: 12px; color: #fda4af; }
.arrival-citizen-node {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  word-break: break-all;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(94, 124, 110, 0.12);
  color: #0f172a;
}
.human-onboard-card {
  display: contents;
}
@media (max-width: 860px) {
  .human-onboard-stage {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .human-onboard-hero {
    min-height: 0;
    padding: 22px 20px;
  }
}
@media (max-width: 767px) {
  .human-onboard-overlay {
    place-items: end center;
    align-items: end;
    padding-left: max(0px, env(safe-area-inset-left));
    padding-right: max(0px, env(safe-area-inset-right));
    padding-bottom: 0;
    padding-top: max(12px, env(safe-area-inset-top));
  }
  .human-onboard-stage {
    width: 100%;
    gap: 0;
  }
  .human-onboard-hero {
    display: none;
  }
  .human-onboard-panel {
    width: 100%;
    max-width: none;
    border-radius: 22px 22px 0 0;
    max-height: min(85dvh, 640px);
    padding: 22px 16px max(16px, env(safe-area-inset-bottom));
  }
  .human-onboard-actions,
  .human-onboard-actions--citizen {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
  .human-onboard-actions .human-onboard-btn-wrap,
  .human-onboard-actions button,
  .human-onboard-actions .human-onboard-link-btn {
    width: 100%;
  }
  .human-onboard-actions .human-onboard-btn-wrap button {
    width: 100%;
  }
}
`;
  document.head.append(s);
}

export type HumanOnboardingOptions = {
  apiBase: string;
  getSid: () => string | null;
  onOverlayShown?: () => void;
};

type InductionStep = "welcome" | "papers" | "sealed";

const truncateNodeId = (nodeId: string): string => {
  if (nodeId.length <= 18) {
    return nodeId;
  }
  return `${nodeId.slice(0, 8)}…${nodeId.slice(-6)}`;
};

const createStepRail = (active: InductionStep): HTMLElement => {
  const rail = document.createElement("div");
  rail.className = "human-onboard-steps";
  const steps: Array<{ id: InductionStep; label: string }> = [
    { id: "welcome", label: "1 Welcome" },
    { id: "papers", label: "2 Papers" },
    { id: "sealed", label: "3 Seal" },
  ];
  const activeIndex = steps.findIndex((step) => step.id === active);
  for (const [index, step] of steps.entries()) {
    const el = document.createElement("span");
    el.className = "human-onboard-step";
    if (index < activeIndex) {
      el.classList.add("is-done");
    }
    if (index === activeIndex) {
      el.classList.add("is-active");
    }
    el.textContent = step.label;
    rail.append(el);
  }
  return rail;
};

const fillHero = (hero: HTMLElement): void => {
  hero.replaceChildren();
  const kicker = document.createElement("p");
  kicker.className = "human-onboard-kicker";
  kicker.textContent = "Citizen induction";
  const brand = document.createElement("h1");
  brand.className = "human-onboard-brand";
  brand.textContent = "Agent Play";
  const copy = document.createElement("p");
  copy.className = "human-onboard-hero-copy";
  copy.textContent =
    "Claim citizenship before you enter the spatial AI agent metaverse. Your Player ID unlocks wallet, agent talk, and Econext.";
  const streets = document.createElement("div");
  streets.className = "human-onboard-street-rail";
  for (const label of [
    "St. John St · agents",
    "Peterson St · amenities",
    "Maple Ave · arcade",
  ]) {
    const chip = document.createElement("span");
    chip.className = "human-onboard-street-chip";
    chip.textContent = label;
    streets.append(chip);
  }
  hero.append(kicker, brand, copy, streets);
};

function showOnboardingSuccessCard(options: {
  panel: HTMLElement;
  hero: HTMLElement;
  nodeId: string;
  passw: string;
  serverUrl: string;
  requireBackup: boolean;
  copy: string;
  onContinue: () => void;
}): void {
  fillHero(options.hero);
  options.panel.replaceChildren();
  options.panel.append(createStepRail("sealed"));
  let backupReady = !options.requireBackup;
  const seal = document.createElement("div");
  seal.className = "human-onboard-seal";
  seal.textContent = "Sealed";
  const title = document.createElement("h2");
  title.className = "human-onboard-title";
  title.textContent = "Citizenship sealed";
  const lead = document.createElement("p");
  lead.className = "human-onboard-lead";
  lead.textContent = options.copy;
  const nodeEl = document.createElement("div");
  nodeEl.className = "human-onboard-node-id";
  nodeEl.textContent = truncateNodeId(options.nodeId);
  nodeEl.title = options.nodeId;
  const friendsCopy = document.createElement("p");
  friendsCopy.className = "human-onboard-lead";
  friendsCopy.textContent = "Friends send APU to this node id.";
  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.textContent = "Download credentials.json";
  const savedLabel = document.createElement("label");
  const savedBox = document.createElement("input");
  savedBox.type = "checkbox";
  savedBox.dataset.onboardSavedKey = "1";
  const savedText = document.createElement("span");
  savedText.textContent = "I saved my recovery key";
  savedLabel.append(savedBox, savedText);
  const continueBtn = document.createElement("button");
  continueBtn.type = "button";
  continueBtn.className = "secondary";
  continueBtn.textContent = "Enter Agent Play World";
  continueBtn.disabled = options.requireBackup;
  const syncContinue = (): void => {
    backupReady = !options.requireBackup || savedBox.checked;
    continueBtn.disabled = options.requireBackup && !backupReady;
  };
  const actions = document.createElement("div");
  actions.className = "human-onboard-actions";
  actions.append(downloadBtn, continueBtn);
  options.panel.append(
    seal,
    title,
    lead,
    nodeEl,
    friendsCopy,
    ...(options.requireBackup ? [savedLabel] : []),
    actions
  );
  downloadBtn.addEventListener("click", () => {
    downloadHumanCredentialsJson({
      nodeId: options.nodeId,
      passw: options.passw,
      serverUrl: options.serverUrl,
    });
    if (options.requireBackup) {
      savedBox.checked = true;
      syncContinue();
    }
  });
  savedBox.addEventListener("change", syncContinue);
  continueBtn.addEventListener("click", () => {
    if (options.requireBackup && !savedBox.checked) {
      return;
    }
    options.onContinue();
  });
}

const writeGuestCredentials = (
  options: HumanOnboardingOptions,
  passw: string
): void => {
  const sid = options.getSid();
  writeHumanCredentials({
    nodeId:
      sid !== null ? `session-${sid.slice(0, 12)}` : "preview-local-node",
    passw,
  });
};

export async function ensureHumanNodeOnboarding(
  options: HumanOnboardingOptions
): Promise<void> {
  if (readHumanCredentials() !== null) {
    return;
  }
  ensureOnboardingStyles();
  const passw = generateNodePassphraseWordCount(10);
  const serverUrl = resolveDeploymentServerUrlFromApiBase(options.apiBase);
  await new Promise<void>((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "human-onboard-overlay human-onboard-overlay--opaque";
    overlay.setAttribute("data-arrival-onboarding", "1");
    const stage = document.createElement("div");
    stage.className = "human-onboard-stage";
    const hero = document.createElement("aside");
    hero.className = "human-onboard-hero";
    const panel = document.createElement("section");
    panel.className = "human-onboard-panel";
    const err = document.createElement("div");
    err.className = "human-onboard-error";
    stage.append(hero, panel);
    overlay.append(stage);

    const finish = (): void => {
      overlay.remove();
      requestWatchCanvasFocus();
      resolve();
    };

    const renderRestoreView = (): void => {
      fillHero(hero);
      panel.replaceChildren();
      panel.append(createStepRail("papers"));
      let uploadedJson: unknown = null;
      let uploadedFileName = "";
      const title = document.createElement("h2");
      title.className = "human-onboard-title";
      title.textContent = "Restore citizenship";
      const lead = document.createElement("p");
      lead.className = "human-onboard-lead";
      lead.textContent =
        "Upload credentials.json from a previous backup. We verify your recovery key locally, then reconnect this tab.";
      const filePicker = document.createElement("div");
      filePicker.className = "human-onboard-file-picker";
      const fileZone = document.createElement("label");
      fileZone.className = "human-onboard-file-zone";
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.className = "human-onboard-file-input";
      fileInput.accept = "application/json,.json";
      const fileBadge = document.createElement("div");
      fileBadge.className = "human-onboard-file-badge";
      fileBadge.setAttribute("aria-hidden", "true");
      const fileBadgeLabel = document.createElement("span");
      fileBadgeLabel.textContent = "JSON";
      fileBadge.append(fileBadgeLabel);
      const filePrompt = document.createElement("span");
      filePrompt.className = "human-onboard-file-prompt";
      filePrompt.textContent = "Upload credentials.json";
      const fileCta = document.createElement("span");
      fileCta.className = "human-onboard-file-cta";
      fileCta.textContent = "Browse files";
      fileZone.append(fileInput, fileBadge, filePrompt, fileCta);
      const fileMeta = document.createElement("div");
      fileMeta.className = "human-onboard-file-meta";
      const fileMetaDot = document.createElement("span");
      fileMetaDot.className = "human-onboard-file-meta-dot";
      fileMetaDot.setAttribute("aria-hidden", "true");
      const fileMetaName = document.createElement("span");
      fileMetaName.className = "human-onboard-file-meta-name";
      fileMetaName.textContent = "No file selected";
      const fileClearBtn = document.createElement("button");
      fileClearBtn.type = "button";
      fileClearBtn.className = "human-onboard-file-clear";
      fileClearBtn.textContent = "Remove";
      fileMeta.append(fileMetaDot, fileMetaName, fileClearBtn);
      filePicker.append(fileZone, fileMeta);

      const resetFileSelection = (): void => {
        uploadedJson = null;
        uploadedFileName = "";
        fileInput.value = "";
        fileZone.classList.remove("has-file");
        fileMeta.classList.remove("has-file");
        filePrompt.textContent = "Upload credentials.json";
        fileMetaName.textContent = "No file selected";
        connectBtn.disabled = true;
      };

      const applySelectedFile = (file: File): void => {
        uploadedFileName = file.name;
        fileZone.classList.add("has-file");
        fileMeta.classList.add("has-file");
        filePrompt.textContent = "Credentials loaded";
        fileMetaName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            uploadedJson = JSON.parse(String(reader.result)) as unknown;
            connectBtn.disabled = false;
          } catch {
            err.textContent = "Could not parse credentials.json.";
            resetFileSelection();
          }
        };
        reader.onerror = () => {
          err.textContent = "Could not read credentials.json.";
          resetFileSelection();
        };
        reader.readAsText(file);
      };

      const setFilePickerDisabled = (disabled: boolean): void => {
        filePicker.classList.toggle("is-disabled", disabled);
        fileClearBtn.disabled = disabled;
      };
      const actions = document.createElement("div");
      actions.className = "human-onboard-actions";
      const backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "secondary";
      backBtn.textContent = "Back";
      const connectBtnWrap = document.createElement("div");
      connectBtnWrap.className = "human-onboard-btn-wrap";
      const connectBtn = document.createElement("button");
      connectBtn.type = "button";
      connectBtn.textContent = "Reconnect";
      connectBtn.disabled = true;
      const connectLoading = document.createElement("div");
      connectLoading.className = "human-onboard-btn-loading";
      connectLoading.setAttribute("aria-hidden", "true");
      const connectSpinner = document.createElement("div");
      connectSpinner.className = "human-onboard-spinner";
      connectLoading.appendChild(connectSpinner);
      connectBtnWrap.append(connectBtn, connectLoading);
      const guestBtn = document.createElement("button");
      guestBtn.type = "button";
      guestBtn.className = "human-onboard-link human-onboard-link--quiet";
      guestBtn.textContent = "Continue as guest (no earn / no chat)";
      actions.append(connectBtnWrap, backBtn);
      panel.append(title, lead, filePicker, err, actions, guestBtn);

      fileInput.addEventListener("change", () => {
        err.textContent = "";
        const file = fileInput.files?.[0];
        if (file === undefined) {
          resetFileSelection();
          return;
        }
        applySelectedFile(file);
      });
      fileInput.addEventListener("focus", () => {
        fileZone.scrollIntoView({ block: "nearest" });
      });
      fileClearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        err.textContent = "";
        resetFileSelection();
      });
      fileZone.addEventListener("dragenter", (e) => {
        e.preventDefault();
        if (!filePicker.classList.contains("is-disabled")) {
          filePicker.classList.add("is-dragover");
        }
      });
      fileZone.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      fileZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        if (e.currentTarget === fileZone) {
          filePicker.classList.remove("is-dragover");
        }
      });
      fileZone.addEventListener("drop", (e) => {
        e.preventDefault();
        filePicker.classList.remove("is-dragover");
        if (filePicker.classList.contains("is-disabled")) {
          return;
        }
        err.textContent = "";
        const file = e.dataTransfer?.files?.[0];
        if (file === undefined) {
          return;
        }
        applySelectedFile(file);
      });
      backBtn.addEventListener("click", () => {
        err.textContent = "";
        renderArrivalView();
      });
      guestBtn.addEventListener("click", () => {
        writeGuestCredentials(options, passw);
        finish();
      });
      connectBtn.addEventListener("click", () => {
        err.textContent = "";
        if (uploadedJson === null) {
          err.textContent = "Choose a credentials.json file first.";
          return;
        }
        const parsed = parseHumanCredentialsUpload(uploadedJson);
        if (parsed === null) {
          err.textContent =
            "Invalid credentials.json. Expected nodeId and passw (and optional serverUrl).";
          return;
        }
        const setConnecting = (busy: boolean): void => {
          connectBtn.disabled = busy || uploadedJson === null;
          backBtn.disabled = busy;
          guestBtn.disabled = busy;
          fileInput.disabled = busy;
          setFilePickerDisabled(busy);
          connectBtn.setAttribute("aria-busy", busy ? "true" : "false");
          connectBtnWrap.classList.toggle("is-loading", busy);
        };
        void (async () => {
          setConnecting(true);
          try {
            const restored = await restoreMainNodeFromCredentials({
              apiBase: options.apiBase,
              credentials: parsed,
            });
            if (!restored.ok) {
              err.textContent = restored.reason;
              setConnecting(false);
              return;
            }
            writeHumanCredentials({
              nodeId: restored.nodeId,
              passw: parsed.passw,
            });
            showOnboardingSuccessCard({
              panel,
              hero,
              copy:
                uploadedFileName.length > 0
                  ? `Reconnected with ${uploadedFileName}. Keep a backup of your papers.`
                  : "Your citizenship is restored for this tab.",
              nodeId: restored.nodeId,
              passw: parsed.passw,
              serverUrl,
              requireBackup: false,
              onContinue: finish,
            });
          } catch (e) {
            err.textContent =
              e instanceof Error ? e.message : "Restore failed";
            setConnecting(false);
          }
        })();
      });
    };

    const renderPassportView = (): void => {
      fillHero(hero);
      panel.replaceChildren();
      panel.append(createStepRail("papers"));
      const title = document.createElement("h2");
      title.className = "human-onboard-title";
      title.textContent = "Issue your papers";
      const lead = document.createElement("p");
      lead.className = "human-onboard-lead";
      lead.textContent =
        "This creates your Player ID — the passport for wallet, agent chat, and Econext banking.";
      const restoreLink = document.createElement("button");
      restoreLink.type = "button";
      restoreLink.className = "human-onboard-link";
      restoreLink.textContent = "Already a citizen? Restore papers";
      const consentLabel = document.createElement("label");
      const consentBox = document.createElement("input");
      consentBox.type = "checkbox";
      const consentText = document.createElement("span");
      consentText.textContent =
        "I agree to issue my Player ID for Agent Play World in this session.";
      consentLabel.append(consentBox, consentText);
      const phraseLabel = document.createElement("div");
      phraseLabel.className = "human-onboard-phrase-label";
      phraseLabel.textContent = "Recovery key";
      const phraseArea = document.createElement("textarea");
      phraseArea.readOnly = true;
      phraseArea.value = passw;
      phraseArea.addEventListener("focus", () => {
        phraseArea.scrollIntoView({ block: "nearest" });
      });
      const actions = document.createElement("div");
      actions.className = "human-onboard-actions";
      const createBtnWrap = document.createElement("div");
      createBtnWrap.className = "human-onboard-btn-wrap";
      const createBtn = document.createElement("button");
      createBtn.type = "button";
      createBtn.textContent = "Become a citizen";
      const createLoading = document.createElement("div");
      createLoading.className = "human-onboard-btn-loading";
      createLoading.setAttribute("aria-hidden", "true");
      const createSpinner = document.createElement("div");
      createSpinner.className = "human-onboard-spinner";
      createLoading.appendChild(createSpinner);
      createBtnWrap.append(createBtn, createLoading);
      const guestBtn = document.createElement("button");
      guestBtn.type = "button";
      guestBtn.className = "human-onboard-link human-onboard-link--quiet";
      guestBtn.textContent = "Continue as guest (no earn / no chat)";
      actions.append(createBtnWrap);
      panel.append(
        title,
        lead,
        restoreLink,
        consentLabel,
        phraseLabel,
        phraseArea,
        err,
        actions,
        guestBtn
      );

      restoreLink.addEventListener("click", () => {
        err.textContent = "";
        renderRestoreView();
      });
      guestBtn.addEventListener("click", () => {
        writeGuestCredentials(options, passw);
        finish();
      });
      createBtn.addEventListener("click", () => {
        err.textContent = "";
        if (!consentBox.checked) {
          err.textContent = "Consent is required.";
          return;
        }
        const sid = options.getSid();
        if (sid === null) {
          err.textContent = "Session not ready.";
          return;
        }
        const setCreating = (busy: boolean): void => {
          createBtn.disabled = busy;
          guestBtn.disabled = busy;
          restoreLink.disabled = busy;
          createBtn.setAttribute("aria-busy", busy ? "true" : "false");
          createBtnWrap.classList.toggle("is-loading", busy);
        };
        void (async () => {
          setCreating(true);
          try {
            const rootKey = await resolveAgentPlayRootKeyForBrowser({
              apiBase: options.apiBase,
            });
            const credential = nodeCredentialFromHumanPhrase({
              phrase: passw,
              rootKey,
            });
            const res = await fetch(
              `${options.apiBase}/sdk/rpc?sid=${encodeURIComponent(sid)}`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  op: CREATE_HUMAN_NODE_OP,
                  payload: {
                    consent: true,
                    nodeId: credential.nodeId,
                    passwHash: credential.passwHash,
                  },
                }),
              }
            );
            const text = await res.text();
            if (!res.ok) {
              throw new Error(text);
            }
            const json = JSON.parse(text) as { nodeId?: unknown };
            if (typeof json.nodeId !== "string") {
              throw new Error("invalid createHumanNode response");
            }
            const nodeId = json.nodeId;
            if (nodeId !== credential.nodeId) {
              throw new Error(
                "createHumanNode: server node id does not match local derivation"
              );
            }
            writeHumanCredentials({ nodeId, passw });
            showOnboardingSuccessCard({
              panel,
              hero,
              copy: "Download your papers before entering. Your recovery key is inside credentials.json.",
              nodeId,
              passw,
              serverUrl,
              requireBackup: true,
              onContinue: finish,
            });
          } catch (e) {
            err.textContent =
              e instanceof Error ? e.message : "createHumanNode failed";
            setCreating(false);
          }
        })();
      });
    };

    const renderArrivalView = (): void => {
      fillHero(hero);
      panel.replaceChildren();
      err.textContent = "";
      panel.append(createStepRail("welcome"));
      const title = document.createElement("h2");
      title.className = "human-onboard-title";
      title.textContent = "Become a citizen";
      const lead = document.createElement("p");
      lead.className = "human-onboard-lead";
      lead.textContent =
        "Citizenship is your ticket in. Issue papers once, keep your recovery key, then enter the world to earn, talk, and bank.";
      const actions = document.createElement("div");
      actions.className = "human-onboard-actions";
      const enterBtn = document.createElement("button");
      enterBtn.type = "button";
      enterBtn.textContent = "Start citizenship";
      const restoreLink = document.createElement("button");
      restoreLink.type = "button";
      restoreLink.className = "human-onboard-link";
      restoreLink.textContent = "I already have credentials";
      actions.append(enterBtn);
      panel.append(title, lead, restoreLink, actions);
      enterBtn.addEventListener("click", () => {
        renderPassportView();
      });
      restoreLink.addEventListener("click", () => {
        renderRestoreView();
      });
    };

    document.body.append(overlay);
    options.onOverlayShown?.();
    renderArrivalView();
  });
}
