import Image from "next/image";
import Link from "next/link";
import { Activity, Check, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const benefits = [
  "Asistencia y clases en un solo lugar",
  "Cobros claros para tu equipo y apoderados",
  "Información protegida y siempre disponible",
];

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  alternatePrompt: string;
  alternateLabel: string;
  alternateHref: string;
  children: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  alternatePrompt,
  alternateLabel,
  alternateHref,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#0c1215] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.85fr)]">
      <section className="relative min-h-64 overflow-hidden border-0 p-0 lg:min-h-screen lg:rounded-none">
        <Image
          src="/sport-admin-login.jpg"
          alt="Entrenadores y deportistas gestionando su academia con Sport Admin"
          fill
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,12,16,0.2)_0%,rgba(5,12,16,0.42)_42%,rgba(5,12,16,0.94)_100%)]" />

        <div className="relative flex min-h-64 flex-col justify-between p-5 sm:p-8 lg:min-h-screen lg:p-12">
          <Link
            href="/"
            aria-label="Ir al inicio de Sport Admin"
            className="flex w-fit items-center gap-2 text-white"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-black/20">
              <Activity aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-[0.01em]">
              SPORT ADMIN
            </span>
          </Link>

          <div className="hidden max-w-xl lg:block">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-primary">
              Gestión que acompaña tu crecimiento
            </p>
            <h2 className="text-4xl font-extrabold leading-tight text-white xl:text-5xl">
              Más tiempo formando deportistas. Menos tiempo administrando.
            </h2>
            <ul className="mt-8 grid gap-3 text-sm font-medium text-white/90">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Check aria-hidden="true" className="h-4 w-4" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-16rem)] items-center border-0 bg-[#11181b] px-5 py-10 sm:px-10 lg:min-h-screen lg:rounded-none lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {description}
          </p>

          <div className="mt-8">{children}</div>

          <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
            {alternatePrompt}{" "}
            <Link
              href={alternateHref}
              className="font-bold text-foreground underline decoration-primary/60 underline-offset-4 transition-colors hover:text-primary"
            >
              {alternateLabel}
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
            Tus datos se transmiten y almacenan de forma segura.
          </div>
        </div>
      </section>
    </main>
  );
}
