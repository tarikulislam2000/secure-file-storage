import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Secure File Storage",
    // Pages set only their own name; the product name is appended here.
    template: "%s · Secure File Storage",
  },
  description:
    "Private file storage with direct-to-S3 uploads, time-limited download links and revocable public sharing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Entrance animations render their initial `opacity: 0` into the HTML,
          which without JavaScript would never be animated away — leaving the
          landing page mostly blank. A stylesheet `!important` outranks a
          non-important inline style, so this restores the content for readers
          without JS while costing nothing to everyone else.
        */}
        <noscript>
          <style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
