# Wykta Mobile App — iOS & Android Build & Release Guide

Wykta is wrapped using [Capacitor](https://capacitorjs.com), which packages the
existing web app (HTML/JS/CSS) into a native iOS/Android shell with access to
device APIs such as the camera.

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Local setup](#local-setup)
3. [Camera permissions](#camera-permissions)
4. [App icons & splash screens](#app-icons--splash-screens)
5. [Building & opening in IDEs](#building--opening-in-ides)
6. [iOS App Store submission](#ios-app-store-submission)
7. [Android Google Play submission](#android-google-play-submission)
8. [Updating the app after web changes](#updating-the-app-after-web-changes)
9. [Crash monitoring & error reporting](#crash-monitoring--error-reporting)
10. [Version rollback strategy](#version-rollback-strategy)
11. [Release checklist](#release-checklist)

---

## Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Node.js | ≥ 18 | npm + Capacitor CLI |
| Xcode | ≥ 15 (macOS Sonoma 14+, macOS only) | iOS build |
| Android Studio | ≥ Flamingo (2022.2.1) | Android build |
| Apple Developer Program | $99/yr | App Store distribution |
| Google Play Console | $25 one-time | Play Store distribution |
| `@capacitor/cli` | ≥ 8 | Already in devDependencies |

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

> **Tip:** Run `npm run cap:sync` after every web-source change. This copies
> the updated HTML/JS/CSS into the native projects without needing a full
> platform re-add.

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
# First time: install the generator globally or via npx
npx @capacitor/assets generate \
  --iconBackgroundColor '#f3f8f4' \
  --splashBackgroundColor '#f3f8f4'
```

- Place your master icon at `resources/icon.png` (1024×1024, no transparency for iOS).
- Place splash background at `resources/splash.png` (2732×2732, centered safe zone).
- The command generates all required sizes and writes them into `ios/` and `android/`.

---

## Building & opening in IDEs

```bash
# Open in Xcode
npm run cap:open:ios

# Open in Android Studio
npm run cap:open:android
```

Build and archive from within the respective IDE.

### iOS build settings (Xcode)
1. Select the `App` target → **Signing & Capabilities**.
2. Set **Team** (Apple Developer account).
3. Set **Bundle Identifier**: `com.wykta.app`.
4. Set **Version** and **Build** number (increment build for every TestFlight upload).
5. Select a real device or **Any iOS Device** as destination.
6. `Product → Archive` → Opens Organizer.
7. Click **Distribute App** → **App Store Connect** → upload.

### Android build settings (Android Studio)
1. Open `android/` in Android Studio.
2. Go to `Build → Generate Signed Bundle / APK` → **Android App Bundle**.
3. Create or select your keystore (keep it safe — you need it for all future updates).
4. Choose `release` build variant.
5. The signed `.aab` is saved to `android/app/release/`.

---

## iOS App Store submission

1. Enrol in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr).
2. Create an **App ID** `com.wykta.app` in [App Store Connect](https://appstoreconnect.apple.com/).
3. Configure the app record: name, subtitle, category (Health & Fitness or Food & Drink), age rating (4+), privacy policy URL (`https://mdynasty.github.io/Wykta/privacy.html`).
4. Upload a build via Xcode Organizer or Transporter.
5. Complete **App Privacy** questionnaire (data types, tracking, etc.).
6. Add at least 3 screenshots per device size (iPhone 6.7", iPad Pro 12.9").
7. Submit for **App Review** — expect 1-3 business days.
8. Use **TestFlight** for beta distribution before public launch (up to 10,000 testers).
9. Staged rollout: start at 5% → 25% → 100% over 7 days, monitoring crash rate.

---

## Android Google Play submission

1. Create a [Google Play Console](https://play.google.com/console/) account ($25 one-time).
2. Create a new application: package name `com.wykta.app`, default language.
3. Complete **Store listing**: title, short description (max 80 chars), long description, feature graphic (1024×500), screenshots (phone + 7" + 10" tablet).
4. Fill out **Content rating** questionnaire (Violence: None, Sexual content: None, Substances: None → likely Everyone rating).
5. Complete **Data safety** section (camera access, no data sold to third parties).
6. Set **Privacy policy URL**: `https://mdynasty.github.io/Wykta/privacy.html`.
7. Upload `.aab` in **Testing → Internal testing** first, then **Production**.
8. Staged rollout: release to 10% → 50% → 100% over 7 days.

---

## Updating the app after web changes

After any change to the web source files, sync the updated assets into both
native projects and rebuild from the IDE:

```bash
npm run cap:sync
# then rebuild/archive from Xcode / Android Studio
```

For **over-the-air (OTA) updates** to the web layer only (no native API changes),
consider [Capawesome Live Update](https://capawesome.io/plugins/live-update/) or
[Ionic Appflow](https://ionic.io/appflow) — these bypass store review for JS/HTML/CSS changes.

---

## Crash monitoring & error reporting

Integrate one of these before going to production:

### Option A — Sentry (recommended, free tier available)

```bash
npm install @sentry/capacitor @sentry/browser
```

Initialize in `app.js` before any other code:

```js
import * as Sentry from "@sentry/capacitor"
Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  release: "com.wykta.app@1.0.0",
})
```

Add the Sentry Capacitor plugin for native crash symbolication:
```bash
npm install @sentry/capacitor
npm run cap:sync
```

### Option B — Firebase Crashlytics (Google ecosystem)

```bash
npm install @capacitor-community/firebase-analytics @capacitor-community/fcm
```

Follow the [Firebase setup for Capacitor](https://github.com/capacitor-community/firebase-analytics).

### Minimum viable monitoring (no SDK)

At minimum, add an `unhandledrejection` + `error` listener that posts to your
Supabase `scan_events` table (non-PII only):

```js
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason)
  // optionally log a sanitized error event to scan_events
})
```

---

## Version rollback strategy

### iOS
- **TestFlight:** Previous builds remain available for up to 90 days. Testers can
  install an older build by selecting it in the TestFlight app.
- **App Store:** Apple does not support rollback of a public release. Mitigate by:
  1. Always testing on TestFlight before promoting to production.
  2. Using staged rollout (5% → 25% → 100%) — you can **pause** a rollout if you
     detect a regression in crash rate or ANR rate.
  3. Submitting a hotfix build which Apple can expedite-review if critical.

### Android
- **Internal testing / Closed testing:** You can republish a previous `.aab` at any
  time by uploading it to the matching track.
- **Production:** Use staged rollout. If you detect a regression:
  1. Go to **Play Console → Production → Manage release**.
  2. Click **Halt rollout** — users already updated keep the new version but the
     rollout stops for remaining users.
  3. Upload a fix and resume.
- Keep every signed `.aab` artifact in version control (or a private storage bucket)
  so you always have the last-known-good build available.

### Web layer (GitHub Pages)
- Web changes are deployed via CI. To roll back: revert the relevant commit and
  push — the GitHub Pages action will redeploy the previous version.
- Use the `npm run cap:sync` + store rebuild path only when native API changes are
  required.

---

## Release checklist

Use this checklist for every production release.

### Pre-build
- [ ] `npm install` — dependencies up to date
- [ ] All `supabase` secrets synced (`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `SITE_URL`)
- [ ] `config.js` `siteUrl` matches the deployed domain (`https://mdynasty.github.io/Wykta`)
- [ ] Version number bumped in `capacitor.config.json` → `version` field (if present)
- [ ] Privacy policy and Terms pages updated if required
- [ ] All i18n keys present and correct for all 4 languages (en/fr/de/zh)

### Build & QA
- [ ] `npm run cap:sync` run after latest web changes
- [ ] App tested on iOS simulator (iPhone 15) — camera, OCR, language toggle, pricing
- [ ] App tested on Android emulator (Pixel 7, API 34) — same test cases
- [ ] App tested on a physical device (if available)
- [ ] Crash monitoring SDK initialised and test event received
- [ ] Deep links / redirect URLs verified (Stripe success/cancel → correct pages)
- [ ] Language auto-detection tested with EN, FR, DE, ZH inputs

### iOS Store
- [ ] Build archived and uploaded to App Store Connect
- [ ] TestFlight beta distributed to ≥ 5 testers
- [ ] Beta feedback incorporated
- [ ] App screenshots updated (if UI changed)
- [ ] App Privacy / data-safety questionnaire reviewed
- [ ] Staged rollout configured: start at 5%
- [ ] Crash rate baseline documented (< 0.5% target)
- [ ] Rollout expanded to 100% after 48 hours if no regressions

### Android Store
- [ ] Signed `.aab` uploaded to Play Console Internal Testing
- [ ] Internal testing completed (≥ 3 testers)
- [ ] Promoted to Production with 10% staged rollout
- [ ] Data Safety section filled in Play Console
- [ ] ANR rate < 0.47% and crash rate < 1.09% (Play Store thresholds)
- [ ] Rollout expanded to 100% after 48 hours if no regressions

### Post-release
- [ ] Monitor Sentry / Crashlytics dashboard for 48 hours
- [ ] Check app store reviews for new user feedback
- [ ] Update CHANGELOG.md with release notes
- [ ] Tweet / post to community channels (Discord, GitHub Discussions)

