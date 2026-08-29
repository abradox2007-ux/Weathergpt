# WeatherGPT — Backend & Database Build Prompt

Use this as the master prompt for an AI coding assistant (or as your own build spec). It covers **backend + database only** — no frontend/UI instructions are included.

---

## 1. Project Summary

Build the backend for **WeatherGPT**, a conversational AI weather-intelligence platform for India. The backend must serve a mobile frontend (built separately) via a REST + WebSocket API, providing real-time weather, forecasts, natural-language query understanding, disaster alerts, profession-based advisories, climate/research data, and user settings — all with multilingual support for major Indian languages.

**Scope for this build:** hackathon/demo-grade — optimized for fast development and a working live demo, not massive scale. Real data sources, lightweight persistence, pluggable AI provider.

---

## 2. Tech Stack

- **Framework:** Python 3.11+ with **FastAPI**
- **Database:** **MongoDB** (via `motor`, the async driver) — document-based collections, no rigid schema migrations needed as fields evolve during the hackathon
- **Real-time:** native FastAPI `WebSocket` for chat/voice streaming + live alert push (skip MQTT/Kafka — overkill for this scope)
- **Background jobs:** `APScheduler` (in-process) for periodic data refresh — no need for Celery/Redis at this scale
- **Caching:** simple in-memory TTL cache (e.g. `cachetools`) for weather API responses — no Redis needed
- **HTTP client:** `httpx` (async) for outbound API calls
- **Auth:** lightweight — device-ID based anonymous sessions (no email/password signup required for a weather app); issue a JWT keyed to a generated `device_id` on first launch so favorites/settings/profession persist across sessions
- **Env/config:** `pydantic-settings`, all API keys and provider choice via `.env`

---

## 3. External Data Sources (real APIs, free tier)

| Purpose | Source | Notes |
|---|---|---|
| Current weather, hourly/daily forecast, 7-day | **Open-Meteo** (`api.open-meteo.com`) | No API key needed. Already GFS-model-based, satisfies the "NWP model integration" requirement without needing to run WRF/GFS yourself. |
| Historical/climate trend data | **Open-Meteo Archive API** (`archive-api.open-meteo.com`) | Powers the Research page's historical analysis. |
| Air quality (bonus detail for climate section) | **Open-Meteo Air Quality API** | Optional extra data point. |
| Geocoding (place name → lat/lon, and reverse) | **Open-Meteo Geocoding API** | Free, no key. |
| Severe weather / disaster alerts | Try **IMD** (Indian Meteorological Department) public bulletins/RSS if reachable; **if IMD has no stable public API** (commonly the case), fall back to a rule-based alert engine that derives alerts from Open-Meteo's extreme-value fields (e.g. high wind speed, heavy precipitation, extreme temperature thresholds) and clearly label these as "derived advisories" vs "official IMD warnings" in the data model. Build the alerts module behind an interface so a real IMD/NDMA feed can be swapped in later. |
| Map layer | No backend work needed beyond serving lat/lon + basic radar/precip overlay data from Open-Meteo where available; heavy GIS tiles are a frontend map-library concern. |

Build a single internal `weather_service` module that abstracts these calls, with response caching (TTL ~10 min for current/forecast, ~24h for historical) to avoid hammering free APIs.

---

## 4. LLM / Query Understanding Engine

Design this **provider-agnostic**, not hardcoded to one vendor:

- Create an `llm_provider` interface (`generate(prompt, context) -> response`) with concrete adapters for OpenAI, Gemini, and Groq (Llama models) — selected at runtime via a `.env` variable (`LLM_PROVIDER=gemini|groq|openai`). This lets the demo be run with whichever key is available at judging time.
- The natural-language query engine should:
  1. Take user text (typed or transcribed voice) + selected language + user profession + last-known location.
  2. Classify intent (current weather / forecast / alert lookup / advisory / historical / general chat).
  3. Extract entities (location, date range, crop/activity if profession-relevant).
  4. Call the relevant internal service (weather_service, alerts_service, advisory_service) to fetch grounded data.
  5. Pass that structured data + original query to the LLM to produce a natural-language answer **in the user's selected language**.
