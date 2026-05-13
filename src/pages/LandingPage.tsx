import { useState, useEffect } from "react";
import { Download, Monitor, Apple, Loader2, Globe, X, Bell, Layout, Layers, ArrowRight, Smartphone, ChevronDown, Check, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { WIN_DOWNLOAD, MAC_DOWNLOAD } from "@/lib/download-urls";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Comparison } from "@/components/Comparison";
import { motion } from "framer-motion";

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
        className={`inline-flex items-center gap-2 font-bold transition-all ${
          isCta 
            ? "text-background/50 hover:text-background" 
            : "text-foreground/40 hover:text-foreground underline underline-offset-4"
        }`}
      >
        <Globe className="w-4 h-4" />
        Usar versión web
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
  useEffect(() => {
    document.title = "Adonai - Recupera el control de tu semana";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Estructura mental para emprendedores que se sienten sobrepasados. Claridad, calma y supervivencia ante el caos diario.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      <PublicNav />
      <main>
        <Hero />
        <Pain />
        <Demo />
        <How />
        <Features />
        <Comparison />
        <Quotes />
        <FAQSummary />
        <FinalCTA />
        <PublicFooter />
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HERO
 ───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative px-6 pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-40">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="text-6xl md:text-8xl font-black leading-[0.85] tracking-tight mb-8">
              Recupera el control <br />
              <span className="relative text-primary">
                de tu semana
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-foreground/60 leading-relaxed max-w-lg mb-10 font-medium">
              Tareas, calendario y metas. Un espacio completo que te ayuda a organizar tu vida en segundos sin perder el foco.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <DownloadButton platform="win" />
              <DownloadButton platform="mac" />
            </div>
            
            <div className="flex items-center gap-6">
              <UseInWebButton variant="hero" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative perspective-1000"
          >
            <div className="absolute -inset-4 bg-primary/20 rounded-[40px] blur-3xl animate-pulse" />
            <div className="relative overflow-hidden rounded-[32px] border-4 border-foreground/10 bg-background shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:scale-[1.02]">
              <div className="relative aspect-video overflow-hidden">
                <video
                  src="/videos/demo-1.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* Floating badges */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 p-4 rounded-2xl bg-background border-2 border-foreground/5 shadow-xl hidden md:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Estado</div>
                  <div className="text-sm font-black">Tarea Completada</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
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
    { t: "Ansiedad", d: "El caos de pendientes me genera parálisis.", icon: "😰" },
    { t: "Sobrecarga", "d": "Siento que el día me devora y no sé por dónde empezar.", icon: "🤯" },
    { t: "Frustración", "d": "Las apps complejas me roban más tiempo del que me ahorran.", icon: "🌀" },
  ];
  return (
    <section className="bg-foreground px-6 py-24 text-background md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-primary"
          >
            ¿Te suena familiar?
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black leading-tight"
          >
            La productividad genérica <br />
            <span className="text-primary/80">no es suficiente para ti</span>
          </motion.h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {pains.map((p, i) => (
            <motion.div
              key={p.t}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-[32px] border border-background/10 bg-background/5 p-10 transition-all hover:bg-background/10"
            >
              <div className="text-4xl mb-6">{p.icon}</div>
              <h3 className="text-xl font-black mb-3">{p.t}</h3>
              <p className="text-background/60 leading-relaxed font-medium">{p.d}</p>
            </motion.div>
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
    <section className="px-6 py-24 md:py-32 bg-secondary/30">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-20">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-foreground/40">Así se ve Adonai</p>
          <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
            Una ventanita. <br />
            Siempre <span className="text-primary">ahí</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg md:text-xl text-foreground/50 font-medium">
            No tapa nada. No molesta. Solo te recuerda lo que tienes que hacer para que no se te pase nada.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <DemoVideo src="/videos/demo-1.mp4" title="Persistencia" caption="Vive en tu escritorio" />
          <DemoVideo src="/videos/demo-2.mp4" title="Rapidez" caption="Marca con un clic" />
          <DemoVideo src="/videos/demo-3.mp4" title="Foco" caption="Agrega en segundos" />
        </div>
      </div>
    </section>
  );
}

function DemoVideo({ src, title, caption }: { src: string; title: string; caption: string }) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="group relative overflow-hidden rounded-[32px] bg-background border-2 border-foreground/5 shadow-xl transition-all"
    >
      <div className="p-4">
        <div className="relative aspect-video overflow-hidden">
          <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="px-8 pb-8 pt-2">
        <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{title}</div>
        <h3 className="text-lg font-black">{caption}</h3>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   HOW
 ───────────────────────────────────────────── */
function How() {
  const steps = [
    { n: "01", t: "Instala y abre", d: "Se queda en tu escritorio de forma nativa.", icon: Monitor },
    { n: "02", t: "Escribe tu tarea", d: "Un input rápido. Sin fechas ni menús tediosos.", icon: Layout },
    { n: "03", t: "Finaliza y gana", d: "Márcala al terminar y siente la satisfacción.", icon: Check },
  ];
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-foreground/40">Flujo de trabajo</p>
            <h2 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tight mb-12">
              Tan fácil que <br />
              <span className="text-primary">no tienes que pensar</span>
            </h2>
            
            <div className="space-y-10">
              {steps.map((s, i) => (
                <motion.div 
                  key={s.n}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-6"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-primary font-black text-xl">
                    {s.n}
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-1">{s.t}</h3>
                    <p className="text-foreground/60 leading-relaxed font-medium">{s.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-10 bg-primary/5 rounded-[60px] blur-3xl" />
            <div className="relative rounded-[32px] overflow-hidden border border-primary/20 bg-background shadow-2xl">
              <img 
                src="/screenshots/mini-window.png" 
                alt="Mini ventana" 
                className="w-full h-auto"
              />
            </div>
          </div>
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
    { icon: "🎯", title: "Prioridad Real", desc: "Clasifica por Urgente e Importante. Sin listas interminables." },
    { icon: "⏱️", title: "Time Boxing", desc: "Ponle tiempo a tus tareas y evita que se coman tu día." },
    { icon: "🔗", title: "Contexto al clic", desc: "Guarda links y archivos directos en la tarea. Ábrelos al instante." },
    { icon: "👀", title: "Invisibilidad", desc: "Se oculta cuando no la necesitas, aparece cuando te falta foco." },
  ];

  return (
    <section className="bg-secondary/40 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-foreground/40">Poder concentrado</p>
            <h2 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tight">
              Lo justo y <br />
              <span className="text-primary">necesario</span>
            </h2>
          </div>
          <Link 
            to="/caracteristicas" 
            className="inline-flex items-center gap-2 text-primary font-black group"
          >
            Ver todas las funciones
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div 
              key={f.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl bg-background border-2 border-foreground/5 p-8 transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="text-4xl mb-6">{f.icon}</div>
              <h3 className="text-xl font-black mb-3">{f.title}</h3>
              <p className="text-foreground/50 leading-relaxed font-medium text-sm">{f.desc}</p>
            </motion.div>
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
    { q: "Lo más pesado es abrir una app solo para anotar algo. Con Adonai tardo un segundo.", a: "Carlos M., Diseñador" },
    { q: "Probé muchas apps, pero siempre vuelvo a lo más simple. Esta es la definitiva.", a: "Laura G., Freelance" },
    { q: "Cuando algo está en mi cara todo el día, sí lo uso. He dejado de procrastinar.", a: "David R., Desarrollador" },
  ];
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-4">
            Recupera <span className="text-primary">el control</span>
          </h2>
          <p className="text-foreground/50 font-medium text-lg italic">Menos ruido, más enfoque.</p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3">
          {quotes.map((q, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative p-8 rounded-[40px] bg-secondary/50 border border-foreground/5 italic"
            >
              <div className="text-4xl text-primary/20 absolute top-4 left-6">"</div>
              <p className="text-lg font-medium leading-relaxed mb-6 relative z-10">{q.q}</p>
              <div className="not-italic flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-black text-foreground/40">{q.a}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FAQ SUMMARY
 ───────────────────────────────────────────── */
function FAQSummary() {
  return (
    <section className="bg-secondary/20 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-foreground/40">Centro de ayuda</p>
        <h2 className="text-4xl md:text-6xl font-black leading-tight mb-8">
          ¿Tienes alguna <span className="text-primary">pregunta</span>?
        </h2>
        <p className="text-lg text-foreground/60 mb-12 font-medium">
          Hemos recopilado las dudas más comunes sobre descarga, instalación y uso.
        </p>
        
        <Link 
          to="/faq"
          className="inline-flex items-center gap-3 rounded-full bg-foreground text-background px-10 py-5 text-lg font-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-foreground/10"
        >
          Ir a las preguntas frecuentes
          <ArrowRight className="w-6 h-6" />
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FINAL CTA
 ───────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section id="probar" className="relative px-6 py-24 md:py-40 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-foreground">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(34,197,94,0.1),transparent)]" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="relative z-10"
        >
          <h2 className="text-6xl md:text-9xl font-black leading-[0.85] tracking-tight text-background mb-10">
            Empieza a <br />
            <span className="text-primary">enfocarte</span> hoy.
          </h2>
          <p className="mt-8 text-xl md:text-2xl text-background/60 leading-relaxed mb-16 max-w-2xl mx-auto font-medium">
            Disponible para Windows y Mac. Gratis, sin cuenta, sin tarjeta. Instala y libera tu mente.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <div className="w-full sm:w-auto">
              <DownloadButton platform="win" variant="cta" />
            </div>
            <div className="w-full sm:w-auto">
              <DownloadButton platform="mac" variant="cta" />
            </div>
          </div>
          
          <div className="mt-10">
            <UseInWebButton variant="cta" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

