"use client";

import { motion } from "framer-motion";
import { DollarSign, Users, BarChart3 } from "lucide-react";
import { benefitsContent, type BenefitContent } from "./content";
import { useMotionPreferences } from "./use-motion-preferences";

const iconMap: Record<
  BenefitContent["id"],
  {
    Icon: React.ComponentType<{
      size?: number;
      className?: string;
      "aria-hidden"?: boolean;
    }>;
    accent: { bg: string; text: string; glow: string };
  }
> = {
  "financial-control": {
    Icon: DollarSign,
    accent: {
      bg: "bg-success/12",
      text: "text-success",
      glow: "shadow-success/15",
    },
  },
  "student-visibility": {
    Icon: Users,
    accent: {
      bg: "bg-primary/12",
      text: "text-primary",
      glow: "shadow-primary/15",
    },
  },
  "growth-opportunity": {
    Icon: BarChart3,
    accent: {
      bg: "bg-info/12",
      text: "text-info",
      glow: "shadow-info/15",
    },
  },
};

export function BenefitsSection() {
  const { entrance } = useMotionPreferences();

  return (
    <section
      id="benefits"
      aria-label="Por qué elegir Sport Admin"
      className="relative py-20 sm:py-24"
    >
      {/* Subtle divider glow */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <motion.div {...entrance()} className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Por qué Sport Admin
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Pensado para el instructor real
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Sin complicaciones. Sin planillas. Sin WhatsApp para cobrar. Solo
            gestión que fluye.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-3">
          {benefitsContent.map((benefit, index) => {
            const { Icon, accent } = iconMap[benefit.id];
            return (
              <motion.article
                key={benefit.id}
                {...entrance(index * 0.08)}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-white/14 hover:shadow-xl"
              >
                {/* Corner glow on hover */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
                  style={{
                    background: `var(--color-${
                      benefit.id === "financial-control"
                        ? "success"
                        : benefit.id === "student-visibility"
                          ? "primary"
                          : "info"
                    })`,
                    opacity: 0,
                  }}
                />

                <span
                  className={`inline-grid h-11 w-11 place-items-center rounded-xl ${accent.bg} shadow-lg ${accent.glow}`}
                >
                  <Icon size={20} aria-hidden className={accent.text} />
                </span>

                <h3 className="mt-4 text-lg font-bold text-foreground">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
