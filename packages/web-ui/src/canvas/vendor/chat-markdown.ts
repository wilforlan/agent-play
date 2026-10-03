/**
 * @module @agent-play/play-ui/chat-markdown
 * chat markdown — preview canvas module (Pixi + DOM).
 */
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true, async: false });

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "EM",
  "B",
  "I",
  "DEL",
  "S",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "CODE",
  "PRE",
  "H1",
  "H2",
  "H3",
  "H4",
  "A",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TH",
  "TD",
  "HR",
  "SPAN",
]);

const ALLOWED_ATTR = new Set(["href", "title", "class"]);
const DROP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "LINK",
  "META",
  "FORM",
  "INPUT",
  "BUTTON",
  "TEXTAREA",
  "SELECT",
]);

const isSafeHref = (value: string): boolean =>
  /^(https?:|mailto:|#|\/)/i.test(value.trim());

const sanitizeHtml = (html: string): string => {
  if (typeof document === "undefined") return "";
  const root = document.createElement("div");
  root.innerHTML = html;
  const walk = (parent: ParentNode): void => {
    for (const child of [...parent.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.parentNode?.removeChild(child);
        continue;
      }
      const el = child as Element;
      if (DROP_TAGS.has(el.nodeName)) {
        el.remove();
        continue;
      }
      if (!ALLOWED_TAGS.has(el.nodeName)) {
        while (el.firstChild !== null) {
          parent.insertBefore(el.firstChild, el);
        }
        el.remove();
        continue;
      }
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTR.has(name)) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (name === "href" && !isSafeHref(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }
      walk(el);
    }
  };
  walk(root);
  return root.innerHTML;
};

export function renderChatMarkdown(source: string): string {
  const out = marked(source, { async: false });
  if (typeof out !== "string") {
    return "";
  }
  return sanitizeHtml(out);
}
