import {
  PortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";
import React, { type ReactNode } from "react";

import { resolvePortableTextLinkHref } from "./blog-portable-text-utils";

export { resolvePortableTextLinkHref } from "./blog-portable-text-utils";

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="font-blog-display mt-9 mb-3.5 text-[clamp(1.55rem,2.6vw,1.9rem)] leading-snug font-semibold tracking-tight text-blog-ink">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-blog-display mt-7 mb-2.5 text-[clamp(1.25rem,2.1vw,1.45rem)] leading-snug font-semibold tracking-tight text-blog-ink">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="font-blog-display mt-6 mb-2 text-lg leading-snug font-semibold tracking-tight text-blog-ink">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-[3px] border-blog-honey py-0.5 pl-4 text-[1.12rem] leading-relaxed text-blog-ink italic">
        {children}
      </blockquote>
    ),
    normal: ({ children }) => (
      <p className="mb-4 text-[1.08rem] leading-[1.7] text-blog-ink-soft">{children}</p>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-5 list-disc pl-5 text-[1.05rem] leading-relaxed text-blog-ink-soft">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mb-5 list-decimal pl-5 text-[1.05rem] leading-relaxed text-blog-ink-soft">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="my-1.5">{children}</li>,
    number: ({ children }) => <li className="my-1.5">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => (
      <code className="rounded px-1.5 py-0.5 font-mono text-[0.92em] bg-[color-mix(in_srgb,var(--blog-sage-soft)_55%,var(--blog-paper))]">
        {children}
      </code>
    ),
    link: ({ children, value }) => {
      const href = resolvePortableTextLinkHref({ value });
      const isExternal = /^https?:\/\//i.test(href);
      return (
        <a
          href={href}
          className="text-blog-teal underline-offset-[0.15em] hover:text-blog-ink"
          {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {children}
        </a>
      );
    },
  },
};

type BlogPortableTextProps = {
  value: PortableTextBlock[];
};

export const BlogPortableText = ({ value }: BlogPortableTextProps): ReactNode => {
  if (value.length === 0) {
    return (
      <p className="mb-4 text-[1.08rem] leading-[1.7] text-blog-ink-soft">
        Content coming soon.
      </p>
    );
  }

  return <PortableText value={value} components={components} />;
};

export const toPortableTextBlocks = (body: unknown): PortableTextBlock[] => {
  if (!Array.isArray(body)) {
    return [];
  }

  return body.filter((item): item is PortableTextBlock => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    return "_type" in item && typeof item._type === "string";
  });
};
