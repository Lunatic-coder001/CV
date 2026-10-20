// Firebase exposes this function through its React Native conditional export.
// The shared browser .d.ts does not currently include it.
import "firebase/auth";
declare module "firebase/auth" {
  export function getReactNativePersistence(
    storage: typeof import("@react-native-async-storage/async-storage").default,
  ): import("firebase/auth").Persistence;
}
