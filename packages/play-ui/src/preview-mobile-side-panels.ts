import {
  nextSidePanelState,
  type SidePanelOpen,
} from "./preview-side-panel-state.js";

const WIDE_SCREEN_QUERY = "(min-width: 1024px)";

export function attachMobileSidePanelControls(options: {
  shell: HTMLElement;
  toggleLeft: HTMLButtonElement;
  toggleRight: HTMLButtonElement;
  backdrop: HTMLButtonElement;
}): void {
  let sideOpen: SidePanelOpen = "none";
  const mq = window.matchMedia(WIDE_SCREEN_QUERY);

  const syncShellClasses = () => {
    const mobile = !mq.matches;
    options.shell.classList.toggle(
      "preview-side-left-open",
      mobile && sideOpen === "left"
    );
    options.shell.classList.toggle(
      "preview-side-right-open",
      mobile && sideOpen === "right"
    );
  };

  const syncAria = () => {
    const mobile = !mq.matches;
    options.toggleLeft.setAttribute(
      "aria-expanded",
      mobile && sideOpen === "left" ? "true" : "false"
    );
    options.toggleRight.setAttribute(
      "aria-expanded",
      mobile && sideOpen === "right" ? "true" : "false"
    );
  };

  const apply = () => {
    syncShellClasses();
    syncAria();
  };

  const onMqChange = () => {
    if (mq.matches) {
      sideOpen = "none";
    }
    apply();
  };

  mq.addEventListener("change", onMqChange);

  options.toggleLeft.addEventListener("click", () => {
    sideOpen = nextSidePanelState(sideOpen, "left");
    apply();
  });
  options.toggleRight.addEventListener("click", () => {
    sideOpen = nextSidePanelState(sideOpen, "right");
    apply();
  });
  options.backdrop.addEventListener("click", () => {
    sideOpen = "none";
    apply();
  });

  apply();
}
