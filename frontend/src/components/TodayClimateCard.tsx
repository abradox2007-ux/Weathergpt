import React from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  ShieldCheck
} from 'lucide-react';
import { CurrentWeather } from '../types';
import { getTranslation, getConditionTranslation } from '../i18n/translations';

interface TodayClimateCardProps {
  weather: CurrentWeather;
  unitTemp?: string;
  unitWind?: string;
  language?: string;
}

export const TodayClimateCard: React.FC<TodayClimateCardProps> = ({
  weather,
  unitTemp = 'celsius',
  unitWind = 'kmh',
  language = 'en',
}) => {
  const getGradientClass = (code: number, isDay: number) => {
    if (code === 0 || code === 1) {
      return isDay === 1 ? 'gradient-clear-day' : 'gradient-clear-night';
    } else if (code === 2 || code === 3 || code === 45) {
      return 'gradient-cloudy';
    } else if (code >= 51 && code <= 82) {
      return 'gradient-rain';
    } else if (code >= 95) {
      return 'gradient-storm';
    }
    return 'gradient-clear-day';
  };

  const getWeatherIcon = (code: number, isDay: number) => {
    if (code === 0 || code === 1) {
      return <Sun className="w-16 h-16 text-amber-200 animate-pulse-subtle drop-shadow-md" />;
    } else if (code === 2 || code === 3) {
      return <Cloud className="w-16 h-16 text-white/90 drop-shadow-md" />;
    } else if (code >= 51 && code <= 82) {
      return <CloudRain className="w-16 h-16 text-sky-100 drop-shadow-md" />;
    } else if (code >= 95) {
      return <CloudLightning className="w-16 h-16 text-amber-300 drop-shadow-md" />;
    }
    return <Sun className="w-16 h-16 text-amber-200 drop-shadow-md" />;
  };

  const formatTemp = (val: number) => {
    if (unitTemp === 'fahrenheit') {
      return Math.round((val * 9) / 5 + 32);
    }
    return Math.round(val);
  };

  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return 'bg-emerald-500/25 text-emerald-100 border-emerald-300/40';
    if (aqi <= 100) return 'bg-yellow-500/25 text-yellow-100 border-yellow-300/40';
    if (aqi <= 150) return 'bg-orange-500/25 text-orange-100 border-orange-300/40';
    return 'bg-rose-500/25 text-rose-100 border-rose-300/40';
  };

  const translatedCondition = getConditionTranslation(weather.condition, language);

  return (
    <div className="px-4 pt-3.5">
      {/* Dynamic Condition Card */}
      <div
        className={`rounded-3xl p-5 sm:p-6 text-white shadow-2xl shadow-sky-500/20 relative overflow-hidden transition-all duration-700 border border-white/20 ${getGradientClass(
          weather.condition_code,
          weather.is_day
        )}`}
      >
        {/* Luminous aura rings */}
        <div className="absolute -top-14 -right-14 w-56 h-56 rounded-full bg-white/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Card Top Row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/90 bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/20">
                  {getTranslation(language, 'todays_climate')}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1 drop-shadow-sm">{weather.city}</h2>
            </div>
            <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              {getWeatherIcon(weather.condition_code, weather.is_day)}
            </div>
          </div>

          {/* Large Temperature Display */}
          <div className="my-4 flex items-baseline justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="text-6xl sm:text-7xl font-black tracking-tighter drop-shadow-lg leading-none">
                {formatTemp(weather.temperature)}°
              </span>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-extrabold text-white drop-shadow-sm leading-tight">{translatedCondition}</span>
                <span className="text-xs text-white/90 font-semibold mt-0.5">
                  {getTranslation(language, 'feels_like')} {formatTemp(weather.feels_like)}°{unitTemp === 'fahrenheit' ? 'F' : 'C'}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Key Secondary Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-3 border-t border-white/20">
            {/* Humidity */}
            <div className="bg-black/15 hover:bg-black/25 transition-colors backdrop-blur-xl rounded-2xl p-2.5 sm:p-3 flex items-center space-x-2.5 border border-white/15 shadow-xs">
              <div className="p-2 rounded-xl bg-white/15 text-sky-200">
                <Droplets className="w-4 h-4 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] uppercase font-bold text-white/75 truncate">{getTranslation(language, 'humidity')}</div>
                <div className="text-sm font-black text-white">{Math.round(weather.humidity)}%</div>
              </div>
            </div>

            {/* Wind */}
            <div className="bg-black/15 hover:bg-black/25 transition-colors backdrop-blur-xl rounded-2xl p-2.5 sm:p-3 flex items-center space-x-2.5 border border-white/15 shadow-xs">
              <div className="p-2 rounded-xl bg-white/15 text-amber-200">
                <Wind className="w-4 h-4 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] uppercase font-bold text-white/75 truncate">{getTranslation(language, 'wind')}</div>
                <div className="text-sm font-black text-white truncate">
                  {Math.round(weather.wind_speed)} <span className="text-[10px] font-bold text-white/80">{unitWind}</span>
                </div>
              </div>
            </div>

            {/* UV Index */}
            <div className="bg-black/15 hover:bg-black/25 transition-colors backdrop-blur-xl rounded-2xl p-2.5 sm:p-3 flex items-center space-x-2.5 border border-white/15 shadow-xs">
              <div className="p-2 rounded-xl bg-white/15 text-yellow-200">
                <Sun className="w-4 h-4 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] uppercase font-bold text-white/75 truncate">{getTranslation(language, 'uv')}</div>
                <div className="text-sm font-black text-white">{weather.uv_index.toFixed(1)}</div>
              </div>
            </div>

            {/* Air Quality (AQI) */}
            <div className={`backdrop-blur-xl rounded-2xl p-2.5 sm:p-3 flex items-center space-x-2.5 border shadow-xs ${getAqiColor(weather.aqi)}`}>
              <div className="p-2 rounded-xl bg-white/15 text-emerald-200">
                <ShieldCheck className="w-4 h-4 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] uppercase font-bold text-white/80 truncate">{getTranslation(language, 'aqi')}</div>
                <div className="text-xs font-black truncate text-white">
                  {weather.aqi} • {weather.aqi_label}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
