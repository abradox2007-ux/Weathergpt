from typing import Dict, Any, List

SUPPORTED_LANGUAGES: Dict[str, Dict[str, str]] = {
    "en": {"name": "English", "native": "English", "script": "Latn"},
    "hi": {"name": "Hindi", "native": "हिन्दी", "script": "Deva"},
    "bn": {"name": "Bengali", "native": "বাংলা", "script": "Beng"},
    "te": {"name": "Telugu", "native": "తెలుగు", "script": "Telu"},
    "mr": {"name": "Marathi", "native": "मराठी", "script": "Deva"},
    "ta": {"name": "Tamil", "native": "தமிழ்", "script": "Taml"},
    "ur": {"name": "Urdu", "native": "اردو", "script": "Arab"},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી", "script": "Gujr"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "script": "Knda"},
    "or": {"name": "Odia", "native": "ଓଡ଼ିଆ", "script": "Orya"},
    "ml": {"name": "Malayalam", "native": "മലയാളം", "script": "Mlym"},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "script": "Guru"},
    "as": {"name": "Assamese", "native": "অসমীয়া", "script": "Beng"},
}

PRECAUTIONS_BY_TYPE: Dict[str, Dict[str, Any]] = {
    "cyclone": {
        "dos": [
            "Keep emergency battery lights, first-aid kit, and canned food handy.",
            "Stay tuned to official IMD/NDMA weather bulletins.",
            "Board up glass windows or put tape cross marks.",
            "Fishermen must stay ashore and anchor boats safely.",
            "Move to higher ground if living in low-lying coastal zones."
        ],
        "donts": [
            "Do not venture out into the sea or near coastal waters.",
            "Do not touch fallen electric wires or poles.",
            "Avoid driving through flooded underpasses or causeways.",
            "Do not spread unverified rumors on social messaging."
        ],
        "emergency_contacts": [
            {"label": "NDMA Disaster Helpline", "number": "1078"},
            {"label": "State Disaster Control", "number": "1070"},
            {"label": "Coast Guard Distress", "number": "1554"},
            {"label": "Ambulance / Emergency", "number": "112"}
        ]
    },
    "heat": {
        "dos": [
            "Drink plenty of water and oral rehydration fluids (ORS, lassi, coconut water).",
            "Wear lightweight, loose-fitting, light-colored cotton clothes.",
            "Cover your head with a hat, umbrella, or cloth when outside.",
            "Keep livestock in shaded areas and provide ample drinking water.",
            "Schedule heavy farm/field activities during early morning or late evening."
        ],
        "donts": [
            "Do not step out directly into peak sun between 12:00 PM and 3:30 PM.",
            "Avoid alcohol, tea, coffee, and carbonated beverages which dehydrate.",
            "Never leave children or pets locked in closed vehicles.",
            "Avoid high-protein and spicy street food during severe heat waves."
        ],
        "emergency_contacts": [
            {"label": "National Health Helpline", "number": "1075"},
            {"label": "Heat Stroke Emergency / Ambulance", "number": "108"}
        ]
    },
    "flood": {
        "dos": [
            "Switch off electricity mains and gas supply before evacuating.",
            "Drink boiled or chlorine-tablet-treated water.",
            "Keep emergency documents, cash, and medications in waterproof pouches.",
            "Follow designated local evacuation routes to flood shelters."
        ],
        "donts": [
            "Do not walk or drive through moving flood water.",
            "Do not consume food items that came in direct contact with flood water.",
            "Do not allow children to play near drainage canals or open manholes."
        ],
        "emergency_contacts": [
            {"label": "NDRF Rescue Helpline", "number": "9711077372"},
            {"label": "Disaster Response Unit", "number": "1070"}
        ]
    },
    "storm": {
        "dos": [
            "Seek shelter inside a sturdy building or enclosed metal vehicle.",
            "Unplug sensitive electronic appliances and televisions.",
            "Stay away from tall isolated trees, tin sheds, and metal fences."
        ],
        "donts": [
            "Never stand under tall trees during lightning activity.",
            "Do not use corded landline phones or shower during electrical storms."
        ],
        "emergency_contacts": [
            {"label": "Emergency Services", "number": "112"},
            {"label": "Fire & Rescue", "number": "101"}
        ]
    },
    "cold": {
        "dos": [
            "Wear multiple layers of loose, warm clothing instead of one thick layer.",
            "Protect elderly persons, young infants, and livestock from chilly winds.",
            "Consume warm soups, herbal tea, and nutritious calorie-dense meals."
        ],
        "donts": [
            "Do not keep coal/wood braziers (angithi) burning in closed rooms without ventilation.",
            "Avoid prolonged outdoor exposure during early morning dense fog."
        ],
        "emergency_contacts": [
            {"label": "Citizen Helpline", "number": "112"}
        ]
    },
    "general": {
        "dos": [
            "Monitor live weather updates on WeatherGPT before planning travel.",
            "Carry an umbrella or rain poncho during monsoon conditions.",
            "Keep local emergency numbers saved on speed dial."
        ],
        "donts": [
            "Do not ignore severe weather color codes (Orange / Red alert).",
            "Avoid panic buying; keep moderate essential reserves."
        ],
        "emergency_contacts": [
            {"label": "National Emergency Helpline", "number": "112"}
        ]
    }
}

