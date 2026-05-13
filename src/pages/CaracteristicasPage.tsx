import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Monitor, Apple, Loader2, Download } from "lucide-react";
import { useState } from "react";
import { WIN_DOWNLOAD, MAC_DOWNLOAD } from "@/lib/download-urls";

/* ── Download helpers ── */
function useDownload(url: string) {
  const [loading, setLoading] = useState(false);
  const handle = () => {
    setLoading(true);
    const a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setLoading(false), 3000);
  };
  return { loading, handle };
}

/* ── Feature block ── */
function FeatureBlock({
  emoji, tag, title, body, reversed = false, highlight,
}: {
  emoji: string; tag: string; title: string; body: string;
  reversed?: boolean; highlight?: string;
}) {
  return (
    <article
      className={`mx-auto max-w-5xl flex flex-col gap-10 items-center ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"}`}
    >
      {/* Ilustración */}
      <div className="w-full lg:w-1/2 flex-shrink-0">
        <div className="relative rounded-3xl bg-foreground/5 border border-foreground/8 aspect-video flex items-center justify-center overflow-hidden shadow-lg">
          <span className="text-[7rem] select-none drop-shadow-2xl">{emoji}</span>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Texto */}
      <div className="w-full lg:w-1/2">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-3">{tag}</p>
        <h2 className="text-3xl font-black leading-tight md:text-4xl">
          {highlight
            ? title.split(highlight).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="bg-primary px-2 text-primary-foreground">{highlight}</span>
                  )}
                </span>
              ))
            : title}
        </h2>
        <p className="mt-4 text-lg text-foreground/65 leading-relaxed">{body}</p>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════ */
