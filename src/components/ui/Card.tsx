import React from "react";
import clsx from "clsx";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] shadow-[var(--shadow-1)]",
        className
      )}
      {...props}
    />
  );
}
