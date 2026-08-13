"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Dialog shell built on the native `<dialog>` element, which gives focus
 * trapping, `Esc` to close and inert background content for free — all things
 * a hand-rolled div modal has to reimplement and usually gets wrong.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Keep the page behind the dialog from scrolling underneath it.
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      // `cancel` covers Esc, which would otherwise close the dialog without
      // telling React, leaving `open` stuck at true.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      // Clicking the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="modal-title"
      className={cn(
        "m-auto w-[calc(100vw-2rem)] max-w-lg rounded-xl border border-border",
        "bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50",
        "animate-slide-up open:flex open:flex-col",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="min-w-0">
          <h2 id="modal-title" className="text-base font-semibold">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="-m-1 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}
