import { buildLlmsTxt, resolveAgentPlayOrigin } from "@/lib/agent-play-seo";

export function GET(): Response {
  const origin = resolveAgentPlayOrigin({
    envValue: process.env.NEXT_PUBLIC_SITE_ORIGIN,
  });

  return new Response(buildLlmsTxt({ origin }), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
