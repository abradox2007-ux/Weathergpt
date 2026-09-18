import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Navigation, Globe, Clock, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { GeocodeResultItem } from '../types';
import { getTranslation } from '../i18n/translations';

interface GlobalLocationSearchProps {
  currentCity: string;
  language?: string;
  onSelectLocation: (city: string, lat: number, lon: number, country?: string) => void;
  onTriggerGPS?: () => void;
}

export const GLOBAL_HUBS = [
  { name: 'London', country: 'United Kingdom', code: 'GB', flag: '🇬🇧', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', country: 'United States', code: 'US', flag: '🇺🇸', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', country: 'Japan', code: 'JP', flag: '🇯🇵', lat: 35.6762, lon: 139.6503 },
  { name: 'Paris', country: 'France', code: 'FR', flag: '🇫🇷', lat: 48.8566, lon: 2.3522 },
  { name: 'Dubai', country: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', lat: 25.2048, lon: 55.2708 },
  { name: 'Singapore', country: 'Singapore', code: 'SG', flag: '🇸🇬', lat: 1.3521, lon: 103.8198 },
  { name: 'Sydney', country: 'Australia', code: 'AU', flag: '🇦🇺', lat: -33.8688, lon: 151.2093 },
  { name: 'New Delhi', country: 'India', code: 'IN', flag: '🇮🇳', lat: 28.6139, lon: 77.2090 },
  { name: 'Toronto', country: 'Canada', code: 'CA', flag: '🇨🇦', lat: 43.6532, lon: -79.3832 },
  { name: 'Berlin', country: 'Germany', code: 'DE', flag: '🇩🇪', lat: 52.5200, lon: 13.4050 },
];

export const GlobalLocationSearch: React.FC<GlobalLocationSearchProps> = ({
  currentCity,
  language = 'en',
  onSelectLocation,
  onTriggerGPS,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<GeocodeResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Array<{ name: string; country?: string; lat: number; lon: number }>>([]);
  const [isLocating, setIsLocating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('weathergpt_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const data = await api.searchLocation(searchTerm.trim());
        setResults(data || []);
      } catch (err) {
        console.error('Error searching global location:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const saveRecentSearch = (name: string, lat: number, lon: number, country?: string) => {
    try {
      const existing = recentSearches.filter((item) => item.name.toLowerCase() !== name.toLowerCase());
      const updated = [{ name, lat, lon, country }, ...existing].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem('weathergpt_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const handleSelect = (name: string, lat: number, lon: number, country?: string) => {
    saveRecentSearch(name, lat, lon, country);
    onSelectLocation(name, lat, lon, country);
    setSearchTerm('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleClearRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('weathergpt_recent_searches');
  };

  const handleGPSClick = () => {
    setIsLocating(true);
    setIsOpen(false);
    if (onTriggerGPS) {
      onTriggerGPS();
    }
    setTimeout(() => setIsLocating(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      const top = results[0];
      handleSelect(top.name, top.lat, top.lon, top.country);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full px-4 pt-3 pb-1">
      {/* Search Input Container */}
      <div className="relative flex items-center w-full">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-sky-500">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={getTranslation(language, 'search_city_placeholder') || 'Search any city in the world (London, Tokyo, New York)...'}
          className="w-full pl-10 pr-20 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-sky-200/90 dark:border-slate-700/90 shadow-sm text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all backdrop-blur-md"
        />

        {/* Action icons right side */}
        <div className="absolute right-2 flex items-center space-x-1">
          {isLoading && <Loader2 className="w-4 h-4 text-sky-500 animate-spin mr-1" />}

          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setResults([]);
                if (inputRef.current) inputRef.current.focus();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick GPS button */}
          <button
            onClick={handleGPSClick}
            className={`p-1.5 rounded-xl border border-sky-100 dark:border-slate-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all ${
              isLocating ? 'animate-spin bg-sky-500 text-white' : 'bg-sky-50/70 dark:bg-slate-800'
            }`}
            title="Detect My GPS Location"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div className="absolute left-4 right-4 mt-2 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-2xl backdrop-blur-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 max-h-[75vh] overflow-y-auto">
          {/* 1. Live Search Results */}
          {searchTerm.trim().length >= 2 ? (
            <div>
              <div className="flex items-center justify-between px-2 py-1 mb-1 text-[11px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                <span className="flex items-center space-x-1">
                  <Globe className="w-3 h-3" />
                  <span>Global Search Results</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400 lowercase">
                  {results.length} found
                </span>
              </div>

              {results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((item, idx) => (
                    <button
                      key={`${item.name}-${item.lat}-${item.lon}-${idx}`}
                      onClick={() => handleSelect(item.name, item.lat, item.lon, item.country)}
                      className="w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-sky-200/60 dark:hover:border-sky-900/50 group"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {[item.admin1, item.country].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        {item.country_code && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 uppercase">
                            {item.country_code}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : !isLoading ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  {getTranslation(language, 'no_results_found') || 'No matching global cities found'}
                </div>
              ) : null}
            </div>
          ) : (
            /* 2. Default View: Recent Searches & Worldwide Hubs */
            <div className="space-y-4">
              {/* Live GPS Quick action */}
              <button
                onClick={handleGPSClick}
                className="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 flex items-center space-x-2.5 transition-colors border border-sky-200 dark:border-sky-800/80 shadow-xs"
              >
                <Navigation className="w-4 h-4 text-sky-500 animate-pulse shrink-0" />
                <span className="truncate">{getTranslation(language, 'use_live_gps') || 'Use Live GPS Location'}</span>
              </button>

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="flex items-center space-x-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      <span>{getTranslation(language, 'recent_searches') || 'Recent Searches'}</span>
                    </span>
                    <button
                      onClick={handleClearRecent}
                      className="text-[10px] text-sky-500 hover:text-sky-700 font-semibold"
                    >
                      {getTranslation(language, 'clear_history') || 'Clear'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((item, idx) => (
                      <button
                        key={`${item.name}-${idx}`}
                        onClick={() => handleSelect(item.name, item.lat, item.lon, item.country)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-950/80 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200/80 dark:border-slate-700 transition-all flex items-center space-x-1"
                      >
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{item.name}</span>
                        {item.country && <span className="text-[10px] text-slate-400">({item.country})</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Global Metros */}
              <div>
                <div className="flex items-center space-x-1 px-1 mb-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{getTranslation(language, 'global_hubs') || 'Global Metros'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {GLOBAL_HUBS.map((hub) => {
                    const isSelected = currentCity.toLowerCase().includes(hub.name.toLowerCase());
                    return (
                      <button
                        key={hub.name}
                        onClick={() => handleSelect(hub.name, hub.lat, hub.lon, hub.country)}
                        className={`text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between border transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-white font-bold border-sky-500 shadow-sm'
                            : 'bg-slate-50/80 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-200/70 dark:border-slate-700 hover:border-sky-300'
                        }`}
                      >
                        <div className="truncate">
                          <span className="mr-1.5">{hub.flag}</span>
                          <span className="font-semibold">{hub.name}</span>
                        </div>
                        <span className={`text-[10px] uppercase font-mono ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {hub.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
