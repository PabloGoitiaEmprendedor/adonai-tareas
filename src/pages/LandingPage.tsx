import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Apple,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Download,
  Globe,
  Loader2,
  Monitor,
  Sparkles,
  Timer,
  TrendingUp,
} from "lucide-react";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { startGuidedDownload } from "@/lib/downloadGuide";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

const TRIAL_DAYS = 90;

function useDownload(platform: "win" | "mac") {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = () => {
    setDownloading(true);
    startGuidedDownload(platform);
    window.setTimeout(() => setDownloading(false), 3000);
  };
  return { downloading, handleDownload };
}

function DownloadButton({ platform, tone = "primary" }: { platform: "win" | "mac"; tone?: "primary" | "dark" }) {
  const { downloading, handleDownload } = useDownload(platform);
  const Icon = platform === "win" ? Monitor : Apple;
  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition active:scale-95 disabled:opacity-60 sm:h-14 sm:w-auto sm:px-7 ${
        tone === "dark"
          ? "bg-background text-foreground hover:bg-background/90"
          : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
      }`}
    >
      {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      {downloading ? "Descargando..." : `Descargar ${platform === "win" ? "Windows" : "Mac"}`}
    </button>
  );
}

function WebButton({ light = false }: { light?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/welcome")}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border px-6 text-sm font-black transition hover:scale-[1.02] active:scale-95 sm:h-14 sm:w-auto sm:px-7 ${
        light
          ? "border-background/20 text-background/70 hover:bg-background/10 hover:text-background"
          : "border-foreground/15 text-foreground/65 hover:bg-foreground/5 hover:text-foreground"
      }`}
    >
      <Globe className="h-5 w-5" />
      Usar version web
    </button>
  );
}

function getTrialStatus(createdAt?: string | null) {
  if (!createdAt) return null;
  const start = new Date(createdAt);
  const end = addDays(start, TRIAL_DAYS);
  const now = new Date();
  const daysLeft = Math.max(0, differenceInCalendarDays(end, now));
  return {
    endDateText: format(end, "dd MMM yyyy"),
    daysLeft,
    expired: daysLeft <= 0,
  };
}

function VideoCard({
  src,
  title,
  subtitle,
  icon,
  dark = true,
}: {
  src: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55 }}
      className={`overflow-hidden rounded-[28px] border ${
        dark ? "border-white/10 bg-[#11141A]" : "border-outline-variant bg-card"
      } shadow-sm`}
    >
      <div className="aspect-[16/10] overflow-hidden">
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </div>
      <div className={`p-6 ${dark ? "text-white" : "text-foreground"}`}>
        <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${dark ? "bg-white/10" : "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
        <h3 className="text-xl font-black">{title}</h3>
        <p className={`mt-2 text-sm font-medium leading-relaxed ${dark ? "text-white/62" : "text-on-surface-variant"}`}>{subtitle}</p>
      </div>
    </motion.article>
  );
}

