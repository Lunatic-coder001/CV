import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { Expense, Product, StockEvent } from "./domain";
import { ownerCollection } from "./repository";
export function useInventory(uid: string) {
  const [products, setProducts] = useState<Product[]>([]),
    [events, setEvents] = useState<StockEvent[]>([]),
    [expenses, setExpenses] = useState<Expense[]>([]);
  const [ready, setReady] = useState<Record<string, boolean>>({}),
    [error, setError] = useState("");
  useEffect(() => {
    setProducts([]);
    setEvents([]);
    setExpenses([]);
    setReady({});
    setError("");
    const collections = [
      ["products", setProducts],
      ["events", setEvents],
      ["expenses", setExpenses],
    ] as const;
    const off = collections.map(([name, set]) =>
      onSnapshot(
        ownerCollection(uid, name),
        { includeMetadataChanges: true },
        (snap) => {
          (set as (data: any[]) => void)(
            snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          );
          setReady((r) => ({ ...r, [name]: !snap.metadata.fromCache }));
        },
        (e) => {
          setError(
            e.code === "permission-denied"
              ? "Access denied. Deploy the included Firebase rules to your project."
              : e.message,
          );
          setReady((r) => ({ ...r, [name]: false }));
        },
      ),
    );
    return () => off.forEach((f) => f());
  }, [uid]);
  return {
    products: [...products].sort(
      (a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name),
    ),
    events,
    expenses,
    error,
    online: ["products", "events", "expenses"].every((k) => ready[k]),
  };
}
