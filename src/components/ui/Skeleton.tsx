import React from "react";

export interface SkeletonProps {
  /** Width of skeleton - can be string (CSS) or number (px) */
  width?: string | number;
  /** Height of skeleton - can be string (CSS) or number (px) */
  height?: string | number;
  /** Border radius variant */
  radius?: "none" | "sm" | "md" | "lg" | "full";
  /** Whether to animate the skeleton */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Predefined skeleton types */
  variant?: "text" | "avatar" | "button" | "card" | "rectangle";
  /** Number of lines for text variant */
  lines?: number;
}

const radiusStyles = {
  none: "rounded-none",
  sm: "rounded-[var(--r-sm)]", 
  md: "rounded-[var(--r-md)]",
  lg: "rounded-[var(--r-lg)]",
  full: "rounded-full",
};

const variantDefaults = {
  text: {
    height: "1rem",
    radius: "sm" as const,
  },
  avatar: {
    width: "2.5rem",
    height: "2.5rem", 
    radius: "full" as const,
  },
  button: {
    width: "6rem",
    height: "2.5rem",
    radius: "md" as const,
  },
  card: {
    width: "100%",
    height: "12rem",
    radius: "lg" as const,
  },
  rectangle: {
    width: "100%",
    height: "1.5rem",
    radius: "sm" as const,
  },
};

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  radius = "sm",
  animate = true,
  className = "",
  variant,
  lines = 1,
}) => {
  // Apply variant defaults if variant is specified
  const defaults = variant ? variantDefaults[variant] : { width: undefined, height: undefined, radius: 'sm' as const };
  const finalWidth = width ?? (defaults as any).width ?? "100%";
  const finalHeight = height ?? defaults.height ?? "1rem";
  const finalRadius = defaults.radius ?? radius;

  const baseClasses = [
    "bg-[var(--ui-subtle)]",
    radiusStyles[finalRadius],
    animate ? "animate-pulse" : "",
    "motion-reduce:animate-none",
    className
  ].filter(Boolean).join(" ");

  const style: React.CSSProperties = {
    width: typeof finalWidth === "number" ? `${finalWidth}px` : finalWidth,
    height: typeof finalHeight === "number" ? `${finalHeight}px` : finalHeight,
  };

  // For text variant with multiple lines
  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={baseClasses}
            style={{
              ...style,
              // Make last line shorter to look more natural
              width: i === lines - 1 && typeof finalWidth === "string" && finalWidth === "100%" 
                ? "75%" 
                : style.width,
            }}
          />
        ))}
      </div>
    );
  }

  return <div className={baseClasses} style={style} />;
};

// Composite skeleton components for common patterns
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className }) => (
  <Skeleton variant="text" lines={lines} className={className} />
);

export const SkeletonAvatar: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "md", className }) => {
  const sizes = {
    sm: { width: "2rem", height: "2rem" },
    md: { width: "2.5rem", height: "2.5rem" },
    lg: { width: "3rem", height: "3rem" },
  };

  return (
    <Skeleton
      width={sizes[size].width}
      height={sizes[size].height}
      radius="full"
      className={className}
    />
  );
};

export const SkeletonCard: React.FC<{
  className?: string;
  showAvatar?: boolean;
}> = ({ className, showAvatar = true }) => (
  <div className={`p-4 bg-[var(--ui-panel)] rounded-[var(--r-lg)] border border-[var(--ui-border)] space-y-3 ${className || ""}`}>
    <div className="flex items-center gap-3">
      {showAvatar && <SkeletonAvatar />}
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height="1rem" />
        <Skeleton width="40%" height="0.75rem" />
      </div>
    </div>
    <SkeletonText lines={2} />
    <div className="flex gap-2 pt-2">
      <Skeleton variant="button" width="4rem" height="2rem" />
      <Skeleton variant="button" width="5rem" height="2rem" />
    </div>
  </div>
);

export const SkeletonList: React.FC<{
  items?: number;
  showAvatar?: boolean;
  className?: string;
}> = ({ items = 5, showAvatar = false, className }) => (
  <div className={`space-y-3 ${className || ""}`}>
    {Array.from({ length: items }, (_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-[var(--ui-panel)] rounded-[var(--r-md)] border border-[var(--ui-border)]">
        {showAvatar && <SkeletonAvatar />}
        <div className="flex-1 space-y-2">
          <Skeleton width="40%" height="1rem" />
          <Skeleton width="80%" height="0.75rem" />
        </div>
        <Skeleton width="3rem" height="1.5rem" />
      </div>
    ))}
  </div>
);

export const SkeletonButton: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "md", className }) => {
  const sizes = {
    sm: { width: "4rem", height: "2rem" },
    md: { width: "6rem", height: "2.5rem" },
    lg: { width: "8rem", height: "3rem" },
  };

  return (
    <Skeleton
      width={sizes[size].width}
      height={sizes[size].height}
      radius="md"
      className={className}
    />
  );
};

export const SkeletonPill: React.FC<{
  className?: string;
}> = ({ className }) => (
  <div className={`flex items-center gap-2 p-2 bg-[var(--ui-panel)] border border-[var(--ui-border)] rounded-[var(--r-lg)] ${className || ""}`}>
    <Skeleton width="1.5rem" height="1.5rem" radius="sm" />
    <Skeleton width="4rem" height="0.875rem" />
    <Skeleton width="2rem" height="0.875rem" />
  </div>
);

export const SkeletonTable: React.FC<{
  rows?: number;
  cols?: number;
  className?: string;
}> = ({ rows = 5, cols = 4, className }) => (
  <div className={`space-y-3 ${className || ""}`}>
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }, (_, i) => (
        <Skeleton key={`header-${i}`} width="60%" height="1rem" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }, (_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} width="80%" height="0.875rem" />
        ))}
      </div>
    ))}
  </div>
);

// Export all skeleton components
Skeleton.displayName = "Skeleton";
SkeletonText.displayName = "SkeletonText";
SkeletonAvatar.displayName = "SkeletonAvatar";
SkeletonCard.displayName = "SkeletonCard";
SkeletonList.displayName = "SkeletonList";
SkeletonButton.displayName = "SkeletonButton";
SkeletonPill.displayName = "SkeletonPill";
SkeletonTable.displayName = "SkeletonTable";