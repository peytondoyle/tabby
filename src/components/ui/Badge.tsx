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
      "bg-bg-subtle text-text-primary",
      "border-border-default"
    ].join(" "),
    primary: [
      "bg-primary text-white",
      "border-primary"
    ].join(" "),
    success: [
      "bg-success text-white",
      "border-success"
    ].join(" "),
    danger: [
      "bg-danger text-white",
      "border-danger"
    ].join(" "),
    warning: [
      "bg-warning text-white",
      "border-warning"
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