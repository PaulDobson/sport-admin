"use client";

import { motion } from "framer-motion";
import type { ComponentType } from "react";
import { benefitsContent, type BenefitContent } from "./content";
import {
  FinancialControlIllustration,
  GrowthOpportunityIllustration,
  StudentVisibilityIllustration,
} from "./illustrations";
import { useMotionPreferences } from "./use-motion-preferences";

const illustrationByBenefit: Record<BenefitContent["id"], ComponentType> = {
  "financial-control": FinancialControlIllustration,
  "student-visibility": StudentVisibilityIllustration,
  "growth-opportunity": GrowthOpportunityIllustration,
};

export function BenefitsSection() {
  const { entrance } = useMotionPreferences();

  return (
    <section
      aria-label="Beneficios de una buena gestión"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-8"
    >
      <div className="grid gap-6 sm:grid-cols-3">
        {benefitsContent.map((benefit, index) => {
          const Illustration = illustrationByBenefit[benefit.id];
          return (
            <motion.article
              key={benefit.id}
              {...entrance(index * 0.1)}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="h-24 w-24">
                <Illustration />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                {benefit.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {benefit.description}
              </p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
