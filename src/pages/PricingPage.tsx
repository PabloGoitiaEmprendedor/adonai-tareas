import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Brain, ArrowRight, Apple, Monitor, Loader2 } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { startGuidedDownload } from "@/lib/downloadGuide";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

function useDownload(platform: "win" | "mac") {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = () => {
    setDownloading(true);
    startGuidedDownload(platform);
    window.setTimeout(() => setDownloading(false), 3000);
  };
  return { downloading, handleDownload };
}

function StartFreeButtons() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const win = useDownload("win");
  const mac = useDownload("mac");

  return (
    <div className="mt-8 space-y-2">
      <button
        onClick={() => { win.handleDownload(); mac.handleDownload = () => {}; }}
        disabled={win.downloading}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-[#151820]/12 bg-[#151820] px-6 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
      >
        {win.downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Monitor className="h-4 w-4" />}
        {win.downloading ? "Descargando..." : "Descargar para Windows"}
      </button>
      <button
        onClick={mac.handleDownload}
        disabled={mac.downloading}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-[#151820]/12 bg-white px-6 text-sm font-black text-[#151820] shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
      >
        {mac.downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Apple className="h-4 w-4" />}
        {mac.downloading ? "Descargando..." : "Descargar para Mac"}
      </button>
      <button
        onClick={() => navigate(user ? "/daily" : "/welcome")}
        className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#F7F6F1] px-4 text-xs font-semibold text-[#151820]/55 transition hover:text-[#151820]/80"
      >
        Usar versión web
      </button>
    </div>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const payLink = "https://wa.me/message/KIUXTXD5QBPEJ1";

  const freeFeatures = [
    "Tareas ilimitadas",
    "Calendario inteligente",
    "Mini ventana flotante",
    "Integraciones (Google Calendar, Google Sheets, Notion)",
    "Sistema de amigos y racha",
    "Acceso web y desktop",
  ];

  const proFeatures = [
    { text: "Todo lo del plan Gratis", sub: "" },
    { text: "IA que te conoce y aprende de ti", sub: "Cada semana entiende mejor tu ritmo, prioridades y bloqueos" },
    { text: "Planificación automática de tu día", sub: "La IA organiza tu agenda según lo que importa hoy" },
    { text: "Priorización inteligente de tareas", sub: "Sabe qué hacer primero sin que tú lo pienses" },
    { text: "Recomendaciones para lograr tus metas", sub: "Acciones concretas paso a paso según tus objetivos" },
    { text: "IA integrada en tu día a día", sub: "No es un chatbot: es tu copiloto de productividad" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F6F1] text-[#151820] selection:bg-[#5B7CFA]/20 selection:text-[#5B7CFA]">
      <PublicNav user={user} profile={profile} />
      <main className="pt-16">
        <section id="precio" className="px-5 py-20 sm:px-8 md:py-28 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <motion.div {...fadeUp} className="mb-14 text-center">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#5B7CFA]">Planes y precios</p>
              <h1 className="text-4xl font-black leading-[0.96] tracking-[-0.03em] text-[#151820] sm:text-6xl">
                El plan que necesites
              </h1>
              <p className="mt-5 text-lg font-semibold text-[#151820]/60">
                Empieza gratis. Cuando quieras más, actualizas.
              </p>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Plan Gratis */}
              <motion.div
                {...fadeUp}
                className="flex flex-col rounded-[28px] border border-[#151820]/8 bg-white p-8 shadow-sm"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5B7CFA]">Gratis</p>
                <p className="mt-2 text-5xl font-black text-[#151820]">$0</p>
                <p className="mt-1 text-sm font-semibold text-[#151820]/48">Siempre gratis</p>

                <div className="mt-8 flex-1 space-y-3">
                  {freeFeatures.map((f) => (
                    <div key={f} className="flex items-center gap-3 text-sm font-bold text-[#151820]/72">
                      <Check className="h-4 w-4 flex-shrink-0 text-[#6FCF97]" />
                      {f}
                    </div>
                  ))}
                  <div className="mt-2 flex items-center gap-3 border-t border-[#151820]/6 pt-3 text-sm font-bold text-[#151820]/30">
                    <Brain className="h-4 w-4 flex-shrink-0" />
                    Sin inteligencia artificial
                  </div>
                </div>

                <StartFreeButtons />
              </motion.div>

              {/* Plan Pro */}
              <motion.div
                {...fadeUp}
                className="relative flex flex-col rounded-[28px] border border-[#5B7CFA]/25 bg-[#151820] p-8 text-white shadow-[0_18px_50px_rgba(91,124,250,0.18)]"
              >
                <div className="absolute right-6 top-6 rounded-full bg-[#5B7CFA] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                  Recomendado
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#AFC0FF]">Pro</p>
                <p className="mt-2 text-5xl font-black text-white">$12</p>
                <p className="mt-1 text-sm font-semibold text-white/48">Por mes &bull; cancela cuando quieras</p>

                <div className="mt-8 flex-1 space-y-4">
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
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#AFC0FF]">Cómo funciona la IA</p>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-white/58">
                    Cuanto más la usas, más sabe qué necesitas y cuándo. No es otro chatbot, es un copiloto que aprende de tu rutina y te ayuda a avanzar en tus metas sin saturarte.
                  </p>
                </div>

                <div className="mt-6">
                  <a
                    href={payLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#5B7CFA] px-6 text-sm font-black text-white shadow-[0_18px_45px_rgba(91,124,250,0.26)] transition hover:bg-[#4F6EE8] hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Obtener Pro
                    <ArrowRight className="h-4 w-4 animate-[ctaArrow_1.15s_ease-in-out_infinite]" />
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
