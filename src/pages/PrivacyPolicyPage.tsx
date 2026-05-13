import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { motion } from "framer-motion";
import { Shield, Lock, Eye, Database, Globe, UserCheck, Cookie, Info, Mail, ArrowLeft, Sparkles, Check } from "lucide-react";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = "Política de Privacidad | Adonai Tasks";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Conoce cómo Adonai Tasks protege tus datos y respeta tu privacidad. Transparencia total sobre el uso de tu información.");
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
            <Shield className="w-3.5 h-3.5" />
            Legal
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            Política de <span className="text-primary">Privacidad</span>
          </h1>
          <p className="text-lg text-foreground/40 font-medium">
            Última actualización: 11 de mayo de 2026. Tu privacidad no es negociable.
          </p>
        </motion.div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto px-6 pb-32">
        <div className="grid gap-16 md:gap-24">
          
          {/* Section 1 */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">01.</span> Información que recopilamos
                </h2>
                <div className="prose prose-invert max-w-none text-foreground/60 leading-relaxed font-medium space-y-4">
                  <p>Adonai recopila la siguiente información para ofrecer una experiencia personalizada de productividad:</p>
                  <ul className="grid gap-4 list-none p-0">
                    <li className="flex gap-3 bg-secondary/30 p-4 rounded-2xl border border-foreground/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <p><strong>Datos de cuenta:</strong> nombre, correo electrónico y foto de perfil proporcionados a través de Google Sign-In.</p>
                    </li>
                    <li className="flex gap-3 bg-secondary/30 p-4 rounded-2xl border border-foreground/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <p><strong>Datos de Google Calendar:</strong> eventos de tu calendario para ayudarte a planificar tu día. Accedemos con permisos de lectura y escritura que autorizas explícitamente.</p>
                    </li>
                    <li className="flex gap-3 bg-secondary/30 p-4 rounded-2xl border border-foreground/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <p><strong>Datos de contexto personal:</strong> información que proporcionas voluntariamente durante el registro (ocupación, industria, metas, etc.) para personalizar las recomendaciones de la IA.</p>
                    </li>
                    <li className="flex gap-3 bg-secondary/30 p-4 rounded-2xl border border-foreground/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <p><strong>Tareas y metas:</strong> las tareas, objetivos y prioridades que creas dentro de la aplicación.</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 2 */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">02.</span> Cómo usamos tu información
                </h2>
                <div className="prose prose-invert max-w-none text-foreground/60 leading-relaxed font-medium space-y-4">
                  <p>Tus datos tienen un único propósito: hacerte más productivo. No vendemos ni comerciamos con tu información.</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 list-none p-0">
                    <li className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> Personalizar recomendaciones</li>
                    <li className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> Sincronizar Google Calendar</li>
                    <li className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> Generar resúmenes de IA</li>
                    <li className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> Mejorar el asistente de voz</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 3 - Google Data */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">03.</span> Uso de datos de Google
                </h2>
                <div className="prose prose-invert max-w-none text-foreground/60 leading-relaxed font-medium space-y-6">
                  <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/20">
                    <p className="mb-4">El uso y la transferencia a cualquier otra aplicación de la información recibida de las API de Google se adhiere a la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Política de datos de usuario de los servicios de API de Google</a>, incluidos los requisitos de uso limitado.</p>
                  </div>
                  <ul className="space-y-2">
                    <li>No vendemos datos de Google a terceros.</li>
                    <li>No usamos datos de Google para publicidad.</li>
                    <li>No transferimos datos de Google a terceros sin tu consentimiento explícito.</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 4 - Security */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">04.</span> Almacenamiento y seguridad
                </h2>
                <p className="text-foreground/60 leading-relaxed font-medium">
                  Implementamos políticas de seguridad a nivel de fila (RLS) en nuestra base de datos para garantizar que solo tú puedas acceder a tus datos. Si eliminas tu cuenta, todos tus datos se borran en un plazo de 30 días.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Section 5 - Rights */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">05.</span> Tus derechos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl bg-secondary/40 border border-foreground/5">
                    <h3 className="font-black mb-2">Control total</h3>
                    <p className="text-sm text-foreground/40 font-medium">Accede, corrige o elimina tus datos personales en cualquier momento desde la sección de Perfil.</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-secondary/40 border border-foreground/5">
                    <h3 className="font-black mb-2">Portabilidad</h3>
                    <p className="text-sm text-foreground/40 font-medium">Solicita la exportación de tus datos en un formato estándar y portable.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 6 - Contact */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="flex items-start gap-6">
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary/20">06.</span> Contacto
                </h2>
                <p className="text-foreground/60 leading-relaxed font-medium">
                  Si tienes dudas sobre esta política, escríbenos a: <a href="mailto:support@adonai-app.com" className="text-primary font-black underline hover:text-primary/80">support@adonai-app.com</a>
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
