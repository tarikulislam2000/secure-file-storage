"use client";

import { motion } from "framer-motion";
import { ArrowRight, Cloud, Database, Monitor } from "lucide-react";

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
  USER_STORAGE_QUOTA_BYTES,
} from "@/lib/constants";

/**
 * The upload lifecycle, drawn as the three hops it actually takes.
 *
 * This is the page's central technical claim — that file bytes bypass the
 * application server — so it gets a diagram rather than another paragraph.
 */
const STAGES = [
  {
    icon: Monitor,
    step: "01",
    title: "Client",
    subtitle: "Presign request",
    body: "The browser sends filename, size and type. The API authenticates the session, checks the size limit and quota, then signs a one-off URL scoped to a server-generated key.",
  },
  {
    icon: Cloud,
    step: "02",
    title: "AWS S3",
    subtitle: "Direct PUT",
    body: "The file body goes straight to the bucket over HTTPS with a progress bar. Content type is part of the signature, so the object cannot be stored as something else.",
  },
  {
    icon: Database,
    step: "03",
    title: "PostgreSQL",
    subtitle: "Confirmation",
    body: "The client returns a signed ticket. The API reads the object's real size and type back from S3 before recording it — an upload over the limit is deleted, not saved.",
  },
];

const METRICS = [
  { label: "Max file size", value: formatBytes(MAX_FILE_SIZE_BYTES) },
  { label: "Free storage", value: formatBytes(USER_STORAGE_QUOTA_BYTES) },
  { label: "Owner link TTL", value: `${DOWNLOAD_URL_TTL_SECONDS / 60} min` },
  { label: "Bytes through server", value: "0" },
];

export function ArchitectureSection() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-24">
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
            One upload, three hops.
          </motion.h2>

          <motion.p
            variants={riseIn}
            transition={RISE_TRANSITION}
            className="mt-3 max-w-2xl text-muted"
          >
            Routing a 100 MB body through a serverless function would blow past
            its request limit and its memory budget. So it never goes there.
          </motion.p>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
            {STAGES.map((stage, index) => (
              <motion.div
                key={stage.title}
                variants={riseIn}
                transition={RISE_TRANSITION}
                className="contents"
              >
                <article className="rounded-xl border border-border bg-background p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <stage.icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {stage.step}
                    </span>
                  </div>

                  <h3 className="mt-4 font-medium">{stage.title}</h3>
                  <p className="text-xs font-medium text-primary">
                    {stage.subtitle}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {stage.body}
                  </p>
                </article>

                {index < STAGES.length - 1 && (
                  <div
                    aria-hidden
                    className="flex items-center justify-center lg:px-1"
                  >
                    <ArrowRight className="size-5 rotate-90 text-muted lg:rotate-0" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <motion.dl
            variants={riseIn}
            transition={RISE_TRANSITION}
            className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4"
          >
            {METRICS.map((metric) => (
              <div key={metric.label} className="bg-background p-5">
                <dt className="text-xs text-muted">{metric.label}</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight">
                  {metric.value}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </div>
    </section>
  );
}
