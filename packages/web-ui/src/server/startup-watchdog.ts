export type StartupWatchdogLog = (message: string) => void;

export type StartStartupWatchdogOptions = {
  timeoutMs: number;
  log: StartupWatchdogLog;
};

export const startStartupWatchdog = (
  options: StartStartupWatchdogOptions
): (() => void) => {
  const { timeoutMs, log } = options;
  const timeoutId = setTimeout(() => {
    log(
      `[agent-play] debug: server did not become ready within ${timeoutMs / 1000}s. Copy scripts or Next.js compile may be stuck.`
    );
  }, timeoutMs);
  return () => {
    clearTimeout(timeoutId);
  };
};
