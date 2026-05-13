import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { motion } from "framer-motion";
import { Terminal, Code, Info, AlertTriangle, CheckCircle2, XCircle, HardDrive, Network, ShieldAlert, ArrowLeft, Command } from "lucide-react";

const ExitCodesPage = () => {
  useEffect(() => {
    document.title = "Códigos de Retorno | Adonai Documentation";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Documentación técnica de los códigos de retorno y modificadores CLI del instalador de Adonai Tasks.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      <PublicNav />

      {/* ── Header ── */}
      <header className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[500px] bg-primary/5 rounded-[100%] blur-[120px] pointer-events-none -translate-y-1/2" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto relative z-10"
        >
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
            <Terminal className="w-3.5 h-3.5" />
            Documentación Técnica
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            Códigos de <span className="text-primary font-mono">Retorno</span>
          </h1>
          <p className="text-lg text-foreground/40 font-medium">
            Documentación de <code className="bg-white/5 px-2 py-0.5 rounded font-mono text-primary italic">Adonai-Setup.exe</code>.
          </p>
        </motion.div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto px-6 pb-32">
        <div className="grid gap-16 md:gap-24">
          
          {/* Section: Escenarios de instalación */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
                <Code className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Escenarios de instalación</h2>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-foreground/5 bg-secondary/30 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-foreground/5 bg-foreground/[0.02]">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-foreground/30">Escenario</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-foreground/30">Código</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-foreground/30">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {[
                      { scenario: "Instalación exitosa", code: "0", desc: "Instalación completada correctamente.", icon: <CheckCircle2 className="w-4 h-4 text-primary" />, status: "success" },
                      { scenario: "Error general", code: "1", desc: "Cualquier error de instalación no especificado.", icon: <XCircle className="w-4 h-4 text-red-500" />, status: "error" },
                      { scenario: "Cancelado por usuario", code: "2", desc: "No aplica en modo oneClick (sin interfaz).", icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, status: "warning" },
                      { scenario: "Aplicación ya existe", code: "3", desc: "Se detecta y actualiza la versión existente.", icon: <CheckCircle2 className="w-4 h-4 text-primary" />, status: "success" },
                      { scenario: "Instalación en curso", code: "4", desc: "NSIS bloquea con mutex. Segundo proceso rechazado.", icon: <ShieldAlert className="w-4 h-4 text-red-500" />, status: "error" },
                      { scenario: "Disco lleno", code: "5", desc: "Espacio insuficiente en el disco de destino.", icon: <HardDrive className="w-4 h-4 text-red-500" />, status: "error" },
                      { scenario: "Error de red", code: "7", desc: "No aplica. El instalador es un ejecutable local.", icon: <Network className="w-4 h-4 text-foreground/20" />, status: "muted" },
                    ].map((item, i) => (
                      <tr key={i} className="hover:bg-foreground/[0.02] transition-colors group">
                        <td className="px-6 py-5 font-bold text-sm text-foreground/80 flex items-center gap-3">
                          {item.icon}
                          {item.scenario}
                        </td>
                        <td className="px-6 py-5 font-mono font-black text-primary text-sm tracking-widest">
                          {item.code}
                        </td>
                        <td className="px-6 py-5 text-sm text-foreground/40 font-medium leading-relaxed">
                          {item.desc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>

          {/* Section: Comportamiento */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-8"
          >
            <div className="p-8 rounded-[40px] bg-secondary border border-foreground/5 space-y-6 group hover:border-primary/20 transition-all duration-500">
              <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Comportamiento One-Click</h3>
              <ul className="space-y-4 text-sm text-foreground/60 font-medium">
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Ejecución silenciosa sin ventanas
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Instalación por usuario (sin admin req.)
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Auto-inicio al finalizar
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-[40px] bg-primary/5 border border-primary/10 space-y-6 group hover:bg-primary/10 transition-all duration-500">
              <div className="w-12 h-12 rounded-2xl bg-primary text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                <Command className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Modificadores CLI</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-foreground/5">
                  <code className="text-primary font-black">/S</code>
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Totalmente Silencioso</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-foreground/5">
                  <code className="text-primary font-black">/D=C:\Ruta</code>
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Destino Custom</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section: Disclaimer */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-[32px] bg-secondary/50 border border-foreground/5 text-center space-y-4"
          >
            <p className="text-sm text-foreground/40 font-medium max-w-2xl mx-auto leading-relaxed">
              Esta documentación está dirigida a administradores de sistemas y usuarios avanzados que deseen automatizar el despliegue de Adonai en entornos controlados.
            </p>
            <p className="text-[10px] text-foreground/20 font-bold uppercase tracking-widest">
              Nota: Los códigos de retorno son exclusivos del instalador de Windows (.exe). En macOS (.dmg), la instalación se realiza mediante el arrastre estándar a la carpeta de Aplicaciones.
            </p>
          </motion.section>

        </div>

        {/* ── Back Link ── */}
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
};

export default ExitCodesPage;
