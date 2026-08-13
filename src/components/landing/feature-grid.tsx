"use client";

import { motion } from "framer-motion";
import {
  Gauge,
  Link2Off,
  Lock,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";

import {
  IN_VIEW,
  RISE_TRANSITION,
  riseIn,
  stagger,
} from "@/components/landing/motion";
import {
  DOWNLOAD_URL_TTL_SECONDS,
  formatBytes,
  MAX_FILE_SIZE_BYTES,
  PUBLIC_DOWNLOAD_URL_TTL_SECONDS,
} from "@/lib/constants";

/**
 * Capability grid.
 *
 * The numbers are read from the same constants the API enforces, so the
 * marketing copy cannot quietly drift away from the limits actually applied.
 */
const FEATURES: {
  icon: LucideIcon;
  title: string;
  body: string;
  detail: string;
}[] = [
  {
    icon: UploadCloud,
    title: "Direct-to-S3 uploads",
    body: `Files up to ${formatBytes(MAX_FILE_SIZE_BYTES)} stream from the browser straight into the bucket. The API only issues the presigned URL — the bytes never pass through it.`,
    detail: "Zero server-side memory per upload",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: `The bucket blocks public access entirely. Every read is authorised first, then signed: ${DOWNLOAD_URL_TTL_SECONDS / 60} minutes for the owner, ${PUBLIC_DOWNLOAD_URL_TTL_SECONDS / 60} for a share link.`,
    detail: "Signed, expiring URLs",
  },
  {
    icon: Link2Off,
    title: "Revocable share links",
    body: "Making a file private rotates its share token, so a link already circulating is dead for good — it cannot be resurrected by publishing the file again.",
    detail: "Automatic token rotation",
  },
  {
    icon: Gauge,
    title: "Hardened access paths",
    body: "Passwords are hashed with bcrypt at cost 12, sessions are httpOnly JWTs, and auth endpoints are rate limited with identical timing for unknown and wrong-password logins.",
    detail: "Fixed-window rate limiting",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={IN_VIEW}
        variants={stagger(0.08)}
      >
        <motion.h2
          variants={riseIn}
          transition={RISE_TRANSITION}
          className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Built around how object storage actually works.
        </motion.h2>

        <motion.p
          variants={riseIn}
          transition={RISE_TRANSITION}
          className="mt-3 max-w-2xl text-muted"
        >
          Every decision here exists to keep large files off the application
          server and private data out of public URLs.
        </motion.p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <motion.article
              key={feature.title}
              variants={riseIn}
              transition={RISE_TRANSITION}
              whileHover={{ y: -5 }}
              className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <feature.icon className="size-5" aria-hidden />
              </span>

              <h3 className="mt-4 font-medium">{feature.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                {feature.body}
              </p>

              <p className="mt-4 border-t border-border pt-3 text-xs font-medium text-primary">
                {feature.detail}
              </p>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
