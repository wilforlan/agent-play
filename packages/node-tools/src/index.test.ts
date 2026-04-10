import { describe, expect, it } from "vitest";
import {
  createNodeCredentialFromPassw,
  createNodeCredentialFromSecret,
  deriveNodeIdFromPassword,
  derivePasswordFromSecret,
  generateNodePassw,
  hashNodePassword,
  nodeCredentialsMaterialFromHumanPassphrase,
  normalizeNodePassphrase,
  validateNodePassword,
} from "./index.js";
import { WORDLIST } from "./wordlist.js";

describe("@agent-play/node-tools", () => {
  const rootKey = "n1";

  it("derives stable node id from passphrase and root key", () => {
    const passw = "amber angle apple arch atlas aura autumn bamboo beacon birch blossom";
    const a = deriveNodeIdFromPassword({ password: passw, rootKey });
    const b = deriveNodeIdFromPassword({ password: passw, rootKey });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("derives different node ids when root keys differ", () => {
    const passw = "amber angle apple arch atlas aura autumn bamboo beacon birch blossom";
    const a = deriveNodeIdFromPassword({ password: passw, rootKey: "root-a" });
    const b = deriveNodeIdFromPassword({ password: passw, rootKey: "root-b" });
    expect(a).not.toBe(b);
  });

  it("validates passphrase against node id", () => {
    const passw = "amber angle apple arch atlas aura autumn bamboo beacon birch blossom";
    const nodeId = deriveNodeIdFromPassword({ password: passw, rootKey });
    expect(
      validateNodePassword({ nodeId, password: passw, rootKey })
    ).toBe(true);
    expect(
      validateNodePassword({ nodeId, password: "wrong phrase here", rootKey })
    ).toBe(false);
  });

  it("createNodeCredentialFromPassw matches deriveNodeIdFromPassword", () => {
    const passw = "amber angle apple arch atlas aura autumn bamboo beacon birch blossom";
    const c = createNodeCredentialFromPassw({ passw, rootKey });
    expect(c.nodeId).toBe(
      deriveNodeIdFromPassword({ password: c.passw, rootKey })
    );
  });

  it("createNodeCredentialFromSecret aligns password and node id", () => {
    const secretMaterial = Buffer.from("fixture-secret", "utf8");
    const passw = derivePasswordFromSecret({ secretMaterial, rootKey });
    const fromSecret = createNodeCredentialFromSecret({
      secretMaterial,
      rootKey,
    });
    expect(fromSecret.passw).toBe(passw);
    expect(fromSecret.nodeId).toBe(
      deriveNodeIdFromPassword({ password: passw, rootKey })
    );
  });

  it("generateNodePassw returns ten words", () => {
    const p = generateNodePassw();
    expect(p.split(" ").length).toBe(10);
  });

  it("uses separate word list with 3000 entries", () => {
    expect(WORDLIST.length).toBe(3000);
    expect(new Set(WORDLIST).size).toBe(3000);
  });

  it("nodeCredentialsMaterialFromHumanPassphrase matches hashNodePassword on normalized phrase", () => {
    const human = "  word1   word2  ";
    const material = nodeCredentialsMaterialFromHumanPassphrase(human);
    expect(material).toBe(
      hashNodePassword(normalizeNodePassphrase(human))
    );
  });

  it("deriveNodeIdFromPassword with material matches create-main-node style bootstrap", () => {
    const generatedPassw = generateNodePassw();
    const hashedPassw = hashNodePassword(generatedPassw);
    const fromBootstrap = deriveNodeIdFromPassword({
      password: hashedPassw,
      rootKey,
    });
    const fromSdkHelper = deriveNodeIdFromPassword({
      password: nodeCredentialsMaterialFromHumanPassphrase(generatedPassw),
      rootKey,
    });
    expect(fromSdkHelper).toBe(fromBootstrap);
  });

});
