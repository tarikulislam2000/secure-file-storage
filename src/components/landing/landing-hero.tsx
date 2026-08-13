"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import {
  IN_VIEW,
  RISE_TRANSITION,
  riseIn,
  stagger,
} from "@/components/landing/motion";
import { UploadPreview } from "@/components/landing/upload-preview";

/**
 * Hero.
 *
 * Deliberately pinned to a dark palette rather than the app's light/dark
 * tokens: the radial indigo glows only read as glows against a dark ground, and
 * a hero band that changes character with the OS theme would need two separate
 * designs to look right. The rest of the page follows the theme normally.
 */
export function LandingHero({ hasSession }: { hasSession: boolean }) {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950">
      <GlowBackdrop />

      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:py-28 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger(0.1)}
          className="flex flex-col items-start"
        >
          <motion.span
            variants={riseIn}
            transition={RISE_TRANSITION}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur"
          >
            <span aria-hidden>🚀</span>
            Built with Next.js 16, Prisma & AWS S3
          </motion.span>

          <motion.h1
            variants={riseIn}
            transition={RISE_TRANSITION}
            className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Large file storage that never{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              touches your server
            </span>
            .
          </motion.h1>

          <motion.p
            variants={riseIn}
            transition={RISE_TRANSITION}
            className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            Files stream straight from the browser to S3 with presigned URLs.
            Downloads are signed and expire. Share links can be revoked for good.
            The bucket is never public.
          </motion.p>

          <motion.div
            variants={riseIn}
            transition={RISE_TRANSITION}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href={hasSession ? "/dashboard" : "/register"}
              className="group inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-fuchsia-500 hover:shadow-indigo-500/40"
            >
              {hasSession ? "Open dashboard" : "Create free account"}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>

            {!hasSession && (
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-lg border border-white/15 bg-white/5 px-5 text-sm font-medium text-slate-200 backdrop-blur transition-colors hover:bg-white/10"
              >
                Sign in
              </Link>
            )}
          </motion.div>

          <motion.ul
            variants={riseIn}
            transition={RISE_TRANSITION}
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500"
          >
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-400" aria-hidden />
              Bucket blocks all public access
            </li>
            <li>1 GB free storage</li>
            <li>No credit card</li>
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={IN_VIEW}
          transition={{ ...RISE_TRANSITION, delay: 0.15 }}
        >
          <UploadPreview />
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Radial colour wash behind the hero.
 *
 * `aria-hidden` and `pointer-events-none` throughout — these are atmosphere,
 * and must never intercept a click meant for the CTA sitting above them.
 */
function GlowBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -top-40 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />
      <div className="absolute -right-24 top-24 size-[28rem] rounded-full bg-fuchsia-600/20 blur-[120px]" />
      <div className="absolute -bottom-32 left-0 size-[26rem] rounded-full bg-violet-700/20 blur-[110px]" />

      {/* Faint grid, masked so it fades out before the section edges. */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(148 163 184 / 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.15) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
        }}
      />
    </div>
  );
}
