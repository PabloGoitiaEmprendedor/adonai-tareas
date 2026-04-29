import { useEffect, useState } from "react";
import { Download, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { downloadDesktopApp, DESKTOP_APP_VERSION } from "@/lib/desktopApp";

/**
 * Public landing page — clone of https://adonai-prueba-gratis.lovable.app/
 * Adapted: the CTAs trigger the desktop app download (same flow as the
 * anchored "Descargar App" button used inside the web app).
 */
const LandingPage = () => {
  const [mobileDialog, setMobileDialog] = useState(false);

  useEffect(() => {
    document.title = "Adonai — Tus tareas, siempre a la vista";
  }, []);

  const handleDownload = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile) {
      setMobileDialog(true);
      return;
    }
    downloadDesktopApp();
  };

  return (
    <div className="min-h-screen bg-[#F5F5E9] text-foreground">
      {/* ===== Anchored top bar (always visible, hosts the download CTA) ===== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#F5F5E9]/80 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-black" />
            <span className="font-black tracking-tight text-lg">Adonai</span>
          </div>
          <Button
            onClick={handleDownload}
            className="bg-black hover:bg-black/90 text-white rounded-full h-10 px-5 font-bold gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar app</span>
            <span className="sm:hidden">Descargar</span>
          </Button>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-black/70" />
            Acceso anticipado gratis
          </span>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95]">
            Tus tareas,{" "}
            <span className="bg-primary px-2 box-decoration-clone">
              siempre a la vista
            </span>
            <span className="text-foreground">.</span>
          </h1>
          <p className="mt-7 text-lg sm:text-xl text-on-surface-variant max-w-md leading-relaxed">
            Una ventanita pequeña vive en tu escritorio. La miras, marcas lo
            que hiciste y listo. Sin abrir apps.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleDownload}
              className="bg-black hover:bg-black/90 text-white rounded-full h-14 px-8 font-bold text-base gap-2"
            >
              <Download className="w-5 h-5" />
              Descargar para Windows
            </Button>
          </div>
          <p className="mt-3 text-sm text-on-surface-variant">
            Gratis · Versión {DESKTOP_APP_VERSION} · Solo Windows por ahora
          </p>
        </div>

        {/* Hero visual */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/40 blur-3xl rounded-full" />
          <div className="relative aspect-[4/3] rounded-3xl bg-gradient-to-br from-white to-[#EFEFE0] border border-black/5 shadow-2xl overflow-hidden">
            {/* Floating mini window mockup */}
            <div className="absolute right-6 top-6 w-[55%] rounded-2xl bg-[#131313] text-white shadow-2xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                <span className="text-[10px] font-bold opacity-60">9:34</span>
              </div>
              <div className="p-3 space-y-2">
                {[
                  { t: "Subir podcast", done: false },
                  { t: "Llamar a Ana", done: true },
                  { t: "Revisar pull request", done: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-md border ${item.done ? "bg-primary border-primary" : "border-white/30"} flex items-center justify-center`}>
                      {item.done && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className={item.done ? "line-through opacity-40" : ""}>
                      {item.t}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pain points ===== */}
      <section className="bg-[#131313] text-white py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <p className="text-primary font-black uppercase tracking-[0.2em] text-xs">
            ¿Te suena familiar?
          </p>
          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-tight">
            Las apps de tareas{" "}
            <span className="text-primary">cansan más que ayudan</span>.
          </h2>
          <div className="mt-14 grid sm:grid-cols-3 gap-4">
            {[
              "Me olvido de mis tareas porque abrir otra app cansa.",
              "Probé mil apps y siempre vuelvo a mi cuaderno.",
              "Me da pereza buscar botones, menús y pantallas.",
            ].map((q, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 text-left">
                <div className="text-3xl mb-3">😮‍💨</div>
                <p className="text-base leading-relaxed text-white/80">"{q}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it looks ===== */}
      <section className="py-20 sm:py-28 bg-[#F5F5E9]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <p className="font-black uppercase tracking-[0.2em] text-xs text-on-surface-variant">
            Así se ve
          </p>
          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter">
            Una ventanita.{" "}
            <span className="bg-primary px-2 box-decoration-clone">Siempre ahí</span>.
          </h2>
          <p className="mt-6 text-lg text-on-surface-variant max-w-xl mx-auto">
            No tapa nada. No molesta. Solo te recuerda lo que tienes que hacer.
          </p>
          <div className="mt-12 grid sm:grid-cols-3 gap-4 text-left">
            {[
              { title: "Vive en tu escritorio", icon: Monitor },
              { title: "Marca con un clic", icon: Check },
              { title: "Agrega en segundos", icon: Download },
            ].map((f, i) => (
              <div key={i} className="bg-white border border-black/5 rounded-3xl p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/40 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-black" />
                </div>
                <p className="font-black text-lg">{f.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <p className="font-black uppercase tracking-[0.2em] text-xs text-on-surface-variant">
            Cómo funciona
          </p>
          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter">
            Tan fácil que <span className="bg-primary px-2 box-decoration-clone">no piensas</span>.
          </h2>
          <div className="mt-14 grid sm:grid-cols-3 gap-6">
            {[
              { n: 1, t: "La abres una vez", d: "Y se queda en tu escritorio." },
              { n: 2, t: "Escribes tu tarea", d: "En un segundo. Sin menús." },
              { n: 3, t: "La marcas y listo", d: "Un clic y desaparece." },
            ].map((s) => (
              <div key={s.n} className="text-left">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-black text-lg mb-4">
                  {s.n}
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2">{s.t}</h3>
                <p className="text-on-surface-variant">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Extras ===== */}
      <section className="py-20 sm:py-28 bg-[#F5F5E9]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center">
            <p className="font-black uppercase tracking-[0.2em] text-xs text-on-surface-variant">
              Pequeños extras
            </p>
            <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter">
              Simple. Pero <span className="bg-primary px-2 box-decoration-clone">poderoso</span>.
            </h2>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 gap-5">
            {[
              { e: "🎯", t: "¿Qué hago primero?", d: "Te ayudamos a ordenar tus tareas con un método simple: lo urgente y lo importante. Sin pensar mucho." },
              { e: "⏱️", t: "Pon tiempo a cada tarea", d: "Así no te distraes. Cuando el tiempo se acaba, tú decides si sigues o pasas a la siguiente." },
              { e: "🔗", t: "Guarda tus links", d: "¿Un video que ver? ¿Una página? Pégala en la tarea y la abres con un clic." },
              { e: "👀", t: "Siempre a la vista", d: "Mientras trabajas, mientras lees mail, mientras navegas. Tus tareas no se esconden." },
            ].map((x, i) => (
              <div key={i} className="bg-white border border-black/5 rounded-3xl p-7">
                <div className="text-4xl mb-4">{x.e}</div>
                <h3 className="text-xl font-black tracking-tight mb-2">{x.t}</h3>
                <p className="text-on-surface-variant leading-relaxed">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Testimonials ===== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <p className="font-black uppercase tracking-[0.2em] text-xs text-on-surface-variant">
            Lo que nos dice la gente
          </p>
          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter">
            No estás <span className="bg-primary px-2 box-decoration-clone">solo</span>.
          </h2>
          <div className="mt-14 grid sm:grid-cols-3 gap-5 text-left">
            {[
              "Lo más pesado es abrir una app solo para anotar algo.",
              "Probé muchas apps, pero siempre vuelvo a lo más simple.",
              "Cuando algo está en mi cara todo el día, sí lo uso.",
            ].map((q, i) => (
              <blockquote key={i} className="bg-[#F5F5E9] border border-black/5 rounded-3xl p-6 text-lg leading-snug font-medium">
                "{q}"
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="py-24 sm:py-32 bg-[#131313] text-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter">
            ¿Quieres <span className="text-primary">probarla</span>?
          </h2>
          <p className="mt-6 text-lg text-white/70">
            Descárgala ahora. Es gratis. Solo para Windows.
          </p>
          <Button
            onClick={handleDownload}
            className="mt-10 bg-primary hover:bg-primary/90 text-black rounded-full h-14 px-8 font-black text-base gap-2"
          >
            <Download className="w-5 h-5" />
            Descargar para Windows
          </Button>
          <p className="mt-4 text-xs text-white/40">
            Versión {DESKTOP_APP_VERSION}
          </p>
        </div>
      </section>

      <footer className="bg-[#131313] text-white/40 text-xs py-8 text-center border-t border-white/5">
        © {new Date().getFullYear()} Adonai · Hecho para emprendedores
      </footer>

      {/* Mobile dialog: same UX as the in-app anchored button */}
      <Dialog open={mobileDialog} onOpenChange={setMobileDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-3xl">
          <DialogHeader>
            <div className="w-14 h-14 rounded-2xl bg-primary/30 flex items-center justify-center mx-auto mb-2">
              <Monitor className="w-7 h-7 text-black" />
            </div>
            <DialogTitle className="text-center text-xl font-black tracking-tight">
              App de escritorio
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed pt-2">
              Adonai es una app para tu <strong className="text-foreground">computadora</strong> con
              Windows. Abre esta página desde tu PC para descargarla.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              onClick={() => { downloadDesktopApp(); setMobileDialog(false); }}
              className="w-full rounded-xl font-bold h-11 gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar igualmente
            </Button>
            <Button
              onClick={() => setMobileDialog(false)}
              variant="ghost"
              className="w-full rounded-xl font-bold"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;