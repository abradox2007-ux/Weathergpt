import React, { useState, useEffect } from 'react';
import { CloudSun, MapPin, ChevronDown, Crosshair, Navigation, Download, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentCity: string;
  onSelectCity: (city: string, lat: number, lon: number) => void;
  onTriggerGPS?: () => void;
}

const POPULAR_CITIES = [
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090, state: 'Delhi' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, state: 'Telangana' },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, state: 'Gujarat' },
  { name: 'Pune', lat: 18.5204, lon: 73.8567, state: 'Maharashtra' },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873, state: 'Rajasthan' },
  { name: 'Kochi', lat: 9.9312, lon: 76.2673, state: 'Kerala' },
  { name: 'Guwahati', lat: 26.1445, lon: 91.7362, state: 'Assam' },
];

export const Header: React.FC<HeaderProps> = ({ currentCity, onSelectCity, onTriggerGPS }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

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
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 uppercase shrink-0">
              AI INDIA
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
            <span className="hidden sm:inline">Install</span>
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
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 transition-all shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="max-w-[85px] sm:max-w-[110px] truncate">{currentCity}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2">
                {/* Use Current GPS Location Action Button */}
                <button
                  onClick={handleGPSClick}
                  className="w-full text-left px-3 py-2.5 rounded-2xl text-xs font-extrabold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 flex items-center space-x-2 transition-colors mb-2 border border-sky-200 dark:border-sky-800/80 shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-500 animate-pulse shrink-0" />
                  <span className="truncate">Use Current Live Location (GPS)</span>
                </button>

                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 py-1 mb-1">
                  Popular Indian Hubs
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                  {POPULAR_CITIES.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        onSelectCity(c.name, c.lat, c.lon);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        currentCity === c.name
                          ? 'bg-sky-500 text-white font-bold shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400'
                      }`}
                    >
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-[10px] opacity-75">{c.state}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
