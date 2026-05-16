import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const AuthPage = () => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = () => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Ingresa un email válido');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('code');
      startCountdown();
      toast.success('Código enviado a tu correo');
      // A bit more delay to ensure the DOM is ready for focus
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar código';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (tokenToVerify?: string) => {
    const token = tokenToVerify || code.join('');
    if (token.length !== 6) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: 'email',
      });
      if (error) throw error;
      toast.success('¡Bienvenido!');
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Código incorrecto';
      toast.error(message);
      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are filled
    const fullToken = newCode.join('');
    if (fullToken.length === 6 && !newCode.some(d => !d)) {
      handleVerifyCode(fullToken);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = async (e?: React.ClipboardEvent) => {
    if (e) e.preventDefault();
    try {
      const text = e ? e.clipboardData.getData('text') : await navigator.clipboard.readText();
      const pasted = text.replace(/\D/g, '').slice(0, 6);
      if (pasted.length === 6) {
        const pastedArray = pasted.split('');
        setCode(pastedArray);
        handleVerifyCode(pasted).catch(console.error);
      } else if (pasted.length > 0 && pasted.length < 6) {
        // If it's less than 6 digits, just fill what we have
        const newCode = [...code];
        for (let i = 0; i < pasted.length; i++) {
          newCode[i] = pasted[i];
        }
        setCode(newCode);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      toast.error('No se pudo leer el portapapeles');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      startCountdown();
      toast.success('Código reenviado');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al reenviar código';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode(['', '', '', '', '', '']);
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(0);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 selection:bg-primary/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] opacity-60" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] opacity-60" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'email' && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative z-10 w-full max-w-[400px] space-y-10"
          >
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center mx-auto mb-6">
                <BrandLogo className="h-20 w-20 drop-shadow-[0_0_15px_rgba(91,124,250,0.3)]" />
              </div>
              <h1 className="page-title">Adonai</h1>
              <p className="text-on-surface-variant font-medium text-lg opacity-80">
                Ingresa tu email para recibir un código
              </p>
            </div>

            <div className="space-y-6">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleSendCode().catch(console.error); } }}
                placeholder="tu@email.com"
                autoFocus
                className="w-full h-16 px-6 bg-surface-container rounded-2xl text-foreground font-semibold placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border-none"
              />

              <button
                onClick={() => { handleSendCode().catch(console.error); }}
                disabled={loading}
                className="w-full h-16 rounded-[24px] bg-primary text-black font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Mail className="w-5 h-5" />
                {loading ? 'Enviando...' : 'Enviar código'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'code' && (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative z-10 w-full max-w-[400px] space-y-10"
          >
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center mx-auto mb-6">
                <BrandLogo className="h-20 w-20 drop-shadow-[0_0_15px_rgba(91,124,250,0.3)]" />
              </div>
              <h1 className="page-title">Verifica</h1>
              <p className="text-on-surface-variant font-medium text-lg opacity-80">
                Ingresa el código enviado a
              </p>
              <p className="text-primary font-bold text-lg">{email}</p>
            </div>

              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-center gap-3" onPaste={handlePaste}>
                  <button
                    onClick={() => handlePaste()}
                    className="flex flex-col items-center justify-center w-16 h-14 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all border border-primary/20 shadow-lg shadow-primary/5 group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-active:scale-90 transition-transform">
                      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-tighter mt-0.5">Pegar</span>
                  </button>

                  <div className="flex gap-2">
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className="w-11 h-14 text-center text-xl font-bold bg-surface-container rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border-none"
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => { handleVerifyCode().catch(console.error); }}
                  disabled={loading || code.some(d => !d)}
                  className="w-full h-16 rounded-[24px] bg-primary text-black font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-5 h-5" />
                  {loading ? 'Verificando...' : 'Verificar y entrar'}
                </button>

              <div className="space-y-4 pt-4">
                <button
                  onClick={handleResend}
                  disabled={loading || countdown > 0}
                  className="w-full flex items-center justify-center gap-2 text-primary font-bold text-sm hover:opacity-80 transition-opacity disabled:opacity-50 disabled:text-on-surface-variant/40"
                >
                  {countdown > 0 ? `Reenviar código en ${countdown}s` : '¿No recibiste el código? Reenviar'}
                </button>

                <button
                  onClick={handleBackToEmail}
                  className="w-full flex items-center justify-center gap-2 text-on-surface-variant/60 font-medium text-xs hover:text-foreground transition-colors py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Usar otro email
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthPage;
