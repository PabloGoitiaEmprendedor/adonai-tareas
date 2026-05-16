import { useEffect, useState } from "react";
import type React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Apple,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Download,
  FolderOpen,
  Globe,
  Goal,
  Loader2,
  Monitor,
  MousePointer2,
  Sparkles,
  Users,
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
      className={`inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 text-sm font-black transition active:scale-95 disabled:opacity-60 ${
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
      className={`inline-flex h-14 items-center justify-center gap-2 rounded-full border px-7 text-sm font-black transition hover:scale-[1.02] active:scale-95 ${
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
        <GenericProductivity />
        <HowItWorks />
        <AdonaiComparison />
        <Pricing />
        <Testimonials />
        <FAQPreview />
        <FinalCTA />
      </main>
      <PublicFooter />
    </div>
  );
}

function Hero() {
  return (
    <section id="inicio" className="relative min-h-[calc(100vh-4rem)] px-6 pt-12 pb-16 md:pt-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(91,124,250,0.14),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(111,207,151,0.12),transparent_32%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.88fr_1.12fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-4 w-4" />
            Mini ventana + Notion + Google Calendar
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-tight md:text-7xl xl:text-8xl">
            Recupera el control de tu semana sin abrir otra app.
          </h1>

          <p className="mt-7 max-w-2xl text-lg font-medium leading-relaxed text-foreground/62 md:text-xl">
            Adonai vive en tu escritorio como una mini ventana flotante, organiza tus tareas, se conecta con Notion y Google Calendar, y te mantiene enfocado sin romper tu flujo.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <IntegrationPill label="Notion" imageSrc="/logos/notion.png" />
            <IntegrationPill label="Google Calendar" imageSrc="/logos/google-calendar.png" />
            <IntegrationPill label="Mini ventana" icon={<Monitor className="h-4 w-4" />} />
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <DownloadButton platform="win" />
            <DownloadButton platform="mac" />
            <WebButton />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="relative"
        >
          <MiniWindowAnimation />
        </motion.div>
      </div>
    </section>
  );
}

function IntegrationPill({ label, icon, imageSrc }: { label: string; icon?: React.ReactNode; imageSrc?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-card px-4 py-2 text-xs font-black text-foreground/70 shadow-sm">
      {imageSrc ? <img src={imageSrc} alt="" className="h-4 w-4 object-contain" /> : <span className="text-primary">{icon}</span>}
      {label}
    </span>
  );
}

