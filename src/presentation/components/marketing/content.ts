export interface HeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
}

export const heroContent: HeroContent = {
  eyebrow: "Gestión deportiva sin fricción",
  title: "El control de tu box, en una sola plataforma",
  subtitle:
    "Sport Admin reemplaza las planillas y los grupos de WhatsApp por un panel operativo diario: asistencia, cobros y evolución de cada alumno, incluso sin conexión.",
  primaryCta: "Crear cuenta gratis",
  secondaryCta: "Iniciar sesión",
};

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
      "Sabé qué alumnos pagaron, cuáles están pendientes y cuánto factura cada locación, sin abrir una planilla ni perseguir comprobantes.",
  },
  {
    id: "student-visibility",
    title: "Visibilidad total de tus alumnos",
    description:
      "Asistencia, evolución física y estado de cada alumno en un solo lugar, para tomar decisiones antes de que un alumno se dé de baja.",
  },
  {
    id: "growth-opportunity",
    title: "Espacio para crecer",
    description:
      "Sumá locaciones, instructores y horarios sin perder el control: la misma gestión que hoy te ordena, escala con tu box mañana.",
  },
];

export interface FinalCtaContent {
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
}

export const finalCtaContent: FinalCtaContent = {
  title: "Empezá a gestionar mejor hoy",
  subtitle:
    "Creá tu cuenta y configurá tu primer tenant en minutos. Sin tarjeta de crédito.",
  primaryCta: "Crear cuenta gratis",
  secondaryCta: "Ya tengo cuenta",
};
