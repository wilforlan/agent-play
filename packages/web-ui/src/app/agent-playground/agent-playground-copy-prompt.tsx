"use client";

import React, { useState } from "react";

import { AGENT_PLAYGROUND_AGENT_PROMPT } from "./agent-playground-content";
import styles from "./agent-playground.module.css";

export function AgentPlaygroundCopyPrompt() {
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    if (navigator.clipboard?.writeText === undefined) {
      return;
    }
    await navigator.clipboard.writeText(AGENT_PLAYGROUND_AGENT_PROMPT);
    setCopied(true);
  };

  return (
    <div className={styles.card}>
      <div className={styles.promptHead}>
        <h3 className={styles.cardTitle}>Agent Prompt</h3>
        <button type="button" className={styles.copyBtn} onClick={() => void copyPrompt()}>
          {copied ? "Copied" : "Copy Prompt"}
        </button>
      </div>
      <pre className={styles.codeBlock}>{AGENT_PLAYGROUND_AGENT_PROMPT}</pre>
    </div>
  );
}
