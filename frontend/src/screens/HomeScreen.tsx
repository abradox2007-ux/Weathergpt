import React from 'react';
import { Header } from '../components/Header';
import { StatusBanner } from '../components/StatusBanner';
import { VoiceChatBar } from '../components/VoiceChatBar';
import { TodayClimateCard } from '../components/TodayClimateCard';
import { ForecastStrip } from '../components/ForecastStrip';
import { MapRadarPreview } from '../components/MapRadarPreview';
import { CurrentWeather, ForecastResponse, AlertItem, UserSettings } from '../types';

interface HomeScreenProps {
  currentCity: string;
  currentLat: number;
  currentLon: number;
  profession: string;
  language: string;
  weather: CurrentWeather | null;
  forecast: ForecastResponse | null;
  alerts: AlertItem[];
  settings: UserSettings;
  onSelectCity: (city: string, lat: number, lon: number) => void;
  onTriggerGPS?: () => void;
  onNavigateToDisaster: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentCity,
  currentLat,
  currentLon,
  profession,
  language,
  weather,
  forecast,
  alerts,
  settings,
  onSelectCity,
  onTriggerGPS,
  onNavigateToDisaster,
}) => {
  return (
    <div className="flex flex-col w-full relative transition-colors duration-200">
      {/* 1. App Header */}
      <Header
        currentCity={currentCity}
        language={language}
        onSelectCity={onSelectCity}
        onTriggerGPS={onTriggerGPS}
      />

      {/* 2. Message / Status Bar */}
      <StatusBanner
        alerts={alerts}
        isStale={weather?.stale}
        language={language}
        onNavigateToDisaster={onNavigateToDisaster}
      />

      {/* 3. Search Bar with Voice Assistant */}
      <VoiceChatBar
        currentLat={currentLat}
        currentLon={currentLon}
        currentCity={currentCity}
        profession={profession}
        language={language}
      />

      {/* Skeleton loading or live weather */}
      {weather ? (
        <div className="space-y-1">
          {/* 4. Today's Climate Section */}
          <TodayClimateCard
            weather={weather}
            unitTemp={settings.unit_temp}
            unitWind={settings.unit_wind}
            language={language}
          />

          {/* 5. 7-Day Forecast Strip */}
          {forecast && (
            <ForecastStrip
              daily={forecast.daily}
              unitTemp={settings.unit_temp}
              language={language}
            />
          )}

          {/* 6. Map / Radar Preview */}
          <MapRadarPreview
            lat={currentLat}
            lon={currentLon}
            city={currentCity}
            language={language}
          />
        </div>
      ) : (
        /* Skeleton placeholder */
        <div className="px-4 py-6 space-y-4 animate-pulse">
          <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800/80" />
          <div className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800/80" />
          <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800/80" />
        </div>
      )}
    </div>
  );
};
