"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

/**
 * Minimal toast system.
 *
 * Every mutation in the dashboard is optimistic or asynchronous, so success and
 * failure both need somewhere to surface that is not a blocking `alert()`.
 */

type ToastVariant = "success" | "error";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        // `polite` so a background success does not interrupt what the user is
        // reading, but is still announced.
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "animate-slide-up pointer-events-auto flex w-full max-w-sm items-start gap-3",
              "rounded-lg border p-3 shadow-lg",
              toast.variant === "success"
                ? "border-success/30 bg-success-soft text-success"
                : "border-danger/30 bg-danger-soft text-danger",
            )}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}

            <p className="flex-1 text-sm font-medium">{toast.message}</p>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside a <ToastProvider>.");
  }

  return context;
}
