import React from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Droplets } from 'lucide-react';
import { DailyForecastItem } from '../types';
import { getTranslation, getConditionTranslation } from '../i18n/translations';

interface ForecastStripProps {
  daily: DailyForecastItem[];
  unitTemp?: string;
  language?: string;
}

export const ForecastStrip: React.FC<ForecastStripProps> = ({
  daily,
  unitTemp = 'celsius',
  language = 'en',
}) => {
  const formatTemp = (val: number) => {
    if (unitTemp === 'fahrenheit') {
      return Math.round((val * 9) / 5 + 32);
    }
    return Math.round(val);
  };

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return getTranslation(language, 'today');
    }
    return d.toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) {
      return <Sun className="w-6 h-6 text-amber-500" />;
    } else if (code === 2 || code === 3) {
      return <Cloud className="w-6 h-6 text-slate-500 dark:text-slate-300" />;
    } else if (code >= 51 && code <= 82) {
      return <CloudRain className="w-6 h-6 text-sky-500" />;
    } else if (code >= 95) {
      return <CloudLightning className="w-6 h-6 text-amber-500" />;
    }
    return <Sun className="w-6 h-6 text-amber-500" />;
  };

  return (
    <div className="pt-4">
      <div className="px-4 flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
          <span>{getTranslation(language, 'forecast_7day')}</span>
        </h3>
        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
          {getTranslation(language, 'scroll_hint')}
        </span>
      </div>

      <div className="flex space-x-2.5 overflow-x-auto px-4 pb-2 pt-1 scrollbar-none snap-x">
        {daily.map((item, idx) => {
          const isToday = idx === 0;
          return (
            <div
              key={item.date || idx}
              className={`flex-shrink-0 w-[112px] rounded-3xl border p-3 flex flex-col items-center justify-between snap-start transition-all duration-200 shadow-sm group ${
                isToday
                  ? 'bg-gradient-to-b from-sky-50/90 to-white dark:from-sky-950/40 dark:to-slate-900 border-sky-300 dark:border-sky-700 shadow-sky-500/5 ring-1 ring-sky-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-sky-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="w-full text-center">
                <span className={`text-[11px] font-black truncate block ${
                  isToday ? 'text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {getDayName(item.date)}
                </span>
                {isToday && (
                  <span className="text-[9px] uppercase font-extrabold text-sky-500 block -mt-0.5 tracking-wider">
                    Today
                  </span>
                )}
              </div>

              <div className="my-2 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 group-hover:scale-110 transition-transform">
                {getWeatherIcon(item.condition_code)}
              </div>

              {/* Min & Max Temp */}
              <div className="w-full flex items-baseline justify-between text-xs px-1">
                <span className="font-black text-slate-900 dark:text-white text-sm">{formatTemp(item.temp_max)}°</span>
                <span className="font-bold text-slate-400 text-xs">{formatTemp(item.temp_min)}°</span>
              </div>

              {/* Rain chance pill */}
              {item.precip_probability > 0 ? (
                <div className="mt-1.5 w-full flex items-center justify-center space-x-1 text-[10px] text-sky-600 dark:text-sky-400 font-extrabold bg-sky-50 dark:bg-sky-950/60 py-0.5 rounded-xl border border-sky-200/80 dark:border-sky-800">
                  <Droplets className="w-3 h-3 text-sky-500 shrink-0" />
                  <span>{Math.round(item.precip_probability)}%</span>
                </div>
              ) : (
                <div className="mt-1.5 text-[9px] text-slate-400 dark:text-slate-500 font-bold">0% Rain</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
