import { useState, useRef, useCallback, useEffect } from 'react';
import { useFolders } from '@/hooks/useFolders';
import { useTasks } from '@/hooks/useTasks';
import { useFriendships } from '@/hooks/useFriendships';
import { useFolderShares } from '@/hooks/useFolderShares';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { supabase } from '@/integrations/supabase/client';
import { Folder, Plus, ChevronRight, Users, Trash2, Check, Clock, Edit2, ArrowLeft, Share2, Settings, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { TaskCard } from '@/components/TaskCard';
import { toast } from 'sonner';
import { triggerTaskCelebration } from '@/lib/celebrations';
import { dispatchTutorialFolderCreated } from '@/lib/tutorialEvents';

const FOLDER_COLORS = ['#C3F53C', '#4BE277', '#6B9FFF', '#FF8B7C', '#FFB86C', '#BD93F9', '#FF79C6', '#C7C6C6'];

const FoldersPage = () => {
  const { folders, createFolder, updateFolder, deleteFolder, isLoading } = useFolders();
  const { tasks, updateTask } = useTasks();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { friends: acceptedFriendships } = useFriendships();
  
  const [friendProfiles, setFriendProfiles] = useState<{ user_id: string; name: string | null; email: string | null }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [sharingFolder, setSharingFolder] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const timerDurationRef = useRef(0);
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);

  const { shares, shareWithFriend, removeShare } = useFolderShares(sharingFolder || selectedFolder || undefined);

  const openCapture = useCallback(() => setCaptureOpen(true), []);
  const openCaptureInVoiceMode = useCallback(() => {
    captureModalRef.current?.openInVoiceMode();
    setCaptureOpen(true);
  }, []);
  useGlobalVoiceCapture(captureModalRef, openCapture);

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
          toast.success('Proyecto creado con éxito');
        },
        onError: () => toast.error('Error al crear proyecto'),
      }
    );
  };

  const handleUpdate = (id: string) => {
    if (!newName.trim()) { toast.error('Escribe un nombre'); return; }
    updateFolder.mutate({ id, name: newName.trim(), color: newColor });
    setEditingFolder(null);
    setNewName('');
    toast.success('Proyecto actualizado');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proyecto y todas sus tareas?')) {
      deleteFolder.mutate(id);
      if (selectedFolder === id) setSelectedFolder(null);
      toast.success('Proyecto eliminado');
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
  const currentFolder = folders.find((f) => f.id === selectedFolder);
  const folderTasks = useMemo(() => {
    const raw = selectedFolder ? tasks.filter((t) => t.folder_id === selectedFolder) : [];
    const quadrantRank = (t: any) =>
      t.urgency && t.importance ? 0
      : t.urgency ? 1
      : t.importance ? 2
      : 3;
    return [...raw].sort((a, b) => {
      const rankDiff = quadrantRank(a) - quadrantRank(b);
      if (rankDiff !== 0) return rankDiff;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [tasks, selectedFolder]);
  const completedCount = folderTasks.filter(t => t.status === 'done').length;

  const handleComplete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletingTaskId(task.id);
    const isCurrentlyTiming = timerTask?.id === task.id;
    const finalDuration = isCurrentlyTiming ? timerDurationRef.current : task.actual_duration_seconds;

    if (isCurrentlyTiming) setTimerTask(null);

    setTimeout(() => {
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
    }, 500);
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
                  {editingFolder ? 'Editar Proyecto' : 'Nuevo Proyecto'}
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
                    {editingFolder ? 'Guardar' : 'Crear Proyecto'}
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
              <p className="text-xs text-on-surface-variant/60">Gestiona accesos al proyecto.</p>
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-1 bg-primary rounded-full" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60">
                    Organización
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline">
                  Proyectos
                </h1>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setNewName(''); setNewColor(FOLDER_COLORS[0]); setShowCreate(true); }}
                className="flex items-center gap-3 px-6 py-4 rounded-[24px] bg-foreground text-background font-black text-sm hover:opacity-90 transition-all shadow-xl shadow-foreground/10 group self-start md:self-end"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                Nuevo Proyecto
              </motion.button>
            </div>

            {/* Folders Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 rounded-[32px] bg-surface-container/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {folders.map((folder) => (
                  <motion.div
                    key={folder.id}
                    layoutId={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    whileHover={{ y: -8 }}
                    className="group cursor-pointer relative"
                  >
                    <div 
                      className="absolute inset-0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity blur-2xl -z-10"
                      style={{ backgroundColor: `${folder.color}20` }}
                    />
                    <div className="bg-surface border border-outline-variant/50 rounded-[32px] p-6 h-full flex flex-col justify-between hover:border-primary/30 transition-colors shadow-sm group-hover:shadow-xl group-hover:shadow-primary/5">
                      <div className="space-y-4">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
                          style={{ backgroundColor: `${folder.color}15` }}
                        >
                          <Folder className="w-6 h-6" style={{ color: folder.color }} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black tracking-tight font-headline group-hover:text-primary transition-colors">
                            {folder.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-8 pt-4 border-t border-outline-variant/30">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-surface-container border-2 border-surface flex items-center justify-center">
                            <span className="text-[10px] font-black">
                              {tasks.filter(t => t.folder_id === folder.id).length}
                            </span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">
                            Tareas
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-on-surface-variant/30 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                ))}
                {folders.length === 0 && (
                  <div className="col-span-full py-20 bg-surface/30 border border-dashed border-outline-variant rounded-[40px] text-center">
                    <p className="text-on-surface-variant/40 font-black uppercase tracking-[0.2em] text-xs">Sin proyectos activos</p>
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
              className="w-full h-48 md:h-64 relative overflow-hidden flex items-end p-8 md:p-12"
              style={{ backgroundColor: `${currentFolder?.color}05` }}
            >
              <div className="absolute top-8 left-8 z-20">
                <motion.button
                  whileHover={{ x: -4 }}
                  onClick={() => setSelectedFolder(null)}
                  className="p-3 rounded-2xl bg-surface/80 backdrop-blur-md border border-outline-variant/30 shadow-sm flex items-center gap-2 group"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest hidden md:inline">Proyectos</span>
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
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${currentFolder?.color}20` }}>
                      <Folder className="w-4 h-4" style={{ color: currentFolder?.color }} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
                      Arquitectura
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline">
                    {currentFolder?.name}
                  </h1>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Progreso</div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-surface-container rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedCount / (folderTasks.length || 1)) * 100}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                    <span className="text-sm font-black font-headline">
                      {Math.round((completedCount / (folderTasks.length || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Decorative background accent */}
              <div 
                className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[100px] opacity-10 pointer-events-none"
                style={{ backgroundColor: currentFolder?.color }}
              />
            </div>

            {/* Project Tasks Area */}
            <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 py-12">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black font-headline tracking-tight flex items-center gap-3">
                    Tareas del Proyecto
                    <span className="text-xs px-2 py-0.5 bg-surface-container border border-outline-variant/30 rounded-full opacity-60">
                      {folderTasks.length}
                    </span>
                  </h2>
                  <button 
                    onClick={openCapture}
                    className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {folderTasks.length > 0 ? (
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {folderTasks.map((task, idx) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          taskIdx={idx}
                          isDone={task.status === 'done'}
                          completingTaskId={completingTaskId}
                          dragIdx={null}
                          touchIdx={null}
                          handleDragStart={() => {}}
                          handleDragOver={() => {}}
                          handleDragEnd={() => {}}
                          handleTouchStart={() => {}}
                          handleTouchMove={() => {}}
                          handleTouchEnd={() => {}}
                          setSelectedTask={setSelectedTask}
                          handleComplete={handleComplete}
                          handleUncomplete={handleUncomplete}
                          handleStartTimer={handleStartTimer}
                          view="daily"
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-surface/30 border border-dashed border-outline-variant/50 rounded-[40px] text-center px-8">
                    <div className="w-16 h-16 rounded-3xl bg-surface-container flex items-center justify-center mb-6">
                      <Sparkles className="w-8 h-8 opacity-20" />
                    </div>
                    <h3 className="text-lg font-black font-headline mb-2">Proyecto Limpio</h3>
                    <p className="text-sm text-on-surface-variant/60 max-w-[280px]">
                      Aún no hay tareas asociadas a este proyecto.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FAB onTextClick={openCapture} onVoiceClick={openCaptureInVoiceMode} />

      {/* Modals */}
      {renderFolderModal(false)}
      <AnimatePresence>{sharingFolder && renderSharingModal()}</AnimatePresence>
      
      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        onClose={() => setCaptureOpen(false)} 
        folderId={selectedFolder || undefined}
        creationSource="fab" 
      />
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
