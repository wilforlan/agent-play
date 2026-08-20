import {
  buildAgentPlayBreadcrumbJsonLd,
  resolveAgentPlayOrigin,
  serializeJsonLd,
} from "@/lib/agent-play-seo";

type AgentPlayBreadcrumbJsonLdProps = {
  path: readonly string[];
};

export const AgentPlayBreadcrumbJsonLd = ({
  path,
}: AgentPlayBreadcrumbJsonLdProps) => {
  const origin = resolveAgentPlayOrigin({
    envValue: process.env.NEXT_PUBLIC_SITE_ORIGIN,
  });
  const json = serializeJsonLd(
    buildAgentPlayBreadcrumbJsonLd({ origin, path }),
  );

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
};
