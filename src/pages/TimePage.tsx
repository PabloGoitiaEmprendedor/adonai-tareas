import { useEffect, useMemo, useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Moon,
  Smartphone,
  Sparkles,
  Target,
} from 'lucide-react';

type RangeKey = 'day' | 'week' | 'month' | 'year';

type NativeUsageItem = {
  name: string;
  minutes: number;
  change?: number;
  tone?: UsageItem['tone'];
};

type NativeUsageDevice = {
  id: 'mobile' | 'desktop';
  title?: string;
  subtitle?: string;
  totalMinutes?: number;
  previousDelta?: number;
  recommendation?: string;
  items?: NativeUsageItem[];
};

type NativeUsagePayload = {
  source?: string;
  generatedAt?: string;
  range?: RangeKey;
  permissionGranted?: boolean;
  devices?: NativeUsageDevice[];
};

type AdonaiUsagePlugin = {
  getUsage: (options: { range: RangeKey }) => Promise<NativeUsagePayload>;
  openUsageSettings: () => Promise<{ opened: boolean }>;
};

type UsageItem = {
  name: string;
  minutes: number;
  change: number;
  tone: 'ink' | 'blue' | 'amber' | 'red';
};

type DeviceUsage = {
  id: 'mobile' | 'desktop';
  title: string;
  subtitle: string;
  totalMinutes: number;
  previousDelta: number;
  recommendation: string;
  items: UsageItem[];
};

const AdonaiUsage = registerPlugin<AdonaiUsagePlugin>('AdonaiUsage');

const rangeLabels: Record<RangeKey, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mes',
  year: 'Ano',
};

const rangeContext: Record<RangeKey, { title: string; compare: string; days: number }> = {
  day: { title: 'Hoy', compare: 'ayer', days: 1 },
  week: { title: 'Esta semana', compare: 'la semana pasada', days: 7 },
  month: { title: 'Este mes', compare: 'el mes pasado', days: 30 },
  year: { title: 'Este ano', compare: 'el ano pasado', days: 365 },
};

