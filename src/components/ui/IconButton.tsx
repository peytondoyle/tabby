import React from "react";
import clsx from "clsx";

type Tone = "neutral" | "danger";
type Size = "sm" | "md";

export function IconButton({
  tone="neutral",
  size="md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: Size }) {
  const sizeCls = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const toneCls =
    tone === "danger"
      ? "bg-[var(--ui-subtle)] text-[var(--ui-danger)] hover:bg-[var(--ui-panel-2)]"
      : "bg-[var(--ui-subtle)] text-[var(--ui-text)] hover:bg-[var(--ui-panel-2)]";
  return (
    <button
      className={clsx(
        "inline-grid place-items-center rounded-xl border border-[var(--ui-border)] focus-visible:outline-none focus-visible:[box-shadow:var(--ui-ring)]",
        sizeCls,
        toneCls,
        className
      )}
      {...props}
    />
  );
}
