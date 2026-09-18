import React, { useState, useEffect, useRef } from 'react';
import { CloudSun, MapPin, ChevronDown, Crosshair, Navigation, Download, Sparkles, Search, Globe, X } from 'lucide-react';
import { getTranslation } from '../i18n/translations';
import { api } from '../api/client';
import { GeocodeResultItem } from '../types';

interface HeaderProps {
  currentCity: string;
  language?: string;
  onSelectCity: (city: string, lat: number, lon: number, country?: string) => void;
  onTriggerGPS?: () => void;
}

const GLOBAL_POPULAR = [
  { name: 'London', country: 'UK', flag: '🇬🇧', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', country: 'USA', flag: '🇺🇸', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', country: 'Japan', flag: '🇯🇵', lat: 35.6762, lon: 139.6503 },
  { name: 'Paris', country: 'France', flag: '🇫🇷', lat: 48.8566, lon: 2.3522 },
  { name: 'Dubai', country: 'UAE', flag: '🇦🇪', lat: 25.2048, lon: 55.2708 },
  { name: 'Singapore', country: 'SG', flag: '🇸🇬', lat: 1.3521, lon: 103.8198 },
  { name: 'Sydney', country: 'Australia', flag: '🇦🇺', lat: -33.8688, lon: 151.2093 },
  { name: 'New Delhi', country: 'India', flag: '🇮🇳', lat: 28.6139, lon: 77.2090 },
  { name: 'Toronto', country: 'Canada', flag: '🇨🇦', lat: 43.6532, lon: -79.3832 },
];

export const Header: React.FC<HeaderProps> = ({ currentCity, language = 'en', onSelectCity, onTriggerGPS }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Quick geocode in dropdown
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchLocation(query.trim());
        setSearchResults(results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install WeatherGPT on your device:\n• Android: Tap ⋮ menu and select "Install App" or "Add to Home Screen"\n• iPhone: Tap Share and select "Add to Home Screen"');
    }
  };

  const handleGPSClick = () => {
    setIsLocating(true);
    setDropdownOpen(false);
    if (onTriggerGPS) {
      onTriggerGPS();
    }
    setTimeout(() => setIsLocating(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-sky-100/80 dark:border-slate-800/80 flex items-center justify-between shadow-sm transition-colors duration-200">
      {/* Brand logo & name */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-amber-400 flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
          <CloudSun className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-600 via-cyan-600 to-amber-600 dark:from-sky-400 dark:via-cyan-300 dark:to-amber-300">
              WeatherGPT
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 uppercase shrink-0 flex items-center space-x-1">
              <Globe className="w-2.5 h-2.5 inline" />
              <span>WORLD</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action controls */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Install / Download App Button */}
        {!isInstalled && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-[11px] font-bold shadow-md shadow-sky-500/20 hover:from-sky-600 hover:to-cyan-600 transition-all"
            title="Download & Install WeatherGPT App"
          >
            <Download className="w-3 h-3 animate-bounce" />
            <span className="hidden sm:inline">{getTranslation(language, 'install_app')}</span>
          </button>
        )}

        {/* Quick GPS Location Button */}
        <button
          onClick={handleGPSClick}
          className={`p-2 rounded-xl border transition-all shadow-xs ${
            isLocating
              ? 'bg-sky-500 text-white border-sky-500 animate-spin'
              : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:border-sky-400'
          }`}
          title="Detect Current GPS Location"
          aria-label="Detect GPS Location"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>

        {/* City Selector Pill */}
        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setQuery('');
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 transition-all shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="max-w-[85px] sm:max-w-[110px] truncate">{currentCity}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                {/* Search input inside dropdown */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search global city..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    autoFocus
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Use Current GPS Location Action Button */}
                <button
                  onClick={handleGPSClick}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 flex items-center space-x-2 transition-colors mb-2 border border-sky-200 dark:border-sky-800/80 shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-500 animate-pulse shrink-0" />
                  <span className="truncate">{getTranslation(language, 'use_live_gps')}</span>
                </button>

                {/* If searching, show search results */}
                {query.trim().length >= 2 ? (
                  <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                    {searchResults.length > 0 ? (
                      searchResults.map((c, i) => (
                        <button
                          key={`${c.name}-${c.lat}-${i}`}
                          onClick={() => {
                            onSelectCity(c.name, c.lat, c.lon, c.country);
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          <div className="truncate">
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              {[c.admin1, c.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                          {c.country_code && (
                            <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {c.country_code}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-400">
                        {isSearching ? 'Searching...' : 'No cities found'}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Otherwise show global popular hubs */
                  <div>
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1 flex items-center justify-between">
                      <span>{getTranslation(language, 'global_hubs') || 'Global Metros'}</span>
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                      {GLOBAL_POPULAR.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => {
                            onSelectCity(c.name, c.lat, c.lon, c.country);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            currentCity.toLowerCase().includes(c.name.toLowerCase())
                              ? 'bg-sky-500 text-white font-bold shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <span>{c.flag}</span>
                            <span className="font-semibold">{c.name}</span>
                          </div>
                          <span className="text-[10px] opacity-75">{c.country}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

