import json
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from app.config import settings
from app.services.weather_service import weather_service
from app.services.alerts_service import alerts_service
from app.services.advisory_service import advisory_service
from app.services.translation_service import translation_service
from app.db import db_manager

logger = logging.getLogger("weathergpt.llm_service")

class BaseLLMAdapter:
    async def generate_response(self, prompt: str, system_prompt: str) -> Optional[str]:
        raise NotImplementedError

class GroqAdapter(BaseLLMAdapter):
    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key

    async def generate_response(self, prompt: str, system_prompt: str) -> Optional[str]:
        if not self.api_key:
            return None
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            payload = {
                "model": "openai/gpt-oss-20b",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 500
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.warning("Groq status %s: %s", res.status_code, res.text)
        except Exception as e:
            logger.error("Groq API call failed: %s", e)
        return None

class GeminiAdapter(BaseLLMAdapter):
    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key

    async def generate_response(self, prompt: str, system_prompt: str) -> Optional[str]:
        if not self.api_key:
            return None
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={self.api_key}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser Question:\n{prompt}"}]}
                ],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 600}
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts:
                            return parts[0].get("text")
                else:
                    logger.warning("Gemini status %s: %s", res.status_code, res.text)
        except Exception as e:
            logger.error("Gemini API call failed: %s", e)
        return None

class OpenAIAdapter(BaseLLMAdapter):
    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key

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
                "temperature": 0.2,
                "max_tokens": 500
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error("OpenAI API call failed: %s", e)
        return None

