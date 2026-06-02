import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCalendarIntegration } from "@/hooks/useCalendarIntegration";

interface GoogleCalendarConnectModalProps {
  open: boolean;
  mode?: "fullscreen" | "inline";
}

export const GoogleCalendarConnectModal = ({
  open,
  mode = "fullscreen",
}: GoogleCalendarConnectModalProps) => {
  const { connect } = useCalendarIntegration();
  const isInline = mode === "inline";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={
            isInline
              ? "absolute inset-x-4 top-6 z-20 flex justify-center pointer-events-none"
              : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          }
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`w-full border border-outline-variant/10 bg-surface-container-low shadow-2xl text-center pointer-events-auto ${
              isInline ? "max-w-lg rounded-[36px] p-6 space-y-5" : "max-w-md rounded-[48px] p-8 space-y-6"
            }`}
          >
            <div
              className={`mx-auto flex items-center justify-center rounded-[28px] bg-primary/10 ${
                isInline ? "h-16 w-16 rounded-[22px]" : "h-20 w-20"
              }`}
            >
              <Calendar className={`${isInline ? "h-7 w-7" : "h-9 w-9"} text-primary`} />
            </div>

            <div className="space-y-2">
              <h2 className={`${isInline ? "text-xl" : "text-2xl"} font-black tracking-tight text-foreground`}>
                Conecta tu Google Calendar
              </h2>
              <p className="mx-auto max-w-sm text-sm font-medium leading-relaxed text-on-surface-variant/60">
                {isInline
                  ? "Conéctalo para ver y sincronizar tus eventos aquí."
                  : "Para usar el calendario necesitas sincronizar tus eventos de Google. Conéctalo en un paso y tu agenda quedará al día."}
              </p>
            </div>

            <button
              onClick={() => {
                toast.loading("Iniciando conexión con Google Calendar...");
                connect.mutate();
              }}
              disabled={connect.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-primary py-4 text-xs font-black uppercase tracking-widest text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
            >
              {connect.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              {connect.isPending ? "Conectando..." : "Conectar Google Calendar"}
            </button>

            {!isInline && (
              <p className="text-[11px] font-medium text-on-surface-variant/40">
                Al conectar se sincronizarán tus eventos de Google Calendar con Adonai.
                Puedes desconectarlo cuando quieras desde Ajustes.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
