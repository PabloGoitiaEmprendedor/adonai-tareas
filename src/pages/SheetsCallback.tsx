import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SheetsCallback = () => {
 const [searchParams] = useSearchParams();
 const navigate = useNavigate();
 const { user } = useAuth();
 const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

 useEffect(() => {
 const handleCallback = async () => {
 const code = searchParams.get('code');
 if (!code) {
 setStatus('error');
 toast.error('No se recibió el código de autorización');
 return;
 }

 try {
 console.log("Invoking google-auth callback for Google Sheets, user:", user?.id);
 const { data, error } = await supabase.functions.invoke('google-auth', {
 body: { 
 action: 'callback',
 code,
 redirect_uri: window.location.origin + '/sheets-callback',
 user_id: user?.id,
 service: 'sheets'
 },
 });

 if (error) throw error;

 if (data?.success) {
 setStatus('success');
 toast.success('¡Google Sheets conectado con éxito!');
 setTimeout(() => {
 navigate('/settings');
 }, 2000);
 } else {
 throw new Error(data?.error || 'Error desconocido');
 }
 } catch (error) {
 console.error('Error en el callback de Google Sheets:', error);
 setStatus('error');
 toast.error('Error al sincronizar con Google Sheets');
 }
 };

 if (user) {
 handleCallback();
 }
 }, [searchParams, navigate, user]);

 return (
 <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 className="w-full max-w-md p-10 bg-surface-container-low rounded-[48px] border border-outline-variant/10 shadow-2xl space-y-8"
 >
 <div className="w-24 h-24 mx-auto bg-primary/10 rounded-[32px] flex items-center justify-center relative">
 {status === 'loading' && (
 <Loader2 className="w-10 h-10 text-primary animate-spin" />
 )}
 {status === 'success' && (
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 className="absolute inset-0 bg-primary rounded-[32px] flex items-center justify-center"
 >
 <Check className="w-12 h-12 text-primary-foreground" />
 </motion.div>
 )}
 {status === 'error' && (
 <div className="w-full h-full bg-destructive/10 rounded-[32px] flex items-center justify-center">
 <span className="text-4xl"></span>
 </div>
 )}
 </div>

 <div className="space-y-4">
 <h2 className="text-2xl font-black font-headline tracking-tight">
 {status === 'loading' && 'Conectando con Google Sheets...'}
 {status === 'success' && '¡Conexión Exitosa!'}
 {status === 'error' && 'Algo salió mal'}
 </h2>
 <p className="text-on-surface-variant/60 font-medium">
 {status === 'loading' && 'Estamos vinculando tu cuenta de Google Sheets con Adonai.'}
 {status === 'success' && 'Tus hojas de cálculo están listas. Volviendo a Ajustes...'}
 {status === 'error' && 'Hubo un problema al procesar la autorización. Por favor, intenta de nuevo.'}
 </p>
 </div>

 {status === 'error' && (
 <button
 onClick={() => navigate('/settings')}
 className="w-full py-4 bg-primary text-primary-foreground rounded-[24px] font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all"
 >
 Volver a Ajustes
 </button>
 )}
 </motion.div>
 </div>
 );
};

export default SheetsCallback;
