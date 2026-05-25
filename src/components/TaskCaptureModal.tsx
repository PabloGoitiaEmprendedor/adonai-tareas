import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Square, Check, Paperclip, Plus, Folder } from 'lucide-react';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { parseVoiceTranscript } from '@/hooks/useVoiceParser';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { dispatchVoiceCaptureClosed, dispatchVoiceCaptureOpened } from '@/lib/voiceEvents';
import { AISphere } from './AISphere';
import { CalendarDatePicker } from './ui/calendar-date-picker';
import { cn } from '@/lib/utils';
import { buildReminderMetadata } from '@/lib/reminders';
import { useFolders } from '@/hooks/useFolders';

interface TaskCaptureModalProps {
 open: boolean;
 onClose: () => void;
 goalId?: string | null;
 folderId?: string | null;
 timeBlockId?: string | null;
 initialMode?: 'text' | 'voice' | 'recurrence' | null;
 creationSource?: 'fab' | 'secondary' | 'mini_plus' | 'mini_voice';
}

export interface TaskCaptureModalHandle {
 openInVoiceMode: () => Promise<boolean>;
 openInTextMode: (date?: string, title?: string, description?: string) => void;
}

const TaskCaptureModal = forwardRef<TaskCaptureModalHandle, TaskCaptureModalProps>(({ open, onClose, goalId, folderId, timeBlockId, initialMode, creationSource }, ref) => {
 const { user, isAnonymous } = useAuth();
 const { isRecording, isProcessing, transcript, confidence, startRecording, stopRecording, resetTranscript } = useVoiceCapture();
 const { createTask } = useTasks();
 const { folders } = useFolders();

 const [phase, setPhase] = useState<'input' | 'saving'>('input');
 const [reviewImportance, setReviewImportance] = useState(false);
 const [reviewUrgency, setReviewUrgency] = useState(false);
 const [title, setTitle] = useState('');
 const [description, setDescription] = useState('');
 const [links, setLinks] = useState<string[]>(['']);
 const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderId || null);
 const [dueDate, setDueDate] = useState('');
 const [sourceType, setSourceType] = useState<'voice' | 'text'>('text');
 const [fallbackEstimatedMinutes, setFallbackEstimatedMinutes] = useState<number | null>(null);
 const [savingMessage, setSavingMessage] = useState('Creando tarea...');
 
 const requestedVoiceOpenRef = useRef(false);
 const mountedRef = useRef(false);
 const voiceProcessedRef = useRef(false);
 const isCurrentlySavingRef = useRef(false);
 const [timePrefix, setTimePrefix] = useState<string | null>(null);

 useEffect(() => {
 if (!open ||!isRecording) return;
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Enter' && transcript.trim()) {
 e.preventDefault();
 stopRecording();
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [open, isRecording, transcript, stopRecording]);

 const [prevOpen, setPrevOpen] = useState(open);
 if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
      setTimePrefix(null);
      setFallbackEstimatedMinutes(null);
      setReviewImportance(false);
      setReviewUrgency(false);
      setTitle('');
      setDescription('');
      setLinks(['']);
      setSelectedFolderId(folderId || null);
      setPhase('input');
      requestedVoiceOpenRef.current = false;
      setSourceType('text');
    }
  }

 const beginVoiceCapture = useCallback(async () => {
 voiceProcessedRef.current = false;
 setSourceType('voice');
 const started = await startRecording();
 if (!started) {
 resetTranscript();
 setSourceType('text');
 }
 return started;
 }, [resetTranscript, startRecording]);

 useImperativeHandle(ref, () => ({
openInVoiceMode: async () => {
requestedVoiceOpenRef.current = true;
setPhase('input');
setTitle('');
setDueDate(format(new Date(), 'yyyy-MM-dd'));
setFallbackEstimatedMinutes(null);
setSourceType('text');
return false;
},
 openInTextMode: (date?: string, initialTitle?: string, initialDescription?: string, timePrefixArg?: string) => {
 requestedVoiceOpenRef.current = false;
 setPhase('input');
 setTitle(initialTitle || '');
 setDescription(initialDescription || '');
setTimePrefix(timePrefixArg || null);
setDueDate(date || format(new Date(), 'yyyy-MM-dd'));
setFallbackEstimatedMinutes(null);
setSourceType('text');
 }
 }), [beginVoiceCapture]);

 useEffect(() => {
 if (!mountedRef.current) {
 mountedRef.current = true;
 return;
 }
 if (open) {
 dispatchVoiceCaptureOpened();
 return;
 }
 dispatchVoiceCaptureClosed();
 }, [open]);

 useEffect(() => {
 if (!open) return;
 if (requestedVoiceOpenRef.current) {
 requestedVoiceOpenRef.current = false;
 return;
 }
 resetTranscript();
 }, [open, resetTranscript]);

 const handleClose = () => {
 requestedVoiceOpenRef.current = false;
 if (isRecording) {
 stopRecording();
 }
 onClose();
 };

 const saveTaskQuick = async (opts: {
 title: string;
 description?: string;
 link?: string | null;
 dueDate: string;
 goalId: string | null;
 importance: boolean;
 urgency: boolean;
 }) => {
 const { title: taskTitle, description: taskDesc, link: taskLink, dueDate: date, goalId: chosenGoalId, importance, urgency } = opts;

 if (isCurrentlySavingRef.current) return;
 isCurrentlySavingRef.current = true;
 setPhase('saving');
 setSavingMessage('Creando tarea...');

 const priority = importance && urgency? 'high': importance || urgency? 'medium': 'low';
 const finalDate = date || format(new Date(), 'yyyy-MM-dd');

 try {
 const task = await createTask.mutateAsync({
 title: taskTitle,
 priority,
 urgency,
 importance,
 source_type: sourceType,
 description: timePrefix? `${timePrefix} ${taskDesc || ''}`.trim(): (taskDesc || null),
 link: taskLink || null,
 context_id: null,
 goal_id: chosenGoalId || goalId || null,
 folder_id: selectedFolderId || null,
 recurrence_id: null,
 estimated_minutes: fallbackEstimatedMinutes || 30,
 due_date: finalDate,
 time_block_id: timeBlockId || null,
 creation_source: creationSource,
 metadata: buildReminderMetadata(undefined, 'task', false, 15),
 });

 if (!task) throw new Error("No se pudo recuperar la tarea creada.");

 if (sourceType === 'voice' && user) {
 await supabase.from('voice_inputs').insert({
 user_id: user.id,
 transcript: taskTitle,
 parsed_task_id: task.id,
 confidence,
 });
 }

 handleClose();
 if (isAnonymous &&!localStorage.getItem('adonai_first_task_prompt_shown')) {
 setTimeout(() => {
 window.dispatchEvent(new CustomEvent('adonai:first-task-created'));
 }, 600);
 }
 return task;
 } catch (err: any) {
 let errorMsg = err instanceof Error ? err.message : (err?.message || 'Error desconocido');
 toast.error(`Error al crear tarea: ${errorMsg}`);
 setPhase('input');
 throw err;
 } finally {
 isCurrentlySavingRef.current = false;
 }
 };

  const handleVoiceDone = useCallback(async (rawTranscript: string) => {
    const rawTitle = rawTranscript.trim();
    if (!rawTitle) return;
    const parsed = parseVoiceTranscript(rawTitle);
    const parsedTitle = parsed.title;
    const parsedDate = parsed.dueDate || dueDate || format(new Date(), 'yyyy-MM-dd');
    if (parsed.estimatedMinutes) setFallbackEstimatedMinutes(parsed.estimatedMinutes);
    setTitle(parsedTitle);
    setDueDate(parsedDate);
    await saveTaskQuick({
      title: parsedTitle,
      dueDate: parsedDate,
      goalId: goalId || null,
      importance: false,
      urgency: false,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueDate, goalId]);

  useEffect(() => {
    if (transcript && !isRecording && sourceType === 'voice' && !voiceProcessedRef.current) {
      voiceProcessedRef.current = true;
      handleVoiceDone(transcript);
    }
  }, [transcript, isRecording, sourceType, handleVoiceDone]);

  const handleSave = async () => {
    const normalizedTitle = title.replace(/\s+$/g, '');
    const normalizedDescription = description.replace(/\s+$/g, '');
    const normalizedLink = links.map((item) => item.trim()).filter(Boolean).join(' ');
    await saveTaskQuick({
      title: normalizedTitle,
      description: normalizedDescription.trim() ? normalizedDescription : undefined,
      link: normalizedLink.trim() ? normalizedLink : null,
      dueDate,
      goalId: goalId || null,
      importance: reviewImportance,
      urgency: reviewUrgency,
    });
  };

 if (!open) return null;
 const waveformBars = [4, 8, 12, 14, 10, 16, 12, 14, 6, 10, 14, 8, 4];
 const isMini = creationSource?.startsWith('mini_');

 return (
 <AnimatePresence>
 {open && (
 <>
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className={`fixed inset-0 z-[40] ${document.body.classList.contains('tutorial-active')? 'bg-[#061827]/55': 'bg-[#061827]/92 backdrop-blur-md'}`} 
 onClick={() => { if (!document.body.classList.contains('tutorial-active')) handleClose(); }} 
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ type: 'spring', damping: 22, stiffness: 260 }}
 className="fixed inset-0 z-[50] flex items-center justify-center p-4 pointer-events-none"
 >
 <div className={cn(
 "relative mx-auto w-full max-h-[90vh] overflow-y-auto pointer-events-auto shadow-[0_20px_70px_-18px_rgba(0,0,0,0.7)] bg-[#10141d] border border-white/10 text-white",
 isMini? "max-w-[340px] rounded-[24px]": "max-w-[400px] rounded-[32px]"
 )}>
 <div className={cn("flex flex-col", isMini? "p-4 gap-4": "p-6 gap-6")}>
 {phase!== 'saving' && (
 <div className="w-full flex justify-end -mt-1 -mr-1">
 <button
 onClick={() => { if (!document.body.classList.contains('tutorial-active')) handleClose(); }}
 className="p-1.5 rounded-xl hover:bg-black/5 transition-all active:scale-90 text-muted-foreground"
 >
 <X className={isMini? "w-3.5 h-3.5": "w-4 h-4"} />
 </button>
 </div>
 )}
 <AnimatePresence mode="wait">
 {phase === 'input' && (
 <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("w-full flex flex-col", isMini ? "gap-4" : "gap-5")}>
 {(isRecording || isProcessing || sourceType === 'voice') && (
 <div className={cn("w-full flex flex-col items-center", isMini ? "gap-4 py-4" : "gap-6 py-8")}>
 <div className={cn("flex items-center justify-center gap-1.5 w-full", isMini ? "h-12" : "h-20")}>
 {isProcessing ? (
 <div className="flex gap-2 items-center">
 {[0, 1, 2].map((i) => (
 <motion.div
 key={i}
 className={cn("rounded-full bg-primary", isMini ? "w-2 h-2" : "w-3 h-3")}
 animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
 transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
 />
 ))}
 </div>
 ) : (
 waveformBars.map((h, i) => (
 <motion.div key={i} className={cn("rounded-full bg-primary", isMini ? "w-1" : "w-1.5")} animate={{ height: [h * (isMini ? 1.5 : 2.5), h * (isMini ? 3 : 5), h * (isMini ? 1.5 : 2.5)] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.05 }} />
 ))
 )}
 </div>
 <div className="w-full text-center px-4">
 <p className={cn("font-bold leading-tight text-foreground", isMini ? "text-base" : "text-lg")}>
 {isProcessing ? "Analizando tu voz..." : (transcript || (isRecording ? "Escuchando..." : ""))}
 {!isProcessing && isRecording && <span className={cn("inline-block ml-1 animate-pulse bg-primary", isMini ? "w-0.5 h-4" : "w-1 h-5")} />}
 </p>
 </div>
 <div className={cn("flex flex-col items-center w-full", isMini ? "gap-2" : "gap-3")}>
 <div className="flex items-center gap-3">
 <button
 onClick={() => stopRecording()}
 className={cn(
 "rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform",
 isMini ? "w-11 h-11" : "w-14 h-14"
 )}
 title="Detener grabación"
 >
 <Square className={cn("text-primary fill-primary", isMini ? "w-4 h-4" : "w-5 h-5")} />
 </button>
 {isRecording && transcript.trim() && !isMini && (
 <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
 o presiona ↵ Enter
 </motion.span>
 )}
 </div>
 </div>
 </div>
 )}
 {!isRecording && !isProcessing && sourceType === 'text' && (
 <div className={cn("w-full flex flex-col", isMini ? "gap-3" : "gap-4")}>
 <AutoTextarea
 id="task-title-input"
 autoFocus
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="¿Qué tienes que hacer?"
 className={cn(
 "w-full font-semibold bg-white/[0.04] border border-white/12 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/25 resize-none text-white",
 isMini ? "text-base px-4 py-3 min-h-[56px]" : "text-lg px-5 py-4 min-h-[72px]"
 )}
 />
 <div className="space-y-2" data-no-swipe>
 {links.map((linkValue, index) => (
 <div key={index} className="relative flex items-center gap-2">
 <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
 <input
 value={linkValue}
 onChange={(e) => {
 const next = [...links];
 next[index] = e.target.value;
 setLinks(next);
 }}
 placeholder={index === 0 ? "Link opcional" : "Otro link"}
 className="w-full h-11 bg-white/[0.04] border border-white/12 rounded-[18px] pl-11 pr-12 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/45"
 />
 {index === links.length - 1 ? (
 <button
 type="button"
 onClick={() => setLinks([...links, ''])}
 className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white flex items-center justify-center transition-colors"
 aria-label="Agregar link"
 >
 <Plus className="h-4 w-4" />
 </button>
 ) : (
 <button
 type="button"
 onClick={() => setLinks(links.filter((_, linkIndex) => linkIndex !== index))}
 className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white flex items-center justify-center transition-colors"
 aria-label="Quitar link"
 >
 <X className="h-4 w-4" />
 </button>
 )}
 </div>
 ))}
 </div>
 <div className="relative" data-no-swipe>
 <Folder className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
 <select
 value={selectedFolderId || ''}
 onChange={(event) => setSelectedFolderId(event.target.value || null)}
 className="w-full h-11 appearance-none bg-white/[0.04] border border-white/12 rounded-[18px] pl-11 pr-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary/45"
 >
 <option className="bg-[#10141d]" value="">Hoy / Sin cuaderno</option>
 {folders.map((folder: any) => (
 <option className="bg-[#10141d]" key={folder.id} value={folder.id}>{folder.name}</option>
 ))}
 </select>
 </div>
 <div id="task-date-selector">
 <CalendarDatePicker
 date={dueDate}
 onSelect={(d) => setDueDate(d)}
 label="FECHA"
 />
 </div>
 <div className="grid grid-cols-2 gap-3" id="task-matrix-selector">
 <button
 id="task-importance-btn"
 type="button"
 onClick={() => setReviewImportance(!reviewImportance)}
 className={cn(
 "flex flex-col items-center justify-center gap-1 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border",
 isMini ? "h-12" : "h-14",
 reviewImportance
 ? "bg-amber-500/20 text-amber-600 border-amber-500/50 shadow-lg shadow-amber-500/10"
 : "bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5"
 )}
 >
 IMPORTANTE
 </button>
 <button
 id="task-urgency-btn"
 type="button"
 onClick={() => setReviewUrgency(!reviewUrgency)}
 className={cn(
 "flex flex-col items-center justify-center gap-1 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border",
 isMini ? "h-12" : "h-14",
 reviewUrgency
 ? "bg-red-500/20 text-red-600 border-red-500/50 shadow-lg shadow-red-500/10"
 : "bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5"
 )}
 >
 URGENTE
 </button>
 </div>
 <button
 id="task-save-btn"
 onClick={() => {
 handleSave();
 if (document.body.classList.contains('tutorial-active')) {
 document.dispatchEvent(new CustomEvent('force-tutorial-next', { detail: 5 }));
 }
 }}
 disabled={!title.replace(/\s+$/g, '').trim() || (document.body.classList.contains('tutorial-active') && !document.body.classList.contains('tutorial-can-continue'))}
 className={cn(
 "w-full bg-primary text-primary-foreground rounded-[24px] font-black text-sm shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 relative z-[100000] pointer-events-auto",
 isMini ? "h-14" : "h-16"
 )}
 >
 GUARDAR TAREA
 </button>
 </div>
 )}
 </motion.div>
 )}
 {phase === 'saving' && (
 <motion.div key="saving" className="flex flex-col items-center justify-center py-12 w-full min-h-[350px] gap-8">
 <div className="relative flex items-center justify-center w-full h-48">
 <AISphere />
 </div>
 <div className="text-center space-y-4">
 <h3 className="text-2xl font-black text-foreground tracking-tighter">{savingMessage}</h3>
 <div className="flex flex-col items-center gap-1">
 <div className="h-0.5 w-10 bg-primary rounded-full animate-pulse" />
 <p className="text-[8px] font-black uppercase tracking-[0.5em] text-muted-foreground">Neural Sync...</p>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 );
});

TaskCaptureModal.displayName = 'TaskCaptureModal';

export default TaskCaptureModal;
