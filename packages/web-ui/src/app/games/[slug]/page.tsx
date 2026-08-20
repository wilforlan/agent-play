import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAgentPlayGamesPageMetadata } from "@/lib/agent-play-seo";

import { AgentPlayGamesDetail } from "../agent-play-games-detail";
import {
  getAgentPlayGamePage,
  listAgentPlayGameSlugs,
} from "../agent-play-games-content";

type AgentPlayGameSlugPageProps = {
  params: Promise<{ slug: string }>;
};

export const generateStaticParams = (): { slug: string }[] => {
  return listAgentPlayGameSlugs().map((slug) => ({ slug }));
};

export const generateMetadata = async (
  props: AgentPlayGameSlugPageProps,
): Promise<Metadata> => {
  const { slug } = await props.params;
  return buildAgentPlayGamesPageMetadata({ slug: [slug] });
};

export default async function AgentPlayGameSlugPage(
  props: AgentPlayGameSlugPageProps,
) {
  const { slug } = await props.params;
  const page = getAgentPlayGamePage(slug);
  if (page === undefined) {
    notFound();
  }
  return <AgentPlayGamesDetail page={page} />;
}
