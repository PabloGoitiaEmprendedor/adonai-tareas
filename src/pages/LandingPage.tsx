import { motion } from 'framer-motion'; 
import { Download, Target, Timer, Link2, Eye, ChevronRight } from 'lucide-react';
import { downloadDesktopApp } from '@/lib/desktopApp';

const DOWNLOAD_URL = "https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/latest";

const handleDownload = () => {
  downloadDesktopApp();
};

/* ─── tiny reusable pieces ─── */
const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-[#C3F53C] text-[#1a1a1a] px-2 py-0.5 inline-block italic">{children}</span>
);

const headingFont = { fontFamily: "'Fraunces', serif" };

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#888] mb-6">{children}</p>
);

/* ─── VIDEO CARDS (Feature demos) ─── */
const VideoCard = ({ src, label }: { src: string; label: string }) => (
  <div className="bg-[#f0efe8] rounded-2xl overflow-hidden border border-[#e0dfd8] shadow-sm flex flex-col">
    <div className="aspect-video bg-[#1a1a1a] relative overflow-hidden">
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
    <p className="text-center text-sm font-bold text-[#333] py-4 px-2">{label}</p>
  </div>
);

/* ─── PAIN-POINT CARD ─── */
const PainCard = ({ text }: { text: string }) => (
  <div className="bg-[#2a2a2a] border border-white/10 rounded-2xl p-6 text-left backdrop-blur-sm">
    <div className="flex items-center gap-2 mb-4 text-lg">
      <span>😵</span>
      <span className="text-white/40">➡</span>
    </div>
    <p className="text-white/80 text-sm leading-relaxed">{text}</p>
  </div>
);

/* ─── TESTIMONIAL CARD ─── */
const TestimonialCard = ({ text, name, role }: { text: string; name: string; role: string }) => (
  <div className="bg-[#f0efe8] border border-[#e0dfd8] rounded-2xl p-6 text-left">
    <span className="text-[#C3F53C] text-3xl font-black leading-none">"</span>
    <p className="text-[#333] text-sm leading-relaxed mt-2 mb-4">{text}</p>
    <div className="pt-3 border-t border-[#ddd]">
      <p className="font-bold text-[#333] text-xs">{name}</p>
      <p className="text-[#888] text-xs">{role}</p>
    </div>
  </div>
);

/* ─── FEATURE CARD (small extras) ─── */
const FeatureCard = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="bg-[#f0efe8] border border-[#e0dfd8] rounded-2xl p-6 text-left">
    <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center mb-4 border border-[#ddd]">
      <Icon className="w-5 h-5 text-[#333]" />
    </div>
    <h4 className="font-bold text-[#1a1a1a] text-base mb-2">{title}</h4>
    <p className="text-[#666] text-sm leading-relaxed">{desc}</p>
  </div>
);

