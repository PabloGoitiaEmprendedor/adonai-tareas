import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { HelpCircle, Mail, Menu, Monitor, X, Loader2 } from "lucide-react";
import { startGuidedDownload } from "@/lib/downloadGuide";
import { BrandLogo } from "@/components/BrandLogo";

const NAV_LINKS = [
  { label: "Inicio", section: "inicio" },
  { label: "¿Como funciona?", section: "como-funciona" },
  { label: "Preguntas frecuentes", to: "/faq" },
  { label: "Precio", section: "precio" },
  { label: "Soporte", href: "mailto:pablo@webadonai.com" },
];

function useDownloadWin() {
  const [loading, setLoading] = useState(false);
  const handle = () => {
    setLoading(true);
    startGuidedDownload("win");
    setTimeout(() => setLoading(false), 3000);
  };
  return { loading, handle };
}

export function PublicNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loading, handle } = useDownloadWin();

  const scrollToLandingSection = (section: string) => {
    if (location.pathname !== "/landing" && location.pathname !== "/") {
      navigate("/landing");
      window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      return;
    }
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderNavItem = (item: (typeof NAV_LINKS)[number], mobile = false) => {
    const className = mobile
      ? "block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
      : "rounded-full px-4 py-2 text-sm font-semibold text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground";

    if ("href" in item) {
      return (
        <a key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={className}>
          {item.label}
        </a>
      );
    }

    if ("to" in item) {
      return (
        <Link key={item.label} to={item.to} onClick={() => setMobileOpen(false)} className={className}>
          {item.label}
        </Link>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        onClick={() => {
          scrollToLandingSection(item.section);
          setMobileOpen(false);
        }}
        className={className}
      >
        {item.label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground/8 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <button
          type="button"
          onClick={() => scrollToLandingSection("inicio")}
          className="flex items-center gap-2.5 group"
          aria-label="Adonai - Inicio"
        >
          <BrandLogo className="h-8 w-8 flex-shrink-0 drop-shadow-[0_0_6px_rgba(91,124,250,0.35)]" />
          <span className="text-base font-black tracking-tight transition-colors group-hover:text-primary">Adonai</span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex" role="navigation" aria-label="Navegacion principal">
          {NAV_LINKS.map((item) => renderNavItem(item))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={handle}
            disabled={loading}
            id="nav-download-win"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Monitor className="h-3.5 w-3.5" />}
            Descargar gratis
          </button>
          <Link
            to="/faq"
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-foreground/5"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            FAQ
          </Link>
          <a
            href="mailto:pablo@webadonai.com"
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-foreground/5"
          >
            <Mail className="h-3.5 w-3.5" />
            Soporte
          </a>
        </div>

        <button
          className="p-2 text-foreground/60 transition-colors hover:text-foreground lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="space-y-1 border-t border-foreground/8 bg-background/98 px-6 py-4 lg:hidden">
          {NAV_LINKS.map((item) => renderNavItem(item, true))}
          <div className="flex flex-col gap-2 pt-3">
            <button
              onClick={() => {
                handle();
                setMobileOpen(false);
              }}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Monitor className="h-4 w-4" />}
              Descargar para Windows
            </button>
            <Link
              to="/welcome"
              onClick={() => setMobileOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-full border border-foreground/15 px-5 py-3 text-sm font-semibold text-foreground/70 transition hover:bg-foreground/5"
            >
              Entrar a la app web
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
