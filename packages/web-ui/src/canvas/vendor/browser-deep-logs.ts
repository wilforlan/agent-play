import { getPreviewViewSettings } from "./preview-view-settings.js";

const PREFIX = "[agent-play:deep]";
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 40;
const MAX_OBJECT_KEYS = 80;
const MAX_TREE_NODES = 200;
const MAX_CHILDREN_PER_NODE = 50;

type TreeLikeNode = {
  label?: unknown;
  name?: unknown;
  id?: unknown;
  children?: unknown;
};

type SerializedTreeNode = {
  label: string;
  children: SerializedTreeNode[];
};

function safeLabel(node: TreeLikeNode): string {
  if (typeof node.label === "string" && node.label.length > 0) return node.label;
  if (typeof node.name === "string" && node.name.length > 0) return node.name;
  if (typeof node.id === "string" && node.id.length > 0) return node.id;
  return "node";
}

function serializeValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>
): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  if (depth >= MAX_DEPTH) {
    return "[MaxDepth]";
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => serializeValue(item, depth + 1, seen));
  }
  const out: Record<string, unknown> = {};
  const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
  for (const [k, v] of entries) {
    out[k] = serializeValue(v, depth + 1, seen);
  }
  return out;
}

function serializeTree(root: unknown): SerializedTreeNode | null {
  if (typeof root !== "object" || root === null) {
    return null;
  }
  const queue: Array<{ src: TreeLikeNode; dst: SerializedTreeNode }> = [];
  const out: SerializedTreeNode = {
    label: safeLabel(root as TreeLikeNode),
    children: [],
  };
  queue.push({ src: root as TreeLikeNode, dst: out });
  let count = 0;
  while (queue.length > 0 && count < MAX_TREE_NODES) {
    const current = queue.shift();
    if (current === undefined) break;
    count += 1;
    const childrenRaw = current.src.children;
    if (!Array.isArray(childrenRaw)) continue;
    const children = childrenRaw.slice(0, MAX_CHILDREN_PER_NODE);
    for (const child of children) {
      if (typeof child !== "object" || child === null) continue;
      const dstChild: SerializedTreeNode = {
        label: safeLabel(child as TreeLikeNode),
        children: [],
      };
      current.dst.children.push(dstChild);
      queue.push({ src: child as TreeLikeNode, dst: dstChild });
      if (count >= MAX_TREE_NODES) break;
    }
  }
  return out;
}

export function isDeepLogsEnabled(): boolean {
  return getPreviewViewSettings().deepLogsEnabled;
}

export function deepLogText(message: string, meta?: Record<string, unknown>): void {
  if (!isDeepLogsEnabled()) return;
  if (meta !== undefined) {
    console.info(`${PREFIX} ${message}`, meta);
    return;
  }
  console.info(`${PREFIX} ${message}`);
}

export function deepLogObject(label: string, value: unknown): void {
  if (!isDeepLogsEnabled()) return;
  const seen = new WeakSet<object>();
  console.info(`${PREFIX} ${label}`, serializeValue(value, 0, seen));
}

export function deepLogTree(label: string, root: unknown): void {
  if (!isDeepLogsEnabled()) return;
  console.info(`${PREFIX} ${label}`, serializeTree(root));
}
