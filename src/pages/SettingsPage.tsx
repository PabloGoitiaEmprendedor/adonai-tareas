import { useState, useEffect, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeProvider';
import { useNavigate } from 'react-router-dom';
import { 
    LogOut, 
    Moon, 
    ChevronDown, 
    Sparkles,
    Zap,
    Clock,
    BellRing,
    Play,
    Settings,
    ChevronLeft,
    RefreshCw,
    Link as LinkIcon,
    Notebook,
    Check,
    ArrowLeft,
    ArrowRight,
    X,
    Calendar,
    FileSpreadsheet,
    Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NotionImportTask, useNotionIntegration } from '@/hooks/useNotionIntegration';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useSheetsIntegration } from '@/hooks/useSheetsIntegration';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { replayVideoTutorial } from '@/lib/videoTutorial';
import { isCapacitor, requestLocalNotificationPermission } from '@/lib/mobileNotifications';

const SettingsPage = () => {
  const { user: currentUser } = useAuth();
  const { profile, updateProfile } = useProfile(currentUser?.id);
  const { setTheme: setAppTheme } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const notion = useNotionIntegration();
  const calendar = useCalendarIntegration();
  const sheets = useSheetsIntegration();
  const { colors: priorityColors } = usePriorityColors();
  const isAdmin = currentUser?.email === 'pablogoitiaemprendedor@gmail.com';
  
  const [sheetUrl, setSheetUrl] = useState('');

  const [editingField, setEditingField] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('adonai_notifications_enabled') !== 'false');
  const [streakEnabled, setStreakEnabled] = useState(() => localStorage.getItem('adonai_notif_streak') !== 'false');
  const [healthEnabled, setHealthEnabled] = useState(() => localStorage.getItem('adonai_notif_health') !== 'false');
  const [selectedNotionSources, setSelectedNotionSources] = useState<string[]>([]);
  const [notionImportTasks, setNotionImportTasks] = useState<NotionImportTask[]>([]);
  const [notionReviewTaskIds, setNotionReviewTaskIds] = useState<string[]>([]);
  const autoPreparedNotionRef = useRef(false);

  useEffect(() => {
    const fetchAutoStart = async () => {
      if ((window as any).electronAPI?.getAutoStart) {
        const isEnabled = await (window as any).electronAPI.getAutoStart();
        setAutoStart(isEnabled);
      }
    };
    fetchAutoStart();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('adonai_onboarding_done');
      navigate('/auth');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const themeOptions = [
    { value: 'dark', label: 'Oscuro' },
    { value: 'light', label: 'Claro' },
    { value: 'system', label: 'Sistema' },
  ];

  const themeLabels: Record<string, string> = { dark: 'Oscuro', light: 'Claro', system: 'Sistema' };

  useEffect(() => {
    if (notion.databases.length === 0) return;

    const availableIds = new Set(notion.databases.map((database) => database.data_source_id));
    const selectedUniqueIds = Array.from(new Set(selectedNotionSources)).filter((id) => availableIds.has(id));

    if (selectedUniqueIds.length !== selectedNotionSources.length) {
      setSelectedNotionSources(selectedUniqueIds);
      return;
    }

    if (selectedNotionSources.length === 0) {
      const preselected = notion.databases
        .filter((database) => database.selected)
        .map((database) => database.data_source_id);
      setSelectedNotionSources(preselected.length > 0 ? preselected : notion.databases.map((database) => database.data_source_id));
    }
  }, [notion.databases, selectedNotionSources.length]);

  const handleNotionSync = async () => {
    const dataSourceIds = selectedNotionSources.length > 0
      ? selectedNotionSources
      : notion.databases.map((database) => database.data_source_id);

    if (dataSourceIds.length === 0) {
      toast.error('No hay bases disponibles. En Notion, comparte una base de datos con Adonai y vuelve a conectar.');
      return;
    }

    try {
      setSelectedNotionSources(dataSourceIds);
      const result = await notion.previewImport.mutateAsync(dataSourceIds);
      setNotionImportTasks(result.tasks);
      setNotionReviewTaskIds(result.tasks.filter((task) => task.missing.length > 0).map((task) => task.notion_page_id));
      if (result.review_count > 0) {
        toast.success(
          result.new_count
            ? `Notion agrego ${result.new_count} ${result.new_count === 1 ? 'tarea nueva' : 'tareas nuevas'}; revisa lo que falta`
            : `${result.review_count} tareas necesitan fecha o prioridad`
        );
        return;
      }

      const imported = await notion.importReviewed.mutateAsync(result.tasks);
      setNotionImportTasks([]);
      setNotionReviewTaskIds([]);
      toast.success(`Notion sincronizado: ${imported.tasks_created} nuevas, ${imported.tasks_updated} actualizadas`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo sincronizar Notion';
      toast.error(message);
    }
  };

  useEffect(() => {
    const returnedFromNotion = window.location.hash.includes('notion=connected');
    if (!returnedFromNotion || autoPreparedNotionRef.current || notion.databases.length === 0) return;

    const dataSourceIds = notion.databases.map((database) => database.data_source_id);
    if (dataSourceIds.length === 0) return;

    autoPreparedNotionRef.current = true;
    setSelectedNotionSources(dataSourceIds);

    notion.previewImport.mutateAsync(dataSourceIds)
      .then(async (result) => {
        setNotionImportTasks(result.tasks);
        setNotionReviewTaskIds(result.tasks.filter((task) => task.missing.length > 0).map((task) => task.notion_page_id));
        if (result.review_count > 0) {
          toast.success(
            result.new_count
              ? `Notion agrego ${result.new_count} ${result.new_count === 1 ? 'tarea nueva' : 'tareas nuevas'}; revisa lo que falta`
              : `${result.review_count} tareas necesitan fecha o prioridad`
          );
          return;
        }

        const imported = await notion.importReviewed.mutateAsync(result.tasks);
        setNotionImportTasks([]);
        setNotionReviewTaskIds([]);
        toast.success(`Notion sincronizado: ${imported.tasks_created} nuevas, ${imported.tasks_updated} actualizadas`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'No se pudo preparar Notion';
        toast.error(message);
      })
      .finally(() => {
        navigate('/settings', { replace: true });
      });
  }, [navigate, notion.databases]);

  const reviewTasks = notionImportTasks.filter((task) => notionReviewTaskIds.includes(task.notion_page_id));
  const allReviewTasksReady = reviewTasks.every((task) => task.due_date && task.urgency !== null && task.importance !== null);
  const readyReviewTasksCount = reviewTasks.filter((task) => task.due_date && task.urgency !== null && task.importance !== null).length;
  const reviewGroupsMap = reviewTasks.reduce<Record<string, { key: string; title: string; tasks: NotionImportTask[] }>>((groups, task) => {
    const key = task.data_source_id || task.database_id || task.database_title || 'notion';
    groups[key] = groups[key] || {
      key,
      title: task.database_title || 'Base de Notion',
      tasks: [],
    };
    groups[key].tasks.push(task);
    return groups;
  }, {});
  const reviewGroups = Object.values(reviewGroupsMap);
  const reviewGroupKeys = reviewGroups.map((group) => group.key);
  const [activeNotionReviewGroup, setActiveNotionReviewGroup] = useState<string | null>(null);
  const [activeNotionReviewIndex, setActiveNotionReviewIndex] = useState(0);

  useEffect(() => {
    if (reviewGroupKeys.length > 0 && (!activeNotionReviewGroup || !reviewGroupsMap[activeNotionReviewGroup])) {
      setActiveNotionReviewGroup(reviewGroupKeys[0]);
      setActiveNotionReviewIndex(0);
    }
  }, [reviewGroupKeys.join('|'), activeNotionReviewGroup]);

  const activeReviewGroup = activeNotionReviewGroup ? reviewGroupsMap[activeNotionReviewGroup] : reviewGroups[0];
  const activeReviewTasks = activeReviewGroup?.tasks || [];
  const activeReviewTask = activeReviewTasks[Math.min(activeNotionReviewIndex, Math.max(activeReviewTasks.length - 1, 0))];
  const activeReviewTaskIndex = activeReviewTask
    ? activeReviewTasks.findIndex((task) => task.notion_page_id === activeReviewTask.notion_page_id)
    : 0;
  const activeReviewTaskReady = !!activeReviewTask?.due_date && activeReviewTask?.urgency !== null && activeReviewTask?.importance !== null;
  const activeReviewGlobalIndex = activeReviewTask
    ? Math.max(0, reviewTasks.findIndex((task) => task.notion_page_id === activeReviewTask.notion_page_id))
    : 0;
  const activeReviewGroupIndex = activeReviewGroup ? reviewGroups.findIndex((group) => group.key === activeReviewGroup.key) : 0;
  const canGoToPreviousReviewTask = activeReviewGroupIndex > 0 || activeReviewTaskIndex > 0;
  const canGoToNextReviewTask = activeReviewGroupIndex < reviewGroups.length - 1 || activeReviewTaskIndex < activeReviewTasks.length - 1;
  const selectedDatabaseCount = selectedNotionSources.length || notion.databases.length;
  const notionLoadLabel = selectedDatabaseCount === 1 ? 'Cargar base de datos' : 'Cargar bases de datos';
  const reviewProgressPercent = reviewTasks.length > 0
    ? Math.max(3, ((activeReviewGlobalIndex + (activeReviewTaskReady ? 1 : 0)) / reviewTasks.length) * 100)
    : 0;
  const activeReviewPrimaryLink = activeReviewTask?.link?.split(/\s+/).find(Boolean) || null;
  const missingActiveReviewFields = [
    !activeReviewTask?.due_date ? 'fecha' : null,
    activeReviewTask?.urgency === null || activeReviewTask?.importance === null ? 'prioridad' : null,
  ].filter(Boolean);

  const showActiveReviewMissingToast = () => {
    toast.message(`Falta ${missingActiveReviewFields.join(' y ')}`);
  };

  const closeNotionReview = () => {
    setNotionImportTasks([]);
    setNotionReviewTaskIds([]);
    setActiveNotionReviewGroup(null);
    setActiveNotionReviewIndex(0);
  };

  const goToPreviousNotionReviewTask = () => {
    if (activeReviewTaskIndex > 0) {
      setActiveNotionReviewIndex(activeReviewTaskIndex - 1);
      return;
    }

    const previousGroup = reviewGroups[activeReviewGroupIndex - 1];
    if (previousGroup) {
      setActiveNotionReviewGroup(previousGroup.key);
      setActiveNotionReviewIndex(Math.max(previousGroup.tasks.length - 1, 0));
    }
  };

  const goToNextNotionReviewTask = () => {
    if (activeReviewTaskIndex < activeReviewTasks.length - 1) {
      setActiveNotionReviewIndex(activeReviewTaskIndex + 1);
      return;
    }

    const nextGroup = reviewGroups[activeReviewGroupIndex + 1];
    if (nextGroup) {
      setActiveNotionReviewGroup(nextGroup.key);
      setActiveNotionReviewIndex(0);
    }
  };

  const handleNextNotionReviewTask = () => {
    if (!activeReviewTaskReady) {
      showActiveReviewMissingToast();
      return;
    }

    goToNextNotionReviewTask();
  };

  const handleSaveNotionReview = () => {
    if (!activeReviewTaskReady) {
      showActiveReviewMissingToast();
      return;
    }

    confirmNotionImport();
  };

  const updateNotionImportTask = (pageId: string, updates: Partial<NotionImportTask>) => {
    setNotionImportTasks((current) =>
      current.map((task) => {
        if (task.notion_page_id !== pageId) return task;
        const next = { ...task, ...updates };
        return {
          ...next,
          missing: [
            !next.due_date ? 'due_date' : null,
            next.urgency === null || next.importance === null ? 'priority' : null,
          ].filter(Boolean) as string[],
        };
      })
    );
  };

  const confirmNotionImport = async () => {
    if (!allReviewTasksReady) {
      toast.error('Completa fecha, urgencia e importancia en todas las tareas');
      return;
    }

    try {
      const result = await notion.importReviewed.mutateAsync(notionImportTasks);
      setNotionImportTasks([]);
      setNotionReviewTaskIds([]);
      setActiveNotionReviewGroup(null);
      setActiveNotionReviewIndex(0);
      toast.success(`Importadas: ${result.tasks_created} nuevas, ${result.tasks_updated} actualizadas`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo importar Notion';
      toast.error(message);
    }
  };

  const handleNotionDisconnect = async () => {
    const confirmed = window.confirm('Esto desconectará Notion y borrará las tareas y cuadernos importados desde Notion. ¿Continuar?');
    if (!confirmed) return;

    try {
      await notion.disconnect.mutateAsync();
      setNotionImportTasks([]);
      setNotionReviewTaskIds([]);
      setActiveNotionReviewGroup(null);
      setActiveNotionReviewIndex(0);
      setSelectedNotionSources([]);
      toast.success('Notion desconectado y datos importados eliminados');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo desconectar Notion';
      toast.error(message);
    }
  };

  const OptionSelector = ({ field, options, currentValue, onSelect }: {
    field: string; options: { value: string; label: string }[]; currentValue: string; onSelect: (v: string) => void;
  }) => (
    <AnimatePresence>
      {editingField === field && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="px-4 pb-3 flex gap-2">
            {options.map((opt) => (
              <button key={opt.value} onClick={() => { onSelect(opt.value); setEditingField(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${currentValue === opt.value ? 'bg-primary text-primary-foreground' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 pb-24 space-y-6">
        
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-black tracking-tight">Ajustes</h1>
        </div>

        {/* Profile Section */}
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-container-highest overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-black text-on-surface-variant/40">
                {(profile?.name || currentUser?.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">
              {profile?.name || 'Usuario'}
            </p>
            <p className="text-xs text-on-surface-variant/50 truncate">
              {currentUser?.email || ''}
            </p>
          </div>
        </div>

        {/* Desktop Settings - Hide on mobile via CSS */}
        <div className="hidden md:block">
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <div>
                <span className="block text-sm font-bold text-foreground">Mini Ventana Automática</span>
                <p className="text-xs text-on-surface-variant/40">Se abre al iniciar tu ordenador</p>
              </div>
            </div>
            <button 
              onClick={() => {
                const next = !autoStart;
                setAutoStart(next);
                if ((window as any).electronAPI?.setAutoStart) {
                  (window as any).electronAPI.setAutoStart(next);
                }
                toast.success(next ? 'Inicio automático activado' : 'Inicio automático desactivado');
              }}
              className={`w-12 h-6 rounded-full relative transition-all border ${autoStart ? 'bg-primary border-primary' : 'bg-surface-container-high border-outline-variant/30'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${autoStart ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Appearance Section */}
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-[0.2em]">Configuración</h3>
                {currentUser?.email === 'pablogoitiaemprendedor@gmail.com' && (
                <button onClick={() => window.dispatchEvent(new CustomEvent('restart-adonai-tour'))} className="text-[10px] font-bold text-primary/60 hover:text-primary transition-colors">
                  Probar Tutorial
                </button>
                )}
            </div>
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden divide-y divide-outline-variant/10">
                <button onClick={() => setEditingField(editingField === 'theme' ? null : 'theme')} className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors">
                    <div className="flex items-center gap-3">
                      <Moon className="w-4 h-4 text-foreground/60" />
                      <span className="text-sm font-bold text-foreground">Apariencia</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">{themeLabels[profile?.theme || 'dark']}</span>
                      <ChevronDown className={`w-4 h-4 text-on-surface-variant/40 transition-transform ${editingField === 'theme' ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                <OptionSelector field="theme" options={themeOptions} currentValue={profile?.theme || 'dark'}
                    onSelect={(v) => { setAppTheme(v as 'dark' | 'light' | 'system'); updateProfile.mutate({ theme: v }); }} />
                <button onClick={replayVideoTutorial} className="w-full p-4 text-sm font-bold text-foreground hover:bg-surface-container-high transition-colors flex items-center gap-3">
                    <Play className="w-4 h-4 text-foreground/60" />
                    Ver tutorial
                </button>
                <button onClick={handleLogout} className="w-full p-4 text-sm font-bold text-tertiary/70 hover:text-tertiary hover:bg-tertiary-container/10 transition-colors flex items-center gap-3">
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                </button>
            </div>
        </section>

        {/* Integrations */}
        <section className="space-y-3">
            <h3 className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-[0.2em]">Integraciones</h3>
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center shrink-0">
                            <img src="/logos/notion.png" alt="Notion" className="w-5 h-5 object-contain" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="block text-sm font-bold text-foreground">Notion</span>
                            <span className="block text-xs text-on-surface-variant/40 max-w-[380px]">
                                Convierte tus bases de datos de Notion en cuadernos de Adonai e importa sus páginas como tareas.
                            </span>
                        </div>
                    </div>

                    <div className="self-stretch md:self-auto md:shrink-0">
                      {isAdmin ? (
                        <div className="flex flex-wrap gap-2">
                          {!notion.connection ? (
                            <button
                              onClick={() => notion.connect.mutate()}
                              disabled={notion.connect.isPending}
                              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
                            >
                              <LinkIcon className="w-4 h-4" />
                              Conectar
                            </button>
                          ) : (
                            <>
                              <button onClick={handleNotionSync} disabled={notion.previewImport.isPending || notion.importReviewed.isPending} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60">
                                <RefreshCw className={`w-4 h-4 ${notion.previewImport.isPending || notion.importReviewed.isPending ? 'animate-spin' : ''}`} />
                                {notionLoadLabel}
                              </button>
                              <button onClick={handleNotionDisconnect} disabled={notion.disconnect.isPending} className="h-10 px-4 rounded-xl bg-error/10 text-error text-xs font-bold disabled:opacity-60">
                                Desactivar
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant/40">Pronto</span>
                      )}
                    </div>
                </div>

                {isAdmin && notion.connection && notion.mappings.length > 0 && (
                  <div className="border-t border-outline-variant/10 p-4 space-y-2">
                    {notion.mappings.map((mapping) => (
                      <div key={mapping.id} className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground truncate">{mapping.notion_title}</span>
                        <span className="text-xs text-on-surface-variant/40">{mapping.last_synced_at ? 'Sincronizada' : 'Pendiente'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {isAdmin && notion.connection && notion.databases.length > 0 && (
                  <div className="border-t border-outline-variant/10 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface-variant/50">Bases disponibles</span>
                      <span className="text-xs font-bold text-primary">{selectedNotionSources.length} seleccionadas</span>
                    </div>
                    {notion.databases.map((database) => {
                      const checked = selectedNotionSources.includes(database.data_source_id);
                      return (
                        <button key={database.data_source_id} onClick={() => { setSelectedNotionSources((current) => current.includes(database.data_source_id) ? current.filter((id) => id !== database.data_source_id) : [...current, database.data_source_id]); }} className="w-full flex items-center justify-between gap-3 rounded-xl bg-surface-container-high/60 px-4 py-2.5 hover:bg-surface-container-high transition-colors">
                          <span className="text-sm font-bold text-foreground truncate text-left">{database.title}</span>
                          <span className={cn("w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors", checked ? "bg-primary border-primary text-primary-foreground" : "border-outline-variant/30")}>
                            <Check className="w-3 h-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isAdmin && notion.connection && !notion.isLoading && notion.databases.length === 0 && (
                  <div className="border-t border-outline-variant/10 p-4 space-y-3">
                    <p className="text-sm font-bold text-foreground">{notion.databasesError ? 'No se pudieron leer las bases' : 'No hay bases disponibles'}</p>
                    {notion.databasesError && <p className="text-xs text-on-surface-variant/50">{String((notion.databasesError as Error).message || notion.databasesError)}</p>}
                    <button onClick={() => notion.connect.mutate()} disabled={notion.connect.isPending} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60">
                      Elegir bases en Notion
                    </button>
                  </div>
                )}

                <AnimatePresence>
                  {reviewTasks.length > 0 && activeReviewTask && (
                    <motion.div className="fixed inset-0 z-[90] bg-background/70 backdrop-blur px-4 py-5 sm:px-6 sm:py-8 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <motion.div className="w-full max-w-[560px] mx-auto bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                        <div className="p-5 flex justify-end">
                          <button type="button" onClick={closeNotionReview} className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-foreground flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-5 pb-5 space-y-5">
                          <h4 className="text-xl font-bold text-foreground">{activeReviewTask.title || 'Tarea sin título'}</h4>
                          {activeReviewPrimaryLink && (
                            <a href={activeReviewPrimaryLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-surface-container-high border border-outline-variant/10 px-4 py-2.5 text-xs font-bold text-primary hover:bg-surface-container-high transition-colors">
                              <LinkIcon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{activeReviewPrimaryLink}</span>
                            </a>
                          )}
                          <div className="space-y-4">
                            <label className="space-y-1.5">
                              <span className="text-xs font-bold text-on-surface-variant/50">Fecha</span>
                              <input type="date" value={activeReviewTask.due_date || ''} onChange={(event) => updateNotionImportTask(activeReviewTask.notion_page_id, { due_date: event.target.value })} className="w-full h-12 bg-surface-container-high px-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/10" />
                            </label>
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-on-surface-variant/50">Prioridad</span>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => { updateNotionImportTask(activeReviewTask.notion_page_id, { importance: !(activeReviewTask.importance === true), urgency: activeReviewTask.urgency ?? false }); }} className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all ${activeReviewTask.importance === true ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' : 'bg-surface-container-high text-on-surface-variant/50 border-outline-variant/10'}`}>IMPORTANTE</button>
                                <button type="button" onClick={() => { updateNotionImportTask(activeReviewTask.notion_page_id, { urgency: !(activeReviewTask.urgency === true), importance: activeReviewTask.importance ?? false }); }} className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all ${activeReviewTask.urgency === true ? 'bg-red-500/15 text-red-600 border-red-500/30' : 'bg-surface-container-high text-on-surface-variant/50 border-outline-variant/10'}`}>URGENTE</button>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button type="button" onClick={goToPreviousNotionReviewTask} disabled={!canGoToPreviousReviewTask} className="h-11 px-4 rounded-xl bg-surface-container-high text-foreground text-xs font-bold disabled:opacity-30"><ArrowLeft className="w-4 h-4" /> Anterior</button>
                            {canGoToNextReviewTask ? (
                              <button type="button" onClick={handleNextNotionReviewTask} className="h-11 flex-1 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold">Siguiente <ArrowRight className="w-4 h-4" /></button>
                            ) : (
                              <button type="button" onClick={handleSaveNotionReview} disabled={notion.importReviewed.isPending} className="h-11 flex-1 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-45">{notion.importReviewed.isPending ? 'Guardando' : 'Guardar tareas'}</button>
                            )}
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                            <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${reviewProgressPercent}%` }} transition={{ duration: 0.5 }} />
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            {/* Google Calendar Integration */}
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden mt-3">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="block text-sm font-bold text-foreground">Google Calendar</span>
                            <span className="block text-xs text-on-surface-variant/40 max-w-[380px]">
                                Sincroniza tus eventos de Google Calendar con tus tareas.
                            </span>
                        </div>
                    </div>

                    <div className="self-stretch md:self-auto md:shrink-0">
                        <div className="flex flex-wrap gap-2">
                          {!calendar.connected ? (
                            <button onClick={() => { toast.loading('Iniciando conexión...'); calendar.connect.mutate(); }} disabled={calendar.connect.isPending} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60">
                              <LinkIcon className="w-4 h-4" />
                              Conectar
                            </button>
                          ) : (
                            <>
                              <button onClick={() => { toast.promise(calendar.sync.mutateAsync(), { loading: 'Sincronizando eventos...', success: 'Calendario sincronizado', error: 'Error al sincronizar' }); }} disabled={calendar.sync.isPending} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60">
                                <RefreshCw className={`w-4 h-4 ${calendar.sync.isPending ? 'animate-spin' : ''}`} />
                                {calendar.sync.isPending ? 'Sincronizando' : 'Sincronizar'}
                              </button>
                              <button onClick={() => { toast.promise(calendar.disconnect.mutateAsync(), { loading: 'Desconectando...', success: 'Google Calendar desconectado', error: 'Error' }); }} disabled={calendar.disconnect.isPending} className="h-10 px-4 rounded-xl bg-error/10 text-error text-xs font-bold disabled:opacity-60">
                                Desactivar
                              </button>
                            </>
                          )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Google Sheets Integration */}
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden mt-3">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="block text-sm font-bold text-foreground">Google Sheets</span>
                            <span className="block text-xs text-on-surface-variant/40 max-w-[380px]">
                                Vincula tus hojas de cálculo para importar tareas a Adonai.
                            </span>
                        </div>
                    </div>

                    <div className="self-stretch md:self-auto md:shrink-0">
                      {isAdmin ? (
                        <div className="flex flex-wrap gap-2">
                          {!sheets.connected && (
                            <button onClick={() => { toast.loading('Iniciando conexión...'); sheets.connect.mutate(); }} disabled={sheets.connect.isPending} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60">
                              <LinkIcon className="w-4 h-4" />
                              Conectar
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant/40">Pronto</span>
                      )}
                    </div>
                </div>

                {isAdmin && sheets.connected && (
                  <div className="border-t border-outline-variant/10 p-4 space-y-3">
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-on-surface-variant/50">Enlace de tu Google Sheet</span>
                      <div className="flex gap-2">
                        <input type="text" placeholder="URL de tu Google Sheet" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="flex-1 bg-surface-container-high px-4 py-2.5 rounded-xl text-xs font-bold outline-none border border-outline-variant/10 focus:border-primary/30 text-foreground placeholder:text-on-surface-variant/30" />
                        <button onClick={() => { if (!sheetUrl.trim()) { toast.error("Ingresa una URL válida"); return; } toast.promise(sheets.importSheets.mutateAsync(sheetUrl), { loading: 'Importando...', success: (data) => { setSheetUrl(''); return data.message; }, error: (err) => err.message || 'Error' }); }} disabled={sheets.importSheets.isPending} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60 shrink-0">
                          {sheets.importSheets.isPending ? 'Importando...' : 'Importar'}
                        </button>
                      </div>
                    </div>
                    <button onClick={() => { const c = window.confirm('¿Desconectar Google Sheets?'); if (c) { toast.promise(sheets.disconnect.mutateAsync(), { loading: 'Desconectando...', success: 'Google Sheets desconectado', error: 'Error' }); } }} disabled={sheets.disconnect.isPending} className="text-xs font-bold text-error/60 hover:text-error transition-colors">
                      Desactivar
                    </button>
                  </div>
                )}
            </div>
        </section>

        {/* Notification Settings */}
        <section className="space-y-3">
            <h3 className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-[0.2em]">Notificaciones</h3>
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden divide-y divide-outline-variant/10">
                
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BellRing className="w-4 h-4 text-foreground/60" />
                        <div>
                            <span className="block text-sm font-bold text-foreground">Notificaciones</span>
                            <span className="text-xs text-on-surface-variant/40">Notificaciones nativas en app de escritorio y móvil</span>
                        </div>
                    </div>
                    <button onClick={async () => {
                      const next = !notificationsEnabled;
                      if (next && isCapacitor()) {
                        await requestLocalNotificationPermission();
                      }
                      localStorage.setItem('adonai_notifications_enabled', String(next));
                      setNotificationsEnabled(next);
                      toast.success(next ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
                    }} className={`w-12 h-6 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notificationsEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
                
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-foreground/60" />
                        <div>
                            <span className="block text-sm font-bold text-foreground">Plan de Mañana</span>
                            <span className="text-xs text-on-surface-variant/40">Recordatorio para organizar el día</span>
                        </div>
                    </div>
                    <input type="time" defaultValue={localStorage.getItem('adonai_notif_bedtime') || '20:00'} onChange={(e) => localStorage.setItem('adonai_notif_bedtime', e.target.value)} className="bg-surface-container-high px-3 py-1.5 rounded-lg text-xs font-bold text-primary border-none outline-none" />
                </div>

                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <div>
                            <span className="block text-sm font-bold text-foreground">Protección de Racha</span>
                            <span className="text-xs text-on-surface-variant/40">Avisar si tu racha peligra</span>
                        </div>
                    </div>
                    <button onClick={() => { const next = !streakEnabled; localStorage.setItem('adonai_notif_streak', String(next)); setStreakEnabled(next); toast.success(next ? 'Protección activada' : 'Protección desactivada'); }} className={`w-12 h-6 rounded-full relative transition-colors ${streakEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${streakEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BellRing className="w-4 h-4 text-secondary/60" />
                        <div>
                            <span className="block text-sm font-bold text-foreground">Recordatorios de Salud</span>
                            <span className="text-xs text-on-surface-variant/40">Beber agua o descansar</span>
                        </div>
                    </div>
                    <button onClick={() => { const next = !healthEnabled; localStorage.setItem('adonai_notif_health', String(next)); setHealthEnabled(next); toast.success(next ? 'Recordatorios activados' : 'Recordatorios desactivados'); }} className={`w-12 h-6 rounded-full relative transition-colors ${healthEnabled ? 'bg-secondary' : 'bg-surface-container-highest'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${healthEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
            </div>
        </section>

        {/* Support Section */}
        <section className="space-y-3">
            <h3 className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-[0.2em]">Soporte</h3>
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
                <a 
                  href="https://wa.me/message/KIUXTXD5QBPEJ1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full p-4 flex items-center justify-between hover:bg-surface-container-high transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left">
                            <span className="block text-sm font-bold text-foreground group-hover:text-primary transition-colors">Contactar Soporte</span>
                            <span className="text-xs text-on-surface-variant/40">¿Tienes dudas o problemas? Háblanos</span>
                        </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-on-surface-variant/40 -rotate-90" />
                </a>
            </div>
        </section>

        {/* Updates Section (Desktop only) */}
        {!!window.electronAPI && <UpdateSection />}

        <div className="flex justify-center gap-3 pt-2 pb-4">
          <a href="/privacy" className="text-[10px] text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors">Privacidad</a>
          <span className="text-[10px] text-on-surface-variant/20">·</span>
          <a href="/terms" className="text-[10px] text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors">Términos</a>
        </div>
      </div>
    </div>
  );
};

function parseVersion(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(Number);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const a = l[i] ?? 0;
    const b = c[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

const UpdateSection = () => {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then(v => setCurrentVersion(v));
  }, []);

  const checkVersion = async () => {
    setChecking(true);
    try {
      const res = await fetch('https://api.github.com/repos/PabloGoitiaEmprendedor/adonai-tareas/releases/latest');
      const data = await res.json();
      const tag = data.tag_name?.replace(/^v/, '') || '';
      setLatestVersion(tag);
      if (tag && currentVersion && isNewer(tag, currentVersion)) {
        toast.success(`Nueva versión v${tag} disponible`);
      }
    } catch {
      window.electronAPI?.checkForUpdates?.();
    }
    setChecking(false);
  };

  const hasNewer = latestVersion && currentVersion && isNewer(latestVersion, currentVersion);

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-[0.2em]">Actualizaciones</h3>
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-foreground">Versión actual</span>
                <span className="text-xs text-on-surface-variant/40">v{currentVersion || '...'}</span>
              </div>
            </div>
            <button
              onClick={checkVersion}
              disabled={checking || !currentVersion}
              className="h-10 px-4 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {hasNewer && (
            <div className="flex gap-2">
              <a
                href={`https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/tag/v${latestVersion}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar v{latestVersion}
              </a>
            </div>
          )}
          {latestVersion && !hasNewer && (
            <p className="text-xs text-on-surface-variant/40 text-center">Tienes la última versión</p>
          )}
          <a
            href="https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-primary/60 hover:text-primary transition-colors"
          >
            Ver todas las versiones en GitHub
          </a>
        </div>
      </div>
    </section>
  );
};

export default SettingsPage;
