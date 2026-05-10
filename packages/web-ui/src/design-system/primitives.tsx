"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from "react";

export function IosPanel({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={["ios-panel", className].filter(Boolean).join(" ")}>{children}</section>;
}

export function IosButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }
) {
  const { className, ...rest } = props;
  return <button {...rest} className={["ios-button", className].filter(Boolean).join(" ")} />;
}

export function IosInput(
  props: InputHTMLAttributes<HTMLInputElement> & { className?: string }
) {
  const { className, ...rest } = props;
  return <input {...rest} className={["ios-input", className].filter(Boolean).join(" ")} />;
}
