# Mobile

Top-level Expo app scaffold for the native mobile client.

This is intentionally minimal so the app appears as a first-class root project beside `frontend` and `media-bridge`.

## Local Debugging with Reactotron

The mobile app ships a Reactotron bootstrap for development builds only. Reactotron is never loaded in production.

**Requirements:**
- Install the [Reactotron desktop app](https://github.com/infinitered/reactotron/releases)
- Run the app via `expo start` with an Expo dev-client build (simulator, emulator, or physical device on the same LAN)

**iOS simulator / Android emulator:** Reactotron connects automatically when the app starts in `__DEV__` mode.

**Android physical device:** Run the following adb command before starting the app so the device can reach the Reactotron desktop:
```
adb reverse tcp:9090 tcp:9090
```

The bootstrap lives in `mobile/src/devtools/reactotron.ts` and is loaded once at app startup via `mobile/App.tsx`. No per-screen wiring is needed.