export default function CaracteristicasPage() {
  const win = useDownload(WIN_DOWNLOAD);
  const mac = useDownload(MAC_DOWNLOAD);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      {/* ── Hero ── */}
      <header className="px-6 pt-20 pb-16 text-center md:pt-28">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-4">
          Dentro de Adonai
        </p>
        <h1 className="text-5xl font-black leading-[1.05] md:text-7xl">
          Una app sencilla.<br />
          <span className="inline-block bg-primary px-3 py-1 text-primary-foreground rounded-md mt-2">
            Con superpoderes.
          </span>
        </h1>
        <p className="mt-6 mx-auto max-w-xl text-lg text-foreground/60 leading-relaxed">
          Adonai no es otra app de listas. Es la herramienta que se adapta a cómo
          tu cerebro realmente trabaja — visible, rápida y honesta contigo mismo.
        </p>
      </header>

      {/* ── Features ── */}
      <main className="space-y-28 px-6 pb-28">

        {/* 1 — Mini-ventana */}
        <FeatureBlock
          emoji="🪟"
          tag="Mini-ventana flotante"
          title="Tus tareas siempre a la vista. Sin excusas."
          highlight="Sin excusas."
          body="La mayoría de las apps de productividad fallan por lo mismo: tienes que acordarte de abrirlas. Adonai vive en una pequeña ventana que flota encima de todo lo demás. No interrumpe. No molesta. Solo está ahí — recordándote en silencio lo que importa, mientras trabajas, navegas o procrastinas."
          reversed={false}
        />

        {/* 2 — Racha */}
        <FeatureBlock
          emoji="🔥"
          tag="Racha diaria"
          title="Un día que no fallas se convierte en dos. Luego en diez."
          highlight="en diez."
          body="Hay algo primitivo en no querer romper una racha. Cada día que cumples tus tareas, tu contador sube. Y sin darte cuenta, la productividad deja de ser un esfuerzo para convertirse en parte de quién eres. La racha de Adonai no te presiona — te engancha de la forma correcta."
          reversed={true}
        />

        {/* 3 — Logros */}
        <FeatureBlock
          emoji="🏆"
          tag="Logros y recompensas"
          title="Hacer el trabajo se convierte en un juego que quieres ganar."
          highlight="un juego"
          body="Cada tarea completada, cada meta alcanzada, cada semana sin fallar — Adonai lo reconoce. Los logros no son solo badges bonitos. Son pequeñas dosis de dopamina que tu cerebro aprende a esperar. Y cuando el cerebro espera recompensa, el comportamiento cambia solo."
          reversed={false}
        />

        {/* 4 — Metas */}
        <FeatureBlock
          emoji="🎯"
          tag="Metas conectadas a tus tareas"
          title="Cada tarea tiene un por qué. Adonai te lo recuerda."
          highlight="un por qué."
          body="Puedes definir metas grandes — terminar un proyecto, aprender algo nuevo, mejorar en algo — y luego conectar tus tareas diarias directamente a esas metas. Así cada pequeña acción tiene contexto. No estás tachando cosas de una lista. Estás construyendo algo."
          reversed={true}
        />

        {/* 5 — Calendario */}
        <FeatureBlock
          emoji="📅"
          tag="Calendario inteligente"
          title="No solo sabes qué hacer. Sabes cuándo hacerlo."
          highlight="cuándo hacerlo."
          body="El calendario de Adonai no es un horario rígido — es una vista honesta de tu semana. Arrastra tareas, asigna bloques de tiempo y visualiza si tu carga es razonable o si te estás mintiendo a ti mismo. La claridad temporal es el superpoder que más subestima la gente."
          reversed={false}
        />

        {/* 6 — Amigos */}
        <FeatureBlock
          emoji="👥"
          tag="Productividad con amigos"
          title="La responsabilidad compartida es el sistema que más funciona."
          highlight="más funciona."
          body="Añade amigos a Adonai y véis vuestras rachas y logros. No es competición — es compañía. Hay algo en saber que alguien más está siendo productivo hoy que te hace levantarte del sofá. Y si un día fallas, ahí están para no dejarte caer solo."
          reversed={true}
        />

        {/* 7 — Temporizador */}
        <FeatureBlock
          emoji="⏱️"
          tag="Temporizador por tarea"
          title="Pon tiempo a lo que haces. Para de mentirte con cuánto tardas."
          highlight="Para de mentirte"
          body="Asigna un tiempo estimado a cada tarea. Cuando empieces, el reloj corre. Al terminar el tiempo decides si continúas o pasas. Sin juzgarte. Sin presión. Solo información honesta sobre cómo usas las horas de tu día — y eso solo ya cambia todo."
          reversed={false}
        />

        {/* 8 — Carpetas y prioridades */}
        <FeatureBlock
          emoji="📁"
          tag="Carpetas y prioridades"
          title="Urgente vs. importante. La diferencia que lo cambia todo."
          highlight="lo cambia todo."
          body="Adonai usa el método de la matriz urgente/importante para que no te pases el día apagando incendios y te olvides de lo que realmente te hace avanzar. Organiza tus tareas en carpetas por proyecto o área de tu vida, y dale a cada una la prioridad correcta — no la que más estresa."
          reversed={true}
        />

      </main>

      {/* ── Final CTA ── */}
      <section className="bg-foreground text-background px-6 py-24 text-center">
        <h2 className="text-5xl font-black leading-tight md:text-6xl">
          Todo esto,<br />
          <span className="bg-primary text-primary-foreground px-3">gratis.</span>
        </h2>
        <p className="mt-6 text-xl text-background/65 max-w-lg mx-auto">
          Sin suscripción. Sin publicidad. Sin trampa. Solo descarga e instala.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <button
            id="features-download-win"
            onClick={win.handle}
            disabled={win.loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {win.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Monitor className="w-5 h-5" />}
            {win.loading ? "Descargando…" : "Descargar para Windows"}
          </button>
          <button
            id="features-download-mac"
            onClick={mac.handle}
            disabled={mac.loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-background/10 border border-background/20 px-6 py-4 text-base font-bold text-background transition hover:bg-background/20 disabled:opacity-60"
          >
            {mac.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Apple className="w-5 h-5" />}
            {mac.loading ? "Descargando…" : "Descargar para Mac"}
          </button>
        </div>
        <p className="mt-5 text-sm text-background/40">
          ¿Prefieres el navegador?{" "}
          <Link to="/auth" className="underline underline-offset-2 hover:text-background/70 transition-colors">
            Entra a la versión web →
          </Link>
        </p>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-foreground/10 px-6 py-8 text-center text-xs text-foreground/40">
        <p>© {new Date().getFullYear()} Adonai. Hecho simple, a propósito.</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Link to="/politica-de-privacidad" className="underline underline-offset-2 hover:text-foreground/60 transition-colors">Política de Privacidad</Link>
          <span className="text-foreground/20">·</span>
          <Link to="/terminos-de-servicio" className="underline underline-offset-2 hover:text-foreground/60 transition-colors">Términos de Servicio</Link>
        </div>
      </footer>
    </div>
  );
}
