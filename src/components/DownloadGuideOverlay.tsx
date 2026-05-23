import { useEffect, useRef, useState } from "react";
import { Apple, Check, Download, Monitor, X } from "lucide-react";
import {
  DOWNLOAD_GUIDE_VIDEO_SRC,
  START_DOWNLOAD_GUIDE_EVENT,
  type DownloadPlatform,
} from "@/lib/downloadGuide";
import { supabase } from "@/integrations/supabase/client";

type DownloadGuideEvent = CustomEvent<{ platform: DownloadPlatform }>;

export default function DownloadGuideOverlay() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<DownloadPlatform>("win");
  const [progress, setProgress] = useState(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onStart = (event: Event) => {
      const detail = (event as DownloadGuideEvent).detail;
      setPlatform(detail?.platform || "win");
      setProgress(6);
      setOpen(true);
    };

    window.addEventListener(START_DOWNLOAD_GUIDE_EVENT, onStart);
    return () => window.removeEventListener(START_DOWNLOAD_GUIDE_EVENT, onStart);
  }, []);

  useEffect(() => {
    if (!open) return;

    setVideoSrc(null);
    const loadVideo = () => setVideoSrc(DOWNLOAD_GUIDE_VIDEO_SRC);
    const idleId = "requestIdleCallback" in window
      ? window.requestIdleCallback(loadVideo, { timeout: 1200 })
      : undefined;
    const videoTimer = idleId === undefined ? window.setTimeout(loadVideo, 450) : undefined;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress((current) => {
        if (current >= 98) return current;
        if (elapsed < 1300) return Math.min(64, current + 12);
        if (elapsed < 6500) return Math.min(86, current + 2.4);
        return Math.min(98, current + 0.55);
      });
    }, 400);

    return () => {
      window.clearInterval(timer);
      if (idleId !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (videoTimer !== undefined) window.clearTimeout(videoTimer);
    };
  }, [open, platform]);

  useEffect(() => {
    if (!open || !videoSrc) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [open, videoSrc]);

  if (!open) return null;

  const Icon = platform === "win" ? Monitor : Apple;
  const label = platform === "win" ? "Windows" : "Mac";

  return (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center overflow-y-auto overscroll-contain bg-[#0F1115]/88 px-3 py-5 sm:px-4 lg:items-center">
      <div className="relative my-auto w-full max-w-5xl overflow-hidden rounded-[24px] border border-white/10 bg-card text-card-foreground shadow-2xl sm:rounded-[28px]">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-on-surface-variant shadow-lg ring-1 ring-outline-variant transition hover:text-foreground"
          aria-label="Cerrar guia de descarga"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid lg:min-h-[520px] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative bg-black">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                className="h-auto max-h-[46vh] min-h-[220px] w-full object-contain lg:h-full lg:max-h-[72vh] lg:min-h-[320px]"
                controls
                autoPlay
                muted
                playsInline
                preload="metadata"
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
              />
            ) : (
              <div className="flex min-h-[220px] items-center justify-center bg-black lg:min-h-[520px]">
                <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              </div>
            )}
          </div>

          <aside className="flex flex-col justify-between gap-6 p-5 sm:p-8 lg:gap-8">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-primary">
                <Icon className="h-4 w-4" />
                Descarga para {label}
              </div>
              <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-4xl">
                Tu instalador ya se esta descargando.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-on-surface-variant">
                Mira este video mientras termina. Te muestra que Adonai esta en proceso de verificacion y que aviso puede aparecer antes de instalar.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                <span className="flex items-center gap-2 text-on-surface-variant">
                  <Download className="h-4 w-4 text-primary" />
                  Preparando archivo
                </span>
                <span className="text-primary">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-outline-variant/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-container via-primary to-[hsl(var(--success))] transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] font-semibold leading-relaxed text-on-surface-variant/75">
                La barra avanza rapido al inicio y luego mas lento para darte tiempo de ver las instrucciones importantes.
              </p>
            </div>

            <div className="space-y-3 text-sm font-semibold text-on-surface-variant">
              <div className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                <span>Si el navegador pregunta, conserva o permite el archivo.</span>
              </div>
              <div className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                <span>Cuando el instalador abra, sigue los pasos del video.</span>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-outline-variant/30">
              <p className="text-[11px] font-bold text-on-surface-variant/80">
                ¿Ya instalaste la app? Haz clic aquí para sincronizar tu cuenta actual en la app de escritorio:
              </p>
              <button
                onClick={async () => {
                  const { data } = await supabase.auth.getSession();
                  if (data.session) {
                    window.location.assign(`adonai-tasks://#access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`);
                  } else {
                    alert("No se encontró una sesión activa.");
                  }
                }}
                className="w-full h-11 bg-primary text-primary-foreground font-black text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Monitor className="w-4 h-4" />
                Sincronizar mi cuenta en la app
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
