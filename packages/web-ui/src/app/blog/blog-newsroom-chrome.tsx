import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type BlogNewsroomChromeProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/blog", label: "Newsroom", external: false },
  { href: "/", label: "Home", external: false },
  { href: "/doc", label: "Docs", external: false },
  { href: "/playground", label: "Playground", external: false },
  {
    href: "https://github.com/wilforlan/agent-play",
    label: "GitHub",
    external: true,
  },
] as const;

export const BlogNewsroomChrome = ({ children }: BlogNewsroomChromeProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--blog-line)] bg-[color-mix(in_srgb,var(--blog-cream)_90%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[var(--blog-max)] flex-col gap-3 px-[clamp(1.1rem,3vw,2.4rem)] py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-3.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link
              href="/"
              className="font-blog-display text-[clamp(1.35rem,2.4vw,1.75rem)] font-semibold tracking-tight text-blog-ink no-underline transition-colors hover:text-blog-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blog-teal"
              aria-label="Agent Play World home"
            >
              Agent Play World
            </Link>
            <p className="text-xs font-medium tracking-[0.14em] text-blog-muted uppercase">
              Newsroom
            </p>
          </div>
          <nav
            className="flex flex-wrap items-center gap-1 sm:justify-end"
            aria-label="Newsroom"
          >
            {navItems.map((item) =>
              item.external ? (
                <Button key={item.href} asChild variant="ghost" size="sm">
                  <a href={item.href} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                </Button>
              ) : (
                <Button key={item.href} asChild variant="ghost" size="sm">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ),
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
};
