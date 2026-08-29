import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.auth import create_access_token

@pytest.mark.asyncio
async def test_health_and_root():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        root_res = await ac.get("/")
        assert root_res.status_code == 200
        assert "WeatherGPT" in root_res.json()["app"]

@pytest.mark.asyncio
async def test_onboarding_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "device_id": "test_device_uuid_999",
            "language_code": "hi",
            "profession": "farmer",
            "city": "Chennai",
            "lat": 13.0827,
            "lon": 80.2707
        }
        res = await ac.post("/api/onboarding", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["profession"] == "farmer"
        assert data["user"]["language_code"] == "hi"

@pytest.mark.asyncio
async def test_weather_endpoints():
    transport = ASGITransport(app=app)
    token = create_access_token({"sub": "test_user", "device_id": "test_device", "profession": "farmer"})
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Current Weather
        res = await ac.get("/api/weather/current?lat=28.6139&lon=77.2090", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "temperature" in data
        assert "feels_like" in data
        assert "humidity" in data
        assert "wind_speed" in data
        assert "condition" in data

        # Forecast
        f_res = await ac.get("/api/weather/forecast?lat=28.6139&lon=77.2090&days=7", headers=headers)
        assert f_res.status_code == 200
        f_data = f_res.json()
        assert "daily" in f_data
        assert len(f_data["daily"]) > 0

@pytest.mark.asyncio
async def test_chat_query():
    transport = ASGITransport(app=app)
    token = create_access_token({"sub": "test_user", "device_id": "test_device", "profession": "farmer", "language_code": "en"})
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        query_payload = {
            "text": "Will it rain tomorrow for my crops?",
            "lang": "en",
            "lat": 13.0827,
            "lon": 80.2707,
            "profession": "farmer"
        }
        res = await ac.post("/api/chat/query", json=query_payload, headers=headers)
        assert res.status_code == 200
        c_data = res.json()
        assert "answer" in c_data
        assert c_data["intent"] in ["profession_advisory", "forecast_query", "current_weather", "general_weather_chat"]
        assert len(c_data["answer"]) > 10

@pytest.mark.asyncio
async def test_advisory_and_alerts():
    transport = ASGITransport(app=app)
    token = create_access_token({"sub": "test_user", "device_id": "test_device", "profession": "fisherman"})
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Advisory
        adv_res = await ac.get("/api/advisory?profession=fisherman&lat=13.0827&lon=80.2707", headers=headers)
        assert adv_res.status_code == 200
        adv_data = adv_res.json()
        assert "topics" in adv_data
        assert len(adv_data["topics"]) > 0

        # Alerts
        alert_res = await ac.get("/api/alerts/active?lat=13.0827&lon=80.2707", headers=headers)
        assert alert_res.status_code == 200
        alert_data = alert_res.json()
        assert "alerts" in alert_data

        # Research Metrics
        res_met = await ac.get("/api/research/metrics?category=atmospheric&lat=13.0827&lon=80.2707", headers=headers)
        assert res_met.status_code == 200
        assert len(res_met.json()["metrics"]) > 0
