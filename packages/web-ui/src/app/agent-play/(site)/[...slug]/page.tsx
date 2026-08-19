import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgentPlayBreadcrumbJsonLd } from "@/components/agent-play-breadcrumb-json-ld";
import { buildAgentPlayMarketplaceMetadata } from "@/lib/agent-play-seo";

import {
  AGENT_PLAY_SITE_PAGES,
  getAgentPlaySitePage,
} from "../agent-play-content";
import { AgentPlaySubpage } from "../agent-play-subpage";

type AgentPlaySlugPageProps = {
  params: Promise<{ slug: string[] }>;
};

export const generateStaticParams = (): { slug: string[] }[] => {
  return AGENT_PLAY_SITE_PAGES.map((page) => ({ slug: [...page.path] }));
};

export const generateMetadata = async ({
  params,
}: AgentPlaySlugPageProps): Promise<Metadata> => {
  const { slug } = await params;
  return buildAgentPlayMarketplaceMetadata({ path: slug });
};

export default async function AgentPlaySlugPage({
  params,
}: AgentPlaySlugPageProps) {
  const { slug } = await params;
  const page = getAgentPlaySitePage(slug);
  if (page === undefined) {
    notFound();
  }
  return (
    <>
      <AgentPlayBreadcrumbJsonLd path={page.path} />
      <AgentPlaySubpage page={page} />
    </>
  );
}
