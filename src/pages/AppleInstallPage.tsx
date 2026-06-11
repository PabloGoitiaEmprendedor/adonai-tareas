import type { ReactNode } from 'react';
import { ArrowRight, Globe, Plus, Share, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

const AppleInstallPage = () => (
  <main className="min-h-screen bg-[#F7F6F1] px-5 py-10 text-[#151820] sm:px-8">
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-center">
      <div className="rounded-[32px] border border-[#151820]/10 bg-white/78 p-6 shadow-[0_28px_90px_rgba(21,24,32,0.10)] backdrop-blur-xl sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="Adonai" className="h-12 w-12 rounded-[16px] object-contain shadow-[0_14px_34px_rgba(91,124,250,0.22)]" />
          <div>
            <p className="text-xl font-black">Adonai para Apple</p>
            <p className="text-sm font-bold text-[#667085]">Instalacion fluida en iPhone y iPad</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#5B7CFA]">iOS</p>
          <h1 className="text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
            Usa Adonai como app desde Safari.
          </h1>
          <p className="max-w-2xl text-base font-semibold leading-relaxed text-[#667085]">
            Apple no permite instalar archivos directos como Android. Mientras se habilita TestFlight/App Store, este flujo evita enlaces rotos y deja Adonai instalada en tu pantalla de inicio.
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          <Step icon={<Globe className="h-5 w-5" />} title="Abre webadonai.com en Safari" text="El acceso debe hacerse desde Safari para que aparezca la opcion de instalar." />
          <Step icon={<Share className="h-5 w-5" />} title="Toca Compartir" text="Usa el boton de compartir de iOS en la barra inferior." />
          <Step icon={<Plus className="h-5 w-5" />} title="Agregar a pantalla de inicio" text="Confirma el nombre Adonai y quedara como una app." />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="https://webadonai.com"
            className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-[#5B7CFA] px-6 text-sm font-black text-white transition hover:-translate-y-0.5 active:translate-y-0"
          >
            Abrir Adonai Web
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            to="/landing"
            className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full border-2 border-[#151820]/15 bg-white px-6 text-sm font-black text-[#151820] transition hover:-translate-y-0.5 active:translate-y-0"
          >
            Volver
          </Link>
        </div>
      </div>
    </section>
  </main>
);

const Step = ({ icon, title, text }: { icon: ReactNode; title: string; text: string }) => (
  <div className="flex gap-3 rounded-[22px] border border-[#151820]/8 bg-[#F8FAFF] p-4">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#EEF3FF] text-[#5B7CFA]">
      {icon || <Smartphone className="h-5 w-5" />}
    </div>
    <div>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-relaxed text-[#667085]">{text}</p>
    </div>
  </div>
);

export default AppleInstallPage;
