import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Apple, HelpCircle, Mail, Menu, Monitor, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { startGuidedDownload } from "@/lib/downloadGuide";

const SUPPORT_EMAIL = "pablo@webadonai.com";

const NAV_LINKS = [
  { label: "Inicio", section: "inicio" },
  { label: "Como funciona", section: "como-funciona" },
  { label: "Precio", section: "precio" },
  { label: "FAQ", to: "/faq" },
  { label: "Soporte", support: true },
];

function NavPlatformChoice({ onClose }: { onClose: () => void }) {
  const chooseDownload = (platform: "win" | "mac") => {
    startGuidedDownload(platform);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#151820]/62 p-3 backdrop-blur-sm sm:items-start sm:pt-20">
      <div className="w-full max-w-sm overflow-hidden rounded-[24px] border border-white/15 bg-white shadow-[0_28px_90px_rgba(21,24,32,0.3)]">
        <div className="flex items-center gap-3 bg-[#151820] p-5 text-white">
          <img src="/logo.png" alt="" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="text-base font-black leading-none">Descargar ahora</p>
            <p className="mt-1 text-xs font-semibold text-white/52">Elige como quieres empezar.</p>
          </div>
        </div>
        <div className="space-y-2 p-3">
          <button onClick={() => chooseDownload("win")} className="flex w-full items-center justify-between rounded-2xl bg-[#F7F6F1] p-4 text-sm font-black text-[#151820] transition hover:bg-[#EEF3FF]">
            Windows <Monitor className="h-4 w-4 text-[#5B7CFA]" />
          </button>
          <button onClick={() => chooseDownload("mac")} className="flex w-full items-center justify-between rounded-2xl bg-[#F7F6F1] p-4 text-sm font-black text-[#151820] transition hover:bg-[#EEF3FF]">
            Mac <Apple className="h-4 w-4 text-[#5B7CFA]" />
          </button>
          <button onClick={onClose} className="w-full rounded-full px-4 py-3 text-xs font-black text-[#151820]/45 transition hover:text-[#151820]">
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

function SupportModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    await navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#151820]/62 p-3 backdrop-blur-sm sm:items-start sm:pt-20">
      <div className="w-full max-w-sm overflow-hidden rounded-[24px] border border-white/15 bg-white shadow-[0_28px_90px_rgba(21,24,32,0.3)]">
        <div className="flex items-center gap-3 bg-[#151820] p-5 text-white">
          <img src="/logo.png" alt="" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="text-base font-black leading-none">Soporte</p>
            <p className="mt-1 text-xs font-semibold text-white/52">Escribenos cuando necesites ayuda.</p>
          </div>
        </div>
        <div className="p-4">
          <div className="rounded-2xl border border-[#151820]/8 bg-[#F7F6F1] p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#151820]/42">Correo</p>
            <p className="mt-2 text-lg font-black text-[#151820]">{SUPPORT_EMAIL}</p>
          </div>
          <button onClick={copyEmail} className="mt-3 w-full rounded-full bg-[#151820] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0B0F17]">
            {copied ? "Copiado" : "Copiar correo"}
          </button>
          <button onClick={onClose} className="mt-2 w-full rounded-full px-4 py-3 text-xs font-black text-[#151820]/45 transition hover:text-[#151820]">
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

export function PublicNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

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
      ? "block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-[#151820] transition-colors hover:bg-white/18"
      : "rounded-full px-4 py-2 text-sm font-bold text-[#151820] transition-colors hover:bg-white/18";

    if ("support" in item) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            setSupportOpen(true);
            setMobileOpen(false);
          }}
          className={className}
        >
          {item.label}
        </button>
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
    <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-white/28 bg-[#5B7CFA]/34 text-[#151820] shadow-[0_12px_38px_rgba(91,124,250,0.12)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#5B7CFA]/30">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <button
          type="button"
          onClick={() => scrollToLandingSection("inicio")}
          className="group flex items-center gap-2.5"
          aria-label="Adonai - Inicio"
        >
          <BrandLogo className="h-8 w-8 flex-shrink-0 drop-shadow-[0_0_6px_rgba(91,124,250,0.35)]" />
          <span className="text-base font-black tracking-tight text-[#151820] transition-colors group-hover:text-[#151820]/78">Adonai</span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex" role="navigation" aria-label="Navegacion principal">
          {NAV_LINKS.map((item) => renderNavItem(item))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => setChoiceOpen(true)}
            id="nav-download-win"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-[#151820] transition hover:bg-white/88"
          >
            <Monitor className="h-3.5 w-3.5 text-[#5B7CFA]" />
            Descargar ahora
          </button>
          <Link
            to="/faq"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#151820]/16 px-4 py-2 text-xs font-bold text-[#151820] transition hover:bg-white/18"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            FAQ
          </Link>
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#151820]/16 px-4 py-2 text-xs font-bold text-[#151820] transition hover:bg-white/18"
          >
            <Mail className="h-3.5 w-3.5" />
            Soporte
          </button>
        </div>

        <button
          className="p-2 text-[#151820] transition-colors hover:bg-white/18 lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="space-y-1 border-t border-white/28 bg-[#5B7CFA]/44 px-6 py-4 backdrop-blur-2xl lg:hidden">
          {NAV_LINKS.map((item) => renderNavItem(item, true))}
          <div className="flex flex-col gap-2 pt-3">
            <button
              onClick={() => {
                setChoiceOpen(true);
                setMobileOpen(false);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#151820] transition hover:bg-white/90"
            >
              <Monitor className="h-4 w-4 text-[#5B7CFA]" />
              Descargar ahora
            </button>
            <Link
              to="/welcome"
              onClick={() => setMobileOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-full border border-[#151820]/16 px-5 py-3 text-sm font-bold text-[#151820] transition hover:bg-white/18"
            >
              Entrar a la app web
            </Link>
          </div>
        </div>
      )}
      {choiceOpen && <NavPlatformChoice onClose={() => setChoiceOpen(false)} />}
      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}
    </header>
  );
}
