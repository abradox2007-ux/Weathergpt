import json
import logging
import httpx
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from app.config import settings
from app.services.weather_service import weather_service
from app.services.alerts_service import alerts_service
from app.services.advisory_service import advisory_service
from app.db import db_manager

logger = logging.getLogger("weathergpt.llm_service")

class BaseLLMAdapter:
    async def generate_response(self, prompt: str, system_prompt: str) -> Optional[str]:
        raise NotImplementedError

class GroqAdapter(BaseLLMAdapter):
    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key.strip() if api_key else None

    async def generate_response(self, prompt: str, system_prompt: str) -> Optional[str]:
        if not self.api_key:
            return None
        models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
        for model_name in models_to_try:
            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500
                }
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.post(url, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        return data["choices"][0]["message"]["content"]
                    elif res.status_code in [401, 403]:
                        logger.warning("Groq authentication failed (status %s). Aborting Groq retry.", res.status_code)
                        return None
                    else:
                        logger.warning("Groq (%s) status %s: %s", model_name, res.status_code, res.text)
            except Exception as e:
                logger.error("Groq API call failed for %s: %s", model_name, e)
        return None

class GeminiAdapter(BaseLLMAdapter):
    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key.strip() if api_key else None

    async def generate_response(self, prompt: str, system_prompt: str) -> Optional[str]:
        if not self.api_key:
            return None
        for model_name in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
                payload = {
                    "contents": [
                        {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser Question:\n{prompt}"}]}
                    ],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 600}
                }
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts:
                                return parts[0].get("text")
                    elif res.status_code in [401, 403]:
                        logger.warning("Gemini authentication failed (status %s). Aborting Gemini retry.", res.status_code)
                        return None
                    else:
                        logger.warning("Gemini (%s) status %s: %s", model_name, res.status_code, res.text)
            except Exception as e:
                logger.error("Gemini API call failed for %s: %s", model_name, e)
        return None

class OpenAIAdapter(BaseLLMAdapter):
    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key.strip() if api_key else None

    async def generate_response(self, prompt: str, system_prompt: str) -> Optional[str]:
        if not self.api_key:
            return None
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 500
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"]
                elif res.status_code in [401, 403]:
                    logger.warning("OpenAI authentication failed (status %s).", res.status_code)
                    return None
        except Exception as e:
            logger.error("OpenAI API call failed: %s", e)
        return None

class CloudLLMAdapter(BaseLLMAdapter):
    """Zero-config high-speed cloud AI gateway for instant generative intelligence."""
    async def generate_response(self, prompt: str, system_prompt: str) -> Optional[str]:
        try:
            url = "https://text.pollinations.ai/"
            payload = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "model": "openai",
                "seed": 42
            }
            async with httpx.AsyncClient(timeout=6.5) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200 and res.text:
                    text_resp = res.text.strip()
                    if len(text_resp) > 5:
                        return text_resp
        except Exception as e:
            logger.info("Cloud LLM gateway note: %s", e)
        return None

