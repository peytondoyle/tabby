import React from "react";
import { motion } from "framer-motion";
import { safeTransition } from "@/lib/motionUtils";
import { TextWithTooltip } from "./Tooltip";

export interface ItemPillProps {
  id: string;
  icon?: React.ReactNode;
  name: string;
  price: number;
  selected?: boolean;
  assigned?: boolean;
  onClick?: (id: string) => void;
}

export const ItemPill: React.FC<ItemPillProps> = ({
  id,
  icon,
  name,
  price,
  selected = false,
  assigned = false,
  onClick
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const baseStyles = [
    "flex items-center gap-3 px-4 py-3",
    "rounded-lg",
    "border transition-all duration-200 ease-out",
    "cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "focus-visible:ring-primary",
    "font-medium text-sm"
  ].join(" ");

  const stateStyles = selected
    ? "bg-primary text-white border-primary hover:bg-primary-hover shadow-md hover:shadow-lg scale-[1.02]"
    : assigned
    ? "bg-bg-subtle text-text-tertiary border-border-default opacity-50 cursor-not-allowed pointer-events-none"
    : "bg-white text-text-primary border-border-strong hover:bg-bg-hover hover:border-border-hover hover:shadow-sm shadow-xs";

  const classes = [baseStyles, stateStyles].join(" ");

  return (
    <motion.div
      className={classes}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={{
        scale: selected ? 1.05 : 1,
        y: selected ? -2 : 0,
      }}
      transition={safeTransition({
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.2,
      })}
    >
      {icon && (
        <span className="shrink-0 text-lg">
          {icon}
        </span>
      )}
      <span className="flex-1 font-medium">
        <TextWithTooltip maxLength={20} className="truncate">
          {name}
        </TextWithTooltip>
      </span>
      <span className={`font-semibold ${selected ? "text-white" : "text-text-primary"}`} style={{fontVariantNumeric: 'tabular-nums'}}>
        ${price.toFixed(2)}
      </span>
    </motion.div>
  );
};

ItemPill.displayName = "ItemPill";