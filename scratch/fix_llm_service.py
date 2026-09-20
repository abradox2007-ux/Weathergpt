import sys

file_path = r'backend\app\services\llm_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

old_classify = '''    def classify_intent(self, text: str) -> str:
        q = text.lower().strip()
        words = set(re.findall(r'\\b[a-z]+\\b', q))

        past_keywords = {
            "yesterday", "netru", "nethu", "beeta", "past", "history", "historical",
            "munnadi", "previous", "rained", "peidhadha", "peinjadha"
        }
        if (words.intersection(past_keywords) or
            any(w in q for w in ["நேற்று", "कल", "నిన్న", "did it rain", "was it raining", "last week"])):
            return "historical_research"'''

new_classify = '''    def classify_intent(self, text: str) -> str:
        q = text.lower().strip()
        words = set(re.findall(r'\\b[a-z]+\\b', q))

        # Check for past indicators first
        past_keywords = {
            "yesterday", "netru", "nethu", "beeta", "past", "history", "historical",
            "munnadi", "previous", "rained", "peidhadha", "peinjadha"
        }
        is_hindi_past = any(w in q for w in ["बीता", "बीते", "पिछला", "पिछले", "हुई थी", "हुआ था", "था", "थी"])
        if (words.intersection(past_keywords) or
            any(w in q for w in ["நேற்று", "నిన్న", "did it rain", "was it raining", "last week"]) or
            is_hindi_past):
            return "historical_research"'''

if old_classify in code:
    code = code.replace(old_classify, new_classify)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print('Updated classify_intent in llm_service.py successfully')
else:
    print('Pattern not matched directly, checking manually')
