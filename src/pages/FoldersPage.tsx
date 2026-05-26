import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFolders } from '@/hooks/useFolders';
import { useTasks } from '@/hooks/useTasks';
import { useFriendships } from '@/hooks/useFriendships';
import { useFolderShares } from '@/hooks/useFolderShares';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Notebook, Plus, ChevronRight, ChevronLeft, Users, Trash2, Check, Clock, Edit2, ArrowLeft, Share2, Settings, Sparkles, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { TaskCard } from '@/components/TaskCard';
import { toast } from 'sonner';
import { triggerTaskCelebration } from '@/lib/celebrations';
import { dispatchTutorialFolderCreated } from '@/lib/tutorialEvents';
import { usePriorityColors, getPriorityKey } from '@/hooks/usePriorityColors';
import { compareTasksWithinQuadrants, getTaskManualOrderGroupKey } from '@/lib/taskOrdering';
import { playPageTurnSound } from '@/lib/soundEffects';
import { QuickNotebookTaskAdd } from '@/components/QuickNotebookTaskAdd';

const FOLDER_COLORS = ['#5B7CFA', '#4F6EE8', '#6FCF97', '#F4B860', '#EB5757', '#7C97FF', '#9CA3AF', '#E5E7EB'];

const FoldersPage = () => {
  const { folders, createFolder, updateFolder, deleteFolder, isLoading } = useFolders();
  const { tasks, updateTask } = useTasks();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { friends: acceptedFriendships } = useFriendships();
  const { priorityColors } = usePriorityColors();
  
  const [friendProfiles, setFriendProfiles] = useState<{ user_id: string; name: string | null; email: string | null }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [sharingFolder, setSharingFolder] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [inlineName, setInlineName] = useState('');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const timerDurationRef = useRef(0);

  const handleSelectFolder = (id: string | null) => {
    playPageTurnSound();
    setSelectedFolder(id);
  };

  const { shares, shareWithFriend, removeShare } = useFolderShares(sharingFolder || selectedFolder || undefined);

  const handleCreate = () => {
    if (!newName.trim()) { toast.error('Escribe un nombre'); return; }
    createFolder.mutate(
      { name: newName.trim(), color: newColor },
      {
        onSuccess: () => {
          setNewName('');
          setNewColor(FOLDER_COLORS[0]);
          setShowCreate(false);
          dispatchTutorialFolderCreated();
          toast.success('Cuaderno creado con éxito');
        },
        onError: () => toast.error('Error al crear cuaderno'),
      }
    );
  };

  const handleSaveInline = () => {
    const trimmed = inlineName.trim();
    if (!trimmed) {
      setIsCreatingInline(false);
      setInlineName('');
      return;
    }
    createFolder.mutate(
      { name: trimmed, color: '#A8A29E' },
      {
        onSuccess: () => {
          setInlineName('');
          setIsCreatingInline(false);
          dispatchTutorialFolderCreated();
          toast.success('Cuaderno creado con éxito');
        },
        onError: () => {
          toast.error('Error al crear cuaderno');
          setInlineName('');
          setIsCreatingInline(false);
        },
      }
    );
  };

  const handleCancelInline = () => {
    setInlineName('');
    setIsCreatingInline(false);
  };

  const handleUpdate = (id: string) => {
    if (!newName.trim()) { toast.error('Escribe un nombre'); return; }
    updateFolder.mutate({ id, name: newName.trim(), color: newColor });
    setEditingFolder(null);
    setNewName('');
    toast.success('Cuaderno actualizado');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cuaderno y todas sus tareas?')) {
      deleteFolder.mutate(id);
      if (selectedFolder === id) handleSelectFolder(null);
      toast.success('Cuaderno eliminado');
    }
  };

  const friendUserIds = acceptedFriendships.map((f: any) => 
    f.requester_id === user?.id ? f.addressee_id : f.requester_id
  );

  useEffect(() => {
    if (friendUserIds.length === 0) { setFriendProfiles([]); return; }
    supabase.from('profiles').select('user_id, name, email')
      .in('user_id', friendUserIds)
      .then(({ data }) => setFriendProfiles(data || []));
  }, [JSON.stringify(friendUserIds)]);

  const sharedWithIds = shares.map((s: any) => s.shared_with_id);
  const isUncategorized = selectedFolder === '__uncategorized__';
  const currentFolder = isUncategorized
    ? { id: '__uncategorized__', name: 'Hoy', color: '#A8A29E' }
    : folders.find((f) => f.id === selectedFolder);
  const folderTasks = useMemo(() => {
    const raw = isUncategorized
      ? tasks.filter((t) => t.folder_id === null || t.folder_id === undefined)
      : selectedFolder ? tasks.filter((t) => t.folder_id === selectedFolder) : [];
    return [...raw].sort(compareTasksWithinQuadrants);
  }, [tasks, selectedFolder, isUncategorized]);

  const taskSearchResults = useMemo(() => {
    const query = taskSearchQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return tasks
      .filter((task: any) => (task.title || '').toLowerCase().includes(query))
      .sort(compareTasksWithinQuadrants)
      .slice(0, 8);
  }, [tasks, taskSearchQuery]);

  const jumpToFolderTask = useCallback((task: any) => {
    const folderId = task.folder_id || null;
    setSelectedFolder(folderId);
    setTaskSearchQuery('');
    window.setTimeout(() => {
      const el = document.querySelector(`[data-task-id="${task.id}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 200);
  }, []);

  const [orderedFolderTasks, setOrderedFolderTasks] = useState<any[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const orderedFolderTasksRef = useRef<any[]>([]);
  const suppressOrderSyncRef = useRef(false);
  const suppressOrderSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (suppressOrderSyncRef.current) return;
    setOrderedFolderTasks(folderTasks);
    orderedFolderTasksRef.current = folderTasks;
    dragIdxRef.current = null;
    setDragIdx(null);
  }, [folderTasks]);

  useEffect(() => {
    orderedFolderTasksRef.current = orderedFolderTasks;
  }, [orderedFolderTasks]);

  useEffect(() => {
    return () => {
      if (suppressOrderSyncTimerRef.current) window.clearTimeout(suppressOrderSyncTimerRef.current);
    };
  }, []);

  const persistVisibleOrder = useCallback((nextOrder: any[]) => {
    nextOrder.forEach((task, idx) => {
      if ((task.sort_order ?? 0) !== idx) {
        updateTask.mutate({ id: task.id, sort_order: idx });
      }
    });
  }, [updateTask]);

  const moveReorderToPoint = useCallback((clientX: number, clientY: number) => {
    const currentDragIdx = dragIdxRef.current;
    if (currentDragIdx === null) return;
    const currentOrder = orderedFolderTasksRef.current;
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
    orderedFolderTasksRef.current = next;
    dragIdxRef.current = targetIdx;
    setOrderedFolderTasks(next);
    setDragIdx(targetIdx);
  }, []);

  const finishPointerReorder = useCallback(() => {
    const currentDragIdx = dragIdxRef.current;
    if (currentDragIdx !== null) {
      const finalOrder = orderedFolderTasksRef.current;
      persistVisibleOrder(finalOrder);
      const optimisticOrder = finalOrder.map((task, idx) => ({ ...task, sort_order: idx }));
      orderedFolderTasksRef.current = optimisticOrder;
      setOrderedFolderTasks(optimisticOrder);
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
    const task = orderedFolderTasksRef.current[idx];
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
  }, [orderedFolderTasks]);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const currentDragIdx = dragIdxRef.current ?? dragIdx;
    if (currentDragIdx === null || currentDragIdx === idx) return;
    const dragged = orderedFolderTasks[currentDragIdx];
    const target = orderedFolderTasks[idx];
    if (!dragged || !target) return;
    if (getTaskManualOrderGroupKey(dragged) !== getTaskManualOrderGroupKey(target)) return;

    const next = [...orderedFolderTasks];
    const [moved] = next.splice(currentDragIdx, 1);
    next.splice(idx, 0, moved);
    dragIdxRef.current = idx;
    setOrderedFolderTasks(next);
    setDragIdx(idx);
  }, [dragIdx, orderedFolderTasks]);

  const handleDragEnd = useCallback(() => {
    if ((dragIdxRef.current ?? dragIdx) !== null) persistVisibleOrder(orderedFolderTasks);
    dragIdxRef.current = null;
    setDragIdx(null);
  }, [dragIdx, orderedFolderTasks, persistVisibleOrder]);

  const handleTouchStart = useCallback((idx: number, e: React.TouchEvent) => {
    e.stopPropagation();
    dragIdxRef.current = idx;
    setDragIdx(idx);
  }, [orderedFolderTasks]);

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

    const dragged = orderedFolderTasks[currentDragIdx];
    const target = orderedFolderTasks[idx];
    if (!dragged || !target) return;
    if (getTaskManualOrderGroupKey(dragged) !== getTaskManualOrderGroupKey(target)) return;

    const next = [...orderedFolderTasks];
    const [moved] = next.splice(currentDragIdx, 1);
    next.splice(idx, 0, moved);
    dragIdxRef.current = idx;
    setOrderedFolderTasks(next);
    setDragIdx(idx);
  }, [dragIdx, orderedFolderTasks]);

  const handleTouchEnd = useCallback(() => {
    if ((dragIdxRef.current ?? dragIdx) !== null) persistVisibleOrder(orderedFolderTasks);
    dragIdxRef.current = null;
    setDragIdx(null);
  }, [dragIdx, orderedFolderTasks, persistVisibleOrder]);

  const completedCount = orderedFolderTasks.filter(t => t.status === 'done').length;

  const [folderPage, setFolderPage] = useState(1);
  const [folderPageDir, setFolderPageDir] = useState(1);
  const [folderPagePeel, setFolderPagePeel] = useState<'next' | 'prev' | null>(null);

  useEffect(() => {
    setFolderPage(1);
  }, [selectedFolder]);

  const FOLDER_TASKS_PER_PAGE = 10;
  const folderTotalPages = Math.max(1, Math.ceil(orderedFolderTasks.length / FOLDER_TASKS_PER_PAGE));

  useEffect(() => {
    if (folderPage > folderTotalPages) {
      setFolderPage(Math.max(1, folderTotalPages));
    }
  }, [folderTotalPages, folderPage]);

  const visibleFolderTasks = useMemo(() => {
    const start = (folderPage - 1) * FOLDER_TASKS_PER_PAGE;
    return orderedFolderTasks.slice(start, start + FOLDER_TASKS_PER_PAGE);
  }, [folderPage, orderedFolderTasks]);

  const turnFolderPage = (dir: 1 | -1) => {
    setFolderPageDir(dir);
    setFolderPage(p => {
      const next = Math.min(folderTotalPages, Math.max(1, p + dir));
      if (next !== p) playPageTurnSound();
      return next;
    });
  };

  const pageTurnVariants = {
    enter: (direction: number) => ({
      opacity: 0,
      rotateY: direction > 0 ? -8 : 8,
      x: direction > 0 ? 10 : -10,
    }),
    center: {
      opacity: 1,
      rotateY: 0,
      x: 0,
    },
    exit: (direction: number) => ({
      opacity: 0,
      rotateY: direction > 0 ? 10 : -10,
      x: direction > 0 ? -12 : 12,
    }),
  };

  const handleComplete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletingTaskId(task.id);
    const isCurrentlyTiming = timerTask?.id === task.id;
    const finalDuration = isCurrentlyTiming ? timerDurationRef.current : task.actual_duration_seconds;

    if (isCurrentlyTiming) setTimerTask(null);

    updateTask.mutate({ 
      id: task.id, 
      status: 'done', 
      completed_at: new Date().toISOString(),
      actual_duration_seconds: Number(finalDuration) || 0
    }, {
      onSuccess: () => {
        setCompletingTaskId(null);
        triggerTaskCelebration(task.title, profile?.name);
      },
      onError: () => setCompletingTaskId(null)
    });
  };

  const handleUncomplete = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
  };

  const handleStartTimer = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerTask(task);
  };

  const renderFolderModal = (isEditing: boolean) => {
    return (
      <AnimatePresence>
        {(showCreate || editingFolder) && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
              onClick={() => { setShowCreate(false); setEditingFolder(null); }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-[20%] lg:inset-x-0 lg:w-[450px] lg:mx-auto z-[9999] bg-surface p-8 rounded-[40px] border border-outline-variant/30 shadow-2xl space-y-8"
            >
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black font-headline tracking-tight">
                  {editingFolder ? 'Editar Cuaderno' : 'Nuevo Cuaderno'}
                </h2>
                <p className="text-sm text-on-surface-variant/60">
                  {editingFolder ? 'Ajusta los detalles de tu espacio.' : 'Crea un espacio dedicado para tus metas.'}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">Nombre</p>
                  <input 
                    autoFocus 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: Lanzamiento, Salud..."
                    className="w-full bg-surface-container rounded-[24px] px-6 py-4 text-foreground font-black text-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && (editingFolder ? handleUpdate(editingFolder) : handleCreate())} 
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">Color</p>
                  <div className="grid grid-cols-4 gap-3">
                    {FOLDER_COLORS.map((c) => (
                      <button 
                        key={c} 
                        onClick={() => setNewColor(c)}
                        className={`h-12 rounded-2xl transition-all relative flex items-center justify-center ${newColor === c ? 'ring-2 ring-primary ring-offset-4 ring-offset-surface scale-90' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      >
                        {newColor === c && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => { setShowCreate(false); setEditingFolder(null); }} 
                    className="flex-1 py-4 rounded-[20px] bg-surface-container text-on-surface-variant font-black text-sm hover:bg-surface-container-high transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => editingFolder ? handleUpdate(editingFolder) : handleCreate()} 
                    className="flex-[1.5] py-4 rounded-[20px] bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/20"
                  >
                    {editingFolder ? 'Guardar' : 'Crear Cuaderno'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  };

  const renderSharingModal = () => {
    if (!sharingFolder) return null;
    const folder = folders.find(f => f.id === sharingFolder);
    if (!folder) return null;

    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
          onClick={() => setSharingFolder(null)} 
        />
        <motion.div
          initial={{ y: '100%', opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: '100%', opacity: 0 }}
          className="fixed inset-x-0 bottom-0 z-[9999] lg:inset-x-0 lg:w-[450px] lg:mx-auto lg:top-[20%] lg:bottom-auto bg-surface p-8 rounded-t-[40px] lg:rounded-[40px] border border-outline-variant/30 shadow-2xl space-y-8"
        >
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-black font-headline tracking-tight">Compartir</h2>
              <p className="text-xs text-on-surface-variant/60">Gestiona accesos al cuaderno.</p>
            </div>
            <button onClick={() => setSharingFolder(null)} className="p-2 rounded-full hover:bg-surface-container transition-colors">
              <X className="w-5 h-5 opacity-40" />
            </button>
          </div>

          <div className="space-y-6">
            {shares.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Miembros actuales</p>
                <div className="space-y-2">
                  {shares.map((share: any) => {
                    const friendProfile = friendProfiles.find(p => p.user_id === share.shared_with_id);
                    return (
                      <div key={share.id} className="flex items-center justify-between p-4 rounded-3xl bg-surface-container/50 border border-outline-variant/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                            {(friendProfile?.name || friendProfile?.email || 'A')[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-black truncate max-w-[150px]">{friendProfile?.name || friendProfile?.email}</span>
                        </div>
                        <button 
                          onClick={() => removeShare.mutate(share.id)} 
                          className="text-[10px] font-black uppercase text-red-500/60 hover:text-red-500 transition-colors"
                        >
                          Quitar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Añadir amigos</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                {friendProfiles
                  .filter(p => !sharedWithIds.includes(p.user_id))
                  .map((profile) => (
                    <button 
                      key={profile.user_id} 
                      onClick={() => shareWithFriend.mutate({ folderId: sharingFolder, friendId: profile.user_id })}
                      className="w-full flex items-center justify-between p-4 rounded-3xl bg-surface-container/30 border border-outline-variant/10 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-black">
                          {(profile?.name || profile?.email || 'A')[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-black">{profile.name || profile.email}</span>
                      </div>
                      <Plus className="w-4 h-4 text-primary opacity-40 group-hover:opacity-100" />
                    </button>
                  ))}
                {friendProfiles.length === 0 && (
                  <p className="text-center py-8 text-xs text-on-surface-variant/40 italic">No tienes amigos para invitar.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 pb-32">
      <AnimatePresence mode="wait">
        {!selectedFolder ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-[430px] lg:max-w-6xl mx-auto px-6 pt-12 space-y-12"
          >
            {/* Header Section */}
            <div id="folders-header" className="flex flex-col items-center justify-center pt-8 pb-4">
              <h1 className="page-title text-center text-4xl md:text-5xl font-black font-headline !pl-0">
                Cuadernos
              </h1>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md mx-auto w-full -mt-4 mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant/45" />
              <input
                value={taskSearchQuery}
                onChange={(event) => setTaskSearchQuery(event.target.value)}
                placeholder="Buscar tareas en todos los cuadernos..."
                className="h-9 w-full rounded-full border border-outline-variant/20 bg-surface-container-low pl-9 pr-9 text-[12px] font-semibold text-foreground outline-none transition focus:border-primary/35 focus:bg-surface-container"
              />
              {taskSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTaskSearchQuery('')}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant/45 hover:bg-black/5 hover:text-foreground"
                  aria-label="Limpiar busqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {taskSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-outline-variant/16 bg-background/95 shadow-xl backdrop-blur-xl">
                  {taskSearchResults.map((task: any) => {
                    const folder = folders.find((item: any) => item.id === task.folder_id);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => jumpToFolderTask(task)}
                        className="block w-full border-b border-outline-variant/8 px-4 py-2.5 text-left last:border-b-0 hover:bg-primary/8"
                      >
                        <span className="block truncate text-[12px] font-bold text-foreground">{task.title}</span>
                        <span className="mt-0.5 block text-[9px] font-black uppercase tracking-[0.12em] text-primary/70">{folder?.name || 'Hoy'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Folders Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 rounded-[32px] bg-surface-container/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Virtual: Hoy (tareas sin cuaderno) */}
                {tasks.filter(t => !t.folder_id).length > 0 && (
                  <motion.div
                    onClick={() => handleSelectFolder('__uncategorized__')}
                    whileHover={{ y: -6, rotate: 0, scale: 1.02 }}
                    initial={{ rotate: -1.2 }}
                    className="group cursor-pointer relative min-h-[220px]"
                  >
                    <div className="absolute inset-x-5 -bottom-3 h-8 rounded-[50%] opacity-30 blur-xl -z-10 bg-[#A8A29E]/20" />
                    <div className="relative overflow-hidden bg-white dark:bg-white border border-zinc-200/80 rounded-[24px] p-6 pl-12 min-h-[220px] h-full flex flex-col justify-between transition-all shadow-[0_12px_28px_rgba(0,0,0,0.08)] group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.12)] text-zinc-950">
                      {/* Spine */}
                      <div className="absolute inset-y-0 left-0 w-6 rounded-l-[23px] z-20 shadow-[inset_-3px_0_6px_rgba(0,0,0,0.1)] bg-[#A8A29E]" />
                      {/* Rings */}
                      <div className="absolute left-[18px] inset-y-4 w-2 flex flex-col justify-between items-center z-30 pointer-events-none opacity-40">
                        {[1, 2, 3, 4, 5].map((key) => (
                          <div key={key} className="w-1.5 h-1.5 rounded-full bg-zinc-400 border border-zinc-300 shadow-inner" />
                        ))}
                      </div>
                      <div className="relative z-10 my-auto">
                        <h3 className="text-2xl font-bold tracking-tight text-zinc-800 notebook-handwriting leading-tight group-hover:text-primary transition-colors">
                          Hoy
                        </h3>
                      </div>
                      <div className="relative z-10 flex items-center justify-end pt-4 border-t border-zinc-100/60">
                        <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                )}
                {folders.map((folder, index) => {
                  const angle = index % 3 === 0 ? 1.5 : index % 3 === 1 ? -1.2 : 0.8;
                  return (
                    <motion.div
                      key={folder.id}
                      layoutId={folder.id}
                      onClick={() => handleSelectFolder(folder.id)}
                      whileHover={{ y: -6, rotate: 0, scale: 1.02 }}
                      initial={{ rotate: angle }}
                      className="group cursor-pointer relative min-h-[220px]"
                    >
                      <div 
                        className="absolute inset-x-5 -bottom-3 h-8 rounded-[50%] opacity-30 blur-xl -z-10"
                        style={{ backgroundColor: '#A8A29E20' }}
                      />
                      <div className="relative overflow-hidden bg-white dark:bg-white border border-zinc-200/80 rounded-[24px] p-6 pl-12 min-h-[220px] h-full flex flex-col justify-between transition-all shadow-[0_12px_28px_rgba(0,0,0,0.08)] group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.12)] text-zinc-950">
                        {/* Spine */}
                        <div className="absolute inset-y-0 left-0 w-6 rounded-l-[23px] z-20 shadow-[inset_-3px_0_6px_rgba(0,0,0,0.1)] bg-[#A8A29E]" />
                        {/* Rings */}
                        <div className="absolute left-[18px] inset-y-4 w-2 flex flex-col justify-between items-center z-30 pointer-events-none opacity-40">
                          {[1, 2, 3, 4, 5].map((key) => (
                            <div key={key} className="w-1.5 h-1.5 rounded-full bg-zinc-400 border border-zinc-300 shadow-inner" />
                          ))}
                        </div>
                        <div className="relative z-10 my-auto">
                          <h3 className="text-2xl font-bold tracking-tight text-zinc-800 notebook-handwriting leading-tight group-hover:text-primary transition-colors">
                            {folder.name}
                          </h3>
                        </div>
                        <div className="relative z-10 flex items-center justify-end pt-4 border-t border-zinc-100/60">
                          <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                
                {/* Subtle Add Folder Slot — inline creator */}
                {isCreatingInline ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative min-h-[140px] flex rounded-[24px] overflow-hidden border border-outline-variant/20 shadow-sm bg-surface/80"
                  >
                    {/* Spine */}
                    <div className="w-8 shrink-0 rounded-l-[24px] flex items-center justify-center" style={{ backgroundColor: '#A8A29E' }} />
                    {/* Body */}
                    <div className="flex-1 flex flex-col items-start justify-center px-5 py-4 gap-2">
                      <input
                        autoFocus
                        value={inlineName}
                        onChange={(e) => setInlineName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleSaveInline(); }
                          if (e.key === 'Escape') handleCancelInline();
                        }}
                        onBlur={handleSaveInline}
                        placeholder="Nombre del cuaderno…"
                        className="w-full bg-transparent border-none outline-none text-sm font-black text-foreground placeholder:text-on-surface-variant/30 notebook-handwriting"
                      />
                      <span className="text-[10px] text-on-surface-variant/30 uppercase tracking-widest font-bold">Enter para guardar · Esc para cancelar</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    onClick={() => setIsCreatingInline(true)}
                    whileHover={{ y: -3 }}
                    className="group cursor-pointer relative min-h-[140px] flex items-center justify-center border border-dashed border-outline-variant/25 hover:border-outline-variant/50 rounded-[24px] hover:bg-surface-container/10 transition-all duration-200"
                  >
                    <Plus className="w-5 h-5 text-on-surface-variant/30 group-hover:text-on-surface-variant/60 transition-colors" />
                  </motion.div>
                )}
                {folders.length === 0 && !isCreatingInline && (
                  <div className="col-span-full py-20 bg-surface/30 border border-dashed border-outline-variant rounded-[40px] text-center">
                    <p className="text-on-surface-variant/40 font-black uppercase tracking-[0.2em] text-xs">Sin cuadernos activos</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-background"
          >
            {/* Project Header Area */}
            <div 
              className="w-full h-56 md:h-72 relative overflow-hidden flex items-end p-8 md:p-12"
              style={{ background: `linear-gradient(135deg, ${currentFolder?.color}34, transparent 58%), var(--background)` }}
            >
              <div className="absolute top-8 left-8 z-20">
                <motion.button
                  whileHover={{ x: -4 }}
                  onClick={() => handleSelectFolder(null)}
                  className="p-3 rounded-2xl bg-surface/80 backdrop-blur-md border border-outline-variant/30 shadow-sm flex items-center gap-2 group"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest hidden md:inline">Cuadernos</span>
                </motion.button>
              </div>

              <div className="absolute top-8 right-8 flex gap-2 z-20">
                <button 
                  onClick={(e) => { e.stopPropagation(); setSharingFolder(currentFolder?.id || null); }}
                  className={`p-3 rounded-2xl bg-surface/80 backdrop-blur-md border border-outline-variant/30 shadow-sm transition-colors ${shares.length > 0 ? 'text-primary' : 'text-on-surface-variant/40 hover:text-foreground'}`}
                >
                  <Users className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingFolder(currentFolder?.id || null); setNewName(currentFolder?.name || ''); setNewColor(currentFolder?.color || FOLDER_COLORS[0]); }}
                  className="p-3 rounded-2xl bg-surface/80 backdrop-blur-md border border-outline-variant/30 shadow-sm hover:text-primary transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(currentFolder?.id || ''); }}
                  className="p-3 rounded-2xl bg-surface/80 backdrop-blur-md border border-outline-variant/30 shadow-sm hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="max-w-[430px] lg:max-w-4xl mx-auto w-full relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                  <h1 className="page-title leading-none">
                    {currentFolder?.name}
                  </h1>
                </div>
              </div>

              {/* Decorative background accent */}
              <div 
                className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[100px] opacity-10 pointer-events-none"
                style={{ backgroundColor: currentFolder?.color }}
              />
            </div>

            {/* Project Tasks Area — Lined paper notebook style */}
            <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 py-6 hidden md:block">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative min-h-[540px] w-full flex flex-col overflow-hidden rounded-[36px] notebook-cream-bg border border-outline-variant/12 py-6 pl-24 pr-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] backdrop-blur-xl"
                style={{
                  backgroundImage: 'radial-gradient(circle at 18% 22%, rgba(255,255,255,0.09) 0 1px, transparent 1.6px), radial-gradient(circle at 73% 58%, rgba(0,0,0,0.05) 0 1px, transparent 1.7px), radial-gradient(circle at 42% 76%, rgba(255,255,255,0.045) 0 1px, transparent 1.8px), linear-gradient(90deg, transparent 0 70px, rgba(235,120,120,0.26) 70px 71px, transparent 71px calc(100% - 46px), rgba(235,120,120,0.18) calc(100% - 46px) calc(100% - 45px), transparent calc(100% - 45px))',
                  backgroundPosition: '0 18px',
                  borderRadius: '36px 34px 38px 35px',
                }}
              >
                <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/[0.035] to-transparent pointer-events-none" />
                <div className="pointer-events-none absolute bottom-5 right-0 top-5 w-10">
                  {[0, 1, 2, 3].map((page) => (
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
                <div className="absolute inset-y-3 left-5 flex flex-col justify-between py-2">
                  {Array.from({ length: 14 }).map((_, ring) => (
                    <span
                      key={ring}
                      className="h-3 w-10 rounded-full border-2 border-[#A8A29E]/40 bg-[#A8A29E]/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.12)]"
                    />
                  ))}
                </div>

                <div className="relative z-10 mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-bold font-headline tracking-tight notebook-handwriting text-foreground/80 flex items-center gap-2">
                    Tareas del cuaderno
                  </h2>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('adonai:open-capture', { detail: { folderId: isUncategorized ? undefined : (selectedFolder || undefined) } }))}
                    className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <AnimatePresence mode="wait" custom={folderPageDir}>
                  <motion.div
                    key={`folder-desktop-page-${folderPage}`}
                    custom={folderPageDir}
                    variants={pageTurnVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 flex flex-1 flex-col justify-between"
                    style={{ transformOrigin: folderPageDir > 0 ? 'right center' : 'left center', transformStyle: 'preserve-3d' }}
                  >
                    <div
                      className="relative z-10 mt-2 pb-4 pt-[2px] flex-1"
                    >
                      {visibleFolderTasks.length > 0 ? (
                        <div className="notebook-task-list">
                          {visibleFolderTasks.map((task, idx) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              taskIdx={(folderPage - 1) * FOLDER_TASKS_PER_PAGE + idx}
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
                            />
                          ))}
                        </div>
                      ) : null}
                      {folderPage === folderTotalPages && (
                        <QuickNotebookTaskAdd
                          folderId={isUncategorized ? null : selectedFolder}
                          folderName={currentFolder?.name || 'Hoy'}
                        />
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Drag handles for page turn */}
                <motion.div
                  role="button"
                  aria-label="Arrastrar para volver la pagina"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.28}
                  onDragStart={() => setFolderPagePeel('prev')}
                  onDragEnd={(_, info) => {
                    setFolderPagePeel(null);
                    if (info.offset.x > 34 || info.velocity.x > 260) turnFolderPage(-1);
                  }}
                  className="cursor-hand group absolute left-0 z-40 top-20 bottom-12 w-14"
                >
                  <div className={`absolute left-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-r-2xl border border-l-0 border-outline-variant/18 bg-background/45 shadow-sm backdrop-blur-sm transition-opacity h-20 w-5 ${folderPage === 1 ? 'opacity-25' : 'opacity-70 group-hover:opacity-100'}`}>
                    <div className="space-y-1">
                      <span className="block h-4 w-px rounded-full bg-on-surface-variant/30" />
                      <span className="block h-4 w-px rounded-full bg-on-surface-variant/20" />
                      <span className="block h-4 w-px rounded-full bg-on-surface-variant/30" />
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  role="button"
                  aria-label="Arrastrar para pasar la pagina"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.28}
                  onDragStart={() => setFolderPagePeel('next')}
                  onDragEnd={(_, info) => {
                    setFolderPagePeel(null);
                    if (info.offset.x < -34 || info.velocity.x < -260) turnFolderPage(1);
                  }}
                  className="cursor-hand group absolute right-0 z-40 top-20 bottom-12 w-14"
                >
                  <div className={`absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-outline-variant/18 bg-background/45 shadow-sm backdrop-blur-sm transition-opacity h-20 w-5 ${folderPage === folderTotalPages ? 'opacity-25' : 'opacity-70 group-hover:opacity-100'}`}>
                    <div className="space-y-1">
                      <span className="block h-4 w-px rounded-full bg-on-surface-variant/30" />
                      <span className="block h-4 w-px rounded-full bg-on-surface-variant/20" />
                      <span className="block h-4 w-px rounded-full bg-on-surface-variant/30" />
                    </div>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {folderPagePeel && (
                    <motion.div
                      key={folderPagePeel}
                      initial={{ opacity: 0, scaleX: 0.12, skewY: folderPagePeel === 'next' ? -4 : 4 }}
                      animate={{ opacity: 0.78, scaleX: 1, skewY: folderPagePeel === 'next' ? -1 : 1 }}
                      exit={{ opacity: 0, scaleX: 0.1 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className={`pointer-events-none absolute top-6 bottom-6 z-30 w-[42%] bg-background/65 shadow-2xl ${
                        folderPagePeel === 'next' ? 'right-0 origin-right rounded-l-[32px]' : 'left-0 origin-left rounded-r-[32px]'
                      }`}
                      style={{
                        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.18), transparent 42%, rgba(0,0,0,0.045))',
                      }}
                    />
                  )}
                </AnimatePresence>

                <div className="relative z-20 flex items-center justify-start mt-auto pt-2">
                  <div className="rounded-full bg-transparent px-1.5 py-1 text-[10px] font-black tabular-nums tracking-[0.16em] text-[#6f7a8d]/35">
                    {folderPage}/{folderTotalPages}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Mobile Task Notebook */}
            <div className="max-w-[430px] mx-auto px-4 py-4 md:hidden block">
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative min-h-[480px] w-full flex flex-col overflow-hidden rounded-[30px] notebook-cream-bg border border-outline-variant/12 py-4 pl-12 pr-4 shadow-xl shadow-black/10 backdrop-blur-xl"
                style={{
                  backgroundImage: 'radial-gradient(circle at 20% 22%, rgba(255,255,255,0.09) 0 1px, transparent 1.6px), radial-gradient(circle at 78% 62%, rgba(0,0,0,0.05) 0 1px, transparent 1.7px), radial-gradient(circle at 44% 76%, rgba(255,255,255,0.045) 0 1px, transparent 1.8px), linear-gradient(90deg, transparent 0 38px, rgba(235,120,120,0.24) 38px 39px, transparent 39px calc(100% - 28px), rgba(235,120,120,0.16) calc(100% - 28px) calc(100% - 27px), transparent calc(100% - 27px))',
                  backgroundPosition: '0 17px',
                  borderRadius: '30px 28px 32px 29px',
                }}
              >
                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/[0.035] to-transparent pointer-events-none" />
                <div className="pointer-events-none absolute bottom-4 right-0 top-4 w-7">
                  {[0, 1, 2, 3].map((page) => (
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
                <div className="absolute inset-y-3 left-3 flex flex-col justify-between py-1">
                  {Array.from({ length: 12 }).map((_, ring) => (
                    <span
                      key={ring}
                      className="h-2.5 w-8 rounded-full border border-[#A8A29E]/40 bg-[#A8A29E]/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.12)]"
                    />
                  ))}
                </div>

                <div className="relative z-10 mb-2 flex items-center justify-between">
                  <h2 className="text-base font-bold font-headline tracking-tight notebook-handwriting text-foreground/80">
                    Tareas del cuaderno
                  </h2>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('adonai:open-capture', { detail: { folderId: isUncategorized ? undefined : (selectedFolder || undefined) } }))}
                    className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <AnimatePresence mode="wait" custom={folderPageDir}>
                  <motion.div
                    key={`folder-mobile-page-${folderPage}`}
                    custom={folderPageDir}
                    variants={pageTurnVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 flex flex-1 flex-col justify-between"
                    style={{ transformOrigin: folderPageDir > 0 ? 'right center' : 'left center', transformStyle: 'preserve-3d' }}
                  >
                    <div
                      className="relative z-10 pb-4 pt-[2px] flex-1"
                    >
                      {visibleFolderTasks.length > 0 ? (
                        <div className="notebook-task-list">
                          {visibleFolderTasks.map((task, idx) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              taskIdx={(folderPage - 1) * FOLDER_TASKS_PER_PAGE + idx}
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
                            />
                          ))}
                        </div>
                      ) : null}
                      {folderPage === folderTotalPages && (
                        <QuickNotebookTaskAdd
                          folderId={isUncategorized ? null : selectedFolder}
                          folderName={currentFolder?.name || 'Hoy'}
                        />
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Drag handles for page turn */}
                <motion.div
                  role="button"
                  aria-label="Arrastrar para volver la pagina"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.28}
                  onDragStart={() => setFolderPagePeel('prev')}
                  onDragEnd={(_, info) => {
                    setFolderPagePeel(null);
                    if (info.offset.x > 34 || info.velocity.x > 260) turnFolderPage(-1);
                  }}
                  className="cursor-hand group absolute left-0 z-40 top-20 bottom-12 w-10"
                >
                  <div className={`absolute left-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-r-2xl border border-l-0 border-outline-variant/18 bg-background/45 shadow-sm backdrop-blur-sm transition-opacity h-16 w-4 ${folderPage === 1 ? 'opacity-25' : 'opacity-70 group-hover:opacity-100'}`}>
                    <div className="space-y-1">
                      <span className="block h-3.5 w-px rounded-full bg-on-surface-variant/30" />
                      <span className="block h-3.5 w-px rounded-full bg-on-surface-variant/20" />
                      <span className="block h-3.5 w-px rounded-full bg-on-surface-variant/30" />
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  role="button"
                  aria-label="Arrastrar para pasar la pagina"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.28}
                  onDragStart={() => setFolderPagePeel('next')}
                  onDragEnd={(_, info) => {
                    setFolderPagePeel(null);
                    if (info.offset.x < -34 || info.velocity.x < -260) turnFolderPage(1);
                  }}
                  className="cursor-hand group absolute right-0 z-40 top-20 bottom-12 w-10"
                >
                  <div className={`absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-outline-variant/18 bg-background/45 shadow-sm backdrop-blur-sm transition-opacity h-16 w-4 ${folderPage === folderTotalPages ? 'opacity-25' : 'opacity-70 group-hover:opacity-100'}`}>
                    <div className="space-y-1">
                      <span className="block h-3.5 w-px rounded-full bg-on-surface-variant/30" />
                      <span className="block h-3.5 w-px rounded-full bg-on-surface-variant/20" />
                      <span className="block h-3.5 w-px rounded-full bg-on-surface-variant/30" />
                    </div>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {folderPagePeel && (
                    <motion.div
                      key={folderPagePeel}
                      initial={{ opacity: 0, scaleX: 0.12, skewY: folderPagePeel === 'next' ? -4 : 4 }}
                      animate={{ opacity: 0.78, scaleX: 1, skewY: folderPagePeel === 'next' ? -1 : 1 }}
                      exit={{ opacity: 0, scaleX: 0.1 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className={`pointer-events-none absolute top-5 bottom-5 z-30 w-[42%] bg-background/65 shadow-2xl ${
                        folderPagePeel === 'next' ? 'right-0 origin-right rounded-l-[24px]' : 'left-0 origin-left rounded-r-[24px]'
                      }`}
                      style={{
                        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.18), transparent 42%, rgba(0,0,0,0.045))',
                      }}
                    />
                  )}
                </AnimatePresence>

                <div className="relative z-20 flex items-center justify-start mt-auto pt-1">
                  <div className="rounded-full bg-transparent px-1.5 py-1 text-[10px] font-black tabular-nums tracking-[0.16em] text-[#6f7a8d]/35">
                    {folderPage}/{folderTotalPages}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {renderFolderModal(false)}
      <AnimatePresence>{sharingFolder && renderSharingModal()}</AnimatePresence>

      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer 
        task={timerTask} 
        open={!!timerTask} 
        onClose={() => setTimerTask(null)} 
        durationRef={timerDurationRef}
      />
    </div>
  );
};

export default FoldersPage;
