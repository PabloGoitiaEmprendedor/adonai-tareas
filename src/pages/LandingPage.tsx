import { useEffect, useState } from "react";
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
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { startGuidedDownload } from "@/lib/downloadGuide";

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
      {downloading ? "Descargando..." : `Descargar ${platform === "win" ? "Windows" : "Mac"} Gratis`}
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

function VideoCard({
  src,
  title,
  subtitle,
  icon,
  dark = false,
  fit = "contain",
  aspect = "aspect-[16/10]",
}: {
  src: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  dark?: boolean;
  fit?: "cover" | "contain";
  aspect?: string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45 }}
      className={`overflow-hidden rounded-[24px] border ${dark ? "border-white/10 bg-[#11141A]" : "border-outline-variant bg-card"}`}
    >
      <div className={`${aspect} overflow-hidden bg-[#0B0F17]`}>
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
        />
      </div>
      <div className={`p-4 ${dark ? "text-white" : "text-foreground"}`}>
        <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${dark ? "bg-white/10" : "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
        <h3 className="text-base font-black">{title}</h3>
        <p className={`mt-2 text-sm font-medium leading-relaxed ${dark ? "text-white/65" : "text-on-surface-variant"}`}>{subtitle}</p>
      </div>
    </motion.article>
  );
}

function Hero() {
  const { scrollYProgress } = useScroll();
  const videoScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.04]);
  return (
    <section id="inicio" className="relative min-h-[calc(100svh-4rem)] overflow-hidden px-4 pb-18 pt-10 sm:px-6 sm:pt-14 md:pt-18">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(91,124,250,0.12),transparent_34%),radial-gradient(circle_at_78%_0%,rgba(111,207,151,0.08),transparent_32%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary sm:px-4 sm:text-[11px]">
            <img src="/logo.png" alt="Adonai" className="h-4 w-4 rounded-sm object-contain" />
            <Sparkles className="h-4 w-4" />
            <span className="truncate">Mini ventana + Notion + Google Calendar</span>
          </div>
          <h1 className="max-w-3xl text-[2.1rem] font-black leading-[1] tracking-tight sm:text-5xl md:text-6xl">
            Recupera el control con una app que vive contigo.
          </h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-foreground/62 md:text-lg">
            Adonai organiza tareas, calendario y foco sin romper tu flujo. Todo desde la mini ventana.
          </p>
          <div className="mt-9 grid gap-2.5 sm:flex sm:flex-row sm:gap-3">
            <DownloadButton platform="win" />
            <DownloadButton platform="mac" />
            <WebButton />
          </div>
        </motion.div>

        <motion.div style={{ scale: videoScale }} className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-6 -z-10 rounded-[30px] bg-primary/16 blur-3xl" />
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0B0F17] shadow-[0_22px_60px_rgba(11,15,23,0.32)]">
            <video
              src="/videos/principal.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function KeyFeatures() {
  return (
    <section id="como-funciona" className="px-4 py-18 sm:px-6 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-foreground/40">Como funciona</p>
          <h2 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
            Accion real, sin saturacion.
          </h2>
        </div>

        <div className="grid gap-6">
          <VideoCard
            src="/videos/de-tarea-a-calendario.mp4"
            title="Pasa de tareas a la accion"
            subtitle="Convierte tareas en eventos de calendario en segundos. Sin copiar ni reescribir."
            icon={<CalendarDays className="h-4 w-4" />}
            fit="contain"
            aspect="aspect-[16/10]"
          />

          <div className="grid gap-6 md:grid-cols-2">
            <VideoCard
              src="/videos/video-del-calendario.mp4"
              title="Calendario desde mini ventana"
              subtitle="Gestiona el dia completo sin salir de la mini ventana."
              icon={<Monitor className="h-4 w-4" />}
              dark
              fit="contain"
            />
            <VideoCard
              src="/videos/tiempo.mp4"
              title="Temporizador de enfoque"
              subtitle="Activa el reto de tiempo y ejecuta tareas mas rapido con intencion."
              icon={<Timer className="h-4 w-4" />}
              fit="contain"
              aspect="aspect-[5/6]"
            />
            <VideoCard
              src="/videos/video-nivel.mp4"
              title="Sube de nivel"
              subtitle="Tu progreso se convierte en niveles visibles para reforzar constancia."
              icon={<TrendingUp className="h-4 w-4" />}
              fit="contain"
            />
            <VideoCard
              src="/videos/video-racha.mp4"
              title="Racha"
              subtitle="Mide continuidad diaria y manten ritmo sin presion excesiva."
              icon={<Clock3 className="h-4 w-4" />}
              dark
              fit="contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  const rows = [
    ["Mini ventana real de trabajo", "No", "Si"],
    ["Pasar tarea a evento en segundos", "No", "Si"],
    ["Calendario dentro de mini ventana", "Parcial", "Si"],
    ["Foco con temporizador, racha y nivel", "No", "Si"],
  ];
  return (
    <section id="comparativa" className="bg-surface-container-low px-4 py-18 sm:px-6 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <img src="/logo.png" alt="Adonai" className="mx-auto mb-4 h-10 w-10 rounded-md object-contain" />
          <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-foreground/40">Comparativa</p>
          <h2 className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl">Apps actuales vs. Adonai</h2>
        </div>
        <div className="overflow-hidden rounded-[24px] border border-outline-variant bg-card">
          <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr] border-b border-outline-variant/60 bg-surface-container-low p-4 text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
            <span>Necesidad</span>
            <span className="text-center">Actual</span>
            <span className="text-center text-primary">Adonai</span>
          </div>
          {rows.map(([need, old, adonai]) => (
            <div key={need} className="grid grid-cols-[1.3fr_0.8fr_0.8fr] items-center border-b border-outline-variant/40 p-4 last:border-b-0">
              <span className="font-bold text-foreground">{need}</span>
              <span className="text-center font-bold text-on-surface-variant">{old}</span>
              <span className="text-center font-black text-primary">{adonai}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="precio" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[30px] border border-outline-variant bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-[1fr_0.9fr]">
          <div className="p-8 md:p-12">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-primary">Precio</p>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl">Beta activa con 3 meses gratis.</h2>
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
    </section>
  );
}

function FAQPreview() {
  const faqs = [
    ["Adonai reemplaza Notion?", "No. Se integra a tu flujo para que lo importante este visible en contexto."],
    ["Funciona con Google Calendar?", "Si. Puedes convertir tareas en eventos y operar el calendario desde la mini ventana."],
    ["Por que aparece un aviso al instalar?", "La app esta en proceso de verificacion y por eso mostramos guia en el flujo de descarga."],
  ];
  return (
    <section id="faq" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-foreground/40">Preguntas frecuentes</p>
          <h2 className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl">Lo esencial antes de empezar.</h2>
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
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 md:py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(91,124,250,0.15),transparent_42%)]" />
      <div className="mx-auto max-w-4xl text-center">
        <Download className="mx-auto mb-6 h-12 w-12 text-primary" />
        <h2 className="text-4xl font-black leading-[0.98] sm:text-5xl md:text-6xl">Instala Adonai y ejecuta con calma.</h2>
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
        <Comparison />
        <Pricing />
        <FAQPreview />
        <FinalCTA />
      </main>
      <PublicFooter />
    </div>
  );
}
