import React, { useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Button, Chips, ErrorText, Field, Icon, Sheet, s } from "./ui";
import {
  CATEGORIES,
  dateKey,
  displayDate,
  EXPENSE_TYPES,
  integer,
  invariant,
  money,
  moneyInput,
  parseDate,
  Product,
  quantity,
  SIZES,
  stockChange,
  TYPES,
} from "./domain";
import {
  addExpense,
  addProduct,
  newId,
  recordStock,
  uploadPhoto,
} from "./repository";
export function explainError(error: any) {
  const code = error?.code || "";
  if (code.includes("permission-denied") || code === "storage/unauthorized")
    return "Permission denied. Check that you are signed in and the Firebase rules are deployed.";
  if (code.includes("network") || code === "unavailable")
    return "Unable to reach Firebase. Check your connection, then retry this save.";
  if (code === "storage/unknown")
    return "Photo upload failed. Check the Firebase Storage bucket, rules and billing setup.";
  return error?.message || "Something went wrong. Please try again.";
}
function useSave(close: () => void) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [locked, setLocked] = useState(false);
  const action = useRef<null | (() => Promise<void>)>(null),
    inFlight = useRef(false);
  const save = async (build: () => () => Promise<void>) => {
    if (inFlight.current) return;
    try {
      setError("");
      if (!action.current) action.current = build();
      setLocked(true);
      setBusy(true);
      inFlight.current = true;
      await action.current();
      close();
    } catch (e) {
      setError(explainError(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return { busy, error, locked, save };
}
function RetryHelp({ locked, error }: { locked: boolean; error: string }) {
  return locked && error ? (
    <Text style={[s.hint, { marginBottom: 15 }]}>
      Retry saves the same entry without duplicating it. Close and reopen the
      form to enter a different entry.
    </Text>
  ) : null;
}
function QtyFields({
  packs,
  loose,
  setPacks,
  setLoose,
  packSize,
  disabled,
}: {
  packs: string;
  loose: string;
  setPacks: (v: string) => void;
  setLoose: (v: string) => void;
  packSize: number;
  disabled: boolean;
}) {
  return (
    <>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Packs"
            value={packs}
            onChangeText={setPacks}
            keyboardType="number-pad"
            editable={!disabled}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Loose pieces"
            value={loose}
            onChangeText={setLoose}
            keyboardType="number-pad"
            editable={!disabled}
          />
        </View>
      </View>
      <Text style={[s.hint, { marginTop: -8, marginBottom: 16 }]}>
        1 pack = {packSize || "…"} pieces. Enter packs, pieces, or both.
      </Text>
    </>
  );
}
export function ProductForm({
  uid,
  close,
}: {
  uid: string;
  close: () => void;
}) {
  const [name, setName] = useState(""),
    [brand, setBrand] = useState(""),
    [category, setCategory] = useState<string>(CATEGORIES[0]),
    [type, setType] = useState<string>(TYPES[0]),
    [size, setSize] = useState<string>("M");
  const [packSize, setPackSize] = useState("10"),
    [packs, setPacks] = useState("0"),
    [loose, setLoose] = useState("0"),
    [cost, setCost] = useState("0"),
    [low, setLow] = useState("20"),
    [photo, setPhoto] = useState(""),
    [photoError, setPhotoError] = useState(""),
    [photoBusy, setPhotoBusy] = useState(false);
  const { busy, error, locked, save } = useSave(close),
    ids = useRef({
      product: newId(uid, "products"),
      event: newId(uid, "events"),
    });
  const choosePhoto = async (camera: boolean) => {
    try {
      setPhotoError("");
      setPhotoBusy(true);
      if (camera) {
        const access = await ImagePicker.requestCameraPermissionsAsync();
        invariant(
          access.granted,
          "Allow camera access, or choose a photo from your gallery.",
        );
      }
      const result = await (
        camera
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync
      )({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        const image = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.75, format: SaveFormat.JPEG },
        );
        setPhoto(image.uri);
      }
    } catch (e) {
      setPhotoError(explainError(e));
    } finally {
      setPhotoBusy(false);
    }
  };
  const submit = () =>
    save(() => {
      const ps = integer(packSize, "Pieces per pack", 1, 10000),
        qty = quantity(packs, loose, ps),
        value = moneyInput(cost, "Opening purchase cost");
      invariant(name.trim() && brand.trim(), "Enter a product name and brand.");
      invariant(photo, "Please add a product photo.");
      invariant(
        qty > 0 || value === 0,
        "Opening cost must be zero when there is no opening stock.",
      );
      const data = {
        id: ids.current.product,
        name: name.trim(),
        brand: brand.trim(),
        category: category as Product["category"],
        type: type as Product["type"],
        size: size as Product["size"],
        packSize: ps,
        qty,
        valuePaise: value,
        lowAt: integer(low, "Low-stock threshold"),
        photoPath: "",
      };
      let photoPath = "";
      return async () => {
        if (!photoPath) photoPath = await uploadPhoto(uid, data.id, photo);
        await addProduct(uid, { ...data, photoPath }, ids.current.event);
      };
    });
  return (
    <Sheet title="New product" close={close} busy={busy}>
      <Text style={s.sub}>
        A photo and a few details. Your inventory starts here.
      </Text>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{
              width: 120,
              height: 120,
              borderRadius: 20,
              marginBottom: 12,
            }}
          />
        ) : (
          <View
            style={[
              s.empty,
              {
                paddingVertical: 22,
                backgroundColor: "#e8eee1",
                borderRadius: 18,
                width: 120,
                marginBottom: 12,
              },
            ]}
          >
            <Icon name="camera-outline" size={32} />
          </View>
        )}
        <View style={s.row}>
          <Button
            title="Choose photo"
            secondary
            small
            onPress={() => choosePhoto(false)}
            disabled={locked || photoBusy}
          />
          <Button
            title="Take photo"
            secondary
            small
            onPress={() => choosePhoto(true)}
            disabled={locked || photoBusy}
          />
        </View>
      </View>
      <ErrorText message={photoError} />
      <Field
        label="Brand"
        value={brand}
        onChangeText={setBrand}
        placeholder="e.g. MamyPoko, Huggies, Pampers"
        maxLength={40}
        editable={!locked}
      />
      <Field
        label="Product name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Extra Absorb Pants"
        maxLength={60}
        editable={!locked}
      />
      <Chips
        label="User category"
        values={CATEGORIES}
        value={category}
        onChange={setCategory}
        disabled={locked}
      />
      <Chips
        label="Item type"
        values={TYPES}
        value={type}
        onChange={setType}
        disabled={locked}
      />
      <Chips
        label="Size"
        values={SIZES}
        value={size}
        onChange={setSize}
        disabled={locked}
      />
      <Field
        label="Pieces in one pack"
        value={packSize}
        onChangeText={setPackSize}
        keyboardType="number-pad"
        editable={!locked}
      />
      <QtyFields
        {...{ packs, loose, setPacks, setLoose }}
        packSize={Number(packSize)}
        disabled={locked}
      />
      <Field
        label="Opening purchase cost · ₹"
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
        help="Total paid for all the opening stock above, not the selling price."
        editable={!locked}
      />
      <Field
        label="Low-stock alert at · pieces"
        value={low}
        onChangeText={setLow}
        keyboardType="number-pad"
        editable={!locked}
      />
      <ErrorText message={error} />
      <RetryHelp locked={locked} error={error} />
      <Button
        title={locked && error ? "Retry save" : "Save product"}
        onPress={submit}
        busy={busy}
        disabled={photoBusy}
      />
    </Sheet>
  );
}
export function StockForm({
  uid,
  product,
  kind,
  close,
}: {
  uid: string;
  product: Product;
  kind: "sale" | "restock";
  close: () => void;
}) {
  const [packs, setPacks] = useState("0"),
    [loose, setLoose] = useState("0"),
    [amount, setAmount] = useState(""),
    [date, setDate] = useState(displayDate(dateKey())),
    [note, setNote] = useState("");
  const { busy, error, locked, save } = useSave(close),
    operation = useRef(newId(uid, "events"));
  let preview = "Enter quantity and total amount.";
  try {
    const qty = quantity(packs, loose, product.packSize);
    if (qty > 0) {
      const a = moneyInput(amount),
        next = stockChange(product, kind, qty, a);
      preview =
        kind === "sale"
          ? `${qty} pieces · ${money(a)} collected\nEstimated product cost: ${money(next.costPaise)}\nEstimated gross profit: ${money(a - next.costPaise)}`
          : `${qty} pieces added · purchase cost ${money(a)}\nStock after addition: ${next.qty} pieces`;
    }
  } catch (e) {
    preview = (e as Error).message;
  }
  const submit = () =>
    save(() => {
      const qty = quantity(packs, loose, product.packSize),
        a = moneyInput(
          amount,
          kind === "sale" ? "Sale amount" : "Purchase cost",
        ),
        day = parseDate(date);
      stockChange(product, kind, qty, a);
      const n = note.trim();
      return () =>
        recordStock(uid, product.id, kind, qty, a, day, n, operation.current);
    });
  return (
    <Sheet
      title={kind === "sale" ? "Record a sale" : "Add stock"}
      close={close}
      busy={busy}
    >
      <Text style={s.h2}>
        {product.brand} · {product.name}
      </Text>
      <Text style={s.sub}>
        {product.size} · {product.qty} pieces available
      </Text>
      <QtyFields
        {...{ packs, loose, setPacks, setLoose }}
        packSize={product.packSize}
        disabled={locked}
      />
      <Field
        label={
          kind === "sale" ? "Total collected · ₹" : "Total purchase cost · ₹"
        }
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        editable={!locked}
        help={
          kind === "sale"
            ? "Enter the actual amount the customer paid for this sale. Bargained prices are welcome."
            : "Enter the total paid for the stock being added. This updates the average purchase cost."
        }
      />
      <Field
        label="Date · DD/MM/YYYY"
        value={date}
        onChangeText={setDate}
        placeholder="20/10/2026"
        maxLength={10}
        editable={!locked}
        help="Reports use India time. Backdated entries change that day’s report."
      />
      <Field
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={200}
        editable={!locked}
        placeholder={
          kind === "sale"
            ? "e.g. Bulk purchase discount"
            : "e.g. Supplier delivery"
        }
      />
      <View style={s.preview}>
        <Text style={s.previewText}>{preview}</Text>
      </View>
      {kind === "sale" && (
        <Text style={[s.hint, { marginBottom: 15 }]}>
          Final cost is calculated from the latest stock balance when saved.
          Sale amount is treated as money collected; credit sales are not
          supported.
        </Text>
      )}
      <ErrorText message={error} />
      <RetryHelp locked={locked} error={error} />
      <Button
        title={
          locked && error
            ? "Retry save"
            : kind === "sale"
              ? "Save sale"
              : "Add to stock"
        }
        onPress={submit}
        busy={busy}
      />
    </Sheet>
  );
}
export function ExpenseForm({
  uid,
  close,
}: {
  uid: string;
  close: () => void;
}) {
  const [category, setCategory] = useState<string>(EXPENSE_TYPES[0]),
    [amount, setAmount] = useState(""),
    [date, setDate] = useState(displayDate(dateKey())),
    [note, setNote] = useState("");
  const { busy, error, locked, save } = useSave(close),
    operation = useRef(newId(uid, "expenses"));
  const submit = () =>
    save(() => {
      const a = moneyInput(amount);
      invariant(a > 0, "Expense must be greater than zero.");
      const data = {
        category: category as (typeof EXPENSE_TYPES)[number],
        amountPaise: a,
        dateKey: parseDate(date),
        note: note.trim(),
      };
      return () => addExpense(uid, data, operation.current);
    });
  return (
    <Sheet title="Add an expense" close={close} busy={busy}>
      <Text style={s.sub}>
        The small costs count, too. Add your market expenses to see your true
        daily profit.
      </Text>
      <Chips
        label="Expense category"
        values={EXPENSE_TYPES}
        value={category}
        onChange={setCategory}
        disabled={locked}
      />
      <Field
        label="Amount paid · ₹"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        editable={!locked}
      />
      <Field
        label="Date · DD/MM/YYYY"
        value={date}
        onChangeText={setDate}
        maxLength={10}
        editable={!locked}
      />
      <Field
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={200}
        editable={!locked}
        placeholder="e.g. Auto fare to Sunday bazaar"
      />
      <ErrorText message={error} />
      <RetryHelp locked={locked} error={error} />
      <Button
        title={locked && error ? "Retry save" : "Save expense"}
        onPress={submit}
        busy={busy}
      />
    </Sheet>
  );
}
