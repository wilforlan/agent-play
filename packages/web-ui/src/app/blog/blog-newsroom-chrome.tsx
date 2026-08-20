import Image from "next/image";
import Link from "next/link";
import React, { type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type BlogNewsroomChromeProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/", label: "Playworld" },
  { href: "/doc", label: "Documentation" },
  { href: "/agent-playground", label: "Playground" },
  { href: "/playground", label: "AQL Playground" },
] as const;

export const BlogNewsroomChrome = ({ children }: BlogNewsroomChromeProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--blog-line)] bg-[color-mix(in_srgb,var(--blog-cream)_90%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[var(--blog-max)] flex-col gap-3 px-[clamp(1.1rem,3vw,2.4rem)] py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-3.5">
          <Link
            href="/"
            className="inline-flex w-fit items-center no-underline transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blog-teal"
            aria-label="Agent Play World home"
          >
            <span className="relative h-8 w-8 overflow-hidden rounded-full">
              <Image
                src="/agent-play-logo.png"
                alt="Agent Play"
                width={32}
                height={32}
                className="h-full w-full object-cover"
                priority
              />
            </span>
          </Link>
          <nav
            className="flex flex-wrap items-center gap-1 sm:justify-end"
            aria-label="Primary"
          >
            {navItems.map((item) => (
              <Button key={item.href} asChild variant="ghost" size="sm">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
};
