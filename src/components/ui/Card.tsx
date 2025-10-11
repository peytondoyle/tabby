import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", children, ...props }, ref) => {
    const classes = [
      "rounded-xl",
      "border border-border-default",
      "bg-bg-surface",
      "text-text-primary",
      "shadow-sm",
      "transition-all duration-200 ease-out",
      "hover:shadow-md hover:border-border-strong",
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