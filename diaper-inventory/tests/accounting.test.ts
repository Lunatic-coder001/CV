import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dateKey,
  moneyInput,
  parseDate,
  quantity,
  reportFor,
  stockChange,
  StockEvent,
  Expense,
} from "../src/domain";
test("rupee input converts exactly to integer paise", () => {
  assert.equal(moneyInput("115"), 11500);
  assert.equal(moneyInput("120.50"), 12050);
  assert.equal(moneyInput("0.01"), 1);
  for (const bad of ["", "1.001", "-1", "Infinity", "1e3"])
    assert.throws(() => moneyInput(bad));
});
test("packs and loose pieces share a single stock balance", () => {
  assert.equal(quantity("3", "2", 10), 32);
  assert.equal(quantity("", "5", 12), 5);
  assert.throws(() => quantity("1.2", "0", 10));
});
test("bargained prices affect profit without changing historical purchase cost", () => {
  for (const price of [11500, 12000, 13000]) {
    const sale = stockChange({ qty: 1, valuePaise: 10000 }, "sale", 1, price);
    assert.equal(price - sale.costPaise, price - 10000);
    assert.equal(sale.qty, 0);
    assert.equal(sale.valuePaise, 0);
  }
});
test("weighted average reflects differently priced restocks", () => {
  const next = stockChange(
    { qty: 10, valuePaise: 10000 },
    "restock",
    10,
    20000,
  );
  assert.equal(next.valuePaise, 30000);
  const sale = stockChange(next, "sale", 5, 10000);
  assert.equal(sale.costPaise, 7500);
  assert.equal(sale.valuePaise, 22500);
});
test("rounding preserves all purchase cost down to the final piece", () => {
  let stock = { qty: 3, valuePaise: 100 };
  let costs = 0;
  for (let i = 0; i < 3; i++) {
    const n = stockChange(stock, "sale", 1, 100);
    costs += n.costPaise;
    stock = n;
  }
  assert.equal(costs, 100);
  assert.equal(stock.valuePaise, 0);
});
test("reject overselling, zero, fractional or negative stock", () => {
  const p = { qty: 4, valuePaise: 400 };
  for (const n of [5, 0, -1, 1.5])
    assert.throws(() => stockChange(p, "sale", n, 100));
});
test("day reports use sales cost and expenses without subtracting stock purchases twice", () => {
  const sale = (dateKey: string, amountPaise: number, costPaise: number) =>
    ({ kind: "sale", dateKey, amountPaise, costPaise, qty: 1 }) as StockEvent;
  const events = [
    sale("2026-10-20", 11500, 10000),
    sale("2026-10-20", 13000, 10000),
    sale("2026-10-19", 50000, 10000),
    {
      kind: "restock",
      dateKey: "2026-10-20",
      amountPaise: 990000,
      qty: 100,
    } as StockEvent,
  ];
  const expenses = [
    { dateKey: "2026-10-20", amountPaise: 1000 },
    { dateKey: "2026-10-20", amountPaise: 500 },
    { dateKey: "2026-10-19", amountPaise: 99000 },
  ] as Expense[];
  const r = reportFor("2026-10-20", events, expenses);
  assert.equal(r.revenue, 24500);
  assert.equal(r.cogs, 20000);
  assert.equal(r.expenses, 1500);
  assert.equal(r.net, 3000);
  assert.equal(r.pieces, 2);
});
test("a day with expenses and no sales has a negative net result", () => {
  const r = reportFor("2026-10-20", [], [
    { dateKey: "2026-10-20", amountPaise: 500 },
  ] as Expense[]);
  assert.equal(r.net, -500);
});
test("shop day follows India midnight rather than the device timezone", () => {
  assert.equal(dateKey(new Date("2026-10-19T18:29:59Z")), "2026-10-19");
  assert.equal(dateKey(new Date("2026-10-19T18:30:00Z")), "2026-10-20");
});
test("reject invalid dates and accept leap days", () => {
  assert.equal(parseDate("29/02/2024"), "2024-02-29");
  for (const d of ["31/02/2024", "29/02/2025", "01/01/2099", "2026-10-20"])
    assert.throws(() => parseDate(d));
});
