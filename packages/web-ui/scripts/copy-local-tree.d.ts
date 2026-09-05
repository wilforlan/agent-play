export type CopyLocalTreeLog = (message: string) => void;

export type CopyFileFn = (from: string, to: string) => Promise<void>;

export type CopyLocalTreeStat = {
  size: number;
  blocks: number;
  mtimeMs: number;
};

export type StatFileFn = (path: string) => CopyLocalTreeStat;

export type CopyLocalTreeOptions = {
  src: string;
  dest: string;
  skipExtensions?: string[];
  copyTimeoutMs?: number;
  log?: CopyLocalTreeLog;
  copyFile?: CopyFileFn;
  statFile?: StatFileFn;
};

export type CopyLocalTreeResult = {
  copied: number;
  skipped: number;
  failed: number;
};

export function copyLocalTree(
  options: CopyLocalTreeOptions
): Promise<CopyLocalTreeResult>;
