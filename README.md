# SplitTab

SplitTab is a React Native app for managing group expenses. It lets users create groups, add expenses with different split types, and settle balances easily.

## Features

* Mock login with onboarding
* Group creation and member management
* Expense splitting (equal, exact, percentage, shares)
* Balance tracking and settlements
* Basic analytics
* Currency conversion + offline support
* Location tagging and notifications

## Tech Stack

* React Native CLI
* TypeScript
* Redux Toolkit
* React Navigation

---

## Setup Instructions

### 1. Clone the repo

```bash
git clone <your-repo-link>
cd splittab
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start Metro

```bash
npx react-native start
```

### 4. Run on Android

Make sure emulator is running or device is connected.

```bash
npx react-native run-android
```

---

## Android Build (APK)

To generate a release APK:

```bash
cd android
./gradlew assembleRelease
```

APK will be available at:

```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Notes

* No backend is used (mock data only)
* Internet required for currency and location APIs
* Offline mode works with cached data
* Architecture details are in `ARCHITECTURE.md` and additional setup/configuration notes are available in the project documentation
