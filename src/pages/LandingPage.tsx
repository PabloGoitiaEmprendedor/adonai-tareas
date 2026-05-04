import { useState } from "react";
import { Download, Monitor, Apple, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const WIN_DOWNLOAD = 'https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/latest/download/Adonai-Setup.exe';
const MAC_DOWNLOAD = 'https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/latest/download/Adonai-Mac.dmg';

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

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <Pain />
      <Demo />
      <How />
      <Features />
      <Quotes />
      <FinalCTA />
      <Footer />
    </main>
  );
}

/* ---------- HERO ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-10 pb-20 md:pt-16 md:pb-28">
      <nav className="mx-auto mb-16 flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">Adonai</span>
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

/* ---------- PAIN ---------- */
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

/* ---------- DEMO ---------- */
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

/* ---------- HOW ---------- */
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

/* ---------- FEATURES ---------- */
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

/* ---------- QUOTES ---------- */
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

/* ---------- FINAL CTA ---------- */
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
        <div className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <DownloadButton platform="win" variant="cta" />
          <DownloadButton platform="mac" variant="cta" />
        </div>
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */
function Footer() {
  return (
    <footer className="border-t border-foreground/10 px-6 py-10 text-center text-sm text-muted-foreground">
      <p>© {new Date().getFullYear()} Adonai. Hecho simple, a propósito.</p>
    </footer>
  );
}
