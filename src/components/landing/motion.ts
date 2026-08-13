"use client";

import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion vocabulary for the landing page.
 *
 * Defining the curves and delays once keeps every section on the same rhythm —
 * the thing that separates a designed page from a pile of independently
 * animated components.
 */

export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];

/** Entrance used by hero content: rise and fade. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/** Parent that plays its children in sequence rather than all at once. */
export const stagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

export const RISE_TRANSITION: Transition = {
  duration: 0.6,
  ease: EASE_OUT,
};

/**
 * Shared `whileInView` config.
 *
 * `once` so sections settle after their first reveal instead of re-animating
 * every time the user scrolls back — replaying is distracting, not delightful.
 *
 * The asymmetric margin is load-bearing, not decoration. `whileInView` is backed
 * by an IntersectionObserver, which only reports *changes* in intersection. If
 * the viewport jumps past a section in a single frame — browser scroll
 * restoration on reload, the End key, a deep link — the section goes from
 * "below the viewport" to "above the viewport" without ever intersecting, the
 * callback never fires, and the content stays stuck at `opacity: 0` forever.
 *
 * Expanding the observer root far upward makes anything at or above the
 * viewport count as already seen, so a skipped section reveals immediately
 * instead of vanishing. The `-80px` bottom keeps the intended behaviour on the
 * way down: a section still waits until it is properly on screen.
 */
export const IN_VIEW = {
  once: true,
  margin: "9999px 0px -80px 0px",
} as const;