const baseDevices: Record<RangeKey, DeviceUsage[]> = {
  day: [
    {
      id: 'mobile',
      title: 'Movil',
      subtitle: 'Telefono y tablet',
      totalMinutes: 322,
      previousDelta: -38,
      recommendation: 'Instagram esta bajando. Mantén el primer desbloqueo despues de terminar tus tareas clave.',
      items: [
        { name: 'Instagram', minutes: 72, change: -24, tone: 'red' },
        { name: 'WhatsApp', minutes: 68, change: 12, tone: 'ink' },
        { name: 'TikTok', minutes: 46, change: -18, tone: 'amber' },
        { name: 'Safari', minutes: 39, change: 8, tone: 'blue' },
        { name: 'YouTube', minutes: 28, change: -11, tone: 'red' },
        { name: 'Adonai', minutes: 24, change: 9, tone: 'blue' },
      ],
    },
    {
      id: 'desktop',
      title: 'PC',
      subtitle: 'Ordenador y navegador',
      totalMinutes: 246,
      previousDelta: -21,
      recommendation: 'Chrome concentra el mayor bloque. Separa trabajo real de pestanas de pausa para reducir ruido.',
      items: [
        { name: 'Chrome', minutes: 86, change: -14, tone: 'blue' },
        { name: 'VS Code', minutes: 70, change: 18, tone: 'ink' },
        { name: 'Notion', minutes: 42, change: 5, tone: 'blue' },
        { name: 'YouTube', minutes: 26, change: -19, tone: 'red' },
        { name: 'WhatsApp Web', minutes: 22, change: 6, tone: 'amber' },
      ],
    },
  ],
  week: [
    {
      id: 'mobile',
      title: 'Movil',
      subtitle: 'Telefono y tablet',
      totalMinutes: 1790,
      previousDelta: -186,
      recommendation: 'Las redes bajaron casi tres horas. Protege ese avance con un limite suave por la tarde.',
      items: [
        { name: 'Instagram', minutes: 430, change: -96, tone: 'red' },
        { name: 'WhatsApp', minutes: 384, change: 42, tone: 'ink' },
        { name: 'TikTok', minutes: 251, change: -74, tone: 'amber' },
        { name: 'Safari', minutes: 228, change: 31, tone: 'blue' },
        { name: 'YouTube', minutes: 176, change: -62, tone: 'red' },
      ],
    },
    {
      id: 'desktop',
      title: 'PC',
      subtitle: 'Ordenador y navegador',
      totalMinutes: 1535,
      previousDelta: 72,
      recommendation: 'El PC subio por trabajo profundo. Mantén YouTube fuera de los bloques de foco.',
      items: [
        { name: 'Chrome', minutes: 512, change: 35, tone: 'blue' },
        { name: 'VS Code', minutes: 486, change: 112, tone: 'ink' },
        { name: 'Notion', minutes: 238, change: 40, tone: 'blue' },
        { name: 'YouTube', minutes: 164, change: -43, tone: 'red' },
        { name: 'WhatsApp Web', minutes: 135, change: -29, tone: 'amber' },
      ],
    },
  ],
  month: [
    {
      id: 'mobile',
      title: 'Movil',
      subtitle: 'Telefono y tablet',
      totalMinutes: 7240,
      previousDelta: -520,
      recommendation: 'Tu tendencia mensual mejora. El siguiente paso es bajar 10 minutos diarios de redes.',
      items: [
        { name: 'Instagram', minutes: 1810, change: -300, tone: 'red' },
        { name: 'WhatsApp', minutes: 1640, change: 180, tone: 'ink' },
        { name: 'TikTok', minutes: 970, change: -210, tone: 'amber' },
        { name: 'Safari', minutes: 820, change: 120, tone: 'blue' },
        { name: 'YouTube', minutes: 710, change: -190, tone: 'red' },
      ],
    },
    {
      id: 'desktop',
      title: 'PC',
      subtitle: 'Ordenador y navegador',
      totalMinutes: 6180,
      previousDelta: -110,
      recommendation: 'El ordenador esta estable. Conviene limitar interrupciones, no reducir trabajo real.',
      items: [
        { name: 'Chrome', minutes: 2150, change: -80, tone: 'blue' },
        { name: 'VS Code', minutes: 1780, change: 240, tone: 'ink' },
        { name: 'Notion', minutes: 910, change: 150, tone: 'blue' },
        { name: 'YouTube', minutes: 710, change: -210, tone: 'red' },
        { name: 'WhatsApp Web', minutes: 630, change: -110, tone: 'amber' },
      ],
    },
  ],
  year: [
    {
      id: 'mobile',
      title: 'Movil',
      subtitle: 'Telefono y tablet',
      totalMinutes: 84120,
      previousDelta: -4200,
      recommendation: 'El ano va en mejor direccion. Mantén limites por app para que el progreso no dependa de fuerza de voluntad.',
      items: [
        { name: 'Instagram', minutes: 21400, change: -1900, tone: 'red' },
        { name: 'WhatsApp', minutes: 18800, change: 2100, tone: 'ink' },
        { name: 'TikTok', minutes: 11200, change: -2600, tone: 'amber' },
        { name: 'Safari', minutes: 9800, change: 900, tone: 'blue' },
        { name: 'YouTube', minutes: 8200, change: -1800, tone: 'red' },
      ],
    },
    {
      id: 'desktop',
      title: 'PC',
      subtitle: 'Ordenador y navegador',
      totalMinutes: 77360,
      previousDelta: 3100,
      recommendation: 'El aumento viene del trabajo. El objetivo no es usar menos PC, sino usarlo con menos fuga.',
      items: [
        { name: 'Chrome', minutes: 26800, change: 700, tone: 'blue' },
        { name: 'VS Code', minutes: 22400, change: 4200, tone: 'ink' },
        { name: 'Notion', minutes: 10300, change: 1200, tone: 'blue' },
        { name: 'YouTube', minutes: 9100, change: -2300, tone: 'red' },
        { name: 'WhatsApp Web', minutes: 8760, change: -700, tone: 'amber' },
      ],
    },
  ],
};

const toneClass: Record<UsageItem['tone'], string> = {
  ink: 'bg-[#111827]',
  blue: 'bg-[#5B7CFA]',
  amber: 'bg-[#F4B860]',
  red: 'bg-[#EB5757]',
};

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (h >= 100) return `${Math.round(h)}h`;
  return `${h}h ${m ? `${String(m).padStart(2, '0')}m` : ''}`.trim();
};

const formatDelta = (minutes: number, compare: string) => {
  const direction = minutes <= 0 ? 'menos' : 'mas';
  return `${formatTime(Math.abs(minutes))} ${direction} que ${compare}`;
};

type CapacitorWindow = Window & {
  Capacitor?: {
    isNative?: boolean;
    isNativePlatform?: () => boolean;
  };
};

