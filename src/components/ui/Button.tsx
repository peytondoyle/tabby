import React from "react";

type Variant = "primary" | "secondary" | "subtle" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  full?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    full = false,
    className = "",
    children,
    disabled,
    ...rest
  }, ref) => {
    // Base styles - consistent across all variants
    const baseStyles = [
      "inline-flex items-center justify-center",
      "font-medium transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "focus-visible:ring-primary",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "select-none whitespace-nowrap",
      full ? "w-full" : ""
    ].join(" ");

    // Size variants
    const sizeStyles = {
      sm: "h-8 px-3 text-sm gap-1.5 rounded-md",
      md: "h-9 px-4 text-sm gap-2 rounded-md",
      lg: "h-10 px-5 text-base gap-2 rounded-lg",
    };

    // Variant styles - using semantic tokens
    const variantStyles = {
      primary: [
        "bg-primary text-white",
        "hover:bg-primary-hover",
        "active:translate-y-px",
        "shadow-sm hover:shadow-md"
      ].join(" "),

      secondary: [
        "bg-bg-surface text-text-primary",
        "border-2 border-border-strong",
        "hover:bg-bg-hover hover:border-border-hover",
        "active:bg-bg-active",
        "shadow-sm hover:shadow-md"
      ].join(" "),

      subtle: [
        "bg-bg-subtle text-text-primary",
        "hover:bg-bg-muted",
        "active:bg-bg-active"
      ].join(" "),

      ghost: [
        "bg-transparent text-text-primary",
        "hover:bg-bg-hover",
        "active:bg-bg-active"
      ].join(" "),

      destructive: [
        "bg-danger text-white",
        "hover:bg-danger-hover",
        "active:translate-y-px",
        "shadow-sm hover:shadow-md"
      ].join(" "),
    };

    const classes = [
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      className
    ].join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...rest}
      >
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>{children}</span>
          </div>
        ) : (
          <>{children}</>
        )}
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
