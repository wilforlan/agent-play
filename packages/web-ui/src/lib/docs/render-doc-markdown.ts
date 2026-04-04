import DOMPurify from "isomorphic-dompurify";
import { Marked } from "marked";
import { dirname, posix } from "node:path";

import { relativeMdToUrlSlugSegments } from "./slug-url";

function rewriteRelativeTarget(
  currentRelativeMd: string,
  rawTarget: string,
  docBasePath: string,
): string {
  const trimmed = rawTarget.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("#")) {
    return trimmed;
  }

  const hashIdx = trimmed.indexOf("#");
  const pathPart = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const hash = hashIdx >= 0 ? trimmed.slice(hashIdx) : "";

  const normalizedCurrent = currentRelativeMd.replace(/\\/g, "/");
  const dir = dirname(normalizedCurrent);
  const baseDir = dir === "." ? "" : dir;
  const resolved = posix
    .normalize(posix.join(baseDir || ".", pathPart))
    .replace(/^\.\//, "");

  let targetMd = resolved;
  if (!targetMd.endsWith(".md")) {
    targetMd = `${targetMd}.md`;
  }

  const segments = relativeMdToUrlSlugSegments(targetMd);
  const urlPath =
    segments.length === 0
      ? ""
      : `/${segments.map((s) => encodeURIComponent(s)).join("/")}`;
  return `${docBasePath}${urlPath}${hash}`;
}

export async function renderDocMarkdown(
  markdown: string,
  options: { currentRelativePath: string; docBasePath: string },
): Promise<string> {
  const { currentRelativePath, docBasePath } = options;
  const marked = new Marked();
  marked.use({
    gfm: true,
    walkTokens(token) {
      if (token.type === "link" && "href" in token && token.href) {
        const href = token.href;
        if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) {
          token.href = rewriteRelativeTarget(
            currentRelativePath,
            href,
            docBasePath,
          );
        }
      }
    },
  });
  const html = await marked.parse(markdown, { async: true });
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}
