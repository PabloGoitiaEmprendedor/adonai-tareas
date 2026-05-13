import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, MessageCircle, Sparkles, ArrowRight, Monitor, Apple, Globe, Search, LifeBuoy } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { WIN_DOWNLOAD, MAC_DOWNLOAD } from "@/lib/download-urls";
import { Link } from "react-router-dom";

const CATEGORIES = ["General", "Descarga", "Funciones", "Cuenta", "Privacidad"];

const FAQ_ITEMS = [
  {
    category: "General",
    q: "¿Qué es Adonai?",
    a: "Adonai es una aplicación de gestión de tareas diseñada para eliminar la fricción. Su característica principal es una mini-ventana flotante que vive en tu escritorio, permitiéndote ver y gestionar tus pendientes sin interrumpir tu flujo de trabajo.",
  },
  {
    category: "General",
    q: "¿Es Adonai realmente gratis?",
    a: "Sí. Adonai es gratuito y no requiere tarjeta de crédito ni suscripciones ocultas. Puedes descargar la versión de escritorio o usar la versión web sin coste alguno.",
  },
  {
    category: "Descarga",
    q: "¿En qué dispositivos puedo usarlo?",
    a: "Adonai está disponible como aplicación nativa para Windows (.exe) y macOS (.dmg). También puedes acceder a la versión web desde cualquier navegador en PC, Mac, Linux y dispositivos móviles (iOS/Android).",
  },
  {
    category: "Funciones",
    q: "¿Cómo funciona la mini-ventana?",
    a: "Es una pequeña interfaz que se mantiene 'siempre al frente'. Puedes contraerla para que ocupe el mínimo espacio o expandirla para ver tus tareas. Es ideal para mantener el foco sin tener que cambiar de ventana constantemente.",
  },
  {
    category: "Cuenta",
    q: "¿Necesito crear una cuenta?",
    a: "No es obligatorio. Puedes usar Adonai de forma local. Sin embargo, crear una cuenta te permite sincronizar tus tareas entre la app de escritorio y la versión web de forma segura.",
  },
  {
    category: "Funciones",
    q: "¿Incluye temporizador Pomodoro?",
    a: "Adonai incluye un sistema de gestión de tiempo por tarea. Puedes asignar una duración estimada y activar un temporizador que te ayuda a mantener el foco en bloques de tiempo, similar a la técnica Pomodoro.",
  },
  {
    category: "Descarga",
    q: "¿Qué diferencia hay entre la App y la Web?",
    a: "La aplicación instalable ofrece la mini-ventana flotante, inicio automático con el sistema y notificaciones nativas. La versión web es perfecta para acceso rápido desde cualquier lugar, aunque carece de la ventana flotante persistente por limitaciones del navegador.",
  },
  {
    category: "Privacidad",
    q: "¿Mis datos están seguros?",
    a: "Absolutamente. Usamos cifrado de extremo a extremo para la sincronización de datos si decides crear una cuenta. Si lo usas de forma local, tus tareas nunca salen de tu dispositivo.",
  },
  {
    category: "Funciones",
    q: "¿Puedo adjuntar archivos a las tareas?",
    a: "Sí, puedes añadir enlaces y referencias a archivos locales. La versión de escritorio permite abrir archivos directamente con un clic para que no pierdas tiempo buscándolos.",
  },
  {
    category: "General",
    q: "¿Cómo puedo dar feedback?",
    a: "Nos encanta escuchar a nuestros usuarios. Puedes enviarnos tus sugerencias o reportar errores directamente a través de nuestras redes sociales o el canal de soporte en la web.",
  },
];

function FAQItem({ q, a, category, isOpen, onClick }: { q: string; a: string; category: string; isOpen: boolean; onClick: () => void }) {
  return (
    <motion.div 
      layout
      className={`group rounded-[32px] border-2 transition-all duration-300 ${
        isOpen 
          ? "border-primary bg-primary/5 shadow-xl shadow-primary/5" 
          : "border-foreground/5 bg-background hover:border-foreground/10 hover:shadow-lg"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-4 px-8 py-7 text-left"
      >
        <div className="flex flex-col gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isOpen ? "text-primary" : "text-foreground/30"}`}>
            {category}
          </span>
          <span className="text-xl font-black tracking-tight text-foreground leading-tight">{q}</span>
        </div>
        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
          isOpen ? "bg-primary text-primary-foreground rotate-180" : "bg-foreground/5 text-foreground/40"
        }`}>
          <ChevronDown className="w-6 h-6" />
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-8 pb-8 text-foreground/60 leading-relaxed text-lg border-t border-primary/10 pt-6 font-medium">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQPage() {
  useEffect(() => {
    document.title = "Preguntas Frecuentes | Adonai Tasks";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Encuentra respuestas a las dudas más comunes sobre Adonai Tasks: descarga, instalación, funciones y privacidad.");
    }
  }, []);

  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = FAQ_ITEMS.filter(item => {
    const matchesCategory = activeCategory === "Todas" || item.category === activeCategory;
    const matchesSearch = item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <PublicNav />

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-16 md:pt-36 md:pb-24 overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] -translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-x-1/4 translate-y-1/4" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-8"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            Centro de soporte
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-6xl md:text-8xl font-black tracking-tight leading-[0.85] mb-8"
          >
            Preguntas <br />
            <span className="text-primary relative">
              frecuentes
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/20 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
              </svg>
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-foreground/50 max-w-2xl mx-auto leading-relaxed font-medium mb-12"
          >
            Todo lo que necesitas saber para dominar tu flujo de trabajo con Adonai.
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative max-w-xl mx-auto"
          >
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30" />
            <input 
              type="text" 
              placeholder="Busca una duda, una función o un problema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/50 border-2 border-foreground/5 rounded-full py-5 pl-14 pr-8 text-lg font-medium focus:outline-none focus:border-primary/30 transition-all placeholder:text-foreground/20 shadow-lg shadow-black/5"
            />
          </motion.div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap justify-center gap-2">
            {["Todas", ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${
                  activeCategory === cat 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "bg-secondary text-foreground/40 hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Grid */}
      <section className="px-6 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-4 min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((item, i) => (
                  <motion.div
                    key={item.q}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4 }}
                  >
                    <FAQItem 
                      {...item} 
                      isOpen={openIndex === i} 
                      onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <p className="text-2xl font-black text-foreground/20">No encontramos nada que coincida...</p>
                  <button 
                    onClick={() => { setSearchQuery(""); setActiveCategory("Todas"); }}
                    className="mt-4 text-primary font-bold hover:underline"
                  >
                    Ver todas las preguntas
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[48px] bg-foreground p-8 md:p-20 text-background text-center shadow-2xl shadow-black/20"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 blur-[120px] -mr-48 -mt-48" />
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-[28px] bg-primary/20 flex items-center justify-center mx-auto mb-8">
                <MessageCircle className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8 leading-tight">
                ¿Todavía tienes <br /> <span className="text-primary">alguna duda</span>?
              </h2>
              <p className="text-xl md:text-2xl text-background/50 mb-12 max-w-2xl mx-auto font-medium">
                Nuestro equipo está listo para ayudarte. Escríbenos y nos pondremos en contacto contigo de inmediato.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/auth"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-primary px-10 py-5 text-lg font-black text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20"
                >
                  Ir al soporte oficial
                  <ArrowRight className="w-6 h-6" />
                </Link>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-background/10 border-2 border-background/20 px-10 py-5 text-lg font-black text-background transition-all hover:bg-background/20"
                >
                  Twitter / X
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
