"use client";

import styles from "./scanner-page.module.css";

export type PageNumberToken = number | "ellipsis";

export const visiblePageNumbers = (input: {
  page: number;
  pageCount: number;
  window?: number;
}): PageNumberToken[] => {
  const pageCount = Math.max(0, Math.trunc(input.pageCount));
  if (pageCount <= 0) return [];
  const windowSize = input.window ?? 1;
  const current = Math.min(Math.max(1, Math.trunc(input.page)), pageCount);
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const nearStart = current <= 3;
  const nearEnd = current >= pageCount - 2;
  const start = nearStart
    ? 2
    : nearEnd
      ? Math.max(2, pageCount - 2)
      : Math.max(2, current - windowSize);
  const end = nearEnd
    ? pageCount - 1
    : nearStart
      ? Math.min(pageCount - 1, 3)
      : Math.min(pageCount - 1, current + windowSize);
  const tokens: PageNumberToken[] = [1];
  if (start > 2) tokens.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    tokens.push(page);
  }
  if (end < pageCount - 1) tokens.push("ellipsis");
  tokens.push(pageCount);
  return tokens;
};

export function ScannerPagination(input: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const { page, pageCount, onPageChange, disabled = false } = input;
  if (pageCount <= 1) return null;
  const tokens = visiblePageNumbers({ page, pageCount });

  return (
    <nav className={styles.pager} aria-label="Transaction pages">
      <button
        type="button"
        className={styles.pagerBtn}
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </button>
      {tokens.map((token, index) =>
        token === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className={styles.pagerEllipsis}>
            …
          </span>
        ) : (
          <button
            key={token}
            type="button"
            className={`${styles.pagerBtn} ${token === page ? styles.pagerBtnActive : ""}`}
            disabled={disabled}
            aria-current={token === page ? "page" : undefined}
            onClick={() => onPageChange(token)}
          >
            {token}
          </button>
        ),
      )}
      <button
        type="button"
        className={styles.pagerBtn}
        disabled={disabled || page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
