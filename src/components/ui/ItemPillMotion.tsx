import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ItemPill } from "./ItemPill";
import type { ItemPillProps } from "./ItemPill";

export interface ItemPillMotionProps extends ItemPillProps {
  motionVariant?: "slide" | "scale" | "fade" | "bounce";
  layout?: boolean;
  initial?: boolean;
}

const motionVariants = {
  slide: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
    transition: { type: "spring" as const, stiffness: 400, damping: 25 }
  },
  scale: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
    transition: { type: "spring" as const, stiffness: 400, damping: 25 }
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  bounce: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 },
    transition: { 
      type: "spring" as const, 
      stiffness: 500, 
      damping: 15,
      bounce: 0.6
    }
  }
};

const hoverVariants = {
  scale: 1.02,
  transition: { type: "spring" as const, stiffness: 400, damping: 25 }
};

const tapVariants = {
  scale: 0.98,
  transition: { type: "spring" as const, stiffness: 600, damping: 30 }
};

export const ItemPillMotion: React.FC<ItemPillMotionProps> = ({
  motionVariant = "scale",
  layout = false,
  initial = true,
  ...itemPillProps
}) => {
  const variant = motionVariants[motionVariant];

  return (
    <motion.div
      layout={layout}
      initial={initial ? variant.initial : false}
      animate={variant.animate}
      exit={variant.exit}
      transition={variant.transition}
      whileHover={hoverVariants}
      whileTap={tapVariants}
      style={{ display: "inline-block" }}
    >
      <ItemPill {...itemPillProps} />
    </motion.div>
  );
};

export const ItemPillList: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return (
    <motion.div 
      className={`flex flex-wrap gap-3 ${className}`}
      layout
    >
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </motion.div>
  );
};

// CSS-only motion helper classes for projects not using framer-motion
export const itemPillMotionClasses = {
  slideIn: "animate-[slideIn_0.3s_cubic-bezier(0.4,0,0.2,1)]",
  slideOut: "animate-[slideOut_0.3s_cubic-bezier(0.4,0,0.2,1)]",
  fadeIn: "animate-[fadeIn_0.2s_ease-out]",
  fadeOut: "animate-[fadeOut_0.2s_ease-in]",
  scaleIn: "animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]",
  scaleOut: "animate-[scaleOut_0.2s_ease-in]",
  bounce: "animate-[bounce_0.6s_cubic-bezier(0.68,-0.55,0.265,1.55)]",
  hover: "transition-transform duration-150 ease-out hover:scale-[1.02]",
  tap: "active:scale-[0.98] transition-transform duration-75"
};

ItemPillMotion.displayName = "ItemPillMotion";