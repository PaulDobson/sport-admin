import Link from "next/link";
import Image from "next/image";
import {
  Brain,
  Timer,
  Eye,
  Volume2,
  TimerReset,
  Layers,
  ArrowRight,
  Zap,
} from "lucide-react";

const tools = [
  {
    href: "/dashboard/trainings/cognitive",
    image: "/img/img_1.jpg",
    accent: "from-violet-500/40 via-violet-500/15 border-violet-500/30",
    iconBg: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    arrowColor: "text-violet-400",
    overlayFrom: "from-violet-900/60",
    label: "Entrenamiento Cognitivo",
    tagline: "Estimula mente y reflejos",
    description:
      "Ejercita la percepción visual y auditiva para mejorar el tiempo de reacción, la concentración y la toma de decisiones bajo presión. Ideal para complementar el trabajo físico con rendimiento mental.",
    features: [
      { icon: Eye, text: "Estímulos visuales" },
      { icon: Volume2, text: "Estímulos auditivos" },
    ],
  },
  {
    href: "/dashboard/trainings/timers",
    image: "/img/img_2.jpg",
    accent: "from-sky-500/40 via-sky-500/15 border-sky-500/30",
    iconBg: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    arrowColor: "text-sky-400",
    overlayFrom: "from-sky-900/60",
    label: "Temporizadores",
    tagline: "Controla cada segundo",
    description:
      "Herramientas de control del tiempo diseñadas para estructurar el entrenamiento con precisión. Elige el modo que mejor se adapte al ritmo y la intensidad de tu sesión.",
    features: [
      { icon: Timer, text: "Cronómetro" },
      { icon: TimerReset, text: "Series y Piramidal" },
    ],
  },
  {
    href: "/dashboard/trainings/combinations",
    image: "/img/img_3.jpg",
    accent: "from-amber-500/40 via-amber-500/15 border-amber-500/30",
    iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    arrowColor: "text-amber-400",
    overlayFrom: "from-amber-900/60",
    label: "Combinaciones",
    tagline: "El entrenamiento completo",
    description:
      "Fusiona los estímulos cognitivos con los temporizadores para crear circuitos dinámicos y desafiantes. La herramienta más versátil del sistema para preparar atletas en condiciones reales.",
    features: [
      { icon: Brain, text: "Cognitivo + tiempo" },
      { icon: Layers, text: "Circuitos mixtos" },
    ],
  },
];

export default function TrainingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-10">
      {/* Header hero */}
      <header className="relative overflow-hidden rounded-2xl border border-white/6 bg-card">
        <Image
          src="/img/img_5.jpg"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(min-width: 1280px) 1280px, 100vw"
          className="pointer-events-none object-cover opacity-20 mix-blend-luminosity"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/20 via-transparent to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/90 via-background/30 to-transparent"
        />
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <Zap aria-hidden="true" className="h-4 w-4" />
            Herramientas de entrenamiento
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Potencia cada sesión con las herramientas correctas
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            Desde estímulos cognitivos hasta control del tiempo y circuitos
            combinados, el sistema pone a tu disposición todo lo que necesitas
            para diseñar entrenamientos efectivos, dinámicos y medibles.
          </p>
        </div>
      </header>

      {/* Cards grid */}
      <section aria-label="Herramientas disponibles">
        <h2 className="sr-only">Herramientas disponibles</h2>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {tools.map(
            ({
              href,
              image,
              accent,
              iconBg,
              arrowColor,
              overlayFrom,
              label,
              tagline,
              description,
              features,
            }) => (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  className={`group relative flex h-full min-h-88 flex-col overflow-hidden rounded-2xl border bg-card bg-linear-to-br ${accent} to-card shadow-lg shadow-black/25 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-xl motion-safe:hover:shadow-black/35`}
                >
                  {/* Background image */}
                  <Image
                    src={image}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="pointer-events-none object-cover mix-blend-luminosity opacity-40 transition-transform duration-500 motion-safe:group-hover:scale-105"
                  />

                  {/* Gradient overlays */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 bg-linear-to-t ${overlayFrom} via-transparent to-transparent`}
                  />
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 bg-linear-to-br ${accent} to-transparent opacity-60`}
                  />

                  {/* Content */}
                  <div className="relative flex flex-1 flex-col p-5 sm:p-6">
                    {/* Top badge */}
                    <span className="self-start rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70 backdrop-blur-sm">
                      {tagline}
                    </span>

                    {/* Bottom content */}
                    <div className="mt-auto rounded-xl bg-black/40 p-4 pt-4 backdrop-blur-sm">
                      <h3 className="text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
                        {label}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-white/80">
                        {description}
                      </p>

                      {/* Feature pills */}
                      <ul
                        className="mt-4 flex flex-wrap gap-2"
                        aria-label={`Características de ${label}`}
                      >
                        {features.map(({ icon: Icon, text }) => (
                          <li
                            key={text}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${iconBg} bg-background/50`}
                          >
                            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                            {text}
                          </li>
                        ))}
                      </ul>

                      {/* CTA row */}
                      <div
                        className={`mt-5 flex items-center gap-1.5 text-sm font-semibold ${arrowColor} transition-transform duration-200 motion-safe:group-hover:translate-x-1`}
                      >
                        Ir al entrenamiento
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ),
          )}
        </ul>
      </section>

      {/* Bottom tip */}
      <aside className="rounded-xl border border-white/6 bg-surface-raised/50 px-5 py-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Consejo:</span>{" "}
          Empieza con los temporizadores para estructurar tu sesión, luego
          incorpora estímulos cognitivos y, cuando domines ambos, prueba las
          combinaciones para llevar el entrenamiento al siguiente nivel.
        </p>
      </aside>
    </div>
  );
}
