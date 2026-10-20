export const CATEGORIES = ["Baby / Child", "Women", "Adult"] as const;
export const TYPES = ["Diapers", "Wipes", "Sanitary pads"] as const;
export const SIZES = ["S", "M", "L", "XL", "Not sized"] as const;
export const EXPENSE_TYPES = [
  "Market rent",
  "Transport",
  "Tea & snacks",
  "Other",
] as const;
export const SHOP_TIMEZONE = "Asia/Kolkata";
export type Product = {
  id: string;
  name: string;
  brand: string;
  category: (typeof CATEGORIES)[number];
  type: (typeof TYPES)[number];
  size: (typeof SIZES)[number];
  packSize: number;
  qty: number;
  valuePaise: number;
  lowAt: number;
  photoPath: string;
  lastEventId: string;
};
export type StockEvent = {
  id: string;
  kind: "opening" | "restock" | "sale";
  productId: string;
  label: string;
  qty: number;
  amountPaise: number;
  costPaise: number;
  beforeQty: number;
  beforeValue: number;
  afterQty: number;
  afterValue: number;
  dateKey: string;
  note: string;
  occurredAt?: unknown;
};
export type Expense = {
  id: string;
  category: (typeof EXPENSE_TYPES)[number];
  amountPaise: number;
  dateKey: string;
  note: string;
};
export type Report = {
  dateKey: string;
  revenue: number;
  cogs: number;
  expenses: number;
  gross: number;
  net: number;
  pieces: number;
  sales: StockEvent[];
  costs: Expense[];
};
export function invariant(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function integer(
  value: string | number,
  label: string,
  min = 0,
  max = 1_000_000,
) {
  invariant(
    String(value).trim() !== "" && /^\d+$/.test(String(value)),
    `${label} must be a whole number.`,
  );
  const n = Number(value);
  invariant(
    Number.isSafeInteger(n) && n >= min && n <= max,
    `${label} must be between ${min} and ${max}.`,
  );
  return n;
}
export function moneyInput(value: string, label = "Amount") {
  invariant(
    /^\d+(\.\d{1,2})?$/.test(value.trim()),
    `${label}: enter rupees with up to 2 decimal places.`,
  );
  const [r, p = ""] = value.trim().split(".");
  const n = Number(r) * 100 + Number(p.padEnd(2, "0"));
  invariant(
    Number.isSafeInteger(n) && n <= 1_000_000_000,
    `${label} is too large.`,
  );
  return n;
}
export function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
export function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function displayDate(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}
export function parseDate(input: string) {
  invariant(
    /^\d{2}\/\d{2}\/\d{4}$/.test(input),
    "Use DD/MM/YYYY for the date.",
  );
  const [d, m, y] = input.split("/").map(Number),
    date = new Date(Date.UTC(y, m - 1, d));
  invariant(
    date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d,
    "Enter a valid calendar date.",
  );
  const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  invariant(
    key <= dateKey() && y >= 2020,
    "Choose today or a previous date from 2020 onwards.",
  );
  return key;
}
export function quantity(packs: string, loose: string, packSize: number) {
  const n =
    integer(packs || "0", "Packs") * packSize +
    integer(loose || "0", "Loose pieces");
  invariant(n <= 1_000_000, "Quantity cannot exceed 1,000,000 pieces.");
  return n;
}
export function stockChange(
  product: Pick<Product, "qty" | "valuePaise">,
  kind: "sale" | "restock",
  qty: number,
  amountPaise: number,
) {
  integer(qty, "Quantity", 1);
  integer(amountPaise, "Amount in paise", 0, 1_000_000_000);
  invariant(
    product.qty >= 0 && product.valuePaise >= 0,
    "Invalid inventory balance.",
  );
  if (kind === "sale") {
    invariant(
      qty <= product.qty,
      "Not enough stock. Reduce the quantity or add stock first.",
    );
    // Allocate integer paise using weighted average. The final sale consumes the entire remaining cost.
    const costPaise = Math.round((product.valuePaise * qty) / product.qty);
    return {
      qty: product.qty - qty,
      valuePaise: product.valuePaise - costPaise,
      costPaise,
    };
  }
  invariant(
    product.qty + qty <= 1_000_000 &&
      product.valuePaise + amountPaise <= 1_000_000_000,
    "Inventory limit exceeded.",
  );
  return {
    qty: product.qty + qty,
    valuePaise: product.valuePaise + amountPaise,
    costPaise: amountPaise,
  };
}
export function reportFor(
  date: string,
  events: StockEvent[],
  expenses: Expense[],
): Report {
  const sales = events.filter((e) => e.kind === "sale" && e.dateKey === date);
  const costs = expenses.filter((e) => e.dateKey === date);
  const revenue = sales.reduce((n, e) => n + e.amountPaise, 0),
    cogs = sales.reduce((n, e) => n + e.costPaise, 0),
    total = costs.reduce((n, e) => n + e.amountPaise, 0);
  return {
    dateKey: date,
    revenue,
    cogs,
    expenses: total,
    gross: revenue - cogs,
    net: revenue - cogs - total,
    pieces: sales.reduce((n, e) => n + e.qty, 0),
    sales,
    costs,
  };
}
export function reportText(r: Report) {
  return [
    `LITTLE STOCK · Daily closing report`,
    displayDate(r.dateKey) + " · India time",
    "",
    ...r.sales.map(
      (e) =>
        `${e.label}: ${e.qty} pcs · collected ${money(e.amountPaise)} · cost ${money(e.costPaise)}`,
    ),
    "",
    `Revenue: ${money(r.revenue)}`,
    `Cost of items sold: ${money(r.cogs)}`,
    `Gross profit: ${money(r.gross)}`,
    "",
    ...r.costs.map(
      (e) =>
        `${e.category}${e.note ? " (" + e.note + ")" : ""}: ${money(e.amountPaise)}`,
    ),
    `Expenses: ${money(r.expenses)}`,
    `Net profit: ${money(r.net)}`,
  ].join("\n");
}
