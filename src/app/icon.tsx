import { ImageResponse } from "next/og";

/**
 * Brand favicon, generated at build time.
 *
 * The mark is the same Lucide `ShieldCheck` used in the navigation header, so
 * the browser tab and the app header cannot drift apart the way a hand-exported
 * `.ico` eventually does.
 *
 * Next.js statically optimizes this route — it renders once during `next build`
 * and is served as a cached PNG, so there is no per-request cost.
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** indigo-400 — the header's `text-indigo-400` against the dark nav. */
const MARK = "#818cf8";
const BACKDROP = "#090d16";

/**
 * The icon is drawn as a data-URI `<img>` rather than inline JSX `<svg>`.
 *
 * `ImageResponse` renders through Satori, whose inline-SVG support does not
 * cover stroke geometry reliably (`stroke-linecap`, `stroke-linejoin` and
 * non-scaling strokes in particular). Handing it a complete SVG document as an
 * image sidesteps that entirely and renders exactly like the header glyph.
 *
 * Stroke width is nudged from Lucide's 2 to 2.25: at 32px the default hairline
 * loses too much weight once antialiased.
 */
const SHIELD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${MARK}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BACKDROP,
          // Rounded square reads as an app mark at tab size, where a bare
          // glyph on transparency tends to look like a rendering glitch.
          borderRadius: 7,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(SHIELD_SVG)}`}
          alt=""
          width={21}
          height={21}
        />
      </div>
    ),
    size,
  );
}
