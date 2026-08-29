import React from 'react';
import { Home, Briefcase, Activity, ShieldAlert, Settings } from 'lucide-react';
import { getTranslation } from '../i18n/translations';

export type TabType = 'home' | 'profession' | 'research' | 'disaster' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  hasActiveAlerts?: boolean;
  language?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  hasActiveAlerts = false,
  language = 'en',
}) => {
  const tabs = [
    { id: 'profession', labelKey: 'tab_profession', icon: Briefcase },
    { id: 'research', labelKey: 'tab_research', icon: Activity },
    { id: 'home', labelKey: 'tab_home', icon: Home, isCenter: true },
    { id: 'disaster', labelKey: 'tab_disaster', icon: ShieldAlert, hasBadge: hasActiveAlerts },
    { id: 'settings', labelKey: 'tab_settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe">
      <div className="w-full max-w-md mx-auto px-3 pb-2 pt-1 pointer-events-auto">
        <div className="bg-white/92 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl px-2 py-1.5 shadow-2xl shadow-slate-900/15 flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const label = getTranslation(language, tab.labelKey);

            if (tab.isCenter) {
              return (
                <div key={tab.id} className="relative -top-5 flex flex-col items-center flex-1">
                  <button
                    onClick={() => onSelectTab(tab.id as TabType)}
                    className="group relative flex flex-col items-center focus:outline-none"
                    aria-label={label}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-tr from-sky-500 via-sky-400 to-cyan-400 text-white shadow-sky-500/50 scale-105 ring-4 ring-white dark:ring-slate-900'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 border border-slate-200 dark:border-slate-700 ring-4 ring-slate-100 dark:ring-slate-950 shadow-md'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[10px] font-extrabold mt-1 tracking-tight truncate max-w-[64px] text-center ${
                        isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id as TabType)}
                className={`relative flex-1 flex flex-col items-center py-1 px-1 rounded-2xl transition-all ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                aria-label={label}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5]' : ''}`} />
                  {tab.hasBadge && (
                    <>
                      <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                      <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                    </>
                  )}
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-1 truncate max-w-[62px] text-center ${
                    isActive ? 'font-black text-sky-600 dark:text-sky-400' : 'font-semibold'
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
