"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  Zap,
} from "lucide-react";
import { heroContent } from "./content";
import { useMotionPreferences } from "./use-motion-preferences";
import { HeroDashboardMock } from "./illustrations/hero-illustration";

interface HeroProps {
  primaryHref?: string;
  primaryLabel?: string;
}

const floatingCards = [
  {
    icon: CreditCard,
    label: "Cobro procesado",
    value: "+$12.500",
    accent: "success" as const,
    delay: 0,
  },
  {
    icon: CalendarCheck,
    label: "Reservas hoy",
    value: "14 / 16",
    accent: "primary" as const,
    delay: 0.15,
  },
  {
    icon: TrendingUp,
    label: "Alumnos activos",
    value: "48",
    accent: "info" as const,
    delay: 0.3,
  },
];

const accentColors = {
  success: {
    bg: "bg-success/12",
    text: "text-success",
    glow: "shadow-success/20",
  },
  primary: {
    bg: "bg-primary/12",
    text: "text-primary",
    glow: "shadow-primary/20",
  },
  info: { bg: "bg-info/12", text: "text-info", glow: "shadow-info/20" },
  warning: {
    bg: "bg-warning/12",
    text: "text-warning",
    glow: "shadow-warning/20",
  },
};

export function Hero({
  primaryHref = "/sign-up",
  primaryLabel = heroContent.primaryCta,
}: HeroProps) {
  const { entrance, prefersReducedMotion } = useMotionPreferences();

  return (
    <section
      aria-label="Presentación de Sport Admin"
      className="relative overflow-hidden pt-20 lg:pt-24"
    >
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute -right-32 top-20 h-[500px] w-[500px] rounded-full bg-info/6 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[80px]" />
      </div>

      {/* Grid texture overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIwLjMiIG9wYWNpdHk9IjAuMDYiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:pb-24 lg:pt-20">
        {/* Left column */}
        <div>
          <motion.div {...entrance()}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                aria-hidden="true"
              />
              {heroContent.eyebrow}
            </span>
          </motion.div>

          <motion.h1
            {...entrance(0.05)}
            className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            {heroContent.title}{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-primary via-[#818cf8] to-primary bg-clip-text text-transparent">
                {heroContent.titleAccent}
              </span>
              {/* Underline accent */}
              <svg
                aria-hidden="true"
                viewBox="0 0 300 12"
                className="absolute -bottom-2 left-0 w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M 0 8 Q 75 2 150 8 Q 225 14 300 8"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            {...entrance(0.1)}
            className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            {heroContent.subtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div {...entrance(0.15)} className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-primary/40 hover:shadow-xl active:translate-y-0 focus-visible:outline-2 focus-visible:outline-primary"
            >
              {primaryLabel}
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/log-in"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/12 bg-white/4 px-6 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/8 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-primary"
            >
              {heroContent.secondaryCta}
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            {...entrance(0.2)}
            className="mt-10 flex flex-wrap items-center gap-6"
          >
            {heroContent.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span className="metric-number text-2xl font-bold text-foreground">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
            <div
              aria-hidden="true"
              className="hidden h-8 w-px bg-border sm:block"
            />
            <p className="text-xs text-muted-foreground">
              Sin tarjeta · Configuración en minutos
            </p>
          </motion.div>
        </div>

        {/* Right column – dashboard mockup */}
        <motion.div {...entrance(0.2)} className="relative mt-12 lg:mt-0">
          {/* Glow behind mock */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-3xl bg-primary/5 blur-3xl"
          />

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl shadow-black/40">
            <HeroDashboardMock />
          </div>

          {/* Floating stat pills */}
          {floatingCards.map((card, i) => {
            const colors = accentColors[card.accent];
            const Icon = card.icon;
            const positions = [
              "-left-4 top-10 sm:-left-8",
              "-right-4 top-1/3 sm:-right-8",
              "-bottom-4 left-1/4 sm:-bottom-8",
            ];

            return (
              <motion.div
                key={card.label}
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, scale: 0.85, y: 10 }
                }
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { opacity: 1, scale: 1, y: 0 }
                }
                transition={{ duration: 0.5, delay: 0.4 + card.delay }}
                className={`absolute ${positions[i]} z-10 flex items-center gap-2.5 rounded-xl border border-white/10 bg-card/90 px-3 py-2 shadow-xl backdrop-blur-md`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${colors.bg}`}
                >
                  <Icon size={14} aria-hidden="true" className={colors.text} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] text-muted-foreground">
                    {card.label}
                  </p>
                  <p
                    className={`metric-number text-sm font-bold ${colors.text}`}
                  >
                    {card.value}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Bottom fade to content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
      />
    </section>
  );
}
