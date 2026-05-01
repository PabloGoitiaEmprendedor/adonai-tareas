import { useState } from "react";
import { Download } from "lucide-react";
import { Link } from "react-router-dom";

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
          <div className="h-8 w-8 rounded-lg bg-foreground" />
          <span className="text-lg font-bold">Adonai</span>
        </div>
        <div className="flex items-center gap-6">
          <Link 
            to="/auth" 
            className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <a
            href="#probar"
            className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Descargar App
          </a>
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
            🎯 Acceso anticipado gratis
          </span>
          <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
            Tus tareas,
            <br />
            <span className="bg-primary px-2">siempre a la vista</span>.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground md:text-xl">
            Una ventanita pequeña vive en tu escritorio. La miras, marcas lo que hiciste y listo. Sin abrir apps.
          </p>
          <div className="mt-8">
            <DownloadButton />
            <p className="mt-3 text-xs text-muted-foreground">
              Descárgala gratis. Sin cuenta. Sin tarjeta. Solo instala y empieza.
            </p>
          </div>
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
        <h2 className="text-4xl font-black leading-tight md:text-5xl">
          Las apps de tareas
          <br />
          <span className="text-primary">cansan más que ayudan</span>.
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {pains.map((p) => (
            <div
              key={p}
              className="rounded-2xl border border-background/10 bg-background/5 p-6 text-left text-lg leading-snug"
            >
              <span className="mb-3 block text-2xl">😮‍💨</span>
              <p>"{p}"</p>
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
          <div className="rounded-3xl border-2 border-foreground/10 bg-secondary p-8">
            <span className="text-3xl">🎯</span>
            <h3 className="mt-4 text-2xl font-bold">¿Qué hago primero?</h3>
            <p className="mt-2 text-muted-foreground">
              Te ayudamos a ordenar tus tareas con un método simple: lo urgente
              y lo importante. Sin pensar mucho.
            </p>
          </div>
          <div className="rounded-3xl border-2 border-foreground/10 bg-secondary p-8">
            <span className="text-3xl">⏱️</span>
            <h3 className="mt-4 text-2xl font-bold">Pon tiempo a cada tarea</h3>
            <p className="mt-2 text-muted-foreground">
              Así no te distraes. Cuando el tiempo se acaba, tú decides si
              sigues o pasas a la siguiente.
            </p>
          </div>
          <div className="rounded-3xl border-2 border-foreground/10 bg-secondary p-8">
            <span className="text-3xl">🔗</span>
            <h3 className="mt-4 text-2xl font-bold">Guarda tus links</h3>
            <p className="mt-2 text-muted-foreground">
              ¿Un video que ver? ¿Una página? Pégala en la tarea y la abres con
              un clic.
            </p>
          </div>
          <div className="rounded-3xl border-2 border-foreground/10 bg-secondary p-8">
            <span className="text-3xl">👀</span>
            <h3 className="mt-4 text-2xl font-bold">Siempre a la vista</h3>
            <p className="mt-2 text-muted-foreground">
              Mientras trabajas, mientras lees mail, mientras navegas. Tus
              tareas no se esconden.
            </p>
          </div>
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
          Descárgala gratis. Sin cuenta. Sin tarjeta. Solo instala y empieza.
        </p>
        <div className="mt-10">
          <DownloadButton dark />
        </div>
      </div>
    </section>
  );
}

/* ---------- DOWNLOAD BUTTON ---------- */
function DownloadButton({ dark = false }: { dark?: boolean }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    window.location.href = 'https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/latest/download/Adonai-Setup.exe';
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div
      className={`inline-flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:p-1.5 ${
        dark ? "sm:bg-background/10" : "sm:bg-foreground/5 sm:border sm:border-foreground/10"
      }`}
    >
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        <Download className="w-5 h-5" />
        {downloading ? "Descargando..." : "Descargar para Windows"}
      </button>
    </div>
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
