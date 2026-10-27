import { loadOperationalContext } from "@/app/_lib/operational-context";
import {
  Hero,
  FeaturesSection,
  BenefitsSection,
  TestimonialsSection,
  FinalCta,
  LandingNavbar,
  LandingFooter,
} from "@/presentation/components/marketing";

export default async function HomePage() {
  const context = await loadOperationalContext();
  const hasActiveSession = context.status !== "unauthenticated";

  return (
    <>
      <LandingNavbar isLoggedIn={hasActiveSession} />
      <main
        id="main-content"
        className="min-h-screen bg-background text-foreground"
      >
        <Hero
          primaryHref={hasActiveSession ? "/dashboard" : undefined}
          primaryLabel={hasActiveSession ? "Ir a mi panel" : undefined}
        />
        <FeaturesSection />
        <BenefitsSection />
        <TestimonialsSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
