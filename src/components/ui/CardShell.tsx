import React from "react";

export interface CardShellProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export const CardShell = React.forwardRef<HTMLDivElement, CardShellProps>(
  ({ className = "", children, ...props }, ref) => {
    const classes = [
      "rounded-[var(--radius-2xl)]",  // 20px for Billy delta
      "border border-border-default",
      "bg-bg-surface",
      "shadow-[var(--shadow-sm)]",  // Light shadow for Billy delta
      className
    ].join(" ");

    return (
      <div
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardShell.displayName = "CardShell";
