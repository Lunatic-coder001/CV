# Little Stock — Expo SDK 57

An owner-only React Native app for a small diaper and personal-care shop. Compatible dependencies are pinned for **Expo SDK 57** (Expo `57.0.30`, React Native `0.86.3`), matching the SDK supported by your Expo Go client. No custom native build is needed to try it in Expo Go.

## Included

- Email/password owner accounts, persisted sign-in, password reset and sign-out.
- **Empty inventory on first use.** No seeded/sample products or staff screens.
- New products require a photo: choose from the gallery or take one with the camera.
- Brand, size (S/M/L/XL/not sized), baby/child/women/adult category, and diapers/wipes/sanitary-pads type.
- A single stock overview with search, category, brand, size and type filters, and low-stock alerts.
- Packs and loose pieces; each product has its own pieces-per-pack setting.
- Opening stock, restocking at different purchase costs, and sales with any actual total selling amount.
- Firestore real-time sync on devices signed into the **same owner account**. Accounts have separate inventories.
- Atomic stock and ledger transactions; no negative stock, retry-safe saves and retained historical sale costs.
- Expenses: market rent, transport, tea/snacks, other, with dates and notes.
- Automatic daily closing summaries: pieces sold, revenue, cost of goods sold, gross profit, expenses and net profit. Tap a day or enter DD/MM/YYYY to view it. Share a report through the phone's share sheet.

## 1. Install

Use Node.js **22.13+ or 24 LTS** and npm. Open a terminal inside this directory:

```sh
npm ci
cp .env.example .env
```

On Windows you can copy `.env.example` to `.env` using your editor or Explorer.

## 2. Create/connect Firebase

1. In the Firebase console, create/select your Firebase project.
2. Add a **Web app** in Project settings → General → Your apps. Copy its public Firebase configuration into `.env` using the variable names already provided. Registering a web app is how the Firebase JavaScript SDK gets configuration; this app still runs natively in Expo Go.
3. In Authentication → Sign-in method, enable **Email/Password**.
4. Create **Cloud Firestore** in native mode and choose a suitable region, such as Mumbai if available for your project. Start with locked production rules, then deploy the rules below.
5. Create **Cloud Storage for Firebase**. Copy the exact bucket name into `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`; don't assume a `.appspot.com` suffix. Firebase Storage may require a Blaze billing account for provisioning/access under current Firebase requirements. Firestore stores product details; Storage stores photo files and Firestore stores their paths.
6. Deploy the included owner-isolation rules from this directory:

```sh
npx firebase login
npx firebase deploy --project YOUR_PROJECT_ID --only firestore:rules,firestore:indexes,storage
```

Alternatively paste `firestore.rules` and `storage.rules` into the corresponding Firebase console Rules tabs and publish them. Do not use open/test-mode rules.

The `.env` fields are **public client configuration**, not an admin credential. Never include a service-account/private key in this app. Firestore and Storage rules enforce who may access data. Do not commit `.env`.

## 3. Open in Expo Go

```sh
npx expo start --clear
```

Keep your Android phone and development computer on the same Wi-Fi network. Open Expo Go (your client supports SDK 57) and scan the QR code. The Expo project's SDK is 57; the app version in `app.json` is independently `1.0.0`.

If your network prevents LAN connections, you can use `npx expo start --tunnel` when Expo's tunnel service is available. Keep the Metro terminal open. If you edit `.env`, restart with `--clear`.

To check the web version locally:

```sh
npm run web
```

No Firebase config? The app shows setup instructions rather than a fake working cloud inventory. Once connected, create your owner account. It starts empty. Add your first product with a photo.

## Money, stock and daily reports

All money is stored in **integer paise**, avoiding floating-point currency drift. A product's stock is counted in individual pieces, plus its pieces-per-pack setting for convenient entry/display.

