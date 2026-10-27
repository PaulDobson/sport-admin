"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { testimonialsContent } from "./content";
import { useMotionPreferences } from "./use-motion-preferences";

const accentColors = [
  "from-primary/20 to-info/10",
  "from-success/20 to-primary/10",
  "from-info/20 to-success/10",
];

const avatarColors = [
  "bg-primary/20 text-primary",
  "bg-success/20 text-success",
  "bg-info/20 text-info",
];

export function TestimonialsSection() {
  const { entrance } = useMotionPreferences();

  return (
    <section
      id="testimonials"
      aria-label="Testimonios de instructores"
      className="relative overflow-hidden py-20 sm:py-24"
    >
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/4 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] translate-x-1/2 rounded-full bg-info/5 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
        <motion.div {...entrance()} className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Testimonios
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Lo que dicen los instructores
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Instructores reales que ya gestionan su trabajo con Sport Admin.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-3">
          {testimonialsContent.map((t, i) => (
            <motion.blockquote
              key={t.name}
              {...entrance(i * 0.08)}
              className="relative overflow-hidden rounded-2xl border border-white/8 bg-card p-6"
            >
              {/* Gradient top accent */}
              <div
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentColors[i]}`}
              />

              <Quote
                size={24}
                aria-hidden="true"
                className="mb-4 text-primary/30"
              />

              <p className="text-sm leading-relaxed text-foreground/85">
                &ldquo;{t.quote}&rdquo;
              </p>

              <footer className="mt-5 flex items-center gap-3">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${avatarColors[i]}`}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div>
                  <cite className="not-italic text-sm font-semibold text-foreground">
                    {t.name}
                  </cite>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
