/* eslint-disable react/button-has-type */
import clsx from "clsx";
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
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-2xl transition-colors focus-visible:outline-none focus-visible:[box-shadow:var(--ui-ring)] disabled:opacity-50 disabled:cursor-not-allowed";

const sizeMap: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-5 text-base",
};

const variantMap: Record<Variant, string> = {
  primary: "bg-[var(--ui-primary)] text-white hover:bg-[var(--ui-primary-press)]",
  secondary: "bg-[var(--ui-panel-2)] text-[var(--ui-text)] hover:bg-[var(--ui-subtle)] border border-[var(--ui-border)]",
  subtle: "bg-[var(--ui-subtle)] text-[var(--ui-text)] hover:bg-[var(--ui-panel-2)]",
  ghost: "bg-transparent text-[var(--ui-text)] hover:bg-[var(--ui-ghost)]",
  destructive: "bg-[var(--ui-danger)] text-white hover:bg-[var(--ui-danger-press)]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant="primary", size="md", loading, leftIcon, rightIcon, full, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(base, sizeMap[size], variantMap[variant], full && "w-full", className)}
        {...rest}
      >
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span className={clsx(loading && "opacity-70")}>{children}</span>
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";
