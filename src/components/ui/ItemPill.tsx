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
    "flex items-center gap-2 px-3 py-2",
    "rounded-[var(--r-lg)]",
    "border transition-all duration-150",
    "cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "focus-visible:ring-[var(--ui-primary)] focus-visible:ring-offset-[var(--ui-bg)]"
  ].join(" ");

  const stateStyles = selected
    ? "bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] hover:bg-[var(--ui-primary-press)]"
    : assigned
    ? "bg-[var(--ui-panel-2)] text-[var(--ui-text-dim)] border-[var(--ui-border)] opacity-60"
    : "bg-[var(--ui-panel)] text-[var(--ui-text)] border-[var(--ui-border)] hover:bg-[var(--ui-panel-2)] hover:border-[var(--ui-text-dim)]";

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
      <span className={`font-semibold ${selected ? "text-white" : "text-[var(--ui-text)]"}`} style={{fontVariantNumeric: 'tabular-nums'}}>
        ${price.toFixed(2)}
      </span>
    </motion.div>
  );
};

ItemPill.displayName = "ItemPill";