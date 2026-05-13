import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function PublicFooter() {
  return (
    <footer className="border-t border-foreground/5 px-6 py-12 md:py-20 bg-background">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 transition-transform group-hover:scale-110">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path
                    d="M20 50 L40 75 L85 25"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-2xl font-black tracking-tight">Adonai</span>
            </Link>
            <p className="text-sm text-foreground/40 max-w-xs leading-relaxed">
              El sistema operativo mental diseñado para el emprendedor que busca calma y claridad ante el caos.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-sm font-bold text-foreground/40">
            <div className="flex flex-col gap-4">
              <span className="text-foreground/20 uppercase tracking-widest text-[10px]">Producto</span>
              <Link to="/caracteristicas" className="hover:text-primary transition-colors">Características</Link>
              <Link to="/faq" className="hover:text-primary transition-colors">Preguntas Frecuentes</Link>
              <Link to="/auth" className="hover:text-primary transition-colors">Versión Web</Link>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-foreground/20 uppercase tracking-widest text-[10px]">Legal</span>
              <Link to="/politica-de-privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
              <Link to="/terminos-de-servicio" className="hover:text-primary transition-colors">Términos</Link>
              <Link to="/codigos-de-retorno" className="hover:text-primary transition-colors">Códigos de Retorno</Link>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-foreground/20 uppercase tracking-widest text-[10px]">Soporte</span>
              <a href="mailto:support@adonai-app.com" className="hover:text-primary transition-colors">Contacto</a>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-foreground/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-foreground/30 font-medium">
          <p>© {new Date().getFullYear()} Adonai Tasks. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Sistemas Operativos
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