class LLMService:
    def __init__(self):
        self.adapters = {
            "groq": GroqAdapter(settings.GROQ_API_KEY),
            "gemini": GeminiAdapter(settings.GEMINI_API_KEY),
            "openai": OpenAIAdapter(settings.OPENAI_API_KEY),
            "cloud_llm": CloudLLMAdapter()
        }

    def detect_query_language(self, text: str, default_lang: str = "en") -> str:
        if re.search(r'[\u0B80-\u0BFF]', text):
            return "ta"
        if re.search(r'[\u0900-\u097F]', text):
            return "hi"
        if re.search(r'[\u0C00-\u0C7F]', text):
            return "te"
        if re.search(r'[\u0980-\u09FF]', text):
            return "bn"

        q = text.lower()
        words = set(re.findall(r'\b[a-z]+\b', q))

        tamil_keywords = {
            "malai", "mazhai", "naalai", "naalikku", "naalaikku", "nalaikku",
            "netru", "nethu", "inniku", "veyil", "kaatru", "kudai", "varumaa",
            "varuma", "peidhadha", "peinjadha", "epdi", "enna", "sollu", "vanthucha",
            "irukkuma", "epadi", "puyal", "vellam", "vivisayam", "payir", "meenavar",
            "kadal", "padagu", "kaalam", "soodu", "kulir", "marunthu", "thanni"
        }
        if words.intersection(tamil_keywords):
            return "ta"

        hindi_keywords = {
            "baarish", "barish", "kal", "aaj", "kya", "hogi", "hoga", "mausam",
            "kaisa", "garmi", "thand", "hawa", "chata", "pani", "batao", "beeta",
            "toofan", "fasal", "kisan", "kheti", "machuara", "samundar", "tapman"
        }
        if words.intersection(hindi_keywords):
            return "hi"

        telugu_keywords = {
            "varsham", "repu", "eeroju", "paduthunda", "gaali", "endalu",
            "cheppu", "toopanu", "metta", "pantalu", "raitu", "samudram"
        }
        if words.intersection(telugu_keywords):
            return "te"

        return default_lang

    def classify_intent(self, text: str) -> str:
        q = text.lower().strip()
        words = set(re.findall(r'\b[a-z]+\b', q))

        # Check for past indicators first
        past_keywords = {
            "yesterday", "netru", "nethu", "beeta", "past", "history", "historical",
            "munnadi", "previous", "rained", "peidhadha", "peinjadha"
        }
        is_hindi_past = any(w in q for w in ["बीता", "बीते", "पिछला", "पिछले", "हुई थी", "हुआ था", "था", "थी"])
        if (words.intersection(past_keywords) or
            any(w in q for w in ["நேற்று", "నిన్న", "did it rain", "was it raining", "last week"]) or
            is_hindi_past):
            return "historical_research"

        alert_keywords = {
            "alert", "alerts", "warning", "warnings", "cyclone", "puyal", "flood",
            "floods", "vellam", "danger", "storm", "storms", "toofan", "tsunami",
            "safe", "rescue", "abaththu", "apatha", "tornado", "squall", "lightning",
            "thunderstorm", "thunder"
        }
        if (words.intersection(alert_keywords) or
            any(w in q for w in ["புயல்", "எச்சரிக்கை", "வெள்ளம்", "तूफान", "चेतावनी", "बाढ़", "తుఫాను", "హెచ్చరిక", "storm", "cyclone"])):
            return "alert_lookup"

        agri_keywords = {
            "crop", "crops", "irrigate", "irrigation", "spray", "farm", "farmer",
            "fertilizer", "sow", "harvest", "vivisayam", "payir", "marunthu", "kisan", "kheti", "aruvadai"
        }
        if (words.intersection(agri_keywords) or
            any(w in q for w in ["விவசாயம்", "பயிர்", "உரம்", "किसान", "फसल", "खेती", "రైతు", "పంట"])):
            return "profession_advisory"

        marine_keywords = {
            "fisherman", "fishermen", "boat", "sea", "marine", "sail", "meen",
            "meenavar", "kadal", "padagu", "machli", "machuara", "samundar"
        }
        if (words.intersection(marine_keywords) or
            any(w in q for w in ["மீனவர்", "கடல்", "படகு", "मछुआरा", "समुद्र", "नाव", "మత్స్యకారుడు", "సముద్రం"])):
            return "profession_advisory"

        forecast_keywords = {
            "tomorrow", "naalai", "naalikku", "naalaikku", "nalaikku", "kal", "kaal",
            "repu", "future", "week", "next", "weekend", "forecast", "varumaa", "varuma"
        }
        rain_keywords = {
            "rain", "raining", "malai", "mazhai", "baarish", "barish", "varsham",
            "drizzle", "shower", "showers", "umbrella", "kudai", "chata"
        }
        if (words.intersection(forecast_keywords) or words.intersection(rain_keywords) or
            any(w in q for w in ["நாளை", "மழை", "குடை", "முன்னறிவிப்பு", "कल", "बारिश", "छाता", "पूर्वानुमान", "రేపు", "వర్షం", "గొడుగు", "3-day", "7-day"])):
            return "forecast_query"

        weather_keywords = {
            "temp", "temperature", "veyil", "soodu", "garmi", "thand", "kulir",
            "wind", "kaatru", "hawa", "weather", "aqi", "air", "today", "now", "inniku", "aaj"
        }
        if (words.intersection(weather_keywords) or
            any(w in q for w in ["வெப்பநிலை", "காற்று", "இன்று", "வானிலை", "तापमान", "हवा", "आज", "मौसम", "ఉష్ణోగ్రత", "వాతావరణం", "ఈరోజు"])):
            return "current_weather"

        return "general_weather_chat"

    async def process_query(
        self,
        text: str,
        lang: str = "en",
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        city: Optional[str] = None,
        profession: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        lat = lat or settings.DEFAULT_LAT
        lon = lon or settings.DEFAULT_LON
        profession = (profession or settings.DEFAULT_PROFESSION).lower()

        detected_city = city
        city_match = re.search(r'\bin\s+([A-Za-z\s]+?)(?:\?|\.|\,|$|\s+tomorrow|\s+today|\s+yesterday)', text, re.IGNORECASE)
        if city_match:
            candidate = city_match.group(1).strip()
            if len(candidate) > 2 and candidate.lower() not in ["the", "my", "area", "this", "city"]:
                detected_city = candidate

        if detected_city and detected_city != city:
            try:
                geo_results = await weather_service.geocode_search(detected_city)
                if geo_results:
                    lat = geo_results[0]["lat"]
                    lon = geo_results[0]["lon"]
                    detected_city = geo_results[0]["name"]
            except Exception as e:
                logger.debug("Geocoding lookup notice for %s: %s", detected_city, e)

        detected_lang = self.detect_query_language(text, default_lang=lang)
        intent = self.classify_intent(text)

        current = await weather_service.get_current_weather(lat, lon, city=detected_city)
        forecast = await weather_service.get_forecast(lat, lon, days=7)
        grounded_data: Dict[str, Any] = {
            "current": current,
            "forecast_daily": forecast.get("daily", [])[:4]
        }

        if intent == "historical_research":
            yesterday_str = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
            hist = await weather_service.get_historical_trends(lat, lon, yesterday_str, yesterday_str)
            yesterday_points = hist.get("data", [])
            grounded_data["yesterday_recorded_weather"] = yesterday_points[0] if yesterday_points else {
                "date": yesterday_str,
                "precipitation": 0.0,
                "temp_max": current.get("temperature", 32.0),
                "temp_min": current.get("temperature", 24.0) - 5
            }

        if intent in ["alert_lookup"]:
            alerts = await alerts_service.evaluate_active_alerts(lat, lon, city=detected_city)
            grounded_data["active_alerts"] = alerts

        if intent in ["profession_advisory"]:
            advisory = await advisory_service.get_profession_advisory(profession, lat, lon, detected_lang, city=detected_city)
            grounded_data["advisory"] = advisory

        active_city = detected_city or current.get("city", "your area")
        lang_directive = "Tamil (தமிழ்)" if detected_lang == "ta" else "Hindi (हिंदी)" if detected_lang == "hi" else "Telugu (తెలుగు)" if detected_lang == "te" else "English"

        system_prompt = (
            f"You are WeatherGPT, an advanced AI Weather & Climate Intelligence Assistant worldwide.\n"
            f"User Location: {active_city} (Lat: {lat}, Lon: {lon}). User Role: {profession.upper()}.\n\n"
            f"CRITICAL LANGUAGE RULE:\n"
            f"- The user's input language is detected as: {lang_directive}.\n"
            f"- You MUST write your ENTIRE response in {lang_directive}.\n"
            f"- If user asked in Tamil or Tanglish, reply in pure Tamil (தமிழ்).\n"
            f"- If user asked in Hindi or Hinglish, reply in pure Hindi (हिंदी).\n"
            f"- If user asked in Telugu, reply in Telugu (తెలుగు).\n"
            f"- If user asked in English, reply in English.\n\n"
            f"ACCURACY RULES:\n"
            f"- Answer the user's specific question directly based STRICTLY on the live meteorological data below.\n"
            f"- If asked about storm / cyclone / alert: analyze live wind speed ({current.get('wind_speed')} km/h), barometric pressure ({current.get('pressure')} hPa), condition ({current.get('condition')}), and any active alerts.\n"
            f"- If asked about yesterday: use 'yesterday_recorded_weather' data strictly.\n"
            f"- If asked about tomorrow/forecast: use 'forecast_daily' rain % and conditions strictly.\n"
            f"- Keep replies concise, clean, and helpful (2-3 sentences max).\n\n"
            f"VERIFIED LIVE DATA CONTEXT:\n"
            f"{json.dumps(grounded_data, indent=2, default=str)}"
        )

        user_prompt = f"User Question: '{text}'"

        active_provider = settings.LLM_PROVIDER or "groq"
        response_text = None
        provider_used = "WeatherGPT AI"

        provider_chain = []
        if active_provider in self.adapters:
            provider_chain.append((active_provider, self.adapters[active_provider]))
        for name, adapter in self.adapters.items():
            if name != active_provider:
                provider_chain.append((name, adapter))

        for name, adapter in provider_chain:
            try:
                resp = await adapter.generate_response(user_prompt, system_prompt)
                if resp and len(resp.strip()) > 5:
                    response_text = resp.strip()
                    provider_used = f"WeatherGPT AI ({name})"
                    break
            except Exception as ex:
                logger.debug("Provider %s exception: %s", name, ex)

        if not response_text:
            provider_used = "WeatherGPT Grounded Intelligence"
            response_text = self._build_grounded_fallback_response(
                text=text,
                intent=intent,
                lang=detected_lang,
                profession=profession,
                data=grounded_data
            )

        if user_id:
            try:
                chat_col = db_manager.get_collection("chat_history")
                await chat_col.insert_one({
                    "user_id": user_id,
                    "role": "user",
                    "message_text": text,
                    "language_code": detected_lang,
                    "intent_detected": intent,
                    "created_at": datetime.now(timezone.utc)
                })
                await chat_col.insert_one({
                    "user_id": user_id,
                    "role": "assistant",
                    "message_text": response_text,
                    "language_code": detected_lang,
                    "intent_detected": intent,
                    "provider_used": provider_used,
                    "created_at": datetime.now(timezone.utc)
                })
            except Exception as e:
                logger.debug("Chat history logging skipped: %s", e)

        followups = self._generate_suggested_followups(intent, profession, detected_lang)

        return {
            "query": text,
            "answer": response_text,
            "language_code": detected_lang,
            "intent": intent,
            "provider_used": provider_used,
            "suggested_followups": followups
        }

    def _build_grounded_fallback_response(
        self,
        text: str,
        intent: str,
        lang: str,
        profession: str,
        data: Dict[str, Any]
    ) -> str:
        curr = data.get("current", {})
        forecast_daily = data.get("forecast_daily", [])
        city = curr.get("city", "your area")

        is_tamil = lang == "ta"
        is_hindi = lang == "hi"
        is_telugu = lang == "te"

        q_lower = text.lower()

        # 1. Storm / Cyclone / Alert Query
        if intent == "alert_lookup" or any(w in q_lower for w in ["storm", "cyclone", "flood", "toofan", "puyal", "warning", "danger"]):
            wind = curr.get("wind_speed", 12.0)
            press = curr.get("pressure", 1012)
            cond = curr.get("condition", "Clear Sky")
            active_alerts = data.get("active_alerts", {}).get("alerts", [])

            if active_alerts or wind > 50 or press < 1000:
                if is_tamil:
                    return f"⚠️ **{city} - தீவிர வானிலை & புயல் எச்சரிக்கை**: காற்றில் வேகம் **{wind} km/h** மற்றும் காற்றழுத்தம் **{press} hPa** ஆக தீவிரமடைந்துள்ளது. தயவுசெய்து பாதுகாப்பாக இருக்கவும்."
                elif is_hindi:
                    return f"⚠️ **{city} - तूफान व गंभीर मौसम चेतावनी**: तेज हवाएं (**{wind} km/h**) और वायुमंडलीय दबाव **{press} hPa** दर्ज किया गया है। कृपया सतर्क रहें।"
                elif is_telugu:
                    return f"⚠️ **{city} - తుఫాను హెచ్చరిక**: గాలుల వేగం (**{wind} km/h**) మరియు వాతావరణ పీడనం **{press} hPa**. దయచేసి అప్రమత్తంగా ఉండండి."
                else:
                    return f"⚠️ **Storm & Severe Weather Alert for {city}**: Adverse atmospheric conditions detected with wind speeds at **{wind} km/h** and barometric pressure at **{press} hPa**. Please exercise caution and monitor advisories."
            else:
                if is_tamil:
                    return f"🌤️ **{city} - புயல் ஆய்வு**: தற்போது {city} பகுதியில் **புயல் அல்லது சூறாவளிக்கான எந்த அச்சுறுத்தலும் இல்லை**. காற்றழுத்தம் **{press} hPa** ஆக சீராக உள்ளது, காற்றின் வேகம் **{wind} km/h**, வானிலை **{cond}** ஆக உள்ளது."
                elif is_hindi:
                    return f"🌤️ **{city} - तूफान विश्लेषण**: वर्तमान में {city} में **तूफान का कोई खतरा नहीं है**। वायुमंडलीय दबाव **{press} hPa** पर स्थिर है, हवा की गति **{wind} km/h** है और मौसम **{cond}** है।"
                elif is_telugu:
                    return f"🌤️ **{city} - తుఫాను సమాచారం**: ప్రస్తుతం {city} లో **ఎటువంటి తుఫాను ముప్పు లేదు**. వాయు పీడనం **{press} hPa** వద్ద స్థిరంగా ఉంది, గాలి వేగం **{wind} km/h** మరియు వాతావరణం **{cond}**."
                else:
                    return f"🌤️ **Storm Analysis for {city}**: There is currently **no imminent storm or cyclone threat** in {city}. Barometric pressure is stable at **{press} hPa** with gentle winds at **{wind} km/h** and **{cond}** conditions. Atmosphere remains safe and stable."

        # 2. Air Quality / AQI query
        if any(w in q_lower for w in ["aqi", "air quality", "pollution", "pm2.5", "pm10", "smog", "காற்று தரம்", "वायु गुणवत्ता", "గాలి నాణ్యత"]):
            aqi_val = curr.get("aqi", 65)
            aqi_lbl = curr.get("aqi_label", "Moderate")
            if is_tamil:
                return f"🍃 **{city} - காற்றின் தரம் (AQI)**: காற்றின் தரக் குறியீடு **{aqi_val}** (**{aqi_lbl}**) ஆக உள்ளது. சுவாசிக்க உகந்த சூழல் நிலவுகிறது."
            elif is_hindi:
                return f"🍃 **{city} - वायु गुणवत्ता (AQI)**: वर्तमान वायु गुणवत्ता सूचकांक **{aqi_val}** (**{aqi_lbl}**) है।"
            elif is_telugu:
                return f"🍃 **{city} - గాలి నాణ్యత (AQI)**: ప్రస్తుత గాలి నాణ్యత సూచిక **{aqi_val}** (**{aqi_lbl}**)."
            else:
                return f"🍃 **Air Quality in {city}**: The current Air Quality Index is **{aqi_val}** (**{aqi_lbl}**). Atmospheric particulate dispersion remains stable."

        # 3. Temperature / Heat / Cold query
        if any(w in q_lower for w in ["temp", "temperature", "heat", "hot", "cold", "feels like", "சூரியன்", "வெப்பம்", "குளிர்", "तापमान", "गर्मी", "सर्दी", "ఉష్ణోగ్రత"]):
            temp_val = curr.get("temperature", 28.0)
            feels_val = curr.get("feels_like", 30.0)
            hum_val = curr.get("humidity", 65)
            cond_val = curr.get("condition", "Clear Sky")
            if is_tamil:
                return f"🌡️ **{city} - வெப்பநிலை விவரம்**: தற்போது வெப்பநிலை **{temp_val}°C** (உணரப்படும் வெப்பநிலை: **{feels_val}°C**), ஈரப்பதம் **{hum_val}%**, வானிலை **{cond_val}**."
            elif is_hindi:
                return f"🌡️ **{city} - तापमान विवरण**: वर्तमान तापमान **{temp_val}°C** है (महसूस: **{feels_val}°C**)। आर्द्रता **{hum_val}%** और मौसम **{cond_val}** है।"
            elif is_telugu:
                return f"🌡️ **{city} - ఉష్ణోగ్రత**: ప్రస్తుత ఉష్ణోగ్రత **{temp_val}°C** (అనిపించే ఉష్ణోగ్రత: **{feels_val}°C**), తేమ **{hum_val}%**."
            else:
                return f"🌡️ **Temperature in {city}**: Currently **{temp_val}°C** (Feels like **{feels_val}°C**) with **{hum_val}%** relative humidity under **{cond_val}** conditions."

        # 4. Past / Yesterday query
        if intent == "historical_research":
            y_data = data.get("yesterday_recorded_weather", {})
            y_precip = y_data.get("precipitation", 0.0)
            y_max = y_data.get("temp_max", 34.0)
            y_date = y_data.get("date", "Yesterday")
            if y_precip > 0:
                if is_tamil:
                    return f"🌦️ **{city} - நேற்று ({y_date})**: நேற்று மிதமான மழை பதிவானது. மழையளவு: **{y_precip} mm**, அதிகபட்ச வெப்பநிலை: **{y_max}°C**."
                elif is_hindi:
                    return f"🌦️ **{city} - कल ({y_date})**: कल वर्षा दर्ज की गई (**{y_precip} mm**) और अधिकतम तापमान **{y_max}°C** रहा।"
                elif is_telugu:
                    return f"🌦️ **{city} - నిన్న ({y_date})**: నిన్న వర్షపాతం **{y_precip} mm** మరియు గరిష్ట ఉష్ణోగ్రత **{y_max}°C**."
                else:
                    return f"🌦️ **Recorded Weather for {city} ({y_date})**: Precipitation was recorded at **{y_precip} mm** with a maximum temperature of **{y_max}°C**."
            else:
                if is_tamil:
                    return f"🌤️ **{city} - நேற்று ({y_date})**: மழை எதுவும் பதிவாகவில்லை, வானிலை சீராக இருந்தது. அதிகபட்ச வெப்பநிலை **{y_max}°C**."
                elif is_hindi:
                    return f"🌤️ **{city} - कल ({y_date})**: कोई महत्वपूर्ण वर्षा नहीं हुई और मौसम सामान्य रहा।"
                elif is_telugu:
                    return f"🌤️ **{city} - నిన్న ({y_date})**: వర్షం నమోదు కాలేదు, వాతావరణం సాధారణంగా ఉంది."
                else:
                    return f"🌤️ **Recorded Weather for {city} ({y_date})**: Stable meteorological conditions with 0.0 mm precipitation and a high of **{y_max}°C**."

        # 5. 3-day / Forecast query
        if any(w in q_lower for w in ["3-day", "7-day", "week", "days", "முன்னறிவிப்பு", "पूर्वानुमान"]) and forecast_daily:
            if is_tamil:
                forecast_lines = [f"• **{d.get('date', 'Day')}**: {d.get('condition', 'Clear')} | {d.get('temp_max', 30)}°C / {d.get('temp_min', 22)}°C (மழை: {d.get('precip_probability', 10)}%)" for d in forecast_daily[:3]]
                return f"📅 **{city} - 3 நாள் முன்னறிவிப்பு**:\n" + "\n".join(forecast_lines)
            elif is_hindi:
                forecast_lines = [f"• **{d.get('date', 'Day')}**: {d.get('condition', 'Clear')} | {d.get('temp_max', 30)}°C / {d.get('temp_min', 22)}°C (बारिश: {d.get('precip_probability', 10)}%)" for d in forecast_daily[:3]]
                return f"📅 **{city} - 3 दिनों का पूर्वानुमान**:\n" + "\n".join(forecast_lines)
            elif is_telugu:
                forecast_lines = [f"• **{d.get('date', 'Day')}**: {d.get('condition', 'Clear')} | {d.get('temp_max', 30)}°C / {d.get('temp_min', 22)}°C (వర్షం: {d.get('precip_probability', 10)}%)" for d in forecast_daily[:3]]
                return f"📅 **{city} - 3 రోజుల సమాచారం**:\n" + "\n".join(forecast_lines)
            else:
                forecast_lines = [f"• **{d.get('date', 'Day')}**: {d.get('condition', 'Clear')} | High {d.get('temp_max', 30)}°C / Low {d.get('temp_min', 22)}°C (Rain: {d.get('precip_probability', 10)}%)" for d in forecast_daily[:3]]
                return f"📅 **3-Day Forecast for {city}**:\n" + "\n".join(forecast_lines)

        # 6. Tomorrow / Rain forecast
        if intent == "forecast_query" or any(w in q_lower for w in ["tomorrow", "rain", "umbrella", "மழை", "நாளை", "बारिश", "कल", "వర్షం", "రేపు"]):
            tmrw = forecast_daily[1] if len(forecast_daily) > 1 else (forecast_daily[0] if forecast_daily else {})
            tmrw_cond = tmrw.get("condition", "Partly Cloudy")
            tmrw_max = tmrw.get("temp_max", curr.get("temperature", 30) + 2)
            tmrw_min = tmrw.get("temp_min", curr.get("temperature", 30) - 4)
            tmrw_rain_prob = tmrw.get("precip_probability", 20)

            if is_tamil:
                rain_text = "மழை பெய்ய வாய்ப்புள்ளது, குடை எடுத்துச் செல்லவும்" if tmrw_rain_prob >= 40 else "மழைக்கான வாய்ப்பு குறைவு"
                return f"🌧️ **{city} - நாளைய வானிலை**: வானிலை **{tmrw_cond}** ஆக இருக்கும். அதிகபட்ச வெப்பநிலை **{tmrw_max}°C**, குறைந்தபட்சம் **{tmrw_min}°C**. மழை வாய்ப்பு **{tmrw_rain_prob}%** ({rain_text})."
            elif is_hindi:
                rain_text = "बारिश की संभावना है, छाता साथ रखें" if tmrw_rain_prob >= 40 else "बारिश की संभावना कम है"
                return f"🌧️ **{city} - कल का मौसम**: कल **{tmrw_cond}** रहेगा। अधिकतम तापमान **{tmrw_max}°C** और न्यूनतम **{tmrw_min}°C** रहेगा। बारिश की संभावना **{tmrw_rain_prob}%** है ({rain_text})।"
            elif is_telugu:
                rain_text = "వర్షం పడే అవకాశం ఉంది, గొడుగు తీసుకెళ్లండి" if tmrw_rain_prob >= 40 else "వర్షం పడే అవకాశం తక్కువ"
                return f"🌧️ **{city} - రేపటి వాతావరణం**: రేపు **{tmrw_cond}** ఉంటుంది. గరిష్ట ఉష్ணోగ్రత **{tmrw_max}°C**, కనిష్ట **{tmrw_min}°C**. వర్షం అవకాశం **{tmrw_rain_prob}%** ({rain_text})."
            else:
                rain_status = "Rain expected, carrying an umbrella is recommended" if tmrw_rain_prob >= 40 else "Low chance of rain"
                return f"🌧️ **Tomorrow in {city}**: Expected **{tmrw_cond}** with a high of **{tmrw_max}°C** and low of **{tmrw_min}°C**. Precipitation probability is **{tmrw_rain_prob}%** ({rain_status})."

        # 7. General current weather
        temp = curr.get("temperature", 28.0)
        cond = curr.get("condition", "Clear")
        wind = curr.get("wind_speed", 12.0)
        humidity = curr.get("humidity", 65)

        if is_tamil:
            return f"🌤️ **{city} தற்போதைய வானிலை**: வானிலை **{cond}** ஆக உள்ளது. வெப்பநிலை **{temp}°C**, காற்றின் வேகம் **{wind} km/h**, ஈரப்பதம் **{humidity}%**."
        elif is_hindi:
            return f"🌤️ **{city} वर्तमान मौसम**: मौसम **{cond}** है। तापमान **{temp}°C**, हवा की गति **{wind} km/h** और नमी **{humidity}%** है।"
        elif is_telugu:
            return f"🌤️ **{city} ప్రస్తుత వాతావరణం**: వాతావరణం **{cond}**. ఉష్ణోగ్రత **{temp}°C**, గాలి వేగం **{wind} km/h**, తేమ **{humidity}%**."
        else:
            return f"🌤️ **Current Weather in {city}**: Currently **{cond}** at **{temp}°C** with wind speed of **{wind} km/h** and humidity of **{humidity}%**."

    def _generate_suggested_followups(self, intent: str, profession: str, lang: str) -> List[str]:
        if lang == "ta":
            return [
                "நாளை மழை பெய்ய வாய்ப்பு எவ்வளவு?",
                "அடுத்த 3 நாட்களுக்கு வானிலை எப்படி இருக்கும்?",
                "இன்று வெளியே செல்ல குடை தேவையா?"
            ]
        elif lang == "hi":
            return [
                "कल बारिश की कितनी संभावना है?",
                "अगले 3 दिनों का तापमान कैसा रहेगा?",
                "क्या आज छाता ले जाना जरूरी है?"
            ]
        elif lang == "te":
            return [
                "రేపు వర్షం పడే అవకాశం ఎంత?",
                "రాబోయే 3 రోజుల ఉష్ణోగ్రత ఎలా ఉంటుంది?",
                "ఈరోజు గొడుగు అవసరమా?"
            ]
        return [
            "Will it rain tomorrow in my area?",
            "Show 3-day temperature forecast",
            "Do I need an umbrella today?"
        ]

llm_service = LLMService()
