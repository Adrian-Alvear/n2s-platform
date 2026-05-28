export const MEMBERS = ["Adrian", "Javi", "Yazmi"] as const;
export type Member = (typeof MEMBERS)[number];

export const MEMBER_COLORS: Record<Member, string> = {
  Adrian: "bg-blue-100 text-blue-700",
  Javi: "bg-violet-100 text-violet-700",
  Yazmi: "bg-pink-100 text-pink-700",
};

export const CATEGORIES = [
  "Arriendo",
  "Carro",
  "Seguro",
  "Internet",
  "Agua",
  "Gas",
  "Gasolina",
  "Renta Calentador",
  "Comida y Aseo",
  "Comida Recreativa",
  "Cumpleaños",
  "Transporte Uber",
  "Mto Carro",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_BUDGETS: Record<Category, number> = {
  Arriendo: 2950,
  Carro: 621.40,
  Seguro: 384.34,
  Internet: 81.30,
  Agua: 140,
  Gas: 100,
  Gasolina: 220,
  "Renta Calentador": 127,
  "Comida y Aseo": 600,
  "Comida Recreativa": 200,
  Cumpleaños: 33,
  "Transporte Uber": 400,
  "Mto Carro": 100,
};

export const INCOME: Record<string, number> = {
  Javi: 3000,
  Yazmi: 3000,
  Adrian: 3000,
};

export type Entry = {
  id: number;
  date: string;
  description: string;
  category: Category;
  amount: number;
  member: Member;
};

export const SAMPLE_ENTRIES: Entry[] = [
  { id: 1, date: "2026-05-01", description: "Arriendo mayo", category: "Arriendo", amount: 2950, member: "Adrian" },
  { id: 2, date: "2026-05-03", description: "Mercado semanal", category: "Comida y Aseo", amount: 180, member: "Yazmi" },
  { id: 3, date: "2026-05-05", description: "Factura luz", category: "Gas", amount: 95, member: "Javi" },
  { id: 4, date: "2026-05-08", description: "Gasolina", category: "Gasolina", amount: 60, member: "Adrian" },
  { id: 5, date: "2026-05-10", description: "Uber al aeropuerto", category: "Transporte Uber", amount: 35, member: "Yazmi" },
];

export function getProgressColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 80) return "bg-orange-400";
  if (pct >= 60) return "bg-yellow-400";
  return "bg-emerald-500";
}

export function getProgressBg(pct: number): string {
  if (pct >= 100) return "bg-red-100";
  if (pct >= 80) return "bg-orange-100";
  if (pct >= 60) return "bg-yellow-100";
  return "bg-emerald-100";
}
