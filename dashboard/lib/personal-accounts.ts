import { PERSONAL_ACCOUNTS } from "@/lib/data";

// Adrian's account balances, editable in the app and saved on the device.
export type Accounts = { checking: number; savings: number; credit: number };

const KEY = "n2s_personal_accounts";

export function getAccounts(): Accounts {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "null");
    if (a && typeof a.checking === "number") return a;
  } catch {
    /* ignore */
  }
  return { ...PERSONAL_ACCOUNTS };
}

export function saveAccounts(a: Accounts) {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}
