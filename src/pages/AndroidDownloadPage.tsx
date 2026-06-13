import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

const APK_URL = '/adonai.apk';
const APK_FILENAME = 'Adonai.apk';

const startDownload = async () => {
  const response = await fetch(APK_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo descargar el APK');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = APK_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const AndroidDownloadPage = () => {
  const [status, setStatus] = useState<'downloading' | 'ready' | 'error'>('downloading');

  useEffect(() => {
    document.title = 'Descargar Adonai Android';
    startDownload()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F6F1] px-5 py-10 text-[#151820] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-center">
        <div className="rounded-[34px] border border-[#151820]/10 bg-white/82 p-6 shadow-[0_30px_90px_rgba(21,24,32,0.12)] backdrop-blur-xl sm:p-9">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Adonai" className="h-16 w-16 rounded-[20px] object-contain shadow-lg shadow-[#5B7CFA]/20" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5B7CFA]">Android</p>
              <h1 className="mt-1 text-3xl font-black leading-none tracking-[-0.04em] sm:text-5xl">
                Descargar Adonai
              </h1>
            </div>
          </div>

          <div className="mt-8 rounded-[26px] border border-[#151820]/8 bg-[#F7F6F1] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#151820] text-white">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-black text-[#151820]">
                  {status === 'downloading' && 'Preparando descarga...'}
                  {status === 'ready' && 'Descarga iniciada'}
                  {status === 'error' && 'Toca el boton para descargar'}
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#151820]/62">
                  El archivo se descarga como APK instalable de Android. No necesitas tener Capacitor instalado.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setStatus('downloading');
                startDownload()
                  .then(() => setStatus('ready'))
                  .catch(() => setStatus('error'));
              }}
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-[#5B7CFA] px-6 text-sm font-black text-white shadow-[0_18px_45px_rgba(91,124,250,0.25)] transition active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Descargar APK
            </button>
            <a
              href={APK_URL}
              download={APK_FILENAME}
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full border border-[#151820]/12 bg-white px-6 text-sm font-black text-[#151820] transition active:scale-[0.98]"
            >
              Enlace directo
            </a>
          </div>

          <Link to="/" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#151820]/55 transition hover:text-[#151820]">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
      </div>
    </main>
  );
};

export default AndroidDownloadPage;
