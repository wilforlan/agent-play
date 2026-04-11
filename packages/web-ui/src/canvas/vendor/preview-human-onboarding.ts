/**
 * @module @agent-play/play-ui/preview-human-onboarding
 * preview human onboarding — preview canvas module (Pixi + DOM).
 */
import { CREATE_HUMAN_NODE_OP } from "@agent-play/intercom";
import {
  deriveNodeIdFromPassword,
  nodeCredentialsMaterialFromHumanPassphrase,
} from "@agent-play/node-tools/browser";
import { generateNodePassphraseWordCount } from "./passphrase-passw.js";
import { resolveAgentPlayRootKeyForBrowser } from "./preview-agent-play-root-key.js";
import {
  downloadHumanCredentialsJson,
  readHumanCredentials,
  writeHumanCredentials,
} from "./preview-human-credentials.js";

const ONBOARD_STYLE_ID = "agent-play-human-onboarding-styles";

function ensureOnboardingStyles(): void {
  if (document.getElementById(ONBOARD_STYLE_ID) !== null) {
    return;
  }
  const s = document.createElement("style");
  s.id = ONBOARD_STYLE_ID;
  s.textContent = `
.human-onboard-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.72);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.human-onboard-card {
  max-width: 420px;
  padding: 20px;
  border-radius: 12px;
  background: #0f172a;
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.4);
  display: grid;
  gap: 12px;
}
.human-onboard-card h2 { margin: 0; font-size: 16px; }
.human-onboard-card p { margin: 0; font-size: 12px; line-height: 1.45; color: #cbd5e1; }
.human-onboard-card label { font-size: 12px; display: flex; gap: 8px; align-items: flex-start; }
.human-onboard-card textarea {
  width: 100%;
  min-height: 72px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: #020617;
  color: #f8fafc;
  padding: 8px;
  font-size: 12px;
  box-sizing: border-box;
}
.human-onboard-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.human-onboard-actions button {
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid rgba(59, 130, 246, 0.55);
  background: rgba(37, 99, 235, 0.85);
  color: #fff;
}
.human-onboard-actions button.secondary {
  background: transparent;
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.45);
}
.human-onboard-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.85;
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
  background: rgba(15, 23, 42, 0.72);
  border-radius: 8px;
  pointer-events: none;
}
.human-onboard-btn-wrap.is-loading .human-onboard-btn-loading {
  display: flex;
}
.human-onboard-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: human-onboard-spin 0.65s linear infinite;
}
@keyframes human-onboard-spin {
  to { transform: rotate(360deg); }
}
.human-onboard-error { font-size: 11px; color: #fca5a5; }
`;
  document.head.append(s);
}

export type HumanOnboardingOptions = {
  apiBase: string;
  getSid: () => string | null;
};

export async function ensureHumanNodeOnboarding(
  options: HumanOnboardingOptions
): Promise<void> {
  if (readHumanCredentials() !== null) {
    return;
  }
  ensureOnboardingStyles();
  const passw = generateNodePassphraseWordCount(10);
  await new Promise<void>((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "human-onboard-overlay";
    const card = document.createElement("div");
    card.className = "human-onboard-card";
    const heading = document.createElement("h2");
    heading.textContent = "Human node on player chain";
    const copy = document.createElement("p");
    copy.textContent =
      "Consent places a reusable main node for this browser tab. Your passphrase is generated locally; we hash it in the browser and send only that material to register the node (same rules as agent-play create-main-node). Save the passphrase and credentials before continuing.";
    const consentLabel = document.createElement("label");
    const consentBox = document.createElement("input");
    consentBox.type = "checkbox";
    const consentText = document.createElement("span");
    consentText.textContent =
      "I agree to create a main node for Agent Play in this session.";
    consentLabel.append(consentBox, consentText);
    const phraseLabel = document.createElement("div");
    phraseLabel.style.fontSize = "11px";
    phraseLabel.style.color = "#94a3b8";
    phraseLabel.textContent = "Generated passphrase (save this once):";
    const phraseArea = document.createElement("textarea");
    phraseArea.readOnly = true;
    phraseArea.value = passw;
    const err = document.createElement("div");
    err.className = "human-onboard-error";
    const actions = document.createElement("div");
    actions.className = "human-onboard-actions";
    const createBtnWrap = document.createElement("div");
    createBtnWrap.className = "human-onboard-btn-wrap";
    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.textContent = "Create main node";
    const createLoading = document.createElement("div");
    createLoading.className = "human-onboard-btn-loading";
    createLoading.setAttribute("aria-hidden", "true");
    const createSpinner = document.createElement("div");
    createSpinner.className = "human-onboard-spinner";
    createLoading.appendChild(createSpinner);
    createBtnWrap.append(createBtn, createLoading);
    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "secondary";
    skipBtn.textContent = "Skip (limited intercom)";
    actions.append(skipBtn, createBtnWrap);
    card.append(heading, copy, consentLabel, phraseLabel, phraseArea, err, actions);
    overlay.append(card);
    document.body.append(overlay);

    skipBtn.addEventListener("click", () => {
      const sid = options.getSid();
      writeHumanCredentials({
        nodeId:
          sid !== null ? `session-${sid.slice(0, 12)}` : "preview-local-node",
        passw,
      });
      overlay.remove();
      resolve();
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
        skipBtn.disabled = busy;
        createBtn.setAttribute("aria-busy", busy ? "true" : "false");
        createBtnWrap.classList.toggle("is-loading", busy);
      };
      void (async () => {
        setCreating(true);
        try {
          const rootKey = await resolveAgentPlayRootKeyForBrowser({
            apiBase: options.apiBase,
          });
          const passwMaterial = nodeCredentialsMaterialFromHumanPassphrase(passw);
          const expectedNodeId = deriveNodeIdFromPassword({
            password: passwMaterial,
            rootKey,
          });
          const res = await fetch(
            `${options.apiBase}/sdk/rpc?sid=${encodeURIComponent(sid)}`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                op: CREATE_HUMAN_NODE_OP,
                payload: { consent: true, passw: passwMaterial },
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
          if (nodeId !== expectedNodeId) {
            throw new Error(
              "createHumanNode: server node id does not match local derivation"
            );
          }
          writeHumanCredentials({ nodeId, passw });
          card.replaceChildren();
          const successHeading = document.createElement("h2");
          successHeading.textContent = "Main node created";
          const successCopy = document.createElement("p");
          successCopy.textContent =
            "Your node id is stored for this tab. Download credentials.json to keep a backup (includes your passphrase).";
          const downloadBtn = document.createElement("button");
          downloadBtn.type = "button";
          downloadBtn.textContent = "Download credentials.json";
          const continueBtn = document.createElement("button");
          continueBtn.type = "button";
          continueBtn.className = "secondary";
          continueBtn.textContent = "Continue";
          const successActions = document.createElement("div");
          successActions.className = "human-onboard-actions";
          successActions.append(downloadBtn, continueBtn);
          card.append(successHeading, successCopy, successActions);
          downloadBtn.addEventListener("click", () => {
            downloadHumanCredentialsJson({ nodeId, passw });
          });
          continueBtn.addEventListener("click", () => {
            overlay.remove();
            resolve();
          });
        } catch (e) {
          err.textContent =
            e instanceof Error ? e.message : "createHumanNode failed";
          setCreating(false);
        }
      })();
    });
  });
}
