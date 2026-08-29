import React, { useState, useEffect } from 'react';
import {
  Activity,
  Info,
  TrendingUp,
  Cloud,
  Droplets,
  Sun,
  Layers,
} from 'lucide-react';
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { api } from '../api/client';
import { ResearchMetricItem, HistoricalPoint } from '../types';
import { getTranslation } from '../i18n/translations';

interface ResearchScreenProps {
  currentLat: number;
  currentLon: number;
  currentCity: string;
  language?: string;
}

export const ResearchScreen: React.FC<ResearchScreenProps> = ({
  currentLat,
  currentLon,
  currentCity,
  language = 'en',
}) => {
  const [activeCategory, setActiveCategory] = useState('atmospheric');
  const [metrics, setMetrics] = useState<ResearchMetricItem[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<'30d' | '60d' | '90d'>('30d');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const categories = [
    { id: 'atmospheric', label: getTranslation(language, 'atmospheric_conditions') || 'Atmospheric Conditions', icon: Cloud },
    { id: 'moisture', label: getTranslation(language, 'moisture_water') || 'Moisture & Water', icon: Droplets },
    { id: 'energy', label: getTranslation(language, 'energy_radiation') || 'Energy & Radiation', icon: Sun },
    { id: 'long_term', label: getTranslation(language, 'long_term_indicators') || 'Long-Term Indicators', icon: Layers },
  ];

  useEffect(() => {
    fetchMetrics(activeCategory);
  }, [activeCategory, currentLat, currentLon]);

  useEffect(() => {
    fetchHistorical(selectedRange);
  }, [selectedRange, currentLat, currentLon]);

  const fetchMetrics = async (cat: string) => {
    setLoading(true);
    try {
      const res = await api.getResearchMetrics(cat, currentLat, currentLon);
      setMetrics(res.metrics || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorical = async (range: string) => {
    try {
      const days = range === '90d' ? 90 : range === '60d' ? 60 : 30;
      const end = new Date();
      end.setDate(end.getDate() - 2);
      const start = new Date();
      start.setDate(start.getDate() - (days + 2));

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const res = await api.getHistorical(currentLat, currentLon, startStr, endStr);
      setHistoricalData(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 pt-3 w-full transition-colors duration-200">
      {/* Header */}
      <div className="pt-1 pb-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {getTranslation(language, 'climate_research')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Numerical Weather Prediction diagnostics & historical trends for {currentCity}.
        </p>
      </div>

      {/* 4 Category Pill Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`p-3 rounded-2xl border text-left flex items-center space-x-2.5 transition-all shadow-xs ${
                isActive
                  ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50/50 hover:text-sky-600'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="text-xs font-bold leading-tight truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Metrics List with Plain-Language Tooltips */}
      <div className="space-y-2.5 mb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {getTranslation(language, 'diagnostic_indices')}
          </h3>
          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
            {getTranslation(language, 'plain_tooltip_hint')}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2.5 animate-pulse">
            <div className="h-20 rounded-3xl bg-slate-200 dark:bg-slate-800/80" />
            <div className="h-20 rounded-3xl bg-slate-200 dark:bg-slate-800/80" />
            <div className="h-20 rounded-3xl bg-slate-200 dark:bg-slate-800/80" />
          </div>
        ) : (
          metrics.map((m) => {
            const isTooltipOpen = activeTooltip === m.code;
            return (
              <div
                key={m.code}
                className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.name}</span>
                    <button
                      onClick={() => setActiveTooltip(isTooltipOpen ? null : m.code)}
                      className="text-slate-400 hover:text-sky-600 p-0.5 rounded-lg shrink-0"
                      aria-label="Toggle explanation"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-sm font-black text-sky-600 dark:text-sky-400">{m.value}</span>
                    <span className="text-[10px] text-slate-400 font-bold ml-1">{m.unit}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">{m.description}</p>

                {/* Plain-Language Tooltip Expandable */}
                {isTooltipOpen && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-sky-500/10 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/80 text-xs text-sky-950 dark:text-sky-200 font-medium animate-in fade-in">
                    <span className="font-black text-sky-700 dark:text-sky-300">Plain Explanation: </span>
                    {m.plain_tooltip}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Historical Climate Archive Chart */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-200/40 dark:shadow-none">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1.5 min-w-0">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
              {getTranslation(language, 'historical_chart')}
            </h3>
          </div>

          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
            {(['30d', '60d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold transition-all ${
                  selectedRange === r ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area / Line chart */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradientDynamic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                  fontSize: '11px',
                  color: '#ffffff'
                }}
              />
              <Area type="monotone" dataKey="temp_max" name="Max Temp (°C)" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#tempGradientDynamic)" />
              <Line type="monotone" dataKey="temp_min" name="Min Temp (°C)" stroke="#64748b" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
