"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { finalCtaContent } from "./content";
import { useMotionPreferences } from "./use-motion-preferences";

const perks = [
  "Sin tarjeta de crédito",
  "Configuración en minutos",
  "Soporte incluido",
];

export function FinalCta() {
  const { entrance, prefersReducedMotion } = useMotionPreferences();

  return (
    <section
      aria-label="Llamado a la acción final"
      className="relative overflow-hidden py-20 sm:py-28"
    >
      {/* Background glow cluster */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute left-1/4 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-info/8 blur-[80px]" />
      </div>

      {/* Decorative ring */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {[280, 400, 520].map((size, i) => (
          <div
            key={size}
            className="absolute rounded-full border border-white/4"
            style={{
              width: size,
              height: size,
              top: -size / 2,
              left: -size / 2,
              opacity: 0.5 - i * 0.15,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-8">
        <motion.div {...entrance()}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
              aria-hidden="true"
            />
            Únete ahora
          </span>
        </motion.div>

        <motion.h2
          {...entrance(0.05)}
          className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl"
        >
          {finalCtaContent.title}{" "}
          <span className="bg-gradient-to-r from-primary via-[#818cf8] to-info bg-clip-text text-transparent">
            {finalCtaContent.titleAccent}
          </span>
        </motion.h2>

        <motion.p
          {...entrance(0.1)}
          className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground"
        >
          {finalCtaContent.subtitle}
        </motion.p>

        <motion.div
          {...entrance(0.15)}
          className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Link
            href="/sign-up"
            className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-primary/50 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-primary sm:w-auto"
          >
            {finalCtaContent.primaryCta}
            <ArrowRight
              size={18}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/log-in"
            className="inline-flex h-14 w-full items-center justify-center rounded-xl border border-white/12 bg-white/4 px-8 text-base font-semibold text-foreground backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/8 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-primary sm:w-auto"
          >
            {finalCtaContent.secondaryCta}
          </Link>
        </motion.div>

        {/* Perks */}
        <motion.ul
          {...entrance(0.2)}
          className="mt-6 flex flex-wrap justify-center gap-4"
          role="list"
        >
          {perks.map((perk) => (
            <li
              key={perk}
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <CheckCircle2
                size={14}
                aria-hidden="true"
                className="text-success"
              />
              {perk}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
