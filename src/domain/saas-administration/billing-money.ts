import { ValidationError } from "@/domain/shared/errors";

export const maxClpAmount = 9_999_999_999;

export interface BillingRate {
  numerator: bigint;
  denominator: bigint;
}

export function assertClpAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > maxClpAmount) {
    throw new ValidationError([{
      path: "amount",
      message: `El importe debe ser un número entero entre 0 y ${maxClpAmount} pesos.`,
    }]);
  }
}

export function billingRate(numerator: bigint, denominator: bigint): BillingRate {
  if (numerator < BigInt(0) || denominator <= BigInt(0)) {
    throw new ValidationError([{
      path: "rate",
      message: "La tarifa debe ser no negativa y su divisor debe ser positivo.",
    }]);
  }
  let a = numerator;
  let b = denominator;
  while (b !== BigInt(0)) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return { numerator: numerator / a, denominator: denominator / a };
}

export function roundClpRate(rate: BillingRate): number {
  const { numerator, denominator } = billingRate(rate.numerator, rate.denominator);
  const rounded = (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
  if (rounded > BigInt(maxClpAmount)) {
    throw new ValidationError([{
      path: "amount",
      message: "El resultado excede el importe máximo permitido en pesos.",
    }]);
  }
  return Number(rounded);
}

export function includedVat(total: number) {
  assertClpAmount(total);
  const net = roundClpRate(billingRate(BigInt(total) * BigInt(100), BigInt(119)));
  return { total, net, vat: total - net, vatRate: 19 };
}
