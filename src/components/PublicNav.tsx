import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Download, Monitor, Apple, Loader2 } from "lucide-react";
import { WIN_DOWNLOAD, MAC_DOWNLOAD } from "@/lib/download-urls";

const NAV_LINKS = [
  { label: "Inicio",          to: "/" },
  { label: "Características", to: "/caracteristicas" },
  { label: "FAQ",             to: "/faq" },
];

function useDownloadWin() {
  const [loading, setLoading] = useState(false);
  const handle = () => {
    setLoading(true);
    const a = document.createElement("a");
    a.href = WIN_DOWNLOAD;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setLoading(false), 3000);
  };
  return { loading, handle };
}

export function PublicNav() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loading, handle } = useDownloadWin();

  const isActive = (to: string) => location.pathname === to.split("#")[0];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground/8 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-16">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="Adonai — Inicio">
          <div className="w-7 h-7 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]">
              <defs>
                <linearGradient id="nav-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
              <path d="M20 50 L40 75 L85 25" fill="none" stroke="url(#nav-logo-grad)"
                strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-base font-black tracking-tight group-hover:text-primary transition-colors">Adonai</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Navegación principal">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                isActive(l.to)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={handle}
            disabled={loading}
            id="nav-download-win"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Monitor className="w-3.5 h-3.5" />}
            Descargar gratis
          </button>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-foreground/5"
          >
            Entrar a la app
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-foreground/60 hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-foreground/8 bg-background/98 px-6 py-4 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                isActive(l.to)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-foreground/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <button
              onClick={() => { handle(); setMobileOpen(false); }}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Monitor className="w-4 h-4" />}
              Descargar para Windows
            </button>
            <Link
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="w-full inline-flex items-center justify-center rounded-full border border-foreground/15 px-5 py-3 text-sm font-semibold text-foreground/70 transition hover:bg-foreground/5"
            >
              Entrar a la app web
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
