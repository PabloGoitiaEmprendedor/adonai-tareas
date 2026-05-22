// DailyPage — Dark mode, no time blocks, no calendar view
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useFolders } from '@/hooks/useFolders';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Flame, Monitor, Apple, Sparkles, Notebook, NotebookText, Trophy, Snowflake, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { useGamification } from '@/hooks/useGamification';
import { TaskCard } from '@/components/TaskCard';
import { openDownloadDialog } from '@/lib/desktopApp';
import { startGuidedDownload } from '@/lib/downloadGuide';
import MiniTaskWidget from '@/components/MiniTaskWidget';
import { ChaosBuddiesTrigger } from '@/components/ChaosBuddiesTrigger';
import { WeeklySummaryModal } from '@/components/WeeklySummaryModal';
import { compareTasksWithinQuadrants, getTaskManualOrderGroupKey } from '@/lib/taskOrdering';

const NOTEBOOK_PAGE_COUNT = 30;
const TASKS_PER_NOTEBOOK_PAGE = 15;
const NOTEBOOK_PAGE_STORAGE_KEY = 'adonai_daily_notebook_page';

const clampNotebookPage = (page: number) => Math.min(NOTEBOOK_PAGE_COUNT, Math.max(1, page || 1));

const DailyPage = () => {
 const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
 const tasksFilter = useMemo(() => ({ date: today, excludeEvents: false }), [today]);
 const getInitialNotebookPage = () => {
 try {
 const raw = localStorage.getItem(NOTEBOOK_PAGE_STORAGE_KEY);
 if (!raw) return 1;
 const saved = JSON.parse(raw) as { date?: string; page?: number };
 if (saved.date === today) return clampNotebookPage(saved.page || 1);
 return clampNotebookPage((saved.page || 1) + 1);
 } catch {
 return 1;
 }
 };

 const { tasks, updateTask, isLoading } = useTasks(tasksFilter);
 const { createTask } = useTasks();
 const { folders } = useFolders();
 const { profile } = useProfile();
 const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
 const { metrics, trackDayActive } = useStreaks();
 const { checkAndUnlock } = useGamification();

 const isStreakFrozen = useMemo(() => {
 if (!metrics?.last_active_date) return false;
 const lastActive = parseISO(metrics.last_active_date);
 const todayDate = new Date();
 todayDate.setHours(0, 0, 0, 0);
 lastActive.setHours(0, 0, 0, 0);
 return differenceInDays(todayDate, lastActive) >= 2;
 }, [metrics?.last_active_date]);
 const [selectedTask, setSelectedTask] = useState<any>(null);
 const [timerTask, setTimerTask] = useState<any>(null);
 const [dragIdx, setDragIdx] = useState<number | null>(null);
 const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
 const [notebookPage, setNotebookPage] = useState(getInitialNotebookPage);
 const [pageTurnDirection, setPageTurnDirection] = useState(1);
 const [pagePeel, setPagePeel] = useState<'next' | 'prev' | null>(null);
 const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
 const timerDurationRef = useRef(0);
 const hasTrackedDayRef = useRef(false);
 const tasksRef = useRef(tasks);
 tasksRef.current = tasks;
 const completedCountRef = useRef(0);
 completedCountRef.current = tasks.filter((t) => t.status === 'done').length;
 const [miniWidgetOpen, setMiniWidgetOpen] = useState(() =>!!window.electronAPI);
 const [showMiniLeadModal, setShowMiniLeadModal] = useState(false);

 useEffect(() => {
 if (window.electronAPI) {
 window.electronAPI.onMiniWindowClosed(() => {
 setMiniWidgetOpen(false);
 });
 }
 }, []);


 useEffect(() => {
 if (hasTrackedDayRef.current) return;
 hasTrackedDayRef.current = true;
 trackDayActive.mutate();
 }, [trackDayActive]);

 const toggleMiniWidget = useCallback(() => {
 if (window.electronAPI) {
 window.electronAPI.toggleMiniWindow();
 setMiniWidgetOpen(prev =>!prev);
 return;
 }
 if (!localStorage.getItem('adonai_mini_btn_clicked')) {
 setShowMiniLeadModal(true);
 return;
 }
 openDownloadDialog();
 }, []);

 const handleMiniLeadInstall = useCallback((platform: 'win' | 'mac') => {
 setShowMiniLeadModal(false);
 localStorage.setItem('adonai_mini_btn_clicked', 'true');
 startGuidedDownload(platform);
 }, []);

 const handleMiniLeadDismiss = useCallback(() => {
 setShowMiniLeadModal(false);
 localStorage.setItem('adonai_mini_btn_clicked', 'true');
 }, []);

 const sortedTasks = useMemo(() => {
 let filtered = tasks.filter((t: any) => t.due_date === today || (t.due_date < today && t.status!== 'done'));
 if (selectedFolderId!== 'all') {
 filtered =!selectedFolderId? filtered.filter((t: any) =>!t.folder_id): filtered.filter((t: any) => t.folder_id === selectedFolderId);
 }
 
 return [...filtered].sort(compareTasksWithinQuadrants);
 }, [tasks, selectedFolderId, today]);

 useEffect(() => {
 setOrderedTasks(sortedTasks);
 }, [sortedTasks]);

 useEffect(() => {
 localStorage.setItem(NOTEBOOK_PAGE_STORAGE_KEY, JSON.stringify({ date: today, page: notebookPage }));
 }, [notebookPage, today]);

 const persistVisibleOrder = useCallback((nextOrder: any[]) => {
 nextOrder.forEach((task, idx) => {
 if (task.status!== 'done' && (task.sort_order?? 0)!== idx) {
 updateTask.mutate({ id: task.id, sort_order: idx });
 }
 });
 }, [updateTask]);

 const handleDragStart = useCallback((idx: number) => {
 if (orderedTasks[idx]?.status === 'done') return;
 setDragIdx(idx);
 }, [orderedTasks]);

 const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
 e.preventDefault();
 if (dragIdx === null || dragIdx === idx) return;
 const dragged = orderedTasks[dragIdx];
 const target = orderedTasks[idx];
 if (!dragged ||!target || dragged.status === 'done' || target.status === 'done') return;
 if (getTaskManualOrderGroupKey(dragged)!== getTaskManualOrderGroupKey(target)) return;

 const next = [...orderedTasks];
 const [moved] = next.splice(dragIdx, 1);
 next.splice(idx, 0, moved);
 setOrderedTasks(next);
 setDragIdx(idx);
 }, [dragIdx, orderedTasks]);

 const handleDragEnd = useCallback(() => {
 if (dragIdx!== null) persistVisibleOrder(orderedTasks);
 setDragIdx(null);
 }, [dragIdx, orderedTasks, persistVisibleOrder]);

 const profileName = useMemo(() => profile?.name, [profile?.name]);

 const visibleNotebookTasks = useMemo(() => {
 const start = (notebookPage - 1) * TASKS_PER_NOTEBOOK_PAGE;
 return orderedTasks.slice(start, start + TASKS_PER_NOTEBOOK_PAGE);
 }, [notebookPage, orderedTasks]);

 const shouldShowTaskPage = notebookPage <= NOTEBOOK_PAGE_COUNT;

 const handleComplete = useCallback(async (task: any, e: React.MouseEvent) => {
 e.stopPropagation();
 setCompletingTaskId(task.id);

 const isCurrentlyTiming = timerTask?.id === task.id;
 const finalDuration = isCurrentlyTiming? timerDurationRef.current: task.actual_duration_seconds;

 if (isCurrentlyTiming) {
 setTimerTask(null);
 }

 setTimeout(() => {
 const currentTasks = tasksRef.current;
 const remainingTasks = currentTasks.filter((t: any) => t.status!== 'done' && t.id!== task.id);
 const isLastTask = currentTasks.length > 0 && remainingTasks.length === 0;

 updateTask.mutate({ 
 id: task.id, 
 status: 'done', 
 completed_at: new Date().toISOString(),
 actual_duration_seconds: Number(finalDuration) || 0
 }, {
 onSuccess: () => {
 setCompletingTaskId(null);
 checkAndUnlock.mutate({ type: 'task_completed' });
 
 if (isLastTask) {
 triggerDailyCelebration(profileName);
 if (window.electronAPI) {
 window.electronAPI.showNotification(
 "¡Misión Cumplida! ",
 `Has terminado todas tus tareas de hoy, ${profileName || 'Emprendedor'}. ¡Disfruta tu descanso!`,
 'success'
 );
 }
 } else if (isCurrentlyTiming) {
 triggerOnTimeCelebration(task.title, profileName);
 } else {
 triggerTaskCelebration(task.title, profileName);
 if (completedCountRef.current + 1 === 5 && window.electronAPI) {
 window.electronAPI.showNotification(
 "¡Estás en racha! ",
 "Llevas 5 tareas completadas hoy. Sigue así.",
 'info'
 );
 }
 }
 },
 onError: () => setCompletingTaskId(null)
 });
 }, 500);
 }, [timerTask, updateTask, checkAndUnlock, profileName]);

 const handleUncomplete = useCallback((task: any, e: React.MouseEvent) => {
 e.stopPropagation();
 updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
 }, [updateTask]);

 const handleStartTimer = useCallback((task: any, e: React.MouseEvent) => {
 e.stopPropagation();
 setTimerTask(task);
 }, []);

 const playPageTurnSound = useCallback(() => {
 try {
 const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
 if (!AudioContextClass) return;
 const context = new AudioContextClass();
 const bufferSize = context.sampleRate * 0.28;
 const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
 const output = buffer.getChannelData(0);
 for (let i = 0; i < bufferSize; i += 1) {
 const progress = i / bufferSize;
 const attack = Math.min(1, progress * 10);
 const release = Math.max(0, 1 - progress);
 const flutter = 0.65 + Math.sin(progress * Math.PI * 7) * 0.22;
 output[i] = (Math.random() * 2 - 1) * attack * release * flutter * 0.07;
 }
 const source = context.createBufferSource();
 const highpass = context.createBiquadFilter();
 const lowpass = context.createBiquadFilter();
 const gain = context.createGain();
 highpass.type = 'highpass';
 highpass.frequency.value = 520;
 lowpass.type = 'lowpass';
 lowpass.frequency.value = 3600;
 gain.gain.setValueAtTime(0.001, context.currentTime);
 gain.gain.linearRampToValueAtTime(0.16, context.currentTime + 0.035);
 gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);
 source.buffer = buffer;
 source.connect(highpass);
 highpass.connect(lowpass);
 lowpass.connect(gain);
 gain.connect(context.destination);
 source.start();
 source.stop(context.currentTime + 0.28);
 source.onended = () => context.close();
 } catch {
 // Page audio is decorative; ignore browser restrictions.
 }
 }, []);

 const turnNotebookPage = useCallback((direction: 1 | -1) => {
 setPageTurnDirection(direction);
 setNotebookPage((page) => {
 const next = clampNotebookPage(page + direction);
 if (next!== page) playPageTurnSound();
 return next;
 });
 }, [playPageTurnSound]);

 const goToPrevPage = useCallback(() => {
 turnNotebookPage(-1);
 }, [turnNotebookPage]);

 const goToNextPage = useCallback(() => {
 turnNotebookPage(1);
 }, [turnNotebookPage]);

 const pageTurnVariants = {
 enter: (direction: number) => ({
 opacity: 0,
 rotateY: direction > 0? -8: 8,
 x: direction > 0? 10: -10,
 }),
 center: {
 opacity: 1,
 rotateY: 0,
 x: 0,
 },
 exit: (direction: number) => ({
 opacity: 0,
 rotateY: direction > 0? 10: -10,
 x: direction > 0? -12: 12,
 }),
 };

 const renderBlankNotebookPage = (compact = false) => (
 <div className={compact ? 'min-h-[360px]' : 'min-h-[52vh]'} />
 );

 const renderNotebookControls = (compact = false) => (
 <div className={`relative z-20 flex items-center justify-start ${compact ? 'mt-4 pt-2' : 'mt-auto pt-4'}`}>
 <div className="rounded-full bg-transparent px-1.5 py-1 text-[10px] font-black tabular-nums tracking-[0.16em] text-[#6f7a8d]/35">
 {notebookPage}/{NOTEBOOK_PAGE_COUNT}
 </div>
 </div>
 );

 const renderPageDragHandles = (compact = false) => (
 <>
 <motion.div
 role="button"
 aria-label="Arrastrar para volver la pagina"
 drag="x"
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.28}
 onDragStart={() => setPagePeel('prev')}
 onDragEnd={(_, info) => {
 setPagePeel(null);
 if (info.offset.x > 34 || info.velocity.x > 260) goToPrevPage();
 }}
 className={`cursor-hand group absolute left-0 z-40 ${compact ? 'top-24 bottom-14 w-10' : 'top-24 bottom-16 w-14'}`}
 >
 <div className={`absolute left-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-r-2xl border border-l-0 border-outline-variant/18 bg-background/45 shadow-sm backdrop-blur-sm transition-opacity ${compact ? 'h-20 w-5' : 'h-24 w-6'} ${notebookPage === 1 ? 'opacity-25' : 'opacity-70 group-hover:opacity-100'}`}>
 <div className="space-y-1">
 <span className="block h-5 w-px rounded-full bg-on-surface-variant/30" />
 <span className="block h-5 w-px rounded-full bg-on-surface-variant/20" />
 <span className="block h-5 w-px rounded-full bg-on-surface-variant/30" />
 </div>
 </div>
 </motion.div>
 <motion.div
 role="button"
 aria-label="Arrastrar para pasar la pagina"
 drag="x"
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.28}
 onDragStart={() => setPagePeel('next')}
 onDragEnd={(_, info) => {
 setPagePeel(null);
 if (info.offset.x < -34 || info.velocity.x < -260) goToNextPage();
 }}
 className={`cursor-hand group absolute right-0 z-40 ${compact ? 'top-24 bottom-14 w-10' : 'top-24 bottom-16 w-14'}`}
 >
 <div className={`absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-outline-variant/18 bg-background/45 shadow-sm backdrop-blur-sm transition-opacity ${compact ? 'h-20 w-5' : 'h-24 w-6'} ${notebookPage === NOTEBOOK_PAGE_COUNT ? 'opacity-25' : 'opacity-70 group-hover:opacity-100'}`}>
 <div className="space-y-1">
 <span className="block h-5 w-px rounded-full bg-on-surface-variant/30" />
 <span className="block h-5 w-px rounded-full bg-on-surface-variant/20" />
 <span className="block h-5 w-px rounded-full bg-on-surface-variant/30" />
 </div>
 </div>
 </motion.div>
 <AnimatePresence>
 {pagePeel && (
 <motion.div
 key={pagePeel}
 initial={{ opacity: 0, scaleX: 0.12, skewY: pagePeel === 'next'? -4: 4 }}
 animate={{ opacity: 0.78, scaleX: 1, skewY: pagePeel === 'next'? -1: 1 }}
 exit={{ opacity: 0, scaleX: 0.1 }}
 transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
 className={`pointer-events-none absolute top-7 bottom-7 z-30 w-[42%] bg-background/65 shadow-2xl ${
 pagePeel === 'next' ? 'right-0 origin-right rounded-l-[32px]' : 'left-0 origin-left rounded-r-[32px]'
 }`}
 style={{
 backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.18), transparent 42%, rgba(0,0,0,0.045))',
 }}
 />
 )}
 </AnimatePresence>
 </>
 );

 return (
 <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
 <div className="mx-auto w-full max-w-[440px] px-3 pt-4 pb-24 md:max-w-[980px] md:px-6 md:pt-6 md:pb-8 relative">

 {false && (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex items-center gap-8 bg-surface-container-highest/30 backdrop-blur-xl px-10 py-4 rounded-[32px] border border-outline-variant/15 shadow-lg"
 >
 {/* Streak Section */}
 <div className="flex items-center gap-4 pr-8 border-r border-outline-variant/20">
 {isStreakFrozen? (
 <motion.div 
 animate={{ x: [-1, 1, -1, 1, 0], scale: [1, 1.02, 1] }}
 transition={{ repeat: Infinity, duration: 3 }}
 className="flex items-center gap-4"
 >
 <div className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
 <Snowflake className="w-6 h-6 text-cyan-400 fill-cyan-400/20" />
 </div>
 <div className="flex flex-col">
 <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/70">Racha Congelada</span>
 <span className="text-base font-black text-cyan-400 leading-tight">{metrics?.streak_current || 0} días </span>
 </div>
 </motion.div>
 ): (
 <div className="flex items-center gap-4">
 <motion.div 
 className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#E65100]/20 to-[#FF3D00]/5 border border-[#E65100]/20"
 animate={{ 
 rotate: [-0.5, 0.5, -0.5],
 scale: [1, 1.02, 1],
 }}
 transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
 >
 {/* Fire Glow - Enhanced vibrancy */}
 <motion.div 
 className="absolute inset-0 bg-[#E65100]/30 blur-2xl rounded-full"
 animate={{ 
 opacity: [0.4, 0.8, 0.4],
 scale: [0.9, 1.3, 0.9],
 }}
 transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
 />
 
 {/* Floating Embers */}
 {[...Array(3)].map((_, i) => (
 <motion.div
 key={i}
 className="absolute w-1 h-1 bg-[#FFD54F] rounded-full blur-[1px]"
 initial={{ opacity: 0, y: 10, x: 0 }}
 animate={{ 
 opacity: [0, 1, 0],
 y: [-10, -30],
 x: [0, (i - 1) * 10],
 }}
 transition={{ 
 repeat: Infinity, 
 duration: 1.5 + i * 0.5, 
 delay: i * 0.4,
 ease: "easeOut"
 }}
 />
 ))}

 {/* Outer Flame - Liquid motion */}
 <motion.div 
 className="relative z-10"
 animate={{ 
 y: [0, -2, 0],
 scaleY: [1, 1.1, 1],
 rotate: [-2, 2, -2]
 }}
 transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
 >
 <Flame className="w-6 h-6 text-[#E65100] fill-[#E65100]/40 filter drop-shadow-[0_0_8px_rgba(230,81,0,0.5)]" />
 </motion.div>

 {/* Inner Core - Intense heat */}
 <motion.div
 className="absolute inset-0 z-20 flex items-center justify-center"
 animate={{ 
 scale: [0.45, 0.55, 0.5],
 opacity: [1, 0.8, 1],
 }}
 transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
 >
 <Flame className="w-5 h-5 text-[#FFC107] fill-[#FFC107] filter blur-[0.5px]" />
 </motion.div>
 </motion.div>
 
 <div className="flex flex-col">
 <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#E65100]/80">Racha</span>
 <span className="text-base font-black text-foreground tracking-tight leading-tight">{metrics?.streak_current || 0} días</span>
 </div>
 </div>
 )}
 </div>

 {/* Level Section - Regal Gold Aura */}
 <div className="flex items-center gap-4">
 <motion.div 
 className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA000]/5 border border-[#FFD700]/20"
 whileHover={{ scale: 1.05 }}
 >
 {/* Majestic Gold Glow */}
 <motion.div 
 className="absolute inset-0 bg-[#FFD700]/25 blur-2xl rounded-full"
 animate={{ 
 opacity: [0.3, 0.6, 0.3],
 scale: [0.8, 1.1, 0.8]
 }}
 transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
 />
 
 {/* Floating Gold Sparkles */}
 <motion.div
 className="absolute inset-0"
 animate={{ rotate: 360 }}
 transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
 >
 <div className="absolute top-0 left-1/2 w-0.5 h-0.5 bg-[#FFD700] rounded-full blur-[0.5px]" />
 <div className="absolute bottom-0 left-1/2 w-0.5 h-0.5 bg-[#FFD700] rounded-full blur-[0.5px]" />
 </motion.div>

 <Trophy className="relative z-10 w-6 h-6 text-[#FFD700] fill-[#FFD700]/30 filter drop-shadow-[0_0_10px_rgba(255,215,0,0.4)]" />
 </motion.div>
 <div className="flex flex-col">
 <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#FFD700]/80">Nivel</span>
 <span className="text-base font-black text-foreground tracking-tight leading-tight">Nivel {metrics?.level || 1}</span>
 </div>
 </div>
 </motion.div>
 )}

 {/* Desktop Task Notebook */}
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="relative hidden min-h-[min(740px,calc(100vh-8rem))] w-full md:flex flex-col overflow-hidden rounded-[36px] bg-surface/95 border border-outline-variant/12 py-7 pl-24 pr-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] backdrop-blur-xl"
 style={{
 backgroundImage: 'radial-gradient(circle at 18% 22%, rgba(255,255,255,0.09) 0 1px, transparent 1.6px), radial-gradient(circle at 73% 58%, rgba(0,0,0,0.05) 0 1px, transparent 1.7px), radial-gradient(circle at 42% 76%, rgba(255,255,255,0.045) 0 1px, transparent 1.8px), linear-gradient(90deg, transparent 0 70px, rgba(235,120,120,0.20) 70px 71px, transparent 71px calc(100% - 46px), rgba(235,120,120,0.13) calc(100% - 46px) calc(100% - 45px), transparent calc(100% - 45px))',
 backgroundPosition: '0 18px',
 borderRadius: '36px 34px 38px 35px',
 }}
 >
 <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/[0.035] to-transparent pointer-events-none" />
 <div className="pointer-events-none absolute bottom-5 right-0 top-5 w-10">
 {[0, 1, 2, 3, 4, 5].map((page) => (
 <span
 key={page}
 className="absolute right-0 block h-[calc(100%-8px)] rounded-r-[22px] border-r border-y border-outline-variant/10 bg-background/20"
 style={{
 top: `${page * 4}px`,
 width: `${12 + page * 4}px`,
 opacity: 0.18 - page * 0.018,
 }}
 />
 ))}
 </div>
 <div className="absolute bottom-8 left-16 top-8 w-px bg-rose-300/18" />
 <div className="absolute bottom-8 right-14 top-8 w-px bg-rose-300/12" />
 <div className="absolute inset-y-3 left-5 flex flex-col justify-between">
 {Array.from({ length: 18 }).map((_, ring) => (
 <span
 key={ring}
 className="h-3.5 w-12 rounded-full border-2 border-outline-variant/28 bg-background/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.12)]"
 />
 ))}
 </div>

 <div className="relative z-10 mb-4 flex items-start justify-end">
 <button
 id="mini-window-btn"
 onClick={toggleMiniWidget}
 className="inline-flex items-center gap-2 rounded-full border border-outline-variant/16 bg-background/55 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-on-surface-variant/65 shadow-sm transition-all hover:border-primary/25 hover:text-primary active:scale-95"
 >
 <Monitor className="h-3.5 w-3.5" />
 Mini cuaderno
 <span className={`h-2 w-2 rounded-full ${miniWidgetOpen? 'bg-primary': 'bg-on-surface-variant/30'}`} />
 </button>
 </div>

 <AnimatePresence mode="wait" custom={pageTurnDirection}>
 <motion.div
 key={`desktop-page-${notebookPage}`}
 custom={pageTurnDirection}
 variants={pageTurnVariants}
 initial="enter"
 animate="center"
 exit="exit"
 transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
 className="relative z-10 flex flex-1 flex-col"
 style={{ transformOrigin: pageTurnDirection > 0? 'right center': 'left center', transformStyle: 'preserve-3d' }}
 >
 {shouldShowTaskPage? (
 <>
 {/* Cuadernos Bar */}
 <div className="relative z-10 flex items-center gap-2 overflow-x-auto no-scrollbar pb-5 mb-2 border-b border-outline-variant/10">
 <motion.button
 onClick={() => setSelectedFolderId(null)}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className={`flex-shrink-0 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${
 selectedFolderId === null? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/15': 'bg-background/45 text-on-surface-variant/70 hover:text-primary border-outline-variant/15 hover:border-primary/30'
 }`}
 >
 General
 </motion.button>
 {folders.map((folder: any) => {
 const isSelected = selectedFolderId === folder.id;
 return (
 <motion.button
 key={folder.id}
 onClick={() => setSelectedFolderId(isSelected? null: folder.id)}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${
 isSelected? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/15': 'bg-background/45 text-on-surface-variant/70 hover:text-primary border-outline-variant/15 hover:border-primary/30'
 }`}
 >
 <motion.div
 key={isSelected? 'open': 'closed'}
 initial={{ rotateY: isSelected? 180: -180, scale: 0.8 }}
 animate={{ rotateY: 0, scale: 1 }}
 transition={{ type: 'spring', stiffness: 400, damping: 15 }}
 style={{ display: 'flex' }}
 >
 {isSelected? (
 <NotebookText className="w-4 h-4" />
 ): (
 <Notebook className="w-4 h-4" />
 )}
 </motion.div>
 {folder.name}
 </motion.button>
 );
 })}
 </div>

 {/* Task List - Inside Desktop Notebook */}
 <div
 className="relative z-10 mt-3 pb-5 pt-[2px]"
 style={{
 backgroundImage: 'repeating-linear-gradient(180deg, rgba(120,145,190,0.16) 0 1px, transparent 1px 42px)',
 }}
 >
 {isLoading? (
 <div className="space-y-6">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-24 bg-surface-container-highest/20 border border-outline-variant/10 rounded-[32px] animate-pulse" />
 ))}
 </div>
 ): visibleNotebookTasks.length > 0? (
 <div className="space-y-0">
 {visibleNotebookTasks.map((task, idx) => (
 <TaskCard
 key={task.id}
 task={task}
 taskIdx={(notebookPage - 1) * TASKS_PER_NOTEBOOK_PAGE + idx}
 isDone={task.status === 'done'}
 completingTaskId={completingTaskId}
 dragIdx={dragIdx}
 handleDragStart={handleDragStart}
 handleDragOver={handleDragOver}
 handleDragEnd={handleDragEnd}
 setSelectedTask={setSelectedTask}
 handleComplete={handleComplete}
 handleUncomplete={handleUncomplete}
 handleStartTimer={handleStartTimer}
 view="daily"
 />
 ))}
 </div>
 ): (
 notebookPage === 1? (
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface-container-highest/10 border border-dashed border-outline-variant/20 rounded-[40px]"
 >
 <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
 <Sparkles className="w-10 h-10 text-primary/30" />
 </div>
 <h3 className="text-xl font-black mb-2 text-foreground/80">Todo en orden</h3>
 <p className="text-sm text-muted-foreground max-w-[280px] font-medium leading-relaxed">
 Tu isla de tareas está despejada. Es el momento perfecto para enfocarte en lo que sigue o disfrutar el progreso.
 </p>
 </motion.div>
 ): (
 renderBlankNotebookPage(false)
 )
 )}
 </div>
 </>
 ): (
 <div className="relative z-10">
 {renderBlankNotebookPage(false)}
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 {renderPageDragHandles(false)}
 {renderNotebookControls(false)}
 </motion.div>

 {/* Mobile Task Island */}
 <motion.div 
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 className="relative md:hidden flex min-h-[min(680px,calc(100vh-8rem))] w-full flex-col overflow-hidden rounded-[30px] bg-surface/95 border border-outline-variant/12 py-4 pl-12 pr-4 shadow-xl shadow-black/10 backdrop-blur-xl"
 style={{
 backgroundImage: 'radial-gradient(circle at 20% 22%, rgba(255,255,255,0.09) 0 1px, transparent 1.6px), radial-gradient(circle at 78% 62%, rgba(0,0,0,0.05) 0 1px, transparent 1.7px), radial-gradient(circle at 44% 76%, rgba(255,255,255,0.045) 0 1px, transparent 1.8px), linear-gradient(90deg, transparent 0 38px, rgba(235,120,120,0.18) 38px 39px, transparent 39px calc(100% - 28px), rgba(235,120,120,0.11) calc(100% - 28px) calc(100% - 27px), transparent calc(100% - 27px))',
 backgroundPosition: '0 17px',
 borderRadius: '30px 28px 32px 29px',
 }}
 >
 <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/[0.035] to-transparent pointer-events-none" />
 <div className="pointer-events-none absolute bottom-4 right-0 top-4 w-7">
 {[0, 1, 2, 3, 4].map((page) => (
 <span
 key={page}
 className="absolute right-0 block h-[calc(100%-6px)] rounded-r-[18px] border-r border-y border-outline-variant/10 bg-background/20"
 style={{
 top: `${page * 3}px`,
 width: `${8 + page * 3}px`,
 opacity: 0.16 - page * 0.018,
 }}
 />
 ))}
 </div>
 <div className="absolute bottom-7 left-8 top-7 w-px bg-rose-300/18" />
 <div className="absolute bottom-7 right-7 top-7 w-px bg-rose-300/12" />
 <div className="absolute inset-y-3 left-3 flex flex-col justify-between">
 {Array.from({ length: 15 }).map((_, ring) => (
 <span
 key={ring}
 className="h-3 w-8 rounded-full border-2 border-outline-variant/28 bg-background/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.12)]"
 />
 ))}
 </div>
 <div className="relative z-10 mb-4 flex justify-end">
 <button
 id="mini-window-btn-mobile"
 onClick={toggleMiniWidget}
 className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/16 bg-background/65 px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-on-surface-variant/60 shadow-sm transition-all active:scale-95"
 >
 <Monitor className="h-3 w-3" />
 Mini
 </button>
 </div>
 <AnimatePresence mode="wait" custom={pageTurnDirection}>
 <motion.div
 key={`mobile-page-${notebookPage}`}
 custom={pageTurnDirection}
 variants={pageTurnVariants}
 initial="enter"
 animate="center"
 exit="exit"
 transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
 className="relative z-10 flex flex-1 flex-col"
 style={{ transformOrigin: pageTurnDirection > 0? 'right center': 'left center', transformStyle: 'preserve-3d' }}
 >
 {shouldShowTaskPage? (
 <>
 {/* Mobile Folders - Centered */}
 <div className="relative z-10 flex items-center gap-2 overflow-x-auto no-scrollbar py-2 justify-center border-b border-outline-variant/10 pb-4 mb-4">
 <motion.button
 onClick={() => setSelectedFolderId(null)}
 whileTap={{ scale: 0.95 }}
 className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
 selectedFolderId === null? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20': 'bg-surface-container-high/40 text-on-surface-variant/70 border-outline-variant/20'
 }`}
 >
 General
 </motion.button>
 {folders.map((folder: any) => {
 const isSelected = selectedFolderId === folder.id;
 return (
 <motion.button
 key={folder.id}
 onClick={() => setSelectedFolderId(isSelected? null: folder.id)}
 whileTap={{ scale: 0.95 }}
 className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
 isSelected? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20': 'bg-surface-container-high/40 text-on-surface-variant/70 border-outline-variant/20'
 }`}
 >
 <motion.div
 key={isSelected? 'open': 'closed'}
 initial={{ rotateY: isSelected? 180: -180, scale: 0.8 }}
 animate={{ rotateY: 0, scale: 1 }}
 transition={{ type: 'spring', stiffness: 400, damping: 15 }}
 style={{ display: 'flex' }}
 >
 {isSelected? (
 <NotebookText className="w-3.5 h-3.5" />
 ): (
 <Notebook className="w-3.5 h-3.5" />
 )}
 </motion.div>
 {folder.name}
 </motion.button>
 );
 })}
 </div>

 {/* Mobile Task List */}
 <div
 className="relative z-10 pb-5 pt-[2px]"
 style={{
 backgroundImage: 'repeating-linear-gradient(180deg, rgba(120,145,190,0.16) 0 1px, transparent 1px 42px)',
 }}
 >
 {isLoading? (
 <div className="space-y-4">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-20 bg-surface-container-highest/10 border border-outline-variant/10 rounded-2xl animate-pulse" />
 ))}
 </div>
 ): visibleNotebookTasks.length > 0? (
 <div className="space-y-0">
 {visibleNotebookTasks.map((task, idx) => (
 <TaskCard
 key={task.id}
 task={task}
 taskIdx={(notebookPage - 1) * TASKS_PER_NOTEBOOK_PAGE + idx}
 isDone={task.status === 'done'}
 completingTaskId={completingTaskId}
 dragIdx={dragIdx}
 handleDragStart={handleDragStart}
 handleDragOver={handleDragOver}
 handleDragEnd={handleDragEnd}
 setSelectedTask={setSelectedTask}
 handleComplete={handleComplete}
 handleUncomplete={handleUncomplete}
 handleStartTimer={handleStartTimer}
 view="daily"
 />
 ))}
 </div>
 ): (
 notebookPage === 1? (
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex flex-col items-center justify-center py-12 px-4 text-center bg-surface-container-highest/5 border border-dashed border-outline-variant/20 rounded-3xl"
 >
 <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
 <Sparkles className="w-7 h-7 text-primary/30" />
 </div>
 <h3 className="text-base font-black mb-1 text-foreground/80">Todo en orden</h3>
 <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
 No hay tareas para hoy. Es un buen momento para descansar.
 </p>
 </motion.div>
 ): (
 renderBlankNotebookPage(true)
 )
 )}
 </div>
 </>
 ): (
 <div className="relative z-10">
 {renderBlankNotebookPage(true)}
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 {renderPageDragHandles(true)}
 {renderNotebookControls(true)}
 </motion.div>

 </div>

 <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
 <FullscreenTimer 
 task={timerTask} 
 open={!!timerTask} 
 onClose={() => setTimerTask(null)} 
 durationRef={timerDurationRef}
 />
 {!window.electronAPI && (
 <MiniTaskWidget isOpen={miniWidgetOpen} onClose={() => setMiniWidgetOpen(false)} />
 )}
 <ChaosBuddiesTrigger />
 <WeeklySummaryModal />

 <AnimatePresence>
 {showMiniLeadModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="w-full max-w-[360px] bg-surface-container border border-outline-variant rounded-[32px] overflow-hidden shadow-2xl relative"
 >
 <button
 onClick={handleMiniLeadDismiss}
 className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-foreground transition-colors"
 >
 <X className="w-5 h-5" />
 </button>

 <div className="p-8 space-y-6">
 <div className="flex justify-center">
 <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
 <Monitor className="w-8 h-8 text-primary" />
 </div>
 </div>

 <div className="text-center space-y-2">
 <h2 className="text-xl font-black tracking-tight text-foreground">
 Mini cuaderno exclusivo de escritorio
 </h2>
 <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
 El mini cuaderno solo está disponible en la app de escritorio. Descárgala y ten Adonai siempre visible mientras trabajas.
 </p>
 </div>

 <div className="space-y-2 pt-2">
 <button
 onClick={() => handleMiniLeadInstall('win')}
 className="w-full h-14 bg-foreground text-background font-black text-base rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
 >
 <Monitor className="w-5 h-5" />
 Descargar para Windows
 </button>
 <button
 onClick={() => handleMiniLeadInstall('mac')}
 className="w-full h-14 bg-surface-container-high text-foreground font-black text-base rounded-2xl flex items-center justify-center gap-3 border border-outline-variant/20 hover:bg-surface-container-highest hover:scale-[1.02] active:scale-95 transition-all"
 >
 <Apple className="w-5 h-5" />
 Descargar para Mac
 </button>
 <button
 onClick={handleMiniLeadDismiss}
 className="w-full h-11 text-on-surface-variant/60 font-bold text-xs hover:text-foreground transition-colors"
 >
 Seguir en la web
 </button>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
};

export default DailyPage;
