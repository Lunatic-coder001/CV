import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  runTransaction,
  Firestore,
} from "firebase/firestore";
import { ref, uploadBytes, getBytes } from "firebase/storage";
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-little-stock",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
});
// RulesTestContext returns compat Firestore, which modular functions unwrap at runtime.
function store(uid?: string): Firestore {
  return (uid
    ? env.authenticatedContext(uid)
    : env.unauthenticatedContext()
  ).firestore() as unknown as Firestore;
}
function product(qty = 10, value = 10000, event = "opening") {
  return {
    id: "p1",
    name: "Pants",
    brand: "Pampers",
    category: "Baby / Child",
    type: "Diapers",
    size: "M",
    packSize: 10,
    qty,
    valuePaise: value,
    lowAt: 5,
    photoPath: "owners/alice/products/p1.jpg",
    lastEventId: event,
  };
}
function opening(qty = 10, value = 10000) {
  return {
    productId: "p1",
    kind: "opening",
    label: "Pampers · Pants · M",
    qty,
    amountPaise: value,
    costPaise: value,
    beforeQty: 0,
    beforeValue: 0,
    afterQty: qty,
    afterValue: value,
    dateKey: "2026-10-20",
    note: "",
    occurredAt: serverTimestamp(),
  };
}
async function seed(db: Firestore, qty = 10, value = 10000) {
  const b = writeBatch(db);
  b.set(doc(db, "owners/alice/products/p1"), product(qty, value));
  b.set(doc(db, "owners/alice/events/opening"), opening(qty, value));
  await b.commit();
}
function sale(db: Firestore, id: string, qty: number, amount = 11500) {
  return runTransaction(db, async (tx) => {
    const p = doc(db, "owners/alice/products/p1"),
      s = await tx.get(p),
      old = s.data()!;
    if (qty > old.qty) throw Error("insufficient stock");
    const cost = Math.round((old.valuePaise * qty) / old.qty),
      next = {
        ...old,
        qty: old.qty - qty,
        valuePaise: old.valuePaise - cost,
        lastEventId: id,
      };
    tx.update(p, next);
    tx.set(doc(db, "owners/alice/events/" + id), {
      ...opening(),
      kind: "sale",
      qty,
      amountPaise: amount,
      costPaise: cost,
      beforeQty: old.qty,
      beforeValue: old.valuePaise,
      afterQty: next.qty,
      afterValue: next.valuePaise,
    });
  });
}
test("unauthenticated users and other owners cannot read inventory", async () => {
  const alice = store("alice");
  await seed(alice);
  await assertSucceeds(getDoc(doc(alice, "owners/alice/products/p1")));
  for (const db of [store(), store("bob")])
    await assertFails(getDoc(doc(db, "owners/alice/products/p1")));
});
test("product and opening ledger must be saved together", async () => {
  const db = store("alice");
  await assertFails(setDoc(doc(db, "owners/alice/products/p1"), product()));
  await assertSucceeds(seed(db));
});
test("valid sale records cost and reduces stock atomically", async () => {
  const db = store("alice");
  await seed(db);
  await assertSucceeds(sale(db, "sale1", 1));
  assert.equal(
    (await getDoc(doc(db, "owners/alice/products/p1"))).data()!.qty,
    9,
  );
  assert.equal(
    (await getDoc(doc(db, "owners/alice/events/sale1"))).data()!.costPaise,
    1000,
  );
});
test("reject direct balance edits and immutable-ledger changes", async () => {
  const db = store("alice");
  await seed(db);
  await assertFails(
    updateDoc(doc(db, "owners/alice/products/p1"), { qty: 99 }),
  );
  await assertFails(
    updateDoc(doc(db, "owners/alice/events/opening"), { amountPaise: 1 }),
  );
  await assertFails(deleteDoc(doc(db, "owners/alice/events/opening")));
});
test("reject fabricated cost on a sale", async () => {
  const db = store("alice");
  await seed(db);
  const b = writeBatch(db);
  b.update(doc(db, "owners/alice/products/p1"), {
    qty: 9,
    valuePaise: 10000,
    lastEventId: "fake",
  });
  b.set(doc(db, "owners/alice/events/fake"), {
    ...opening(),
    kind: "sale",
    qty: 1,
    amountPaise: 11500,
    costPaise: 0,
    beforeQty: 10,
    beforeValue: 10000,
    afterQty: 9,
    afterValue: 10000,
  });
  await assertFails(b.commit());
});
test("two competing sales cannot oversell the last piece", async () => {
  const db = store("alice");
  await seed(db, 1, 10000);
  const results = await Promise.allSettled([
    sale(db, "s1", 1),
    sale(db, "s2", 1),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (await getDoc(doc(db, "owners/alice/products/p1"))).data()!.qty,
    0,
  );
});
test("expenses are owner-only, positive and immutable", async () => {
  const db = store("alice"),
    path = "owners/alice/expenses/e1",
    data = {
      category: "Transport",
      amountPaise: 10000,
      dateKey: "2026-10-20",
      note: "Auto fare",
      occurredAt: serverTimestamp(),
    };
  await assertSucceeds(setDoc(doc(db, path), data));
  await assertFails(updateDoc(doc(db, path), { amountPaise: 0 }));
  await assertFails(
    setDoc(doc(db, "owners/alice/expenses/e2"), { ...data, amountPaise: -1 }),
  );
  await assertFails(getDoc(doc(store("bob"), path)));
});
test("photos allow only owner access and JPEG uploads", async () => {
  const a = env.authenticatedContext("alice").storage(),
    bob = env.authenticatedContext("bob").storage(),
    p = "owners/alice/products/p1.jpg";
  await assertSucceeds(
    uploadBytes(ref(a, p), new Uint8Array([1, 2, 3]), {
      contentType: "image/jpeg",
    }),
  );
  await assertFails(getBytes(ref(bob, p)));
  await assertFails(
    uploadBytes(ref(a, "owners/alice/products/p2.jpg"), new Uint8Array([1]), {
      contentType: "text/html",
    }),
  );
  await assertFails(
    uploadBytes(ref(bob, "owners/alice/products/p3.jpg"), new Uint8Array([1]), {
      contentType: "image/jpeg",
    }),
  );
});
