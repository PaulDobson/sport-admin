export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
  }).format(amount);
}
