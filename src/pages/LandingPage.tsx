import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import OrbitalSystem from "@/components/ui/OrbitalSystem";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  MessageCircle,
  NotebookPen,
  Smartphone,
  User,
  VolumeX,
  X,
} from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

const INTRO_VISIBLE_MS = 850;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.5, ease: "easeOut" },
} as const;

function IntroExperience() {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem("adonaiLandingIntroSeen"));

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem("adonaiLandingIntroSeen", "true");
    const timer = window.setTimeout(() => setVisible(false), INTRO_VISIBLE_MS + 150);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          onAnimationEnd={() => setVisible(false)}
          className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[#151820] text-white animate-[adonaiLandingIntro_850ms_ease-in-out_forwards]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(91,124,250,0.34),transparent_36%)]" />
          <div className="relative flex flex-col items-center px-6 text-center">
            <img
              src="/logo.png"
              alt="Adonai"
              className="h-24 w-24 rounded-[30px] object-contain shadow-[0_28px_80px_rgba(91,124,250,0.34)]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PrimaryCTA({ className = "", tone = "brand", label = "Comenzar Gratis" }: { className?: string; tone?: "brand" | "dark" | "light"; label?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const toneClass =
    tone === "dark"
      ? "bg-[#151820] text-white shadow-[0_18px_45px_rgba(21,24,32,0.22)] hover:bg-[#0B0F17]"
      : tone === "light"
      ? "bg-white text-[#5B7CFA] shadow-[0_18px_45px_rgba(0,0,0,0.15)] hover:bg-white/90"
      : "bg-[#5B7CFA] text-white shadow-[0_18px_45px_rgba(91,124,250,0.26)] hover:bg-[#4F6EE8]";

  return (
    <button
      onClick={() => navigate(isLoggedIn ? "/daily" : "/welcome")}
      className={`group inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition hover:-translate-y-0.5 active:translate-y-0 sm:w-auto sm:px-7 ${toneClass} ${className}`}
    >
      {label}
      <ArrowRight className="h-4 w-4 animate-[ctaArrow_1.15s_ease-in-out_infinite]" />
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#5B7CFA]/12 bg-white/58 px-3 py-2">
      <img src="/logo.png" alt="" className="h-4 w-4 rounded-sm object-contain" />
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#5B7CFA]">{children}</p>
    </div>
  );
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden bg-[#F7F6F1] px-5 pb-20 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:px-10 lg:pt-20">
      <div className="absolute inset-0 -z-0 opacity-[0.34] [background-image:linear-gradient(rgba(21,24,32,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(21,24,32,0.055)_1px,transparent_1px)] [background-size:44px_44px]" />
      <img src="/logo.png" alt="" className="pointer-events-none absolute -right-16 top-20 h-64 w-64 rotate-[-10deg] rounded-[56px] object-contain opacity-[0.045] sm:h-96 sm:w-96" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <h1 className="max-w-4xl text-[2.75rem] font-black leading-[0.92] tracking-[-0.035em] text-[#151820] sm:text-6xl lg:text-[5.25rem]">
            Recupera el control de tu semana.
          </h1>

          <p className="mt-7 max-w-2xl text-lg font-semibold leading-relaxed text-[#151820]/62 sm:text-xl">
            Organiza tu vida y proyectos m&aacute;s f&aacute;cil. (En un solo lugar, no mas apps)
          </p>

          <div className="mt-9 flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center">
            <PrimaryCTA />
            <div className="flex gap-2">
              <a
                href="/adonai.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-[#151820]/20 bg-white/80 px-5 text-sm font-bold text-[#151820] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
              >
                <Smartphone className="h-4 w-4" />
                Android
              </a>
              <a
                href="https://testflight.apple.com/join/adonai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-[#151820]/20 bg-white/80 px-5 text-sm font-bold text-[#151820] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
              >
                <Smartphone className="h-4 w-4" />
                Apple
              </a>
            </div>
          </div>

        </motion.div>

        <OrbitalSystem />
      </div>
    </section>
  );
}

