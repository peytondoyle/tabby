import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", children, ...props }, ref) => {
    const classes = [
      "rounded-[var(--r-lg)]",
      "border border-[var(--ui-border)]",
      "bg-[var(--ui-panel)]",
      "shadow-[var(--shadow-1)]",
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

Card.displayName = "Card";