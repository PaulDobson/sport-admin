import type { BillingCycle } from "@/domain/instructor-finance/membership";

export interface PlanTemplate {
  id: string;
  label: string;
  description: string;
  name: string;
  billingCycle: BillingCycle;
  /** Suggested CLP price; only applied when the price field is still empty. */
  suggestedPrice: number;
  expirationGraceDays: number;
  benefits: string[];
}

export const planTemplates: PlanTemplate[] = [
  {
    id: "monthly",
    label: "Mensual",
    description: "Cobro cada mes, ideal para empezar.",
    name: "Plan mensual",
    billingCycle: "monthly",
    suggestedPrice: 35000,
    expirationGraceDays: 5,
    benefits: ["Clases ilimitadas", "Evaluación inicial"],
  },
  {
    id: "quarterly",
    label: "Trimestral",
    description: "Tres meses con mejor precio mensual.",
    name: "Plan trimestral",
    billingCycle: "quarterly",
    suggestedPrice: 95000,
    expirationGraceDays: 7,
    benefits: ["Clases ilimitadas", "Evaluación trimestral"],
  },
  {
    id: "semiannual",
    label: "Semestral",
    description: "Seis meses para alumnos comprometidos.",
    name: "Plan semestral",
    billingCycle: "semiannual",
    suggestedPrice: 180000,
    expirationGraceDays: 10,
    benefits: ["Clases ilimitadas", "Seguimiento mensual"],
  },
  {
    id: "annual",
    label: "Anual",
    description: "Un pago al año con el mayor descuento.",
    name: "Plan anual",
    billingCycle: "annual",
    suggestedPrice: 330000,
    expirationGraceDays: 15,
    benefits: ["Clases ilimitadas", "Seguimiento mensual", "Congelamiento 1 mes"],
  },
];

export const billingCycleLabels: Record<BillingCycle, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

/** Noun used after the price, e.g. "$35.000 / mes". */
export const billingCycleNouns: Record<BillingCycle, string> = {
  monthly: "mes",
  quarterly: "trimestre",
  semiannual: "semestre",
  annual: "año",
};

export const supportedCurrencies = ["CLP", "USD", "EUR"] as const;

export const gracePresets = [0, 3, 5, 7, 15] as const;
