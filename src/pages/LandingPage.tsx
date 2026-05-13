import { useState } from "react";
import { Download, Monitor, Apple, Loader2, Globe, X, Bell, Layout, Layers, ArrowRight, Smartphone, ChevronDown, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { WIN_DOWNLOAD, MAC_DOWNLOAD } from "@/lib/download-urls";
import { PublicNav } from "@/components/PublicNav";

/* ─────────────────────────────────────────────
   DOWNLOAD HOOK
───────────────────────────────────────────── */
function useDownload(platform: 'win' | 'mac') {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = () => {
    setDownloading(true);
    const url = platform === 'win' ? WIN_DOWNLOAD : MAC_DOWNLOAD;
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 3000);
  };
  return { downloading, handleDownload };
}

/* ─────────────────────────────────────────────
   DOWNLOAD BUTTON
───────────────────────────────────────────── */
function DownloadButton({ platform, variant }: { platform: 'win' | 'mac'; variant?: 'nav' | 'hero' | 'cta' }) {
  const { downloading, handleDownload } = useDownload(platform);
  const Icon = platform === 'win' ? Monitor : Apple;

  if (variant === 'nav') {
    return (
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
        {platform === 'win' ? 'Windows' : 'Mac'}
      </button>
    );
  }

  if (variant === 'cta') {
    return (
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
        {downloading ? "Descargando..." : `Descargar para ${platform === 'win' ? 'Windows' : 'Mac'}`}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
    >
      {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
      {downloading ? "Descargando..." : `Descargar para ${platform === 'win' ? 'Windows' : 'Mac'}`}
    </button>
  );
}

/* ─────────────────────────────────────────────
   WEB APP LIMITATIONS MODAL
───────────────────────────────────────────── */
const WEB_LIMITATIONS = [
  {
    icon: Bell,
    title: "Sin notificaciones del sistema",
    desc: "Las alertas de escritorio y los recordatorios nativos solo funcionan en la app instalada.",
  },
  {
    icon: Layout,
    title: "Sin mini-ventana flotante",
    desc: "La pequeña ventana que vive siempre visible en tu escritorio es exclusiva de la app.",
  },
  {
    icon: Layers,
    title: "Sin integración con el S.O.",
    desc: "El inicio automático con Windows/Mac y la barra de tareas no están disponibles en web.",
  },
  {
    icon: Smartphone,
    title: "Móvil y escritorio web: sí",
    desc: "Puedes gestionar tus tareas desde el navegador en cualquier dispositivo con todas las funciones de gestión.",
  },
];

function WebLimitationsModal({ open, onClose, onContinue }: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-3xl bg-background border-2 border-foreground/10 shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 p-2 rounded-full text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 id="web-modal-title" className="text-xl font-black leading-tight">
              Usar Adonai en web
            </h2>
            <p className="text-sm text-foreground/50 mt-0.5">Antes de entrar, léete esto</p>
          </div>
        </div>

        {/* Limitations list */}
        <div className="space-y-4 mb-7">
          {WEB_LIMITATIONS.map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <item.icon className="w-4 h-4 text-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">{item.title}</p>
                <p className="text-xs text-foreground/50 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-foreground/40 mb-6 leading-relaxed">
          La versión web es perfecta para gestionar tareas desde cualquier lugar. Para la experiencia completa con mini-ventana y notificaciones nativas, descarga la app de escritorio.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onContinue}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            Entendido, entrar a la web
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-foreground/15 bg-transparent px-6 py-3.5 text-sm font-semibold text-foreground/70 transition hover:bg-foreground/5"
          >
            <Download className="w-4 h-4" />
            Mejor descargo la app
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   USE IN WEB BUTTON
───────────────────────────────────────────── */
function UseInWebButton({ variant }: { variant?: 'hero' | 'cta' }) {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    setModalOpen(false);
    navigate('/auth');
  };

  const isCta = variant === 'cta';

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={
          isCta
            ? "w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground/15 bg-transparent px-6 py-4 text-base font-bold text-foreground/80 transition hover:bg-foreground/5"
            : "group inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground/15 bg-transparent px-8 py-4 text-lg font-bold text-foreground/80 transition hover:bg-foreground/5"
        }
      >
        <Globe className="w-5 h-5" />
        Usar en web
      </button>

      <WebLimitationsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onContinue={handleContinue}
      />
    </>
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main>
        <Hero />
        <Pain />
        <Demo />
        <How />
        <Features />
        <Comparison />
        <Quotes />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-10 pb-20 md:pt-16 md:pb-28">
      <nav className="mx-auto mb-16 flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
              <defs>
                <linearGradient id="logo-grad-landing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
              <path
                d="M20 50 L40 75 L85 25"
                fill="none"
                stroke="url(#logo-grad-landing)"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight">Adonai</span>
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-foreground md:text-7xl">
            Tus tareas,
            <br />
            <span className="inline-block bg-primary px-3 py-1 text-primary-foreground rounded-md">siempre a la vista</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/70 md:text-xl">
            Una ventanita pequeña vive en tu escritorio. La miras, marcas lo que hiciste y listo. Sin abrir apps.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <DownloadButton platform="win" />
            <DownloadButton platform="mac" />
          </div>
          <div className="mt-3">
            <UseInWebButton variant="hero" />
          </div>
          <p className="mt-4 text-sm text-foreground/60">
            Descárgala gratis. Sin cuenta. Sin tarjeta. Solo instala y empieza.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-3xl bg-primary/30 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border-2 border-foreground/10 bg-foreground/5 shadow-2xl">
            <video
              src="/videos/demo-1.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="block w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PAIN
───────────────────────────────────────────── */
function Pain() {
  const pains = [
    "Me olvido de mis tareas porque abrir otra app cansa.",
    "Probé mil apps y siempre vuelvo a mi cuaderno.",
    "Me da pereza buscar botones, menús y pantallas.",
  ];
  return (
    <section className="bg-foreground px-6 py-20 text-background md:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">
          ¿Te suena familiar?
        </p>
        <h2 className="text-4xl font-black leading-tight text-background md:text-5xl">
          Las apps de tareas
          <br />
          <span className="text-primary">cansan más que ayudan</span>
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {pains.map((p) => (
            <div
              key={p}
              className="rounded-2xl border border-background/15 bg-background/10 p-6 text-left text-lg leading-relaxed text-background backdrop-blur-sm"
            >
              <p className="text-background/95">"{p}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   DEMO
───────────────────────────────────────────── */
function Demo() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Así se ve
        </p>
        <h2 className="text-4xl font-black leading-tight md:text-5xl">
          Una ventanita.
          <br />
          Siempre <span className="bg-primary px-2">ahí</span>.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          No tapa nada. No molesta. Solo te recuerda lo que tienes que hacer.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <DemoVideo src="/videos/demo-1.mp4" caption="Vive en tu escritorio" />
          <DemoVideo src="/videos/demo-2.mp4" caption="Marca con un clic" />
          <DemoVideo src="/videos/demo-3.mp4" caption="Agrega en segundos" />
        </div>
      </div>
    </section>
  );
}

function DemoVideo({ src, caption }: { src: string; caption: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-foreground/10 bg-foreground/5 shadow-lg">
      <div className="flex items-center justify-center bg-foreground/5 p-2">
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          className="block max-h-[420px] w-full object-contain"
        />
      </div>
      <p className="bg-background px-4 py-3 text-center text-sm font-semibold">
        {caption}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HOW
───────────────────────────────────────────── */
function How() {
  const steps = [
    { n: "1", t: "La abres una vez", d: "Y se queda en tu escritorio." },
    { n: "2", t: "Escribes tu tarea", d: "En un segundo. Sin menús." },
    { n: "3", t: "La marcas y listo", d: "Un clic y desaparece." },
  ];
  return (
    <section className="bg-secondary px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Cómo funciona
          </p>
          <h2 className="text-4xl font-black leading-tight md:text-5xl">
            Tan fácil que <span className="bg-primary px-2">no piensas</span>.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl bg-background p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-black text-primary-foreground">
                {s.n}
              </div>
              <h3 className="text-2xl font-bold">{s.t}</h3>
              <p className="mt-2 text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FEATURES
───────────────────────────────────────────── */
function Features() {
  const features = [
    { icon: "🎯", title: "¿Qué hago primero?", desc: "Te ayudamos a ordenar tus tareas con un método simple: lo urgente y lo importante. Sin pensar mucho." },
    { icon: "⏱️", title: "Pon tiempo a cada tarea", desc: "Así no te distraes. Cuando el tiempo se acaba, tú decides si sigues o pasas a la siguiente." },
    { icon: "🔗", title: "Guarda tus links", desc: "¿Un video que ver? ¿Una página? Pégala en la tarea y la abres con un clic." },
    { icon: "👀", title: "Siempre a la vista", desc: "Mientras trabajas, mientras lees mail, mientras navegas. Tus tareas no se esconden." },
  ];

  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Pequeños extras
          </p>
          <h2 className="text-4xl font-black leading-tight md:text-5xl">
            Simple. Pero <span className="bg-primary px-2">poderoso</span>.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-3xl border-2 border-foreground/10 bg-secondary p-8">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-4 text-2xl font-bold">{f.title}</h3>
              <p className="mt-2 text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   QUOTES
───────────────────────────────────────────── */
function Quotes() {
  const quotes = [
    "Lo más pesado es abrir una app solo para anotar algo.",
    "Probé muchas apps, pero siempre vuelvo a lo más simple.",
    "Cuando algo está en mi cara todo el día, sí lo uso.",
  ];
  return (
    <section className="bg-secondary px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Lo que nos dice la gente
        </p>
        <h2 className="mb-12 text-center text-4xl font-black leading-tight md:text-5xl">
          No estás <span className="bg-primary px-2">solo</span>.
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {quotes.map((q, i) => (
            <blockquote
              key={i}
              className="rounded-2xl bg-background p-6 text-lg leading-snug shadow-sm"
            >
              <span className="mb-3 block text-3xl text-primary">"</span>
              {q}
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FINAL CTA
───────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section id="probar" className="bg-foreground px-6 py-24 text-background md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-5xl font-black leading-tight md:text-6xl">
          Empieza a <span className="bg-primary text-primary-foreground px-2">enfocarte</span> hoy.
        </h2>
        <p className="mt-6 text-xl text-background/70">
          Disponible para Windows y Mac. Gratis, sin cuenta, sin tarjeta.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
          <DownloadButton platform="win" variant="cta" />
          <DownloadButton platform="mac" variant="cta" />
        </div>
        <div className="mt-4 max-w-lg mx-auto">
          <UseInWebButton variant="cta" />
        </div>
        <p className="mt-4 text-sm text-background/40">
          ¿Prefieres el navegador? También puedes usar Adonai en web, con algunas diferencias.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   COMPARISON TABLE
───────────────────────────────────────────── */
function Comparison() {
  const rows = [
    { feat: "Mini-ventana flotante en escritorio", adonai: true, others: false },
    { feat: "Siempre visible sin abrir la app",     adonai: true, others: false },
    { feat: "Notificaciones nativas del sistema",    adonai: true, others: false },
    { feat: "Temporizador por tarea",                adonai: true, others: false },
    { feat: "Gratis, sin tarjeta",                   adonai: true, others: false },
    { feat: "Funciona en web y móvil",               adonai: true, others: true  },
    { feat: "Prioridades urgente/importante",        adonai: true, others: false },
    { feat: "Sin publicidad",                        adonai: true, others: false },
  ];
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Por qué Adonai</p>
          <h2 className="text-4xl font-black leading-tight md:text-5xl">
            La única app con <span className="bg-primary px-2">mini-ventana flotante</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
            Comparado con Todoist, TickTick, Any.do y otras apps de tareas populares.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border-2 border-foreground/10">
          <table className="w-full text-sm" role="table" aria-label="Comparativa Adonai vs otras apps de tareas">
            <thead>
              <tr className="bg-foreground text-background">
                <th className="px-6 py-4 text-left font-bold text-base" scope="col">Característica</th>
                <th className="px-6 py-4 text-center font-black text-primary text-base" scope="col">Adonai</th>
                <th className="px-6 py-4 text-center font-bold text-base opacity-60" scope="col">Otras apps</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.feat} className={i % 2 === 0 ? 'bg-background' : 'bg-secondary'}>
                  <td className="px-6 py-4 font-medium text-foreground/80">{r.feat}</td>
                  <td className="px-6 py-4 text-center">
                    <Check className="w-5 h-5 text-primary mx-auto" aria-label="Sí" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {r.others
                      ? <Check className="w-5 h-5 text-muted-foreground mx-auto" aria-label="Sí" />
                      : <span className="text-foreground/20 text-xl" aria-label="No">✕</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FAQ  (visible + Schema.org — AEO/LLM)
───────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: "¿Qué es Adonai?",
    a: "Adonai es una aplicación gratuita de gestión de tareas que muestra una pequeña ventana flotante siempre visible en tu escritorio. Te permite ver, añadir y completar tareas sin tener que abrir ninguna otra aplicación. Disponible para Windows, Mac, navegador web y móvil.",
  },
  {
    q: "¿Es Adonai gratis?",
    a: "Sí, Adonai es completamente gratuito. No requiere crear una cuenta ni introducir tarjeta de crédito. Solo descarga e instala para Windows o Mac, o úsalo directamente en el navegador.",
  },
  {
    q: "¿Qué diferencia hay entre la app de escritorio y la versión web?",
    a: "La app de escritorio ofrece la mini-ventana flotante siempre visible, notificaciones nativas del sistema operativo e integración con Windows y Mac (inicio automático, barra de tareas). La versión web te permite gestionar tareas desde cualquier navegador sin instalar nada, tanto en ordenador como en móvil, pero sin la mini-ventana flotante y sin notificaciones nativas.",
  },
  {
    q: "¿Cómo funciona la mini-ventana flotante de Adonai?",
    a: "La mini-ventana de Adonai es una pequeña barra que aparece siempre encima de todas tus aplicaciones. Puedes ver tus tareas del día, marcarlas como completadas con un clic y añadir nuevas en segundos, sin cambiar de ventana ni buscar la app. Se puede ocultar o expandir con un clic.",
  },
  {
    q: "¿Adonai tiene temporizador de tareas?",
    a: "Sí. Adonai incluye un temporizador por tarea para que puedas trabajar con tiempo acotado. Al terminar el tiempo decides si continúas o pasas a la siguiente tarea. Es compatible con la técnica Pomodoro y el método de trabajo por bloques de tiempo.",
  },
  {
    q: "¿En qué sistemas operativos funciona Adonai?",
    a: "Adonai funciona en Windows (descarga .exe), macOS (descarga .dmg), en el navegador web sin instalación (Chrome, Firefox, Safari, Edge) y en dispositivos móviles Android e iOS a través del navegador.",
  },
  {
    q: "¿Cómo descargo Adonai?",
    a: "Puedes descargar Adonai gratis desde webadonai.com. Para Windows descarga el archivo .exe; para Mac descarga el .dmg. Si prefieres no instalar nada, también puedes usar Adonai directamente en el navegador desde cualquier dispositivo.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section
      id="faq"
      className="bg-secondary px-6 py-20 md:py-28"
      aria-label="Preguntas frecuentes sobre Adonai"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">FAQ</p>
          <h2 className="text-4xl font-black leading-tight md:text-5xl">
            Preguntas <span className="bg-primary px-2">frecuentes</span>
          </h2>
        </div>
        <div className="space-y-3" role="list">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              role="listitem"
              className="rounded-2xl bg-background overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                aria-controls={`faq-answer-${i}`}
                id={`faq-question-${i}`}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left font-bold text-base hover:bg-foreground/5 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                  className="px-6 pb-5 text-muted-foreground leading-relaxed"
                >
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-foreground/10 px-6 py-10 text-center text-xs text-muted-foreground/60">
      <p className="font-semibold text-sm text-foreground/40 mb-1">Adonai Tasks — App de gestión de tareas para escritorio y web</p>
      <p>© {new Date().getFullYear()} Adonai. Hecho simple, a propósito. Disponible gratis para Windows, Mac y navegador.</p>
      <div className="mt-3 flex items-center justify-center gap-3">
        <Link to="/politica-de-privacidad" className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors">Política de Privacidad</Link>
        <span className="text-muted-foreground/30">·</span>
        <Link to="/terminos-de-servicio" className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors">Términos de Servicio</Link>
      </div>
    </footer>
  );
}
