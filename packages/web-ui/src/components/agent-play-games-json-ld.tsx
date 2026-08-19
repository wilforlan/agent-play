import React from "react";

import {
  buildAgentPlayGamesJsonLd,
  resolveAgentPlayOrigin,
  serializeJsonLd,
} from "@/lib/agent-play-seo";

type AgentPlayGamesJsonLdProps = {
  slug: readonly string[];
};

export const AgentPlayGamesJsonLd = ({ slug }: AgentPlayGamesJsonLdProps) => {
  const origin = resolveAgentPlayOrigin({
    envValue: process.env.NEXT_PUBLIC_SITE_ORIGIN,
  });
  const json = serializeJsonLd(buildAgentPlayGamesJsonLd({ origin, slug }));

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
};
