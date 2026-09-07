import { loadOperationalContext } from "@/app/_lib/operational-context";
import {
  BenefitsSection,
  FinalCta,
  Hero,
} from "@/presentation/components/marketing";

export default async function HomePage() {
  const context = await loadOperationalContext();
  const hasActiveSession = context.status !== "unauthenticated";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero
        primaryHref={hasActiveSession ? "/dashboard" : undefined}
        primaryLabel={hasActiveSession ? "Ir a mi panel" : undefined}
      />
      <BenefitsSection />
      <FinalCta />
    </main>
  );
}
