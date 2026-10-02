/**
 * Shared Finance Hub / P2P prompts for education purchase modals.
 */

export const EDUCATION_FINANCE_HUB_URL = "https://econext.llc";
export const EDUCATION_P2P_URL = "https://p2p.econext.llc";

export const shouldShowEducationFinanceHubCta = (input: {
  canAfford: boolean;
  errorMessage?: string | null;
}): boolean => {
  if (!input.canAfford) {
    return true;
  }
  const message = input.errorMessage ?? "";
  return /insufficient|not enough|need\s+.*apu|funds/i.test(message);
};

export const educationFinanceHubPromptCopy = (input: {
  powerUps: number;
}): string => {
  if (input.powerUps <= 0) {
    return "Your wallet has 0 APU. Trade on Finance Hub or find a peer on P2P.";
  }
  return "Not enough balance. Trade on Finance Hub or find a peer on P2P.";
};

export const mountEducationFinanceHubCta = (options: {
  container: HTMLElement;
  powerUps: number;
  visible: boolean;
}): void => {
  const { container, powerUps, visible } = options;
  container.replaceChildren();
  container.hidden = !visible;
  if (!visible) {
    return;
  }

  const prompt = document.createElement("p");
  prompt.className = "preview-education-finance-hub__prompt";
  prompt.textContent = educationFinanceHubPromptCopy({ powerUps });

  const links = document.createElement("div");
  links.className = "preview-education-finance-hub__links";

  const financeLink = document.createElement("a");
  financeLink.href = EDUCATION_FINANCE_HUB_URL;
  financeLink.target = "_blank";
  financeLink.rel = "noopener noreferrer";
  financeLink.className = "preview-education-finance-hub__link";
  financeLink.textContent = "Finance Hub";

  const or = document.createElement("span");
  or.className = "preview-education-finance-hub__or";
  or.textContent = "or";

  const p2pLink = document.createElement("a");
  p2pLink.href = EDUCATION_P2P_URL;
  p2pLink.target = "_blank";
  p2pLink.rel = "noopener noreferrer";
  p2pLink.className = "preview-education-finance-hub__link";
  p2pLink.textContent = "Find a peer to trade";

  links.append(financeLink, or, p2pLink);
  container.append(prompt, links);
};

export const educationFinanceHubCtaStyles = (panelClass: string): string => `
.${panelClass}__finance-hub {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 12px 12px 10px;
  border-radius: 12px;
  border: 1px solid rgba(185, 28, 28, 0.28);
  background: #fff7ed;
  text-align: center;
}
.${panelClass}__finance-hub[hidden] {
  display: none;
}
.${panelClass}__finance-hub .preview-education-finance-hub__prompt {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: #9a3412;
}
.${panelClass}__finance-hub .preview-education-finance-hub__links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  justify-content: center;
}
.${panelClass}__finance-hub .preview-education-finance-hub__or {
  font-size: 11px;
  color: #9a3412;
}
.${panelClass}__finance-hub .preview-education-finance-hub__link {
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  text-decoration: underline;
}
.${panelClass}__finance-hub .preview-education-finance-hub__link:hover {
  color: #1e40af;
}
`;
