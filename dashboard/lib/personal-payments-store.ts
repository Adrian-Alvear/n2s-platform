// Adrian's recurring monthly payments checklist (Car, Insurance, …), saved on
// the device. Shared between the checklist component and the home dashboard.

export type Payment = { id: string; name: string; amount: number; paid: boolean };

export const PAYMENTS_KEY = "n2s_personal_payments";

export const DEFAULT_PAYMENTS: Payment[] = [
  { id: "car", name: "Car", amount: 0, paid: false },
  { id: "insurance", name: "Insurance", amount: 0, paid: false },
];

export function getPayments(): Payment[] {
  try {
    const s = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || "null");
    if (Array.isArray(s)) return s;
  } catch {
    /* ignore */
  }
  return DEFAULT_PAYMENTS;
}

export function savePayments(items: Payment[]) {
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function paymentsTotal(items: Payment[]): number {
  return items.reduce((s, i) => s + i.amount, 0);
}
