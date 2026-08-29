import React, { useState } from 'react';
import {
  CloudSun,
  Globe2,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  Tractor,
  Anchor,
  Plane,
  Ship,
  Building2,
  User,
  Sparkles
} from 'lucide-react';
import { LANGUAGES, PROFESSIONS, getTranslation } from '../i18n/translations';
import { api, getStoredDeviceId, setStoredToken, setStoredLanguage, setStoredProfession, setOnboardingCompleted } from '../api/client';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLang, setSelectedLang] = useState('hi');
  const [selectedProf, setSelectedProf] = useState('farmer');
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    try {
      const deviceId = getStoredDeviceId();
      const res = await api.onboarding({
        device_id: deviceId,
        language_code: selectedLang,
        profession: selectedProf,
        city: 'New Delhi',
        lat: 28.6139,
        lon: 77.2090
      });

      if (res.access_token) {
        setStoredToken(res.access_token);
      }
      setStoredLanguage(selectedLang);
      setStoredProfession(selectedProf);
      setOnboardingCompleted(true);
      onComplete();
    } catch (e) {
      console.error('Onboarding failed:', e);
      setStoredLanguage(selectedLang);
      setStoredProfession(selectedProf);
      setOnboardingCompleted(true);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const getProfessionIcon = (id: string) => {
    switch (id) {
      case 'farmer': return <Tractor className="w-6 h-6 text-emerald-600" />;
      case 'fisherman': return <Anchor className="w-6 h-6 text-sky-600" />;
      case 'aviation': return <Plane className="w-6 h-6 text-indigo-600" />;
      case 'marine': return <Ship className="w-6 h-6 text-cyan-600" />;
      case 'urban_planning': return <Building2 className="w-6 h-6 text-amber-600" />;
      default: return <User className="w-6 h-6 text-purple-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto shadow-2xl md:border-x md:border-slate-200/80 md:dark:border-slate-800/80 transition-colors">
      {/* Top Brand Header */}
      <div className="pt-2">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-amber-400 flex items-center justify-center shadow-xl shadow-sky-500/25 shrink-0">
            <CloudSun className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-600 via-cyan-600 to-amber-600 dark:from-sky-400 dark:via-cyan-300 dark:to-amber-300">
              WeatherGPT
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              National Weather Intelligence Platform
            </p>
          </div>
        </div>

        {/* Progress Pill */}
        <div className="flex items-center space-x-2 my-3">
          <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
        </div>
      </div>

      {/* Step 1: Language Select */}
      {step === 1 && (
        <div className="my-auto py-2">
          <div className="flex items-center space-x-2 mb-1.5">
            <Globe2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {getTranslation(selectedLang, 'select_language')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5 font-medium">
            Choose your regional language for voice responses & advisories.
          </p>

          <div className="grid grid-cols-2 gap-2.5 max-h-[52vh] overflow-y-auto pr-1">
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between shadow-xs ${
                    isSelected
                      ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20 scale-[1.02] ring-2 ring-sky-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-sky-300 dark:hover:border-slate-700 hover:bg-sky-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-base font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{lang.native}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                  </div>
                  <span className={`text-[11px] mt-1 font-bold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Profession Select */}
      {step === 2 && (
        <div className="my-auto py-2">
          <div className="flex items-center space-x-2 mb-1.5">
            <Briefcase className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {getTranslation(selectedLang, 'select_profession')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5 font-medium">
            Customizes AI alerts, sowing/harvesting guidelines, and marine safety.
          </p>

          <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
            {PROFESSIONS.map((p) => {
              const isSelected = selectedProf === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProf(p.id)}
                  className={`w-full p-3.5 rounded-2xl text-left border transition-all flex items-center space-x-3.5 shadow-xs ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 ring-2 ring-sky-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {getProfessionIcon(p.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{p.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">{p.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Action Button */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-cyan-500 text-white font-black flex items-center justify-center space-x-2 shadow-xl shadow-sky-500/25 hover:opacity-95 transition-all"
          >
            <span>{getTranslation(selectedLang, 'next')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/25 hover:opacity-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Connecting Weather Satellite...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{getTranslation(selectedLang, 'confirm')}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
