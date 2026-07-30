export const resolvePortableTextLinkHref = (options: {
  value?: { href?: string } | null;
}): string => {
  const href = options.value?.href;
  if (typeof href !== "string" || href.trim().length === 0) {
    return "#";
  }

  const trimmed = href.trim();
  if (/^javascript:/i.test(trimmed)) {
    return "#";
  }

  return trimmed;
};
