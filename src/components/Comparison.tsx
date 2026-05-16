import { Check, X, Monitor, Smartphone, Globe } from "lucide-react";
import { motion } from "framer-motion";

const COMPARISON_DATA = [
  {
    feature: "Gestión de Tareas Completa",
    web: true,
    desktop: true,
    mobile: true,
  },
  {
    feature: "Mini-ventana Siempre Visible",
    web: false,
    desktop: true,
    mobile: false,
  },
  {
    feature: "Notificaciones Nativas",
    web: false,
    desktop: true,
    mobile: true,
  },
  {
    feature: "Inicio Automático",
    web: false,
    desktop: true,
    mobile: false,
  },
  {
    feature: "Atajos de Teclado Globales",
    web: false,
    desktop: true,
    mobile: false,
  },
  {
    feature: "Modo Offline",
    web: true,
    desktop: true,
    mobile: true,
  },
  {
    feature: "Sincronización en Tiempo Real",
    web: true,
    desktop: true,
    mobile: true,
  },
];

export function Comparison() {
  return (
    <section className="px-6 py-24 md:py-32 bg-background overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-20">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-foreground/40">Comparativa</p>
          <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
            Elige tu forma de <br />
            <span className="text-primary">trabajar</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg md:text-xl text-foreground/50 font-medium">
            Aunque puedes usar Adonai en cualquier lugar, la experiencia de escritorio está diseñada para el máximo rendimiento.
          </p>
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="py-8 px-6 text-2xl font-black">Funcionalidad</th>
                <th className="py-8 px-6 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                      <Globe className="w-6 h-6 text-foreground/40" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-foreground/40">Web</span>
                  </div>
                </th>
                <th className="py-8 px-6 text-center relative">
                  <div className="absolute inset-0 bg-primary/5 rounded-t-[32px] -z-10" />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                      <Monitor className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-primary">Desktop</span>
                  </div>
                </th>
                <th className="py-8 px-6 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-foreground/40" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-foreground/40">Mobile</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <motion.tr 
                  key={row.feature}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group"
                >
                  <td className="py-6 px-6 border-t border-foreground/5 font-bold text-lg text-foreground/80 group-hover:text-foreground transition-colors">
                    {row.feature}
                  </td>
                  <td className="py-6 px-6 border-t border-foreground/5 text-center">
                    <div className="flex justify-center">
                      {row.web ? <Check className="w-6 h-6 text-[hsl(var(--success))]" /> : <X className="w-6 h-6 text-foreground/10" />}
                    </div>
                  </td>
                  <td className="py-6 px-6 border-t border-foreground/5 text-center relative">
                    <div className="absolute inset-y-0 inset-x-0 bg-primary/5 -z-10" />
                    <div className="flex justify-center">
                      {row.desktop ? <Check className="w-6 h-6 text-primary" /> : <X className="w-6 h-6 text-foreground/10" />}
                    </div>
                  </td>
                  <td className="py-6 px-6 border-t border-foreground/5 text-center">
                    <div className="flex justify-center">
                      {row.mobile ? <Check className="w-6 h-6 text-[hsl(var(--success))]" /> : <X className="w-6 h-6 text-foreground/10" />}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-8 px-6"></td>
                <td className="py-8 px-6"></td>
                <td className="py-8 px-6 relative">
                  <div className="absolute inset-0 bg-primary/5 rounded-b-[32px] -z-10" />
                  <div className="flex justify-center">
                    <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-tighter">
                      Recomendado
                    </div>
                  </div>
                </td>
                <td className="py-8 px-6"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
