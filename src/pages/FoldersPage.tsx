import { useState, useRef, useCallback, useEffect } from 'react';
import { useFolders } from '@/hooks/useFolders';
import { useTasks } from '@/hooks/useTasks';
import { useFriendships } from '@/hooks/useFriendships';
import { useFolderShares } from '@/hooks/useFolderShares';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Plus, ChevronRight, Lock, Users, MoreVertical, Trash2, Check, Timer, UserPlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { toast } from 'sonner';

const FOLDER_COLORS = ['#4BE277', '#4AE176', '#FF8B7C', '#C7C6C6', '#6B9FFF', '#FFB86C', '#FF79C6', '#BD93F9'];

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
    createFolder.mutate({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor(FOLDER_COLORS[0]);
    setShowCreate(false);
    toast.success('Carpeta creada');
  };

  const handleDelete = (id: string) => {
    deleteFolder.mutate(id);
    setMenuFolder(null);
    if (selectedFolder === id) setSelectedFolder(null);
    toast.success('Carpeta eliminada');
  };

  const handleShareWithFriend = (friendId: string) => {
    const fId = sharingFolder || selectedFolder;
    if (!fId) return;
    const alreadyShared = shares.some((s: any) => s.shared_with_id === friendId);
    if (alreadyShared) {
      toast.info('Ya compartida con este amigo');
      return;
    }
    shareWithFriend.mutate({ folderId: fId, friendId });
    toast.success('Carpeta compartida');
  };

  const handleRemoveShare = (shareId: string) => {
    removeShare.mutate(shareId);
    toast.success('Acceso removido');
  };

  // Get friend user IDs from accepted friendships
  const friendUserIds = acceptedFriendships.map((f: any) => 
    f.requester_id === user?.id ? f.addressee_id : f.requester_id
  );

  // Load friend profiles
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

  // Sharing modal
  const renderSharingModal = () => {
    if (!sharingFolder) return null;
    const folder = folders.find(f => f.id === sharingFolder);
    if (!folder) return null;

    return (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setSharingFolder(null)} />
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-8"
        >
          <div className="mx-auto max-w-[430px] glass-sheet rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-on-surface-variant/20 rounded-full" />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-foreground">Compartir "{folder.name}"</h2>
                <button onClick={() => setSharingFolder(null)} className="text-on-surface-variant"><X className="w-5 h-5" /></button>
              </div>

              {/* Current shares */}
              {shares.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Compartida con:</p>
                  {shares.map((share: any) => {
                    const profile = friendProfiles.find(p => p.user_id === share.shared_with_id);
                    return (
                      <div key={share.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-high">
                        <span className="text-sm text-foreground">{profile?.name || profile?.email || 'Amigo'}</span>
                        <button onClick={() => handleRemoveShare(share.id)} className="text-error text-xs font-semibold">Quitar</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add friends */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Añadir amigos:</p>
                {friendProfiles.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No tienes amigos añadidos aún</p>
                ) : (
                  friendProfiles
                    .filter(p => !sharedWithIds.includes(p.user_id))
                    .map((profile) => (
                      <button key={profile.user_id} onClick={() => handleShareWithFriend(profile.user_id)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors">
                        <span className="text-sm text-foreground">{profile.name || profile.email}</span>
                        <UserPlus className="w-4 h-4 text-primary" />
                      </button>
                    ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </>
    );
  };

  if (selectedFolder && currentFolder) {
    const folderShareCount = shares.length;
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedFolder(null)} className="text-on-surface-variant hover:text-foreground">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: currentFolder.color + '20' }}>
              <FolderOpen className="w-5 h-5" style={{ color: currentFolder.color || '#4BE277' }} />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{currentFolder.name}</h1>
              <p className="text-xs text-on-surface-variant">
                {folderTasks.length} tarea{folderTasks.length !== 1 ? 's' : ''}
                {folderShareCount > 0 && ` · ${folderShareCount} amigo${folderShareCount !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={() => setSharingFolder(currentFolder.id)} className="p-2 rounded-lg bg-surface-container-low">
              {folderShareCount > 0 ? <Users className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-on-surface-variant" />}
            </button>
          </div>

          {folderTasks.length === 0 ? (
            <div className="bg-surface-container-low p-6 rounded-lg text-center space-y-3">
              <p className="text-on-surface-variant">Esta carpeta está vacía.</p>
              <button onClick={openCapture} className="inline-flex items-center gap-2 px-4 py-2 rounded-full primary-gradient text-primary-foreground text-sm font-semibold">
                <Plus className="w-4 h-4" /> Añadir tarea
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {folderTasks.map((task) => {
                const isDone = task.status === 'done';
                return (
                  <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedTask(task)}
                    className={`p-3.5 rounded-lg flex items-center gap-3 cursor-pointer transition-all ${isDone ? 'opacity-50' : 'bg-surface-container-low hover:bg-surface-container-high'}`}>
                    {isDone ? (
                      <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    ) : (
                      <button onClick={(e) => handleComplete(task.id, e)}
                        className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold truncate ${isDone ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>{task.title}</h4>
                      {task.due_date && <p className="text-[10px] text-on-surface-variant">{task.due_date}</p>}
                    </div>
                    {!isDone && (
                      <button onClick={(e) => { e.stopPropagation(); setTimerTask(task); }}
                        className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 flex-shrink-0">
                        <Timer className="w-3.5 h-3.5 text-primary" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
        <FAB onClick={openCaptureInVoiceMode} />
        <TaskCaptureModal ref={captureModalRef} open={captureOpen} onClose={() => setCaptureOpen(false)} folderId={selectedFolder} />
        <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
        <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
        <AnimatePresence>{renderSharingModal()}</AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-4 pb-24 space-y-6">
        <div className="flex items-center justify-between py-1">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Organización</p>
            <h1 className="text-xl font-extrabold tracking-tight">Tus Proyectos</h1>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-surface-container-low rounded-xl overflow-hidden">
              <div className="p-4 space-y-4">
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre de la carpeta"
                  className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
                <div className="flex gap-2">
                  {FOLDER_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${newColor === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg bg-surface-container-high text-on-surface-variant text-sm font-semibold">Cancelar</button>
                  <button onClick={handleCreate} className="flex-1 py-2.5 rounded-lg primary-gradient text-primary-foreground text-sm font-bold">Crear</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {folders.length === 0 && !showCreate ? (
          <div className="bg-surface-container-low p-8 rounded-lg text-center space-y-3">
            <FolderOpen className="w-12 h-12 text-on-surface-variant/30 mx-auto" />
            <p className="text-on-surface-variant">Crea carpetas para organizar tus proyectos.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full primary-gradient text-primary-foreground text-sm font-semibold">
              <Plus className="w-4 h-4" /> Nueva carpeta
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map((folder) => {
              const count = tasks.filter((t) => t.folder_id === folder.id).length;
              const doneCount = tasks.filter((t) => t.folder_id === folder.id && t.status === 'done').length;
              return (
                <motion.div key={folder.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-container-low rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => setSelectedFolder(folder.id)}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (folder.color || '#4BE277') + '20' }}>
                      <FolderOpen className="w-5 h-5" style={{ color: folder.color || '#4BE277' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{folder.name}</h3>
                      <p className="text-[10px] text-on-surface-variant">{count} tarea{count !== 1 ? 's' : ''} · {doneCount} hecha{doneCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setSharingFolder(folder.id); }}
                        className="p-1.5 rounded-lg hover:bg-surface-container-highest">
                        <Users className="w-3.5 h-3.5 text-on-surface-variant/40" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setMenuFolder(menuFolder === folder.id ? null : folder.id); }}
                        className="p-1.5 rounded-lg hover:bg-surface-container-highest">
                        <MoreVertical className="w-4 h-4 text-on-surface-variant" />
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {menuFolder === folder.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-3 flex gap-2">
                          <button onClick={() => { setSharingFolder(folder.id); setMenuFolder(null); }}
                            className="flex-1 py-2 rounded-lg bg-surface-container-high text-xs font-semibold text-on-surface-variant flex items-center justify-center gap-1">
                            <Users className="w-3 h-3" /> Compartir
                          </button>
                          <button onClick={() => handleDelete(folder.id)}
                            className="flex-1 py-2 rounded-lg bg-error/10 text-error text-xs font-semibold flex items-center justify-center gap-1">
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <FAB onClick={openCapture} />
      <TaskCaptureModal ref={captureModalRef} open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
      <AnimatePresence>{renderSharingModal()}</AnimatePresence>
    </div>
  );
};

export default FoldersPage;
