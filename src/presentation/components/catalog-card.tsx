import Image from "next/image";
import type { ComponentType, ReactNode } from "react";

/** Placeholder artwork from /public/img; replace or extend freely. */
export const catalogImages = ["/img/img_1.jpg", "/img/img_2.jpg", "/img/img_3.jpg", "/img/img_5.jpg"] as const;

const tones = [
  {
    surface: "border-primary/25 from-primary/40 via-primary/15",
    icon: "border-primary/50 bg-primary/10 text-primary",
    badge: "text-primary",
  },
  {
    surface: "border-info/25 from-info/40 via-info/15",
    icon: "border-info/50 bg-info/10 text-info",
    badge: "text-info",
  },
  {
    surface: "border-warning/25 from-warning/35 via-warning/10",
    icon: "border-warning/50 bg-warning/10 text-warning",
    badge: "text-warning",
  },
  {
    surface: "border-destructive/25 from-destructive/35 via-destructive/10",
    icon: "border-destructive/50 bg-destructive/10 text-destructive",
    badge: "text-destructive",
  },
  {
    surface: "border-success/25 from-success/35 via-success/10",
    icon: "border-success/50 bg-success/10 text-success",
    badge: "text-success",
  },
] as const;

const mutedTone = {
  surface: "border-border from-muted/60 via-muted/20",
  icon: "border-border bg-muted text-muted-foreground",
  badge: "text-muted-foreground",
};

function hashKey(key: string) {
  let hash = 0;
  for (const char of key.toLocaleLowerCase("es")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/** Stable tone per key so a discipline and its classes share the same color. */
export function catalogTone(key: string) {
  return tones[hashKey(key) % tones.length];
}

/** Stable image per key so a discipline and its classes share the same artwork. */
export function catalogImage(key: string) {
  return catalogImages[hashKey(key) % catalogImages.length];
}

export function CatalogCard({
  toneKey,
  muted = false,
  icon: Icon,
  badge,
  title,
  description,
  meta,
  actions,
  descriptionId,
  image,
}: {
  toneKey: string;
  muted?: boolean;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
  badge?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  descriptionId?: string;
  image?: string;
}) {
  const tone = muted ? mutedTone : catalogTone(toneKey);
  const imageSrc = image ?? catalogImage(toneKey);
  return (
    <article className={`group relative flex h-full min-h-52 flex-col overflow-hidden rounded-xl border bg-card bg-linear-to-br ${tone.surface} to-card p-4 shadow-lg shadow-black/20 transition-transform duration-200 motion-safe:hover:-translate-y-0.5 sm:p-5`}>
      <Image
        src={imageSrc}
        alt=""
        aria-hidden="true"
        fill
        sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
        className={`pointer-events-none object-cover mix-blend-luminosity transition-transform duration-500 motion-safe:group-hover:scale-105 ${muted ? "opacity-20 grayscale" : "opacity-45"}`}
      />
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-linear-to-br ${tone.surface} to-transparent`} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-tl from-background/90 via-background/20 to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${tone.icon}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        {badge ? (
          <span className={`max-w-[65%] truncate rounded-md border border-white/5 bg-background/70 px-2 py-1 text-xs font-semibold backdrop-blur-sm ${tone.badge}`}>
            {badge}
          </span>
        ) : null}
      </div>
      <div className="relative mt-auto pt-8">
        <h3 className="break-words text-lg font-bold leading-tight text-foreground">{title}</h3>
        {description ? <p id={descriptionId} className="mt-1 break-words text-sm text-muted-foreground">{description}</p> : null}
        {meta ? <div className="mt-2 text-xs leading-5 text-muted-foreground">{meta}</div> : null}
        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}
