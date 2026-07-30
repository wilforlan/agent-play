import { Fraunces, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";

import "./blog-tokens.css";

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--blog-font-display",
  display: "swap",
});

const bodyFont = Source_Serif_4({
  subsets: ["latin"],
  variable: "--blog-font-body",
  display: "swap",
});

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${displayFont.variable} ${bodyFont.variable} blog-newsroom`}>
      {children}
    </div>
  );
}
