import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { motion } from "framer-motion";
import { FileText, Scale, User, Ban, Copyright, Zap, AlertCircle, RefreshCcw, LogOut, Gavel, Mail, ArrowLeft, Check } from "lucide-react";

export default function TermsOfServicePage() {
  useEffect(() => {
    document.title = "Términos de Servicio | Adonai Tasks";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Consulta los términos y condiciones de uso de Adonai Tasks. Transparencia, responsabilidad y respeto por tus datos.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <PublicNav />
      
      {/* ── Header ── */}
      <header className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[500px] bg-primary/5 rounded-[100%] blur-[120px] pointer-events-none -translate-y-1/2" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto relative z-10"
        >
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
            <Scale className="w-3.5 h-3.5" />
            Condiciones
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            Términos de <span className="text-primary">Servicio</span>
          </h1>
          <p className="text-lg text-foreground/40 font-medium">
            Última actualización: 11 de mayo de 2026. Transparencia desde el primer día.
          </p>
        </motion.div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto px-6 pb-32">
        <div className="grid gap-16 md:gap-24">
          
          {/* Section 1 - Acceptance */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">01.</span> Aceptación de los términos
                </h2>
                <p className="text-foreground/60 leading-relaxed font-medium">
                  Al descargar, instalar o utilizar Adonai, aceptas estar sujeto a estos Términos y Condiciones de Servicio. Si no estás de acuerdo con alguno de estos términos, no debes utilizar la Aplicación.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Section 2 - Service */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">02.</span> Descripción del servicio
                </h2>
                <div className="prose prose-invert max-w-none text-foreground/60 leading-relaxed font-medium space-y-4">
                  <p>Adonai ofrece una suite de productividad contextual que incluye:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Priorización con IA</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Captura por voz</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Integración con Calendar</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Análisis de patrones</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 3 - Rules */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <Ban className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">03.</span> Uso aceptable
                </h2>
                <div className="grid gap-4">
                  <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-sm font-medium text-foreground/60">
                    Está terminantemente prohibido realizar ingeniería inversa, descompilar o intentar acceder a datos de otros usuarios.
                  </div>
                  <p className="text-foreground/60 font-medium">
                    Te comprometes a no usar la aplicación para fines ilegales ni interferir con el funcionamiento normal del servicio.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 4 - IP */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <Copyright className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">04.</span> Propiedad intelectual
                </h2>
                <p className="text-foreground/60 leading-relaxed font-medium">
                  Todo el contenido de la Aplicación (diseño, código, algoritmos) es propiedad de Adonai. Sin embargo, <strong>tus datos te pertenecen</strong>. Nos otorgas una licencia limitada solo para poder procesarlos y entregarte el servicio.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Section 5 - Responsibility */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">05.</span> Limitación de responsabilidad
                </h2>
                <div className="p-8 rounded-[32px] bg-secondary/50 border border-foreground/5 space-y-4">
                  <p className="text-foreground/60 font-medium italic">"Adonai se proporciona 'tal cual' y 'según disponibilidad'."</p>
                  <p className="text-sm text-foreground/40 font-medium">
                    No nos hacemos responsables por pérdida de datos fuera de nuestro control ni por decisiones tomadas basándose en las sugerencias generadas por nuestra IA.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 6 - Law */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <Gavel className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">06.</span> Ley aplicable
                </h2>
                <p className="text-foreground/60 leading-relaxed font-medium">
                  Estos términos se rigen por las leyes del país de residencia del desarrollador. Cualquier disputa será resuelta en los tribunales competentes de dicha jurisdicción.
                </p>
              </div>
            </div>
          </motion.section>

        </div>

        {/* ── Back to home ── */}
        <div className="mt-24 pt-12 border-t border-foreground/5 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-foreground/30 hover:text-primary transition-colors font-black text-sm uppercase tracking-widest group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Volver al inicio
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
