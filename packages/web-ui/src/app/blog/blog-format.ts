export const formatBlogPublishedAt = (publishedAt: string | null): string => {
  if (!publishedAt) {
    return "Draft";
  }

  return new Date(publishedAt).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const getTitleInitials = (title: string): string => {
  const words = title.trim().split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  const first = words[0][0] ?? "";
  const second = words[1][0] ?? "";
  return `${first}${second}`.toUpperCase();
};
