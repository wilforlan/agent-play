export type CopyLocalTreeLog = (message: string) => void;

export type CopyFileFn = (from: string, to: string) => Promise<void>;

export type CopyLocalTreeOptions = {
  src: string;
  dest: string;
  skipExtensions?: string[];
  copyTimeoutMs?: number;
  log?: CopyLocalTreeLog;
  copyFile?: CopyFileFn;
};

export type CopyLocalTreeResult = {
  copied: number;
  skipped: number;
  failed: number;
};

export function copyLocalTree(
  options: CopyLocalTreeOptions
): Promise<CopyLocalTreeResult>;
