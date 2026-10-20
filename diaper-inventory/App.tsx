import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { auth, missingConfig } from "./src/firebase";
import {
  Button,
  Chips,
  colors,
  ErrorText,
  Field,
  Icon,
  s,
  Sheet,
} from "./src/ui";
import {
  CATEGORIES,
  dateKey,
  displayDate,
  Expense,
  money,
  parseDate,
  Product,
  reportFor,
  reportText,
  SIZES,
  StockEvent,
  TYPES,
} from "./src/domain";
import { ExpenseForm, explainError, ProductForm, StockForm } from "./src/forms";
import { photoUrl } from "./src/repository";
import { useInventory } from "./src/useInventory";
function ProductPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl("");
    setFailed(false);
    photoUrl(path)
      .then((u) => active && setUrl(u))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [path]);
  return url && !failed ? (
    <Image
      source={{ uri: url }}
      accessibilityLabel="Product photo"
      style={s.photo}
      onError={() => setFailed(true)}
    />
  ) : (
    <View style={[s.photo, { alignItems: "center", justifyContent: "center" }]}>
      <Icon name={failed ? "image-outline" : "hourglass-outline"} />
    </View>
  );
}
function SetupScreen() {
  return (
    <View style={s.container}>
      <Text style={[s.logo, { marginTop: 40, marginBottom: 40 }]}>
        ▧ little stock.
      </Text>
      <Text style={s.h1}>Your shop starts here.</Text>
      <Text style={s.sub}>
        Connect your Firebase project to enable secure owner sign-in, product
        photos and inventory sync across devices.
      </Text>
      <View style={s.card}>
        <Text style={s.h2}>Firebase configuration needed</Text>
        <Text style={[s.sub, { marginTop: 12, marginBottom: 10 }]}>
          Copy .env.example to .env, fill in your Firebase web app
          configuration, enable Email/Password authentication, create Firestore
          and Storage, and deploy the included rules.
        </Text>
        <Text style={s.meta}>Missing: {missingConfig.join(", ")}</Text>
      </View>
      <Text style={s.hint}>
        See README.md for the exact steps. No sample stock is inserted. Never
        put a service-account key in the app.
      </Text>
    </View>
  );
}
function AuthScreen() {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const submit = async (reset = false) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!email.trim()) throw Error("Enter your email address.");
      if (reset) {
        await sendPasswordResetEmail(auth!, email.trim());
        setMessage(
          "If this account exists, a password-reset link will be sent.",
        );
      } else if (register) {
        if (password.length < 8)
          throw Error("Choose a password with at least 8 characters.");
        await createUserWithEmailAndPassword(auth!, email.trim(), password);
      } else await signInWithEmailAndPassword(auth!, email.trim(), password);
    } catch (e: any) {
      const c = e.code;
      setError(
        c === "auth/invalid-credential"
          ? "Email or password is incorrect."
          : c === "auth/email-already-in-use"
            ? "This email already has an account. Sign in instead."
            : c === "auth/operation-not-allowed"
              ? "Enable Email/Password sign-in in your Firebase console."
              : explainError(e),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.container, { paddingTop: 45 }]}
      >
        <View style={{ marginBottom: 45 }}>
          <Icon name="cube" size={42} />
          <Text style={[s.logo, { marginTop: 12 }]}>little stock.</Text>
        </View>
        <Text style={s.h1}>
          {register ? "Your shop, in your pocket." : "Welcome back."}
        </Text>
        <Text style={s.sub}>
          {register
            ? "Create your owner account. Your inventory is private and starts empty."
            : "Sign in to check stock, record a sale and close the day — wherever you are."}
        </Text>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          editable={!busy}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={register ? "new-password" : "current-password"}
          editable={!busy}
          help={register ? "At least 8 characters." : ""}
        />
        <ErrorText message={error} />
        {!!message && <Text style={s.previewText}>{message}</Text>}
        <Button
          title={register ? "Create owner account" : "Sign in"}
          onPress={() => submit()}
          busy={busy}
        />
        {!register && (
          <Pressable
            accessibilityRole="button"
            onPress={() => submit(true)}
            disabled={busy}
            style={{ padding: 17, alignItems: "center" }}
          >
            <Text style={s.meta}>Forgot password?</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            setRegister(!register);
            setError("");
          }}
          style={{ padding: 20, alignItems: "center" }}
        >
          <Text style={{ color: colors.green, fontSize: 13 }}>
            {register
              ? "Already registered? Sign in"
              : "New here? Create an owner account"}
          </Text>
        </Pressable>
        <Text style={[s.hint, { textAlign: "center" }]}>
          Owner only · Live inventory · Daily reports
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
type Form =
  | { kind: "new" }
  | { kind: "expense" }
  | { kind: "sale" | "restock"; product: Product }
  | { kind: "pick"; action: "sale" | "restock" }
  | null;
