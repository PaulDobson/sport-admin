"use client";

import { motion } from "framer-motion";
import {
  CreditCard,
  CalendarCheck,
  TrendingUp,
  Zap,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { featuresContent, type FeatureContent } from "./content";
import { useMotionPreferences } from "./use-motion-preferences";
import { FinancesIllustration } from "./illustrations/finances-illustration";
import { ReservationsIllustration } from "./illustrations/reservations-illustration";
import { TrackingIllustration } from "./illustrations/tracking-illustration";
import { TrainingToolsIllustration } from "./illustrations/training-tools-illustration";

const iconMap: Record<string, LucideIcon> = {
  CreditCard,
  CalendarCheck,
  TrendingUp,
  Zap,
};

const illustrationMap: Record<string, React.ComponentType> = {
  finances: FinancesIllustration,
  reservations: ReservationsIllustration,
  tracking: TrackingIllustration,
  "training-tools": TrainingToolsIllustration,
};

const accentMap: Record<
  FeatureContent["accent"],
  { bg: string; text: string; border: string; glow: string; badge: string }
> = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    glow: "from-primary/8",
    badge: "bg-primary/15 text-primary border-primary/25",
  },
  success: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/20",
    glow: "from-success/8",
    badge: "bg-success/15 text-success border-success/25",
  },
  info: {
    bg: "bg-info/10",
    text: "text-info",
    border: "border-info/20",
    glow: "from-info/8",
    badge: "bg-info/15 text-info border-info/25",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/20",
    glow: "from-warning/8",
    badge: "bg-warning/15 text-warning border-warning/25",
  },
};

export function FeaturesSection() {
  const { entrance } = useMotionPreferences();

  return (
    <section
      id="features"
      aria-label="Funcionalidades principales"
      className="relative py-20 sm:py-28"
    >
      {/* Section header */}
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <motion.div {...entrance()} className="mb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Funcionalidades
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Todo lo que necesitas,
            <br />
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              en un solo lugar
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Diseñado específicamente para instructores independientes que
            trabajan en múltiples locaciones y necesitan orden sin fricción.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid gap-8 lg:gap-12">
          {featuresContent.map((feature, idx) => {
            const isEven = idx % 2 === 0;
            const Icon = iconMap[feature.icon] ?? Zap;
            const Illustration =
              illustrationMap[feature.id] ?? FinancesIllustration;
            const accent = accentMap[feature.accent];

            return (
              <motion.div
                key={feature.id}
                {...entrance(0.05 * idx)}
                className={`relative grid gap-6 overflow-hidden rounded-2xl border border-white/8 bg-card sm:gap-8 lg:grid-cols-2 lg:items-center ${
                  isEven ? "" : "lg:[&>*:first-child]:order-2"
                }`}
              >
                {/* Accent glow */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.glow} via-transparent to-transparent`}
                />

                {/* Text content */}
                <div className="relative p-6 sm:p-8">
                  {/* Icon + tag */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-xl ${accent.bg}`}
                    >
                      <Icon
                        size={20}
                        aria-hidden="true"
                        className={accent.text}
                      />
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${accent.badge}`}
                    >
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-foreground sm:text-2xl">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-muted-foreground">
                    {feature.description}
                  </p>

                  {/* Feature list */}
                  <ul className="mt-5 flex flex-col gap-2.5" role="list">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CheckCircle2
                          size={16}
                          aria-hidden="true"
                          className={`mt-0.5 shrink-0 ${accent.text}`}
                        />
                        <span className="text-sm text-muted-foreground">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Illustration */}
                <div
                  className={`relative overflow-hidden ${
                    isEven
                      ? "border-t border-white/6 lg:border-l lg:border-t-0"
                      : "border-t border-white/6 lg:border-r lg:border-t-0"
                  } bg-surface-raised`}
                >
                  <Illustration />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
