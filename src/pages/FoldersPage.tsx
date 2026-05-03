import { useState, useRef, useCallback, useEffect } from 'react';
import { useFolders } from '@/hooks/useFolders';
import { useTasks } from '@/hooks/useTasks';
import { useFriendships } from '@/hooks/useFriendships';
import { useFolderShares } from '@/hooks/useFolderShares';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Plus, ChevronRight, Lock, Users, MoreVertical, Trash2, Check, Timer, UserPlus, X, Edit2, ArrowLeft, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { toast } from 'sonner';
import { dispatchTutorialFolderCreated } from '@/lib/tutorialEvents';

const FOLDER_COLORS = ['#C3F53C', '#4BE277', '#6B9FFF', '#FF8B7C', '#FFB86C', '#BD93F9', '#FF79C6', '#C7C6C6'];

const FoldersPage = () => {
  const { folders, createFolder, updateFolder, deleteFolder } = useFolders();
  const { tasks, updateTask } = useTasks();
  const { user } = useAuth();
  const { friends: acceptedFriendships } = useFriendships();
  const [friendProfiles, setFriendProfiles] = useState<{ user_id: string; name: string | null; email: string | null }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [menuFolder, setMenuFolder] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [sharingFolder, setSharingFolder] = useState<string | null>(null);
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

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proyecto?')) {
      deleteFolder.mutate(id);
      setMenuFolder(null);
      if (selectedFolder === id) setSelectedFolder(null);
      toast.success('Proyecto eliminado');
    }
  };

  const handleShareWithFriend = (friendId: string) => {
    const fId = sharingFolder || selectedFolder;
    if (!fId) return;
    const alreadyShared = shares.some((s: any) => s.shared_with_id === friendId);
    if (alreadyShared) {
      toast.info('Ya compartido con este amigo');
      return;
    }
    shareWithFriend.mutate({ folderId: fId, friendId });
    toast.success('Acceso concedido');
  };

  const handleRemoveShare = (shareId: string) => {
    removeShare.mutate(shareId);
    toast.success('Acceso revocado');
  };

  const handleUpdate = (id: string) => {
    if (!newName.trim()) { toast.error('Escribe un nombre'); return; }
    updateFolder.mutate({ id, name: newName.trim(), color: newColor });
    setEditingFolder(null);
    setMenuFolder(null);
    setNewName('');
    toast.success('Proyecto actualizado');
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

  const folderTasks = selectedFolder ? tasks.filter((t) => t.folder_id === selectedFolder) : [];
  const currentFolder = folders.find((f) => f.id === selectedFolder);

  const handleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id, status: 'done', completed_at: new Date().toISOString() });
  };

  const renderSharingModal = () => {
    if (!sharingFolder) return null;
    const folder = folders.find(f => f.id === sharingFolder);
    if (!folder) return null;

    return (
      <>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-xl" 
          onClick={() => setSharingFolder(null)} 
        />
        <motion.div
          initial={{ y: '100%', opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-8 lg:px-0 lg:flex lg:items-center lg:justify-center lg:inset-0 lg:pb-0"
        >
          <div className="mx-auto w-full max-w-[430px] lg:max-w-[500px] bg-card rounded-[48px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.3)] border border-outline-variant/20">
            <div className="flex justify-center pt-6 pb-2 lg:hidden">
              <div className="w-12 h-1.5 bg-on-surface-variant/10 rounded-full" />
            </div>
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-foreground font-headline tracking-tight leading-none">Colaborar</h2>
                  <p className="text-sm font-medium text-on-surface-variant/40">Gestiona quién tiene acceso.</p>
                </div>
                <button 
                  onClick={() => setSharingFolder(null)} 
                  className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant/40 hover:bg-surface-container-highest transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 rounded-[32px] bg-surface-container-low border border-outline-variant/10 flex items-center gap-5">
                <div 
                  className="w-16 h-16 rounded-[24px] flex items-center justify-center shadow-inner" 
                  style={{ backgroundColor: (folder.color || '#C3F53C') + '20' }}
                >
                  <FolderOpen className="w-8 h-8" style={{ color: folder.color || '#C3F53C' }} />
                </div>
                <div>
                  <p className="text-xl font-black text-foreground tracking-tight">{folder.name}</p>
                  <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Proyecto Compartido</p>
                </div>
              </div>

              {shares.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] ml-1">Miembros</p>
                  <div className="space-y-3">
                    {shares.map((share: any) => {
                      const profile = friendProfiles.find(p => p.user_id === share.shared_with_id);
                      return (
                        <div key={share.id} className="flex items-center justify-between p-5 rounded-[28px] bg-surface-container-low border border-outline-variant/10 shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-[12px] font-black text-primary">
                              {(profile?.name || profile?.email || 'A')[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-black text-foreground">{profile?.name || profile?.email || 'Miembro'}</span>
                          </div>
                          <button 
                            onClick={() => handleRemoveShare(share.id)} 
                            className="text-red-500 text-xs font-black hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
                          >
                            Quitar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] ml-1">Añadir personas</p>
                {friendProfiles.length === 0 ? (
                  <div className="p-10 rounded-[32px] bg-surface-container-high border-2 border-dashed border-outline-variant/20 text-center">
                    <p className="text-sm font-bold text-on-surface-variant/30">No tienes amigos para invitar aún.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto no-scrollbar pr-1">
                    {friendProfiles
                      .filter(p => !sharedWithIds.includes(p.user_id))
                      .map((profile) => (
                        <button 
                          key={profile.user_id} 
                          onClick={() => handleShareWithFriend(profile.user_id)}
                          className="w-full flex items-center justify-between p-5 rounded-[28px] bg-surface-container-low border border-outline-variant/10 hover:border-primary hover:shadow-lg transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-[12px] font-black text-foreground group-hover:bg-primary/20 transition-colors">
                              {(profile?.name || profile?.email || 'A')[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-black text-foreground group-hover:text-foreground transition-colors">{profile.name || profile.email}</span>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                            <Plus className="w-5 h-5" />
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </>
    );
  };

  const renderCreateModal = () => (
    <AnimatePresence>
      {showCreate && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[80]"
            onClick={() => setShowCreate(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="fixed inset-x-4 top-[10%] lg:inset-x-0 lg:w-[500px] lg:mx-auto z-[90] bg-card p-10 rounded-[56px] border border-outline-variant/20 shadow-[0_50px_100px_rgba(0,0,0,0.2)] space-y-10"
          >
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-foreground font-headline tracking-tight leading-none">Nuevo Proyecto</h2>
              <p className="text-base font-medium text-on-surface-variant/40">Crea un espacio para tus objetivos.</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40 ml-1">Nombre del Proyecto</p>
                <input 
                  autoFocus 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Lanzamiento Producto, Boda..."
                  className="w-full bg-surface-container-high border-4 border-transparent rounded-[32px] p-7 text-foreground text-2xl font-black placeholder:text-on-surface-variant/20 focus:border-primary/40 focus:bg-surface-container-highest transition-all outline-none shadow-inner"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()} 
                />
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40 ml-1">Color Distintivo</p>
                <div className="grid grid-cols-4 gap-4">
                  {FOLDER_COLORS.map((c) => (
                    <button 
                      key={c} 
                      onClick={() => setNewColor(c)}
                      className={`h-16 rounded-[24px] transition-all relative overflow-hidden group shadow-md ${newColor === c ? 'ring-4 ring-primary ring-offset-4 ring-offset-card scale-95' : 'hover:scale-105 hover:shadow-xl'}`}
                      style={{ backgroundColor: c }}
                    >
                      {newColor === c && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <Check className="w-6 h-6 text-white" strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowCreate(false)} 
                  className="flex-1 py-6 rounded-[32px] bg-surface-container-high text-on-surface-variant text-sm font-black hover:bg-surface-container-highest transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreate} 
                  className="flex-[2] py-6 rounded-[32px] bg-primary text-primary-foreground text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(195,245,60,0.4)]"
                >
                  Crear Espacio
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (selectedFolder && currentFolder) {
    const folderShareCount = shares.length;
    const count = folderTasks.length;
    const doneCount = folderTasks.filter((t) => t.status === 'done').length;
    const progress = count > 0 ? (doneCount / count) * 100 : 0;

    return (
      <div className="min-h-screen bg-background selection:bg-primary/30">
        <div className="max-w-[430px] lg:max-w-5xl mx-auto px-6 pt-16 pb-32 space-y-12">
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-8"
          >
            <button 
              onClick={() => setSelectedFolder(null)} 
              className="w-16 h-16 rounded-[28px] bg-card flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all hover:scale-110 shadow-xl border border-outline-variant/10"
            >
              <ArrowLeft className="w-7 h-7" />
            </button>
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" 
                  style={{ backgroundColor: (currentFolder.color || '#C3F53C') + '20' }}
                >
                  <FolderOpen className="w-5 h-5" style={{ color: currentFolder.color || '#C3F53C' }} />
                </div>
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em]">Proyecto Activo</p>
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-foreground tracking-tighter font-headline leading-none truncate">{currentFolder.name}</h1>
              
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-black text-on-surface-variant/60 uppercase tracking-widest">{count} Tareas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-on-surface-variant/60 uppercase tracking-widest">{Math.round(progress)}% Completado</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setSharingFolder(currentFolder.id)} 
                className={`w-16 h-16 rounded-[28px] flex items-center justify-center transition-all shadow-xl ${folderShareCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-card text-on-surface-variant/30 hover:bg-card hover:text-foreground'}`}
              >
                {folderShareCount > 0 ? <Users className="w-7 h-7" /> : <Share2 className="w-7 h-7" />}
              </button>
              <button 
                onClick={() => {
                  setEditingFolder(currentFolder.id);
                  setNewName(currentFolder.name);
                  setNewColor(currentFolder.color || FOLDER_COLORS[0]);
                }}
                className="w-16 h-16 rounded-[28px] bg-card flex items-center justify-center text-foreground hover:bg-surface-container-high transition-all shadow-xl border border-outline-variant/10"
              >
                <Edit2 className="w-7 h-7" />
              </button>
            </div>
          </motion.div>

          {/* Progress Bar (Large) */}
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="h-4 w-full bg-surface-container-high/50 rounded-full overflow-hidden border-2 border-outline-variant/10 shadow-inner p-1"
          >
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full rounded-full shadow-lg relative overflow-hidden"
              style={{ backgroundColor: currentFolder.color || '#C3F53C' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </motion.div>
          </motion.div>

          {/* Tasks List */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-8">
              <h2 className="text-[12px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em]">Listado de Tareas</h2>
              <button 
                onClick={openCapture} 
                className="text-xs font-black text-primary-foreground bg-primary px-8 py-4 rounded-[20px] hover:scale-105 transition-all shadow-[0_15px_30px_rgba(195,245,60,0.3)] flex items-center gap-3 active:scale-95"
              >
                <Plus className="w-5 h-5" /> Nueva Tarea
              </button>
            </div>

            {folderTasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-container-low/40 backdrop-blur-md border-4 border-dashed border-outline-variant/10 p-24 rounded-[64px] text-center space-y-8"
              >
                <div className="w-24 h-24 rounded-[32px] bg-card flex items-center justify-center mx-auto shadow-sm">
                  <Plus className="w-10 h-10 text-on-surface-variant/10" />
                </div>
                <div className="space-y-3">
                  <p className="text-foreground font-black text-3xl font-headline tracking-tight">Espacio Limpio</p>
                  <p className="text-on-surface-variant/40 text-lg max-w-[320px] mx-auto font-medium">Empieza a añadir tareas a este proyecto para ver tu progreso.</p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {folderTasks.map((task, idx) => {
                    const isDone = task.status === 'done';
                    return (
                      <motion.div 
                        key={task.id} 
                        layout
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.05, type: 'spring', damping: 20 }}
                        onClick={() => setSelectedTask(task)}
                        className={`group p-8 rounded-[40px] flex items-center gap-6 cursor-pointer transition-all border-2 relative overflow-hidden ${
                          isDone 
                            ? 'bg-card/20 border-transparent opacity-40' 
                            : 'bg-card hover:border-primary hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)] border-outline-variant/10 shadow-sm'
                        }`}
                      >
                        <div className="flex-shrink-0 relative z-10">
                          {isDone ? (
                            <div className="w-10 h-10 rounded-[14px] bg-surface-container-high flex items-center justify-center">
                              <Check className="w-6 h-6 text-on-surface-variant/30" strokeWidth={4} />
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => handleComplete(task.id, e)}
                              className="w-10 h-10 rounded-[14px] border-2 border-outline-variant/20 flex items-center justify-center hover:border-primary hover:bg-primary transition-all group-hover:scale-110 active:scale-90 bg-card" 
                            >
                              <div className="w-5 h-5 rounded-[8px] bg-primary/0 group-hover:bg-primary transition-all scale-0 group-hover:scale-100 shadow-inner" />
                            </button>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 relative z-10">
                          <h4 className={`text-xl font-black truncate tracking-tight font-headline ${isDone ? 'text-on-surface-variant/30 line-through' : 'text-foreground'}`}>{task.title}</h4>
                          {task.due_date && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em]">{task.due_date}</p>
                            </div>
                          )}
                        </div>
                        {!isDone && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setTimerTask(task); }}
                            className="w-12 h-12 rounded-[16px] bg-surface-container-high flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground transition-all hover:scale-110 relative z-10 shadow-sm active:scale-90"
                          >
                            <Timer className="w-5 h-5" />
                          </button>
                        )}
                        
                        {/* Hover accent */}
                        {!isDone && (
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-2 opacity-0 group-hover:opacity-100 transition-opacity" 
                            style={{ backgroundColor: currentFolder.color || '#C3F53C' }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        
        <FAB 
          onTextClick={openCapture} 
          onVoiceClick={openCaptureInVoiceMode} 
        />
        
        <TaskCaptureModal ref={captureModalRef} open={captureOpen} onClose={() => setCaptureOpen(false)} folderId={selectedFolder} creationSource="fab" />
        <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
        <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
        
        <AnimatePresence>{editingFolder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-xl" onClick={() => setEditingFolder(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-card w-full max-w-[500px] p-12 rounded-[56px] shadow-2xl border border-outline-variant/20 space-y-10">
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-foreground font-headline tracking-tight">Editar Proyecto</h3>
                <p className="text-sm font-medium text-on-surface-variant/40">Modifica los detalles de tu espacio.</p>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40 ml-1">Nombre</p>
                  <input 
                    autoFocus 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-surface-container-high rounded-[32px] p-7 text-foreground font-black text-2xl outline-none focus:bg-surface-container-highest border-4 border-transparent focus:border-primary/40 transition-all shadow-inner"
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(editingFolder)} 
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40 ml-1">Color</p>
                  <div className="grid grid-cols-4 gap-4">
                    {FOLDER_COLORS.map((c) => (
                      <button 
                        key={c} 
                        onClick={() => setNewColor(c)}
                        className={`h-16 rounded-[24px] transition-all relative overflow-hidden ${newColor === c ? 'ring-4 ring-primary ring-offset-4 ring-offset-card scale-95 shadow-lg' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setEditingFolder(null)} className="flex-1 py-6 rounded-[32px] bg-surface-container-high text-sm font-black text-on-surface-variant/40 hover:bg-surface-container-highest transition-colors">Cancelar</button>
                <button onClick={() => handleUpdate(editingFolder)} className="flex-[2] py-6 rounded-[32px] bg-primary text-sm font-black text-primary-foreground shadow-xl shadow-primary/20">Guardar Cambios</button>
              </div>
            </motion.div>
          </div>
        )}</AnimatePresence>
        
        <AnimatePresence>{renderSharingModal()}</AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      {/* Decorative grain/noise pattern like in DailyPage */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] contrast-150 grayscale mix-blend-multiply" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3C%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      <div className="max-w-[430px] lg:max-w-6xl mx-auto px-6 pt-20 pb-40 space-y-16 relative">
        <div className="flex items-end justify-between">
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="px-4 py-2 rounded-2xl bg-surface-container-high flex items-center justify-center border border-outline-variant/10 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/60">SISTEMA PRO</p>
              </div>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-7xl lg:text-9xl font-black tracking-tighter font-headline text-foreground leading-none"
            >
              Proyectos
            </motion.h1>
          </div>
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setNewName('');
              setNewColor(FOLDER_COLORS[0]);
              setShowCreate(true);
            }}
            className="w-20 h-20 lg:w-24 lg:h-24 rounded-[32px] lg:rounded-[40px] bg-primary text-primary-foreground flex items-center justify-center shadow-[0_20px_50px_rgba(195,245,60,0.4)] group transition-all"
          >
            <Plus className="w-10 h-10 lg:w-12 lg:h-12 group-hover:scale-110 transition-transform" strokeWidth={3} />
          </motion.button>
        </div>

        {folders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-container-low/50 backdrop-blur-xl border-4 border-dashed border-outline-variant/10 p-20 lg:p-32 rounded-[64px] text-center space-y-10 shadow-sm"
          >
            <div className="w-32 h-32 rounded-[48px] bg-card flex items-center justify-center mx-auto shadow-xl shadow-black/10">
              <FolderOpen className="w-16 h-16 text-on-surface-variant/10" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-foreground font-headline tracking-tight">Tu arquitectura comienza aquí</h2>
              <p className="text-on-surface-variant/40 font-medium max-w-[400px] mx-auto text-xl leading-relaxed">
                Organiza tus objetivos complejos en espacios dedicados para mantener el máximo enfoque.
              </p>
            </div>
            <button 
              onClick={() => setShowCreate(true)} 
              className="inline-flex items-center gap-4 px-14 py-7 rounded-[32px] bg-primary text-primary-foreground text-lg font-black hover:scale-105 transition-all shadow-[0_30px_60px_rgba(195,245,60,0.2)] active:scale-95"
            >
              <Plus className="w-7 h-7" /> Crear mi primer espacio
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {folders.map((folder, index) => {
                const folderTasksList = tasks.filter((t) => t.folder_id === folder.id);
                const count = folderTasksList.length;
                const doneCount = folderTasksList.filter((t) => t.status === 'done').length;
                const progress = count > 0 ? (doneCount / count) * 100 : 0;

                return (
                  <motion.div 
                    key={folder.id} 
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
                    className="group relative"
                  >
                    <div 
                      onClick={() => setSelectedFolder(folder.id)}
                      className="bg-card/80 backdrop-blur-xl hover:bg-card p-10 lg:p-12 rounded-[64px] border border-outline-variant/10 shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.2)] cursor-pointer transition-all duration-700 hover:-translate-y-4 group/card flex flex-col min-h-[400px] justify-between relative overflow-hidden"
                    >
                      {/* Interactive background glow */}
                      <div 
                        className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-0 group-hover/card:opacity-30 transition-opacity duration-1000"
                        style={{ backgroundColor: folder.color || '#C3F53C' }}
                      />

                      <div className="flex items-start justify-between relative z-10">
                        <div 
                          className="w-24 h-24 rounded-[36px] flex items-center justify-center transition-all duration-700 group-hover/card:scale-110 group-hover/card:rotate-6 shadow-inner" 
                          style={{ backgroundColor: (folder.color || '#4BE277') + '20' }}
                        >
                          <FolderOpen className="w-12 h-12" style={{ color: folder.color || '#4BE277' }} />
                        </div>
                        <div className="flex gap-2.5 opacity-0 group-hover/card:opacity-100 transition-all duration-500 translate-y-4 group-hover/card:translate-y-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSharingFolder(folder.id); }}
                            className="w-12 h-12 rounded-2xl bg-card shadow-lg flex items-center justify-center hover:bg-primary transition-colors"
                          >
                            <Users className="w-5 h-5 text-foreground" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setMenuFolder(menuFolder === folder.id ? null : folder.id); }}
                            className="w-12 h-12 rounded-2xl bg-card shadow-lg flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-8 relative z-10">
                        <div className="space-y-3">
                          <h3 className="text-4xl font-black text-foreground tracking-tight leading-[0.9] font-headline">{folder.name}</h3>
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-surface-container-high border-2 border-card flex items-center justify-center text-[9px] font-black text-foreground shadow-sm">ME</div>
                              {count > 3 && <div className="w-7 h-7 rounded-full bg-primary border-2 border-card flex items-center justify-center text-[9px] font-black text-primary-foreground shadow-sm">+{count}</div>}
                            </div>
                            <p className="text-[11px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">{count} Tareas activas</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex justify-between items-end px-1">
                            <span className="text-[11px] font-black text-foreground uppercase tracking-[0.3em]">{Math.round(progress)}% Listo</span>
                            {progress > 0 && <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(195,245,60,0.8)]" />}
                          </div>
                          <div className="h-4 w-full bg-surface-container-high rounded-full overflow-hidden p-1 border border-outline-variant/10 shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full rounded-full relative overflow-hidden shadow-lg"
                              style={{ backgroundColor: folder.color || '#C3F53C' }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                            </motion.div>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {menuFolder === folder.id && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 15 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.9, y: 15 }}
                            className="absolute right-10 top-28 z-[30] bg-card rounded-[32px] shadow-2xl border border-outline-variant/10 p-5 min-w-[220px]"
                          >
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(folder.id);
                                setNewName(folder.name);
                                setNewColor(folder.color || FOLDER_COLORS[0]);
                                setMenuFolder(null);
                              }}
                              className="w-full flex items-center gap-4 px-6 py-5 rounded-2xl hover:bg-primary/20 text-sm font-black text-foreground transition-colors"
                            >
                              <Edit2 className="w-5 h-5" /> Editar Espacio
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }}
                              className="w-full flex items-center gap-4 px-6 py-5 rounded-2xl hover:bg-destructive/10 text-sm font-black text-red-500 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" /> Eliminar
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      <FAB 
        onTextClick={openCapture} 
        onVoiceClick={openCaptureInVoiceMode} 
      />
      
      <TaskCaptureModal ref={captureModalRef} open={captureOpen} onClose={() => setCaptureOpen(false)} creationSource="fab" />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
      {renderCreateModal()}
      <AnimatePresence>{renderSharingModal()}</AnimatePresence>
    </div>
  );
};

export default FoldersPage;
