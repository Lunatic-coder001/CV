import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { Platform } from "react-native";
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const missingConfig = Object.entries(config)
  .filter(([, v]) => !v)
  .map(([k]) => k);
const app = missingConfig.length
  ? null
  : getApps().length
    ? getApp()
    : initializeApp(config);
function authInstance() {
  if (!app) return null;
  if (Platform.OS === "web") return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    if (error.code === "auth/already-initialized") return getAuth(app);
    throw error;
  }
}
export const auth = authInstance();
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
// Local development only. A real phone must use the computer's LAN IP, not localhost.
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
if (
  __DEV__ &&
  emulatorHost &&
  auth &&
  db &&
  storage &&
  !(globalThis as any).__littleStockEmulators
) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, emulatorHost, 8080);
  connectStorageEmulator(storage, emulatorHost, 9199);
  (globalThis as any).__littleStockEmulators = true;
}
