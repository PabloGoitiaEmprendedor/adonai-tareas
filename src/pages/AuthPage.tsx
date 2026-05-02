import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

const AuthPage = () => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Ingresa un email válido');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setStep('code');
      toast.success('Código enviado a tu correo');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const token = code.join('');
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
    } catch (err: any) {
      toast.error(err.message || 'Código incorrecto');
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
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      setTimeout(() => {
        setLoading(true);
        supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: pasted,
          type: 'email',
        }).then(({ error }) => {
          setLoading(false);
          if (error) {
            toast.error(error.message || 'Código incorrecto');
            setCode(['', '', '', '', '', '']);
          } else {
            toast.success('¡Bienvenido!');
            navigate('/');
          }
        });
      }, 50);
    }
  };

  const handleResend = async () => {
    setStep('email');
    setEmail('');
    setCode(['', '', '', '', '', '']);
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
              <div className="w-20 h-20 bg-primary/15 rounded-[32px] flex items-center justify-center mx-auto mb-6 rotate-3">
                <h1 className="text-4xl font-black text-primary">A</h1>
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-foreground font-headline">Adonai</h1>
              <p className="text-on-surface-variant font-medium text-lg opacity-80">
                Ingresa tu email para recibir un código
              </p>
            </div>

            <div className="space-y-6">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendCode(); }}
                placeholder="tu@email.com"
                autoFocus
                className="w-full h-16 px-6 bg-surface-container rounded-2xl text-foreground font-semibold placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border-none"
              />

              <button
                onClick={handleSendCode}
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
              <div className="w-20 h-20 bg-primary/15 rounded-[32px] flex items-center justify-center mx-auto mb-6 rotate-3">
                <h1 className="text-4xl font-black text-primary">A</h1>
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-foreground font-headline">Verifica</h1>
              <p className="text-on-surface-variant font-medium text-lg opacity-80">
                Ingresa el código enviado a
              </p>
              <p className="text-primary font-bold text-lg">{email}</p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
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
                    className="w-12 h-14 text-center text-xl font-bold bg-surface-container rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border-none"
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={loading || code.some(d => !d)}
                className="w-full h-16 rounded-[24px] bg-primary text-black font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-5 h-5" />
                {loading ? 'Verificando...' : 'Verificar y entrar'}
              </button>

              <button
                onClick={handleResend}
                className="w-full flex items-center justify-center gap-2 text-on-surface-variant/60 font-medium text-sm hover:text-foreground transition-colors py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Usar otro email
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthPage;
