import React from "react";

type Size = "sm" | "md" | "lg";

export interface AvatarProps {
  name: string;
  size?: Size;
  src?: string;
  alt?: string;
  className?: string;
}

const sizeStyles = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm", 
  lg: "h-12 w-12 text-base"
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getColorFromName = (name: string): string => {
  // Simple hash function to get consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use design system colors for consistency
  const colors = [
    "bg-[var(--ui-primary)]",
    "bg-[var(--ui-success)]", 
    "bg-[var(--ui-danger)]",
    "bg-[var(--ui-warning)]",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500"
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = "md",
  src,
  alt,
  className = ""
}) => {
  const initials = getInitials(name);
  const colorClass = getColorFromName(name);
  
  const classes = [
    "inline-flex items-center justify-center rounded-full font-medium text-white flex-shrink-0",
    sizeStyles[size],
    src ? "overflow-hidden" : colorClass,
    className
  ].join(" ");

  if (src) {
    return (
      <div className={`${classes} relative`}>
        <img
          src={src}
          alt={alt || name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={classes} title={name}>
      {initials}
    </div>
  );
};

Avatar.displayName = "Avatar";