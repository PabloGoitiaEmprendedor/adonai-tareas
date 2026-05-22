import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Monitor, Apple, Loader2, Flame, Trophy, Target, CalendarDays, Users, Timer, NotebookTabs, Sparkles, Check, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { startGuidedDownload, type DownloadPlatform } from "@/lib/downloadGuide";

/* ── Download helpers ── */
function useDownload(platform: DownloadPlatform) {
  const [loading, setLoading] = useState(false);
  const handle = () => {
    setLoading(true);
    startGuidedDownload(platform);
    setTimeout(() => setLoading(false), 3000);
  };
  return { loading, handle };
}

/* ── Animated counter ── */
function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Feature block with screenshot and animations ── */
function FeatureBlock({
  icon: Icon, tag, title, body, reversed = false, highlight, screenshot, index,
}: {
  icon: React.ElementType; tag: string; title: string; body: string;
  reversed?: boolean; highlight?: string; screenshot?: string; index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`mx-auto max-w-6xl flex flex-col gap-12 items-center ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"}`}
    >
      {/* Screenshot / Visual */}
      <motion.div
        className="w-full lg:w-[55%] flex-shrink-0"
        initial={{ opacity: 0, scale: 0.9, rotateY: reversed ? -10 : 10 }}
        animate={isInView ? { opacity: 1, scale: 1, rotateY: 0 } : {}}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <div className="relative rounded-[32px] overflow-hidden border border-foreground/10 bg-background shadow-2xl shadow-primary/5 group perspective-1000">
          {screenshot ? (
            <div className="relative aspect-video overflow-hidden">
              <img
                src={screenshot}
                alt={tag}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 privacy-blur"
                loading="lazy"
              />
              <div className="privacy-blur-overlay">
                Vista Privada
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="aspect-video flex items-center justify-center bg-foreground/[0.03] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(91,124,250,0.08),transparent_70%)]" />
              <Icon className="w-24 h-24 text-primary/20 transition-transform duration-700 group-hover:scale-110 group-hover:text-primary/40" />
            </div>
          )}
          
          {/* Decorative elements */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500/40" />
            <div className="w-2 h-2 rounded-full bg-amber-500/40" />
            <div className="w-2 h-2 rounded-full bg-green-500/40" />
          </div>
          
          {/* Inner Glow hover */}
          <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 rounded-[32px] transition-colors duration-500 pointer-events-none" />
        </div>
      </motion.div>

      {/* Text Content */}
      <motion.div
        className="w-full lg:w-[45%] text-center lg:text-left"
        initial={{ opacity: 0, x: reversed ? -40 : 40 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <Icon className="w-4 h-4 text-primary" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">{tag}</p>
        </div>
        <h2 className="text-4xl font-black leading-[1.1] md:text-5xl mb-6 tracking-tight">
          {highlight
            ? title.split(highlight).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="relative inline-block">
                      <span className="relative z-10 text-primary">{highlight}</span>
                      <motion.span 
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        className="absolute bottom-1 left-0 h-3 bg-primary/10 -z-0" 
                      />
                    </span>
                  )}
                </span>
              ))
            : title}
        </h2>
        <p className="text-lg text-foreground/50 leading-relaxed font-medium mb-8">
          {body}
        </p>
        
        <div className="flex flex-wrap justify-center lg:justify-start gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground/30">
            <Check className="w-4 h-4 text-primary" />
            <span>Sin distracciones</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-foreground/30">
            <Check className="w-4 h-4 text-primary" />
            <span>Foco total</span>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}