const isCapacitorNative = () => {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as CapacitorWindow).Capacitor;
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === 'function') return capacitor.isNativePlatform();
  return Boolean(capacitor.isNative);
};

const isUsageTone = (tone: unknown): tone is UsageItem['tone'] =>
  tone === 'ink' || tone === 'blue' || tone === 'amber' || tone === 'red';

const fallbackToneForApp = (name: string): UsageItem['tone'] => {
  const lower = name.toLowerCase();
  if (lower.includes('youtube') || lower.includes('tiktok') || lower.includes('instagram')) return 'red';
  if (lower.includes('whatsapp') || lower.includes('telegram') || lower.includes('discord')) return 'amber';
  if (lower.includes('chrome') || lower.includes('edge') || lower.includes('opera') || lower.includes('firefox') || lower.includes('safari')) return 'blue';
  return 'ink';
};

const normalizeNativeDevice = (native: NativeUsageDevice, fallback: DeviceUsage): DeviceUsage => {
  const items = Array.isArray(native.items)
    ? native.items
        .filter((item) => item && item.name && Number.isFinite(item.minutes) && item.minutes > 0)
        .map((item) => ({
          name: item.name.slice(0, 64),
          minutes: Math.max(0, Math.round(item.minutes)),
          change: Math.round(item.change ?? 0),
          tone: isUsageTone(item.tone) ? item.tone : fallbackToneForApp(item.name),
        }))
        .sort((a, b) => b.minutes - a.minutes)
    : [];

  const totalMinutes = Number.isFinite(native.totalMinutes)
    ? Math.max(0, Math.round(native.totalMinutes || 0))
    : items.reduce((sum, item) => sum + item.minutes, 0);

  return {
    ...fallback,
    title: native.title || fallback.title,
    subtitle: native.subtitle || fallback.subtitle,
    totalMinutes,
    previousDelta: Math.round(native.previousDelta ?? 0),
    recommendation:
      native.recommendation ||
      (items[0]
        ? `${items[0].name} concentra mas tiempo. Ajusta un bloque pequeno primero.`
        : 'Sin datos reales todavia. Mantener la app abierta ayuda a medir con mas precision.'),
    items,
  };
};

const emptyRealDevice = (fallback: DeviceUsage, recommendation: string): DeviceUsage => ({
  ...fallback,
  totalMinutes: 0,
  previousDelta: 0,
  recommendation,
  items: [],
});

const mergeNativePayloads = (payloads: NativeUsagePayload[]): NativeUsagePayload => {
  const devices = payloads.flatMap((payload) => payload.devices || []);
  const androidPayload = payloads.find((payload) => payload.source === 'android-usage-stats');
  return {
    source: payloads.map((payload) => payload.source).filter(Boolean).join('+'),
    generatedAt: new Date().toISOString(),
    range: payloads[0]?.range,
    permissionGranted: androidPayload?.permissionGranted,
    devices,
  };
};

