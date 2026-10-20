import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
export const colors = {
  ink: "#203d32",
  green: "#28654e",
  muted: "#758276",
  bg: "#f6f7f1",
  line: "#e0e5db",
  amber: "#a26322",
  red: "#b03d37",
};
export function Icon({
  name,
  size = 20,
  color = colors.green,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  busy = false,
  small = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        small && { paddingVertical: 9, paddingHorizontal: 12 },
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.green : "white"} />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={18}
              color={secondary ? colors.green : "white"}
            />
          )}
          <Text
            style={[
              s.buttonText,
              secondary && { color: colors.green },
              small && { fontSize: 12 },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  help,
  ...props
}: TextInputProps & { label: string; help?: string }) {
  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9aaba0"
        {...props}
        style={[
          s.input,
          props.editable === false && { opacity: 0.55 },
          props.style,
        ]}
      />
      {!!help && <Text style={s.hint}>{help}</Text>}
    </View>
  );
}
export function Chips({
  label,
  values,
  value,
  onChange,
  disabled = false,
}: {
  label?: string;
  values: readonly string[];
  value: string;
  onChange: (s: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ marginBottom: 15 }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <View style={s.wrap}>
        {values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={v}
            accessibilityState={{ selected: v === value, disabled }}
            disabled={disabled}
            onPress={() => onChange(v)}
            style={[s.chip, v === value && s.activeChip]}
          >
            <Text style={[s.chipText, v === value && { color: "white" }]}>
              {v}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Sheet({
  title,
  close,
  busy = false,
  children,
}: {
  title: string;
  close: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !busy && close()}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={s.sheetHead}>
          <Text style={s.h2}>{title}</Text>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Close form"
            onPress={close}
            style={s.close}
          >
            <Icon name="close" />
          </Pressable>
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 22, paddingBottom: 50 }}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export function ErrorText({ message }: { message: string }) {
  return message ? (
    <Text accessibilityRole="alert" style={s.error}>
      {message}
    </Text>
  ) : null;
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: {
    padding: 22,
    paddingBottom: 30,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  logo: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  owner: {
    fontSize: 11,
    color: colors.green,
    backgroundColor: "#e7ecdf",
    padding: 8,
    borderRadius: 20,
  },
  h1: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.ink,
    marginBottom: 7,
  },
  h2: { fontSize: 19, fontWeight: "700", color: colors.ink },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 22 },
  card: {
    padding: 17,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.green,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 13,
    minHeight: 44,
  },
  buttonText: { fontSize: 14, fontWeight: "700", color: "white" },
  secondary: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#cad5c5",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 7,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d9e0d3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
    minHeight: 48,
  },
  hint: { fontSize: 11, color: colors.muted, lineHeight: 17, marginTop: 6 },
  error: {
    backgroundColor: "#fff0eb",
    padding: 13,
    borderRadius: 10,
    color: colors.red,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 15,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 30,
    backgroundColor: "white",
  },
  activeChip: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 12, color: colors.muted },
  sheetHead: {
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  close: { backgroundColor: "#e9ede3", borderRadius: 22, padding: 9 },
  hero: {
    padding: 23,
    borderRadius: 24,
    backgroundColor: colors.green,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#cddcc9",
  },
  total: {
    fontSize: 45,
    fontWeight: "700",
    color: "white",
    letterSpacing: -2,
    marginVertical: 3,
  },
  heroStats: {
    flexDirection: "row",
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: "#ffffff25",
    paddingTop: 17,
    marginTop: 20,
  },
  statN: { fontSize: 21, fontWeight: "700", color: "white" },
  statLabel: { fontSize: 10, color: "#d1dfcc", marginTop: 3 },
  sectionTitle: { marginTop: 24, marginBottom: 15 },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 16 },
  photo: {
    height: 64,
    width: 56,
    borderRadius: 10,
    backgroundColor: "#eef1e7",
  },
  badge: {
    color: colors.green,
    backgroundColor: "#ecf3e6",
    fontSize: 10,
    overflow: "hidden",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  low: { backgroundColor: "#fff0d8", color: colors.amber },
  nav: {
    flexDirection: "row",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    paddingBottom: 10,
  },
  navItem: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 5 },
  navText: { fontSize: 10, color: colors.muted },
  empty: { alignItems: "center", paddingHorizontal: 23, paddingVertical: 35 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 17,
    marginBottom: 7,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  metric: { fontSize: 14, color: colors.muted },
  metricValue: { fontSize: 15, fontWeight: "600", color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 14 },
  preview: {
    padding: 16,
    borderRadius: 13,
    backgroundColor: "#eaf1e3",
    marginBottom: 15,
  },
  previewText: { fontSize: 13, lineHeight: 21, color: colors.green },
});
