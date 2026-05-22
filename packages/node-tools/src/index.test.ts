import { describe, expect, it } from "vitest";
import {
  createNodeCredentialMaterial,
  deriveNodeIdFromMaterial,
  generateNodePassw,
  hashNodePassword,
  nodeCredentialFromHumanPhrase,
  nodeCredentialFromPasswHash,
  nodeCredentialsMaterialFromHumanPassphrase,
  normalizeNodePassphrase,
  verifyStoredNodeCredential,
} from "./index.js";
import { WORDLIST } from "./wordlist.js";

describe("@agent-play/node-tools", () => {
  const rootKey = "n1";

  it("nodeCredentialFromHumanPhrase hashes the phrase exactly once and derives a stable nodeId", () => {
    const phrase = "amber angle apple arch atlas aura autumn bamboo beacon birch";
    const a = nodeCredentialFromHumanPhrase({ phrase, rootKey });
    const b = nodeCredentialFromHumanPhrase({ phrase, rootKey });
    expect(a.nodeId).toBe(b.nodeId);
    expect(a.passwHash).toBe(hashNodePassword(normalizeNodePassphrase(phrase)));
    expect(a.passwHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.nodeId).toMatch(/^[0-9a-f]{64}$/);
    expect(a.phrase).toBe(normalizeNodePassphrase(phrase));
  });

  it("nodeCredentialFromHumanPhrase produces different nodeIds for different root keys", () => {
    const phrase = "amber angle apple arch atlas aura autumn bamboo beacon birch";
    const a = nodeCredentialFromHumanPhrase({ phrase, rootKey: "root-a" });
    const b = nodeCredentialFromHumanPhrase({ phrase, rootKey: "root-b" });
    expect(a.nodeId).not.toBe(b.nodeId);
    expect(a.passwHash).toBe(b.passwHash);
  });

  it("nodeCredentialFromPasswHash derives the same nodeId as nodeCredentialFromHumanPhrase", () => {
    const phrase = "amber angle apple arch atlas";
    const fromPhrase = nodeCredentialFromHumanPhrase({ phrase, rootKey });
    const fromHash = nodeCredentialFromPasswHash({
      passwHash: fromPhrase.passwHash,
      rootKey,
    });
    expect(fromHash.nodeId).toBe(fromPhrase.nodeId);
    expect(fromHash.passwHash).toBe(fromPhrase.passwHash);
  });

  it("createNodeCredentialMaterial generates a 10-word phrase and a matching nodeId", () => {
    const cred = createNodeCredentialMaterial({ rootKey });
    expect(cred.phrase.split(" ").length).toBe(10);
    expect(cred.passwHash).toBe(
      nodeCredentialsMaterialFromHumanPassphrase(cred.phrase)
    );
    expect(cred.nodeId).toBe(
      deriveNodeIdFromMaterial({ material: cred.passwHash, rootKey })
    );
  });

  it("createNodeCredentialMaterial returns a fresh phrase on each call", () => {
    const a = createNodeCredentialMaterial({ rootKey });
    const b = createNodeCredentialMaterial({ rootKey });
    expect(a.phrase).not.toBe(b.phrase);
    expect(a.nodeId).not.toBe(b.nodeId);
  });

  it("verifyStoredNodeCredential accepts hashed material that derives back to the same nodeId", () => {
    const cred = createNodeCredentialMaterial({ rootKey });
    expect(
      verifyStoredNodeCredential({
        nodeId: cred.nodeId,
        passwHash: cred.passwHash,
        rootKey,
      })
    ).toBe(true);
  });

  it("verifyStoredNodeCredential rejects a tampered nodeId", () => {
    const cred = createNodeCredentialMaterial({ rootKey });
    expect(
      verifyStoredNodeCredential({
        nodeId: "0".repeat(64),
        passwHash: cred.passwHash,
        rootKey,
      })
    ).toBe(false);
  });

  it("verifyStoredNodeCredential rejects an empty passwHash", () => {
    const cred = createNodeCredentialMaterial({ rootKey });
    expect(
      verifyStoredNodeCredential({
        nodeId: cred.nodeId,
        passwHash: "",
        rootKey,
      })
    ).toBe(false);
  });

  it("verifyStoredNodeCredential normalizes a mixed-case nodeId before comparing", () => {
    const cred = createNodeCredentialMaterial({ rootKey });
    expect(
      verifyStoredNodeCredential({
        nodeId: cred.nodeId.toUpperCase(),
        passwHash: cred.passwHash,
        rootKey,
      })
    ).toBe(true);
  });

  it("generateNodePassw returns ten words drawn from the bundled wordlist", () => {
    const p = generateNodePassw();
    const words = p.split(" ");
    expect(words.length).toBe(10);
    for (const w of words) {
      expect(WORDLIST.includes(w)).toBe(true);
    }
  });

  it("uses separate word list with 3000 entries", () => {
    expect(WORDLIST.length).toBe(3000);
    expect(new Set(WORDLIST).size).toBe(3000);
  });

  it("nodeCredentialsMaterialFromHumanPassphrase matches hashNodePassword on a normalized phrase", () => {
    const human = "  word1   word2  ";
    expect(nodeCredentialsMaterialFromHumanPassphrase(human)).toBe(
      hashNodePassword(normalizeNodePassphrase(human))
    );
  });
});