function CenteredPhrase() {
  return (
    <section className="border-t border-[#151820]/6 bg-white px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[24px] border border-[#5B7CFA]/10 bg-[#F7F6F1] p-8 text-center shadow-sm sm:p-12">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-2xl font-black leading-[1.1] tracking-[-0.02em] text-[#151820] sm:text-4xl"
          >
            &ldquo;no dejes que lo urgente mate a lo importante en tu vida o negocio&rdquo;
          </motion.p>
        </div>
      </div>
    </section>
  );
}

function IntegrationsStrip() {
  const integrationItems = [
    { src: "/logos/google-calendar.png", alt: "Google Calendar", label: "Google Calendar" },
    { src: "/logos/google-sheets.png", alt: "Google Sheets", label: "Google Sheets" },
    { src: "/logos/notion.png", alt: "Notion", label: "Notion" },
  ];

  return (
    <section className="bg-[#151820] px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur sm:p-8"
        >
          <div className="pointer-events-none absolute inset-x-8 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-white/18 to-transparent md:block" />
          <p className="mb-6 text-xs font-black uppercase tracking-[0.24em] text-white">Integraciones</p>

          <div className="relative grid grid-cols-[auto_auto_auto_auto_auto] items-center justify-center gap-2 sm:gap-5">
            {integrationItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.7 }}
                transition={{ delay: index * 0.12, duration: 0.45, ease: "easeOut" }}
                whileHover={{ y: -5, scale: 1.04 }}
                className="group flex h-14 w-14 items-center justify-center rounded-2xl border border-white/16 bg-white shadow-[0_16px_38px_rgba(0,0,0,0.16)] sm:h-24 sm:w-24 sm:rounded-[24px]"
              >
                <img src={item.src} alt={item.alt} className="h-7 w-7 object-contain transition duration-300 group-hover:scale-110 sm:h-10 sm:w-10" />
              </motion.div>
            ))}

            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.24, duration: 0.35 }}
              className="text-2xl font-black text-white sm:text-3xl"
            >
              =
            </motion.span>

            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ delay: 0.34, duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -6, scale: 1.04 }}
              className="group relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#7C97FF]/35 bg-white shadow-[0_22px_55px_rgba(91,124,250,0.24)] sm:h-28 sm:w-28 sm:rounded-[28px]"
            >
              <span className="absolute -right-2 -top-2 rounded-full bg-[#5B7CFA] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-white sm:px-2 sm:py-1 sm:text-[10px]">Adonai</span>
              <img src="/logo.png" alt="Adonai" className="h-9 w-9 object-contain transition duration-300 group-hover:scale-110 sm:h-16 sm:w-16" />
            </motion.div>
          </div>

          <p className="mx-auto mt-6 max-w-md text-sm font-bold leading-relaxed text-white">
            Tus herramientas siguen ahi. Adonai las vuelve accionable desde un solo flujo.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function PainMirror() {
  const signals = [
    { icon: <MessageCircle className="h-6 w-6" />, text: "Tareas en WhatsApp que se pierden." },
    { icon: <NotebookPen className="h-6 w-6" />, text: "Notas físicas que dependen de tu memoria." },
    { icon: <CalendarDays className="h-6 w-6" />, text: "Urgencias por todas partes, foco en ninguna." },
  ];

  return (
    <section className="bg-white px-5 py-20 sm:px-8 md:py-28 lg:px-10">
      <div className="mx-auto max-w-5xl text-center">
        <motion.div {...fadeUp}>
          <SectionLabel>El problema real</SectionLabel>
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.03em] text-[#151820] sm:text-5xl lg:text-[4rem]">
            No est&aacute;s desorganizado.<br className="hidden sm:block" /> <span className="text-[#5B7CFA]">Est&aacute;s saturado.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-relaxed text-[#151820]/62 sm:text-xl">
            Las apps de productividad no fallan por ser malas, fallan porque añaden otro sistema que mantener a tu vida ca&oacute;tica.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {signals.map((item, index) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center rounded-3xl border border-[#151820]/8 bg-[#F7F6F1]/50 p-8 transition hover:border-[#151820]/15 hover:bg-[#F7F6F1]"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#5B7CFA] shadow-[0_8px_20px_rgba(91,124,250,0.12)]">
                {item.icon}
              </div>
              <p className="text-base font-bold leading-relaxed text-[#151820]/80">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NotebookInsight() {
  const writingRef = useRef<HTMLDivElement | null>(null);
  const [writingRun, setWritingRun] = useState(0);
  const [isWritingVisible, setIsWritingVisible] = useState(false);
  const handwrittenText = "Adonai no remplaza tu libreta. La mejora.";

  useEffect(() => {
    const node = writingRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setWritingRun((run) => run + 1);
          setIsWritingVisible(true);
        } else {
          setIsWritingVisible(false);
        }
      },
      { threshold: 0.55 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#151820] px-5 py-20 text-white sm:px-8 md:py-28 lg:px-10">
      <img src="/logo.png" alt="" className="pointer-events-none absolute -left-10 top-12 h-48 w-48 rotate-12 rounded-[44px] object-contain opacity-[0.055] sm:h-72 sm:w-72" />
      <div className="relative mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.03em] sm:text-6xl">
            Por eso siempre vuelves a la libreta.
          </h2>
          <p className="mt-6 text-xl font-semibold leading-relaxed text-white/62">
            La libreta gana porque es facil, pero muchas veces lo facil no es lo mejor:
          </p>
        </motion.div>

        <motion.div {...fadeUp} className="mt-12 grid gap-4 md:grid-cols-2">
          {[
            { title: "Con libreta", text: "Capturas rapido, pero luego reinterpretas y pasas todo manualmente.", highlight: false },
            { title: "Con Adonai", text: "Capturas igual de rapido, pero tus pendientes quedan visibles y accionables al instante.", highlight: true },
            { title: "Lo que se pierde en papel", text: "Ideas enterradas, fechas olvidadas y prioridades mezcladas.", highlight: false },
            { title: "Lo que cambia con Adonai", text: "La mente descansa porque el sistema recibe el caos y te ayuda a avanzar.", highlight: true },
          ].map((item) => (
            <div
              key={item.title}
              className={`rounded-2xl p-6 ${
                item.highlight
                  ? "border border-[#8EA2FF]/45 bg-[#5B7CFA]/18 shadow-[0_18px_48px_rgba(91,124,250,0.18)]"
                  : "border border-white/10 bg-white/[0.04]"
              }`}
            >
              <h3 className={`text-lg font-black ${item.highlight ? "text-[#AFC0FF]" : "text-white"}`}>{item.title}</h3>
              <p className={`mt-3 text-sm font-semibold leading-relaxed ${item.highlight ? "text-white/82" : "text-white/52"}`}>{item.text}</p>
            </div>
          ))}
        </motion.div>

        <motion.div {...fadeUp} ref={writingRef} className="mt-14 text-center">
          <img src="/logo.png" alt="Adonai" className="mx-auto mb-5 h-14 w-14 rounded-2xl object-contain shadow-[0_18px_45px_rgba(0,0,0,0.25)]" />
          <div key={writingRun} className="mx-auto max-w-4xl px-2 py-2">
            <p
              className="mx-auto max-w-[20rem] text-center text-[2rem] font-black leading-[1.08] text-white sm:max-w-4xl sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', cursive" }}
            >
              {handwrittenText.split("").map((char, index) => {
                const wordColor = index < 6 ? "text-[#8EA2FF] drop-shadow-[0_0_28px_rgba(142,162,255,0.35)]" : "";
                const humanDelay = index * 0.055 + (index % 5) * 0.018 + (index % 3) * 0.01;
                return (
                  <span
                    key={`${writingRun}-${index}`}
                    className={`handwriting-char ${wordColor}`}
                    style={{
                      animationDelay: isWritingVisible ? `${humanDelay}s` : "0s",
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                );
              })}
              <span className="handwriting-live-cursor hidden sm:inline-block" />
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function NotebookCTA() {
  return (
    <section className="bg-[#5B7CFA] px-5 py-20 text-white sm:px-8 md:py-28 lg:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.03em] sm:text-5xl">
            Deja de pelear con tu libreta y tus apps. Adonai unifica todo.
          </h2>
          <div className="mt-10 flex justify-center">
            <PrimaryCTA tone="light" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ClickToPlayVideo({ src }: { src: string }) {
  const [activated, setActivated] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleActivate = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    try {
      await video.play();
      setActivated(true);
    } catch {
      // Browsers may keep playback blocked until a later user gesture.
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#0D1017] shadow-[0_32px_90px_rgba(21,24,32,0.24)]">
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        controls={activated}
        className="aspect-video w-full object-contain"
      />
      {!activated && (
        <button
          type="button"
          onClick={handleActivate}
          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/35 backdrop-blur-[1px] transition hover:bg-black/45"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg"
          >
            <VolumeX className="h-7 w-7 text-[#151820]" />
          </motion.div>
        </button>
      )}
    </div>
  );
}

function VideoTutorial() {
  return (
    <section id="como-funciona" className="bg-[#F7F6F1] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.03em] text-[#151820] sm:text-6xl">
            Descubre c&oacute;mo funciona
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-[#151820]/72">
            De ahora en adelante, reduce el estr&eacute;s de tu d&iacute;a a d&iacute;a. Libera tu mente de la carga de recordar todo: al anotarlo en Adonai, nada se te olvida y recuperas tu tranquilidad sin culpas.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <ClickToPlayVideo src="/videos/video-tutorial.mp4" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="mt-10 text-center"
        >
          <PrimaryCTA tone="dark" label="Comenzar Gratis" />
        </motion.div>
      </div>
    </section>
  );
}

function Differentiation() {
  const rows = [
    ["Notion", "Organiza sistemas complejos.", "Descarga tu mente sin configuracion."],
    ["Todoist", "Lista tareas.", "Reduce friccion y mantiene accion visible."],
    ["Google Calendar", "Agenda tiempo.", "Convierte caos en bloques accionables."],
    ["Libreta", "Es rapida pero se pierde.", "Es rapida, visible y conectada."],
  ];

  return (
    <section id="comparativa" className="bg-[#F7F6F1] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="mb-12 max-w-3xl">
          <SectionLabel>Diferencia</SectionLabel>
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.03em] text-[#151820] sm:text-6xl">
            No es otra app de tareas.
          </h2>
          <p className="mt-6 text-lg font-semibold leading-relaxed text-[#151820]/62">
            La categoria correcta no es "to-do app". Es alivio mental para personas que construyen negocios en medio del caos.
          </p>
        </motion.div>

        <div className="overflow-hidden rounded-[28px] border border-[#151820]/8 bg-white">
          <div className="hidden grid-cols-[0.75fr_1fr_1fr] border-b border-[#151820]/8 bg-[#151820] px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-white/52 md:grid">
            <span>Herramienta</span>
            <span>Lo que hace</span>
            <span className="text-white">Adonai</span>
          </div>
          {rows.map(([tool, current, adonai]) => (
            <div key={tool} className="grid gap-3 border-b border-[#151820]/8 p-4 last:border-b-0 md:grid-cols-[0.75fr_1fr_1fr] md:items-center md:px-6">
              <p className="text-lg font-black text-[#151820]">{tool}</p>
              <div className="rounded-2xl bg-[#F7F6F1] p-4 md:bg-transparent md:p-0">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#151820]/36 md:hidden">Hoy</p>
                <p className="text-sm font-semibold leading-relaxed text-[#151820]/58">{current}</p>
              </div>
              <div className="rounded-2xl border border-[#5B7CFA]/18 bg-[#E9F0FF] p-4 shadow-[0_12px_30px_rgba(91,124,250,0.1)] md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#5B7CFA] md:hidden">Con Adonai</p>
                <p className="text-sm font-black leading-relaxed text-[#151820] md:text-[#5B7CFA]">{adonai}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LatamUseCases() {
  const cases = [
    {
      icon: MessageCircle,
      color: "#25D366",
      bg: "#ECFDF5",
      title: "Te escribe un cliente por WhatsApp",
      desc: "Capturas el pendiente en segundos, sin perder el hilo de la conversacion.",
    },
    {
      icon: NotebookPen,
      color: "#5B7CFA",
      bg: "#EEF3FF",
      title: "Se te ocurre una idea vendiendo",
      desc: "La guardas antes de que se evapore. No mas ideas perdidas en el aire.",
    },
    {
      icon: CalendarDays,
      color: "#F59E0B",
      bg: "#FFFBEB",
      title: "Pagos, llamadas y entregas a la vez",
      desc: "Los conviertes en acciones visibles y ordenadas. Sin saturarte.",
    },
    {
      icon: VolumeX,
      color: "#EC4899",
      bg: "#FDF2F8",
      title: "Te saturas a mitad del dia",
      desc: "Haces brain dump en segundos y vuelves a respirar con la mente limpia.",
    },
  ];

  return (
    <section className="bg-[#151820] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="mb-14 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">
            <img src="/logo.png" alt="" className="h-4 w-4 rounded-sm object-contain" />
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#AFC0FF]">Hecho para LATAM</p>
          </div>
          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.035em] text-white sm:text-6xl">
            Para el caos real del emprendedor latino.
          </h2>
          <p className="mt-5 text-lg font-semibold leading-relaxed text-white/52">
            No todos trabajan con procesos perfectos. Muchos construyen entre chats, entregas, clientes, familia y urgencias.
          </p>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:border-white/16 hover:bg-white/[0.07]"
            >
              {/* Glow */}
              <div
                className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-30"
                style={{ backgroundColor: c.color }}
              />
              <div
                className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: c.bg }}
              >
                <c.icon className="h-5 w-5" style={{ color: c.color }} />
              </div>
              <h3 className="text-base font-black leading-snug tracking-tight text-white">{c.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-white/50">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmotionalDesign() {
  return (
    <section className="relative overflow-hidden bg-[#151820] px-5 py-20 text-white sm:px-8 md:py-28 lg:px-10">
      <img src="/logo.png" alt="" className="pointer-events-none absolute right-8 top-8 h-40 w-40 rounded-[36px] object-contain opacity-[0.06] sm:h-64 sm:w-64" />
      <div className="relative mx-auto max-w-5xl text-center">
        <motion.div {...fadeUp}>
          <img src="/logo.png" alt="Adonai" className="mx-auto mb-6 h-16 w-16 rounded-3xl object-contain shadow-[0_18px_45px_rgba(0,0,0,0.22)]" />
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.03em] sm:text-6xl">
            La productividad no deberia sentirse como otra carga.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-xl font-semibold leading-relaxed text-white/62">
            Adonai no intenta convertirte en una persona mas disciplinada. Diseña el entorno para que sacar el pendiente de tu cabeza sea mas facil que postergarlo.
          </p>
          <div className="mt-10 flex justify-center">
            <PrimaryCTA />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Pricing() {
  // TODO: reemplazar con el link real de pago
  const payLink = "https://example.com/pay";

  const freeFeatures = [
    "Tareas ilimitadas",
    "Calendario inteligente",
    "Mini ventana flotante",
    "Integraciones (Google Calendar, Notion)",
    "Sistema de amigos y racha",
    "Acceso web y desktop",
  ];

  const proFeatures = [
    { text: "Todo lo del plan Gratis", sub: "" },
    { text: "IA que te conoce y aprende de ti", sub: "Cada semana entiende mejor tu ritmo, prioridades y bloqueos" },
    { text: "Planificaci\u00f3n autom\u00e1tica de tu d\u00eda", sub: "La IA organiza tu agenda seg\u00fan lo que importa hoy" },
    { text: "Priorizaci\u00f3n inteligente de tareas", sub: "Sabe qu\u00e9 hacer primero sin que t\u00fa lo pienses" },
    { text: "Recomendaciones para lograr tus metas", sub: "Acciones concretas paso a paso seg\u00fan tus objetivos" },
    { text: "IA integrada en tu d\u00eda a d\u00eda", sub: "No es un chatbot: es tu copiloto de productividad" },
  ];

  return (
    <section id="precio" className="bg-[#F7F6F1] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="mb-12 text-center">
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.03em] text-[#151820] sm:text-5xl">
            El plan que necesites
          </h2>
          <p className="mt-4 text-lg font-semibold text-[#151820]/62">
            Empieza gratis. Cuando quieras m&aacute;s, actualizas.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Plan Gratis */}
          <motion.div {...fadeUp} className="rounded-[28px] border border-[#151820]/8 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5B7CFA]">Gratis</p>
            <p className="mt-2 text-5xl font-black text-[#151820]">$0</p>
            <p className="mt-1 text-sm font-semibold text-[#151820]/48">Siempre gratis</p>

            <div className="mt-8 space-y-3">
              {freeFeatures.map((f) => (
                <div key={f} className="flex items-center gap-3 text-sm font-bold text-[#151820]/72">
                  <Check className="h-4 w-4 flex-shrink-0 text-[#6FCF97]" />
                  {f}
                </div>
              ))}
              <div className="flex items-center gap-3 text-sm font-bold text-[#151820]/30 pt-1 border-t border-[#151820]/6 mt-1">
                <Brain className="h-4 w-4 flex-shrink-0" />
                Sin inteligencia artificial
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <PrimaryCTA />
            </div>
          </motion.div>

          {/* Plan Pro */}
          <motion.div
            {...fadeUp}
            className="relative rounded-[28px] border border-[#5B7CFA]/25 bg-[#151820] p-8 text-white shadow-[0_18px_50px_rgba(91,124,250,0.18)]"
          >
            <div className="absolute right-6 top-6 rounded-full bg-[#5B7CFA] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
              Recomendado
            </div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#AFC0FF]">Pro</p>
            <p className="mt-2 text-5xl font-black text-white">$12</p>
            <p className="mt-1 text-sm font-semibold text-white/48">Por mes &bull; cancela cuando quieras</p>

            <div className="mt-8 space-y-4">
              {proFeatures.map((f) => (
                <div key={f.text} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#6FCF97]" />
                  <div>
                    <p className="text-sm font-bold text-white/88">{f.text}</p>
                    {f.sub && <p className="mt-0.5 text-xs font-semibold leading-relaxed text-white/44">{f.sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#AFC0FF]">C&oacute;mo funciona la IA</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-white/58">
                Cuanto m&aacute;s la usas, m&aacute;s sabe qu&eacute; necesitas y cu&aacute;ndo. No es otro chatbot, es un copiloto que aprende de tu rutina y te ayuda a avanzar en tus metas sin saturarte.
              </p>
            </div>

            <div className="mt-6">
              <a
                href={payLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#5B7CFA] px-6 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(91,124,250,0.26)] transition hover:bg-[#4F6EE8] hover:-translate-y-0.5 active:translate-y-0"
              >
                Obtener Pro
                <ArrowRight className="h-4 w-4 animate-[ctaArrow_1.15s_ease-in-out_infinite]" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FAQPreview() {
  const faqs = [
    ["Adonai reemplaza Notion?", "No necesariamente. Notion sirve para documentar sistemas. Adonai sirve para sacar pendientes de tu cabeza y ejecutarlos con menos friccion."],
    ["Necesito configurar un metodo?", "No. La idea es capturar rapido, ver claro y actuar. Puedes ordenar despues, no antes."],
    ["Es para equipos grandes?", "Adonai esta pensado primero para emprendedores, freelancers y operadores que viven entre clientes, chats, ideas y urgencias."],
    ["Puedo usarlo si amo mi libreta?", "Si. Adonai toma lo mejor de la libreta: cero friccion. Pero lo hace visible, conectado y accionable."],
    ["Que incluye el plan Pro?", "El plan Pro agrega inteligencia artificial que aprende de ti con el tiempo: organiza tu dia, prioriza tus tareas, te sugiere acciones para tus metas y se integra a tu rutina diaria."],
  ];

  return (
    <section id="faq" className="bg-white px-5 py-20 sm:px-8 md:py-28 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <motion.div {...fadeUp} className="mb-12 text-center">
          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.03em] text-[#151820] sm:text-5xl">
            Preguntas frecuentes
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map(([q, a]) => (
            <motion.div key={q} {...fadeUp} className="rounded-2xl border border-[#151820]/8 bg-[#F7F6F1] p-6">
              <h3 className="text-lg font-black text-[#151820]">{q}</h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#151820]/58">{a}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link to="/faq" className="inline-flex items-center gap-2 rounded-full border border-[#151820]/12 bg-white px-6 py-3 text-sm font-black text-[#151820] transition hover:-translate-y-0.5">
            Ver todas las preguntas
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SemanticBlock() {
  return (
    <section className="bg-[#F7F6F1] px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl rounded-[24px] border border-[#151820]/8 bg-white p-6 text-center sm:p-8">
        <p className="text-sm font-semibold leading-relaxed text-[#151820]/60">
          Adonai es una aplicacion de productividad para emprendedores latinoamericanos que combina brain dump, gestion de tareas, mini ventana flotante, calendario y foco para reducir carga mental y convertir caos mental en accion clara.
        </p>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-white px-5 py-20 sm:px-8 md:py-28 lg:px-10">
      <div className="mx-auto max-w-5xl text-center">
        <motion.div {...fadeUp}>
          <img src="/logo.png" alt="Adonai" className="mx-auto mb-6 h-16 w-16 rounded-3xl object-contain shadow-[0_18px_45px_rgba(91,124,250,0.2)]" />
          <h2 className="text-5xl font-black leading-[0.92] tracking-[-0.04em] text-[#151820] sm:text-7xl">
            Tu cabeza no deberia ser el sistema.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-relaxed text-[#151820]/62">
            Saca lo pendiente, mira lo importante y vuelve a ejecutar con calma.
          </p>
          <div className="mt-10 flex justify-center">
            <PrimaryCTA />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Comparison() {
  const tools = [
    { name: "Notion", feature: "Muy complejo para tareas rápidas." },
    { name: "Google Calendar", feature: "No gestiona tareas sin fecha." },
    { name: "Google Sheets", feature: "Cero automatización móvil." },
    { name: "Libreta de Papel", feature: "Se pierde, no avisa, no unifica." },
    { name: "Todoist", feature: "Se siente como una lista de supermercado." },
    { name: "Trello", feature: "Para equipos, no para el caos personal." },
    { name: "Asana", feature: "Sobrecargado para uso personal rápido." },
  ];

  return (
    <section className="bg-white py-24 sm:py-32 border-b border-[#151820]/10">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-black tracking-tight text-[#151820] sm:text-4xl">
            ¿Por qué no usar lo que ya existe?
          </h2>
          <p className="mt-4 text-lg text-[#151820]/60">
            Las soluciones actuales están hechas para empresas o son demasiado complejas. Adonai está diseñado para tu mente.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <div key={tool.name} className="flex items-start gap-4 p-5 rounded-2xl bg-[#151820]/5 border border-[#151820]/10">
               <div className="flex-1">
                 <h3 className="font-bold text-[#151820] flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500" /> {tool.name}
                 </h3>
                 <p className="text-sm text-[#151820]/60 mt-1">{tool.feature}</p>
               </div>
            </div>
          ))}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#5B7CFA]/10 border border-[#5B7CFA]/20 sm:col-span-2 md:col-span-1 h-full">
             <div className="flex-1">
               <h3 className="font-bold text-[#5B7CFA] flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B7CFA]" /> Adonai
               </h3>
               <p className="text-sm text-[#151820]/80 mt-1 font-medium">Todo en un solo lugar, rápido, simple y con recompensas.</p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      body: "Antes usaba 3 apps distintas y la libreta. Siempre terminaba perdiendo el hilo de lo importante. Ahora solo abro Adonai y sé qué hacer.",
      author: "Carlos M.",
      role: "Emprendedor",
    },
    {
      body: "La ventana flotante es magia. Me llega una idea, la anoto en un segundo y sigo trabajando sin perder la concentración.",
      author: "Laura G.",
      role: "Freelancer",
    },
    {
      body: "Por fin una app que entiende el caos de tener TDAH y emprender. El sistema de racha y salud me mantiene a tope.",
      author: "David R.",
      role: "Creador de Contenido",
    },
  ];

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-black tracking-tight text-[#151820] sm:text-4xl">
            Lo que dicen nuestros usuarios
          </h2>
        </div>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <div key={i} className="flex flex-col justify-between rounded-3xl bg-[#151820]/5 p-8 ring-1 ring-[#151820]/10 xl:p-10">
              <p className="text-base text-[#151820]/80 italic font-medium">"{testimonial.body}"</p>
              <div className="mt-8 flex items-center gap-x-4">
                <div className="h-10 w-10 rounded-full bg-[#5B7CFA]/20 flex items-center justify-center font-bold text-[#5B7CFA]">
                  {testimonial.author[0]}
                </div>
                <div>
                  <div className="font-bold text-[#151820]">{testimonial.author}</div>
                  <div className="text-sm text-[#151820]/60">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileStickyCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#151820]/8 bg-white/92 p-3 backdrop-blur-xl sm:hidden">
      <PrimaryCTA tone="dark" className="h-12" />
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    document.title = "Adonai | Sistema operativo mental para emprendedores LATAM";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "Adonai ayuda a emprendedores latinoamericanos a vaciar la mente, capturar tareas rapido y convertir caos mental en accion clara sin sistemas complicados."
    );
  }, []);

  useEffect(() => {
    if (searchParams.get("show") === "precio") {
      setTimeout(() => {
        document.getElementById("precio")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#151820] text-[#151820] selection:bg-[#5B7CFA] selection:text-white">
      <IntroExperience />
      <div className="bg-white">
        <PublicNav user={user} profile={profile} />
        <main className="pt-16">
          <Hero />
          <VideoTutorial />
          <IntegrationsStrip />
          <CenteredPhrase />
          <PainMirror />
          <NotebookInsight />
          <NotebookCTA />
          <Comparison />
          <EmotionalDesign />
          <Testimonials />
          <FAQPreview />
        </main>
        <PublicFooter />
        <MobileStickyCTA />
      </div>
    </div>
  );
}
