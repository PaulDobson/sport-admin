"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { heroContent } from "./content";
import { HeroIllustration } from "./illustrations";
import { useMotionPreferences } from "./use-motion-preferences";

interface HeroProps {
  primaryHref?: string;
  primaryLabel?: string;
}

export function Hero({
  primaryHref = "/sign-up",
  primaryLabel = heroContent.primaryCta,
}: HeroProps) {
  const { entrance } = useMotionPreferences();

  return (
    <section
      aria-label="Presentación de Sport Admin"
      className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-24"
    >
      <motion.div {...entrance()}>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          {heroContent.eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          {heroContent.title}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          {heroContent.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {primaryLabel}
          </Link>
          <Link
            href="/log-in"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised"
          >
            {heroContent.secondaryCta}
          </Link>
        </div>
      </motion.div>
      <motion.div {...entrance(0.15)} className="mx-auto w-full max-w-md">
        <HeroIllustration />
      </motion.div>
    </section>
  );
}
