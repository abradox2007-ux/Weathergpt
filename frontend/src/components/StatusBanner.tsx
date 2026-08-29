import React from 'react';
import { AlertTriangle, Info, BellRing, ChevronRight } from 'lucide-react';
import { AlertItem } from '../types';
import { getTranslation } from '../i18n/translations';

interface StatusBannerProps {
  alerts: AlertItem[];
  isStale?: boolean;
  language?: string;
  onNavigateToDisaster: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  alerts,
  isStale,
  language = 'en',
  onNavigateToDisaster,
}) => {
  const activeAlert = alerts.find(a => a.severity === 'warning' || a.severity === 'watch') || alerts[0];

  if (!activeAlert && !isStale) return null;

  const isSevere = activeAlert?.severity === 'warning' || activeAlert?.severity === 'watch';

  return (
    <div className="px-4 pt-3">
      {isStale && (
        <div className="mb-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex items-center space-x-2 text-xs font-semibold text-amber-900 dark:text-amber-300 shadow-xs">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="leading-snug">{getTranslation(language, 'stale_notice')}</span>
        </div>
      )}

      {activeAlert && (
        <button
          onClick={onNavigateToDisaster}
          className={`w-full px-4 py-3 rounded-3xl flex items-center justify-between text-left transition-all duration-200 shadow-md group ${
            isSevere
              ? 'bg-gradient-to-r from-rose-50 to-orange-50/60 dark:from-rose-950/50 dark:to-slate-900 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100 hover:shadow-lg hover:shadow-rose-500/10'
              : 'bg-gradient-to-r from-sky-50 to-cyan-50/60 dark:from-sky-950/50 dark:to-slate-900 border border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-100 hover:shadow-lg hover:shadow-sky-500/10'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`p-2.5 rounded-2xl shrink-0 shadow-md ${
              isSevere
                ? 'bg-rose-500 text-white shadow-rose-500/30'
                : 'bg-sky-500 text-white shadow-sky-500/30'
            }`}>
              {isSevere ? <AlertTriangle className="w-4 h-4 animate-bounce" /> : <BellRing className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  activeAlert.severity === 'warning' ? 'bg-rose-600 text-white' :
                  activeAlert.severity === 'watch' ? 'bg-amber-500 text-white' : 'bg-sky-600 text-white'
                }`}>
                  {activeAlert.severity}
                </span>
                <span className="text-xs font-black truncate text-slate-900 dark:text-white">{activeAlert.title}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5 font-medium">{activeAlert.description}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-all shrink-0 ml-2" />
        </button>
      )}
    </div>
  );
};
