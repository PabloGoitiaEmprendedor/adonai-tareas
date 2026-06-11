import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SignIn, SignUp } from '@clerk/react';
import { CalendarDays, Check } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { adonaiClerkAppearance } from '@/lib/clerkAppearance';

const AuthPage = () => {
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/';
  const mode = new URLSearchParams(location.search).get('mode');
  const isSignUpMode = mode === 'signup';

  return (
    <div className="adonai-auth-screen relative min-h-screen overflow-hidden bg-[#F5F7FB] px-4 py-5 text-[#151820] selection:bg-[#5B7CFA]/20 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 auth-grid-surface" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1fr)_430px]"
      >
        <section className="hidden min-h-[620px] rounded-[28px] border border-[#D9E0EC] bg-white/72 p-8 shadow-[0_30px_90px_rgba(21,24,32,0.10)] backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-12 w-12 rounded-[16px] shadow-[0_12px_32px_rgba(91,124,250,0.22)]" />
            <div>
              <p className="text-lg font-black tracking-tight">Adonai</p>
              <p className="text-sm font-bold text-[#667085]">Sistema operativo mental</p>
            </div>
          </div>

          <div className="space-y-7">
            <div className="max-w-xl space-y-4">
              <h1 className="text-5xl font-black leading-[0.95] text-[#151820]">
                Tu dia empieza con claridad.
              </h1>
              <p className="max-w-md text-lg font-semibold leading-relaxed text-[#667085]">
                Entra, captura lo pendiente y vuelve a ejecutar sin perder el foco.
              </p>
            </div>

            <div className="grid max-w-xl gap-3">
              {[
                ['09:00', 'Revisar calendario de hoy', 'Calendario'],
                ['11:30', 'Enviar propuesta al cliente', 'Prioridad alta'],
                ['15:00', 'Cerrar tareas atrasadas', 'Foco'],
              ].map(([time, title, label]) => (
                <div key={title} className="flex items-center gap-4 rounded-[18px] border border-[#E2E7F0] bg-white px-4 py-3 shadow-sm">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#EEF3FF] text-[#5B7CFA]">
                    {label === 'Calendario' ? <CalendarDays className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-black text-[#151820]">{title}</p>
                    <p className="mt-0.5 text-xs font-bold text-[#7B8494]">{time} - {label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#DDE5F4] bg-[#F8FAFF] px-5 py-4">
            <p className="text-sm font-black text-[#151820]">Sesion protegida para tus tareas y progreso.</p>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[430px] flex-col rounded-[28px] border border-[#D9E0EC] bg-white p-5 shadow-[0_28px_80px_rgba(21,24,32,0.14)] sm:p-6">
          <div className="mb-7 flex items-center gap-3">
            <BrandLogo className="h-12 w-12 rounded-[16px] shadow-[0_12px_32px_rgba(91,124,250,0.22)]" />
            <div className="min-w-0 text-left">
              <h1 className="text-2xl font-black text-[#151820]">Adonai</h1>
              <p className="text-sm font-bold text-[#667085]">
                {isSignUpMode ? 'Crea tu cuenta' : 'Entra para continuar'}
              </p>
            </div>
          </div>

          <div className="w-full">
            {isSignUpMode ? (
              <SignUp
                routing="path"
                path="/auth"
                signInUrl="/auth"
                appearance={adonaiClerkAppearance}
                fallbackRedirectUrl={redirectTo === '/welcome' ? '/' : redirectTo}
              />
            ) : (
              <SignIn
                routing="path"
                path="/auth"
                signUpUrl="/auth?mode=signup"
                appearance={adonaiClerkAppearance}
                fallbackRedirectUrl={redirectTo === '/welcome' ? '/' : redirectTo}
              />
            )}
          </div>
        </section>
      </motion.main>
    </div>
  );
};

export default AuthPage;