/* ── Floating particles background ── */
function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-primary/10"
          style={{
            left: `${10 + i * 16}%`,
            top: `${15 + i * 12}%`,
          }}
          animate={{
            y: [0, -50, 0],
            opacity: [0.1, 0.4, 0.1],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function CaracteristicasPage() {
  const win = useDownload("win");
  const mac = useDownload("mac");
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-50px" });

  useEffect(() => {
    document.title = "Funciones de Adonai - Claridad Mental para Emprendedores";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Explora las herramientas que te devuelven el control. S.O. Mental diseñado para emprendedores LATAM que buscan claridad y enfoque.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      <PublicNav />
      <FloatingParticles />

      {/* ── Hero ── */}
      <header ref={heroRef} className="relative px-6 pt-32 pb-24 text-center md:pt-48 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] bg-primary/10 rounded-[100%] blur-[120px] pointer-events-none -translate-y-1/2" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3 mb-8 px-5 py-2.5 rounded-full bg-foreground text-background shadow-2xl">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Funciones Premium</span>
          </div>
        </motion.div>

        <motion.h1
          className="text-6xl font-black leading-[0.95] md:text-8xl tracking-tight relative z-10"
          initial={{ opacity: 0, y: 40 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Simple por fuera.<br />
          <span className="text-primary">Potente</span> por dentro.
        </motion.h1>

        <motion.p
          className="mt-10 mx-auto max-w-2xl text-xl text-foreground/50 leading-relaxed font-medium"
          initial={{ opacity: 0 }}
          animate={heroInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          Adonai es el sistema operativo mental diseñado para que recuperes el control de tu tiempo 
          y tu energía, eliminando el ruido que te sobrepasa.
        </motion.p>
        
        <motion.div
          className="mt-12 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <a href="#features" className="group flex flex-col items-center gap-4 text-foreground/30 hover:text-primary transition-colors">
            <span className="text-xs font-black uppercase tracking-widest">Explorar funciones</span>
            <div className="w-6 h-10 rounded-full border-2 border-current flex justify-center p-1.5">
              <motion.div 
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-1 h-2 rounded-full bg-current" 
              />
            </div>
          </a>
        </motion.div>
      </header>

      {/* ── Stats bar ── */}
      <motion.section
        ref={statsRef}
        className="mx-auto max-w-5xl px-6 pb-32"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={statsInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 rounded-[40px] bg-foreground/[0.02] border border-foreground/5 p-10 md:p-12 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="text-center relative z-10">
            <p className="text-4xl md:text-5xl font-black text-primary mb-2">
              <AnimatedCounter end={100} suffix="%" />
            </p>
            <p className="text-sm text-foreground/40 font-bold uppercase tracking-widest">Gratis para siempre</p>
          </div>
          <div className="text-center relative z-10 border-y md:border-y-0 md:border-x border-foreground/5 py-8 md:py-0">
            <p className="text-4xl md:text-5xl font-black text-primary mb-2">
              <AnimatedCounter end={3} />
            </p>
            <p className="text-sm text-foreground/40 font-bold uppercase tracking-widest">Plataformas nativas</p>
          </div>
          <div className="text-center relative z-10">
            <p className="text-4xl md:text-5xl font-black text-primary mb-2">
              <AnimatedCounter end={0} />
            </p>
            <p className="text-sm text-foreground/40 font-bold uppercase tracking-widest">Publicidad o Distracción</p>
          </div>
        </div>
      </motion.section>

      {/* ── Features ── */}
      <main id="features" className="space-y-48 px-6 pb-48">

        {/* 1 — Mini-ventana */}
        <FeatureBlock
          icon={Monitor}
          index={0}
          tag="Mini-ventana"
          title="Tus tareas siempre visibles."
          highlight="siempre visibles."
          body="Una ventanita persistente que flota sobre todas tus aplicaciones. No necesitas cambiar de ventana — tus prioridades están ahí, acompañándote en cada paso para que nunca pierdas el foco."
          reversed={false}
          screenshot="/screenshots/mini-window.png"
        />

        {/* 2 — Racha */}
        <FeatureBlock
          icon={Flame}
          index={1}
          tag="Racha diaria"
          title="Mantén la calma, paso a paso."
          highlight="paso a paso."
          body="Visualiza tu progreso sin presión. Cada día que completas tus tareas fundamentales, tu racha crece, recordándote que eres capaz de mantener la estructura incluso en los días difíciles."
          reversed={true}
          screenshot="/screenshots/daily-view.png"
        />

        {/* 3 — Logros */}
        <FeatureBlock
          icon={Trophy}
          index={2}
          tag="Logros"
          title="Celebra tu supervivencia."
          highlight="supervivencia."
          body="Reconoce el esfuerzo de gestionar tu mente. Desbloquea hitos que no premian el 'hacer más', sino el mantener el enfoque y la consistencia en tu bienestar diario."
          reversed={false}
        />

        {/* 4 — Metas */}
        <FeatureBlock
          icon={Target}
          index={3}
          tag="Estructura para el caos"
          title="Claridad sobre el ruido."
          highlight="el ruido."
          body="Define lo que realmente importa para tu paz mental. Vincula tus acciones diarias con metas que te den dirección, evitando que el día a día se convierta en una espiral de urgencias."
          reversed={true}
        />

        {/* 5 — Calendario */}
        <FeatureBlock
          icon={CalendarDays}
          index={4}
          tag="Calendario 360"
          title="Domina tu tiempo, visualmente."
          highlight="Domina tu tiempo,"
          body="Integra tus tareas con una vista de calendario fluida. Planifica tu semana, arrastra eventos y visualiza tus huecos libres para una gestión del tiempo sin estrés."
          reversed={false}
          screenshot="/screenshots/calendar-view.png"
        />

        {/* 6 — Amigos */}
        <FeatureBlock
          icon={Users}
          index={5}
          tag="Comunidad y Apoyo"
          title="No estás solo en esto."
          highlight="solo en esto."
          body="Conéctate con otros emprendedores que entienden el reto de gestionar la mente. Comparte rachas y logros para sentir el respaldo de una comunidad que busca lo mismo que tú: calma."
          reversed={true}
        />

        {/* 7 — Temporizador */}
        <FeatureBlock
          icon={Timer}
          index={6}
          tag="Time Boxing"
          title="Trabaja en bloques de foco."
          highlight="bloques de foco."
          body="Utiliza el temporizador integrado para asignar bloques de tiempo específicos a tus tareas. Evita que una tarea sencilla se expanda hasta ocupar todo tu día."
          reversed={false}
        />

        {/* 8 — Cuadernos */}
        <FeatureBlock
          icon={NotebookTabs}
          index={7}
          tag="Cuadernos"
          title="Cada cosa en su lugar."
          highlight="su lugar."
          body="Organiza tus tareas por proyectos, áreas de vida o categorías mediante cuadernos claros. Mantén tu mente despejada sabiendo que todo está organizado."
          reversed={true}
          screenshot="/screenshots/folders-view.png"
        />

      </main>

      {/* ── Final CTA ── */}
      <motion.section
        className="relative bg-foreground text-background px-6 py-32 md:py-48 text-center overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(91,124,250,0.12),transparent_70%)]" />
        
        <div className="relative z-10 mx-auto max-w-4xl">
          <motion.h2
            className="text-6xl font-black leading-[0.9] md:text-8xl tracking-tight mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Libera tu <br />
            <span className="text-primary">potencial</span> hoy.
          </motion.h2>
          
          <motion.p
            className="mt-8 text-xl md:text-2xl text-background/50 max-w-2xl mx-auto mb-16 font-medium leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Simplifica tu flujo de trabajo hoy mismo. 
            Sin suscripciones, sin trampas. Solo claridad pura.
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <button
              onClick={win.handle}
              disabled={win.loading}
              className="group flex items-center justify-center gap-3 rounded-full bg-primary px-10 py-5 text-lg font-black text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-60 shadow-xl shadow-primary/20"
            >
              {win.loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Monitor className="w-6 h-6" />}
              <span>{win.loading ? "Descargando…" : "Descargar para Windows"}</span>
            </button>
            <button
              onClick={mac.handle}
              disabled={mac.loading}
              className="group flex items-center justify-center gap-3 rounded-full bg-background/10 border-2 border-background/20 px-10 py-5 text-lg font-black text-background transition-all hover:bg-background/20 hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {mac.loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Apple className="w-6 h-6" />}
              <span>{mac.loading ? "Descargando…" : "Descargar para Mac"}</span>
            </button>
          </motion.div>
          
          <motion.div
            className="mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Link to="/auth" className="text-background/40 hover:text-primary transition-colors font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 group">
              O usa la versión web
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      <PublicFooter />
    </div>
  );
}
