import React, { useState, useEffect } from 'react';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProfessionScreen } from './screens/ProfessionScreen';
import { ResearchScreen } from './screens/ResearchScreen';
import { DisasterScreen } from './screens/DisasterScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { BottomNav, TabType } from './components/BottomNav';
import {
  api,
  isOnboardingCompleted,
  getStoredLanguage,
  getStoredProfession,
  setStoredProfession,
  setStoredLanguage,
  setOnboardingCompleted
} from './api/client';
import { CurrentWeather, ForecastResponse, AlertItem, UserSettings } from './types';

export const App: React.FC = () => {
  const [onboarded, setOnboarded] = useState<boolean>(isOnboardingCompleted());
  const [activeTab, setActiveTab] = useState<TabType>('home');
  
  // Stored or auto-detected live location
  const [city, setCity] = useState<string>(localStorage.getItem('weathergpt_city') || 'Detecting Location...');
  const [lat, setLat] = useState<number>(Number(localStorage.getItem('weathergpt_lat')) || 13.0827);
  const [lon, setLon] = useState<number>(Number(localStorage.getItem('weathergpt_lon')) || 80.2707);

  const [language, setLanguage] = useState<string>(getStoredLanguage());
  const [profession, setProfession] = useState<string>(getStoredProfession());

  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    unit_temp: 'celsius',
    unit_wind: 'kmh',
    unit_pressure: 'hPa',
    unit_precip: 'mm',
    unit_distance: 'km',
    theme: localStorage.getItem('weathergpt_theme') || 'system',
    notif_severe: true,
    notif_daily_digest: true,
    notif_realtime_precip: true,
    notif_status_bar: true,
    location_permission: true,
  });

  // --- High-Speed Multi-Tier Live Location Resolver ---
  const detectLiveLocation = async () => {
    let resolved = false;

    // 1. Try Instant Network IP Location (Fastest: < 100ms)
    try {
      const ipRes = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
      const ipData = await ipRes.json();
      if (ipData && (ipData.city || ipData.locality || ipData.principalSubdivision)) {
        const detectedCity = ipData.city || ipData.locality || ipData.principalSubdivision;
        const detectedLat = ipData.latitude || 13.0827;
        const detectedLon = ipData.longitude || 80.2707;
        
        setCity(detectedCity);
        setLat(detectedLat);
        setLon(detectedLon);
        localStorage.setItem('weathergpt_city', detectedCity);
        localStorage.setItem('weathergpt_lat', String(detectedLat));
        localStorage.setItem('weathergpt_lon', String(detectedLon));
        loadAllWeatherData(detectedLat, detectedLon, detectedCity);
        resolved = true;
      }
    } catch (e) {
      console.log('IP location fallback check:', e);
    }

    // 2. High-Accuracy Hardware GPS (Precise neighborhood coordinates)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const userLat = pos.coords.latitude;
          const userLon = pos.coords.longitude;
          setLat(userLat);
          setLon(userLon);
          localStorage.setItem('weathergpt_lat', String(userLat));
          localStorage.setItem('weathergpt_lon', String(userLon));

          try {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userLat}&longitude=${userLon}&localityLanguage=en`);
            const geoData = await geoRes.json();
            const detectedName = geoData.city || geoData.locality || geoData.principalSubdivision || 'My Area';
            setCity(detectedName);
            localStorage.setItem('weathergpt_city', detectedName);
            loadAllWeatherData(userLat, userLon, detectedName);
          } catch {
            const fallbackCity = 'My Area';
            setCity(fallbackCity);
            localStorage.setItem('weathergpt_city', fallbackCity);
            loadAllWeatherData(userLat, userLon, fallbackCity);
          }
        },
        (err) => {
          if (!resolved) {
            console.log('GPS skipped or permission pending:', err.message);
            // Default to Chennai if no location was resolved
            if (city === 'Detecting Location...') {
              setCity('Chennai');
              setLat(13.0827);
              setLon(80.2707);
              loadAllWeatherData(13.0827, 80.2707, 'Chennai');
            }
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else if (!resolved) {
      setCity('Chennai');
      setLat(13.0827);
      setLon(80.2707);
      loadAllWeatherData(13.0827, 80.2707, 'Chennai');
    }
  };

  useEffect(() => {
    detectLiveLocation();
  }, []);

  // --- Dynamic Theme Manager (System / Light / Dark) ---
  useEffect(() => {
    const applyTheme = () => {
      const selectedTheme = settings.theme || 'system';
      const root = document.documentElement;

      if (selectedTheme === 'dark') {
        root.classList.add('dark');
        document.body.className = 'bg-slate-950 text-slate-100 antialiased min-h-screen';
      } else if (selectedTheme === 'light') {
        root.classList.remove('dark');
        document.body.className = 'bg-gradient-to-br from-sky-50 via-slate-50 to-indigo-50/40 text-slate-900 antialiased min-h-screen';
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
          document.body.className = 'bg-slate-950 text-slate-100 antialiased min-h-screen';
        } else {
          root.classList.remove('dark');
          document.body.className = 'bg-gradient-to-br from-sky-50 via-slate-50 to-indigo-50/40 text-slate-900 antialiased min-h-screen';
        }
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if ((settings.theme || 'system') === 'system') {
        applyTheme();
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [settings.theme]);

  useEffect(() => {
    if (onboarded && lat && lon) {
      loadAllWeatherData(lat, lon, city);
      loadUserSettings();
    }
  }, [onboarded]);

  const loadAllWeatherData = async (latitude: number, longitude: number, cityName: string) => {
    try {
      const [currentRes, forecastRes, alertsRes] = await Promise.allSettled([
        api.getCurrentWeather(latitude, longitude, cityName),
        api.getForecast(latitude, longitude, 7),
        api.getActiveAlerts(latitude, longitude),
      ]);

      if (currentRes.status === 'fulfilled') {
        // Ensure the card displays the detected city name
        setWeather({ ...currentRes.value, city: cityName });
      }
      if (forecastRes.status === 'fulfilled') {
        setForecast(forecastRes.value);
      }
      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.alerts || []);
      }
    } catch (e) {
      console.error('Error fetching weather data:', e);
    }
  };

  const loadUserSettings = async () => {
    try {
      const s = await api.getSettings();
      if (s) {
        setSettings((prev) => ({ ...prev, ...s }));
        if (s.theme) {
          localStorage.setItem('weathergpt_theme', s.theme);
        }
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  const handleSelectCity = (newCity: string, newLat: number, newLon: number) => {
    setCity(newCity);
    setLat(newLat);
    setLon(newLon);
    localStorage.setItem('weathergpt_city', newCity);
    localStorage.setItem('weathergpt_lat', String(newLat));
    localStorage.setItem('weathergpt_lon', String(newLon));
    loadAllWeatherData(newLat, newLon, newCity);
  };

  const handleUpdateLanguage = (newLang: string) => {
    setLanguage(newLang);
    setStoredLanguage(newLang);
  };

  const handleUpdateProfession = (newProf: string) => {
    setProfession(newProf);
    setStoredProfession(newProf);
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (newSettings.theme) {
      localStorage.setItem('weathergpt_theme', newSettings.theme);
    }
  };

  const handleResetOnboarding = () => {
    setOnboardingCompleted(false);
    setOnboarded(false);
    setActiveTab('home');
  };

  if (!onboarded) {
    return (
      <OnboardingScreen
        onComplete={() => {
          setOnboarded(true);
          setLanguage(getStoredLanguage());
          setProfession(getStoredProfession());
          detectLiveLocation();
        }}
      />
    );
  }

  const hasSevereAlerts = alerts.some((a) => a.severity === 'warning' || a.severity === 'watch');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50/70 via-slate-50 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 selection:bg-sky-500 selection:text-white relative overflow-x-hidden">
      {/* Ambient background glows for rich aesthetic */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-sky-400/10 via-cyan-400/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-indigo-500/5 dark:bg-sky-500/5 blur-3xl pointer-events-none -z-10" />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto relative pb-28 md:pb-32 px-0 shadow-sm md:shadow-2xl md:border-x md:border-slate-200/80 md:dark:border-slate-800/80 min-h-screen bg-slate-50/50 dark:bg-slate-950/60 backdrop-blur-md">
        {activeTab === 'home' && (
          <HomeScreen
            currentCity={city}
            currentLat={lat}
            currentLon={lon}
            profession={profession}
            language={language}
            weather={weather}
            forecast={forecast}
            alerts={alerts}
            settings={settings}
            onSelectCity={handleSelectCity}
            onTriggerGPS={detectLiveLocation}
            onNavigateToDisaster={() => setActiveTab('disaster')}
          />
        )}

        {activeTab === 'profession' && (
          <ProfessionScreen
            currentProfession={profession}
            currentLat={lat}
            currentLon={lon}
            currentCity={city}
            language={language}
            onUpdateProfession={handleUpdateProfession}
          />
        )}

        {activeTab === 'research' && (
          <ResearchScreen
            currentLat={lat}
            currentLon={lon}
            currentCity={city}
            language={language}
          />
        )}

        {activeTab === 'disaster' && (
          <DisasterScreen
            currentLat={lat}
            currentLon={lon}
            currentCity={city}
            language={language}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            currentLanguage={language}
            onUpdateLanguage={handleUpdateLanguage}
            currentProfession={profession}
            onUpdateProfession={handleUpdateProfession}
            onResetOnboarding={handleResetOnboarding}
          />
        )}
      </main>

      {/* Persistent Bottom Tab Navigator */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasActiveAlerts={hasSevereAlerts}
        language={language}
      />
    </div>
  );
};
