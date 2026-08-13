"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Validation message; also flips the field into its error state. */
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  icon,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          >
            {icon}
          </span>
        )}

        <input
          id={inputId}
          // Screen readers announce the state and the reason, not just a red border.
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            "h-10 w-full rounded-lg border bg-surface px-3 text-sm",
            "placeholder:text-muted transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-60",
            icon && "pl-9",
            error
              ? "border-danger focus-visible:outline-[var(--danger)]"
              : "border-border",
            className,
          )}
          {...props}
        />
      </div>

      {(error || hint) && (
        <p
          id={messageId}
          className={cn("text-xs", error ? "text-danger" : "text-muted")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