function Metric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <View style={[s.between, { marginVertical: 7 }]}>
      <Text
        style={[s.metric, strong && { fontWeight: "700", color: colors.ink }]}
      >
        {label}
      </Text>
      <Text
        style={[
          s.metricValue,
          strong && {
            fontSize: 21,
            color: value < 0 ? colors.red : colors.green,
          },
        ]}
      >
        {money(value)}
      </Text>
    </View>
  );
}
function Reports({
  events,
  expenses,
  canWrite,
  expense,
}: {
  events: StockEvent[];
  expenses: Expense[];
  canWrite: boolean;
  expense: () => void;
}) {
  const [selected, setSelected] = useState(dateKey()),
    [input, setInput] = useState(displayDate(dateKey())),
    [error, setError] = useState("");
  const days = [
    ...new Set([
      dateKey(),
      ...events.map((e) => e.dateKey),
      ...expenses.map((e) => e.dateKey),
    ]),
  ]
    .sort()
    .reverse();
  const report = reportFor(selected, events, expenses);
  return (
    <>
      <Text style={s.h1}>Close the day.</Text>
      <Text style={s.sub}>What came in, what went out, what you earned.</Text>
      <View style={[s.row, { alignItems: "flex-start" }]}>
        <View style={{ flex: 1 }}>
          <Field
            label="Report date · DD/MM/YYYY"
            value={input}
            onChangeText={setInput}
            maxLength={10}
          />
        </View>
        <View style={{ marginTop: 21 }}>
          <Button
            title="View"
            secondary
            onPress={() => {
              try {
                setSelected(parseDate(input));
                setError("");
              } catch (e: any) {
                setError(e.message);
              }
            }}
          />
        </View>
      </View>
      <ErrorText message={error} />
      <View style={s.hero}>
        <Text style={s.eyebrow}>{displayDate(selected)} · Daily closing</Text>
        <Text style={s.total}>{money(report.net)}</Text>
        <Text style={{ color: "#d4e2cc", fontSize: 12 }}>
          Net profit after product costs & expenses
        </Text>
        <View style={s.heroStats}>
          <View>
            <Text style={s.statN}>{report.pieces}</Text>
            <Text style={s.statLabel}>Pieces sold</Text>
          </View>
          <View>
            <Text style={s.statN}>{report.sales.length}</Text>
            <Text style={s.statLabel}>Sale entries</Text>
          </View>
        </View>
      </View>
      <View style={s.card}>
        <Metric label="Money collected / revenue" value={report.revenue} />
        <Metric label="Cost of items sold" value={report.cogs} />
        <View style={s.divider} />
        <Metric label="Gross profit" value={report.gross} />
        <Metric label="Market & daily expenses" value={report.expenses} />
        <View style={s.divider} />
        <Metric label="Net profit" value={report.net} strong />
      </View>
      <View style={[s.row, { marginBottom: 12 }]}>
        <View style={{ flex: 1 }}>
          <Button
            title="Add expense"
            secondary
            icon="add"
            onPress={expense}
            disabled={!canWrite}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Share report"
            secondary
            icon="share-outline"
            onPress={async () => {
              try {
                await Share.share({ message: reportText(report) });
              } catch (e: any) {
                setError(e.message);
              }
            }}
          />
        </View>
      </View>
      <Text style={s.hint}>
        Reports update automatically. Backdated entries revise the selected day.
        Costs use weighted-average stock cost at the time you record each sale.
        Purchases are not deducted again as daily expenses.
      </Text>
      <Text style={[s.h2, s.sectionTitle]}>Sales · {report.sales.length}</Text>
      {report.sales.length ? (
        report.sales.map((e) => (
          <View style={s.card} key={e.id}>
            <Text style={s.name}>{e.label}</Text>
            <Text style={s.meta}>
              {e.qty} pieces · {money(e.amountPaise)} collected
            </Text>
            <View style={s.divider} />
            <View style={s.between}>
              <Text style={s.meta}>Product cost {money(e.costPaise)}</Text>
              <Text style={s.badge}>
                Profit {money(e.amountPaise - e.costPaise)}
              </Text>
            </View>
            {!!e.note && <Text style={s.meta}>{e.note}</Text>}
          </View>
        ))
      ) : (
        <Text style={s.sub}>No sales recorded for this day.</Text>
      )}
      <Text style={[s.h2, s.sectionTitle]}>
        Expenses · {report.costs.length}
      </Text>
      {report.costs.length ? (
        report.costs.map((e) => (
          <View style={s.card} key={e.id}>
            <View style={s.between}>
              <Text style={s.name}>{e.category}</Text>
              <Text style={s.metricValue}>{money(e.amountPaise)}</Text>
            </View>
            {!!e.note && <Text style={s.meta}>{e.note}</Text>}
          </View>
        ))
      ) : (
        <Text style={s.sub}>No expenses recorded for this day.</Text>
      )}
      <Text style={[s.h2, s.sectionTitle]}>Day-wise reports</Text>
      {days.map((day) => {
        const r = reportFor(day, events, expenses);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Report ${displayDate(day)}`}
            key={day}
            onPress={() => {
              setSelected(day);
              setInput(displayDate(day));
              setError("");
            }}
            style={[s.card, selected === day && { borderColor: colors.green }]}
          >
            <View style={s.between}>
              <View>
                <Text style={s.name}>{displayDate(day)}</Text>
                <Text style={s.meta}>
                  {r.sales.length} sales · Revenue {money(r.revenue)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[
                    s.name,
                    { color: r.net < 0 ? colors.red : colors.green },
                  ]}
                >
                  {money(r.net)}
                </Text>
                <Text style={s.meta}>Net profit →</Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </>
  );
}
function OwnerApp({ user }: { user: User }) {
  const { products, events, expenses, error, online } = useInventory(user.uid);
  const [tab, setTab] = useState("stock"),
    [form, setForm] = useState<Form>(null),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("All stock"),
    [brand, setBrand] = useState("All brands"),
    [type, setType] = useState("All types"),
    [size, setSize] = useState("All sizes"),
    [filters, setFilters] = useState(false),
    [lowOnly, setLowOnly] = useState(false),
    [signoutError, setSignoutError] = useState("");
  const low = products.filter((p) => p.qty <= p.lowAt),
    today = reportFor(dateKey(), events, expenses);
  const filtered = products.filter(
    (p) =>
      (category === "All stock" || p.category === category) &&
      (brand === "All brands" || p.brand === brand) &&
      (type === "All types" || p.type === type) &&
      (size === "All sizes" || p.size === size) &&
      (!lowOnly || p.qty <= p.lowAt) &&
      `${p.brand} ${p.name} ${p.size}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const clear = () => {
    setSearch("");
    setCategory("All stock");
    setBrand("All brands");
    setType("All types");
    setSize("All sizes");
    setLowOnly(false);
  };
  return (
    <>
      <View style={s.header}>
        <View style={s.row}>
          <Icon name="cube" />
          <Text style={s.logo}>little stock.</Text>
        </View>
        <Text style={s.owner}>Owner space</Text>
      </View>
      <View
        style={{
          paddingHorizontal: 22,
          paddingVertical: 8,
          backgroundColor: online ? "#eaf1e2" : "#fff2dd",
        }}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontSize: 11, color: online ? colors.green : colors.amber }}
        >
          {online
            ? "● Connected to Firestore · Live inventory"
            : "○ Connecting to Firebase · Saving unavailable until connected"}
        </Text>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.container}
      >
        <ErrorText message={error} />
        {tab === "stock" && (
          <>
            <Text style={s.h1}>
              Your whole shop.
              <Text style={{ color: "#9aaa8f" }}> In view.</Text>
            </Text>
            <Text style={s.sub}>
              A little less paperwork. A lot more clarity.
            </Text>
            <View style={s.hero}>
              <Text style={s.eyebrow}>Stock on hand</Text>
              <Text style={s.total}>
                {products
                  .reduce((n, p) => n + p.qty, 0)
                  .toLocaleString("en-IN")}
              </Text>
              <Text style={{ fontSize: 12, color: "#d1dfcc" }}>
                individual pieces across your shop
              </Text>
              <View style={s.heroStats}>
                {[
                  [products.length, "Products"],
                  [low.length, "Need a refill"],
                  [today.pieces, "Sold today"],
                ].map(([value, label]) => (
                  <View key={label}>
                    <Text style={s.statN}>{value}</Text>
                    <Text style={s.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Add stock"
                  icon="add"
                  onPress={() => setForm({ kind: "pick", action: "restock" })}
                  disabled={!online || !products.length}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Record sale"
                  secondary
                  icon="arrow-up-right-box-outline"
                  onPress={() => setForm({ kind: "pick", action: "sale" })}
                  disabled={!online || !products.length}
                />
              </View>
            </View>
            {low.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Review low stock"
                onPress={() => {
                  clear();
                  setLowOnly(true);
                }}
                style={[
                  s.card,
                  {
                    marginTop: 15,
                    marginBottom: 0,
                    backgroundColor: "#fff5e3",
                    borderColor: "#ecdcba",
                  },
                ]}
              >
                <View style={s.between}>
                  <Text style={{ color: colors.amber, fontSize: 12 }}>
                    {low.length} product{low.length === 1 ? " needs" : "s need"}{" "}
                    a top-up
                  </Text>
                  <Text
                    style={{
                      color: colors.amber,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    Review →
                  </Text>
                </View>
              </Pressable>
            )}
            <View style={[s.between, s.sectionTitle]}>
              <Text style={s.h2}>All your stock</Text>
              <Button
                title="New product"
                small
                secondary
                icon="add"
                onPress={() => setForm({ kind: "new" })}
                disabled={!online}
              />
            </View>
            {products.length === 0 ? (
              <View style={s.empty}>
                <View
                  style={{
                    backgroundColor: "#e8eee0",
                    padding: 22,
                    borderRadius: 24,
                  }}
                >
                  <Icon name="bag-add-outline" size={40} />
                </View>
                <Text style={s.emptyTitle}>Let’s add your first product.</Text>
                <Text style={s.emptyText}>
                  No sample items. Just your shop. Add a photo, choose the brand
                  and size, and enter your opening stock.
                </Text>
                <Button
                  title="Add new product with photo"
                  icon="camera-outline"
                  onPress={() => setForm({ kind: "new" })}
                  disabled={!online}
                />
              </View>
            ) : (
              <>
                <Field
                  label="Search inventory"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search a brand or product…"
                />
                <Chips
                  values={["All stock", ...CATEGORIES]}
                  value={category}
                  onChange={setCategory}
                />
                <View style={[s.between, { marginBottom: 15 }]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setFilters(!filters)}
                    style={s.row}
                  >
                    <Icon name="options-outline" size={17} />
                    <Text style={{ fontSize: 12, color: colors.green }}>
                      Brand, size & type
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={clear}>
                    <Text style={{ fontSize: 12, color: colors.green }}>
                      Clear filters
                    </Text>
                  </Pressable>
                </View>
                {filters && (
                  <View style={s.card}>
                    <Chips
                      label="Brand"
                      values={[
                        "All brands",
                        ...new Set(products.map((p) => p.brand)),
                      ]}
                      value={brand}
                      onChange={setBrand}
                    />
                    <Chips
                      label="Size"
                      values={["All sizes", ...SIZES]}
                      value={size}
                      onChange={setSize}
                    />
                    <Chips
                      label="Item type"
                      values={["All types", ...TYPES]}
                      value={type}
                      onChange={setType}
                    />
                  </View>
                )}
                {lowOnly && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setLowOnly(false)}
                  >
                    <Text style={[s.badge, s.low, { marginBottom: 12 }]}>
                      Low stock only ×
                    </Text>
                  </Pressable>
                )}
                {filtered.map((p) => (
                  <View key={p.id} style={s.card}>
                    <View style={s.row}>
                      <ProductPhoto path={p.photoPath} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.name}>{p.brand}</Text>
                        <Text style={s.meta}>{p.name}</Text>
                        <Text style={s.meta}>
                          {p.size} · {p.type} · {p.category}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[s.h2, { fontSize: 25 }]}>{p.qty}</Text>
                        <Text style={s.meta}>pieces</Text>
                      </View>
                    </View>
                    <Text style={[s.meta, { marginTop: 10 }]}>
                      {Math.floor(p.qty / p.packSize)} packs +{" "}
                      {p.qty % p.packSize} loose · {p.packSize} pcs / pack
                    </Text>
                    <View style={s.divider} />
                    <View style={s.between}>
                      <Text style={[s.badge, p.qty <= p.lowAt && s.low]}>
                        {p.qty === 0
                          ? "Out of stock"
                          : p.qty <= p.lowAt
                            ? "Low stock"
                            : "In stock"}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Button
                          title="Add"
                          secondary
                          small
                          onPress={() =>
                            setForm({ kind: "restock", product: p })
                          }
                          disabled={!online}
                        />
                        <Button
                          title="Sell"
                          secondary
                          small
                          onPress={() => setForm({ kind: "sale", product: p })}
                          disabled={!online || p.qty === 0}
                        />
                      </View>
                    </View>
                  </View>
                ))}
                {!filtered.length && (
                  <Text style={s.emptyText}>
                    No products match these filters.
                  </Text>
                )}
              </>
            )}
            <Text style={[s.hint, { textAlign: "center", marginTop: 18 }]}>
              India time · Your data stays in your Firebase account
            </Text>
          </>
        )}
        {tab === "reports" && (
          <Reports
            events={events}
            expenses={expenses}
            canWrite={online}
            expense={() => setForm({ kind: "expense" })}
          />
        )}
        {tab === "activity" && (
          <>
            <Text style={s.h1}>The stock story.</Text>
            <Text style={s.sub}>
              Every addition and sale, automatically recorded.
            </Text>
            {[...events]
              .sort(
                (a, b) =>
                  b.dateKey.localeCompare(a.dateKey) ||
                  ((b.occurredAt as any)?.seconds || 0) -
                    ((a.occurredAt as any)?.seconds || 0),
              )
              .map((e) => (
                <View key={e.id} style={s.card}>
                  <View style={s.between}>
                    <Text style={[s.badge, e.kind === "sale" && s.low]}>
                      {e.kind === "sale"
                        ? "Sale"
                        : e.kind === "opening"
                          ? "Opening stock"
                          : "Stock added"}
                    </Text>
                    <Text style={s.meta}>{displayDate(e.dateKey)}</Text>
                  </View>
                  <Text style={[s.name, { marginTop: 10 }]}>{e.label}</Text>
                  <Text style={s.meta}>
                    {e.kind === "sale" ? "−" : "+"}
                    {e.qty} pieces · {money(e.amountPaise)}{" "}
                    {e.kind === "sale" ? "collected" : "purchase cost"}
                  </Text>
                  {!!e.note && <Text style={s.meta}>{e.note}</Text>}
                </View>
              ))}
            {!events.length && (
              <Text style={s.emptyText}>
                Your first stock addition or sale will appear here.
              </Text>
            )}
          </>
        )}
        {tab === "shop" && (
          <>
            <Text style={s.h1}>Your owner space.</Text>
            <Text style={s.sub}>{user.email}</Text>
            <View style={s.card}>
              <Text style={s.h2}>Everywhere you need it.</Text>
              <Text style={[s.sub, { marginBottom: 0, marginTop: 10 }]}>
                Sign in with this same owner account on another device to see
                your inventory and reports. An internet connection is required
                to save stock, sales and expenses.
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.h2}>How profit is calculated</Text>
              <Text style={[s.sub, { marginTop: 10, marginBottom: 0 }]}>
                Actual sale amount − purchase cost of pieces sold − daily
                expenses. Restocking updates the weighted average purchase cost.
                Every sale keeps its original cost, even after future purchases.
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.h2}>Reports & dates</Text>
              <Text style={[s.sub, { marginTop: 10, marginBottom: 0 }]}>
                Reports follow India time (Asia/Kolkata). You may enter an
                earlier sale or expense date. Reports are live summaries, not
                locked accounts. Backdated sales use stock cost at recording
                time. Entries are permanent in this version; check details
                before saving.
              </Text>
            </View>
            <Button
              title="Add daily expense"
              icon="receipt-outline"
              onPress={() => setForm({ kind: "expense" })}
              disabled={!online}
            />
            <View style={{ height: 16 }} />
            <ErrorText message={signoutError} />
            <Button
              title="Sign out"
              secondary
              onPress={async () => {
                try {
                  await signOut(auth!);
                } catch (e) {
                  setSignoutError(explainError(e));
                }
              }}
            />
          </>
        )}
      </ScrollView>
      <View style={s.nav}>
        {(
          [
            { id: "stock", label: "Inventory", icon: "grid-outline" },
            { id: "reports", label: "Reports", icon: "bar-chart-outline" },
            { id: "activity", label: "Activity", icon: "time-outline" },
            { id: "shop", label: "My shop", icon: "person-circle-outline" },
          ] as const
        ).map((t) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: tab === t.id }}
            key={t.id}
            onPress={() => setTab(t.id)}
            style={s.navItem}
          >
            <Icon
              name={t.icon}
              color={tab === t.id ? colors.green : colors.muted}
            />
            <Text
              style={[
                s.navText,
                tab === t.id && { color: colors.green, fontWeight: "700" },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {form?.kind === "new" && (
        <ProductForm uid={user.uid} close={() => setForm(null)} />
      )}
      {form?.kind === "expense" && (
        <ExpenseForm uid={user.uid} close={() => setForm(null)} />
      )}
      {(form?.kind === "sale" || form?.kind === "restock") && (
        <StockForm
          uid={user.uid}
          product={
            products.find((p) => p.id === form.product.id) || form.product
          }
          kind={form.kind}
          close={() => setForm(null)}
        />
      )}
      {form?.kind === "pick" && (
        <Sheet
          title={
            form.action === "sale" ? "What did you sell?" : "What arrived?"
          }
          close={() => setForm(null)}
        >
          {products.map((p) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Choose ${p.brand} ${p.name}`}
              key={p.id}
              disabled={form.action === "sale" && p.qty === 0}
              onPress={() => setForm({ kind: form.action, product: p })}
              style={[
                s.card,
                form.action === "sale" && p.qty === 0 && { opacity: 0.4 },
              ]}
            >
              <View style={s.row}>
                <ProductPhoto path={p.photoPath} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>
                    {p.brand} · {p.name}
                  </Text>
                  <Text style={s.meta}>
                    {p.size} · {p.qty} pieces available
                  </Text>
                </View>
                <Icon name="chevron-forward" />
              </View>
            </Pressable>
          ))}
        </Sheet>
      )}
    </>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(!!auth);
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen}>
        <StatusBar style="dark" />
        {missingConfig.length ? (
          <ScrollView>
            <SetupScreen />
          </ScrollView>
        ) : loading ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : user ? (
          <OwnerApp key={user.uid} user={user} />
        ) : (
          <AuthScreen />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
