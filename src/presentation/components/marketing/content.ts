export interface HeroContent {
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  stats: Array<{ value: string; label: string }>;
}

export const heroContent: HeroContent = {
  eyebrow: "Plataforma para instructores independientes",
  title: "Profesionaliza tu",
  titleAccent: "gestión deportiva",
  subtitle:
    "Controla tus alumnos, cobra membresías automáticamente, gestiona reservas y potencia tus clases — todo desde un solo lugar.",
  primaryCta: "Empezar gratis",
  secondaryCta: "Iniciar sesión",
  stats: [
    { value: "100%", label: "Digital" },
    { value: "0", label: "Planillas" },
    { value: "24/7", label: "Disponible" },
  ],
};

export interface FeatureContent {
  id: string;
  icon: string;
  tag: string;
  title: string;
  description: string;
  items: string[];
  accent: "primary" | "success" | "info" | "warning";
}

export const featuresContent: FeatureContent[] = [
  {
    id: "finances",
    icon: "CreditCard",
    tag: "Finanzas",
    title: "Cobros automáticos y gestión de membresías",
    description:
      "Olvídate de perseguir pagos. Controla ingresos, estado de membresías y cobros recurrentes en tiempo real.",
    items: [
      "Cobros automáticos de membresías",
      "Estado de pagos por alumno",
      "Historial de ingresos y resumen financiero",
      "Alertas de pagos vencidos",
    ],
    accent: "success",
  },
  {
    id: "reservations",
    icon: "CalendarCheck",
    tag: "Reservas",
    title: "Reservas online para tus alumnos",
    description:
      "Tus alumnos reservan su lugar en clase en segundos. Tú ves la ocupación y planificas mejor cada sesión.",
    items: [
      "Portal de reservas para alumnos",
      "Control de aforo por clase",
      "Calendario de sesiones en tiempo real",
      "Confirmaciones automáticas",
    ],
    accent: "primary",
  },
  {
    id: "tracking",
    icon: "TrendingUp",
    tag: "Seguimiento",
    title: "Evolución deportiva de cada alumno",
    description:
      "Registra métricas, evalúa progresos y toma decisiones basadas en datos reales para motivar a tus alumnos.",
    items: [
      "Registro de métricas físicas",
      "Gráficos de progreso individuales",
      "Historial de asistencia",
      "Evaluaciones periódicas",
    ],
    accent: "info",
  },
  {
    id: "training-tools",
    icon: "Zap",
    tag: "Herramientas de clase",
    title: "Herramientas visuales para tus clases",
    description:
      "Cronómetros, temporizadores de rounds, entrenamiento cognitivo visual y auditivo para llevar tus clases al siguiente nivel.",
    items: [
      "Cronómetro y temporizador de rounds",
      "Ejercicios cognitivos visuales",
      "Estímulos auditivos para entrenamiento",
      "Guía de uso para maximizar resultados",
    ],
    accent: "warning",
  },
];

export interface TestimonialContent {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

export const testimonialsContent: TestimonialContent[] = [
  {
    quote:
      "Antes perdía horas en WhatsApp cobrando mensualidades. Ahora el sistema lo hace solo y tengo tiempo para lo que importa: dar clases.",
    name: "Martín R.",
    role: "Instructor de CrossFit",
    initials: "MR",
  },
  {
    quote:
      "Mis alumnos reservan solos, yo veo el aforo en tiempo real. Nunca más una clase superpoblada ni cancelaciones de último momento.",
    name: "Valeria G.",
    role: "Instructora de Yoga",
    initials: "VG",
  },
  {
    quote:
      "El seguimiento deportivo cambió mi forma de entrenar a mis alumnos. Ahora cada sesión tiene datos reales detrás.",
    name: "Sebastián T.",
    role: "Entrenador Personal",
    initials: "ST",
  },
];

export interface BenefitContent {
  id: "financial-control" | "student-visibility" | "growth-opportunity";
  title: string;
  description: string;
}

export const benefitsContent: BenefitContent[] = [
  {
    id: "financial-control",
    title: "Control financiero real",
    description:
      "Sabé qué alumnos pagaron, cuáles están pendientes y cuánto ingresás por locación, sin abrir una planilla.",
  },
  {
    id: "student-visibility",
    title: "Visibilidad total de tus alumnos",
    description:
      "Asistencia, evolución física y estado de cada alumno en un solo lugar, para actuar antes de que se dé de baja.",
  },
  {
    id: "growth-opportunity",
    title: "Espacio para crecer",
    description:
      "Sumá locaciones, alumnos y horarios sin perder el control. La misma gestión que te ordena hoy escala con vos.",
  },
];

export interface FinalCtaContent {
  title: string;
  titleAccent: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  note: string;
}

export const finalCtaContent: FinalCtaContent = {
  title: "¿Listo para",
  titleAccent: "profesionalizar tu gestión?",
  subtitle:
    "Únete a instructores independientes que ya trabajan con orden, datos y tranquilidad.",
  primaryCta: "Crear cuenta gratis",
  secondaryCta: "Ver demo",
  note: "Sin tarjeta de crédito · Configuración en minutos",
};
