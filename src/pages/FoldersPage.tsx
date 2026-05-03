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

const FOLDER_COLORS = ['#0D0D0D', '#262626', '#595959', '#8C8C8C', '#BFBFBF', '#D9D9D9', '#E5E5E5', '#F2F2F2'];

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
          toast.success('Proyecto creado');
        },
        onError: () => toast.error('Error al crear proyecto'),
      }
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este proyecto?')) {
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
      toast.info('Ya compartido');
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
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 z-[80] backdrop-blur-sm" onClick={() => setSharingFolder(null)} />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
        >
          <div className="mx-auto w-full max-w-[400px] bg-[#F2F2F2] rounded-[32px] shadow-2xl border border-black/5 pointer-events-auto p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-[#0D0D0D] tracking-tight">Compartir</h2>
              <button onClick={() => setSharingFolder(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-4 h-4 text-[#8C8C8C]" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8C8C8C]">Miembros</p>
              <div className="space-y-2">
                {shares.map((share: any) => {
                  const profile = friendProfiles.find(p => p.user_id === share.shared_with_id);
                  return (
                    <div key={share.id} className="flex items-center justify-between p-3 bg-white/50 rounded-2xl border border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black">
                          {(profile?.name || profile?.email || 'A')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-black text-[#0D0D0D]">{profile?.name || profile?.email || 'Miembro'}</span>
                      </div>
                      <button onClick={() => handleRemoveShare(share.id)} className="text-[9px] font-black text-[#8C8C8C] hover:text-black">REVOCAR</button>
                    </div>
                  );
                })}
                {shares.length === 0 && <p className="text-[10px] text-[#8C8C8C] text-center py-2 italic">Solo tú tienes acceso</p>}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8C8C8C]">Invitar Amigos</p>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {friendProfiles
                  .filter(p => !sharedWithIds.includes(p.user_id))
                  .map((profile) => (
                    <button 
                      key={profile.user_id} 
                      onClick={() => handleShareWithFriend(profile.user_id)}
                      className="w-full flex items-center justify-between p-3 bg-black/5 rounded-2xl hover:bg-black/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#8C8C8C]/20 flex items-center justify-center text-[10px] font-black text-[#0D0D0D]">
                          {(profile?.name || profile?.email || 'A')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-black text-[#0D0D0D]">{profile.name || profile.email}</span>
                      </div>
                      <Plus className="w-4 h-4 text-black" />
                    </button>
                  ))}
                {friendProfiles.length === 0 && <p className="text-[10px] text-[#8C8C8C] text-center py-2 italic">No tienes amigos para invitar</p>}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderCreateModal = () => (
    <AnimatePresence>
      {showCreate && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]" onClick={() => setShowCreate(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }} className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-[#F2F2F2] w-full max-w-[360px] p-8 rounded-[32px] border border-black/5 shadow-2xl space-y-8 pointer-events-auto">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-[#0D0D0D] tracking-tight">Nuevo Proyecto</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8C8C8C]">Organización minimalista</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#8C8C8C] ml-1">Nombre</p>
                  <input 
                    autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: Personal, Trabajo..."
                    className="w-full bg-white/50 border border-black/5 rounded-2xl p-4 text-[#0D0D0D] text-lg font-black outline-none focus:bg-white transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()} 
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#8C8C8C] ml-1">Estética</p>
                  <div className="grid grid-cols-4 gap-3">
                    {FOLDER_COLORS.map((c) => (
                      <button key={c} onClick={() => setNewColor(c)} className={cn("h-10 rounded-xl transition-all relative flex items-center justify-center", newColor === c ? 'ring-2 ring-black ring-offset-2 ring-offset-[#F2F2F2]' : 'hover:scale-105')} style={{ backgroundColor: c }}>
                        {newColor === c && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-4 rounded-2xl bg-black/5 text-[#8C8C8C] text-[10px] font-black hover:bg-black/10 transition-all">CERRAR</button>
                  <button onClick={handleCreate} className="flex-[2] py-4 rounded-2xl bg-black text-white text-[10px] font-black shadow-xl active:scale-95 transition-all">CREAR ESPACIO</button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (selectedFolder && currentFolder) {
    const count = folderTasks.length;
    const doneCount = folderTasks.filter((t) => t.status === 'done').length;
    const progress = count > 0 ? (doneCount / count) * 100 : 0;

    return (
      <div className="min-h-screen bg-[#F2F2F2] text-[#0D0D0D]">
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-32 space-y-12">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-6">
            <button onClick={() => setSelectedFolder(null)} className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center hover:scale-105 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-[#8C8C8C] uppercase tracking-[0.3em] mb-1">PROYECTO</p>
              <h1 className="text-3xl font-black tracking-tighter truncate leading-none">{currentFolder.name}</h1>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setSharingFolder(currentFolder.id)} className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", shares.length > 0 ? 'bg-black text-white' : 'bg-black/5 text-[#8C8C8C]')}>
                <Users className="w-5 h-5" />
              </button>
              <button onClick={() => { setEditingFolder(currentFolder.id); setNewName(currentFolder.name); setNewColor(currentFolder.color || FOLDER_COLORS[0]); setShowCreate(true); }} className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-[#8C8C8C]">
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3 bg-white/40 border border-black/5 rounded-[32px] p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-[#8C8C8C]">Lista de Tareas</h2>
                <button onClick={openCapture} className="text-[10px] font-black text-black flex items-center gap-2 hover:underline"><Plus className="w-4 h-4" /> AÑADIR</button>
              </div>

              {folderTasks.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center mx-auto"><FolderOpen className="w-6 h-6 text-[#8C8C8C]/20" /></div>
                  <p className="text-[#8C8C8C] text-xs font-black">VACÍO</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {folderTasks.map((task) => {
                    const isDone = task.status === 'done';
                    return (
                      <div key={task.id} onClick={() => setSelectedTask(task)} className={cn("group p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border", isDone ? 'bg-black/5 border-transparent opacity-40' : 'bg-white border-black/5 hover:border-black/20 shadow-sm')}>
                        <button onClick={(e) => { e.stopPropagation(); handleComplete(task.id, e); }} className={cn("w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center flex-shrink-0", isDone ? 'bg-black border-black' : 'border-black/10')}>
                          {isDone && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn("text-sm font-black truncate", isDone && 'line-through opacity-40')}>{task.title}</h4>
                          {task.due_date && <p className="text-[8px] font-black text-[#8C8C8C] uppercase tracking-widest mt-0.5">{task.due_date}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-[32px] p-6 border border-black/5 space-y-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8C8C8C]">Progreso</p>
                <div className="space-y-2">
                  <p className="text-4xl font-black tabular-nums tracking-tighter">{Math.round(progress)}%</p>
                  <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-black" />
                  </div>
                  <p className="text-[9px] font-black text-[#8C8C8C] uppercase tracking-widest">{doneCount} / {count} HECHAS</p>
                </div>
              </div>

              {shares.length > 0 && (
                <div className="bg-black text-white rounded-[32px] p-6 space-y-4 shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Colaborando</p>
                  <div className="flex -space-x-2">
                    {shares.slice(0, 4).map((s: any) => {
                      const profile = friendProfiles.find(p => p.user_id === s.shared_with_id);
                      return (
                        <div key={s.id} className="w-8 h-8 rounded-full bg-white text-black border-2 border-black flex items-center justify-center text-[10px] font-black">
                          {(profile?.name || profile?.email || 'A')[0].toUpperCase()}
                        </div>
                      );
                    })}
                    {shares.length > 4 && <div className="w-8 h-8 rounded-full bg-[#262626] text-white border-2 border-black flex items-center justify-center text-[10px] font-black">+{shares.length - 4}</div>}
                  </div>
                  <button onClick={() => setSharingFolder(currentFolder.id)} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase transition-all">GESTIONAR</button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <FAB onTextClick={openCapture} onVoiceClick={openCaptureInVoiceMode} />
        <TaskCaptureModal ref={captureModalRef} open={captureOpen} onClose={() => setCaptureOpen(false)} folderId={selectedFolder} creationSource="fab" />
        <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
        {renderSharingModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#0D0D0D]">
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-32 space-y-16">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#8C8C8C]">ESTRUCTURA</p>
            <h1 className="text-5xl font-black tracking-tighter">Proyectos</h1>
          </div>
          <button onClick={() => setShowCreate(true)} className="w-14 h-14 rounded-[22px] bg-black text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all">
            <Plus className="w-7 h-7" strokeWidth={3} />
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="py-32 text-center space-y-8 bg-white/50 rounded-[40px] border-2 border-dashed border-black/5">
            <FolderOpen className="w-16 h-16 text-black/5 mx-auto" />
            <div className="space-y-2">
              <p className="font-black text-2xl tracking-tight">Tu espacio está vacío</p>
              <p className="text-[#8C8C8C] text-sm font-medium">Crea proyectos para agrupar tus tareas más importantes.</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="px-10 py-4 rounded-2xl bg-black text-white text-[11px] font-black shadow-xl hover:scale-105 transition-all">EMPEZAR AHORA</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {folders.map((folder) => {
              const folderTasksList = tasks.filter((t) => t.folder_id === folder.id);
              const count = folderTasksList.length;
              const doneCount = folderTasksList.filter((t) => t.status === 'done').length;
              const progress = count > 0 ? (doneCount / count) * 100 : 0;

              return (
                <div key={folder.id} onClick={() => setSelectedFolder(folder.id)} className="bg-white hover:bg-black group p-8 rounded-[40px] border border-black/5 shadow-sm cursor-pointer transition-all duration-500 flex flex-col justify-between min-h-[260px] relative overflow-hidden">
                  <div className="flex items-start justify-between relative z-10">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black/5 group-hover:bg-white/10 transition-colors">
                      <FolderOpen className="w-6 h-6 text-black group-hover:text-white" />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setMenuFolder(menuFolder === folder.id ? null : folder.id); }} className="p-2 text-[#8C8C8C] group-hover:text-white/40 transition-colors"><MoreVertical className="w-4 h-4" /></button>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <h3 className="text-xl font-black tracking-tight truncate group-hover:text-white transition-colors">{folder.name}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:text-white transition-colors">
                        <span>{count} TAREAS</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/5 group-hover:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-black group-hover:bg-white transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {menuFolder === folder.id && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-8 top-16 z-[30] bg-white rounded-2xl shadow-2xl border border-black/5 p-2 min-w-[140px]">
                        <button onClick={(e) => { e.stopPropagation(); setEditingFolder(folder.id); setNewName(folder.name); setNewColor(folder.color || FOLDER_COLORS[0]); setShowCreate(true); setMenuFolder(null); }} className="w-full text-left px-4 py-2 rounded-xl hover:bg-black/5 text-[10px] font-black text-black">EDITAR</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }} className="w-full text-left px-4 py-2 rounded-xl hover:bg-red-50 text-[10px] font-black text-red-500">ELIMINAR</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <FAB onTextClick={openCapture} onVoiceClick={openCaptureInVoiceMode} />
      <TaskCaptureModal ref={captureModalRef} open={captureOpen} onClose={() => setCaptureOpen(false)} creationSource="fab" />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      {renderCreateModal()}
      {renderSharingModal()}
    </div>
  );
};

export default FoldersPage;
