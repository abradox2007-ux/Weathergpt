# WeatherGPT — Frontend Build Prompt

Use this as the master prompt for an AI coding assistant (or as your own build spec). It covers **frontend only** — pairs with the separate backend/database prompt (`weathergpt-backend-prompt.md`), whose API surface it consumes directly.

---

## 1. Project Summary

Build the mobile frontend for **WeatherGPT**, a conversational AI weather-intelligence app for India. Targets a broad user base — general public, farmers, fishermen, aviation/marine/urban-planning professionals, and researchers — so the UI must stay clean, high-contrast, and low-friction rather than dense or jargon-heavy.

---

## 2. Tech Stack

- **Framework:** **React Native** (Expo managed workflow — fastest path to a runnable demo on both platforms without native build tooling)
- **Navigation:** `@react-navigation/native` — stack navigator wrapping the onboarding flow, bottom tab navigator for the 5 main sections
- **State/data fetching:** `@tanstack/react-query` for all API calls (caching, retry, loading/error states out of the box — pairs naturally with the backend's own caching)
- **Local persistence:** `expo-secure-store` or `AsyncStorage` for the JWT + `device_id` issued at onboarding, and last-selected language/profession as a fast local fallback
- **Location:** `expo-location`
- **Voice:** `expo-av` for audio capture, `expo-speech` for TTS playback of assistant replies
- **Maps:** `react-native-maps`
- **Charts (research/forecast graphs):** `react-native-svg` + `victory-native` (lightweight, good for line/bar climate charts)
- **Styling:** plain `StyleSheet` + a small shared theme file (see Visual Direction below) — no heavy UI kit needed at this scope
- **i18n:** `i18next` + `react-i18next`, with translation JSON files per supported language

---

## 3. Visual Direction

Clean, friendly, high-readability weather-app look — **not** a dense sci-fi HUD, since a meaningful share of target users are farmers/fishermen who need this legible at a glance, in sunlight, possibly with lower literacy in the app's non-primary language.

- **Palette:** bright, weather-condition-driven backgrounds (soft blue/gold gradients for clear sky, grey-blue for overcast, deeper blue for rain) — condition sets the mood, not a fixed dark theme.
- **Typography:** large, rounded, high-contrast sans-serif (e.g. system font or Inter/Poppins); temperature numerals get the largest type on screen.
- **Icons:** simple, universally recognizable weather icons (sun, cloud, rain, wind) — avoid abstract/technical iconography.
- **Touch targets:** generous — bottom nav icons and the voice-mic button especially, since this needs to work for outdoor/one-handed use.
- **Dark mode:** supported as a toggle (per Settings spec) but light is the default first-run experience.

---

## 4. Screen Flow

### 4.1 Onboarding (first launch only, stack navigator, no back button to skip)
1. **Language Select** — grid/list of major Indian languages (Hindi, English, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, Assamese), each label shown in its own script, not just English. Selecting immediately switches the onboarding UI itself into that language.
2. **Category/Profession Select** — Farmer, Fisherman, Aviation, Marine, Urban Planning, General/Other — icon + label cards, single-select.
3. On confirm → call `POST /api/onboarding` with `device_id` (generate + persist a UUID on first install), `language_code`, `profession` → store returned JWT → navigate to Home, never show onboarding again (checked via a stored "onboarding_complete" flag).

### 4.2 Home (single scrollable screen, per your spec — all sections stacked in this exact order)
1. **App name header** — "WeatherGPT" wordmark at top.
2. **Message/status bar** — thin banner below the header for contextual system messages (e.g. active severe alert teaser, "stale data" notice, greeting). Pulls from `GET /api/alerts/active` for alert teasers; tapping it deep-links to the Disaster tab.
3. **Search bar with voice assistant** — text input + mic button. Typed text → `POST /api/chat/query`. Mic tap → record via `expo-av` → send audio (or on-device transcribed text if you add a local STT) to the same endpoint or `WS /ws/chat` → play response via `expo-speech` and show it as a chat bubble/card inline.
4. **Today's climate section** — big current temperature + condition icon, plus 4–5 secondary details (feels-like, humidity, wind, UV/AQI) from `GET /api/weather/current`.
5. *(scroll)* **7-day forecast strip** — horizontally scrollable day cards from `GET /api/weather/forecast?days=7`.
6. *(scroll)* **Map** — `react-native-maps` view centered on the user's location with a basic precip/temp overlay from `GET /api/weather/map`, non-interactive preview that expands full-screen on tap.

### 4.3 Bottom Tab Navigator (5 tabs, persistent across the app)
1. **Profession** — re-confirms/edits profession if needed, then shows AI-generated guidance from `GET /api/advisory?profession=&lat=&lon=`, rendered as readable cards (not raw text dump) — group by topic (e.g. "This week for your crop", "Wind advisory for your boat").
2. **Research** — dense reference content is fine here (this tab's audience is technical). Sectioned accordion/list matching the 4 categories from the brief (Atmospheric Conditions, Moisture and Water, Energy and Radiation, Long-Term Indicators), each metric with live value from `GET /api/research/metrics?category=` and an info tooltip explaining it in plain language. Include a historical trend chart (`GET /api/research/historical`) with a date-range picker.
3. **Home** — returns to 4.2.
4. **Disaster Info** — top section: any upcoming/active alert from `GET /api/alerts/active` with severity badge and time window. Below: precautions/do's-and-don'ts list from `GET /api/alerts/{id}/precautions`, always visible even with no active alert (show general preparedness guidance as the default state rather than an empty screen).
5. **Settings** — grouped list matching the spec sections: Units (temp/wind/pressure/precip/distance), Location (permission toggle, favorite cities manager, default city), Notifications (severe/daily digest/realtime precip/status bar toggles), Theme (light/dark/system), and language switcher. All read/write through `GET/PUT /api/settings` and `GET/POST/DELETE /api/locations`.

---

## 5. Chat/Voice UX Detail

- Keep the assistant's replies visible as a lightweight, dismissible card/sheet over the Home screen rather than forcing navigation to a separate full chat screen — the brief frames this as a search-bar-driven utility, not a chat app.
- Show a typing/thinking indicator while `POST /api/chat/query` or the `WS /ws/chat` round trip is in flight.
- If voice input is used, show a live waveform/pulse on the mic button while recording, and auto-stop after a few seconds of silence.
- Always render replies in the user's selected `language_code`; if voice output is enabled, trigger `expo-speech` in that language's locale.

---

## 6. Cross-cutting Requirements

- **Offline/stale handling:** every data-fetching screen should handle the backend's `stale: true` flag by showing a small "showing last known data" note instead of failing silently.
- **Permissions:** request location and microphone permissions with a clear one-line explanation before the OS prompt, not cold.
- **Loading states:** skeleton placeholders for the Home sections rather than a single full-screen spinner, since sections load independently.
- **Error states:** friendly retry prompts, not raw error text — especially important for lower-literacy users.
- **Accessibility:** support system font scaling, ensure color is never the only signal for alerts (pair with icon/label).

---

## 7. Suggested Project Structure

```
app/
  App.tsx
  navigation/ (OnboardingStack, RootTabs)
  screens/
    onboarding/LanguageSelect.tsx
    onboarding/ProfessionSelect.tsx
    home/HomeScreen.tsx
    profession/ProfessionScreen.tsx
    research/ResearchScreen.tsx
    disaster/DisasterScreen.tsx
    settings/SettingsScreen.tsx
  components/ (WeatherCard, ForecastStrip, ChatBar, AlertBanner, MapPreview, MetricAccordion)
  api/ (client.ts — axios/fetch wrapper with JWT header injection, one file per backend resource)
  hooks/ (useCurrentWeather, useForecast, useAdvisory, useAlerts, useSettings — thin react-query wrappers)
  i18n/ (index.ts, locales/*.json)
  theme/ (colors.ts, typography.ts, conditionBackgrounds.ts)
  store/ (deviceId + JWT persistence helpers)
```

---

## Open items / assumptions made (flag if wrong)

- Assumed Expo managed workflow over bare React Native — much faster to get a working demo build/APK, revisit only if you need a native module Expo doesn't support.
- Assumed the chat/voice assistant surfaces as an overlay on Home rather than its own screen — say if you actually want a dedicated full chat screen.
- Assumed weather-condition-driven background theming (rather than a fixed palette) for the Home screen — easy to simplify to a flat theme if you'd rather not build that logic under time pressure.
