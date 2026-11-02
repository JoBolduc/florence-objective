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

The app uses a development build (`expo-dev-client`), not Expo Go. Build it in the cloud with `npx eas-cli@latest build --profile development --platform android` and install the APK on the phone.
