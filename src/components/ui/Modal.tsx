import React, { useEffect } from "react";
import { Card } from "./Card";
import { Button } from "./Button";

type Size = "sm" | "md" | "lg";
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: Size;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  danger?: boolean;
}

const w: Record<Size, string> = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

export function Modal({ open, onClose, title, size="md", footer, children, danger=false }: ModalProps) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent){ if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className={`relative w-full ${w[size]}`}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--ui-border)]">
          <h3 className={`text-lg font-semibold ${danger ? "text-[var(--ui-danger)]" : ""}`}>{title}</h3>
          <Button variant="ghost" size="sm" aria-label="Close" onClick={onClose}>✕</Button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[var(--ui-border)]">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}
