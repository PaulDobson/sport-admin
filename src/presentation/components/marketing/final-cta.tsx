import Link from "next/link";
import { finalCtaContent } from "./content";

export function FinalCta() {
  return (
    <section
      aria-label="Llamado a la acción final"
      className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-8"
    >
      <h2 className="text-3xl font-bold text-foreground">
        {finalCtaContent.title}
      </h2>
      <p className="mt-3 text-muted-foreground">{finalCtaContent.subtitle}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/sign-up"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {finalCtaContent.primaryCta}
        </Link>
        <Link
          href="/log-in"
          className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised"
        >
          {finalCtaContent.secondaryCta}
        </Link>
      </div>
    </section>
  );
}