- Opening stock and restock forms take the **total purchase cost** of the stock entered, not a per-piece price.
- The sale form takes the **total amount actually collected** for that sale. For example, for a pack bought for ₹100 you may enter ₹115, ₹120 or ₹130 for different customers.
- Cost of goods sold is allocated from the current stock's weighted-average purchase cost, rounded to the nearest paise. Selling the last piece consumes all remaining cost, avoiding leftover rounding balances.
- Gross profit = actual revenue − cost of goods sold.
- Net profit = gross profit − that day's rent/transport/snacks/other expenses.
- Restocking is **not deducted a second time** from daily profit. Stock purchase cash flow and daily profit are different measures.
- Sale amounts are treated as collected money. Credit/partial payment, refunds, tax calculations, stock loss, editing/deleting entries and locked accounting periods are not implemented.
- Reports follow **Asia/Kolkata** regardless of the phone's timezone. They are calculated automatically from the saved ledger; no manual closing job or Cloud Function is needed. Days with expenses but no sales can show a loss.
- You may backdate sales/expenses. A backdated sale uses **stock cost at the time it is recorded**, not a reconstructed historical inventory balance. A day's report updates if a backdated entry is added. This is a live closing summary, not an immutable finalized accounting statement.
- Quantities are capped at 1,000,000 pieces and individual monetary balances/entries at ₹1,00,00,000.

Example: one product costs ₹100, sells for ₹130, and the day has ₹10 rent + ₹5 transport + ₹3 tea. The report shows ₹130 revenue, ₹100 goods cost, ₹30 gross profit, ₹18 expenses and **₹12 net profit**.

## Firebase data layout

```text
owners/{ownerUid}/products/{productId}
owners/{ownerUid}/events/{operationId}
owners/{ownerUid}/expenses/{operationId}
Storage: owners/{ownerUid}/products/{productId}.jpg
```

Products have quantity, remaining stock value and the last linked event ID. Product creation/restocking/sales atomically write an immutable event and the resulting balance. Rules verify the linked event, resulting quantity and cost allocation, and reject unlinked balance edits. Concurrent sales are retried against the latest stock by Firestore transactions. Retrying the same form uses the same operation ID to avoid duplicate entries.

Photos are resized/compressed to JPEG and limited to 5 MB. Uploads are immutable; an interrupted transaction may leave an unused owner-only photo object. No scheduled cleanup job is configured. Native Firestore data is memory-cached; writes require internet. The UI disables new writes until server snapshots arrive. A network interruption can still make an in-progress save fail; its form offers a retry. Never interpret the connection label as a promise of permanent connectivity.

For a small shop the app subscribes to the owner's full product/event/expense collections. For long histories, add pagination and server-side aggregates before scaling to large stores.

## Validation and development

```sh
npm run typecheck
npm test
npm run test:rules
npx expo install --check
npx expo export --platform android --platform web
```

`npm run test:rules` needs **Java 21+**, Firebase emulator downloads, and network access to `storage.googleapis.com`. It starts local Firestore and Storage emulators and tests owner isolation, linked balances, immutable records, expense validation, photo restrictions and competing sales. It uses a disposable `demo-little-stock` project, not production data.

For end-to-end local development with all Firebase emulators:

```sh
npx firebase emulators:start --project demo-little-stock --only auth,firestore,storage
```

In your local `.env`, use these non-production settings:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=demo-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-little-stock.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-little-stock
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-little-stock.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:demo
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=YOUR_COMPUTER_LAN_IP
```

For the web app on the same computer, the emulator host can be `127.0.0.1`. For a physical phone use the computer's LAN IP. Emulator services are bound to `0.0.0.0` for this workflow; use a trusted network/firewall. Remove the emulator variable and restore real public config before using your live project. The code only connects to emulators in development builds.

### Verification in this workspace

- TypeScript validation: passed.
- Accounting/date/quantity tests: **10 passed**.
- SDK 57 bundled dependency compatibility check: passed using Expo's local compatibility map (remote Expo compatibility API was blocked).
- Android Hermes bundle and web export: passed.
- Local Auth emulator/browser checks: account creation, persisted sign-in, sign-out, empty dashboard, disconnected write protection and report-date validation passed.
- Browser smoke check: passed; setup screen boots without runtime errors or mobile overflow and inserts no demo inventory.
- Firebase Firestore/Storage integration tests: **not executed to completion**; emulator download blocked by this environment's egress policy (HTTP CONNECT 403 for `storage.googleapis.com`). Test suite is included, not claimed as passed.
- No production Firebase project was provided or deployed, and no physical Expo Go device was connected. Real-device camera/photo behavior and remote sync still need verification after connecting Firebase.
