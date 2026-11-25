# Building a Human OS Android APK

This project is configured both as an **installable offline PWA** and with **Capacitor** config (`capacitor.config.ts`) so you can generate an Android `.apk` in two ways.

---

## Option 1: Fastest — Convert the Hosted URL to an APK with PWABuilder (No Android Studio required)

Human OS already includes a complete Web App Manifest, offline service worker, and maskable Android icons.

1. Open your deployed Human OS URL (or export and host `dist/` over HTTPS).
2. Visit [https://www.pwabuilder.com](https://www.pwabuilder.com) and paste your app URL.
3. Click **Package For Stores → Android → Generate Package**.
4. Download the generated `.apk` (and `.aab` for Google Play) and install it on your Android device.

---

## Option 2: Fully Offline Native APK via Capacitor + Android Studio

Use this option if you want a 100% self-contained offline `.apk` bundling the built `dist/` files locally inside the APK.

### Prerequisites
- Node.js 20+
- Java JDK 17+ and Android Studio (with Android SDK)

### Steps

```bash
# 1. Install dependencies & build the production web bundle
npm install
npm run build

# 2. Install Capacitor CLI and Android platform
npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/android

# 3. Create the native Android project using capacitor.config.ts
npx cap add android
npx cap sync android

# 4. Build the debug APK from the command line (or open in Android Studio with `npx cap open android`)
cd android
./gradlew assembleDebug
```

Your installable APK will be output at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

To build a release APK for sharing or Google Play, open the `android/` folder in Android Studio (`npx cap open android`) and choose **Build → Generate Signed App Bundle / APK**.
