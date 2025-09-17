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
    const baseStyles = [
      "inline-flex items-center justify-center gap-2",
      "font-medium transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "focus-visible:ring-[var(--ui-primary)] focus-visible:ring-offset-[var(--ui-bg)]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      full ? "w-full" : ""
    ].join(" ");

    const sizeStyles = {
      sm: "h-9 px-3 text-sm rounded-[var(--r-sm)]",
      md: "h-11 px-4 text-[15px] rounded-[var(--r-md)]",
      lg: "h-12 px-5 text-base rounded-[var(--r-md)]",
    };

    const variantStyles = {
      primary: [
        "bg-[var(--ui-primary)] text-white",
        "hover:bg-[var(--ui-primary-press)] active:bg-[var(--ui-primary-press)]",
        "disabled:hover:bg-[var(--ui-primary)]"
      ].join(" "),
      secondary: [
        "bg-[var(--ui-panel-2)] text-[var(--ui-text)]",
        "border border-[var(--ui-border)]",
        "hover:bg-[var(--ui-subtle)] active:bg-[var(--ui-ghost)]",
        "disabled:hover:bg-[var(--ui-panel-2)]"
      ].join(" "),
      subtle: [
        "bg-[var(--ui-subtle)] text-[var(--ui-text)]",
        "hover:bg-[var(--ui-panel-2)] active:bg-[var(--ui-ghost)]",
        "disabled:hover:bg-[var(--ui-subtle)]"
      ].join(" "),
      ghost: [
        "bg-transparent text-[var(--ui-text)]",
        "hover:bg-[var(--ui-ghost)] active:bg-[var(--ui-subtle)]",
        "disabled:hover:bg-transparent"
      ].join(" "),
      destructive: [
        "bg-[var(--ui-danger)] text-white",
        "hover:bg-[var(--ui-danger-press)] active:bg-[var(--ui-danger-press)]",
        "disabled:hover:bg-[var(--ui-danger)]"
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
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin motion-reduce:animate-none opacity-70" />
            <span className="opacity-70">{children}</span>
          </div>
        ) : (
          <span>{children}</span>
        )}
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";