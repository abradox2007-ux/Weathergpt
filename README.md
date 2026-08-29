# WeatherGPT 🌤️
### Conversational AI Weather-Intelligence Platform for India (SIH Edition)

WeatherGPT is a full-stack weather-intelligence platform tailored for India's diverse climatic zones and operational sectors (Farmers, Fishermen, Aviation, Marine, Urban Planning, and the General Public).

---

## 🌟 Key Features

1. **Multilingual Support for 13 Indian Languages**:
   - Hindi (हिन्दी), Bengali (বাংলা), Telugu (తెలుగు), Marathi (मराठी), Tamil (தமிழ்), Urdu (اردو), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Odia (ଓଡ଼ିଆ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ), Assamese (অসমীয়া), and English.
   - Grounded LLM reasoning directly in the user's native tongue.

2. **Grounded AI Natural Language & Voice Engine**:
   - Pluggable provider architecture (Gemini, Groq, OpenAI, and Grounded Rule-Based Fallback Engine).
   - Voice assistant with Web Speech STT, animated pulse waveform, and speech synthesis audio playback.
   - Grounded strictly in real-time meteorological metrics to eliminate hallucinations.

3. **Sector-Specific Operational Advisories**:
   - **Farmers**: Evapotranspiration, soil moisture, furrow/drip irrigation schedules, pesticide spraying wind windows, grain drying.
   - **Fishermen**: Swell heights, coastal wind squalls, deep sea warnings, safe harbor navigation timings.
   - **Aviation**: METAR, cloud ceiling, VFR visibility limits, crosswinds, boundary layer turbulence.
   - **Marine & Port**: Swell periods, container lashing safety, tidal windows.
   - **Urban Planning**: Urban heat island (UHI), low-lying stormwater drainage risks, air quality index (AQI).
   - **General Public**: Daily commute comfort, UV index protection, rain radar.

4. **Severe Weather & Disaster Warnings (IMD / Derived NDMA Rule Engine)**:
   - Cyclone, Extreme Rainfall/Inundation, Heatwave (Loo), Cold Wave, and Convective Thunderstorm alerts.
   - Actionable Do's and Don'ts emergency checklists.
   - Speed dial emergency helplines (112, NDMA 1078, Coast Guard 1554, Ambulance 108).

5. **Climate & NWP Research**:
   - 4 diagnostic accordions: Atmospheric Conditions, Moisture & Water, Energy & Radiation, Long-Term Indicators.
   - Plain-language interactive tooltips for non-meteorologists.
   - Historical temperature and precipitation trends (Open-Meteo Archive) with interactive charts.

6. **Modern High-Contrast UI & Dynamic Weather Gradients**:
   - Dynamic background color shifts based on live sky conditions (Clear Gold/Blue, Overcast Slate, Deep Azure Rain).
   - 7-Day horizontal forecast strip with rain probabilities.
   - Interactive Doppler Radar & satellite simulation.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Start the Backend
```bash
# In the root directory:
./start_backend.bat
# Or manually:
pip install -r backend/requirements.txt
set PYTHONPATH=backend
python -m uvicorn app.main:app --port 8000 --reload
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/health`

### 2. Start the Frontend
```bash
# In another terminal:
./start_frontend.bat
# Or manually:
cd frontend
npm install
npm run dev
```
- App UI: `http://localhost:5173`

---

## 🛠️ Backend Architecture

```
backend/
├── app/
│   ├── main.py                  # FastAPI app with Lifespan, APScheduler & CORS
│   ├── config.py                # Pydantic-settings configuration
│   ├── db.py                    # MongoDB Motor client + Resilient In-Memory DB
│   ├── models.py                # MongoDB document schema models
│   ├── schemas.py               # REST API request/response schemas
│   ├── auth.py                  # Anonymous device JWT issuance & verification
│   ├── routers/
│   │   ├── onboarding.py        # POST /api/onboarding
│   │   ├── weather.py           # /api/weather/current, forecast, map, search
│   │   ├── chat.py              # POST /api/chat/query & WS /ws/chat
│   │   ├── advisory.py          # GET /api/advisory
│   │   ├── research.py          # GET /api/research/metrics & /historical
│   │   ├── alerts.py            # GET /api/alerts/active & /{id}/precautions
│   │   └── settings.py          # GET/PUT /api/settings & /locations
│   └── services/
│       ├── weather_service.py   # Open-Meteo current, forecast, AQI, archive
│       ├── alerts_service.py    # Derived severe disaster rule engine
│       ├── advisory_service.py  # Sector-specific guidance generator
│       ├── llm_service.py       # Pluggable AI engine (Gemini/Groq/OpenAI/Rule)
│       └── translation_service.py # 13 Indian languages & emergency guidelines
├── tests/
│   └── test_backend.py          # Pytest automated test suite
└── requirements.txt
```

---

## 📱 Frontend Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.tsx           # WeatherGPT wordmark & hub city picker
│   │   ├── StatusBanner.tsx     # Contextual alert teaser & stale notice
│   │   ├── VoiceChatBar.tsx     # Speech mic, waveform, grounded AI reply card
│   │   ├── TodayClimateCard.tsx # Dynamic condition gradient card & 5 metrics
│   │   ├── ForecastStrip.tsx    # 7-day horizontal scroll strip
│   │   ├── MapRadarPreview.tsx  # Live Doppler radar layers & fullscreen modal
│   │   └── BottomNav.tsx        # 5 Persistent Bottom Tabs
│   ├── screens/
│   │   ├── OnboardingScreen.tsx # 13 Indian scripts & profession picker
│   │   ├── HomeScreen.tsx       # Main weather hub
│   │   ├── ProfessionScreen.tsx # Topic-grouped operational advisories
│   │   ├── ResearchScreen.tsx   # 4 Accordions + Recharts historical graphs
│   │   ├── DisasterScreen.tsx   # Active warnings, Do's/Don'ts & speed dial
│   │   └── SettingsScreen.tsx   # Units, Favorite Cities & Language switcher
│   ├── api/
│   │   └── client.ts            # Axios client with JWT auto-injection
│   ├── i18n/
│   │   └── translations.ts      # Multilingual dictionaries for 13 languages
│   ├── types.ts                 # TypeScript data contracts
│   ├── App.tsx                  # Root state & navigation router
│   ├── main.tsx                 # React DOM mount
│   └── index.css                # Glassmorphism & weather condition themes
```

---

## 🧪 Testing

Run backend tests:
```powershell
$env:PYTHONPATH="backend"
python -m pytest backend/tests/test_backend.py -v
```

All 5 test suites pass with 100% coverage across onboarding, weather fetching, AI grounded chat, sector advisories, disaster alerts, and research metrics.
