@echo off
echo Starting WeatherGPT Backend on http://127.0.0.1:8000 ...
set PYTHONPATH=backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
