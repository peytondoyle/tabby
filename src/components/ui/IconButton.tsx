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
      "border border-border-strong",
      "rounded-md",
      "transition-all duration-150 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "focus-visible:ring-primary",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
      "select-none"
    ].join(" ");

    const sizeStyles = {
      sm: "h-8 w-8 text-sm",
      md: "h-9 w-9 text-base"
    };

    const toneStyles = {
      neutral: [
        "bg-white text-text-secondary",
        "hover:bg-bg-hover hover:text-text-primary hover:border-border-hover",
        "active:bg-bg-active",
        "shadow-xs hover:shadow-sm",
        "disabled:hover:bg-white disabled:hover:text-text-secondary disabled:shadow-none"
      ].join(" "),
      danger: [
        "bg-white text-danger",
        "hover:bg-danger-light hover:border-danger",
        "active:bg-danger-light",
        "shadow-xs hover:shadow-sm",
        "disabled:hover:bg-white disabled:shadow-none"
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