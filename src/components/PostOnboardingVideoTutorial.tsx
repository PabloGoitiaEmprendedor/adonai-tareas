import { useEffect, useRef, useState } from 'react';
import { Check, VolumeX, X } from 'lucide-react';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  completePostOnboardingVideoTutorial,
  shouldShowPostOnboardingVideoTutorial,
  VIDEO_TUTORIAL_SRC,
} from '@/lib/videoTutorial';

export default function PostOnboardingVideoTutorial() {
  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const openTutorial = (source: 'post_onboarding' | 'settings') => {
      setOpen(true);
      setActivated(false);
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

  if (!open) return null;

  const closeTutorial = (reason: 'finished' | 'dismissed' | 'cta') => {
    completePostOnboardingVideoTutorial();
    setOpen(false);
    trackAnalyticsEvent('post_onboarding_video_closed', {
      source: 'post_onboarding',
      reason,
    });
  };

  const handleActivateSound = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    try {
      await video.play();
      setActivated(true);
      trackAnalyticsEvent('post_onboarding_video_sound_enabled', {
        source: 'post_onboarding',
      });
    } catch (err) {
      console.error("Error playing video:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center overflow-y-auto overscroll-contain bg-background/92 px-3 py-4 backdrop-blur-2xl sm:px-5 lg:items-center">
      <div className="relative my-auto w-full max-w-6xl overflow-hidden rounded-[26px] border border-primary/20 bg-surface text-foreground shadow-2xl shadow-primary/10 sm:rounded-[34px]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-[hsl(var(--success))]/18 blur-3xl" />

        {/* Close Button is always responsive and clickable immediately */}
        <button
          type="button"
          onClick={() => closeTutorial('dismissed')}
          className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-surface/85 text-on-surface-variant shadow-lg ring-1 ring-outline-variant/70 backdrop-blur-xl transition hover:bg-surface-container-low hover:text-foreground sm:right-5 sm:top-5"
          aria-label="Cerrar tutorial"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative grid lg:grid-cols-[1.42fr_0.58fr]">
          <section className="relative flex flex-col bg-[#070A0F] min-h-[240px] lg:min-h-[536px] justify-center items-center overflow-hidden">
            <video
              ref={videoRef}
              src={VIDEO_TUTORIAL_SRC}
              className="h-auto max-h-[54vh] min-h-[240px] w-full flex-1 bg-[#070A0F] object-contain lg:max-h-[78vh] lg:min-h-[536px]"
              playsInline
              preload="metadata"
              controls={activated}
              disablePictureInPicture
              onEnded={() => {
                setHasEnded(true);
                trackAnalyticsEvent('post_onboarding_video_completed', {
                  source: 'post_onboarding',
                });
              }}
            />

            {!activated && (
              <button
                type="button"
                onClick={handleActivateSound}
                className="absolute inset-0 flex flex-col cursor-pointer items-center justify-center bg-black/40 backdrop-blur-[1px] transition hover:bg-black/50 z-10"
              >
                <div className="relative flex flex-col items-center gap-4">
                  {/* Decorative pulsing circles for premium feel */}
                  <div className="absolute -inset-4 rounded-full bg-white/10 animate-ping opacity-75" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl transition hover:scale-105 active:scale-95 duration-200">
                    <VolumeX className="h-9 w-9 text-[#070A0F]" />
                  </div>
                  <span className="text-white text-xs font-black uppercase tracking-[0.2em] bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                    Hacer clic para escuchar
                  </span>
                </div>
              </button>
            )}
          </section>

          <aside className="relative flex flex-col justify-between gap-7 overflow-hidden bg-surface p-5 text-foreground sm:p-8 lg:min-h-[560px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--success))] to-[hsl(var(--warning))]" />

            <div>
              <h2 className="max-w-[9ch] text-4xl font-black leading-[0.92] tracking-tight text-foreground sm:text-5xl lg:text-5xl">
                ¿Cómo se usa?
              </h2>

              <p className="mt-6 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-black leading-relaxed text-primary">
                Este video aparece una sola vez.
              </p>

              <p className="mt-5 border-l-4 border-[hsl(var(--success))] pl-4 text-sm font-semibold leading-relaxed text-on-surface-variant">
                Si estás en móvil, no te preocupes, es exactamente lo mismo, la única diferencia es que el mini cuaderno solo está disponible para ordenador.
              </p>
            </div>

            <button
              type="button"
              onClick={() => closeTutorial(hasEnded ? 'finished' : 'cta')}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-black text-primary-foreground shadow-xl shadow-primary/25 transition hover:translate-y-[-1px] hover:bg-primary-container active:translate-y-0 z-10"
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
