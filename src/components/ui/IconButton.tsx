import React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "neutral" | "danger";
  size?: "sm" | "md";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    tone = "neutral", 
    size = "md", 
    className = "", 
    children,
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = [
      "inline-grid place-items-center",
      "border border-[var(--ui-border)]",
      "rounded-[var(--r-md)]",
      "transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "focus-visible:ring-[var(--ui-primary)] focus-visible:ring-offset-[var(--ui-bg)]",
      "disabled:opacity-50 disabled:cursor-not-allowed"
    ].join(" ");

    const sizeStyles = {
      sm: "h-9 w-9",
      md: "h-10 w-10"
    };

    const toneStyles = {
      neutral: [
        "bg-[var(--ui-subtle)] text-[var(--ui-text)]",
        "hover:bg-[var(--ui-panel-2)] active:bg-[var(--ui-ghost)]",
        "disabled:hover:bg-[var(--ui-subtle)]"
      ].join(" "),
      danger: [
        "bg-[var(--ui-subtle)] text-[var(--ui-danger)]",
        "hover:bg-[var(--ui-panel-2)] active:bg-[var(--ui-ghost)]",
        "disabled:hover:bg-[var(--ui-subtle)]"
      ].join(" ")
    };

    const classes = [
      baseStyles,
      sizeStyles[size],
      toneStyles[tone],
      className
    ].join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";