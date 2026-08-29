import axios from 'axios';
import {
  CurrentWeather,
  ForecastResponse,
  ActiveAlertsResponse,
  AdvisoryResponse,
  ResearchMetricsResponse,
  HistoricalResponse,
  UserSettings
} from '../types';

const API_BASE = '/api';

// --- In-Memory Fast Cache & Deduplication ---
const memoryCache = new Map<string, { data: any; expiry: number }>();
const inFlightRequests = new Map<string, Promise<any>>();

const getCachedData = (key: string) => {
  const item = memoryCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  // Try sessionStorage
  try {
    const raw = sessionStorage.getItem(`cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.expiry > Date.now()) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    }
  } catch {}
  return null;
};

const setCachedData = (key: string, data: any, ttlMs: number = 300000) => {
  const item = { data, expiry: Date.now() + ttlMs };
  memoryCache.set(key, item);
  try {
    sessionStorage.setItem(`cache_${key}`, JSON.stringify(item));
  } catch {}
};

// Deduplicated Fetch Wrapper
const deduplicatedFetch = async <T>(key: string, fetcher: () => Promise<T>, ttlMs = 300000): Promise<T> => {
  const cached = getCachedData(key);
  if (cached) {
    return cached as T;
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      setCachedData(key, data, ttlMs);
      inFlightRequests.delete(key);
      return data;
    })
    .catch((err) => {
      inFlightRequests.delete(key);
      throw err;
    });

  inFlightRequests.set(key, promise);
  return promise;
};

// Persistence helpers
export const getStoredDeviceId = (): string => {
  let id = localStorage.getItem('weathergpt_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('weathergpt_device_id', id);
  }
  return id;
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem('weathergpt_jwt_token');
};

export const setStoredToken = (token: string) => {
  localStorage.setItem('weathergpt_jwt_token', token);
};

export const getStoredLanguage = (): string => {
  return localStorage.getItem('weathergpt_lang') || 'en';
};

export const setStoredLanguage = (lang: string) => {
  localStorage.setItem('weathergpt_lang', lang);
};

export const getStoredProfession = (): string => {
  return localStorage.getItem('weathergpt_profession') || 'general';
};

export const setStoredProfession = (prof: string) => {
  localStorage.setItem('weathergpt_profession', prof);
};

export const isOnboardingCompleted = (): boolean => {
  return localStorage.getItem('weathergpt_onboarding_done') === 'true';
};

export const setOnboardingCompleted = (done: boolean) => {
  localStorage.setItem('weathergpt_onboarding_done', done ? 'true' : 'false');
};

// Axios instance with JWT interceptor
export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  onboarding: async (data: { device_id: string; language_code: string; profession: string; city?: string; lat?: number; lon?: number }) => {
    const res = await apiClient.post('/onboarding', data);
    return res.data;
  },

  getCurrentWeather: async (lat: number, lon: number, city?: string): Promise<CurrentWeather> => {
    const key = `weather_curr_${lat.toFixed(3)}_${lon.toFixed(3)}_${city || ''}`;
    return deduplicatedFetch<CurrentWeather>(key, async () => {
      const res = await apiClient.get<CurrentWeather>('/weather/current', {
        params: { lat, lon, city }
      });
      return res.data;
    }, 180000); // 3 min cache
  },

  getForecast: async (lat: number, lon: number, days = 7): Promise<ForecastResponse> => {
    const key = `weather_forecast_${lat.toFixed(3)}_${lon.toFixed(3)}_${days}`;
    return deduplicatedFetch<ForecastResponse>(key, async () => {
      const res = await apiClient.get<ForecastResponse>('/weather/forecast', {
        params: { lat, lon, days }
      });
      return res.data;
    }, 300000); // 5 min cache
  },

  getWeatherMap: async (lat: number, lon: number) => {
    const res = await apiClient.get('/weather/map', { params: { lat, lon } });
    return res.data;
  },

  searchLocation: async (query: string) => {
    const key = `geo_${query.toLowerCase().trim()}`;
    return deduplicatedFetch(key, async () => {
      const res = await apiClient.get('/weather/search', { params: { query } });
      return res.data;
    }, 86400000);
  },

  chatQuery: async (data: { text: string; lang?: string; lat?: number; lon?: number; city?: string; profession?: string }) => {
    const res = await apiClient.post('/chat/query', data);
    return res.data;
  },

  getAdvisory: async (profession: string, lat: number, lon: number, lang: string = 'en'): Promise<AdvisoryResponse> => {
    const key = `advisory_${profession}_${lat.toFixed(3)}_${lon.toFixed(3)}_${lang}`;
    return deduplicatedFetch<AdvisoryResponse>(key, async () => {
      const res = await apiClient.get<AdvisoryResponse>('/advisory', {
        params: { profession, lat, lon, lang }
      });
      return res.data;
    }, 300000);
  },

  getActiveAlerts: async (lat: number, lon: number, lang: string = 'en'): Promise<ActiveAlertsResponse> => {
    const key = `alerts_${lat.toFixed(3)}_${lon.toFixed(3)}_${lang}`;
    return deduplicatedFetch<ActiveAlertsResponse>(key, async () => {
      const res = await apiClient.get<ActiveAlertsResponse>('/alerts/active', {
        params: { lat, lon, lang }
      });
      return res.data;
    }, 180000);
  },

  getAlertPrecautions: async (alertId: string, alertType?: string, severity?: string, lang: string = 'en') => {
    const key = `precautions_${alertId}_${alertType}_${severity}_${lang}`;
    return deduplicatedFetch(key, async () => {
      const res = await apiClient.get(`/alerts/${alertId}/precautions`, {
        params: { alert_type: alertType, severity, lang }
      });
      return res.data;
    }, 600000);
  },

  getResearchMetrics: async (category: string, lat: number, lon: number, lang: string = 'en'): Promise<ResearchMetricsResponse> => {
    const key = `research_metrics_${category}_${lat.toFixed(3)}_${lon.toFixed(3)}_${lang}`;
    return deduplicatedFetch<ResearchMetricsResponse>(key, async () => {
      const res = await apiClient.get<ResearchMetricsResponse>('/research/metrics', {
        params: { category, lat, lon, lang }
      });
      return res.data;
    }, 300000);
  },

  getHistorical: async (lat: number, lon: number, startDate?: string, endDate?: string): Promise<HistoricalResponse> => {
    const key = `historical_${lat.toFixed(3)}_${lon.toFixed(3)}_${startDate}_${endDate}`;
    return deduplicatedFetch<HistoricalResponse>(key, async () => {
      const res = await apiClient.get<HistoricalResponse>('/research/historical', {
        params: { lat, lon, start_date: startDate, end_date: endDate }
      });
      return res.data;
    }, 86400000);
  },

  getSettings: async (): Promise<UserSettings> => {
    const res = await apiClient.get<UserSettings>('/settings');
    return res.data;
  },

  updateSettings: async (settings: Partial<UserSettings>): Promise<UserSettings> => {
    const res = await apiClient.put<UserSettings>('/settings', settings);
    return res.data;
  },

  getLocations: async () => {
    const res = await apiClient.get('/locations');
    return res.data;
  },

  addLocation: async (loc: { label: string; lat: number; lon: number; is_default?: boolean }) => {
    const res = await apiClient.post('/locations', loc);
    return res.data;
  },

  deleteLocation: async (locationId: string) => {
    const res = await apiClient.delete(`/locations/${locationId}`);
    return res.data;
  }
};
