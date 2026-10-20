import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import {
  getMetadata,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "./firebase";
import { dateKey, Expense, invariant, Product, stockChange } from "./domain";
export const ownerCollection = (uid: string, name: string) =>
  collection(db!, "owners", uid, name);
export const newId = (uid: string, name: string) =>
  doc(ownerCollection(uid, name)).id;
export async function uploadPhoto(uid: string, id: string, uri: string) {
  const path = `owners/${uid}/products/${id}.jpg`,
    photo = ref(storage!, path);
  // A retry may follow a successful upload whose response was lost.
  // Unique product IDs make reusing this immutable object safe.
  try {
    await getMetadata(photo);
    return path;
  } catch (e: any) {
    if (e.code !== "storage/object-not-found") throw e;
  }
  const response = await fetch(uri),
    blob = await response.blob();
  invariant(
    blob.size > 0 && blob.size < 5 * 1024 * 1024,
    "Photo must be smaller than 5 MB. Choose another image.",
  );
  await uploadBytes(photo, blob, { contentType: "image/jpeg" });
  return path;
}
export async function photoUrl(path: string) {
  return getDownloadURL(ref(storage!, path));
}
export type OpeningProduct = Omit<Product, "lastEventId">;
export async function addProduct(
  uid: string,
  product: OpeningProduct,
  operationId: string,
) {
  const p = doc(ownerCollection(uid, "products"), product.id),
    e = doc(ownerCollection(uid, "events"), operationId);
  await runTransaction(db!, async (tx) => {
    const existing = await tx.get(e);
    if (existing.exists()) return;
    invariant(!(await tx.get(p)).exists(), "Product already exists.");
    tx.set(p, { ...product, lastEventId: operationId });
    tx.set(e, {
      productId: product.id,
      kind: "opening",
      label: `${product.brand} · ${product.name} · ${product.size}`,
      qty: product.qty,
      amountPaise: product.valuePaise,
      costPaise: product.valuePaise,
      beforeQty: 0,
      beforeValue: 0,
      afterQty: product.qty,
      afterValue: product.valuePaise,
      dateKey: dateKey(),
      note: "Opening stock",
      occurredAt: serverTimestamp(),
    });
  });
}
export async function recordStock(
  uid: string,
  id: string,
  kind: "sale" | "restock",
  qty: number,
  amount: number,
  date: string,
  note: string,
  operationId: string,
) {
  const p = doc(ownerCollection(uid, "products"), id),
    e = doc(ownerCollection(uid, "events"), operationId);
  await runTransaction(db!, async (tx) => {
    if ((await tx.get(e)).exists()) return;
    const snap = await tx.get(p);
    invariant(snap.exists(), "Product no longer exists.");
    const product = snap.data() as Product,
      next = stockChange(product, kind, qty, amount);
    tx.update(p, {
      qty: next.qty,
      valuePaise: next.valuePaise,
      lastEventId: operationId,
    });
    tx.set(e, {
      productId: id,
      kind,
      label: `${product.brand} · ${product.name} · ${product.size}`,
      qty,
      amountPaise: amount,
      costPaise: next.costPaise,
      beforeQty: product.qty,
      beforeValue: product.valuePaise,
      afterQty: next.qty,
      afterValue: next.valuePaise,
      dateKey: date,
      note,
      occurredAt: serverTimestamp(),
    });
  });
}
export async function addExpense(
  uid: string,
  expense: Omit<Expense, "id">,
  operationId: string,
) {
  const e = doc(ownerCollection(uid, "expenses"), operationId);
  await runTransaction(db!, async (tx) => {
    if ((await tx.get(e)).exists()) return;
    tx.set(e, { ...expense, occurredAt: serverTimestamp() });
  });
}
