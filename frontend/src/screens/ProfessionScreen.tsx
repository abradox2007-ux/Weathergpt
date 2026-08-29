import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Tractor,
  Anchor,
  Plane,
  Ship,
  Building2,
  User,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { api } from '../api/client';
import { AdvisoryResponse } from '../types';
import { PROFESSIONS, getTranslation, getProfessionName, getProfessionDesc, translateAdvisoryText } from '../i18n/translations';

interface ProfessionScreenProps {
  currentProfession: string;
  currentLat: number;
  currentLon: number;
  currentCity: string;
  language?: string;
  onUpdateProfession: (prof: string) => void;
}

export const ProfessionScreen: React.FC<ProfessionScreenProps> = ({
  currentProfession,
  currentLat,
  currentLon,
  currentCity,
  language = 'en',
  onUpdateProfession,
}) => {
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchAdvisory();
  }, [currentProfession, currentLat, currentLon, language]);

  const fetchAdvisory = async () => {
    setLoading(true);
    try {
      const data = await api.getAdvisory(currentProfession, currentLat, currentLon, language);
      setAdvisory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {getTranslation(language, 'action_required')}
          </span>
        );
      case 'attention':
        return (
          <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            {getTranslation(language, 'advisory_caution')}
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {getTranslation(language, 'optimal_window')}
          </span>
        );
    }
  };

  const activeProfName = getProfessionName(currentProfession, language);

  return (
    <div className="p-4 pt-3 w-full transition-colors duration-200">
      {/* Screen Header */}
      <div className="flex items-center justify-between pt-1 pb-3">
        <div>
          <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            {getTranslation(language, 'operational_guidance')}
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {getTranslation(language, 'profession_advisory')}
          </h1>
        </div>

        <button
          onClick={fetchAdvisory}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 shadow-xs"
          title="Refresh Advisory"
          aria-label="Refresh Advisory"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Profession Switcher Pill Card */}
      <div className="relative mb-3.5">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between hover:border-sky-400 dark:hover:border-sky-600 transition-all shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/30">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{getTranslation(language, 'active_profile')}</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{activeProfName}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 py-1.5 mb-1">
                {getTranslation(language, 'switch_category')}
              </div>
              <div className="space-y-1">
                {PROFESSIONS.map((p) => {
                  const pName = getProfessionName(p.id, language);
                  const pDesc = getProfessionDesc(p.id, language);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onUpdateProfession(p.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                        currentProfession === p.id
                          ? 'bg-sky-500 text-white font-black shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600'
                      }`}
                    >
                      <span className="font-bold">{pName}</span>
                      <span className="text-[10px] opacity-75 truncate max-w-[150px]">{pDesc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Summary Banner */}
      {advisory?.summary && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-indigo-500/10 dark:from-sky-950/40 dark:to-slate-900 border border-sky-200 dark:border-sky-800/80 mb-3.5 flex items-start space-x-3 shadow-xs">
          <Sparkles className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-950 dark:text-sky-200 leading-relaxed font-semibold">
            {translateAdvisoryText(advisory.summary, language)}
          </p>
        </div>
      )}

      {/* Topic-Grouped Actionable Guidance Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/80" />
            <div className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/80" />
            <div className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/80" />
          </div>
        ) : advisory?.topics && advisory.topics.length > 0 ? (
          advisory.topics.map((topic, idx) => {
            const translatedCategory = translateAdvisoryText(topic.category, language);
            const translatedTitle = translateAdvisoryText(topic.title, language);
            const translatedSummary = translateAdvisoryText(topic.summary, language);
            const translatedRec = translateAdvisoryText(topic.recommendation, language);

            return (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-none hover:border-sky-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {translatedCategory}
                  </span>
                  {getSeverityBadge(topic.severity)}
                </div>

                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1.5">{translatedTitle}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3.5 leading-relaxed font-medium">{translatedSummary}</p>

                {/* Recommendation Box */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 text-xs text-emerald-950 dark:text-emerald-200 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-black text-emerald-800 dark:text-emerald-300">{getTranslation(language, 'action_plan')}: </span>
                    <span className="font-semibold">{translatedRec}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-xs text-slate-500 font-semibold bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800">
            {getTranslation(language, 'analyzing')}
          </div>
        )}
      </div>
    </div>
  );
};
