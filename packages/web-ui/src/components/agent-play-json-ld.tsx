import {
  buildAgentPlayJsonLdGraph,
  resolveAgentPlayOrigin,
  serializeJsonLd,
} from "@/lib/agent-play-seo";

export const AgentPlayJsonLd = () => {
  const origin = resolveAgentPlayOrigin({
    envValue: process.env.NEXT_PUBLIC_SITE_ORIGIN,
  });
  const json = serializeJsonLd(buildAgentPlayJsonLdGraph({ origin }));

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
};