- Do not let the LLM invent weather numbers — always ground responses in data fetched from step 3, and pass that data into the prompt context explicitly.
- Voice: backend should accept either raw audio (delegate to a hosted STT API, e.g. the same LLM provider's speech endpoint or a free STT) or already-transcribed text from the frontend — support both so the frontend team can choose. Return text (frontend handles TTS), or optionally also return a synthesized audio URL if time permits.

---

## 5. Multilingual Support

Support at minimum: Hindi, English, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, Assamese.

- Store a `language_code` (ISO 639-1, e.g. `hi`, `ta`, `te`) on the user record.
- All static/system strings (alert categories, advisory templates, do's-and-don'ts) should live in a translation table/JSON keyed by `language_code`, not hardcoded — so the disaster precaution content etc. can be served pre-translated even without an LLM call.
- LLM-generated conversational answers are translated by instructing the LLM to respond directly in the target language (pass language name/code in the system prompt), rather than a separate translation pass.

---

## 6. Database Schema (MongoDB collections)

Use Pydantic models (via `beanie` or plain `motor` + manual Pydantic validation) to define document shapes. Embed sub-documents where data is always read together; keep separate collections where documents grow unbounded (chat history, caches, alerts).

```
users
  _id, device_id (unique, indexed), language_code, profession,
  default_city, created_at,
  settings: {                      # embedded — always read/written with the user
    unit_temp, unit_wind, unit_pressure, unit_precip, unit_distance,
    theme, notif_severe, notif_daily_digest, notif_realtime_precip,
    notif_status_bar, location_permission, updated_at
  },
  locations: [                     # embedded array — small, bounded list of favorites
    { label, lat, lon, is_default, created_at }
  ]

chat_history
  _id, user_id (indexed), role (user/assistant), message_text,
  language_code, intent_detected, created_at

weather_cache
  _id, lat, lon (compound index), data_type (current/forecast/historical),
  payload_json, fetched_at, expires_at (TTL index — let MongoDB auto-expire this collection)

alerts
  _id, lat, lon (compound index), region_name, alert_type (cyclone/flood/heat/cold/storm),
  severity (advisory/watch/warning), source (imd/derived),
  title, description, precautions: [string], valid_from, valid_to, created_at

professions
  _id, name (farmer, fisherman, aviation, marine, urban_planning, general),
  advisory_prompt_template

advisories
  _id, user_id (indexed, nullable), profession_id, lat, lon,
  content_text, generated_at

research_metrics_cache
  _id, lat, lon (compound index), metric_category (atmospheric/moisture/energy/long_term),
  payload_json, fetched_at
```

Create a compound index on `(lat, lon)` for every location-keyed collection. Use a **MongoDB TTL index** on `expires_at` for `weather_cache` and `research_metrics_cache` so stale entries are dropped automatically instead of needing a manual cleanup job. `settings` and `locations` are embedded directly in the `users` document since they're always fetched/updated together with the user and stay small — no separate collection or join needed.

---

## 7. API Surface (REST + WebSocket)

**Onboarding**
- `POST /api/onboarding` — create user with `device_id`, `language_code`, `profession` → returns JWT

**Home / core weather**
- `GET /api/weather/current?lat=&lon=` — current temp + 4–5 key details (feels-like, humidity, wind, condition, UV or AQI)
- `GET /api/weather/forecast?lat=&lon=&days=7`
- `GET /api/weather/map?lat=&lon=` — basic precip/temp overlay data for map rendering

**Conversational**
- `POST /api/chat/query` — `{text, lang, lat, lon}` → grounded NL answer (typed queries)
- `WS /ws/chat` — streaming chat, and channel for voice-query round trips

**Profession**
- `GET /api/advisory?profession=&lat=&lon=` — profession-specific AI-generated guidance

**Research**
- `GET /api/research/metrics?lat=&lon=&category=` — atmospheric/moisture/energy/long-term indicator data
- `GET /api/research/historical?lat=&lon=&start=&end=`

**Disaster**
- `GET /api/alerts/active?lat=&lon=`
- `GET /api/alerts/{id}/precautions`

**Settings**
- `GET/PUT /api/settings`
- `GET/POST/DELETE /api/locations` (favorites, default city)

**Auth**
- All endpoints except `/api/onboarding` require the JWT issued at onboarding.

---

## 8. Background Jobs

- Refresh `weather_cache` for all distinct favorited/active locations every 10–15 min.
- Poll IMD source (or run the derived-alert rule engine against fresh forecast data) every 15–30 min to populate/expire `alerts`.
- No manual cache-cleanup job needed — the TTL index on `weather_cache`/`research_metrics_cache` handles expiry automatically.

---

## 9. Non-functional notes for the build

- Wrap every external API call in try/except with graceful fallback to last-cached value + a `stale: true` flag in the response, so the demo never hard-fails if a free API rate-limits.
- Log intent-classification + provider used per chat query (useful for the "accuracy/relevance" evaluation criterion).
- Keep response latency low by parallelizing independent calls (e.g. current + forecast + alerts) with `asyncio.gather`.
- Structure the project as: `app/main.py`, `app/routers/*.py`, `app/services/*.py` (weather_service, llm_service, alerts_service, advisory_service, translation_service), `app/models.py` (Pydantic document models), `app/schemas.py` (request/response schemas), `app/db.py` (Motor client + index setup on startup).

---

## Open items / assumptions made (flag if wrong)

- Auth is anonymous/device-based rather than email login, since nothing in the brief calls for accounts — say if you actually want real user accounts.
- IMD has no reliable free public API in most cases, so disaster alerts default to a derived rule-engine unless you have a specific IMD/NDMA feed or key to plug in.
- "Voice-enabled interaction" is treated as an audio-in/text-out (or optional audio-out) capability at the API layer — actual mic capture/playback is frontend, per your instruction to exclude frontend work.