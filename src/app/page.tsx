import { ArchitectureSection } from "@/components/landing/architecture-section";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { getSession } from "@/lib/auth";

/**
 * Landing page.
 *
 * Stays a server component so the session is resolved before anything renders —
 * a returning user sees "Open dashboard" in the first paint rather than the
 * signed-out CTA swapping under them. Only the animated sections opt into the
 * client bundle, and each receives the already-resolved boolean.
 */
export default async function HomePage() {
  const session = await getSession();
  const hasSession = session !== null;

  return (
    <div className="flex min-h-dvh flex-col">
      <LandingNav hasSession={hasSession} />

      <main className="flex-1">
        <LandingHero hasSession={hasSession} />
        <FeatureGrid />
        <ArchitectureSection />
      </main>

      <LandingFooter />
    </div>
  );
}
