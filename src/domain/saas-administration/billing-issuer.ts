export interface BillingIssuer {
  id: string;
  versionNumber: number;
  legalName: string;
  taxId: string;
  address: string;
  email: string;
  createdAt: string;
}

export interface SaveBillingIssuerInput {
  operationId: string;
  expectedVersionId: string | null;
  legalName: string;
  taxId: string;
  address: string;
  email: string;
  reason: string;
}

export function normalizeIssuerTaxId(value: string): string {
  return value.trim().replace(/\./g, "").toUpperCase();
}

export function isValidIssuerTaxId(value: string): boolean {
  if (!/^[0-9]{7,8}-[0-9K]$/.test(value)) return false;
  const [digits, verifier] = value.split("-");
  if (Number(digits) === 0) return false;
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * weight;
    weight = weight === 7 ? 2 : weight + 1;
  }
  const remainder = 11 - sum % 11;
  return verifier === (remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder));
}
