import httpx
import time

def run_suite():
    tests = []

    # 1. Health
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/health')
        tests.append(('1. Health Check', r.status_code == 200, str(r.json())))

    # 2. Onboarding & Token
    with httpx.Client(timeout=10.0) as client:
        r = client.post('http://127.0.0.1:8000/api/onboarding', json={
            'device_id': 'test_dev_001',
            'language_code': 'ta',
            'profession': 'farmer',
            'city': 'Chennai',
            'lat': 13.0827,
            'lon': 80.2707
        })
        token = r.json().get('access_token', '')
        headers = {'Authorization': f'Bearer {token}'}
        tests.append(('2. Onboarding & JWT Auth', r.status_code == 200 and len(token) > 10, 'JWT Token Issued'))

    # 3. Current Weather
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/weather/current?lat=13.0827&lon=80.2707&city=Chennai', headers=headers)
        data = r.json()
        tests.append(('3. Current Weather API', r.status_code == 200, f"{data.get('city')}: {data.get('temperature')}C, {data.get('condition')}"))

    # 4. Forecast 7 Days
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/weather/forecast?lat=13.0827&lon=80.2707&days=7', headers=headers)
        data = r.json()
        tests.append(('4. 7-Day Forecast API', r.status_code == 200 and len(data.get('daily', [])) == 7, f"{len(data.get('daily', []))} daily forecast days"))

    # 5. Map Radar Metadata
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/weather/map?lat=13.0827&lon=80.2707', headers=headers)
        data = r.json()
        tests.append(('5. Weather Map Layers API', r.status_code == 200, f"Precip Rate: {data.get('precipitation_rate')} mm"))

    # 6. Geocoding Search
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/weather/search?query=Chennai')
        data = r.json()
        tests.append(('6. Geocoding Location Search', r.status_code == 200 and len(data) > 0, f"{len(data)} locations matched"))

    # 7. AI Chat Query (English)
    with httpx.Client(timeout=10.0) as client:
        r = client.post('http://127.0.0.1:8000/api/chat/query', json={
            'text': 'Will it rain tomorrow in Chennai?',
            'city': 'Chennai',
            'lat': 13.0827,
            'lon': 80.2707,
            'lang': 'en',
            'profession': 'farmer'
        }, headers=headers)
        data = r.json()
        tests.append(('7. AI Chat (English - LLM)', r.status_code == 200, f"Provider: {data.get('provider_used')}"))

    # 8. AI Chat Query (Tamil / Tanglish)
    with httpx.Client(timeout=10.0) as client:
        r = client.post('http://127.0.0.1:8000/api/chat/query', json={
            'text': 'naalikku malai varumaa',
            'city': 'Chennai',
            'lat': 13.0827,
            'lon': 80.2707,
            'lang': 'ta',
            'profession': 'farmer'
        }, headers=headers)
        data = r.json()
        tests.append(('8. AI Chat (Tamil/Tanglish - LLM)', r.status_code == 200, f"Provider: {data.get('provider_used')}"))

    # 9. Profession Advisory
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/advisory?profession=farmer&lat=13.0827&lon=80.2707&lang=en', headers=headers)
        data = r.json()
        tests.append(('9. Farmer Advisory API', r.status_code == 200 and len(data.get('topics', [])) > 0, f"{len(data.get('topics', []))} topics"))

    # 10. Active Disaster Alerts
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/alerts/active?lat=13.0827&lon=80.2707', headers=headers)
        data = r.json()
        tests.append(('10. Disaster Alerts Engine', r.status_code == 200, f"Alert count: {data.get('count')}"))

    # 11. Alert Precautions
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/alerts/mock_1/precautions?alert_type=cyclone&severity=warning', headers=headers)
        data = r.json()
        tests.append(('11. Disaster Precautions API', r.status_code == 200, f"{len(data.get('dos', []))} Dos, {len(data.get('donts', []))} Donts"))

    # 12. Research Metrics
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/research/metrics?category=agricultural&lat=13.0827&lon=80.2707', headers=headers)
        data = r.json()
        tests.append(('12. Research Climate Metrics', r.status_code == 200, f"{len(data.get('metrics', []))} metrics"))

    # 13. Historical Climate Data
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/research/historical?lat=13.0827&lon=80.2707&start_date=2026-08-01&end_date=2026-08-27', headers=headers)
        data = r.json()
        tests.append(('13. Historical Archive Trends', r.status_code == 200 and len(data.get('data', [])) > 0, f"{len(data.get('data', []))} data records"))

    # 14. User Settings
    with httpx.Client(timeout=10.0) as client:
        r = client.get('http://127.0.0.1:8000/api/settings', headers=headers)
        data = r.json()
        tests.append(('14. User Settings & Theme API', r.status_code == 200, f"Theme: {data.get('theme')}"))

    print('\n' + '='*80)
    print(f"{'WEATHERGPT SYSTEM INTEGRITY & WORKING REPORT':^80}")
    print('='*80)
    all_pass = True
    for name, passed, details in tests:
        status = '  [PASS]' if passed else '  [FAIL]'
        if not passed:
            all_pass = False
        print(f"{status}  {name:<36} | {details}")
    print('-'*80)
    print(f"{'>>> ALL 14 CORE MODULES & APIS ARE 100% OPERATIONAL <<<' if all_pass else '>>> ISSUES DETECTED <<<'}")
    print('='*80 + '\n')

if __name__ == '__main__':
    run_suite()
