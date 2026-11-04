# Petits Pas

Android app for two parents to track a four-month developmental program: spontaneous communication signs (10/day), attention sessions over 3 minutes (1/day) and new games (3 in total).

Backlog: https://claude.ai/artifact/9xm6EEDYHa4URgwK6FSoWd

## Stack

Expo SDK 58 · React Native · TypeScript (strict) · Expo Router · ESLint + Prettier.

## Layout

```
src/
  app/        screens and layouts only (Expo Router)
  features/   one folder per feature: components, hooks, logic
  db/         SQLite connection, migrations, repositories
  ui/         theme tokens, shared components, French strings
```

## Commands

```bash
npm install
npm start            # dev server (connect the development build)
npm run lint         # ESLint + Prettier
npm run typecheck    # tsc --noEmit
npm run check        # both
npm run format       # apply Prettier
```

The app uses a development build (`expo-dev-client`), not Expo Go.

## Install on a phone

Both builds are APKs made by EAS and installed outside the Play Store.

```bash
npx eas-cli@latest build --profile preview --platform android      # the app, for both phones
npx eas-cli@latest build --profile development --platform android  # dev client, for `npm start`
```

Each finished build has an install link. Open it on the phone, download the APK, and accept the warning about apps from outside the Play Store. Anyone with the link can download the build, so share it only between the two of you.

To update, install a newer APK over the current one. Do not uninstall first: that erases the local data.

An update keeps local data only if all of these hold:

- `android.package` in `app.json` stays the same.
- EAS signs with the same keystore. It is stored on EAS, so never delete it.
- The build number never goes down. EAS raises it on every build (`appVersionSource: remote`, `autoIncrement`).

Both profiles share one package, so a phone holds either the preview or the development build, not both. Switching between them replaces the app and keeps its data.
