import React from "react";

import {
  buildAgentPlayGamesBreadcrumbJsonLd,
  resolveAgentPlayOrigin,
  serializeJsonLd,
} from "@/lib/agent-play-seo";

type AgentPlayGamesBreadcrumbJsonLdProps = {
  slug: readonly string[];
};

export const AgentPlayGamesBreadcrumbJsonLd = ({
  slug,
}: AgentPlayGamesBreadcrumbJsonLdProps) => {
  const origin = resolveAgentPlayOrigin({
    envValue: process.env.NEXT_PUBLIC_SITE_ORIGIN,
  });
  const json = serializeJsonLd(
    buildAgentPlayGamesBreadcrumbJsonLd({ origin, slug }),
  );

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
};
