"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blog-teal)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--blog-teal)] text-[var(--blog-paper)] hover:bg-[var(--blog-teal-soft)]",
        secondary:
          "border border-[var(--blog-line)] bg-[var(--blog-paper)] text-[var(--blog-ink)] hover:bg-[var(--blog-cream-deep)]",
        outline:
          "border border-[var(--blog-sage-soft)] bg-transparent text-[var(--blog-ink)] hover:border-[var(--blog-teal)] hover:text-[var(--blog-teal)]",
        ghost: "bg-transparent text-[var(--blog-ink-soft)] hover:bg-[var(--blog-cream-deep)] hover:text-[var(--blog-ink)]",
        hero:
          "border border-[rgba(248,244,236,0.55)] bg-[color-mix(in_srgb,var(--blog-honey)_82%,#1c241c)] text-[var(--blog-ink)] hover:border-[var(--blog-honey-soft)] hover:bg-[var(--blog-honey-soft)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
};

export { Button, buttonVariants };
