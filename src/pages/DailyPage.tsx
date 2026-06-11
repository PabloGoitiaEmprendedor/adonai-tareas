// DailyPage - Dark mode, no time blocks, no calendar view
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useFolders } from '@/hooks/useFolders';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { Flame, Monitor, Apple, Trophy, Snowflake, ChevronLeft, ChevronRight, Search, X, Plus, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { useGamification } from '@/hooks/useGamification';
import { TaskCard } from '@/components/TaskCard';
import { startGuidedDownload } from '@/lib/downloadGuide';
import MiniTaskWidget from '@/components/MiniTaskWidget';
import { ChaosBuddiesTrigger } from '@/components/ChaosBuddiesTrigger';
import { compareTasksWithinQuadrants, getTaskManualOrderGroupKey } from '@/lib/taskOrdering';
import { playPageTurnSound } from '@/lib/soundEffects';
import type { TaskLike } from '@/lib/taskTypes';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents';
import { writeCalendarDate, writeCalendarViewMode } from '@/lib/calendarStateSync';
import { buildTaskDateSections } from '@/lib/taskDateGroups';

const NOTEBOOK_PAGE_COUNT = 30;
const TASKS_PER_NOTEBOOK_PAGE = 10;
const NOTEBOOK_PAGE_STORAGE_KEY = 'adonai_daily_notebook_page';

const clampNotebookPage = (page: number) => Math.min(NOTEBOOK_PAGE_COUNT, Math.max(1, page || 1));

type MobileSearchResult =
  | {
      kind: 'task';
      id: string;
      title: string;
      subtitle: string;
      task: TaskLike;
      sortDate: string;
    }
  | {
      kind: 'event';
      id: string;
      title: string;
      subtitle: string;
      event: CalendarEvent;
      sortDate: string;
    };

type DailyFolder = {
  id: string;
  name: string;
  color?: string | null;
  deleted_at?: string | null;
  isShared?: boolean;
};

const DailyPage = () => {
 const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
 const tasksFilter = useMemo(() => ({ date: today, excludeEvents: false }), [today]);
 const navigate = useNavigate();
 const getInitialNotebookPage = () => {
   return 1;
 };
 const showStats = false;

 const { tasks, updateTask, deleteTask, isLoading } = useTasks(tasksFilter);
 const { tasks: allSearchTasks } = useTasks();
 const calendarSearchRange = useMemo(() => {
   const now = new Date();
   return {
     start: addDays(now, -90).toISOString(),
     end: addDays(now, 365).toISOString(),
   };
 }, []);
 const { events: calendarSearchEvents } = useCalendarEvents(calendarSearchRange.start, calendarSearchRange.end);
 const { folders, createFolder, deleteFolder } = useFolders();
 const visibleFolders = useMemo<DailyFolder[]>(() => (folders as DailyFolder[]).filter((folder) => !folder.deleted_at), [folders]);
  const { profile } = useProfile();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderTabs, setShowFolderTabs] = useState(true);
  const [showUpcomingDays, setShowUpcomingDays] = useState(false);
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
 const [selectedTask, setSelectedTask] = useState<TaskLike | null>(null);
 const [mobileSearchQuery, setMobileSearchQuery] = useState('');
 const [folderManageMode, setFolderManageMode] = useState(false);
 const [timerTask, setTimerTask] = useState<TaskLike | null>(null);
 const [dragIdx, setDragIdx] = useState<number | null>(null);
 const dragIdxRef = useRef<number | null>(null);
 const [orderedTasks, setOrderedTasks] = useState<TaskLike[]>([]);
 const orderedTasksRef = useRef<TaskLike[]>([]);
 const suppressOrderSyncRef = useRef(false);
 const suppressOrderSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const [notebookPage, setNotebookPage] = useState(getInitialNotebookPage);
 const [pageTurnDirection, setPageTurnDirection] = useState(1);
 const [pagePeel, setPagePeel] = useState<'next' | 'prev' | null>(null);
 const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
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
    setShowMiniLeadModal(true);
  }, []);

 const handleMiniLeadInstall = useCallback((platform: 'win' | 'mac') => {
 setShowMiniLeadModal(false);
 localStorage.setItem('adonai_mini_btn_clicked', 'true');
 startGuidedDownload(platform);
 }, []);

  const handleMiniLeadDismiss = useCallback(() => {
    setShowMiniLeadModal(false);
  }, []);

 const sortedTasks = useMemo(() => {
  let filtered = tasks.filter((t: TaskLike) => t.due_date === today || (t.due_date && t.due_date < today && t.status !== 'done'));
  if (selectedFolderId!== 'all') {
  filtered =!selectedFolderId? filtered.filter((t: TaskLike) =>!t.folder_id): filtered.filter((t: TaskLike) => t.folder_id === selectedFolderId);
  }
  
  return [...filtered].sort(compareTasksWithinQuadrants);
 }, [tasks, selectedFolderId, today]);

  const upcomingTasksByDate = useMemo(() => {
    const upcoming = allSearchTasks
      .filter((t: TaskLike) => t.status !== 'deleted')
      .filter((t: TaskLike) => !!t.due_date && t.due_date > today)
      .filter((t: TaskLike) => (selectedFolderId ? t.folder_id === selectedFolderId : !t.folder_id));

    return buildTaskDateSections(upcoming, new Date(today)).futureWeekGroups.map((week) => ({
      ...week,
      tasks: [...week.tasks].sort(compareTasksWithinQuadrants),
      days: week.days.map((day) => ({
        ...day,
        tasks: [...day.tasks].sort(compareTasksWithinQuadrants),
      })),
      }));
  }, [allSearchTasks, selectedFolderId, today]);

  const openTaskCapture = useCallback((date?: string) => {
    window.dispatchEvent(new CustomEvent('adonai:open-capture', {
      detail: {
        folderId: selectedFolderId || undefined,
        date,
      },
    }));
  }, [selectedFolderId]);

  const mobileSearchResults = useMemo<MobileSearchResult[]>(() => {
    const query = mobileSearchQuery.trim().toLowerCase();
    if (query.length < 2) return [];

    const taskResults = allSearchTasks
      .filter((task: TaskLike) => task.status !== 'done' && task.status !== 'deleted')
      .filter((task: TaskLike) => {
        const haystack = [
          task.title,
          task.description,
          task.link,
          task.due_date,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .sort(compareTasksWithinQuadrants)
      .map((task: TaskLike) => {
        const folder = visibleFolders.find((item) => item.id === task.folder_id);
        return {
          kind: 'task' as const,
          id: `task-${task.id}`,
          title: task.title || 'Sin titulo',
          subtitle: `${folder?.name || (task.folder_id ? 'Cuaderno' : 'General')}${task.due_date ? ` · ${task.due_date}` : ''}`,
          task,
          sortDate: task.due_date || '9999-12-31',
        };
      });

    const eventResults = calendarSearchEvents
      .filter((event) => {
        const haystack = [
          event.title,
          event.description,
          event.location,
          event.start,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .map((event) => {
        const startDate = event.start ? new Date(event.start) : null;
        const hasValidStart = !!startDate && !Number.isNaN(startDate.getTime());
        return {
          kind: 'event' as const,
          id: `event-${event.id}`,
          title: event.title || 'Evento sin titulo',
          subtitle: hasValidStart ? `Calendario · ${format(startDate, 'dd/MM/yyyy HH:mm')}` : 'Calendario',
          event,
          sortDate: hasValidStart ? startDate.toISOString() : '9999-12-31',
        };
      });

    return [...taskResults, ...eventResults]
      .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
      .slice(0, 8);
  }, [allSearchTasks, calendarSearchEvents, mobileSearchQuery, visibleFolders]);

  const openSearchResult = useCallback((result: MobileSearchResult) => {
    if (result.kind === 'task') {
      setSelectedTask(result.task);
      setMobileSearchQuery('');
      return;
    }

    const startDate = result.event.start ? new Date(result.event.start) : null;
    if (startDate && !Number.isNaN(startDate.getTime())) {
      writeCalendarDate(startDate);
      writeCalendarViewMode('day');
    }
    setMobileSearchQuery('');
    navigate('/week');
  }, [navigate]);



 useEffect(() => {
 if (!highlightedTaskId) return;
 const timeout = window.setTimeout(() => setHighlightedTaskId(null), 2400);
 return () => window.clearTimeout(timeout);
 }, [highlightedTaskId]);

 useEffect(() => {
 orderedTasksRef.current = orderedTasks;
 }, [orderedTasks]);

 useEffect(() => {
 if (suppressOrderSyncRef.current) return;
 setOrderedTasks(sortedTasks);
 orderedTasksRef.current = sortedTasks;
 dragIdxRef.current = null;
 setDragIdx(null);
 }, [sortedTasks]);

 useEffect(() => {
 return () => {
 if (suppressOrderSyncTimerRef.current) window.clearTimeout(suppressOrderSyncTimerRef.current);
 };
 }, []);

 useEffect(() => {
 localStorage.setItem(NOTEBOOK_PAGE_STORAGE_KEY, JSON.stringify({ date: today, page: notebookPage }));
 }, [notebookPage, today]);

 const persistVisibleOrder = useCallback((nextOrder: TaskLike[]) => {
 nextOrder.forEach((task, idx) => {
 if ((task.sort_order?? 0)!== idx) {
 updateTask.mutate({ id: task.id, sort_order: idx });
 }
 });
 }, [updateTask]);

 const moveReorderToPoint = useCallback((clientX: number, clientY: number) => {
 const currentDragIdx = dragIdxRef.current;
 if (currentDragIdx === null) return;
 const currentOrder = orderedTasksRef.current;
 const dragged = currentOrder[currentDragIdx];
 if (!dragged) return;

 const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-task-idx]'));
 if (rows.length === 0) return;
 let targetIdx: number | null = null;
 for (const row of rows) {
 const rect = row.getBoundingClientRect();
 if (clientY >= rect.top && clientY <= rect.bottom && clientX >= rect.left - 48 && clientX <= rect.right + 48) {
 targetIdx = Number(row.dataset.taskIdx);
 const midpoint = rect.top + rect.height / 2;
 if (clientY > midpoint && targetIdx < currentOrder.length - 1) targetIdx += 1;
 break;
 }
 }
 if (targetIdx === null) {
 let closestDistance = Number.POSITIVE_INFINITY;
 for (const row of rows) {
 const rect = row.getBoundingClientRect();
 const centerY = rect.top + rect.height / 2;
 const distance = Math.abs(centerY - clientY);
 if (distance < closestDistance) {
 closestDistance = distance;
 targetIdx = Number(row.dataset.taskIdx);
 }
 }
 }
 if (targetIdx === null || Number.isNaN(targetIdx)) return;
 targetIdx = Math.max(0, Math.min(currentOrder.length - 1, targetIdx));
 if (targetIdx === currentDragIdx) return;

 const target = currentOrder[targetIdx];
 if (!target) return;
 if (getTaskManualOrderGroupKey(dragged) !== getTaskManualOrderGroupKey(target)) return;

 const next = [...currentOrder];
 const [moved] = next.splice(currentDragIdx, 1);
 next.splice(targetIdx, 0, moved);
 orderedTasksRef.current = next;
 dragIdxRef.current = targetIdx;
 setOrderedTasks(next);
 setDragIdx(targetIdx);
 }, []);

 const finishPointerReorder = useCallback(() => {
 const currentDragIdx = dragIdxRef.current;
 if (currentDragIdx !== null) {
 const finalOrder = orderedTasksRef.current;
 persistVisibleOrder(finalOrder);
 const optimisticOrder = finalOrder.map((task, idx) => ({ ...task, sort_order: idx }));
 orderedTasksRef.current = optimisticOrder;
 setOrderedTasks(optimisticOrder);
 suppressOrderSyncRef.current = true;
 if (suppressOrderSyncTimerRef.current) window.clearTimeout(suppressOrderSyncTimerRef.current);
 suppressOrderSyncTimerRef.current = window.setTimeout(() => {
 suppressOrderSyncRef.current = false;
 }, 1600);
 }
 dragIdxRef.current = null;
 setDragIdx(null);
 document.body.style.cursor = '';
 document.body.style.userSelect = '';
 }, [persistVisibleOrder]);

 const handlePointerReorderStart = useCallback((idx: number, clientX: number, clientY: number) => {
 const task = orderedTasksRef.current[idx];
 if (!task || task.status === 'done') return;
 dragIdxRef.current = idx;
 setDragIdx(idx);
 document.body.style.cursor = 'grabbing';
 document.body.style.userSelect = 'none';
 moveReorderToPoint(clientX, clientY);

 const onPointerMove = (event: PointerEvent) => {
 event.preventDefault();
 moveReorderToPoint(event.clientX, event.clientY);
 };
 const cleanup = () => {
 window.removeEventListener('pointermove', onPointerMove);
 window.removeEventListener('pointerup', cleanup);
 window.removeEventListener('pointercancel', cleanup);
 finishPointerReorder();
 };
 window.addEventListener('pointermove', onPointerMove, { passive: false });
 window.addEventListener('pointerup', cleanup);
 window.addEventListener('pointercancel', cleanup);
 }, [finishPointerReorder, moveReorderToPoint]);

 const handleDragStart = useCallback((idx: number) => {
 dragIdxRef.current = idx;
 setDragIdx(idx);
 }, []);

 const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
 e.preventDefault();
 const currentDragIdx = dragIdxRef.current ?? dragIdx;
 if (currentDragIdx === null || currentDragIdx === idx) return;
 const dragged = orderedTasks[currentDragIdx];
 const target = orderedTasks[idx];
 if (!dragged ||!target) return;
 if (getTaskManualOrderGroupKey(dragged)!== getTaskManualOrderGroupKey(target)) return;

 const next = [...orderedTasks];
 const [moved] = next.splice(currentDragIdx, 1);
 next.splice(idx, 0, moved);
 dragIdxRef.current = idx;
 setOrderedTasks(next);
 setDragIdx(idx);
 }, [dragIdx, orderedTasks]);

 const handleDragEnd = useCallback(() => {
 if ((dragIdxRef.current ?? dragIdx)!== null) persistVisibleOrder(orderedTasks);
 dragIdxRef.current = null;
 setDragIdx(null);
 }, [dragIdx, orderedTasks, persistVisibleOrder]);

 const handleTouchStart = useCallback((idx: number, e: React.TouchEvent) => {
   e.stopPropagation();
   dragIdxRef.current = idx;
   setDragIdx(idx);
 }, []);

 const handleTouchMove = useCallback((e: React.TouchEvent) => {
   const currentDragIdx = dragIdxRef.current ?? dragIdx;
   if (currentDragIdx === null) return;
   const touch = e.touches[0];
   if (!touch) return;
   const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
   const card = el?.closest('[data-task-idx]') as HTMLElement | null;
   const idxStr = card?.getAttribute('data-task-idx');
   if (!idxStr) return;
   const idx = Number(idxStr);
   if (Number.isNaN(idx) || currentDragIdx === idx) return;

   const dragged = orderedTasks[currentDragIdx];
   const target = orderedTasks[idx];
   if (!dragged || !target) return;
   if (getTaskManualOrderGroupKey(dragged) !== getTaskManualOrderGroupKey(target)) return;

   const next = [...orderedTasks];
   const [moved] = next.splice(currentDragIdx, 1);
   next.splice(idx, 0, moved);
   dragIdxRef.current = idx;
   setOrderedTasks(next);
   setDragIdx(idx);
 }, [dragIdx, orderedTasks]);

 const handleTouchEnd = useCallback(() => {
   if ((dragIdxRef.current ?? dragIdx) !== null) persistVisibleOrder(orderedTasks);
   dragIdxRef.current = null;
   setDragIdx(null);
 }, [dragIdx, orderedTasks, persistVisibleOrder]);

 const profileName = useMemo(() => profile?.name, [profile?.name]);

 const visibleNotebookTasks = orderedTasks;

  const isMainNotebookComplete = selectedFolderId === null && orderedTasks.length > 0 && orderedTasks.every((task) => task.status === 'done');

  const shouldShowTaskPage = true;

  const currentFolderName = useMemo(() => {
    if (selectedFolderId === null) return 'General';
    const folder = visibleFolders.find((f) => f.id === selectedFolderId);
    return folder?.name || 'General';
  }, [selectedFolderId, visibleFolders]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('adonai:daily-folder-context-change', {
      detail: selectedFolderId ? { folderId: selectedFolderId, folderName: currentFolderName } : {},
    }));

    return () => {
      window.dispatchEvent(new CustomEvent('adonai:daily-folder-context-change', { detail: {} }));
    };
  }, [selectedFolderId, currentFolderName]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('adonai:set-page-title', {
      detail: { title: 'Pendientes', meta: '' },
    }));
  }, []);

  const countFolderTasks = useCallback((folderId: string) => (
    allSearchTasks.filter((task: TaskLike) => task.folder_id === folderId && task.status !== 'deleted').length
  ), [allSearchTasks]);

  const handleCreateFolder = useCallback(() => {
    const name = window.prompt('Nombre del nuevo cuaderno');
    const trimmedName = name?.trim();
    if (!trimmedName) return;

    createFolder.mutate(
      { name: trimmedName, color: '#A8A29E' },
      {
        onSuccess: (folder: DailyFolder) => {
          setSelectedFolderId(folder.id);
          toast.success('Cuaderno creado');
        },
        onError: () => toast.error('No se pudo crear el cuaderno'),
      }
    );
  }, [createFolder]);

  const handleDeleteFolder = useCallback((folder: DailyFolder) => {
    if (folder.isShared) {
      toast.error('No puedes eliminar un cuaderno compartido por otra persona');
      return;
    }

    const folderTasks = allSearchTasks.filter((task: TaskLike) => task.folder_id === folder.id && task.status !== 'deleted');
    const confirmed = folderTasks.length > 0
      ? window.confirm(`El cuaderno "${folder.name}" tiene ${folderTasks.length} tarea${folderTasks.length === 1 ? '' : 's'}. Si lo eliminas, esas tareas irán a la papelera. ¿Quieres continuar?`)
      : window.confirm(`¿Eliminar el cuaderno "${folder.name}"?`);

    if (!confirmed) return;

    toast.promise((async () => {
      for (const task of folderTasks) {
        await deleteTask.mutateAsync(task.id);
      }
      await deleteFolder.mutateAsync(folder.id);
      if (selectedFolderId === folder.id) setSelectedFolderId(null);
    })(), {
      loading: 'Eliminando cuaderno...',
      success: 'Cuaderno eliminado',
      error: 'No se pudo eliminar el cuaderno',
    });
  }, [allSearchTasks, deleteFolder, deleteTask, selectedFolderId]);

  const renderDailySearch = (compact = false) => (
    <div className={`relative z-30 ${compact ? 'px-2 pb-2 pt-0' : 'mb-2'}`}>
      <div className="flex h-11 items-center gap-2 rounded-[22px] border border-outline-variant/40 bg-white/40 px-3 shadow-none">
        <Search className="h-4 w-4 shrink-0 text-[#6f7480]/55" />
        <input
          value={mobileSearchQuery}
          onChange={(event) => setMobileSearchQuery(event.target.value)}
          placeholder="Buscar..."
          className="min-w-0 flex-1 bg-transparent text-[10px] font-semibold tracking-tight text-[#1f2633] outline-none placeholder:text-[#6f7480]/55"
        />
        {mobileSearchQuery && (
          <button
            type="button"
            onClick={() => setMobileSearchQuery('')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#6f7480]/60 transition active:scale-95"
            aria-label="Limpiar busqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {mobileSearchResults.length > 0 && (
        <div className="absolute left-2 right-2 top-[calc(100%+4px)] z-40 overflow-hidden rounded-3xl border border-black/8 bg-[#fffdf7] shadow-2xl shadow-black/18 md:left-0 md:right-0">
          {mobileSearchResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => openSearchResult(result)}
              className="flex w-full items-start gap-3 border-b border-black/6 px-4 py-3 text-left last:border-b-0 active:bg-black/5"
            >
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${result.kind === 'event' ? 'bg-emerald-500/75' : 'bg-primary/75'}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[#1f2633]">{result.title}</span>
                <span className="mt-0.5 block truncate text-[11px] font-bold text-[#6f7480]">
                  {result.subtitle}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderFolderTabs = (compact = false) => (
    <div className={`relative z-20 flex items-center gap-2 overflow-x-auto no-scrollbar ${compact ? 'py-2 pl-2 pr-3' : 'py-1 pb-1 mb-1 justify-start'}`}>
      <button
        onClick={() => {
          selectFolderWithSound(null);
          setShowFolderTabs((value) => !value);
        }}
        className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-tight transition-all md:px-4 ${
          selectedFolderId === null
            ? 'bg-foreground text-background border-foreground'
            : 'bg-white/40 text-on-surface-variant/80 border-outline-variant/40 hover:text-foreground hover:border-outline-variant/60'
        }`}
      >
        General {showFolderTabs ? '>' : '<'}
      </button>

      {showFolderTabs && visibleFolders.map((folder) => {
        const isSelected = selectedFolderId === folder.id;
        const taskCount = countFolderTasks(folder.id);
        return (
          <div key={folder.id} className="relative flex-shrink-0">
            <button
              onClick={() => selectFolderWithSound(isSelected ? null : folder.id)}
              className={`rounded-full border py-1.5 pl-3 text-[10px] font-semibold tracking-tight transition-all md:pl-4 ${
                folderManageMode && !folder.isShared ? 'pr-8' : 'pr-3 md:pr-4'
              } ${
                isSelected
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-white/40 text-on-surface-variant/80 border-outline-variant/40 hover:text-foreground hover:border-outline-variant/60'
              }`}
              title={taskCount > 0 ? `${taskCount} tarea${taskCount === 1 ? '' : 's'}` : undefined}
            >
              {folder.name}
            </button>
            {folderManageMode && !folder.isShared && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteFolder(folder);
                }}
                className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-error/12 text-error shadow-sm transition active:scale-90"
                aria-label={`Eliminar cuaderno ${folder.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={handleCreateFolder}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/14 text-primary shadow-sm shadow-primary/10 transition active:scale-95"
        aria-label="Crear cuaderno"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setFolderManageMode((value) => !value)}
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
          folderManageMode ? 'bg-foreground text-background shadow-sm' : 'bg-white/45 text-[#6f7480] shadow-sm'
        }`}
        aria-label="Gestionar cuadernos"
      >
        <Settings className="h-4 w-4" />
      </button>
    </div>
  );

 const handleComplete = useCallback(async (task: TaskLike, e: React.MouseEvent) => {
 e.stopPropagation();
 setCompletingTaskId(task.id);

 const isCurrentlyTiming = timerTask?.id === task.id;
 const finalDuration = isCurrentlyTiming? timerDurationRef.current: task.actual_duration_seconds;

 if (isCurrentlyTiming) {
 setTimerTask(null);
 }

 const currentTasks = tasksRef.current;
 const remainingTasks = currentTasks.filter((t: TaskLike) => t.status !== 'done' && t.id !== task.id);
 const isLastTask = currentTasks.length > 0 && remainingTasks.length === 0;

 const completionUpdate = {
 id: task.id,
 status: 'done',
 completed_at: new Date().toISOString(),
 ...(isCurrentlyTiming ? { actual_duration_seconds: Number(finalDuration) || 0 } : {}),
 };

 updateTask.mutate(completionUpdate, {
 onSuccess: () => {
 setCompletingTaskId(null);
 checkAndUnlock.mutate({ type: 'task_completed' });
 
 if (isLastTask) {
 triggerDailyCelebration(profileName);
 if (window.electronAPI) {
 window.electronAPI.showNotification(
 "¡Misión Cumplida!",
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
 "¡Estás en racha!",
 "Llevas 5 tareas completadas hoy. Sigue así.",
 'info'
 );
 }
 }
 },
 onError: () => setCompletingTaskId(null)
 });
 }, [timerTask, updateTask, checkAndUnlock, profileName]);

 const handleUncomplete = useCallback((task: TaskLike, e: React.MouseEvent) => {
 e.stopPropagation();
 updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
 }, [updateTask]);

 const handleStartTimer = useCallback((task: TaskLike, e: React.MouseEvent) => {
 e.stopPropagation();
 setTimerTask(task);
 }, []);

  const selectFolderWithSound = useCallback((folderId: string | null) => {
    playPageTurnSound();
    setSelectedFolderId(folderId);
  }, []);

  const turnNotebookPage = useCallback((direction: 1 | -1) => {
    setPageTurnDirection(direction);
  }, []);

 const goToPrevPage = useCallback(() => {
 turnNotebookPage(-1);
 }, [turnNotebookPage]);

  const goToNextPage = useCallback(() => {
  turnNotebookPage(1);
  }, [turnNotebookPage]);

  // Mobile notebook page swipe
  const notebookSwipeX = useRef<number | null>(null);
  const notebookSwipeY = useRef<number | null>(null);
  useEffect(() => {
    const el = document.querySelector('[data-daily-swipe]');
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      notebookSwipeX.current = e.touches[0].clientX;
      notebookSwipeY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (notebookSwipeX.current === null || notebookSwipeY.current === null) return;
      const dx = e.changedTouches[0].clientX - notebookSwipeX.current;
      const dy = e.changedTouches[0].clientY - notebookSwipeY.current;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx > 0) goToPrevPage();
        else goToNextPage();
      }
      notebookSwipeX.current = null;
      notebookSwipeY.current = null;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart, { capture: true });
      el.removeEventListener('touchend', onTouchEnd, { capture: true });
    };
  }, [goToPrevPage, goToNextPage]);

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
  <div className="min-h-screen text-foreground selection:bg-primary/20 md:bg-background">
    <div data-daily-swipe className="mx-auto w-full max-w-full px-0 pt-0 pb-0 md:max-w-[980px] md:px-6 md:pt-6 md:pb-8 relative">

 {showStats && (
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

  {/* Mini notebook button (outside notebook, top-right) */}
  <div className="hidden md:flex justify-end mb-2">
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

  {/* Desktop Task Notebook */}
  <motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="relative hidden min-h-[min(740px,calc(100vh-8rem))] w-full md:flex flex-col overflow-hidden rounded-[36px] notebook-cream-bg border border-black/[0.07] pt-3 pb-3 pl-24 pr-10 backdrop-blur-xl"
 style={{
 borderRadius: '36px 34px 38px 35px',
 }}
 >
 <div className="absolute inset-y-3 left-5 flex flex-col justify-between">
 {Array.from({ length: 18 }).map((_, ring) => (
 <span
 key={ring}
 className="notebook-ring-metallic h-3.5 w-12 rounded-full"
 />
 ))}
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
 className="relative z-10 flex min-h-0 flex-1 flex-col"
 style={{ transformOrigin: pageTurnDirection > 0? 'right center': 'left center', transformStyle: 'preserve-3d' }}
 >
  {shouldShowTaskPage ? (
    <>
      {/* Task notebook tabs */}
      <div className="relative z-10 mb-1">
        <h2 className="text-[18px] font-black tracking-normal" style={{ color: "#18202e" }}>
          Pendientes
        </h2>
        {renderDailySearch(false)}
      </div>
      {renderFolderTabs(false)}

      {/* Task List - Inside Desktop Notebook */}
      <div className="relative z-10 mt-1.5 min-h-0 flex-1 overflow-y-auto pb-5 pr-1 pt-[2px]">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[32px] border border-outline-variant/10 bg-surface-container-highest/20" />
            ))}
          </div>
        ) : isMainNotebookComplete ? (
          renderBlankNotebookPage(false)
        ) : visibleNotebookTasks.length > 0 ? (
          <>
            <div className="notebook-task-list">
              {visibleNotebookTasks.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  taskIdx={idx}
                  isDone={task.status === "done"}
                  completingTaskId={completingTaskId}
                  dragIdx={dragIdx}
                  handleDragStart={handleDragStart}
                  handleDragOver={handleDragOver}
                  handleDragEnd={handleDragEnd}
                  handleTouchStart={handleTouchStart}
                  handleTouchMove={handleTouchMove}
                  handleTouchEnd={handleTouchEnd}
                  handlePointerReorderStart={handlePointerReorderStart}
                  setSelectedTask={setSelectedTask}
                  handleComplete={handleComplete}
                  handleUncomplete={handleUncomplete}
                  handleStartTimer={handleStartTimer}
                  view="daily"
                  notebookView
                  highlighted={highlightedTaskId === task.id}
                />
              ))}
            </div>

            {upcomingTasksByDate.length > 0 && (
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowUpcomingDays((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant/10 bg-transparent px-1 py-0 text-left"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Siguientes d?as</span>
                  <span className="text-[11px] font-black text-on-surface-variant/40">{showUpcomingDays ? '<' : '>'}</span>
                </button>

                <AnimatePresence initial={false}>
                  {showUpcomingDays && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="space-y-4"
                    >
                      {upcomingTasksByDate.map((week) => (
                        <details key={week.key} open className="rounded-[18px] border border-outline-variant/10 bg-white/24 px-2 py-2">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-1 py-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/50">
                              {week.label}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant/30">
                              {week.days.length} d?
                            </span>
                          </summary>

                          <div className="space-y-3">
                            {week.days.map((day) => (
                              <details key={day.key} open className="rounded-[14px] border border-outline-variant/10 bg-white/30 px-2 py-2">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-1 py-1">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant/45">
                                    {day.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (day.date) {
                                        openTaskCapture(format(day.date, 'yyyy-MM-dd'));
                                      }
                                    }}
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-outline-variant/10 bg-white/65 text-[13px] font-black text-on-surface-variant/70 transition active:scale-95"
                                    title="Agregar tarea para este d?a"
                                    aria-label="Agregar tarea para este d?a"
                                  >
                                    +
                                  </button>
                                </summary>

                                <div className="notebook-task-list">
                                  {day.tasks.map((task) => (
                                    <TaskCard
                                      key={task.id}
                                      task={task}
                                      taskIdx={-1}
                                      isDone={task.status === "done"}
                                      completingTaskId={completingTaskId}
                                      dragIdx={null}
                                      handleDragStart={undefined}
                                      handleDragOver={undefined}
                                      handleDragEnd={undefined}
                                      handleTouchStart={undefined}
                                      handleTouchMove={undefined}
                                      handleTouchEnd={undefined}
                                      handlePointerReorderStart={undefined}
                                      setSelectedTask={setSelectedTask}
                                      handleComplete={handleComplete}
                                      handleUncomplete={handleUncomplete}
                                      handleStartTimer={handleStartTimer}
                                      view="daily"
                                      notebookView
                                      highlighted={highlightedTaskId === task.id}
                                    />
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        </details>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          renderBlankNotebookPage(false)
        )}
      </div>
    </>
  ) : (
    <div className="relative z-10">
      {renderBlankNotebookPage(false)}
    </div>
  )}
 </motion.div>
 </AnimatePresence>
 </motion.div>

  {/* Mini notebook button (outside mobile notebook) */}
  <div className="md:hidden flex justify-end mb-2">
    <button
      id="mini-window-btn-mobile"
      onClick={toggleMiniWidget}
      className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/16 bg-background/65 px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-on-surface-variant/60 shadow-sm transition-all active:scale-95"
    >
      <Monitor className="h-3 w-3" />
      Mini
    </button>
  </div>

  {/* Mobile Task Island - fixed full-screen notebook */}
  <motion.div 
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.08, ease: 'linear' }}
   className="fixed inset-x-0 bottom-[72px] top-14 z-30 md:hidden flex flex-col overflow-hidden notebook-cream-bg daily-mobile-notebook"
  >
  
  {renderDailySearch(true)}
  {renderFolderTabs(true)}
  
  <div className="hidden">
    <div className="flex items-center gap-0.5">
      <button
        onClick={goToPrevPage}
        disabled={notebookPage === 1}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant/30 hover:text-foreground hover:bg-black/5 transition-all disabled:opacity-20 disabled:pointer-events-none"
        aria-label="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
      </button>
      <span className="text-[10px] font-black tabular-nums text-on-surface-variant/30 mx-0.5 min-w-[28px] text-center">
        {notebookPage}/{NOTEBOOK_PAGE_COUNT}
      </span>
      <button
        onClick={goToNextPage}
        disabled={notebookPage >= NOTEBOOK_PAGE_COUNT}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant/30 hover:text-foreground hover:bg-black/5 transition-all disabled:opacity-20 disabled:pointer-events-none"
        aria-label="Página siguiente"
      >
        <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  </div>

  <div className="hidden">
    <div className="flex h-11 items-center gap-2 rounded-[22px] bg-[#f8efe1]/85 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_24px_rgba(87,67,31,0.12)] backdrop-blur-sm">
      <Search className="h-4 w-4 shrink-0 text-[#6f7480]/55" />
      <input
        value={mobileSearchQuery}
        onChange={(event) => setMobileSearchQuery(event.target.value)}
        placeholder="Buscar..."
        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#1f2633] outline-none placeholder:text-[#6f7480]/55"
      />
      {mobileSearchQuery && (
        <button
          type="button"
          onClick={() => setMobileSearchQuery('')}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#6f7480]/60 active:scale-95"
          aria-label="Limpiar busqueda"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>

    {mobileSearchResults.length > 0 && (
      <div className="absolute left-2 right-2 top-12 z-40 overflow-hidden rounded-3xl border border-black/8 bg-[#fffdf7] shadow-2xl shadow-black/18">
        {mobileSearchResults.map((result) => {
          return (
            <button
              key={result.id}
              type="button"
              onClick={() => openSearchResult(result)}
              className="flex w-full items-start gap-3 border-b border-black/6 px-4 py-3 text-left last:border-b-0 active:bg-black/5"
            >
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${result.kind === 'event' ? 'bg-emerald-500/75' : 'bg-primary/75'}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[#1f2633]">{result.title}</span>
                <span className="mt-0.5 block truncate text-[11px] font-bold text-[#6f7480]">
                  {result.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    )}
  </div>

  {/* Folder pills - scrollable row */}
  <div className="hidden">
     <button
       onClick={() => selectFolderWithSound(null)}
       className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide transition-all border ${
         selectedFolderId === null
           ? 'bg-foreground text-background border-foreground'
           : 'bg-white/40 text-on-surface-variant/80 border-outline-variant/40 hover:text-foreground hover:border-outline-variant/60'
       }`}
      >
        General
      </button>
    {folders.map((folder) => {
      const isSelected = selectedFolderId === folder.id;
      return (
        <button
          key={folder.id}
          onClick={() => selectFolderWithSound(isSelected ? null : folder.id)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide transition-all border notebook-handwriting ${
            isSelected
              ? 'bg-foreground text-background border-foreground'
              : 'bg-white/40 text-on-surface-variant/80 border-outline-variant/40 hover:text-foreground hover:border-outline-variant/60'
          }`}
        >
          {folder.name}
        </button>
      );
    })}
  </div>

  {/* Task content with swipe */}
   <div className="relative z-10 flex-1 overflow-y-auto">
  <AnimatePresence mode="wait" custom={pageTurnDirection}>
  <motion.div
  key={`mobile-page-${notebookPage}`}
  custom={pageTurnDirection}
  variants={pageTurnVariants}
  initial="enter"
  animate="center"
  exit="exit"
  transition={{ duration: 0.08, ease: 'linear' }}
  className="flex flex-col min-h-full"
  style={{ transformOrigin: pageTurnDirection > 0? 'right center': 'left center', transformStyle: 'preserve-3d' }}
  >
  {shouldShowTaskPage? (
  <>
  {/* Mobile Task List */}
   <div
   className="flex flex-col flex-1"
  >
  {isLoading? (
  <div className="space-y-4 pl-2 pr-4 py-2">
  {[1, 2, 3].map((i) => (
  <div key={i} className="h-20 bg-surface-container-highest/10 border border-outline-variant/10 rounded-2xl animate-pulse" />
  ))}
  </div>
    ): isMainNotebookComplete ? (
  renderBlankNotebookPage(true)
  ): visibleNotebookTasks.length > 0? (
  <>
   <div className="notebook-task-list ml-0 mr-3 my-1">
   {visibleNotebookTasks.map((task, idx) => (
   <TaskCard
   key={task.id}
   task={task}
   taskIdx={idx}
   isDone={task.status === 'done'}
   completingTaskId={completingTaskId}
   dragIdx={dragIdx}
   handleDragStart={handleDragStart}
   handleDragOver={handleDragOver}
   handleDragEnd={handleDragEnd}
   handleTouchStart={handleTouchStart}
   handleTouchMove={handleTouchMove}
   handleTouchEnd={handleTouchEnd}
   handlePointerReorderStart={handlePointerReorderStart}
   setSelectedTask={setSelectedTask}
   handleComplete={handleComplete}
   handleUncomplete={handleUncomplete}
  handleStartTimer={handleStartTimer}
  view="daily"
  notebookView
  highlighted={highlightedTaskId === task.id}
  />
  ))}
    </div>
    {upcomingTasksByDate.length > 0 && (
      <div className="mx-3 mt-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowUpcomingDays((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border border-outline-variant/10 bg-transparent px-1 py-0 text-left"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Siguientes días</span>
          <span className="text-[11px] font-black text-on-surface-variant/40">{showUpcomingDays ? '<' : '>'}</span>
        </button>

        <AnimatePresence initial={false}>
          {showUpcomingDays && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="space-y-4"
            >
              {upcomingTasksByDate.map((week) => (
                <details key={week.key} open className="rounded-[18px] border border-outline-variant/10 bg-white/24 px-2 py-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-1 py-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/50">
                      {week.label}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant/30">
                      {week.days.length} días
                    </span>
                  </summary>

                  <div className="space-y-3">
                    {week.days.map((day) => (
                      <details key={day.key} open className="rounded-[14px] border border-outline-variant/10 bg-white/30 px-2 py-2">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-1 py-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant/45">
                            {day.label}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (day.date) {
                                openTaskCapture(format(day.date, 'yyyy-MM-dd'));
                              }
                            }}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-outline-variant/10 bg-white/65 text-[13px] font-black text-on-surface-variant/70 transition active:scale-95"
                            title="Agregar tarea para este día"
                            aria-label="Agregar tarea para este día"
                          >
                            +
                          </button>
                        </summary>

                        <div className="notebook-task-list">
                          {day.tasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              taskIdx={-1}
                              isDone={task.status === 'done'}
                              completingTaskId={completingTaskId}
                              dragIdx={null}
                              handleDragStart={undefined}
                              handleDragOver={undefined}
                              handleDragEnd={undefined}
                              handleTouchStart={undefined}
                              handleTouchMove={undefined}
                              handleTouchEnd={undefined}
                              handlePointerReorderStart={undefined}
                              setSelectedTask={setSelectedTask}
                              handleComplete={handleComplete}
                              handleUncomplete={handleUncomplete}
                              handleStartTimer={handleStartTimer}
                              view="daily"
                              notebookView
                              highlighted={highlightedTaskId === task.id}
                            />
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )}
    </>
    ): (
    <>
    <div className="flex-1" />
    </>
    )}
  </div>
    {!isMainNotebookComplete && visibleNotebookTasks.length === 0 && (
    renderBlankNotebookPage(true)
    )}
  </>
  ): (
  <div>
  {renderBlankNotebookPage(true)}
  </div>
  )}
  </motion.div>
  </AnimatePresence>
  </div>
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
 className="w-full h-14 bg-foreground text-background font-black text-base rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
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