function MiniWindowAnimation() {
  const tasks = ["Enviar propuesta", "Revisar calendario", "Actualizar Notion"];
  return (
    <div className="relative mx-auto aspect-[1.12] w-full max-w-[720px] overflow-hidden rounded-[36px] border border-outline-variant bg-[#0F1115] p-5 shadow-[0_32px_90px_rgba(15,17,21,0.28)]">
      <style>{`
        @keyframes adonai-pill {
          0%, 16% { transform: translate(168px, 310px) scale(1); opacity: 1; }
          24%, 68% { transform: translate(78px, 120px) scale(1); opacity: 1; }
          78%, 100% { transform: translate(168px, 310px) scale(1); opacity: 1; }
        }
        @keyframes adonai-panel {
          0%, 18% { opacity: 0; transform: translateY(28px) scale(.88); width: 86px; height: 48px; border-radius: 999px; }
          28%, 70% { opacity: 1; transform: translateY(0) scale(1); width: 360px; height: 390px; border-radius: 28px; }
          82%, 100% { opacity: 0; transform: translateY(28px) scale(.88); width: 86px; height: 48px; border-radius: 999px; }
        }
        @keyframes adonai-cursor {
          0%, 13% { transform: translate(410px, 420px); }
          20% { transform: translate(392px, 407px) scale(.86); }
          30%, 38% { transform: translate(278px, 258px); }
          44% { transform: translate(278px, 258px) scale(.86); }
          55%, 62% { transform: translate(388px, 118px); }
          69% { transform: translate(388px, 118px) scale(.86); }
          78%, 100% { transform: translate(470px, 388px); }
        }
        @keyframes adonai-check {
          0%, 41% { opacity: 0; transform: scale(.6); }
          46%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes adonai-confetti {
          0%, 43% { opacity: 0; transform: translateY(0) rotate(0deg); }
          48% { opacity: 1; }
          65%, 100% { opacity: 0; transform: translateY(-82px) rotate(150deg); }
        }
        @keyframes adonai-tab {
          0%, 57% { opacity: .45; transform: scale(.96); }
          67%, 100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative h-full rounded-[28px] border border-white/8 bg-[#171A21] p-5">
        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-[#EB5757]" />
            <span className="h-3 w-3 rounded-full bg-[#F4B860]" />
            <span className="h-3 w-3 rounded-full bg-[#6FCF97]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Escritorio</span>
        </div>

        <div className="mt-8 grid grid-cols-[1fr_0.8fr] gap-5">
          <div className="space-y-4">
            <div className="h-20 rounded-3xl border border-white/8 bg-white/[0.04] p-4">
              <div className="h-3 w-32 rounded-full bg-white/20" />
              <div className="mt-3 h-2 w-48 rounded-full bg-white/10" />
            </div>
            <div className="h-32 rounded-3xl border border-white/8 bg-white/[0.04] p-4">
              <div className="h-3 w-28 rounded-full bg-white/20" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className={`h-8 rounded-xl ${i === 4 ? "bg-primary" : "bg-white/8"}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-3 w-20 rounded-full bg-white/20" />
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              {["Notion", "Calendar", "Metas"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-xs font-bold text-white/55">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute left-0 top-0" style={{ animation: "adonai-panel 8s infinite cubic-bezier(.22,1,.36,1)" }}>
          <div className="h-full w-full overflow-hidden border border-white/14 bg-[#F7F8FA] p-4 text-[#1F2937] shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6B7280]">Mini ventana</p>
                <h3 className="text-xl font-black">Hoy</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">...</div>
            </div>

            <div className="mb-4 flex gap-2">
              {["Tareas", "Calendario", "Metas"].map((tab, i) => (
                <span
                  key={tab}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-black ${i === 1 ? "bg-primary/10 text-primary" : "bg-[#E8F0FF] text-[#6B7280]"}`}
                  style={i === 1 ? { animation: "adonai-tab 8s infinite" } : undefined}
                >
                  {tab}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              {tasks.map((task, i) => (
                <div key={task} className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-primary/35 bg-[#E8F0FF]">
                    {i === 0 && <Check className="h-4 w-4 text-primary" style={{ animation: "adonai-check 8s infinite" }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-black ${i === 0 ? "text-[#6B7280] line-through" : ""}`}>{task}</p>
                    <p className="text-[10px] font-bold text-[#6B7280]">{i === 1 ? "Google Calendar" : i === 2 ? "Notion" : "Trabajo"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute left-0 top-0" style={{ animation: "adonai-pill 8s infinite cubic-bezier(.22,1,.36,1)" }}>
          <div className="flex h-12 w-[86px] items-center justify-center rounded-full border border-white/12 bg-[#171A21] text-white shadow-2xl">
            <span className="text-2xl leading-none">...</span>
          </div>
        </div>

        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-sm bg-primary"
            style={{
              left: 260 + (i % 5) * 18,
              top: 245 + Math.floor(i / 5) * 12,
              animation: `adonai-confetti 8s infinite ${i * 0.03}s`,
              backgroundColor: ["#5B7CFA", "#6FCF97", "#F4B860", "#EB5757"][i % 4],
            }}
          />
        ))}

        <div className="absolute left-0 top-0 z-20" style={{ animation: "adonai-cursor 8s infinite cubic-bezier(.22,1,.36,1)" }}>
          <MousePointer2 className="h-9 w-9 fill-white text-[#0F1115] drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
        </div>
      </div>
    </div>
  );
}

function GenericProductivity() {
  const pains = [
    ["Demasiadas pestañas", "Las tareas viven en una app, el calendario en otra y las notas en otra."],
    ["Demasiado esfuerzo", "Abrir, buscar, categorizar y volver al trabajo consume energia real."],
    ["Poco foco", "Las apps actuales te sacan del contexto justo cuando necesitas actuar."],
  ];

  return (
    <section className="bg-foreground px-6 py-24 text-background md:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-primary">El problema real</p>
        <h2 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
          La productividad generica no es suficiente cuando tu dia ya esta saturado.
        </h2>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {pains.map(([title, text], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-[28px] border border-background/10 bg-background/[0.04] p-7"
            >
              <span className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground">{i + 1}</span>
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-background/58">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const features = [
    {
      icon: Monitor,
      title: "Mini ventana",
      body: "Se queda visible como una pastilla de tres puntos. La abres, marcas, agregas o revisas sin cambiar de aplicacion.",
      visual: <MiniVisual />,
    },
    {
      icon: CalendarDays,
      title: "Calendario",
      body: "Tus bloques, tareas y citas se ordenan en una vista clara para saber que toca ahora y que viene despues.",
      visual: <CalendarVisual />,
    },
    {
      icon: Clock,
      title: "Racha",
      body: "Celebra consistencia, no presion. Ves el progreso diario y mantienes impulso sin castigos.",
      visual: <StreakVisual />,
    },
    {
      icon: Goal,
      title: "Metas",
      body: "Convierte objetivos grandes en pasos visibles y conectados con tus tareas del dia.",
      visual: <GoalsVisual />,
    },
    {
      icon: Users,
      title: "Amigos",
      body: "Comparte avance con personas que entienden tu ritmo y construye responsabilidad sin ruido.",
      visual: <FriendsVisual />,
    },
    {
      icon: FolderOpen,
      title: "Notion + Google Calendar",
      body: "Adonai se entiende con tus sistemas actuales para que no tengas que abandonar lo que ya usas.",
      visual: <IntegrationsVisual />,
    },
  ];

  return (
    <section id="como-funciona" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-foreground/40">Como funciona</p>
            <h2 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Todo lo que necesitas, sin una interfaz que te robe el dia.
            </h2>
          </div>
          <DownloadButton platform="win" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="overflow-hidden rounded-[32px] border border-outline-variant bg-card shadow-sm"
              >
                <div className="h-56 border-b border-outline-variant bg-surface-container-low p-5">{feature.visual}</div>
                <div className="p-7">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-black">{feature.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">{feature.body}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MiniVisual() {
  return (
    <div className="relative h-full">
      <div className="absolute bottom-4 left-5 flex h-10 w-20 items-center justify-center rounded-full bg-[#171A21] text-xl font-black text-white shadow-xl">...</div>
      <div className="absolute right-3 top-3 w-56 rounded-3xl border border-outline-variant bg-white p-4 shadow-xl">
        {["Planificar dia", "Responder cliente", "Cerrar tarea"].map((t, i) => (
          <div key={t} className="mb-2 flex items-center gap-2 rounded-xl bg-[#F7F8FA] p-2">
            <span className={`h-5 w-5 rounded-lg border ${i === 0 ? "border-primary bg-primary" : "border-[#E5E7EB]"}`} />
            <span className="text-xs font-black text-[#1F2937]">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarVisual() {
  return (
    <div className="grid h-full grid-cols-7 gap-2">
      {Array.from({ length: 28 }).map((_, i) => (
        <div key={i} className={`rounded-xl ${[6, 12, 18].includes(i) ? "bg-primary text-white" : "bg-white"} flex items-center justify-center text-xs font-black text-[#6B7280] shadow-sm`}>
          {i + 1}
        </div>
      ))}
    </div>
  );
}

function StreakVisual() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-[14px] border-primary bg-white text-center shadow-xl">
        <div>
          <p className="text-4xl font-black text-[#1F2937]">12</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">dias</p>
        </div>
      </div>
    </div>
  );
}

function GoalsVisual() {
  return (
    <div className="space-y-3">
      {["Lanzar producto", "30 clientes", "Rutina estable"].map((goal, i) => (
        <div key={goal} className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="mb-2 flex justify-between text-xs font-black text-[#1F2937]">
            <span>{goal}</span>
            <span className="text-primary">{[72, 44, 88][i]}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#E5E7EB]">
            <div className="h-full rounded-full bg-primary" style={{ width: `${[72, 44, 88][i]}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FriendsVisual() {
  return (
    <div className="flex h-full items-center justify-center gap-4">
      {["PG", "LM", "AR"].map((name, i) => (
        <div key={name} className="flex flex-col items-center gap-3">
          <div className={`flex h-16 w-16 items-center justify-center rounded-3xl text-lg font-black text-white shadow-xl ${i === 1 ? "bg-[#6FCF97]" : "bg-primary"}`}>{name}</div>
          <div className="h-2 w-16 rounded-full bg-white">
            <div className="h-full rounded-full bg-primary" style={{ width: `${[80, 56, 92][i]}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function IntegrationsVisual() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
          <img src="/logos/notion.png" alt="" className="mx-auto h-8 w-8 object-contain" />
          <p className="mt-2 text-xs font-black">Notion</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
          <ArrowRight className="h-5 w-5" />
        </div>
        <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
          <img src="/logos/google-calendar.png" alt="" className="mx-auto h-8 w-8 object-contain" />
          <p className="mt-2 text-xs font-black">Calendar</p>
        </div>
      </div>
    </div>
  );
}

function AdonaiComparison() {
  const rows = [
    ["Mini ventana flotante", false, true],
    ["Check de tareas sin cambiar de app", false, true],
    ["Notion y Google Calendar en el flujo", "parcial", true],
    ["Rachas, metas y amigos en el mismo lugar", false, true],
    ["Pensado para escritorio real", false, true],
  ];

  return (
    <section id="comparativa" className="bg-surface-container-low px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-foreground/40">Comparativa</p>
          <h2 className="text-4xl font-black leading-tight md:text-6xl">Apps actuales vs. Adonai</h2>
        </div>
        <div className="overflow-hidden rounded-[32px] border border-outline-variant bg-card shadow-sm">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] border-b border-outline-variant bg-surface-container-low p-5 text-sm font-black uppercase tracking-widest text-on-surface-variant">
            <span>Necesidad</span>
            <span className="text-center">Apps comunes</span>
            <span className="text-center text-primary">Adonai</span>
          </div>
          {rows.map(([label, common, adonai]) => (
            <div key={String(label)} className="grid grid-cols-[1.2fr_0.8fr_0.8fr] border-b border-outline-variant/60 p-5 last:border-b-0">
              <span className="font-bold">{label}</span>
              <span className="flex justify-center">{common === true ? <Check className="text-[hsl(var(--success))]" /> : common === "parcial" ? <span className="rounded-full bg-[#F4B860]/15 px-3 py-1 text-xs font-black text-[#F4B860]">Parcial</span> : <XMark />}</span>
              <span className="flex justify-center">{adonai ? <Check className="text-primary" /> : <XMark />}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function XMark() {
  return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-outline-variant text-sm font-black text-on-surface-variant/50">x</span>;
}

function Pricing() {
  return (
    <section id="precio" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[40px] border border-outline-variant bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-[1fr_0.8fr]">
          <div className="p-8 md:p-12">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-primary">Precio</p>
            <h2 className="text-4xl font-black leading-tight md:text-6xl">Gratis para empezar. Sin tarjeta.</h2>
            <p className="mt-5 text-lg font-medium leading-relaxed text-on-surface-variant">
              Descarga la app de escritorio o entra desde la web. El objetivo es que pruebes la mini ventana sin friccion.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <DownloadButton platform="win" />
              <DownloadButton platform="mac" />
            </div>
          </div>
          <div className="bg-foreground p-8 text-background md:p-12">
            <p className="text-sm font-black uppercase tracking-widest text-primary">Plan actual</p>
            <p className="mt-6 text-7xl font-black">$0</p>
            <p className="mt-2 text-background/55">Windows, Mac y web</p>
            <div className="mt-8 space-y-4 text-sm font-bold text-background/75">
              {["Mini ventana", "Calendario", "Metas y rachas", "Amigos", "Notion + Google Calendar"].map((item) => (
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

function Testimonials() {
  const quotes = [
    ["Siento que por fin mis tareas estan en mi campo visual, no enterradas en otra app.", "Fundador SaaS"],
    ["La mini ventana redujo el caos: marco, agrego y sigo trabajando.", "Creadora de contenido"],
    ["Lo uso con calendario y notas. No reemplaza mi sistema, lo hace visible.", "Consultor"],
  ];

  return (
    <section className="bg-foreground px-6 py-24 text-background md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-primary">Recupera el control</p>
            <h2 className="text-4xl font-black leading-tight md:text-6xl">Menos ruido. Mas accion.</h2>
          </div>
          <DownloadButton platform="win" tone="dark" />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {quotes.map(([quote, role], i) => (
            <motion.div
              key={quote}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-[32px] border border-background/10 bg-background/[0.05] p-8"
            >
              <p className="text-xl font-black leading-snug">"{quote}"</p>
              <p className="mt-6 text-sm font-bold text-background/45">{role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQPreview() {
  const faqs = [
    ["¿Adonai reemplaza Notion?", "No. Se integra con tu flujo para que lo importante este visible sin abandonar tus herramientas."],
    ["¿Funciona con Google Calendar?", "Si. La landing comunica esa integracion como parte del flujo de calendario."],
    ["¿Por que aparece un aviso al instalar?", "La app esta en proceso de verificacion. Al descargar, mostramos un video que explica que hacer."],
  ];

  return (
    <section id="faq" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-foreground/40">Preguntas frecuentes</p>
          <h2 className="text-4xl font-black leading-tight md:text-6xl">Lo que necesitas saber antes de probar.</h2>
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
    <section className="relative overflow-hidden px-6 py-24 md:py-36">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(91,124,250,0.2),transparent_42%)]" />
      <div className="mx-auto max-w-4xl text-center">
        <Download className="mx-auto mb-6 h-12 w-12 text-primary" />
        <h2 className="text-5xl font-black leading-[0.95] md:text-7xl">Instala Adonai y deja tus tareas a la vista.</h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-on-surface-variant">
          Si tu dia vive entre Notion, Google Calendar y mil pendientes, Adonai pone el siguiente paso justo frente a ti.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <DownloadButton platform="win" />
          <DownloadButton platform="mac" />
          <WebButton />
        </div>
        <p className="mt-8 text-sm font-bold text-on-surface-variant">
          Soporte: <a className="text-primary underline underline-offset-4" href="mailto:pablo@webadonai.com">pablo@webadonai.com</a>
        </p>
      </div>
    </section>
  );
}
