import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Clock,
  ShieldCheck,
  Flame,
  CloudLightning,
  Wind
} from 'lucide-react';
import { api } from '../api/client';
import { AlertItem } from '../types';
import { getTranslation, translatePrecaution, translateEmergencyContact } from '../i18n/translations';

interface DisasterScreenProps {
  currentLat: number;
  currentLon: number;
  currentCity: string;
  language?: string;
}

export const DisasterScreen: React.FC<DisasterScreenProps> = ({
  currentLat,
  currentLon,
  currentCity,
  language = 'en',
}) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [precautions, setPrecautions] = useState<{
    dos: string[];
    donts: string[];
    emergency_contacts: { label: string; number: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [currentLat, currentLon, language]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getActiveAlerts(currentLat, currentLon, language);
      setAlerts(res.alerts || []);
      if (res.alerts && res.alerts.length > 0) {
        setSelectedAlert(res.alerts[0]);
        loadPrecautions(res.alerts[0]);
      } else {
        loadGeneralPrecautions();
      }
    } catch (e) {
      console.error(e);
      loadGeneralPrecautions();
    } finally {
      setLoading(false);
    }
  };

  const loadPrecautions = async (alert: AlertItem) => {
    try {
      const p = await api.getAlertPrecautions(alert.id, alert.alert_type, alert.severity, language);
      setPrecautions(p);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGeneralPrecautions = async () => {
    try {
      const p = await api.getAlertPrecautions('general', 'general', 'advisory', language);
      setPrecautions(p);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTimeWindow = (fromStr: string, toStr: string) => {
    try {
      const f = new Date(fromStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const t = new Date(toStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${f} — ${t}`;
    } catch {
      return 'Next 12 Hours';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cyclone': return <Wind className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'heat': return <Flame className="w-5 h-5 text-amber-500" />;
      case 'storm': return <CloudLightning className="w-5 h-5 text-yellow-500" />;
      default: return <ShieldAlert className="w-5 h-5 text-rose-500" />;
    }
  };

  return (
    <div className="p-4 pt-3 w-full transition-colors duration-200">
      {/* Screen Header */}
      <div className="pt-1 pb-3">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {getTranslation(language, 'active_alerts')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          IMD & derived extreme weather warnings for {currentCity}.
        </p>
      </div>

      {/* Active Alerts List */}
      <div className="space-y-3 mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {getTranslation(language, 'bulletins')}
        </h3>

        {alerts.length > 0 ? (
          alerts.map((a) => {
            const isSelected = selectedAlert?.id === a.id;
            const isSevere = a.severity === 'warning' || a.severity === 'watch';

            return (
              <div
                key={a.id}
                onClick={() => {
                  setSelectedAlert(a);
                  loadPrecautions(a);
                }}
                className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-md ${
                  isSelected
                    ? isSevere
                      ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                      : 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700 ring-2 ring-sky-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    {getAlertIcon(a.alert_type)}
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">{a.title}</span>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                      a.severity === 'warning'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : a.severity === 'watch'
                        ? 'bg-amber-500 text-white'
                        : 'bg-sky-600 text-white'
                    }`}
                  >
                    {getTranslation(language, a.severity)}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium mb-3">{a.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{formatTimeWindow(a.valid_from, a.valid_to)}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {getTranslation(language, 'source')}: {a.source.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 rounded-3xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 flex items-center space-x-3 text-xs text-emerald-950 dark:text-emerald-200 font-semibold">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{getTranslation(language, 'no_active_alerts')}</span>
          </div>
        )}
      </div>

      {/* Precautions: Do's and Don'ts Checklist */}
      <div className="space-y-3 mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {getTranslation(language, 'emergency_checklist')}
        </h3>

        {/* DO's */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-none">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-black text-xs mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{getTranslation(language, 'dos')}</span>
          </div>
          <div className="space-y-2">
            {precautions?.dos.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <span className="text-emerald-500 font-black shrink-0 mt-0.5">•</span>
                <span className="leading-snug">{translatePrecaution(item, language)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* DON'TS */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-none">
          <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-black text-xs mb-3">
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{getTranslation(language, 'donts')}</span>
          </div>
          <div className="space-y-2">
            {precautions?.donts.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <span className="text-rose-500 font-black shrink-0 mt-0.5">•</span>
                <span className="leading-snug">{translatePrecaution(item, language)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Helplines Speed Dial */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-none">
        <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-400 font-black text-xs mb-3">
          <PhoneCall className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>{getTranslation(language, 'emergency_helplines')}</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {precautions?.emergency_contacts.map((c, idx) => (
            <a
              key={idx}
              href={`tel:${c.number}`}
              className="p-3 rounded-2xl bg-sky-50/70 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 flex flex-col justify-between transition-colors shadow-xs group"
            >
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">
                {translateEmergencyContact(c.label, language)}
              </span>
              <span className="text-sm sm:text-base font-black text-sky-700 dark:text-sky-400 mt-1 group-hover:text-sky-600">{c.number}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
