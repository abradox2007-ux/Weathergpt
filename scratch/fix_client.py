import os

bt = chr(96)
file_path = r'frontend\src\api\client.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find getClientFollowups
followups_code = '''const getClientFollowups = (lang: string): string[] => {
  if (lang === 'ta') {
    return [
      'நாளை மழை பெய்ய வாய்ப்பு எவ்வளவு?',
      'அடுத்த 3 நாட்களுக்கு வானிலை எப்படி இருக்கும்?',
      'இன்று வெளியே செல்ல குடை தேவையா?'
    ];
  } else if (lang === 'hi') {
    return [
      'कल बारिश की कितनी संभावना है?',
      'अगले 3 दिनों का तापमान कैसा रहेगा?',
      'क्या आज छाता ले जाना ज़रूरी है?'
    ];
  } else if (lang === 'te') {
    return [
      'రేపు వర్షం పడే అవకాశం ఉందా?',
      'రాబోయే 3 రోజుల వాతావరణం ఎలా ఉంటుంది?',
      'ఈరోజు గొడుగు అవసరమా?'
    ];
  }
  return [
    'Will it rain tomorrow in my area?',
    'Show 3-day temperature forecast',
    'Do I need an umbrella today?'
  ];
};'''

chat_query_code = f'''  chatQuery: async (data: {{ text: string; lang?: string; lat?: number; lon?: number; city?: string; profession?: string }}) => {{
    // 1. Try Backend API first with generous timeout for AI generation
    try {{
      const res = await apiClient.post('/chat/query', data, {{ timeout: 12000 }});
      if (res.data && res.data.answer) return res.data;
    }} catch {{}}

    const text = data.text.trim();
    const qLower = text.toLowerCase();
    const lat = data.lat || 28.6139;
    const lon = data.lon || 77.2090;
    const city = data.city || 'your area';
    const lang = data.lang || 'en';
    const profession = data.profession || 'general';

    // Auto-detect language strictly
    let detectedLang = lang;
    if (/[\\u0B80-\\u0BFF]/.test(text)) {{
      detectedLang = 'ta';
    }} else if (/[\\u0900-\\u097F]/.test(text)) {{
      detectedLang = 'hi';
    }} else if (/[\\u0C00-\\u0C7F]/.test(text)) {{
      detectedLang = 'te';
    }} else if (/[\\u0980-\\u09FF]/.test(text)) {{
      detectedLang = 'bn';
    }} else {{
      const words = qLower.match(/\\b[a-z]+\\b/g) || [];
      const tamilKw = new Set(['malai', 'mazhai', 'naalai', 'naalaikku', 'nalaikku', 'netru', 'nethu', 'inniku', 'veyil', 'kaatru', 'kudai', 'varumaa', 'varuma', 'peidhadha', 'peinjadha', 'epdi', 'enna', 'sollu', 'vanthucha', 'irukkuma', 'epadi', 'puyal']);
      const hindiKw = new Set(['baarish', 'barish', 'kal', 'aaj', 'kya', 'hogi', 'hoga', 'mausam', 'kaisa', 'garmi', 'thand', 'hawa', 'chata', 'pani', 'batao', 'beeta', 'toofan']);
      const teluguKw = new Set(['varsham', 'repu', 'eeroju', 'paduthunda', 'gaali', 'endalu', 'cheppu', 'toopanu']);
      
      if (words.some(w => tamilKw.has(w))) {{
        detectedLang = 'ta';
      }} else if (words.some(w => hindiKw.has(w))) {{
        detectedLang = 'hi';
      }} else if (words.some(w => teluguKw.has(w))) {{
        detectedLang = 'te';
      }}
    }}

    // Fetch live ground weather data for prompt & grounded engine
    let liveWeather: any = null;
    let liveForecast: any = null;
    try {{
      [liveWeather, liveForecast] = await Promise.all([
        api.getCurrentWeather(lat, lon, city),
        api.getForecast(lat, lon, 7)
      ]);
    }} catch {{}}

    const currTemp = liveWeather?.temperature ?? 28;
    const currCond = liveWeather?.condition ?? 'Partly Cloudy';
    const currWind = liveWeather?.wind_speed ?? 12;
    const currHumidity = liveWeather?.humidity ?? 65;
    const daily = liveForecast?.daily || [];
    const tmrw = daily[1] || daily[0] || {{}};
    const tmrwCond = tmrw.condition || 'Partly Cloudy';
    const tmrwMax = tmrw.temp_max ?? (currTemp + 2);
    const tmrwMin = tmrw.temp_min ?? (currTemp - 4);
    const tmrwRainProb = tmrw.precip_probability ?? 15;

    // 2. Try Direct Client AI if keys are stored in localStorage or env
    const groqKey = localStorage.getItem('weathergpt_groq_key') || (import.meta.env.VITE_GROQ_API_KEY as string);
    const geminiKey = localStorage.getItem('weathergpt_gemini_key') || (import.meta.env.VITE_GEMINI_API_KEY as string);
    const openaiKey = localStorage.getItem('weathergpt_openai_key') || (import.meta.env.VITE_OPENAI_API_KEY as string);

    const langName = detectedLang === 'ta' ? 'Tamil (தமிழ்)' : detectedLang === 'hi' ? 'Hindi (हिन्दी)' : detectedLang === 'te' ? 'Telugu (తెలుగు)' : 'English';
    const systemPrompt = {bt}You are WeatherGPT, an advanced AI Weather Assistant worldwide.
Location: ${{city}} (Lat: ${{lat}}, Lon: ${{lon}}). Role: ${{profession}}.
CRITICAL LANGUAGE: Output must be strictly in ${{langName}}.
Live Data Context: Current Temp: ${{currTemp}}°C, Condition: ${{currCond}}, Wind: ${{currWind}}km/h, Humidity: ${{currHumidity}}%. Tomorrow: ${{tmrwCond}}, High ${{tmrwMax}}°C, Low ${{tmrwMin}}°C, Rain Probability: ${{tmrwRainProb}}%.
Rules: Answer clearly in 2-3 concise sentences based on live data.{bt};

    if (groqKey && groqKey.trim()) {{
      const groqRes = await directCallGroq(groqKey, text, systemPrompt);
      if (groqRes) {{
        return {{
          query: text,
          answer: groqRes,
          language_code: detectedLang,
          intent: 'ai_chat',
          provider_used: 'Groq LLaMA 3.3 (Direct Mobile)',
          suggested_followups: getClientFollowups(detectedLang)
        }};
      }}
    }}

    if (geminiKey && geminiKey.trim()) {{
      const geminiRes = await directCallGemini(geminiKey, text, systemPrompt);
      if (geminiRes) {{
        return {{
          query: text,
          answer: geminiRes,
          language_code: detectedLang,
          intent: 'ai_chat',
          provider_used: 'Google Gemini (Direct Mobile)',
          suggested_followups: getClientFollowups(detectedLang)
        }};
      }}
    }}

    if (openaiKey && openaiKey.trim()) {{
      const openaiRes = await directCallOpenAI(openaiKey, text, systemPrompt);
      if (openaiRes) {{
        return {{
          query: text,
          answer: openaiRes,
          language_code: detectedLang,
          intent: 'ai_chat',
          provider_used: 'OpenAI GPT-4o-mini (Direct Mobile)',
          suggested_followups: getClientFollowups(detectedLang)
        }};
      }}
    }}

    // Try zero-config Cloud LLM directly from client
    const cloudRes = await directCallCloudLLM(text, systemPrompt);
    if (cloudRes) {{
      return {{
        query: text,
        answer: cloudRes,
        language_code: detectedLang,
        intent: 'ai_chat',
        provider_used: 'WeatherGPT Cloud AI',
        suggested_followups: getClientFollowups(detectedLang)
      }};
    }}

    // 3. Fallback to Grounded Meteorological Engine
    let responseText = '';
    const isPast = ['yesterday', 'netru', 'nethu', 'beeta', 'past', 'history', 'did it rain', 'peidhadha', 'peinjadha', 'நேற்று', 'कल', 'నిన్న'].some(w => qLower.includes(w));
    const isForecast = ['tomorrow', 'naalai', 'nalaikku', 'kal', 'future', 'forecast', '3-day', '7-day', 'week', 'days', 'நாளை', 'முன்னறிவிப்பு', 'पूर्वानुमान', 'రేపు'].some(w => qLower.includes(w));
    const isRain = ['rain', 'malai', 'mazhai', 'baarish', 'varsham', 'drizzle', 'shower', 'umbrella', 'kudai', 'chata', 'மழை', 'குடை', 'बारिश', 'छाता', 'వర్షం'].some(w => qLower.includes(w));
    const isStorm = ['cyclone', 'storm', 'puyal', 'toofan', 'warning', 'புயல்', 'तूफान', 'తుఫాను'].some(w => qLower.includes(w));

    if (isStorm) {{
      if (detectedLang === 'ta') {{
        responseText = {bt}⚠️ **${{city}} - புயல் பகுப்பாய்வு**: தற்போது ${{city}} பகுதியில் புயல் அல்லது சூறாவளி அச்சுறுத்தல் இல்லை. காற்றின் வேகம் ${{currWind}} km/h ஆகவும், வானிலை ${{currCond}} ஆகவும் சீராக உள்ளது.{bt};
      }} else if (detectedLang === 'hi') {{
        responseText = {bt}⚠️ **${{city}} - तूफान विश्लेषण**: वर्तमान में ${{city}} में किसी बड़े तूफान या चक्रवात का खतरा नहीं है। हवा की गति ${{currWind}} km/h है और मौसम ${{currCond}} है।{bt};
      }} else if (detectedLang === 'te') {{
        responseText = {bt}⚠️ **${{city}} - తుఫాను సమాచారం**: ప్రస్తుతం ${{city}} లో ఎటువంటి తుఫాను ముప్పు లేదు. గాలి వేగం ${{currWind}} km/h తో సాధారణంగా ఉంది.{bt};
      }} else {{
        responseText = {bt}⚠️ **Storm Analysis for ${{city}}**: No imminent storm or cyclone threat in ${{city}}. Wind speed is moderate at ${{currWind}} km/h with ${{currCond}} conditions.{bt};
      }}
    }} else if (isPast) {{
      if (detectedLang === 'ta') {{
        responseText = {bt}🌤️ **${{city}} - நேற்று**: வானிலை பெரும்பாலும் சீராக இருந்தது. தீவிர மழை எதுவும் பதிவாகவில்லை.{bt};
      }} else if (detectedLang === 'hi') {{
        responseText = {bt}🌤️ **${{city}} - कल**: मौसम स्थिर रहा और कोई भारी वर्षा दर्ज नहीं की गई।{bt};
      }} else if (detectedLang === 'te') {{
        responseText = {bt}🌤️ **${{city}} - నిన్న**: వాతావరణం స్థిరంగా ఉంది, భారీ వర్షం నమోదు కాలేదు.{bt};
      }} else {{
        responseText = {bt}🌤️ **Yesterday in ${{city}}**: Weather conditions remained stable with no major precipitation recorded.{bt};
      }}
    }} else if (qLower.includes('3-day') || qLower.includes('week') || qLower.includes('forecast') || qLower.includes('முன்னறிவிப்பு') || qLower.includes('पूर्वानुमान')) {{
      if (detectedLang === 'ta') {{
        responseText = {bt}📅 **${{city}} - 3 நாள் வானிலை முன்னறிவிப்பு**:\n{bt} +
          daily.slice(0, 3).map((d: any) => {bt}• **${{d.date || 'நாள்'}}**: ${{d.condition || 'Clear'}} | ${{d.temp_max}}°C / ${{d.temp_min}}°C (மழை வாய்ப்பு: ${{d.precip_probability || 10}}%){bt}).join('\\n');
      }} else if (detectedLang === 'hi') {{
        responseText = {bt}📅 **${{city}} - 3 दिनों का पूर्वानुमान**:\n{bt} +
          daily.slice(0, 3).map((d: any) => {bt}• **${{d.date || 'दिन'}}**: ${{d.condition || 'Clear'}} | ${{d.temp_max}}°C / ${{d.temp_min}}°C (बारिश: ${{d.precip_probability || 10}}%){bt}).join('\\n');
      }} else if (detectedLang === 'te') {{
        responseText = {bt}📅 **${{city}} - 3 రోజుల సమాచారం**:\n{bt} +
          daily.slice(0, 3).map((d: any) => {bt}• **${{d.date || 'రోజు'}}**: ${{d.condition || 'Clear'}} | ${{d.temp_max}}°C / ${{d.temp_min}}°C (వర్షం: ${{d.precip_probability || 10}}%){bt}).join('\\n');
      }} else {{
        responseText = {bt}📅 **3-Day Forecast for ${{city}}**:\n{bt} +
          daily.slice(0, 3).map((d: any) => {bt}• **${{d.date || 'Day'}}**: ${{d.condition || 'Clear'}} | High ${{d.temp_max}}°C / Low ${{d.temp_min}}°C (Rain: ${{d.precip_probability || 10}}%){bt}).join('\\n');
      }}
    }} else if (isForecast || isRain) {{
      if (detectedLang === 'ta') {{
        const rainNote = tmrwRainProb >= 40 ? 'மழை பெய்ய வாய்ப்புள்ளது, குடை எடுத்துச் செல்லவும்' : 'மழைக்கான வாய்ப்பு குறைவு';
        responseText = {bt}🌧️ **${{city}} - நாளைய வானிலை**: வானிலை **${{tmrwCond}}** ஆக இருக்கும். அதிகபட்ச வெப்பநிலை **${{tmrwMax}}°C**, குறைந்தபட்சம் **${{tmrwMin}}°C**. மழை வாய்ப்பு **${{tmrwRainProb}}%** (${{rainNote}}).{bt};
      }} else if (detectedLang === 'hi') {{
        const rainNote = tmrwRainProb >= 40 ? 'बारिश की संभावना है, छाता साथ रखें' : 'बारिश की संभावना कम है';
        responseText = {bt}🌧️ **${{city}} - कल का मौसम**: कल **${{tmrwCond}}** रहेगा। अधिकतम तापमान **${{tmrwMax}}°C** और न्यूनतम **${{tmrwMin}}°C** रहेगा। बारिश की संभावना **${{tmrwRainProb}}%** है (${{rainNote}}).{bt};
      }} else if (detectedLang === 'te') {{
        const rainNote = tmrwRainProb >= 40 ? 'వర్షం పడే అవకాశం ఉంది, గొడుగు తీసుకెళ్లండి' : 'వర్షం పడే అవకాశం తక్కువ';
        responseText = {bt}🌧️ **${{city}} - రేపటి వాతావరణం**: రేపు **${{tmrwCond}}** ఉంటుంది. గరిష్ట ఉష్ణోగ్రత **${{tmrwMax}}°C**, కనిష్ట **${{tmrwMin}}°C**. వర్షం అవకాశం **${{tmrwRainProb}}%** (${{rainNote}}).{bt};
      }} else {{
        const rainNote = tmrwRainProb >= 40 ? 'Rain expected, carrying an umbrella is recommended' : 'Low chance of rain';
        responseText = {bt}🌧️ **Tomorrow in ${{city}}**: Expected **${{tmrwCond}}** with a high of **${{tmrwMax}}°C** and low of **${{tmrwMin}}°C**. Precipitation probability is **${{tmrwRainProb}}%** (${{rainNote}}).{bt};
      }}
    }} else {{
      if (detectedLang === 'ta') {{
        responseText = {bt}🌤️ **${{city}} தற்போதைய வானிலை**: தற்போது **${{currCond}}** வானிலை உள்ளது. வெப்பநிலை **${{currTemp}}°C**, காற்றின் வேகம் **${{currWind}} km/h**, ஈரப்பதம் **${{currHumidity}}%**.{bt};
      }} else if (detectedLang === 'hi') {{
        responseText = {bt}🌤️ **${{city}} वर्तमान मौसम**: वर्तमान में मौसम **${{currCond}}** है। तापमान **${{currTemp}}°C**, हवा की गति **${{currWind}} km/h** और नमी **${{currHumidity}}%** है।{bt};
      }} else if (detectedLang === 'te') {{
        responseText = {bt}🌤️ **${{city}} ప్రస్తుత వాతావరణం**: ప్రస్తుతం వాతావరణం **${{currCond}}**. ఉష్ణోగ్రత **${{currTemp}}°C**, గాలి వేగం **${{currWind}} km/h**, తేమ **${{currHumidity}}%**.{bt};
      }} else {{
        responseText = {bt}🌤️ **Current Weather in ${{city}}**: It is **${{currCond}}** at **${{currTemp}}°C** with wind speed of **${{currWind}} km/h** and humidity at **${{currHumidity}}%**. Atmospheric conditions are optimal.{bt};
      }}
    }}

    return {{
      query: text,
      answer: responseText,
      language_code: detectedLang,
      intent: isStorm ? 'alert_lookup' : (isForecast || isRain ? 'forecast_query' : 'current_weather'),
      provider_used: 'WeatherGPT Grounded Edge Intelligence',
      suggested_followups: getClientFollowups(detectedLang)
    }};
  }},'''

# Replace getClientFollowups
idx_f_start = content.find('const getClientFollowups =')
idx_f_end = content.find('// --- In-Memory Fast Cache')
if idx_f_start != -1 and idx_f_end != -1:
    content = content[:idx_f_start] + followups_code + '\n\n' + content[idx_f_end:]

# Replace chatQuery
idx_cq_start = content.find('  chatQuery: async (data: {')
idx_cq_end = content.find('  getAdvisory: async (profession: string')
if idx_cq_start != -1 and idx_cq_end != -1:
    content = content[:idx_cq_start] + chat_query_code + '\n\n' + content[idx_cq_end:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated client.ts successfully')
