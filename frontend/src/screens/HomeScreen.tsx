import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { GlobalLocationSearch } from '../components/GlobalLocationSearch';
import { StatusBanner } from '../components/StatusBanner';
import { VoiceChatBar } from '../components/VoiceChatBar';
import { TodayClimateCard } from '../components/TodayClimateCard';
import { ForecastStrip } from '../components/ForecastStrip';
import { MapRadarPreview } from '../components/MapRadarPreview';
import { CurrentWeather, ForecastResponse, AlertItem, UserSettings, AdvisoryResponse } from '../types';
import { api } from '../api/client';
import { getTranslation, getProfessionName } from '../i18n/translations';
import { Briefcase, ArrowRight, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

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
  onSelectCity: (city: string, lat: number, lon: number, country?: string) => void;
  onTriggerGPS?: () => void;
  onNavigateToDisaster: () => void;
  onNavigateToProfession?: () => void;
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
  onNavigateToProfession,
}) => {
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadAdvisory = async () => {
      setLoadingAdvisory(true);
      try {
        const res = await api.getAdvisory(profession, currentLat, currentLon, language, currentCity);
        if (isMounted) {
          setAdvisory(res);
        }
      } catch (err) {
        console.error('Error fetching home advisory:', err);
      } finally {
        if (isMounted) setLoadingAdvisory(false);
      }
    };

    loadAdvisory();
    return () => {
      isMounted = false;
    };
  }, [profession, currentLat, currentLon, currentCity, language]);

  return (
    <div className="flex flex-col w-full relative transition-colors duration-200">
      {/* 1. App Header */}
      <Header
        currentCity={currentCity}
        language={language}
        onSelectCity={onSelectCity}
        onTriggerGPS={onTriggerGPS}
      />

      {/* 2. Global Location Search Bar */}
      <GlobalLocationSearch
        currentCity={currentCity}
        language={language}
        onSelectLocation={onSelectCity}
        onTriggerGPS={onTriggerGPS}
      />

      {/* 3. Message / Status Bar */}
      <StatusBanner
        alerts={alerts}
        isStale={weather?.stale}
        language={language}
        onNavigateToDisaster={onNavigateToDisaster}
      />

      {/* 4. AI Voice & Meteorological Assistant */}
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
          {/* 5. Today's Climate Section */}
          <TodayClimateCard
            weather={weather}
            unitTemp={settings?.unit_temp || 'celsius'}
            unitWind={settings?.unit_wind || 'kmh'}
            language={language}
          />

          {/* 6. Live Climate & Profession Advisory Panel */}
          {advisory && (
            <div className="px-4 py-2">
              <div className="rounded-3xl p-4 sm:p-5 bg-white/95 dark:bg-slate-900/95 border border-sky-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white flex items-center justify-center shadow-xs">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {getProfessionName(profession, language)} Advisory
                        </span>
                        <span className="text-[9px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 px-1.5 py-0.5 rounded-md border border-sky-200 dark:border-sky-800 truncate max-w-[130px]">
                          📍 {currentCity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {onNavigateToProfession && (
                    <button
                      onClick={onNavigateToProfession}
                      className="text-[11px] font-extrabold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center space-x-0.5 group"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>

                {/* Summary text */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  {advisory.summary}
                </p>

                {/* Key topic preview items */}
                {advisory.topics && advisory.topics.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    {advisory.topics.slice(0, 2).map((top, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start justify-between text-xs space-x-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                            {top.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {top.recommendation}
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0 border ${
                            top.severity === 'critical'
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200'
                              : top.severity === 'attention'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200'
                          }`}
                        >
                          {top.severity === 'critical' ? 'Action Req' : top.severity === 'attention' ? 'Caution' : 'Optimal'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. 7-Day Forecast Strip */}
          {forecast && Array.isArray(forecast.daily) && forecast.daily.length > 0 && (
            <ForecastStrip
              daily={forecast.daily}
              unitTemp={settings?.unit_temp || 'celsius'}
              language={language}
            />
          )}

          {/* 8. Map / Radar Preview */}
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