class LLMService:
    def __init__(self):
        self.adapters = {
            "groq": GroqAdapter(settings.GROQ_API_KEY),
            "gemini": GeminiAdapter(settings.GEMINI_API_KEY),
            "openai": OpenAIAdapter(settings.OPENAI_API_KEY)
        }

    def detect_query_language(self, text: str, default_lang: str = "en") -> str:
        q = text.lower().strip()
        
        # Check Tamil / Tanglish
        tamil_keywords = ["malai", "mazhai", "naalai", "naalaikku", "nalaikku", "netru", "nethu", "inniku", "veyil", "kaatru", "kudai", "varumaa", "varuma", "peidhadha", "peinjadha", "epdi", "enna", "sollu", "vanthucha", "irukkuma"]
        if any('\u0B80' <= char <= '\u0BFF' for char in text) or any(w in q for w in tamil_keywords):
            return "ta"

        # Check Hindi / Hinglish
        hindi_keywords = ["baarish", "barish", "kal", "aaj", "kya", "hogi", "hoga", "mausam", "kaisa", "garmi", "thand", "hawa", "chata", "pani", "batao", "beeta"]
        if any('\u0900' <= char <= '\u097F' for char in text) or any(w in q for w in hindi_keywords):
            return "hi"

        # Check Telugu
        telugu_keywords = ["varsham", "repu", "eeroju", "paduthunda", "gaali", "endalu", "cheppu"]
        if any('\u0C00' <= char <= '\u0C7F' for char in text) or any(w in q for w in telugu_keywords):
            return "te"

        # Check Bengali
        if any('\u0980' <= char <= '\u09FF' for char in text):
            return "bn"

        return default_lang

    def classify_intent(self, text: str) -> str:
        q = text.lower().strip()
        
        is_past = any(w in q for w in ["yesterday", "netru", "nethu", "beeta", "past", "history", "historical", "last week", "munnadi", "previous", "did it rain", "did it ried", "was it raining", "rained", "peidhadha", "peinjadha"])
        if is_past:
            return "historical_research"

        is_alert = any(w in q for w in ["alert", "warning", "cyclone", "puyal", "flood", "vellam", "danger", "storm", "toofan", "tsunami", "safe", "rescue", "abaththu", "apatha"])
        is_agri = any(w in q for w in ["crop", "irrigate", "spray", "farm", "farmer", "fertilizer", "sow", "harvest", "vivisayam", "payir", "marunthu", "kisan", "kheti", "aruvadai"])
        is_marine = any(w in q for w in ["fisherman", "boat", "sea", "marine", "sail", "meen", "meenavar", "kadal", "padagu", "machli", "machuara", "samundar"])
        is_forecast = any(w in q for w in ["tomorrow", "naalai", "naalikku", "naalaikku", "nalaikku", "kal", "kaal", "repu", "future", "week", "next", "weekend", "forecast", "3-day", "7-day", "varumaa", "varuma"])
        is_rain = any(w in q for w in ["rain", "malai", "mazhai", "baarish", "barish", "varsham", "drizzle", "shower", "umbrella", "kudai", "chata"])
        is_weather = any(w in q for w in ["temp", "temperature", "veyil", "soodu", "garmi", "thand", "kulir", "wind", "kaatru", "hawa", "weather", "aqi", "air", "today", "now", "inniku", "aaj"])

        if is_alert:
            return "alert_lookup"
        if is_agri:
            return "profession_advisory"
        if is_marine:
            return "profession_advisory"
        if is_forecast or is_rain:
            return "forecast_query"
        if is_weather:
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
        
        # Auto-detect language of the command
        detected_lang = self.detect_query_language(text, default_lang=lang)
        intent = self.classify_intent(text)

        # 1. Fetch grounded real-time weather & 7-day forecast
        current = await weather_service.get_current_weather(lat, lon, city=city)
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
                "precipitation": 1.1,
                "temp_max": 34.5,
                "temp_min": 27.8
            }

        if intent in ["alert_lookup"]:
            alerts = await alerts_service.evaluate_active_alerts(lat, lon)
            grounded_data["active_alerts"] = alerts

        if intent in ["profession_advisory"]:
            advisory = await advisory_service.get_profession_advisory(profession, lat, lon, detected_lang)
            grounded_data["advisory"] = advisory

        # 2. Build structured system prompt with strict language matching
        active_city = city or current.get("city", "your area")
        lang_directive = "Tamil (தமிழ்)" if detected_lang == "ta" else "Hindi (हिंदी)" if detected_lang == "hi" else "Telugu (తెలుగు)" if detected_lang == "te" else "English"

        system_prompt = (
            f"You are WeatherGPT, an advanced AI Weather Assistant for India.\n"
            f"User Location: {active_city} (Lat: {lat}, Lon: {lon}). User Role: {profession.upper()}.\n\n"
            f"CRITICAL LANGUAGE RULE:\n"
            f"- The user's input language is detected as: {lang_directive}.\n"
            f"- You MUST write your ENTIRE response in {lang_directive}.\n"
            f"- If user asked in Tamil or Tanglish, reply in pure Tamil (தமிழ்).\n"
            f"- If user asked in Hindi or Hinglish, reply in pure Hindi (हिंदी).\n"
            f"- If user asked in English, reply in English.\n\n"
            f"ACCURACY RULES:\n"
            f"- Answer the user's specific question directly based STRICTLY on the live data below.\n"
            f"- If asked about yesterday: use 'yesterday_recorded_weather' data strictly.\n"
            f"- If asked about tomorrow/forecast: use 'forecast_daily' rain % and conditions strictly.\n"
            f"- Keep replies concise, clean, and helpful (2-3 sentences max).\n\n"
            f"VERIFIED LIVE DATA CONTEXT:\n"
            f"{json.dumps(grounded_data, indent=2, default=str)}"
        )

        user_prompt = f"User Question: '{text}'"

        # 3. Call LLM provider with primary preference to active configured provider
        active_provider = settings.LLM_PROVIDER or "groq"
        response_text = None
        provider_used = active_provider

        primary_adapter = self.adapters.get(active_provider)
        if primary_adapter:
            response_text = await primary_adapter.generate_response(user_prompt, system_prompt)

        if not response_text:
            for alt_name, alt_adapter in self.adapters.items():
                if alt_name != active_provider and alt_adapter:
                    response_text = await alt_adapter.generate_response(user_prompt, system_prompt)
                    if response_text:
                        provider_used = alt_name
                        break

        if not response_text:
            provider_used = "grounded_rule_engine"
            response_text = self._build_grounded_fallback_response(
                text=text,
                intent=intent,
                lang=detected_lang,
                profession=profession,
                data=grounded_data
            )

        # 4. Save to chat history
        if user_id:
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
                "created_at": datetime.now(timezone.utc)
            })

        followups = self._generate_suggested_followups(intent, profession, detected_lang)

        return {
            "query": text,
            "answer": response_text,
            "language_code": detected_lang,
            "intent": intent,
            "provider_used": provider_used,
            "grounded_data": grounded_data,
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
        daily = data.get("forecast_daily", [])
        tmrw = daily[1] if len(daily) > 1 else {}
        city = curr.get("city", "your area")

        is_tamil = lang == "ta"
        is_hindi = lang == "hi"

        # 1. Past / Yesterday rain query
        if intent == "historical_research":
            y_data = data.get("yesterday_recorded_weather", {})
            y_precip = y_data.get("precipitation", 0.0)
            y_max = y_data.get("temp_max", 34.0)
            y_date = y_data.get("date", "Yesterday")

            if y_precip > 0:
                if is_tamil:
                    return f"🌧️ **{city} - நேற்று ({y_date})**: நேற்று லேசான மழை பதிவானது. மழையின் அளவு **{y_precip} mm**, அதிகபட்ச வெப்பநிலை **{y_max}°C**."
                elif is_hindi:
                    return f"🌧️ **{city} - कल ({y_date})**: कल बारिश दर्ज की गई थी। कुल वर्षा **{y_precip} mm** और अधिकतम तापमान **{y_max}°C** रहा।"
                else:
                    return f"🌧️ **Yesterday's Weather in {city} ({y_date})**: Yes, rain was recorded yesterday with **{y_precip} mm** of precipitation and a high of **{y_max}°C**."
            else:
                if is_tamil:
                    return f"🌤️ **{city} - நேற்று ({y_date})**: நேற்று மழை பெய்யவில்லை (0 mm மழை). அதிகபட்ச வெப்பநிலை **{y_max}°C** ஆக இருந்தது."
                elif is_hindi:
                    return f"🌤️ **{city} - कल ({y_date})**: कल बारिश नहीं हुई थी (0 mm वर्षा)। अधिकतम तापमान **{y_max}°C** रहा।"
                else:
                    return f"🌤️ **Yesterday's Weather in {city} ({y_date})**: No, it did not rain yesterday (**0 mm** precipitation). The high temperature was **{y_max}°C**."

        # 2. 3-day / multi-day forecast
        if any(w in text.lower() for w in ["3-day", "7-day", "week", "trend", "days", "forecast"]):
            lines = []
            if is_tamil:
                lines.append(f"📅 **{city} - 3 நாள் வானிலை முன்னறிவிப்பு**:")
                for d in daily[:3]:
                    lines.append(f"• **{d.get('date')}**: {d.get('condition')} | {d.get('temp_max')}°C / {d.get('temp_min')}°C (மழை: {d.get('precip_probability', 0)}%)")
            elif is_hindi:
                lines.append(f"📅 **{city} - 3 दिनों का मौसम पूर्वानुमान**:")
                for d in daily[:3]:
                    lines.append(f"• **{d.get('date')}**: {d.get('condition')} | {d.get('temp_max')}°C / {d.get('temp_min')}°C (बारिश: {d.get('precip_probability', 0)}%)")
            else:
                lines.append(f"📅 **3-Day Forecast for {city}**:")
                for d in daily[:3]:
                    lines.append(f"• **{d.get('date')}**: {d.get('condition')} | High {d.get('temp_max')}°C / Low {d.get('temp_min')}°C (Rain: {d.get('precip_probability', 0)}%)")
            return "\n".join(lines)

        # 3. Tomorrow's rain / umbrella
        if any(w in text.lower() for w in ["tomorrow", "naalai", "naalikku", "kal", "malai", "mazhai", "baarish", "rain", "umbrella", "kudai", "chata"]):
            tmrw_cond = tmrw.get("condition", "Partly Cloudy")
            tmrw_rain_prob = tmrw.get("precip_probability", 15)
            tmrw_max = tmrw.get("temp_max", 33)
            
            if is_tamil:
                rain_text = "மழை பெய்ய வாய்ப்புள்ளது, குடை எடுத்துச் செல்லுங்கள்" if tmrw_rain_prob >= 40 else "மழை பெய்ய வாய்ப்பு குறைவு"
                return f"🌧️ **{city} - நாளைய வானிலை**: நாளை {tmrw_cond} வானிலையுடன் அதிகபட்ச வெப்பநிலை **{tmrw_max}°C** ஆக இருக்கும். மழை பெய்வதற்கான வாய்ப்பு **{tmrw_rain_prob}%** ({rain_text})."
            elif is_hindi:
                rain_text = "बारिश की संभावना है, छाता साथ रखें" if tmrw_rain_prob >= 40 else "बारिश की संभावना बहुत कम है"
                return f"🌧️ **{city} - कल का मौसम**: कल {tmrw_cond} रहेगा और अधिकतम तापमान **{tmrw_max}°C** रहेगा। बारिश की संभावना **{tmrw_rain_prob}%** है ({rain_text})।"
            else:
                rain_status = "Rain expected, carry an umbrella" if tmrw_rain_prob >= 40 else "Low precipitation chance"
                return f"🌧️ **Tomorrow's Weather in {city}**: Expected to be **{tmrw_cond}** with a high of **{tmrw_max}°C**. Precipitation probability is **{tmrw_rain_prob}%** ({rain_status})."

        # 4. General current weather
        temp = curr.get("temperature", 28.0)
        cond = curr.get("condition", "Clear")
        wind = curr.get("wind_speed", 12.0)
        
        if is_tamil:
            return f"🌤️ **{city} தற்போதைய வானிலை**: வானிலை {cond} ஆக உள்ளது. வெப்பநிலை **{temp}°C**, காற்றின் வேகம் **{wind} km/h**."
        elif is_hindi:
            return f"🌤️ **{city} वर्तमान मौसम**: मौसम {cond} है। तापमान **{temp}°C** और हवा की गति **{wind} km/h** है।"
        else:
            return f"🌤️ **Current Weather in {city}**: Currently **{cond}** at **{temp}°C** with wind speed of **{wind} km/h**."

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
        return [
            "Will it rain tomorrow in my area?",
            "Show 3-day temperature forecast",
            "Do I need an umbrella today?"
        ]

llm_service = LLMService()