/* ─── STEP CARD ─── */
const StepCard = ({ number, title, desc }: { number: string; title: string; desc: string }) => (
  <div className="bg-[#f0efe8] border border-[#e0dfd8] rounded-2xl p-6 text-left">
    <div className="w-8 h-8 rounded-full bg-[#C3F53C] flex items-center justify-center mb-4">
      <span className="text-[#1a1a1a] font-black text-sm">{number}</span>
    </div>
    <h4 className="font-bold text-[#1a1a1a] text-lg mb-1">{title}</h4>
    <p className="text-[#666] text-sm">{desc}</p>
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ════════════════════════════════════════════════════════ */
const LandingPage = () => {
  return (
    <div className="min-h-screen font-sans antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFCF6]/80 backdrop-blur-xl border-b border-[#e0dfd8]/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1a1a1a] rounded-full" />
            <span className="font-black text-[#1a1a1a] text-lg tracking-tight">Adonai</span>
          </div>
          <button
            onClick={handleDownload}
            className="bg-[#1a1a1a] text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-[#333] transition-colors"
          >
            Descargar gratis
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 overflow-hidden" style={{ background: 'linear-gradient(180deg, #FDFCF6 0%, #f0efe8 50%, #e8e7df 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 bg-[#C3F53C]/30 border border-[#C3F53C]/50 rounded-full px-4 py-1.5 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#6abf40] animate-pulse" />
                <span className="text-xs font-bold text-[#333]">Descarga gratuita</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black text-[#1a1a1a] leading-[0.95] tracking-tight mb-6" style={headingFont}>
                Tus tareas.<br />
                <Highlight>siempre a la</Highlight><br />
                <Highlight>vista</Highlight>.
              </h1>

              <p className="text-lg text-[#666] leading-relaxed mb-8 max-w-md">
                Una ventanita pequeña vive en tu escritorio. La miras, marcas lo que hiciste y listo. Sin abrir apps.
              </p>

              <button
                onClick={handleDownload}
                className="group flex items-center gap-3 bg-[#C3F53C] hover:bg-[#d4ff5c] text-[#1a1a1a] font-bold text-base px-8 py-4 rounded-full transition-all hover:shadow-lg hover:shadow-[#C3F53C]/30 active:scale-[0.97]"
              >
                <Download className="w-5 h-5" />
                Descargar para Windows
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-xs text-[#999] mt-3">Gratis · Windows 10/11 · Sin cuenta necesaria</p>
            </motion.div>

            {/* Right — Hero video mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.9 }}
              className="relative hidden lg:block"
            >
              <div className="relative bg-[#f0efe8] rounded-3xl border border-[#e0dfd8] p-4 shadow-2xl shadow-black/5 overflow-hidden">
                <video
                  src="/videos/demo-1.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full rounded-2xl"
                  poster="/videos/poster-1.jpg"
                />
              </div>
              {/* Floating accent */}
              <div className="absolute -bottom-4 -left-4 bg-[#C3F53C] px-4 py-2 rounded-xl shadow-lg font-bold text-sm text-[#1a1a1a] flex items-center gap-2 animate-bounce">
                ✓ Tarea completada +50XP
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── PROBLEM SECTION (dark) ─── */}
      <section className="py-24 bg-[#1a1a1a] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C3F53C]/30 to-transparent" />
        <div className="max-w-5xl mx-auto px-6 text-center">
          <SectionLabel>¿Te suena familiar?</SectionLabel>
          <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4" style={headingFont}>
            Las apps de tareas<br />
            <span className="text-[#C3F53C]">cansan más que ayudan.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
            <PainCard text={'"Me olvido de mis tareas porque abrir otra app cansa."'} />
            <PainCard text={'"Probé mil apps y siempre vuelvo a mi cuaderno."'} />
            <PainCard text={'"Me da pereza buscar botones, menús y pantallas."'} />
          </div>
        </div>
      </section>

      {/* ─── "ASÍ SE VE" — Video demos ─── */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #FDFCF6 0%, #f0efe8 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <SectionLabel>Así se ve</SectionLabel>
          <h2 className="text-4xl md:text-6xl font-black text-[#1a1a1a] leading-tight mb-4" style={headingFont}>
            Una ventanita.<br />
            <Highlight>Siempre ahí.</Highlight>
          </h2>
          <p className="text-[#666] text-lg max-w-xl mx-auto mb-16">
            No tapa nada. No molesta. Solo te recuerda lo que tienes que hacer.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <VideoCard src="/videos/demo-1.mp4" label="Vive en tu escritorio" />
            <VideoCard src="/videos/demo-2.mp4" label="Marca con un clic" />
            <VideoCard src="/videos/demo-3.mp4" label="Agrega en segundos" />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #f0efe8 0%, #e8e7df 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <SectionLabel>Cómo funciona</SectionLabel>
          <h2 className="text-4xl md:text-6xl font-black text-[#1a1a1a] leading-tight mb-16" style={headingFont}>
            Tan fácil que <Highlight>no piensas.</Highlight>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard number="1" title="La abres una vez" desc="Y se queda en tu escritorio." />
            <StepCard number="2" title="Escribes tu tarea" desc="En un segundo. Sin menús." />
            <StepCard number="3" title="La marcas y listo" desc="Un clic y desaparece." />
          </div>
        </div>
      </section>

      {/* ─── SMALL EXTRAS (features) ─── */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #e8e7df 0%, #FDFCF6 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <SectionLabel>Pequeños extras</SectionLabel>
          <h2 className="text-4xl md:text-6xl font-black text-[#1a1a1a] leading-tight mb-16" style={headingFont}>
            Simple. Pero <Highlight>poderoso</Highlight>.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              icon={Target}
              title="¿Qué hago primero?"
              desc="Te ayudamos a ordenar tus tareas con un método simple: lo urgente y lo importante. Sin pensar mucho."
            />
            <FeatureCard
              icon={Timer}
              title="Pon tiempo a cada tarea"
              desc="Así no te distraes. Cuando el tiempo se acaba, tú decides si sigues o pasas a la siguiente."
            />
            <FeatureCard
              icon={Link2}
              title="Guarda tus links"
              desc="¿Un video que ver? ¿Una página? Pégala en la tarea y la abres con un clic."
            />
            <FeatureCard
              icon={Eye}
              title="Siempre a la vista"
              desc="Mientras trabajas, mientras lees mail, mientras navegas. Tus tareas no se esconden."
            />
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #FDFCF6 0%, #f0efe8 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <SectionLabel>Lo que nos dice la gente</SectionLabel>
          <h2 className="text-4xl md:text-6xl font-black text-[#1a1a1a] leading-tight mb-16" style={headingFont}>
            No estás <Highlight>solo</Highlight>.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TestimonialCard
              text="Lo más pesado es abrir una app solo para anotar algo."
              name="Daniela R."
              role="Freelancer"
            />
            <TestimonialCard
              text="Probé muchas apps, pero siempre vuelvo a lo más simple."
              name="Carlos M."
              role="Emprendedor"
            />
            <TestimonialCard
              text="Cuando algo está en mi cara todo el día, sí lo uso."
              name="Laura P."
              role="Diseñadora"
            />
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA (dark) ─── */}
      <section className="py-28 bg-[#1a1a1a] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C3F53C]/30 to-transparent" />
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-7xl font-black text-white leading-tight mb-6" style={headingFont}>
            ¿Quieres <Highlight>probarla</Highlight><br />primero?
          </h2>
          <p className="text-[#C3F53C]/70 text-lg mb-10">
            Descárgala gratis. Sin cuenta. Sin tarjeta. Solo instala y empieza.
          </p>

          <button
            onClick={handleDownload}
            className="group inline-flex items-center gap-3 bg-[#C3F53C] hover:bg-[#d4ff5c] text-[#1a1a1a] font-bold text-lg px-10 py-5 rounded-full transition-all hover:shadow-lg hover:shadow-[#C3F53C]/30 active:scale-[0.97]"
          >
            <Download className="w-5 h-5" />
            Descargar para Windows
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-[#666] text-sm mt-6">Solo te escribimos para esto. Nada más.</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 bg-[#f0efe8] border-t border-[#e0dfd8]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#999] text-sm">© 2026 Adonai. Hecho simple, a propósito.</p>
          <div className="flex items-center gap-6">
            <a href="/#/privacy" className="text-[#999] text-sm hover:text-[#333] transition-colors">Privacidad</a>
            <a href="/#/terms" className="text-[#999] text-sm hover:text-[#333] transition-colors">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
