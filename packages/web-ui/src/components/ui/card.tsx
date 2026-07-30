import * as React from "react";

import { cn } from "@/lib/utils";

const Card = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "rounded-xl border border-[var(--blog-line)] bg-[var(--blog-paper)] text-[var(--blog-ink)] shadow-[var(--blog-shadow)]",
      className,
    )}
    {...props}
  />
);

const CardHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.ComponentProps<"h3">) => (
  <h3
    className={cn(
      "font-blog-display text-xl font-semibold tracking-tight",
      className,
    )}
    {...props}
  />
);

const CardDescription = ({ className, ...props }: React.ComponentProps<"p">) => (
  <p className={cn("text-sm text-[var(--blog-muted)]", className)} {...props} />
);

const CardContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);

const CardFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex items-center gap-3 p-6 pt-0", className)} {...props} />
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
