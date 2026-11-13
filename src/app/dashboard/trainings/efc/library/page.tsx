import Link from "next/link";
import {
  BookOpen,
  Layers,
  Zap,
  Activity,
  TrendingUp,
  BarChart2,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { EfcLibraryNav } from "./efc-library-nav";

// ─── Section registry ───────────────────────────────────────────────────────

const SECTIONS = [
  { key: "fundamentos",    label: "Fundamentos del EFC",        icon: BookOpen   },
  { key: "piramide",       label: "Pirámide EFC",               icon: Layers     },
  { key: "coordinativas",  label: "Capacidades Coordinativas",  icon: Zap        },
  { key: "condicionales",  label: "Capacidades Condicionales",  icon: Activity   },
  { key: "progresion",     label: "Progresión de Cargas",       icon: TrendingUp },
  { key: "ondulacion",     label: "Ondulación de Microciclos",  icon: BarChart2  },
  { key: "advertencias",   label: "Advertencias de Seguridad",  icon: ShieldAlert},
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

// ─── Shared disclaimer banner ────────────────────────────────────────────────

function PercentageDisclaimer() {
  return (
    <aside
      role="note"
      aria-label="Aviso sobre porcentajes orientativos"
      className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90"
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
      />
      <span>
        <strong className="text-amber-300">Porcentajes orientativos.</strong>{" "}
        Los porcentajes indicados son orientativos y no han sido validados
        científicamente. No constituyen una prescripción médica ni una receta
        universal. Ajustar según el deportista, el calendario y los recursos
        disponibles.
      </span>
    </aside>
  );
}

// ─── Section: Fundamentos del EFC ───────────────────────────────────────────

function SeccionFundamentos() {
  return (
    <div className="space-y-6">
      <SectionHeader sectionKey="fundamentos" />

      {/* What is EFC */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          ¿Qué es el Método EFC?
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          El <strong className="text-foreground">Método EFC</strong> (Estructura
          – Función – Cognición) es un modelo de periodización aplicado al
          taekwondo de combate. Organiza el entrenamiento en tres grandes
          etapas progresivas que van desde el desarrollo físico general hasta
          la toma de decisiones táctica en situaciones de combate real.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Su premisa central es que un deportista solo puede expresar su
          capacidad funcional si primero tiene los recursos estructurales para
          hacerlo, y solo puede aplicar sus capacidades funcionales con
          eficiencia si su sistema cognitivo es capaz de tomar decisiones
          correctas bajo presión.
        </p>
      </div>

      {/* 3 stages table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Etapa
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Nombre
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                % orientativo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Foco principal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-bold text-blue-400">
                  E
                </span>
              </td>
              <td className="px-4 py-3 font-medium">Estructura</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">50 %</td>
              <td className="px-4 py-3 text-muted-foreground">
                Fuerza general, movilidad, resistencia de base y construcción muscular.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-400">
                  F
                </span>
              </td>
              <td className="px-4 py-3 font-medium">Función</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">30 %</td>
              <td className="px-4 py-3 text-muted-foreground">
                Aplicación de las capacidades estructurales al gesto técnico específico del taekwondo.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                  C
                </span>
              </td>
              <td className="px-4 py-3 font-medium">Cognición</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">20 %</td>
              <td className="px-4 py-3 text-muted-foreground">
                Toma de decisiones táctica, lectura del oponente y ejecución bajo presión competitiva.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3 questions */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Las 3 preguntas del EFC
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Antes de diseñar cualquier microciclo, el método EFC propone
          responder tres preguntas secuenciales sobre el deportista:
        </p>
        <ol className="space-y-3">
          {[
            {
              label: "¿Tiene los recursos?",
              color: "blue",
              desc: "¿Posee la capacidad física (fuerza, resistencia, movilidad) necesaria para ejecutar el trabajo planificado? Si la respuesta es no, el foco es la etapa E.",
            },
            {
              label: "¿Puede usarlos?",
              color: "green",
              desc: "¿Puede transferir esos recursos físicos al gesto técnico específico del combate? Si no, el foco es la etapa F.",
            },
            {
              label: "¿Puede decidir?",
              color: "amber",
              desc: "¿Puede elegir cuándo y cómo aplicarlos durante el combate real, bajo presión y fatiga? Si no, el foco es la etapa C.",
            },
          ].map(({ label, color, desc }, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
                  ${color === "blue"  ? "bg-blue-500/15 text-blue-400"  : ""}
                  ${color === "green" ? "bg-green-500/15 text-green-400" : ""}
                  ${color === "amber" ? "bg-amber-500/15 text-amber-400" : ""}
                `}
              >
                {i + 1}
              </span>
              <div className="text-sm leading-6">
                <span className="font-semibold text-foreground">{label}</span>{" "}
                <span className="text-muted-foreground">{desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <PercentageDisclaimer />
    </div>
  );
}

// ─── Section: Pirámide EFC ───────────────────────────────────────────────────

function SeccionPiramide() {
  return (
    <div className="space-y-6">
      <SectionHeader sectionKey="piramide" />

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Concepto de pirámide
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          La pirámide EFC representa visualmente el principio de que todo
          aprendizaje motor y toda expresión de rendimiento se construye sobre
          una base amplia de capacidades generales. Cuanto más sólida sea la
          base estructural, mayor será el potencial funcional y cognitivo que
          se puede desarrollar sobre ella.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          La base (E) es la más ancha porque concentra el mayor volumen de
          trabajo y la mayor inversión de tiempo. A medida que ascendemos, el
          trabajo se vuelve más específico, más intenso en términos
          neurocognitivos y más cercano a las condiciones reales de
          competencia.
        </p>
      </div>

      {/* Learning pyramid progression */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Progresión del aprendizaje
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            <span>
              <strong className="text-foreground">E — General/Estructural:</strong>{" "}
              El deportista adquiere o refuerza los recursos físicos básicos. Los
              estímulos son amplios, multilaterales y de bajo componente técnico
              específico.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
            <span>
              <strong className="text-foreground">F — Específico/Funcional:</strong>{" "}
              Las capacidades adquiridas se canalizan hacia patrones de movimiento
              propios del taekwondo. La técnica, la velocidad de reacción y la
              potencia específica se desarrollan en este nivel.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>
              <strong className="text-foreground">C — Cognitivo/Competitivo:</strong>{" "}
              El deportista integra todas sus capacidades bajo presión de combate
              real. La toma de decisiones, la adaptación táctica y la gestión de
              la fatiga son los elementos centrales.
            </span>
          </li>
        </ul>
      </div>

      {/* CSS pyramid */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Pirámide visual
        </h3>
        <div
          className="flex flex-col items-center gap-1"
          aria-label="Pirámide EFC: base E azul, medio F verde, cima C ámbar"
          role="img"
        >
          {/* C — top/smallest */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-24 items-center justify-center rounded-t-lg bg-amber-500/20 border border-amber-500/30">
              <span className="text-xs font-bold text-amber-400">C — Cognición</span>
            </div>
          </div>
          {/* F — middle */}
          <div className="flex h-12 w-48 items-center justify-center rounded-sm bg-green-500/20 border border-green-500/30">
            <span className="text-xs font-bold text-green-400">F — Función</span>
          </div>
          {/* E — base/largest */}
          <div className="flex h-14 w-72 items-center justify-center rounded-b-lg bg-blue-500/20 border border-blue-500/30">
            <span className="text-xs font-bold text-blue-400">E — Estructura</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          De mayor a menor volumen de trabajo · De general a específico
        </p>
      </div>

      <PercentageDisclaimer />
    </div>
  );
}

// ─── Section: Capacidades Coordinativas ─────────────────────────────────────

function SeccionCoordinativas() {
  const capacidades = [
    {
      name: "Acoplamiento",
      desc: "Capacidad de coordinar movimientos de distintos segmentos corporales de forma simultánea y fluida.",
      tkd: "Es fundamental para encadenar ataques combinados (doble patada, puño-patada) sin pérdida de velocidad ni potencia.",
      stages: "E: se entrena con coordinación básica multilateral. F: se traslada al gesto técnico combinado. C: se aplica bajo presión táctica.",
    },
    {
      name: "Diferenciación",
      desc: "Capacidad de regular con precisión la tensión muscular y los parámetros de movimiento (amplitud, velocidad, fuerza).",
      tkd: "Permite ajustar la potencia de un golpe según la distancia con el oponente y el momento del combate.",
      stages: "E: control de carga y gradación de fuerza en ejercicios aislados. F: precisión técnica en el gesto. C: ajuste fino en situación real.",
    },
    {
      name: "Equilibrio",
      desc: "Capacidad de mantener o recuperar el centro de gravedad sobre la base de sustentación, estática o dinámicamente.",
      tkd: "Es determinante en el retorno a posición de guardia tras cada acción, impidiendo que el deportista quede expuesto.",
      stages: "E: trabajo propioceptivo y de estabilización. F: equilibrio en ejecución técnica. C: recuperación de guardia bajo presión.",
    },
    {
      name: "Orientación",
      desc: "Capacidad de percibir y controlar la posición del cuerpo propio y del oponente en el espacio.",
      tkd: "Gestionar el área de competencia, controlar el ángulo de ataque y evitar salir de la zona requieren alta orientación espacial.",
      stages: "E: ejercicios con referencias espaciales. F: combinaciones con cambios de dirección. C: spartring con gestión táctica del espacio.",
    },
    {
      name: "Ritmo",
      desc: "Capacidad de reproducir una estructura temporal de movimientos, propia o impuesta externamente.",
      tkd: "El deportista que domina el ritmo del combate puede imponer su frecuencia de ataque y romper el ritmo del rival.",
      stages: "E: trabajo con metrónomo y patrones rítmicos básicos. F: variación de cadencia en combinaciones. C: ritmo libre en combate.",
    },
    {
      name: "Reacción",
      desc: "Capacidad de responder de forma rápida y adecuada a un estímulo sensorial (visual, auditivo o táctil).",
      tkd: "La velocidad de reacción ante el ataque del oponente es uno de los factores más determinantes del rendimiento en combate.",
      stages: "E: reacciones simples y de elección sin presión. F: reacciones ante estímulos técnicos específicos. C: reacción táctica en sparring.",
    },
    {
      name: "Adaptación",
      desc: "Capacidad de modificar o reorganizar el programa de movimiento ante cambios imprevistos del entorno.",
      tkd: "El oponente cambia, se lesiona, varía su guardia o su velocidad; la capacidad de adaptación permite ajustar la estrategia en tiempo real.",
      stages: "E: variedad de estímulos y situaciones en entrenamiento. F: cambios de tarea dentro de la sesión técnica. C: sparring con variables abiertas.",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader sectionKey="coordinativas" />

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Las capacidades coordinativas determinan la calidad del aprendizaje
          motor y la capacidad de expresar las habilidades técnicas en
          situaciones cambiantes. En el contexto EFC, su desarrollo sigue una
          progresión desde formas generales (E) hasta situaciones abiertas e
          impredecibles (C).
        </p>
      </div>

      <div className="space-y-3">
        {capacidades.map((cap) => (
          <div
            key={cap.name}
            className="rounded-xl border border-border bg-card p-4 space-y-2"
          >
            <h3 className="font-semibold text-sm">{cap.name}</h3>
            <p className="text-sm text-muted-foreground leading-6">{cap.desc}</p>
            <p className="text-sm text-muted-foreground leading-6">
              <strong className="text-foreground">En taekwondo:</strong> {cap.tkd}
            </p>
            <p className="text-xs text-muted-foreground leading-5 border-t border-border pt-2 mt-2">
              <strong className="text-foreground">Progresión EFC →</strong> {cap.stages}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Capacidades Condicionales ─────────────────────────────────────

function SeccionCondicionales() {
  const capacidades = [
    {
      key: "Fuerza",
      desc: "Capacidad de producir tensión muscular frente a una resistencia. En taekwondo incluye fuerza explosiva para las patadas de puntaje y fuerza resistencia para mantener la potencia a lo largo del combate.",
      e: 40, f: 30, c: 40,
    },
    {
      key: "Resistencia",
      desc: "Capacidad de mantener un esfuerzo físico o mental durante el tiempo requerido. Engloba la resistencia aeróbica de base (E), la resistencia mixta (F) y la resistencia de alta intensidad intermitente propia del combate (C).",
      e: 20, f: 30, c: 20,
    },
    {
      key: "Velocidad",
      desc: "Capacidad de realizar acciones motrices en el menor tiempo posible. En el contexto del combate comprende velocidad de desplazamiento, velocidad de ejecución técnica y velocidad de reacción ante el oponente.",
      e: 30, f: 30, c: 30,
    },
    {
      key: "Flexibilidad",
      desc: "Capacidad de mover las articulaciones a través de su rango óptimo de movimiento. Es la capacidad que menos varía entre etapas, aunque es condición necesaria para la correcta ejecución de las patadas altas.",
      e: 10, f: 10, c: 10,
    },
  ];

  const periodColors = {
    E: { bar: "bg-blue-400",  text: "text-blue-400"  },
    F: { bar: "bg-green-400", text: "text-green-400" },
    C: { bar: "bg-amber-400", text: "text-amber-400" },
  } as const;

  return (
    <div className="space-y-6">
      <SectionHeader sectionKey="condicionales" />

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Las capacidades condicionales son la base energética del deportista.
          En el método EFC, su importancia relativa varía según la etapa de
          entrenamiento. Los porcentajes a continuación son orientativos e
          indican el peso aproximado de cada capacidad dentro del volumen de
          trabajo de cada etapa.
        </p>
      </div>

      <div className="space-y-4">
        {capacidades.map((cap) => (
          <div
            key={cap.key}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <h3 className="font-semibold text-sm">{cap.key}</h3>
            <p className="text-sm text-muted-foreground leading-6">{cap.desc}</p>
            {/* Per-stage bars */}
            <div className="space-y-1.5">
              {(["E", "F", "C"] as const).map((period) => {
                const pct = period === "E" ? cap.e : period === "F" ? cap.f : cap.c;
                return (
                  <div key={period}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-medium ${periodColors[period].text}`}>
                        Etapa {period}
                      </span>
                      <span className="text-muted-foreground tabular-nums">{pct} %</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${periodColors[period].bar}`}
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${cap.key} etapa ${period}: ${pct}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <PercentageDisclaimer />
    </div>
  );
}

// ─── Section: Progresión de Cargas ──────────────────────────────────────────

function SeccionProgresion() {
  const microcycleTypes = [
    { code: "AJ", name: "Ajuste",        desc: "Microciclo de entrada o reajuste tras un descanso o lesión. Cargas bajas, técnica y movilidad." },
    { code: "C",  name: "Carga",         desc: "Microciclo de trabajo principal. Volumen e intensidad moderados-altos. El más frecuente en la etapa E." },
    { code: "I",  name: "Impacto",       desc: "Microciclo de alta demanda. Intensidad máxima y volumen elevado. Usado con precaución por su alta fatiga acumulada." },
    { code: "AC", name: "Activación",    desc: "Microciclo previo a competencia. Volumen bajo, intensidad alta, trabajo específico de combate." },
    { code: "CO", name: "Competencia",   desc: "Semana de competencia. Mínimo trabajo de entrenamiento, tapering completo." },
    { code: "R",  name: "Recuperación",  desc: "Microciclo de descarga activa. Cargas mínimas, actividad regenerativa. Obligatorio tras un bloque de impacto o competencia." },
  ];

  const intensityScale = [
    { level: 0, label: "Reposo",             color: "bg-muted" },
    { level: 1, label: "Muy suave",          color: "bg-blue-500/20" },
    { level: 2, label: "Suave",              color: "bg-blue-500/40" },
    { level: 3, label: "Moderado bajo",      color: "bg-green-500/30" },
    { level: 4, label: "Moderado",           color: "bg-green-500/50" },
    { level: 5, label: "Moderado-alto",      color: "bg-yellow-500/40" },
    { level: 6, label: "Alto",               color: "bg-yellow-500/60" },
    { level: 7, label: "Muy alto",           color: "bg-orange-500/50" },
    { level: 8, label: "Máximo",             color: "bg-red-500/50" },
    { level: 9, label: "Supramáximo",        color: "bg-red-500/70" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader sectionKey="progresion" />

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Principio de progresión
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          El método EFC aplica el principio de sobrecarga progresiva de lo
          simple a lo complejo y de lo general a lo específico. La carga no
          solo debe aumentar en volumen o intensidad: debe evolucionar en su
          naturaleza, pasando de estímulos analíticos (E) a estímulos globales
          y cognitivos (C).
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          La progresión correcta evita la estagnación y reduce el riesgo de
          sobreentrenamiento. Cada incremento de carga debe ir acompañado de
          un período de asimilación suficiente, respetando las semanas de
          recuperación planificadas.
        </p>
      </div>

      {/* Microcycle types */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Tipos de microciclo
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Código
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Tipo
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Descripción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {microcycleTypes.map((m) => (
              <tr key={m.code}>
                <td className="px-4 py-2.5">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-bold text-amber-400">
                    {m.code}
                  </code>
                </td>
                <td className="px-4 py-2.5 font-medium whitespace-nowrap">{m.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{m.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Intensity scale */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Escala de intensidad 0–9
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Nivel
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Denominación
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Referencia visual
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {intensityScale.map(({ level, label, color }) => (
              <tr key={level}>
                <td className="px-4 py-2 font-mono font-bold tabular-nums text-foreground">
                  {level}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{label}</td>
                <td className="px-4 py-2">
                  <div
                    className={`h-3 w-16 rounded-full ${color}`}
                    aria-label={`Intensidad ${level}: ${label}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section: Ondulación de Microciclos ─────────────────────────────────────

function SeccionOndulacion() {
  return (
    <div className="space-y-6">
      <SectionHeader sectionKey="ondulacion" />

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          La ondulación de la carga es el principio que organiza la variación
          de intensidad y volumen a lo largo de los microciclos del macrociclo.
          En lugar de aplicar cargas lineales crecientes, el método EFC
          distribuye picos de carga separados por períodos de recuperación para
          maximizar la supercompensación y minimizar el sobreentrenamiento.
        </p>
      </div>

      {/* 1-peak */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Ondulación de 1 pico
        </h3>
        <p className="text-sm text-muted-foreground leading-6">
          Indicada para macrociclos cortos (8–12 semanas) o para deportistas
          principiantes con poca experiencia en planificación estructurada.
          Hay un único pico de carga máxima antes de la competencia, seguido
          de un taper definido.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs font-mono text-muted-foreground leading-5">
{`Semana:   1   2   3   4   5   6   7   8
Carga:    ▂   ▄   ▆   █   ▆   ▄   ▂   🏆
Tipo:     AJ  C   C   I   C   AC  R   CO`}
        </pre>
      </div>

      {/* 2-peak */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Ondulación de 2 picos
        </h3>
        <p className="text-sm text-muted-foreground leading-6">
          Para macrociclos de 12–18 semanas o calendarios con dos competencias
          principales. El primer pico es de menor magnitud y sirve como test
          de rendimiento; el segundo es el pico competitivo principal.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs font-mono text-muted-foreground leading-5">
{`Semana:   1   2   3   4   5   6   7   8   9   10  11  12
Carga:    ▂   ▄   ▆   █   ▄   ▂   ▄   ▆   █   ▆   ▂   🏆
Tipo:     AJ  C   C   I   AC  R   C   C   I   AC  R   CO`}
        </pre>
      </div>

      {/* 3-peak */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Ondulación de 3 picos
        </h3>
        <p className="text-sm text-muted-foreground leading-6">
          Para macrociclos largos (18–24 semanas) o deportistas de alto
          rendimiento con capacidad de recuperación comprobada. Tres bloques de
          carga progresivamente más específicos y más intensos. Requiere
          monitoreo riguroso del ACWR para evitar sobreentrenamiento.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs font-mono text-muted-foreground leading-5">
{`Semana:   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16
Carga:    ▂   ▄   █   ▄   ▂   ▄   ▆   █   ▄   ▂   ▄   ▆   █   ▄   ▂   🏆
Tipo:     AJ  C   I   AC  R   C   C   I   AC  R   C   C   I   AC  R   CO`}
        </pre>
        <p className="text-xs text-muted-foreground">
          Leyenda: ▂ baja · ▄ media · ▆ alta · █ máxima · 🏆 competencia
        </p>
      </div>
    </div>
  );
}

// ─── Section: Advertencias de Seguridad ─────────────────────────────────────

function SeccionAdvertencias() {
  return (
    <div className="space-y-6">
      <SectionHeader sectionKey="advertencias" />

      {/* Full disclaimer card */}
      <div
        role="note"
        aria-label="Aviso legal y de seguridad del método EFC"
        className="rounded-xl border border-amber-500/40 bg-amber-500/8 p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <ShieldAlert className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-semibold text-amber-300">
              Aviso importante antes de aplicar este método
            </h3>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Lee detenidamente antes de utilizar cualquier porcentaje o prescripción de este sistema.
            </p>
          </div>
        </div>

        <ul className="space-y-4 text-sm text-amber-200/80">
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              <strong className="text-amber-300">No está validado científicamente.</strong>{" "}
              El Método EFC es un marco conceptual y práctico desarrollado a partir
              de experiencia de campo. Los porcentajes, distribuciones y
              progresiones propuestos no han sido sometidos a ensayos clínicos ni
              estudios longitudinales con grupos control.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              <strong className="text-amber-300">No es una receta universal.</strong>{" "}
              Ningún programa de entrenamiento puede aplicarse de forma idéntica a
              todos los deportistas. Las diferencias individuales en edad,
              experiencia, morfología, historial de lesiones y respuesta al
              entrenamiento hacen que cualquier prescripción deba ser adaptada.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              <strong className="text-amber-300">No es una prescripción médica.</strong>{" "}
              Ninguna información de esta biblioteca debe interpretarse como
              consejo médico, diagnóstico, tratamiento de lesiones ni recomendación
              clínica. Para cualquier condición médica o lesión, consultar a un
              profesional de la salud habilitado.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              <strong className="text-amber-300">Ajustar según el contexto.</strong>{" "}
              Siempre considerar: la edad cronológica y de entrenamiento del
              deportista, su nivel de rendimiento actual, el calendario competitivo
              real, la respuesta individual a las cargas previas, y los recursos
              materiales y temporales disponibles.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              <strong className="text-amber-300">Consultar profesionales calificados.</strong>{" "}
              Se recomienda trabajar en conjunto con preparadores físicos, médicos
              deportivos y nutricionistas titulados para diseñar programas de
              entrenamiento seguros y efectivos. Este sistema es una herramienta de
              apoyo, no un sustituto del criterio profesional.
            </span>
          </li>
        </ul>
      </div>

      {/* General context card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Uso responsable de la herramienta
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Sport Admin y la Biblioteca EFC son herramientas de gestión y
          planificación. Los datos ingresados, los planes generados y los
          porcentajes mostrados son punto de partida para la reflexión
          profesional del entrenador, no instrucciones automáticas a seguir
          sin criterio.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Monitorea continuamente la respuesta del deportista. Si observas
          signos de sobreentrenamiento, fatiga acumulada excesiva, dolor
          articular persistente o deterioro del rendimiento, reduce la carga
          de inmediato y consulta con los profesionales correspondientes.
        </p>
      </div>
    </div>
  );
}

// ─── Section header helper ───────────────────────────────────────────────────

function SectionHeader({ sectionKey }: { sectionKey: SectionKey }) {
  const section = SECTIONS.find((s) => s.key === sectionKey)!;
  const Icon = section.icon;
  return (
    <header className="space-y-1 pb-2">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-amber-400" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight">{section.label}</h2>
      </div>
    </header>
  );
}

// ─── Section renderer ────────────────────────────────────────────────────────

function SectionContent({ sectionKey }: { sectionKey: SectionKey }) {
  switch (sectionKey) {
    case "fundamentos":   return <SeccionFundamentos />;
    case "piramide":      return <SeccionPiramide />;
    case "coordinativas": return <SeccionCoordinativas />;
    case "condicionales": return <SeccionCondicionales />;
    case "progresion":    return <SeccionProgresion />;
    case "ondulacion":    return <SeccionOndulacion />;
    case "advertencias":  return <SeccionAdvertencias />;
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EfcLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const params = await searchParams;
  const rawSection = params.section ?? "fundamentos";

  // Validate the section key; fall back to default if unknown.
  const activeSection: SectionKey = (
    SECTIONS.some((s) => s.key === rawSection)
      ? rawSection
      : "fundamentos"
  ) as SectionKey;

  return (
    <div className="space-y-6 pb-4 pt-2">
      {/* ── Scroll-position manager (Client Component, renders nothing) ── */}
      <EfcLibraryNav activeSection={activeSection} />

      {/* ── Page header ────────────────────────────────────────────────── */}
      <header className="space-y-1 px-1">
        <nav aria-label="Migas de pan" className="mb-2">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link
                href="/dashboard/trainings/efc"
                className="transition-colors hover:text-foreground"
              >
                Planificación EFC
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">Biblioteca EFC</li>
          </ol>
        </nav>

        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
          <BookOpen aria-hidden="true" className="h-4 w-4" />
          Método EFC
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Biblioteca EFC
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Marco conceptual del Método Estructura–Función–Cognición aplicado al
          taekwondo de combate.
        </p>
      </header>

      {/* ── Layout: sidebar (desktop) / tabs (mobile) + content ────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
        {/* ─ Mobile: horizontal scrollable tab row ─────────────────────── */}
        <nav
          aria-label="Secciones de la biblioteca EFC"
          className="lg:hidden -mx-1 overflow-x-auto px-1 pb-1"
        >
          <ul className="flex gap-2 min-w-max">
            {SECTIONS.map(({ key, label, icon: Icon }) => {
              const isActive = key === activeSection;
              return (
                <li key={key}>
                  <Link
                    href={`?section=${key}`}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      isActive
                        ? "border-primary/25 bg-navigation-active text-primary"
                        : "border-border text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                    ].join(" ")}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ─ Desktop: sidebar nav ──────────────────────────────────────── */}
        <nav
          aria-label="Secciones de la biblioteca EFC"
          className="hidden lg:block w-56 shrink-0"
        >
          <ul className="space-y-0.5">
            {SECTIONS.map(({ key, label, icon: Icon }) => {
              const isActive = key === activeSection;
              return (
                <li key={key}>
                  <Link
                    href={`?section=${key}`}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      isActive
                        ? "bg-navigation-active text-primary"
                        : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                    ].join(" ")}
                  >
                    {/* Active indicator bar — matches the global sidebar pattern */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                      />
                    )}
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="leading-snug">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ─ Section content ───────────────────────────────────────────── */}
        <main className="min-w-0 flex-1">
          <SectionContent sectionKey={activeSection} />
        </main>
      </div>
    </div>
  );
}