# Pre-translated strings for common UI elements
TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "hi": {
        "weather_intelligence": "मौसम बुद्धिमत्ता",
        "feels_like": "महसूस",
        "humidity": "आर्द्रता",
        "wind": "हवा की गति",
        "uv_index": "यूवी सूचकांक",
        "aqi": "वायु गुणवत्ता",
        "forecast_7day": "7-दिवसीय पूर्वानुमान",
        "profession_advisory": "व्यावसायिक सलाह",
        "disaster_alerts": "आपदा चेतावनी",
        "research_metrics": "जलवायु अनुसंधान",
        "search_placeholder": "मौसम या फसल के बारे में कुछ भी पूछें...",
        "stale_notice": "पिछला ज्ञात डेटा दिखाया जा रहा है",
    },
    "ta": {
        "weather_intelligence": "வானிலை நுண்ணறிவு",
        "feels_like": "உணர்வது",
        "humidity": "ஈரப்பதம்",
        "wind": "காற்றின் வேகம்",
        "uv_index": "UV குறியீடு",
        "aqi": "காற்று தரம்",
        "forecast_7day": "7 நாள் முன்னறிவிப்பு",
        "profession_advisory": "தொழில்சார் ஆலோசனை",
        "disaster_alerts": "பேரிடர் எச்சரிக்கைகள்",
        "research_metrics": "காலநிலை ஆராய்ச்சி",
        "search_placeholder": "வானிலை அல்லது பயிர்கள் பற்றி கேளுங்கள்...",
        "stale_notice": "கடைசியாக அறியப்பட்ட தரவு காட்டப்படுகிறது",
    },
    "te": {
        "weather_intelligence": "వాతావరణ మేధస్సు",
        "feels_like": "అనిపిస్తుంది",
        "humidity": "తేమ",
        "wind": "గాలి వేగం",
        "uv_index": "UV సూచిక",
        "aqi": "గాలి నాణ్యత",
        "forecast_7day": "7 రోజుల సూచన",
        "profession_advisory": "వృత్తి సలహా",
        "disaster_alerts": "విపత్తు హెచ్చరికలు",
        "research_metrics": "వాతావరణ పరిశోధన",
        "search_placeholder": "వాతావరణం లేదా పంటల గురించి అడగండి...",
        "stale_notice": "చివరి తెలిసిన డేటా చూపబడుతోంది",
    },
    "bn": {
        "weather_intelligence": "আবহাওয়া গোয়েন্দা",
        "feels_like": "অনুভূত",
        "humidity": "আর্দ্রতা",
        "wind": "বাতাসের গতি",
        "uv_index": "ইউভি সূচক",
        "aqi": "বায়ুর মান",
        "forecast_7day": "৭ দিনের পূর্বাভাস",
        "profession_advisory": "পেশাগত পরামর্শ",
        "disaster_alerts": "দুর্যোগ সতর্কতা",
        "research_metrics": "জলবায়ু গবেষণা",
        "search_placeholder": "আবহাওয়া বা ফসল সম্পর্কে জিজ্ঞাসা করুন...",
        "stale_notice": "সর্বশেষ পরিচিত তথ্য প্রদর্শিত হচ্ছে",
    },
    "mr": {
        "weather_intelligence": "हवामान बुद्धिमत्ता",
        "feels_like": "जाणवणारे तापमान",
        "humidity": "आर्द्रता",
        "wind": "वाऱ्याचा वेग",
        "uv_index": "यूव्ही निर्देशांक",
        "aqi": "हवेची गुणवत्ता",
        "forecast_7day": "७ दिवसांचा अंदाज",
        "profession_advisory": "व्यावसायिक सल्ला",
        "disaster_alerts": "आपत्ती सूचना",
        "research_metrics": "हवामान संशोधन",
        "search_placeholder": "हवामान किंवा पिकांबद्दल विचारा...",
        "stale_notice": "शेवटचा उपलब्ध डेटा दाखवत आहे",
    },
    "gu": {
        "weather_intelligence": "હવામાન બુદ્ધિ",
        "feels_like": "અનુભવાય છે",
        "humidity": "ભેજ",
        "wind": "પવનની ગતિ",
        "uv_index": "યુવી ઇન્ડેક્સ",
        "aqi": "હવાની ગુણવત્તા",
        "forecast_7day": "૭ દિવસની આગાહી",
        "profession_advisory": "વ્યવસાયિક સલાહ",
        "disaster_alerts": "હોનારત ચેતવણી",
        "research_metrics": "હવામાન સંશોધન",
        "search_placeholder": "હવામાન અથવા પાક વિશે પૂછો...",
        "stale_notice": "છેલ્લો ઉપલબ્ધ ડેટા બતાવી રહ્યું છે",
    },
    "kn": {
        "weather_intelligence": "ಹವಾಮಾನ ಬುದ್ಧಿಮತ್ತೆ",
        "feels_like": "ಅನಿಸುತ್ತದೆ",
        "humidity": "ತೇವಾಂಶ",
        "wind": "ಗಾಳಿಯ ವೇಗ",
        "uv_index": "ಯುವಿ ಸೂಚ್ಯಂಕ",
        "aqi": "ಗಾಳಿಯ ಗುಣಮಟ್ಟ",
        "forecast_7day": "೭ ದಿನಗಳ ಮುನ್ಸೂಚನೆ",
        "profession_advisory": "ವೃತ್ತಿ ಸಲಹೆ",
        "disaster_alerts": "ವಿಪತ್ತು ಎಚ್ಚರಿಕೆಗಳು",
        "research_metrics": "ಹವಾಮಾನ ಸಂಶೋಧನೆ",
        "search_placeholder": "ಹವಾಮಾನ ಅಥವಾ ಬೆಳೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...",
        "stale_notice": "ಕೊನೆಯ ತಿಳಿದಿರುವ ಡೇಟಾ ತೋರಿಸಲಾಗುತ್ತಿದೆ",
    },
    "ml": {
        "weather_intelligence": "കാലാവസ്ഥാ ബുദ്ധി",
        "feels_like": "അനുഭവപ്പെടുന്നത്",
        "humidity": "ഈർപ്പം",
        "wind": "കാറ്റിന്റെ വേഗത",
        "uv_index": "യുവി സൂചിക",
        "aqi": "വായുവിന്റെ ഗുണനിലവാരം",
        "forecast_7day": "7 ദിവസത്തെ പ്രവചനം",
        "profession_advisory": "തൊഴിൽ ഉപദേശം",
        "disaster_alerts": "ദുരന്ത മുന്നറിയിപ്പുകൾ",
        "research_metrics": "കാലാവസ്ഥാ ഗവേഷണം",
        "search_placeholder": "കാലാവസ്ഥയെക്കുറിച്ചോ വിളകളെക്കുറിച്ചോ ചോദിക്കുക...",
        "stale_notice": "അവസാനം ലഭ്യമായ വിവരങ്ങൾ കാണിക്കുന്നു",
    },
    "pa": {
        "weather_intelligence": "ਮੌਸਮ ਬੁੱਧੀਮਤਾ",
        "feels_like": "ਮਹਿਸੂਸ ਹੁੰਦਾ ਹੈ",
        "humidity": "ਨਮੀ",
        "wind": "ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ",
        "uv_index": "ਯੂਵੀ ਇੰਡੈਕਸ",
        "aqi": "ਹਵਾ ਦੀ ਗੁਣਵੱਤਾ",
        "forecast_7day": "7-ਦਿਨਾਂ ਦਾ ਪੂਰਵ ਅਨੁਮਾਨ",
        "profession_advisory": "ਕਿੱਤਾਮੁਖੀ ਸਲਾਹ",
        "disaster_alerts": "ਆਫ਼ਤ ਚੇਤਾਵਨੀਆਂ",
        "research_metrics": "ਜਲਵਾਯੂ ਖੋਜ",
        "search_placeholder": "ਮੌਸਮ ਜਾਂ ਫ਼ਸਲਾਂ ਬਾਰੇ ਪੁੱਛੋ...",
        "stale_notice": "ਆਖ਼ਰੀ ਜਾਣਿਆ ਡੇਟਾ ਦਿਖਾਇਆ ਜਾ ਰਿਹਾ ਹੈ",
    },
    "or": {
        "weather_intelligence": "ପାଣିପାଗ ବୁଦ୍ଧିମତ୍ତା",
        "feels_like": "ଅନୁଭୂତ",
        "humidity": "ଆର୍ଦ୍ରତା",
        "wind": "ପବନର ବେଗ",
        "uv_index": "ୟୁଭି ସୂଚକାଙ୍କ",
        "aqi": "ବାୟୁ ମାନ",
        "forecast_7day": "୭-ଦିନର ପୂର୍ବାନୁମାନ",
        "profession_advisory": "ବୃତ୍ତିଗତ ପରାମର୍ଶ",
        "disaster_alerts": "ବିପର୍ଯ୍ୟୟ ଚେତାବନୀ",
        "research_metrics": "ଜଳବାୟୁ ଗବେଷଣା",
        "search_placeholder": "ପାଣିପାଗ କିମ୍ବା ଫସଲ ବିଷୟରେ ପଚାରନ୍ତୁ...",
        "stale_notice": "ଶେଷ ଉପଲବ୍ଧ ତଥ୍ୟ ପ୍ରଦର୍ଶିତ ହେଉଛି",
    },
    "as": {
        "weather_intelligence": "বতৰ বুদ্ধিমত্তা",
        "feels_like": "অনুভৱ হোৱা",
        "humidity": "আৰ্দ্ৰতা",
        "wind": "বতাহৰ গতি",
        "uv_index": "ইউভি সূচক",
        "aqi": "বায়ুৰ গুণমান",
        "forecast_7day": "৭ দিনৰ পূৰ্বাভাস",
        "profession_advisory": "পেছাদাৰী পৰামৰ্শ",
        "disaster_alerts": "দুৰ্যোগৰ সতৰ্কবাৰ্তা",
        "research_metrics": "জলবায়ু গৱেষণা",
        "search_placeholder": "বতৰ বা শস্যৰ বিষয়ে সোধক...",
        "stale_notice": "সৰ্বশেষ উপলব্ধ তথ্য প্ৰদৰ্শন কৰা হৈছে",
    },
    "ur": {
        "weather_intelligence": "موسمیاتی ذہانت",
        "feels_like": "محسوس ہوتا ہے",
        "humidity": "نمی",
        "wind": "ہوا کی رفتار",
        "uv_index": "یو وی انڈیکس",
        "aqi": "ہوا کا معیار",
        "forecast_7day": "7 دن کی پیشین گوئی",
        "profession_advisory": "پیشہ ورانہ مشورہ",
        "disaster_alerts": "آفات کی وارننگ",
        "research_metrics": "آب و ہوا کی تحقیق",
        "search_placeholder": "موسم یا فصلوں کے بارے में پوچھیں...",
        "stale_notice": "آخری دستیاب ڈیٹا دکھایا جا رہا ہے",
    },
    "en": {
        "weather_intelligence": "Weather Intelligence",
        "feels_like": "Feels Like",
        "humidity": "Humidity",
        "wind": "Wind Speed",
        "uv_index": "UV Index",
        "aqi": "Air Quality",
        "forecast_7day": "7-Day Forecast",
        "profession_advisory": "Profession Advisory",
        "disaster_alerts": "Disaster Alerts",
        "research_metrics": "Climate Research",
        "search_placeholder": "Ask anything about weather, crops, or sea conditions...",
        "stale_notice": "Showing last known data",
    }
}

class TranslationService:
    @staticmethod
    def get_supported_languages() -> List[Dict[str, str]]:
        return [{"code": k, **v} for k, v in SUPPORTED_LANGUAGES.items()]

    @staticmethod
    def get_language_name(code: str) -> str:
        return SUPPORTED_LANGUAGES.get(code, SUPPORTED_LANGUAGES["en"])["name"]

    @staticmethod
    def get_precautions(alert_type: str) -> Dict[str, Any]:
        return PRECAUTIONS_BY_TYPE.get(alert_type.lower(), PRECAUTIONS_BY_TYPE["general"])

    @staticmethod
    def get_ui_text(lang_code: str, key: str, default: str = "") -> str:
        lang_dict = TRANSLATIONS.get(lang_code, TRANSLATIONS["en"])
        return lang_dict.get(key, TRANSLATIONS["en"].get(key, default))

translation_service = TranslationService()
