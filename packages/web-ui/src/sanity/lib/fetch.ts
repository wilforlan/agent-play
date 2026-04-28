import type { ClientPerspective, QueryParams } from "next-sanity";
import { draftMode } from "next/headers";

import { client } from "@/sanity/lib/client";
import { token } from "@/sanity/lib/token";

export const sanityFetch = async <const QueryString extends string>({
  query,
  params = {},
  perspective: sourcePerspective,
  stega: sourceStega,
}: {
  query: QueryString;
  params?: QueryParams | Promise<QueryParams>;
  perspective?: Omit<ClientPerspective, "raw">;
  stega?: boolean;
}) => {
  let resolvedDraftMode: { isEnabled: boolean } = {
    isEnabled: sourcePerspective === "previewDrafts",
  };
  if (!sourcePerspective) {
    try {
      resolvedDraftMode = await draftMode();
    } catch {
      resolvedDraftMode = { isEnabled: false };
    }
  }
  const perspective = sourcePerspective || (resolvedDraftMode.isEnabled ? "previewDrafts" : "published");
  const stega =
    sourceStega || perspective === "previewDrafts" || process.env.VERCEL_ENV === "preview";

  if (perspective === "previewDrafts") {
    return client.fetch(query, await params, {
      stega,
      perspective: "previewDrafts",
      token,
      useCdn: false,
      next: { revalidate: 0 },
    });
  }

  return client.fetch(query, await params, {
    stega,
    perspective: "published",
    useCdn: true,
    next: { revalidate: 60 },
  });
};
