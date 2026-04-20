# Wykta Mobile App — iOS & Android Build Guide

Wykta is wrapped using [Capacitor](https://capacitorjs.com), which packages the
existing web app (HTML/JS/CSS) into a native iOS/Android shell with access to
device APIs such as the camera.

---

## Prerequisites

| Tool | Required for |
|------|-------------|
| Node.js ≥ 18 | npm + Capacitor CLI |
| Xcode ≥ 15 (macOS Sonoma 14.0+, macOS only) | iOS build |
| Android Studio ≥ Flamingo | Android build |
| Apple Developer Program ($99/yr) | App Store distribution |
| Google Play Console ($25 one-time) | Play Store distribution |

---

## Local setup

```bash
# Install dependencies (Capacitor + plugins)
npm install

# Add native platforms (only needed once per machine)
npm run cap:add:ios       # creates ios/ folder (requires macOS + Xcode)
npm run cap:add:android   # creates android/ folder (requires Android Studio)

# Sync web assets + plugin code into the native projects
npm run cap:sync
```

---

## Camera permissions

### iOS (`ios/App/App/Info.plist`)

Add these keys after running `cap add ios`:

```xml
<key>NSCameraUsageDescription</key>
<string>Wykta needs camera access to scan ingredient labels.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Wykta needs photo library access to analyse saved label photos.</string>
```

### Android (`android/app/src/main/AndroidManifest.xml`)

Capacitor adds `CAMERA` permission automatically. Verify it is present:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

---

## App icons & splash screens

Use [Capacitor Assets](https://capacitorjs.com/docs/guides/splash-screens-and-icons)
to generate all sizes from a single 1024×1024 source image:

```bash
npx @capacitor/assets generate --iconBackgroundColor '#f3f8f4' --splashBackgroundColor '#f3f8f4'
```

Place your master icon at `resources/icon.png` (1024×1024, no transparency for iOS).

---

## Building & opening in IDEs

```bash
# Open in Xcode
npm run cap:open:ios

# Open in Android Studio
npm run cap:open:android
```

Build and archive from within the respective IDE.

---

## iOS App Store submission

1. Enrol in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr)
2. Create an App ID `com.wykta.app` in App Store Connect
3. In Xcode: set your Team, Bundle Identifier (`com.wykta.app`), and version
4. Archive (`Product → Archive`) and upload via Organizer
5. Complete App Store Connect metadata (screenshots, description, privacy URL)
6. Submit for App Review

---

## Google Play submission

1. Create a [Google Play Console](https://play.google.com/console/) account ($25 one-time)
2. Create a new application with package name `com.wykta.app`
3. In Android Studio: build a signed App Bundle (`Build → Generate Signed Bundle/APK`)
4. Upload the `.aab` file in Play Console → Production → Create new release
5. Complete store listing (screenshots, description, content rating questionnaire)
6. Submit for review

---

## Updating the app after web changes

After any change to the web source files, sync the updated assets into both
native projects and rebuild from the IDE:

```bash
npm run cap:sync
```
