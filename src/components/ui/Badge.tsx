import React from "react";

type Variant = "default" | "primary" | "success" | "danger" | "warning";
type Size = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
  dot?: boolean;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
  children,
  ...props
}) => {
  const baseStyles = [
    "inline-flex items-center justify-center font-medium",
    "rounded-full border",
    dot ? "w-2 h-2" : "px-2 py-1"
  ].join(" ");

  const sizeStyles = dot ? "" : {
    sm: "text-xs h-5 min-w-[1.25rem]",
    md: "text-sm h-6 min-w-[1.5rem] px-2.5"
  }[size];

  const variantStyles = {
    default: [
      "bg-[var(--ui-subtle)] text-[var(--ui-text)]",
      "border-[var(--ui-border)]"
    ].join(" "),
    primary: [
      "bg-[var(--ui-primary)] text-white",
      "border-[var(--ui-primary)]"
    ].join(" "),
    success: [
      "bg-[var(--ui-success)] text-white",
      "border-[var(--ui-success)]"
    ].join(" "),
    danger: [
      "bg-[var(--ui-danger)] text-white",
      "border-[var(--ui-danger)]"
    ].join(" "),
    warning: [
      "bg-[var(--ui-warning)] text-white",
      "border-[var(--ui-warning)]"
    ].join(" ")
  };

  const classes = [
    baseStyles,
    sizeStyles,
    variantStyles[variant],
    className
  ].filter(Boolean).join(" ");

  return (
    <span className={classes} {...props}>
      {!dot && children}
    </span>
  );
};

Badge.displayName = "Badge";