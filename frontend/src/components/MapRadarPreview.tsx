import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Layers,
  Maximize2,
  X,
  CloudRain,
  Wind,
  Thermometer,
  CloudLightning,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  MapPin,
  Compass,
  ArrowLeft
} from 'lucide-react';
import { getTranslation } from '../i18n/translations';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapRadarPreviewProps {
  lat: number;
  lon: number;
  city: string;
  language?: string;
}

// Major Regional Observation Hubs across India
const REGIONAL_HUBS = [
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, temp: 34, cond: 'Partly Cloudy', rain: 0 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, temp: 28, cond: 'Pleasant', rain: 0 },
  { name: 'Coimbatore', lat: 11.0168, lon: 76.9558, temp: 31, cond: 'Breezy', rain: 0 },
  { name: 'Madurai', lat: 9.9252, lon: 78.1198, temp: 36, cond: 'Sunny', rain: 0 },
  { name: 'Kochi', lat: 9.9312, lon: 76.2673, temp: 30, cond: 'Light Rain', rain: 2.5 },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, temp: 32, cond: 'Clear', rain: 0 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, temp: 31, cond: 'Humid', rain: 0.8 },
  { name: 'Pune', lat: 18.5204, lon: 73.8567, temp: 29, cond: 'Partly Cloudy', rain: 0 },
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090, temp: 36, cond: 'Overcast', rain: 0 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, temp: 33, cond: 'Scattered Rain', rain: 1.2 },
  { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185, temp: 32, cond: 'Coastal Wind', rain: 0 },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873, temp: 37, cond: 'Clear', rain: 0 },
];

const BASE_MAP_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const BASE_MAP_OPTIONS: L.TileLayerOptions = {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
};