const DeviceSheet = ({
  device,
  compare,
  expanded,
  onToggle,
}: {
  device: DeviceUsage;
  compare: string;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const max = Math.max(...device.items.map((item) => item.minutes), 1);
  const visibleItems = expanded ? device.items : device.items.slice(0, 3);
  const DeviceIcon = device.id === 'mobile' ? Smartphone : Laptop;
  const goodDelta = device.previousDelta <= 0;

  return (
    <section className="rounded-[30px] border border-black/[0.06] bg-white/72 p-4 shadow-[0_18px_55px_rgba(17,24,39,0.07)] backdrop-blur-2xl sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[#111827] text-white shadow-[0_12px_28px_rgba(17,24,39,0.16)]">
            <DeviceIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[24px] font-black leading-none tracking-[-0.04em] text-[#111827]">{device.title}</h2>
            <p className="mt-1 text-xs font-bold text-[#7D8497]">{device.subtitle}</p>
          </div>
        </div>
        <div className="rounded-[20px] bg-[#F7F3E9]/70 px-3 py-2 text-right shadow-inner">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7D8497]">Total</p>
          <p className="mt-0.5 text-[20px] font-black leading-none text-[#111827]">{formatTime(device.totalMinutes)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className={`rounded-[20px] px-3 py-2 ${goodDelta ? 'bg-[#E9F7EF]' : 'bg-[#FFF4D8]'}`}>
          <p className={`text-xs font-black ${goodDelta ? 'text-[#2b7c51]' : 'text-[#8A5A13]'}`}>
            {formatDelta(device.previousDelta, compare)}
          </p>
        </div>
        <p className="text-xs font-semibold leading-relaxed text-[#3d4655] sm:max-w-[260px]">{device.recommendation}</p>
      </div>

      <div className="mt-5 space-y-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => (
            <div key={item.name} className="rounded-[20px] border border-black/[0.035] bg-[#FCF8FA]/78 px-3 py-3 shadow-[0_8px_22px_rgba(17,24,39,0.045)]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#111827]">{index + 1}. {item.name}</p>
                  <p className="text-[11px] font-bold text-[#7D8497]">{formatDelta(item.change, compare)}</p>
                </div>
                <span className="text-sm font-black text-[#111827]">{formatTime(item.minutes)}</span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-full bg-[#e8e4db]">
                <div
                  className={`h-full rounded-full ${toneClass[item.tone]}`}
                  style={{ width: `${Math.max(8, Math.round((item.minutes / max) * 100))}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-black/[0.08] bg-white/52 px-4 py-5 text-center">
            <p className="text-sm font-black text-[#111827]">Sin datos reales todavia</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#7D8497]">
              Esta fuente empieza a llenarse cuando la app instalada tiene permiso y permanece abierta.
            </p>
          </div>
        )}
      </div>

      {device.items.length > 3 && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#18202e]/10 bg-white/70 text-sm font-black text-[#2A50CD] transition active:scale-[0.99]"
        >
          {expanded ? 'Ver menos' : 'Ver mas'}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  );
};

const FocusJar = ({ percent }: { percent: number }) => {
  const waterHeight = Math.min(88, Math.max(10, percent));

  return (
    <div className="relative mx-auto h-[330px] w-[250px] sm:h-[390px] sm:w-[300px]">
      <div className="absolute left-1/2 top-0 h-6 w-32 -translate-x-1/2 rounded-full bg-[#d8bc96] shadow-[0_8px_20px_rgba(80,55,27,0.16)]" />
      <div className="absolute left-1/2 top-6 h-12 w-[108px] -translate-x-1/2 border-x border-[#d7d1c8]" />
      <div className="absolute left-1/2 top-12 h-[270px] w-[220px] -translate-x-1/2 overflow-hidden rounded-[40px] border border-black/10 bg-white/38 shadow-[0_30px_80px_rgba(25,25,25,0.08)] backdrop-blur-xl sm:h-[320px] sm:w-[262px]">
        <div
          className="absolute inset-x-0 bottom-0 border-t border-black/15 bg-[#cdd8f8]/88 transition-[height] duration-300"
          style={{ height: `${waterHeight}%` }}
        />
        <div
          className="absolute inset-x-0 bottom-0 opacity-80"
          style={{
            height: `${waterHeight}%`,
            backgroundImage: 'radial-gradient(circle, rgba(74,112,215,0.58) 1.5px, transparent 1.8px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute left-14 top-20 h-3 w-3 rounded-full bg-black/12 blur-[1px]" />
        <div className="absolute right-16 top-32 h-2 w-2 rounded-full bg-black/10 blur-[1px]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-16">
          <p className="text-[34px] font-black leading-none text-[#070707]">{Math.round(percent)}%</p>
          <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#1b1b1d]/78">
            Tiempo despierto
          </p>
        </div>
      </div>
    </div>
  );
};

const LimitsSheet = ({
  totalLimit,
  appLimit,
  onTotalLimitChange,
  onAppLimitChange,
}: {
  totalLimit: number;
  appLimit: number;
  onTotalLimitChange: (value: number) => void;
  onAppLimitChange: (value: number) => void;
}) => (
  <section className="rounded-[30px] border border-black/[0.06] bg-white/72 p-5 shadow-[0_18px_55px_rgba(17,24,39,0.07)] backdrop-blur-2xl">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[17px] bg-[#111827] text-white">
        <Target className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-[22px] font-black leading-none tracking-[-0.04em] text-[#111827]">Limites</h2>
        <p className="mt-1 text-xs font-bold text-[#7D8497]">Objetivos suaves, no castigos.</p>
      </div>
    </div>

    <div className="mt-5 space-y-4">
      <div className="rounded-[24px] bg-[#F7F3E9]/72 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-[#111827]">Pantalla diaria</p>
          <p className="text-sm font-black text-[#2A50CD]">{formatTime(totalLimit)}</p>
        </div>
        <input
          type="range"
          min={120}
          max={720}
          step={15}
          value={totalLimit}
          onChange={(event) => onTotalLimitChange(Number(event.target.value))}
          className="mt-3 w-full accent-[#2A50CD]"
          aria-label="Limite diario de pantalla"
        />
      </div>

      <div className="rounded-[24px] bg-[#F7F3E9]/72 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-[#111827]">Maximo por app</p>
          <p className="text-sm font-black text-[#2A50CD]">{formatTime(appLimit)}</p>
        </div>
        <input
          type="range"
          min={15}
          max={180}
          step={15}
          value={appLimit}
          onChange={(event) => onAppLimitChange(Number(event.target.value))}
          className="mt-3 w-full accent-[#2A50CD]"
          aria-label="Limite por app"
        />
      </div>

      <div className="rounded-[24px] bg-[#E9F7EF] p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#2b7c51]" />
          <p className="text-sm font-bold leading-relaxed text-[#2b7c51]">
            Meta recomendada: baja 20 minutos de redes por dia durante 7 dias. Es suficiente para sentir cambio sin romper tu rutina.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const TimePage = () => {
  const [range, setRange] = useState<RangeKey>('day');
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [sleepHours, setSleepHours] = useState(7);
  const [totalLimit, setTotalLimit] = useState(360);
  const [appLimit, setAppLimit] = useState(60);
  const [nativeUsage, setNativeUsage] = useState<NativeUsagePayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUsage = async () => {
      const payloads: NativeUsagePayload[] = [];

      try {
        const desktopUsage = await window.electronAPI?.getTimeUsage?.({ range });
        if (desktopUsage) payloads.push(desktopUsage);
      } catch {
        // Native usage is best-effort; the UI falls back to the current available source.
      }

      if (isCapacitorNative()) {
        try {
          const mobileUsage = await AdonaiUsage.getUsage({ range });
          if (mobileUsage) payloads.push(mobileUsage);
        } catch {
          // The Android bridge can fail before the native plugin is available.
        }
      }

      if (!cancelled) {
        setNativeUsage(payloads.length > 0 ? mergeNativePayloads(payloads) : null);
      }
    };

    loadUsage();
    const interval = window.setInterval(loadUsage, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [range]);

  const devices = useMemo(() => {
    const fallbackDevices = baseDevices[range];
    if (!nativeUsage) return fallbackDevices;

    const nativeById = new Map((nativeUsage.devices || []).map((device) => [device.id, device]));
    return fallbackDevices.map((fallback) => {
      const native = nativeById.get(fallback.id);
      if (native) return normalizeNativeDevice(native, fallback);
      if (fallback.id === 'mobile') {
        return emptyRealDevice(
          fallback,
          nativeUsage.permissionGranted === false
            ? 'Android necesita el permiso Acceso de uso para mostrar consumo real de apps.'
            : 'Abre Adonai en Android con el permiso de uso activo para sincronizar consumo movil real.',
        );
      }
      return emptyRealDevice(
        fallback,
        'Abre Adonai en la app de escritorio para recolectar consumo real de PC.',
      );
    });
  }, [nativeUsage, range]);

  const context = rangeContext[range];
  const totalScreenMinutes = devices.reduce((sum, device) => sum + device.totalMinutes, 0);
  const awakeMinutes = Math.max(1, (24 - sleepHours) * 60 * context.days);
  const screenPercent = Math.min(100, (totalScreenMinutes / awakeMinutes) * 100);
  const mobilePermissionMissing = nativeUsage?.permissionGranted === false;
  const usageStatusText = useMemo(() => {
    if (!nativeUsage) return 'Datos de muestra en navegador. En escritorio y Android instalados se usan datos reales.';
    const ids = new Set((nativeUsage.devices || []).map((device) => device.id));
    if (mobilePermissionMissing) return 'Movil pendiente: activa Acceso de uso en Android.';
    if (ids.has('mobile') && ids.has('desktop')) return 'Movil y PC conectados con datos reales.';
    if (ids.has('desktop')) return 'PC conectado con datos reales. Movil se completa desde Android.';
    if (ids.has('mobile')) return 'Movil conectado con datos reales. PC se completa desde escritorio.';
    return 'Esperando permisos para leer datos reales.';
  }, [mobilePermissionMissing, nativeUsage]);

  const openUsagePermission = async () => {
    try {
      await AdonaiUsage.openUsageSettings();
    } catch {
      // Android-only action.
    }
  };

  const rangeSummary = useMemo(() => {
    if (range === 'day') return '12 Jun';
    if (range === 'week') return 'Semana actual';
    if (range === 'month') return 'Junio';
    return '2026';
  }, [range]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] px-3 pb-28 pt-3 text-[#111827] lg:pl-[112px] lg:pr-8 lg:pb-10 lg:pt-8">
      <div className="mx-auto w-full max-w-[1260px] overflow-hidden rounded-[34px] border border-black/[0.06] bg-[#F7F3E9]/86 p-4 shadow-[0_26px_80px_rgba(17,24,39,0.10)] backdrop-blur-2xl sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7D8497]">Tiempo</p>
            <h1 className="mt-1 text-[40px] font-black leading-none tracking-[-0.055em] text-[#111827] sm:text-[54px]">
              {context.title}
            </h1>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-[#3d4655]">
              Ve sin ruido donde se va tu tiempo entre movil y PC. Primero entiende, luego ajusta.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-black/[0.06] bg-white/70 px-3 py-2 text-[11px] font-black text-[#3d4655] shadow-sm backdrop-blur-xl">
                {usageStatusText}
              </span>
              {mobilePermissionMissing && (
                <button
                  type="button"
                  onClick={openUsagePermission}
                  className="rounded-full bg-[#111827] px-3 py-2 text-[11px] font-black text-white shadow-sm transition active:scale-[0.98]"
                >
                  Activar permiso
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 items-center rounded-full border border-black/[0.06] bg-white/72 p-1 shadow-sm backdrop-blur-xl">
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-[#3d4655]" aria-label="Dia anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[110px] text-center text-xs font-black uppercase tracking-[0.08em] text-[#111827]">{rangeSummary}</span>
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-[#3d4655]" aria-label="Dia siguiente">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 rounded-full border border-black/[0.06] bg-white/72 p-1 shadow-sm backdrop-blur-xl">
              {(Object.keys(rangeLabels) as RangeKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setRange(key);
                    setMobileExpanded(false);
                    setDesktopExpanded(false);
                  }}
                  className={`h-9 rounded-full px-3 text-[11px] font-black transition ${range === key ? 'bg-[#111827] text-white shadow-sm' : 'text-[#3d4655]'}`}
                >
                  {rangeLabels[key]}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-4">
            <DeviceSheet
              device={devices[0]}
              compare={context.compare}
              expanded={mobileExpanded}
              onToggle={() => setMobileExpanded((value) => !value)}
            />
            <DeviceSheet
              device={devices[1]}
              compare={context.compare}
              expanded={desktopExpanded}
              onToggle={() => setDesktopExpanded((value) => !value)}
            />
          </div>

          <div className="space-y-4">
            <section className="rounded-[32px] border border-black/[0.06] bg-white/72 p-5 text-center shadow-[0_18px_55px_rgba(17,24,39,0.07)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3 text-left">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7D8497]">Frasco 24h</p>
                  <h2 className="mt-1 text-[26px] font-black leading-none tracking-[-0.045em] text-[#111827]">Tiempo despierto</h2>
                </div>
                <div className="rounded-[20px] bg-[#111827] px-3 py-2 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/60">Pantalla</p>
                  <p className="text-lg font-black leading-none">{formatTime(totalScreenMinutes)}</p>
                </div>
              </div>

              <div className="mt-5">
                <FocusJar percent={screenPercent} />
              </div>

              <div className="mt-2 rounded-[24px] bg-[#F7F3E9]/76 p-4 text-left">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-[#7D8497]" />
                    <p className="text-sm font-black text-[#111827]">Duermo aprox.</p>
                  </div>
                  <p className="text-sm font-black text-[#2A50CD]">{sleepHours}h</p>
                </div>
                <input
                  type="range"
                  min={4}
                  max={10}
                  step={0.5}
                  value={sleepHours}
                  onChange={(event) => setSleepHours(Number(event.target.value))}
                  className="mt-3 w-full accent-[#2A50CD]"
                  aria-label="Horas aproximadas de sueno"
                />
                <p className="mt-2 text-xs font-semibold leading-relaxed text-[#3d4655]">
                  Motivacion: hoy ya sabes cuanto ocupa la pantalla. El siguiente paso es bajar solo un bloque pequeno, no cambiar toda tu vida de golpe.
                </p>
              </div>
            </section>

            <LimitsSheet
              totalLimit={totalLimit}
              appLimit={appLimit}
              onTotalLimitChange={setTotalLimit}
              onAppLimitChange={setAppLimit}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default TimePage;
