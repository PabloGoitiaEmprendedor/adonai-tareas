import { useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, Volume2, X } from 'lucide-react';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  completePostOnboardingVideoTutorial,
  shouldShowPostOnboardingVideoTutorial,
  VIDEO_TUTORIAL_SRC,
} from '@/lib/videoTutorial';

export default function PostOnboardingVideoTutorial() {
  const [open, setOpen] = useState(false);
  const [canActivateSound, setCanActivateSound] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const openTutorial = (source: 'post_onboarding' | 'settings') => {
      setOpen(true);
      setCanActivateSound(true);
      setHasEnded(false);
      trackAnalyticsEvent('post_onboarding_video_opened', { source });
    };

    const handleManualOpen = () => openTutorial('settings');
    window.addEventListener('adonai:open-video-tutorial', handleManualOpen);

    if (!shouldShowPostOnboardingVideoTutorial()) {
      return () => window.removeEventListener('adonai:open-video-tutorial', handleManualOpen);
    }

    const timer = window.setTimeout(() => {
      openTutorial('post_onboarding');
    }, 450);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('adonai:open-video-tutorial', handleManualOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.muted = true;
    setProgress(0);
    void video.play().catch(() => setIsPlaying(false));
  }, [open]);

  if (!open) return null;

  const closeTutorial = (reason: 'finished' | 'dismissed' | 'cta') => {
    completePostOnboardingVideoTutorial();
    setOpen(false);
    trackAnalyticsEvent('post_onboarding_video_closed', {
      source: 'post_onboarding',
      reason,
    });
  };

  const activateSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    setCanActivateSound(false);
    void video.play().catch(() => undefined);
    trackAnalyticsEvent('post_onboarding_video_sound_enabled', {
      source: 'post_onboarding',
    });
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play().catch(() => undefined);
      return;
    }

    video.pause();
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center overflow-y-auto overscroll-contain bg-background/92 px-3 py-4 backdrop-blur-2xl sm:px-5 lg:items-center">
      <div className="relative my-auto w-full max-w-6xl overflow-hidden rounded-[26px] border border-primary/20 bg-surface text-foreground shadow-2xl shadow-primary/10 sm:rounded-[34px]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-[hsl(var(--success))]/18 blur-3xl" />

        <button
          type="button"
          onClick={() => closeTutorial('dismissed')}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-surface/85 text-on-surface-variant shadow-lg ring-1 ring-outline-variant/70 backdrop-blur-xl transition hover:bg-surface-container-low hover:text-foreground sm:right-5 sm:top-5"
          aria-label="Cerrar tutorial"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative grid lg:grid-cols-[1.42fr_0.58fr]">
          <section className="relative flex flex-col bg-[#070A0F]">
            <video
              ref={videoRef}
              src={VIDEO_TUTORIAL_SRC}
              className="h-auto max-h-[54vh] min-h-[240px] w-full flex-1 bg-[#070A0F] object-contain lg:max-h-[78vh] lg:min-h-[536px]"
              autoPlay
              muted
              playsInline
              preload="metadata"
              disablePictureInPicture
              onClick={togglePlayback}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPlaying={() => setIsPlaying(true)}
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                if (!video.duration || Number.isNaN(video.duration)) return;
                const linearProgress = Math.min(video.currentTime / video.duration, 1);
                const easedProgress = 1 - Math.pow(1 - linearProgress, 2.6);
                setProgress(easedProgress * 100);
              }}
              onEnded={() => {
                setHasEnded(true);
                setProgress(100);
                trackAnalyticsEvent('post_onboarding_video_completed', {
                  source: 'post_onboarding',
                });
              }}
            />

            <button
              type="button"
              onClick={togglePlayback}
              className={`absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 ring-8 ring-primary/15 transition duration-200 hover:scale-105 active:scale-95 ${
                isPlaying ? 'opacity-0 hover:opacity-100 focus-visible:opacity-100' : 'opacity-100'
              }`}
              aria-label={isPlaying ? 'Pausar video' : 'Reproducir video'}
            >
              {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="ml-1 h-9 w-9 fill-current" />}
            </button>

            {canActivateSound && (
              <button
                type="button"
                onClick={activateSound}
                className="absolute bottom-8 left-4 flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-xs font-black text-foreground shadow-xl shadow-black/20 ring-1 ring-white/10 transition hover:scale-[1.02] active:scale-95"
              >
                <Volume2 className="h-4 w-4" />
                Activar sonido
              </button>
            )}

            <div className="h-3 w-full bg-white/10">
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-primary via-primary-container to-[hsl(var(--success))] transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>

          <aside className="relative flex flex-col justify-between gap-7 overflow-hidden bg-surface p-5 text-foreground sm:p-8 lg:min-h-[560px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--success))] to-[hsl(var(--warning))]" />

            <div>
              <h2 className="max-w-[9ch] text-4xl font-black leading-[0.92] tracking-tight text-foreground sm:text-5xl lg:text-5xl">
                &iquest;Como se usa?
              </h2>

              <p className="mt-6 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-black leading-relaxed text-primary">
                Este video aparece una sola vez.
              </p>

              <p className="mt-5 border-l-4 border-[hsl(var(--success))] pl-4 text-sm font-semibold leading-relaxed text-on-surface-variant">
                Si estas en movil, no te preocupes, es exactamente lo mismo, la unica diferencia es que el mini cuaderno solo esta disponible para ordenador.
              </p>
            </div>

            <button
              type="button"
              onClick={() => closeTutorial(hasEnded ? 'finished' : 'cta')}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-black text-primary-foreground shadow-xl shadow-primary/25 transition hover:translate-y-[-1px] hover:bg-primary-container active:translate-y-0"
            >
              <Check className="h-5 w-5" />
              Entrar
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