function Hero() {
  const { scrollYProgress } = useScroll();
  const videoScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.1]);
  const glowY = useTransform(scrollYProgress, [0, 0.25], [0, -60]);

  return (
    <section id="inicio" className="relative min-h-[calc(100svh-4rem)] overflow-hidden px-4 pb-14 pt-8 sm:px-6 sm:pt-12 md:pb-16 md:pt-16">
      <motion.div style={{ y: glowY }} className="absolute -right-24 top-0 -z-10 h-[460px] w-[460px] rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(91,124,250,0.18),transparent_35%),radial-gradient(circle_at_78%_0%,rgba(111,207,151,0.12),transparent_32%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-primary sm:mb-6 sm:px-4 sm:text-[11px] sm:tracking-[0.22em]">
            <Sparkles className="h-4 w-4" />
            <span className="truncate">Mini ventana + Notion + Google Calendar</span>
          </div>
          <h1 className="max-w-4xl text-[2.55rem] font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl xl:text-8xl">
            Recupera el control con una app que vive contigo.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-foreground/62 sm:mt-7 md:text-xl">
            Adonai organiza tareas, calendario y foco sin romper tu flujo. Todo desde la mini ventana.
          </p>
          <div className="mt-7 grid gap-2.5 sm:mt-10 sm:flex sm:flex-row sm:gap-3">
            <DownloadButton platform="win" />
            <DownloadButton platform="mac" />
            <WebButton />
          </div>
        </motion.div>

        <motion.div style={{ scale: videoScale }} className="relative mx-auto w-full max-w-[820px]">
          <div className="absolute -inset-10 -z-10 rounded-[40px] bg-primary/25 blur-3xl" />
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0B0F17] shadow-[0_30px_90px_rgba(11,15,23,0.38)]">
            <video
              src="/videos/principal.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function KeyFeatures() {
  return (
    <section id="como-funciona" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-foreground/40">Cómo funciona</p>
            <h2 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl md:text-6xl">
              Acción real, sin saturación visual.
            </h2>
          </div>
          <DownloadButton platform="win" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <VideoCard
            src="/videos/de-tarea-a-calendario.mp4"
            title="Pasa de tareas a la acción"
            subtitle="Convierte tareas en eventos de calendario en segundos. Sin copiar ni reescribir."
            icon={<CalendarDays className="h-4 w-4" />}
            dark
          />
          <VideoCard
            src="/videos/video-del-calendario.mp4"
            title="Calendario desde mini ventana"
            subtitle="Gestiona el día completo sin salir de la mini ventana."
            icon={<Monitor className="h-4 w-4" />}
          />
          <VideoCard
            src="/videos/tiempo.mp4"
            title="Temporizador de enfoque"
            subtitle="Activa el reto de tiempo y ejecuta tareas más rápido con intención."
            icon={<Timer className="h-4 w-4" />}
          />
          <VideoCard
            src="/videos/video-nivel.mp4"
            title="Sube de nivel"
            subtitle="Tu progreso se convierte en niveles visibles para reforzar constancia."
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <VideoCard
            src="/videos/video-racha.mp4"
            title="Racha"
            subtitle="Mide continuidad diaria y mantén ritmo sin presión excesiva."
            icon={<Clock3 className="h-4 w-4" />}
          />
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const trial = useMemo(() => getTrialStatus(profile?.created_at), [profile?.created_at]);

  return (
    <section id="precio" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[34px] border border-outline-variant bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-[1fr_0.9fr]">
          <div className="p-8 md:p-12">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-primary">Precio</p>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl md:text-6xl">Beta activa con 3 meses gratis.</h2>
            <p className="mt-5 text-lg font-medium leading-relaxed text-on-surface-variant">
              Plan Pro de <span className="font-black text-foreground">$20/mes</span>. Durante esta fase beta, tienes 3 meses sin costo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <DownloadButton platform="win" />
              <DownloadButton platform="mac" />
            </div>
          </div>
          <div className="bg-foreground p-8 text-background md:p-12">
            <p className="text-sm font-black uppercase tracking-widest text-primary">Plan Pro</p>
            <p className="mt-6 text-7xl font-black">$20</p>
            <p className="mt-2 text-background/55">por mes luego de beta</p>
            <div className="mt-8 space-y-4 text-sm font-bold text-background/75">
              {["Mini ventana", "Calendario avanzado", "Temporizador", "Niveles y rachas", "Notion + Google Calendar"].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {user && trial && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          className="mx-auto mt-6 max-w-6xl rounded-3xl border border-primary/20 bg-primary/10 p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Tu estado beta</p>
          <h3 className="mt-1 text-2xl font-black text-foreground">
            {trial.expired ? "Tu período beta finalizó." : `Te quedan ${trial.daysLeft} días de beta.`}
          </h3>
          <p className="mt-2 text-sm font-medium text-on-surface-variant">
            Fecha de fin: <span className="font-black text-foreground">{trial.endDateText}</span>
          </p>
        </motion.div>
      )}
    </section>
  );
}

function FAQPreview() {
  const faqs = [
    ["¿Adonai reemplaza Notion?", "No. Se integra a tu flujo para que lo importante esté visible en contexto."],
    ["¿Funciona con Google Calendar?", "Sí. Puedes convertir tareas en eventos y operar el calendario desde la mini ventana."],
    ["¿Por qué aparece un aviso al instalar?", "La app está en proceso de verificación y por eso mostramos guía en el flujo de descarga."],
  ];
  return (
    <section id="faq" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-foreground/40">Preguntas frecuentes</p>
          <h2 className="text-3xl font-black leading-tight sm:text-4xl md:text-6xl">Lo esencial antes de empezar.</h2>
        </div>
        <div className="space-y-4">
          {faqs.map(([q, a]) => (
            <div key={q} className="rounded-[24px] border border-outline-variant bg-card p-6">
              <h3 className="text-lg font-black">{q}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-on-surface-variant">{a}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/faq" className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-4 text-sm font-black text-background transition hover:scale-[1.02]">
            Ver todas las preguntas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 md:py-30">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(91,124,250,0.2),transparent_42%)]" />
      <div className="mx-auto max-w-4xl text-center">
        <Download className="mx-auto mb-6 h-12 w-12 text-primary" />
        <h2 className="text-4xl font-black leading-[0.98] sm:text-5xl md:text-7xl">Instala Adonai y ejecuta con calma.</h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-on-surface-variant">
          Orden, foco y visibilidad real para tu semana.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <DownloadButton platform="win" />
          <DownloadButton platform="mac" />
          <WebButton />
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  useEffect(() => {
    document.title = "Adonai - Mini ventana de productividad";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "Adonai integra tareas, mini ventana, Notion, Google Calendar, metas, rachas y amigos para recuperar el control de tu semana."
    );
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <PublicNav />
      <main>
        <Hero />
        <KeyFeatures />
        <Pricing />
        <FAQPreview />
        <FinalCTA />
      </main>
      <PublicFooter />
    </div>
  );
}