export const MapRadarPreview: React.FC<MapRadarPreviewProps> = ({
  lat,
  lon,
  city,
  language = 'en',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'rainfall' | 'infrared' | 'thermal' | 'wind'>('rainfall');
  const [radarTimestamps, setRadarTimestamps] = useState<{ time: number; path: string }[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Map refs
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewMapRef = useRef<L.Map | null>(null);
  const previewMarkerRef = useRef<L.Marker | null>(null);
  const previewOverlayRef = useRef<L.TileLayer | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewAnimRef = useRef<number | null>(null);
  const previewHubsGroupRef = useRef<L.LayerGroup | null>(null);

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const modalMapRef = useRef<L.Map | null>(null);
  const modalMarkerRef = useRef<L.Marker | null>(null);
  const modalOverlayRef = useRef<L.TileLayer | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalAnimRef = useRef<number | null>(null);
  const modalHubsGroupRef = useRef<L.LayerGroup | null>(null);

  // Handle escape key and body scroll lock for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // Fetch real-time live radar frames
  useEffect(() => {
    const fetchRadarFrames = async () => {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        const pastFrames = data?.radar?.past || [];
        if (pastFrames.length > 0) {
          setRadarTimestamps(pastFrames);
          setCurrentFrameIndex(pastFrames.length - 1);
        }
      } catch (err) {
        console.error('Radar timestamp fetch:', err);
      }
    };
    fetchRadarFrames();
  }, []);

  const createCustomIcon = (cityName: string) => {
    return L.divIcon({
      className: 'custom-weather-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="position: relative;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #0284c7, #06b6d4); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(2,132,199,0.7); border: 2.5px solid #ffffff;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div style="position: absolute; inset: -3px; border-radius: 50%; border: 2px solid #38bdf8; opacity: 0.8; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.95); color: #ffffff; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-top: 2px; border: 1.5px solid #38bdf8; white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,0.35);">
            📍 ${cityName} (Live)
          </div>
        </div>
      `,
      iconSize: [32, 48],
      iconAnchor: [16, 48],
    });
  };

  const createHubIcon = (name: string, temp: number) => {
    return L.divIcon({
      className: 'hub-weather-pill',
      html: `
        <div style="background: rgba(255, 255, 255, 0.95); color: #0f172a; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 5px rgba(0,0,0,0.12); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
          <span style="color: #0284c7; font-weight: 800;">${temp}°</span>
          <span>${name}</span>
        </div>
      `,
      iconSize: [56, 18],
      iconAnchor: [28, 9],
    });
  };

  const renderHubMarkers = (map: L.Map, groupRef: React.MutableRefObject<L.LayerGroup | null>) => {
    if (groupRef.current) {
      map.removeLayer(groupRef.current);
    }
    const group = L.layerGroup();
    REGIONAL_HUBS.forEach((hub) => {
      if (Math.abs(hub.lat - lat) > 0.05 || Math.abs(hub.lon - lon) > 0.05) {
        L.marker([hub.lat, hub.lon], { icon: createHubIcon(hub.name, hub.temp) }).addTo(group);
      }
    });
    group.addTo(map);
    groupRef.current = group;
  };

  // 1. Initialize Preview Map
  useEffect(() => {
    if (!previewContainerRef.current) return;

    if (!previewMapRef.current) {
      const map = L.map(previewContainerRef.current, {
        center: [lat, lon],
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(BASE_MAP_TILES, BASE_MAP_OPTIONS).addTo(map);

      const marker = L.marker([lat, lon], { icon: createCustomIcon(city) }).addTo(map);

      previewMapRef.current = map;
      previewMarkerRef.current = marker;
    } else {
      previewMapRef.current.setView([lat, lon], previewMapRef.current.getZoom());
      if (previewMarkerRef.current) {
        previewMarkerRef.current.setLatLng([lat, lon]);
        previewMarkerRef.current.setIcon(createCustomIcon(city));
      }
    }

    renderHubMarkers(previewMapRef.current, previewHubsGroupRef);
    applyLayerToMap(previewMapRef.current, previewOverlayRef, previewCanvasRef, previewAnimRef);

    setTimeout(() => {
      previewMapRef.current?.invalidateSize();
    }, 200);
  }, [lat, lon, city, activeLayer, currentFrameIndex, radarTimestamps]);

  // 2. Initialize Expanded Modal Map
  useEffect(() => {
    if (!isModalOpen || !modalContainerRef.current) return;

    if (!modalMapRef.current) {
      const map = L.map(modalContainerRef.current, {
        center: [lat, lon],
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(BASE_MAP_TILES, BASE_MAP_OPTIONS).addTo(map);

      const marker = L.marker([lat, lon], { icon: createCustomIcon(city) }).addTo(map);

      modalMapRef.current = map;
      modalMarkerRef.current = marker;

      map.on('move', () => {
        if (activeLayer === 'wind') startWindAnimation(modalCanvasRef, modalAnimRef);
      });
    } else {
      modalMapRef.current.setView([lat, lon], modalMapRef.current.getZoom());
      if (modalMarkerRef.current) {
        modalMarkerRef.current.setLatLng([lat, lon]);
        modalMarkerRef.current.setIcon(createCustomIcon(city));
      }
    }

    renderHubMarkers(modalMapRef.current, modalHubsGroupRef);
    applyLayerToMap(modalMapRef.current, modalOverlayRef, modalCanvasRef, modalAnimRef);

    const timer = setTimeout(() => {
      modalMapRef.current?.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, [isModalOpen, lat, lon, city, activeLayer, currentFrameIndex, radarTimestamps]);

  const applyLayerToMap = (
    map: L.Map | null,
    overlayRef: React.MutableRefObject<L.TileLayer | null>,
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
    animRef: React.MutableRefObject<number | null>
  ) => {
    if (!map) return;

    if (overlayRef.current) {
      map.removeLayer(overlayRef.current);
      overlayRef.current = null;
    }

    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    const latestFrame = radarTimestamps[currentFrameIndex] || radarTimestamps[radarTimestamps.length - 1];

    if (activeLayer === 'rainfall') {
      if (latestFrame) {
        const radarTileUrl = `https://tilecache.rainviewer.com${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;
        const layer = L.tileLayer(radarTileUrl, {
          opacity: 0.85,
          maxZoom: 18,
        }).addTo(map);
        overlayRef.current = layer;
      }
    } else if (activeLayer === 'infrared') {
      if (latestFrame) {
        const irTileUrl = `https://tilecache.rainviewer.com${latestFrame.path}/256/{z}/{x}/{y}/4/1_1.png`;
        const layer = L.tileLayer(irTileUrl, {
          opacity: 0.9,
          maxZoom: 18,
        }).addTo(map);
        overlayRef.current = layer;
      }
    } else if (activeLayer === 'thermal') {
      const thermalTileUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/2024-05-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
      const layer = L.tileLayer(thermalTileUrl, {
        opacity: 0.75,
        maxZoom: 9,
      }).addTo(map);
      overlayRef.current = layer;
    } else if (activeLayer === 'wind') {
      startWindAnimation(canvasRef, animRef);
    }
  };

  // --- Dynamic Particle Streamlines Canvas ---
  const startWindAnimation = (
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
    animRef: React.MutableRefObject<number | null>
  ) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = canvas.parentElement?.clientHeight || 300;

    const particleCount = 110;
    const particles: {
      x: number;
      y: number;
      history: { x: number; y: number }[];
      speed: number;
      angle: number;
      life: number;
      maxLife: number;
    }[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        history: [],
        speed: 1.8 + Math.random() * 2.0,
        angle: (Math.PI / 3.6) + (Math.random() * 0.3 - 0.15),
        life: Math.random() * 60,
        maxLife: 50 + Math.random() * 40,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      particles.forEach((p) => {
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 7) {
          p.history.shift();
        }

        p.x += Math.cos(p.angle) * p.speed;
        p.y -= Math.sin(p.angle) * p.speed;
        p.life++;

        if (p.history.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let i = 1; i < p.history.length; i++) {
            ctx.lineTo(p.history[i].x, p.history[i].y);
          }
          const alpha = Math.sin((p.life / p.maxLife) * Math.PI);
          ctx.strokeStyle = `rgba(2, 132, 199, ${Math.max(0, alpha * 0.85)})`;
          ctx.stroke();
        }

        if (p.life >= p.maxLife || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.history = [];
          p.life = 0;
        }
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  useEffect(() => {
    let interval: any = null;
    if (isPlaying && radarTimestamps.length > 0 && (activeLayer === 'rainfall' || activeLayer === 'infrared')) {
      interval = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % radarTimestamps.length);
      }, 750);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, radarTimestamps, activeLayer]);

  const handleZoom = (delta: number, isModal: boolean) => {
    const map = isModal ? modalMapRef.current : previewMapRef.current;
    if (map) {
      map.setZoom(map.getZoom() + delta);
    }
  };

  const handleSetIndiaView = (isModal: boolean) => {
    const map = isModal ? modalMapRef.current : previewMapRef.current;
    if (map) {
      map.setView([21.7679, 78.8718], 5);
    }
  };

  const handleResetCity = (isModal: boolean) => {
    const map = isModal ? modalMapRef.current : previewMapRef.current;
    if (map) {
      map.setView([lat, lon], 7);
    }
  };

  const formatFrameTime = (timestamp?: number) => {
    if (!timestamp) return 'Live Radar';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render Modal using createPortal to document.body
  const renderModalPortal = () => {
    if (!isModalOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex-1 flex flex-col overflow-hidden relative max-w-2xl w-full mx-auto">
          {/* Modal Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0">
            <div className="flex items-center space-x-2 min-w-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-sky-500 hover:text-white transition-colors shrink-0"
                title="Close Radar"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {activeLayer === 'rainfall'
                    ? 'Monsoon Rainfall Radar'
                    : activeLayer === 'infrared'
                    ? 'Cyclone & Infrared Satellite'
                    : activeLayer === 'thermal'
                    ? 'Surface Temperature Heatmap'
                    : 'Atmospheric Wind Streamlines'}
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                  📍 {city} Live Telemetry
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={() => handleSetIndiaView(true)}
                className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 text-[11px] font-bold border border-sky-200 dark:border-slate-700 flex items-center space-x-1 transition-colors"
              >
                <Compass className="w-3 h-3" />
                <span className="hidden sm:inline">India</span>
              </button>

              <button
                onClick={() => handleResetCity(true)}
                className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 text-[11px] font-bold border border-sky-200 dark:border-slate-700 flex items-center space-x-1 transition-colors"
              >
                <MapPin className="w-3 h-3 text-sky-500" />
                <span className="hidden sm:inline">My Area</span>
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition-colors"
                title="Close Radar"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Uniform Layer Switcher Bar */}
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="grid grid-cols-4 gap-1 w-full">
              <button
                onClick={() => setActiveLayer('rainfall')}
                className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-black transition-all ${
                  activeLayer === 'rainfall'
                    ? 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-400'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Rain</span>
              </button>

              <button
                onClick={() => setActiveLayer('infrared')}
                className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-black transition-all ${
                  activeLayer === 'infrared'
                    ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CloudLightning className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Cyclone</span>
              </button>

              <button
                onClick={() => setActiveLayer('thermal')}
                className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-black transition-all ${
                  activeLayer === 'thermal'
                    ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Heat</span>
              </button>

              <button
                onClick={() => setActiveLayer('wind')}
                className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-black transition-all ${
                  activeLayer === 'wind'
                    ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Wind className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Wind</span>
              </button>
            </div>

            {/* Playback Button if radar */}
            {(activeLayer === 'rainfall' || activeLayer === 'infrared') && radarTimestamps.length > 0 && (
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-2.5 py-1.5 rounded-xl bg-sky-500 text-white font-bold text-xs flex items-center space-x-1 shrink-0 shadow-sm hover:bg-sky-600 transition-all"
                title={isPlaying ? 'Pause radar animation' : 'Play radar animation'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="text-[10px] hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            )}
          </div>

          {/* Modal Leaflet Canvas */}
          <div className="flex-1 relative w-full h-full bg-slate-100 dark:bg-slate-950 min-h-[280px]">
            <div ref={modalContainerRef} className="w-full h-full relative z-0" />

            {activeLayer === 'wind' && (
              <canvas ref={modalCanvasRef} className="absolute inset-0 z-10 pointer-events-none w-full h-full" />
            )}

            {/* Floating Zoom controls inside modal on top-right */}
            <div className="absolute top-3 right-3 z-20 flex flex-col space-y-1.5">
              <button
                onClick={() => handleZoom(1, true)}
                className="p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-sky-500 hover:text-white shadow-xl transition-all"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(-1, true)}
                className="p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-sky-500 hover:text-white shadow-xl transition-all"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Compact Floating Legend Box inside Modal bottom */}
            <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl">
              {activeLayer === 'rainfall' && (
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-800 dark:text-slate-200">
                    <span>Monsoon Rainfall Intensity:</span>
                    <span className="text-sky-600 dark:text-sky-400">Live Doppler</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-black">
                    <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">0 mm</div>
                    <div className="p-1 rounded-lg bg-sky-200 text-sky-900">0.1 - 10 mm</div>
                    <div className="p-1 rounded-lg bg-sky-500 text-white">10 - 25 mm</div>
                    <div className="p-1 rounded-lg bg-indigo-700 text-white">&gt; 50 mm</div>
                  </div>
                </div>
              )}

              {activeLayer === 'infrared' && (
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-800 dark:text-slate-200">
                    <span>Cyclone Infrared Cloud Spectrum:</span>
                    <span className="text-rose-600 dark:text-rose-400">Core</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-black">
                    <div className="p-1 rounded-lg bg-blue-900 text-white">Warm Cloud</div>
                    <div className="p-1 rounded-lg bg-cyan-400 text-slate-900">Moderate</div>
                    <div className="p-1 rounded-lg bg-yellow-400 text-slate-900">Convective</div>
                    <div className="p-1 rounded-lg bg-rose-600 text-white">Severe Eye</div>
                  </div>
                </div>
              )}

              {activeLayer === 'thermal' && (
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-800 dark:text-slate-200">
                    <span>Surface Temperature Contours:</span>
                    <span className="text-amber-600 dark:text-amber-400">MODIS</span>
                  </div>
                  <div className="w-full h-3 rounded-lg bg-gradient-to-r from-blue-500 via-yellow-400 via-orange-500 to-rose-700" />
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 px-0.5">
                    <span>15°C</span>
                    <span>28°C</span>
                    <span>38°C</span>
                    <span>46°C+</span>
                  </div>
                </div>
              )}

              {activeLayer === 'wind' && (
                <div className="flex items-center justify-between text-[11px] font-black text-slate-800 dark:text-slate-200">
                  <div className="flex items-center space-x-1.5 text-sky-600 dark:text-sky-400">
                    <Wind className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                    <span>South-Westerly Monsoon Streamlines</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">15 — 48 km/h</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="px-4 pt-4 pb-6">
      {/* 1. Header with live status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
            Doppler Radar & Stations
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">
            {formatFrameTime(radarTimestamps[currentFrameIndex]?.time)}
          </span>
        </div>
      </div>

      {/* 2. Uniform Layer Segmented Pills */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 mb-2 shadow-xs">
        <button
          onClick={() => setActiveLayer('rainfall')}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded-xl text-[11px] font-black transition-all ${
            activeLayer === 'rainfall'
              ? 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Rain</span>
        </button>

        <button
          onClick={() => setActiveLayer('infrared')}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded-xl text-[11px] font-black transition-all ${
            activeLayer === 'infrared'
              ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CloudLightning className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Cyclone</span>
        </button>

        <button
          onClick={() => setActiveLayer('thermal')}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded-xl text-[11px] font-black transition-all ${
            activeLayer === 'thermal'
              ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Heat</span>
        </button>

        <button
          onClick={() => setActiveLayer('wind')}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded-xl text-[11px] font-black transition-all ${
            activeLayer === 'wind'
              ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wind className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Wind</span>
        </button>
      </div>

      {/* 3. Inline Map Card */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xl h-64 sm:h-72 w-full bg-slate-100 dark:bg-slate-900 z-10">
        {/* Floating Action Controls on Top Right */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex items-center space-x-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-md">
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-sky-500 hover:text-white transition-colors"
            title="Expand Fullscreen Radar"
            aria-label="Expand Map"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(1, false)}
            className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(-1, false)}
            className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Leaflet Map Preview Container */}
        <div ref={previewContainerRef} className="w-full h-full relative z-0" />

        {/* Transparent Wind Canvas overlay */}
        {activeLayer === 'wind' && (
          <canvas ref={previewCanvasRef} className="absolute inset-0 z-10 pointer-events-none w-full h-full" />
        )}
      </div>

      {/* 4. Sleek Legend below Map */}
      <div className="mt-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-[11px] shadow-xs flex items-center justify-between">
        {activeLayer === 'rainfall' && (
          <div className="flex items-center justify-between w-full">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">Monsoon Rain:</span>
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold text-[10px]">Light</span>
              <span className="px-2 py-0.5 rounded-md bg-sky-500 text-white font-bold text-[10px]">Mod</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-700 text-white font-bold text-[10px]">Heavy</span>
            </div>
          </div>
        )}

        {activeLayer === 'infrared' && (
          <div className="flex items-center justify-between w-full">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">Cyclone Eye:</span>
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-md bg-cyan-400 text-slate-900 font-bold text-[10px]">Outer</span>
              <span className="px-2 py-0.5 rounded-md bg-yellow-400 text-slate-900 font-bold text-[10px]">Intense</span>
              <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px]">Eye Core</span>
            </div>
          </div>
        )}

        {activeLayer === 'thermal' && (
          <div className="flex items-center justify-between w-full">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">Heat Range:</span>
            <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-yellow-400 via-orange-500 to-rose-600 text-white font-bold text-[10px]">
              22°C — 46°C
            </span>
          </div>
        )}

        {activeLayer === 'wind' && (
          <div className="flex items-center justify-between w-full font-bold text-sky-600 dark:text-sky-400">
            <div className="flex items-center space-x-1.5">
              <Wind className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <span>South-Westerly Streamlines</span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">10-45 km/h</span>
          </div>
        )}
      </div>

      {/* 5. Render Portal Modal */}
      {renderModalPortal()}
    </div>
  );
};
