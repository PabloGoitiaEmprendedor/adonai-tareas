import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";

export function PublicFooter() {
  return (
    <footer className="border-t border-foreground/5 bg-background px-6 py-12 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-12 text-center md:flex-row md:text-left">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <Link to="/" className="group flex items-center gap-3">
              <BrandLogo className="h-11 w-11 transition-transform group-hover:scale-105" />
              <span className="text-2xl font-black tracking-tight">Adonai</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-foreground/45">
              El sistema operativo mental para emprendedores que quieren sacar el caos de la cabeza y ejecutar con calma.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-sm font-bold text-foreground/45">
            <div className="flex flex-col gap-4">
              <span className="text-[10px] uppercase tracking-widest text-foreground/25">Producto</span>
              <Link to="/caracteristicas" className="transition-colors hover:text-primary">Caracteristicas</Link>
              <Link to="/faq" className="transition-colors hover:text-primary">Preguntas frecuentes</Link>
              <Link to="/welcome" className="transition-colors hover:text-primary">Version web</Link>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-[10px] uppercase tracking-widest text-foreground/25">Legal</span>
              <Link to="/politica-de-privacidad" className="transition-colors hover:text-primary">Privacidad</Link>
              <Link to="/terminos-de-servicio" className="transition-colors hover:text-primary">Terminos</Link>
              <Link to="/codigos-de-retorno" className="transition-colors hover:text-primary">Codigos de retorno</Link>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-[10px] uppercase tracking-widest text-foreground/25">Soporte</span>
              <a href="mailto:pablo@webadonai.com" className="transition-colors hover:text-primary">Contacto</a>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-foreground/5 pt-8 text-xs font-medium text-foreground/35 md:flex-row">
          <p>© {new Date().getFullYear()} Adonai. Todos los derechos reservados.</p>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
            Beta activa para emprendedores
          </span>
        </div>
      </div>
    </footer>
  );
}
