import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AGENT_PLAY_BRAND,
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
  const page = getAgentPlaySitePage(slug);
  if (page === undefined) {
    return { title: `${AGENT_PLAY_BRAND.name}` };
  }
  return {
    title: `${page.title} — ${AGENT_PLAY_BRAND.name}`,
    description: page.lead,
  };
};

export default async function AgentPlaySlugPage({
  params,
}: AgentPlaySlugPageProps) {
  const { slug } = await params;
  const page = getAgentPlaySitePage(slug);
  if (page === undefined) {
    notFound();
  }
  return <AgentPlaySubpage page={page} />;
}
