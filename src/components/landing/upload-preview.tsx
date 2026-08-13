"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, FileVideo, Lock, ShieldCheck, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Animated mock of a live upload, shown beside the hero.
 *
 * Its job is to make the architecture legible in one glance: the three steps
 * are the three real stages of our upload flow (presign, direct PUT, confirm),
 * so a visitor sees how the product works before signing up.
 *
 * Hydration note: the render is a pure function of `progress`, which starts at
 * a fixed `0` and only moves inside an effect. The server and the first client
 * render therefore produce identical markup — no `Date.now()`, no `Math.random()`.
 */

const STEPS = [
  { label: "Presigned URL issued", threshold: 0 },
  { label: "Streaming direct to S3", threshold: 8 },
  { label: "Metadata committed", threshold: 100 },
] as const;

const TICK_MS = 90;
const STEP_PERCENT = 2;
const HOLD_TICKS = 18;

export function UploadPreview() {
  const reduceMotion = useReducedMotion();
  const [ticker, setTicker] = useState(0);

  // Derived, not stored: when the user has asked for reduced motion the mock
  // simply reads as finished. Deriving it keeps the effect free of a
  // synchronous setState, which would otherwise cause a cascading render.
  const progress = reduceMotion ? 100 : ticker;

  useEffect(() => {
    if (reduceMotion) return;

    let hold = 0;

    const timer = setInterval(() => {
      setTicker((current) => {
        if (current < 100) return Math.min(100, current + STEP_PERCENT);

        // Rest on "complete" for a beat, then run the cycle again.
        hold += 1;
        if (hold > HOLD_TICKS) {
          hold = 0;
          return 0;
        }
        return 100;
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [reduceMotion]);

  const complete = progress >= 100;

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
      <div className="rounded-xl border border-white/10 bg-slate-950/80">
        {/* Window chrome — signals "this is the product" without a screenshot. */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
          <p className="ml-2 text-xs font-medium text-slate-400">
            Upload · secure-file-storage
          </p>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                <FileVideo className="size-4" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">
                  q3-product-launch.mp4
                </p>
                <p className="text-xs text-slate-400">
                  84.2 MB ·{" "}
                  <span className={complete ? "text-emerald-400" : "text-indigo-300"}>
                    {complete ? "Uploaded" : `Uploading · ${progress}%`}
                  </span>
                </p>
              </div>

              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full transition-colors",
                  complete
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-indigo-500/20 text-indigo-300",
                )}
              >
                {complete ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <UploadCloud className="size-3.5" aria-hidden />
                )}
              </span>
            </div>

            <div
              // Exposed as a real progress bar so assistive tech reads the mock
              // as the status display it is imitating.
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Example upload progress"
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width,background-color] duration-100 ease-linear",
                  complete
                    ? "bg-emerald-400"
                    : "bg-gradient-to-r from-indigo-400 to-fuchsia-400",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ol className="space-y-2">
            {STEPS.map((step, index) => {
              const done = progress >= step.threshold && (index < 2 || complete);

              return (
                <li key={step.label} className="flex items-center gap-2.5 text-xs">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                      done
                        ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-400"
                        : "border-white/15 bg-white/5 text-slate-500",
                    )}
                  >
                    {done && <Check className="size-2.5" aria-hidden />}
                  </span>
                  <span className={done ? "text-slate-200" : "text-slate-500"}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3">
            <Badge icon={<Lock className="size-3" aria-hidden />}>Private</Badge>
            <Badge icon={<ShieldCheck className="size-3" aria-hidden />}>
              Signed URL
            </Badge>
            <Badge>video</Badge>
            <Badge>100 MB max</Badge>
          </div>
        </div>
      </div>

      {/* Floating accent chip — pure decoration, hidden from assistive tech. */}
      <motion.div
        aria-hidden
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        // Sits fully below the card (`top-full`) rather than overlapping its
        // corner, which would cover the badge row underneath.
        className="absolute left-4 top-full mt-4 hidden rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur lg:block"
      >
        <p className="text-[11px] font-medium text-slate-300">
          Server memory used
        </p>
        <p className="text-sm font-semibold text-emerald-400">0 bytes</p>
      </motion.div>
    </div>
  );
}

function Badge({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300">
      {icon}
      {children}
    </span>
  );
}
