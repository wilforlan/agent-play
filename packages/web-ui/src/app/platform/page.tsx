"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { nodeCredentialsMaterialFromHumanPassphrase } from "@agent-play/node-tools/browser";
import { loginPlatform } from "./platform-api";
import { usePlatformAuth } from "./platform-auth-context";
import {
  isTenWordPassphrase,
  loadPlatformRememberPreview,
  type PlatformRememberPreview,
} from "./platform-session";
import styles from "./platform-admin.module.css";

export default function PlatformLoginPage() {
  const router = useRouter();
  const { auth, setAuth, rememberAuth } = usePlatformAuth();
  const rootKeyEnv = process.env.NEXT_PUBLIC_AGENT_PLAY_ROOT_KEY?.trim() ?? "";

  const [serverUrl, setServerUrl] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [platformKey, setPlatformKey] = useState("");
  const [preview, setPreview] = useState<PlatformRememberPreview | null>(null);
  const [resumeMode, setResumeMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth !== null) {
      router.replace("/platform/overview");
    }
  }, [auth, router]);

  useEffect(() => {
    const resolved =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : "";
    setServerUrl((previous) => (previous.trim() !== "" ? previous : resolved));
    setPreview(loadPlatformRememberPreview());
  }, []);

  const completeLogin = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      if (!rootKeyEnv) {
        setError("Set NEXT_PUBLIC_AGENT_PLAY_ROOT_KEY (same genesis root as this deployment).");
        return;
      }
      if (!isTenWordPassphrase(passphrase)) {
        setError("Passphrase must be exactly 10 words.");
        return;
      }
      const material = nodeCredentialsMaterialFromHumanPassphrase(passphrase);
      const nextAuth = await loginPlatform({
        serverUrl: resumeMode && preview !== null ? preview.serverUrl : serverUrl,
        nodeId: resumeMode && preview !== null ? preview.nodeId : nodeId,
        passphraseMaterial: material,
        rootKey: rootKeyEnv,
        platformServiceKey: platformKey,
      });
      setAuth(nextAuth);
      rememberAuth(nextAuth);
      setPassphrase("");
      router.push("/platform/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.panel}>
        <h1 className={styles.title}>Space owner platform</h1>
        <p className={styles.lead}>
          Authenticate with your space node id and ten-word passphrase. Purchases, amenities, and
          activity use the same sdk/rpc paths as the playground AQL runtime.
        </p>

        {preview !== null && !resumeMode ? (
          <div className={styles.resumeCard}>
            <p className={styles.lead}>
              Resume <strong>{preview.spaceName}</strong> ({preview.nodeId})
              <br />
              Last signed in {new Date(preview.lastAuthenticatedAt).toLocaleString()}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={[styles.button, styles.buttonPrimary].join(" ")}
                onClick={() => setResumeMode(true)}
              >
                Resume
              </button>
            </div>
          </div>
        ) : null}

        {resumeMode && preview !== null ? (
          <p className={styles.lead}>
            Resuming <strong>{preview.spaceName}</strong>. Re-enter your passphrase to continue.
          </p>
        ) : null}

        {!resumeMode ? (
          <>
            <div className={styles.field}>
              <label htmlFor="pf-server">Server URL</label>
              <input
                id="pf-server"
                className={styles.input}
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="pf-node">Space node id</label>
              <input
                id="pf-node"
                className={styles.input}
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                autoComplete="off"
              />
            </div>
          </>
        ) : null}

        <div className={styles.field}>
          <label htmlFor="pf-pass">Ten-word passphrase</label>
          <textarea
            id="pf-pass"
            className={styles.textarea}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="pf-key">Platform key (optional)</label>
          <input
            id="pf-key"
            className={styles.input}
            value={platformKey}
            onChange={(e) => setPlatformKey(e.target.value)}
            placeholder="Required when AGENT_SERVICE_KEY is set on server"
            autoComplete="off"
          />
        </div>
        {error !== null ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions}>
          <button
            type="button"
            className={[styles.button, styles.buttonPrimary].join(" ")}
            onClick={() => void completeLogin()}
            disabled={busy}
          >
            {busy ? "Signing in…" : resumeMode ? "Resume session" : "Sign in"}
          </button>
          {resumeMode ? (
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setResumeMode(false);
                setPassphrase("");
              }}
            >
              Use different account
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
