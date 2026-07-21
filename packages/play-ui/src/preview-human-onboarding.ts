/**
 * @module @agent-play/play-ui/preview-human-onboarding
 * preview human onboarding — preview canvas module (Pixi + DOM).
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
.human-onboard-file-picker {
  display: grid;
  gap: 8px;
}
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
  padding: 20px 16px;
  border-radius: 10px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.6) 0%, rgba(15, 23, 42, 0.35) 100%);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  text-align: center;
}
.human-onboard-file-zone:hover {
  border-color: rgba(96, 165, 250, 0.75);
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.85) 0%, rgba(30, 58, 138, 0.2) 100%);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.15);
}
.human-onboard-file-zone:focus-within {
  outline: none;
  border-color: rgba(96, 165, 250, 0.9);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
}
.human-onboard-file-picker.is-dragover .human-onboard-file-zone {
  border-color: rgba(96, 165, 250, 0.95);
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.9) 0%, rgba(30, 58, 138, 0.32) 100%);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}
.human-onboard-file-zone.has-file {
  border-style: solid;
  border-color: rgba(34, 197, 94, 0.55);
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.75) 0%, rgba(20, 83, 45, 0.18) 100%);
  padding: 14px 16px;
}
.human-onboard-file-picker.is-disabled .human-onboard-file-zone {
  pointer-events: none;
  opacity: 0.65;
  cursor: not-allowed;
}
.human-onboard-file-badge {
  display: grid;
  place-items: center;
  width: 44px;
  height: 52px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.9);
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.human-onboard-file-badge::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 14px;
  height: 14px;
  background: rgba(148, 163, 184, 0.25);
  border-bottom-left-radius: 4px;
}
.human-onboard-file-badge span {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #93c5fd;
}
.human-onboard-file-zone.has-file .human-onboard-file-badge {
  border-color: rgba(74, 222, 128, 0.45);
}
.human-onboard-file-zone.has-file .human-onboard-file-badge span {
  color: #86efac;
}
.human-onboard-file-prompt {
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
}
.human-onboard-file-sub {
  font-size: 11px;
  line-height: 1.4;
  color: #94a3b8;
  max-width: 280px;
}
.human-onboard-file-zone.has-file .human-onboard-file-sub,
.human-onboard-file-zone.has-file .human-onboard-file-cta {
  display: none;
}
.human-onboard-file-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #dbeafe;
  background: rgba(37, 99, 235, 0.35);
  border: 1px solid rgba(59, 130, 246, 0.5);
  pointer-events: none;
}
.human-onboard-file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-size: 11px;
  color: #94a3b8;
}
.human-onboard-file-meta.has-file {
  color: #cbd5e1;
  border-color: rgba(74, 222, 128, 0.35);
  background: rgba(20, 83, 45, 0.1);
}
.human-onboard-file-meta-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.5);
}
.human-onboard-file-meta.has-file .human-onboard-file-meta-dot {
  background: #4ade80;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.25);
}
.human-onboard-file-meta-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.human-onboard-file-meta:not(.has-file) .human-onboard-file-clear {
  display: none;
}
.human-onboard-file-clear {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #93c5fd;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.human-onboard-file-clear:hover {
  background: rgba(59, 130, 246, 0.15);
}
.human-onboard-file-clear:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.human-onboard-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 11px;
  color: #93c5fd;
  cursor: pointer;
  text-align: left;
  text-decoration: underline;
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

function showOnboardingSuccessCard(options: {
  card: HTMLElement;
  heading: string;
  copy: string;
  nodeId: string;
  passw: string;
  serverUrl: string;
  onContinue: () => void;
}): void {
  options.card.replaceChildren();
  const successHeading = document.createElement("h2");
  successHeading.textContent = options.heading;
  const successCopy = document.createElement("p");
  successCopy.textContent = options.copy;
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
  options.card.append(successHeading, successCopy, successActions);
  downloadBtn.addEventListener("click", () => {
    downloadHumanCredentialsJson({
      nodeId: options.nodeId,
      passw: options.passw,
      serverUrl: options.serverUrl,
    });
  });
  continueBtn.addEventListener("click", options.onContinue);
}

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
    overlay.className = "human-onboard-overlay";
    const card = document.createElement("div");
    card.className = "human-onboard-card";
    const err = document.createElement("div");
    err.className = "human-onboard-error";

    const renderCreateView = (): void => {
      card.replaceChildren();
      const heading = document.createElement("h2");
      heading.textContent = "Human node on player chain";
      const copy = document.createElement("p");
      copy.textContent =
        "Consent places a reusable main node for this browser tab. Your passphrase is generated locally; we hash it in the browser and send only that material to register the node (same rules as agent-play create-main-node). Save the passphrase and credentials before continuing.";
      const restoreLink = document.createElement("button");
      restoreLink.type = "button";
      restoreLink.className = "human-onboard-link";
      restoreLink.textContent =
        "Already have credentials.json? Restore your main node";
      const consentLabel = document.createElement("label");
      const consentBox = document.createElement("input");
      consentBox.type = "checkbox";
      const consentText = document.createElement("span");
      consentText.textContent =
        "I agree to create a main node for Agent Play World in this session.";
      consentLabel.append(consentBox, consentText);
      const phraseLabel = document.createElement("div");
      phraseLabel.style.fontSize = "11px";
      phraseLabel.style.color = "#94a3b8";
      phraseLabel.textContent = "Generated passphrase (save this once):";
      const phraseArea = document.createElement("textarea");
      phraseArea.readOnly = true;
      phraseArea.value = passw;
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
      card.append(
        heading,
        copy,
        restoreLink,
        consentLabel,
        phraseLabel,
        phraseArea,
        err,
        actions
      );

      restoreLink.addEventListener("click", () => {
        err.textContent = "";
        renderRestoreView();
      });

      skipBtn.addEventListener("click", () => {
        const sid = options.getSid();
        writeHumanCredentials({
          nodeId:
            sid !== null
              ? `session-${sid.slice(0, 12)}`
              : "preview-local-node",
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
              card,
              heading: "Main node created",
              copy: "Your node id is stored for this tab. Download credentials.json to keep a backup (includes your passphrase).",
              nodeId,
              passw,
              serverUrl,
              onContinue: () => {
                overlay.remove();
                resolve();
              },
            });
          } catch (e) {
            err.textContent =
              e instanceof Error ? e.message : "createHumanNode failed";
            setCreating(false);
          }
        })();
      });
    };

    const renderRestoreView = (): void => {
      card.replaceChildren();
      let uploadedJson: unknown = null;
      let uploadedFileName = "";
      const heading = document.createElement("h2");
      heading.textContent = "Restore main node";
      const copy = document.createElement("p");
      copy.textContent =
        "Upload credentials.json from agent-play create-main-node or a previous browser backup. We verify your passphrase locally, then confirm the main node exists on this server before reconnecting this tab.";
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
      connectBtn.textContent = "Connect";
      connectBtn.disabled = true;
      const connectLoading = document.createElement("div");
      connectLoading.className = "human-onboard-btn-loading";
      connectLoading.setAttribute("aria-hidden", "true");
      const connectSpinner = document.createElement("div");
      connectSpinner.className = "human-onboard-spinner";
      connectLoading.appendChild(connectSpinner);
      connectBtnWrap.append(connectBtn, connectLoading);
      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.className = "secondary";
      skipBtn.textContent = "Skip (limited intercom)";
      actions.append(backBtn, skipBtn, connectBtnWrap);
      card.append(heading, copy, filePicker, err, actions);

      fileInput.addEventListener("change", () => {
        err.textContent = "";
        const file = fileInput.files?.[0];
        if (file === undefined) {
          resetFileSelection();
          return;
        }
        applySelectedFile(file);
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
        renderCreateView();
      });

      skipBtn.addEventListener("click", () => {
        const sid = options.getSid();
        writeHumanCredentials({
          nodeId:
            sid !== null
              ? `session-${sid.slice(0, 12)}`
              : "preview-local-node",
          passw,
        });
        overlay.remove();
        resolve();
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
          skipBtn.disabled = busy;
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
              card,
              heading: "Main node restored",
              copy:
                uploadedFileName.length > 0
                  ? `Connected using ${uploadedFileName}. Your node id is stored for this tab.`
                  : "Your node id is stored for this tab.",
              nodeId: restored.nodeId,
              passw: parsed.passw,
              serverUrl,
              onContinue: () => {
                overlay.remove();
                resolve();
              },
            });
          } catch (e) {
            err.textContent =
              e instanceof Error ? e.message : "Restore failed";
            setConnecting(false);
          }
        })();
      });
    };

    overlay.append(card);
    document.body.append(overlay);
    renderCreateView();
  });
}
