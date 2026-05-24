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
    FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NotionImportTask, useNotionIntegration } from '@/hooks/useNotionIntegration';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useSheetsIntegration } from '@/hooks/useSheetsIntegration';
import { usePriorityColors } from '@/hooks/usePriorityColors';

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
        window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}#/settings`);
      });
  }, [notion.databases]);

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
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 pb-24 space-y-8">
        
        <div className="flex items-center gap-4 mb-4 justify-center md:justify-start">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <h1 className="page-title">Ajustes</h1>
          </div>
        </div>

        {/* Desktop Settings - Hide on mobile via CSS */}
        <div className="hidden md:block">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-gradient-to-br from-primary/20 to-surface-container-low border border-primary/20 rounded-[32px] p-1 shadow-2xl shadow-primary/5">
                <div className="bg-surface-container-low rounded-[31px] overflow-hidden">
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[22px] bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Zap className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <span className="block font-black text-[15px] text-foreground uppercase tracking-tight">Mini Ventana Automática</span>
                                <p className="text-[11px] text-on-surface-variant/60 font-medium max-w-[200px]">Se abre al iniciar tu ordenador para que nunca olvides capturar tus ideas.</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <button 
                                onClick={() => {
                                    const next = !autoStart;
                                    setAutoStart(next);
                                    if ((window as any).electronAPI?.setAutoStart) {
                                        (window as any).electronAPI.setAutoStart(next);
                                    }
                                    toast.success(next ? 'Inicio automático activado' : 'Inicio automático desactivado', {
                                        icon: <Zap className="w-4 h-4 text-primary" />
                                    });
                                }}
                                className={cn(
                                    "w-16 h-8 rounded-full relative transition-all duration-500 border-2",
                                    autoStart 
                                        ? "bg-primary border-primary shadow-[0_0_20px_-5px_rgba(163,230,53,0.5)]" 
                                        : "bg-surface-container-highest border-outline-variant/30"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-lg flex items-center justify-center",
                                    autoStart ? "translate-x-8" : "translate-x-0"
                                )}>
                                    {autoStart && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </div>
                                <span className={cn(
                                    "absolute top-1/2 -translate-y-1/2 text-[8px] font-black tracking-widest transition-opacity duration-300",
                                    autoStart ? "left-2.5 text-black/40" : "right-2.5 text-on-surface-variant/40"
                                )}>
                                    {autoStart ? 'ON' : 'OFF'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-primary/5 border-t border-primary/10">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.1em]">
                                RECOMENDADO: MANTENER ACTIVADO PARA MÁXIMA PRODUCTIVIDAD
                            </p>
                        </div>
                    </div>
                </div>
            </div>
          </motion.section>
        </div>

        {/* Appearance Section */}
        <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em]">Configuración</h3>
                {currentUser?.email === 'pablogoitiaemprendedor@gmail.com' && (
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('restart-adonai-tour'))}
                    className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all"
                >
                    <Play className="w-3 h-3" />
                    Probar Tutorial
                </button>
                )}
            </div>
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] overflow-hidden">
                {/* Theme */}
                <div>
                <button onClick={() => setEditingField(editingField === 'theme' ? null : 'theme')} className="w-full flex items-center justify-between p-6 hover:bg-surface-container-high transition-colors">
                    <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center"><Moon className="w-6 h-6 text-foreground" /></div>
                    <span className="font-bold text-foreground">Apariencia</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <span className="text-sm text-primary font-black uppercase tracking-widest">{themeLabels[profile?.theme || 'dark']}</span>
                    <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform ${editingField === 'theme' ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                <OptionSelector field="theme" options={themeOptions} currentValue={profile?.theme || 'dark'}
                    onSelect={(v) => { setAppTheme(v as 'dark' | 'light' | 'system'); updateProfile.mutate({ theme: v }); }} />
                </div>

                <button onClick={handleLogout}
                    className="w-full p-6 text-tertiary font-black text-sm uppercase tracking-[0.2em] flex items-center gap-4 hover:bg-tertiary-container/10 transition-all border-t border-outline-variant/10">
                    <div className="w-12 h-12 rounded-[20px] bg-tertiary-container/20 flex items-center justify-center"><LogOut className="w-6 h-6" /></div>
                    Cerrar sesión
                </button>
            </div>
        </section>

        {/* Integrations */}
        <section className="space-y-4">
            <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] px-2">Integraciones</h3>
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-white border border-black/10 shadow-sm flex items-center justify-center shrink-0">
                            <img src="/logos/notion.png" alt="Notion" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="space-y-1">
                            <span className="block font-bold text-foreground">Notion</span>
                            <span className="block text-[11px] text-on-surface-variant/60 font-medium max-w-[420px]">
                                Convierte tus bases de datos de Notion en cuadernos de Adonai e importa sus páginas como tareas.
                            </span>
                        </div>
                    </div>

                    <div className="self-stretch md:self-auto md:shrink-0">
                      {isAdmin ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-2">
                          {!notion.connection ? (
                            <button
                              onClick={() => notion.connect.mutate()}
                              disabled={notion.connect.isPending}
                              className="w-full md:w-auto min-h-12 px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                              <LinkIcon className="w-4 h-4" />
                              Conectar
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={handleNotionSync}
                                disabled={notion.previewImport.isPending || notion.importReviewed.isPending}
                                className="w-full md:w-auto min-h-12 px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 whitespace-normal text-center leading-tight"
                              >
                                <RefreshCw className={`w-4 h-4 ${notion.previewImport.isPending || notion.importReviewed.isPending ? 'animate-spin' : ''}`} />
                                {notionLoadLabel}
                              </button>
                              <button
                                onClick={handleNotionDisconnect}
                                disabled={notion.disconnect.isPending}
                                className="w-full md:w-auto min-h-12 px-4 py-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/30 text-xs font-black uppercase tracking-widest disabled:opacity-60 hover:bg-red-500/15 transition-colors"
                              >
                                Desactivar
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-on-surface-variant/50">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Pronto</span>
                        </div>
                      )}
                    </div>
                </div>

                {isAdmin && notion.connection && notion.mappings.length > 0 && (
                  <div className="border-t border-outline-variant/10 px-6 py-4 space-y-3">
                    {notion.mappings.map((mapping) => (
                      <div key={mapping.id} className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-foreground truncate">{mapping.notion_title}</span>
                        <span className="text-[9px] text-on-surface-variant/50 font-black uppercase tracking-widest shrink-0">
                          {mapping.last_synced_at ? 'Sincronizada' : 'Pendiente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {isAdmin && notion.connection && notion.databases.length > 0 && (
                  <div className="border-t border-outline-variant/10 px-6 py-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">Bases disponibles</span>
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedNotionSources.length} seleccionadas</span>
                    </div>
                    {notion.databases.map((database) => {
                      const checked = selectedNotionSources.includes(database.data_source_id);
                      return (
                        <button
                          key={database.data_source_id}
                          onClick={() => {
                            setSelectedNotionSources((current) =>
                              current.includes(database.data_source_id)
                                ? current.filter((id) => id !== database.data_source_id)
                                : [...current, database.data_source_id]
                            );
                          }}
                          className="w-full flex items-center justify-between gap-4 rounded-2xl bg-surface-container-high/60 px-4 py-3 hover:bg-surface-container-high transition-colors"
                        >
                          <span className="text-sm font-bold text-foreground truncate text-left">{database.title}</span>
                          <span className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                            checked ? "bg-primary border-primary text-primary-foreground" : "border-outline-variant/50 text-transparent"
                          )}>
                            <Check className="w-3 h-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isAdmin && notion.connection && !notion.isLoading && notion.databases.length === 0 && (
                  <div className="border-t border-outline-variant/10 px-6 py-5 space-y-3">
                    <div className="rounded-2xl bg-surface-container-high/60 border border-outline-variant/10 p-4">
                      <span className="block text-sm font-black text-foreground">
                        {notion.databasesError ? 'No se pudieron leer las bases' : 'No hay bases disponibles'}
                      </span>
                      <span className="block text-xs text-on-surface-variant/60 mt-1">
                        {notion.databasesError
                          ? String((notion.databasesError as Error).message || notion.databasesError)
                          : 'Vuelve a conectar Notion y asegúrate de seleccionar al menos una base de datos o una página que contenga bases.'}
                      </span>
                    </div>
                    <button
                      onClick={() => notion.connect.mutate()}
                      disabled={notion.connect.isPending}
                      className="w-full px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest disabled:opacity-60"
                    >
                      Elegir bases en Notion
                    </button>
                  </div>
                )}

                <AnimatePresence>
                  {reviewTasks.length > 0 && activeReviewTask && (
                    <motion.div
                      className="fixed inset-0 z-[90] bg-background/70 backdrop-blur-2xl px-4 py-5 sm:px-6 sm:py-8 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="w-full max-w-[560px] mx-auto bg-surface-container-low border border-outline-variant/20 rounded-[28px] shadow-2xl shadow-black/40 overflow-hidden"
                        initial={{ opacity: 0, y: 18, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                      >
                        <div className="px-5 pt-4 sm:px-6 flex justify-end">
                          <button
                            type="button"
                            onClick={closeNotionReview}
                            className="w-9 h-9 rounded-full bg-surface-container-highest/80 text-on-surface-variant hover:text-foreground flex items-center justify-center transition-colors"
                            aria-label="Cerrar revision de Notion"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <div className="p-5 sm:p-6 space-y-5">
                            <div className="space-y-2">
                              <h4 className="text-2xl sm:text-3xl font-black text-foreground leading-tight tracking-tight">
                                {activeReviewTask.title || 'Tarea sin titulo'}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                                <Notebook className="w-4 h-4" />
                                {activeReviewGroup?.title || activeReviewTask.database_title || 'Base de Notion'}
                              </div>
                            </div>

                            {activeReviewPrimaryLink && (
                              <a
                                href={activeReviewPrimaryLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-2xl bg-surface-container-high/55 border border-outline-variant/10 px-4 py-3 text-xs font-bold text-primary hover:bg-surface-container-high transition-colors"
                              >
                                <LinkIcon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{activeReviewPrimaryLink}</span>
                              </a>
                            )}

                            <div className="grid gap-5">
                              <label className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Fecha obligatoria</span>
                                <input
                                  type="date"
                                  value={activeReviewTask.due_date || ''}
                                  onChange={(event) => updateNotionImportTask(activeReviewTask.notion_page_id, { due_date: event.target.value })}
                                  className="w-full h-14 bg-surface-container-highest px-4 rounded-2xl text-base font-black outline-none focus:ring-2 focus:ring-primary/50 border border-outline-variant/10"
                                />
                              </label>

                              <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Prioridad obligatoria</span>
                                <div className="grid grid-cols-2 gap-3">
                                  <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => {
                                      const importance = !(activeReviewTask.importance === true);
                                      updateNotionImportTask(activeReviewTask.notion_page_id, {
                                        importance,
                                        urgency: activeReviewTask.urgency ?? false,
                                      });
                                    }}
                                    className={cn(
                                      "flex flex-col items-center justify-center gap-1 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border h-14",
                                      activeReviewTask.importance === true
                                        ? "bg-amber-500/20 text-amber-600 border-amber-500/50 shadow-lg shadow-amber-500/10"
                                        : "bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5"
                                    )}
                                  >
                                    IMPORTANTE
                                  </motion.button>
                                  <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => {
                                      const urgency = !(activeReviewTask.urgency === true);
                                      updateNotionImportTask(activeReviewTask.notion_page_id, {
                                        urgency,
                                        importance: activeReviewTask.importance ?? false,
                                      });
                                    }}
                                    className={cn(
                                      "flex flex-col items-center justify-center gap-1 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border h-14",
                                      activeReviewTask.urgency === true
                                        ? "bg-red-500/20 text-red-600 border-red-500/50 shadow-lg shadow-red-500/10"
                                        : "bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5"
                                    )}
                                  >
                                    URGENTE
                                  </motion.button>
                                </div>
                                <button
                                  type="button"
                                  aria-pressed={activeReviewTask.urgency === false && activeReviewTask.importance === false}
                                  onClick={() => updateNotionImportTask(activeReviewTask.notion_page_id, {
                                    urgency: false,
                                    importance: false,
                                  })}
                                  className={cn(
                                    "w-full h-10 rounded-[22px] border text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                    activeReviewTask.urgency === false && activeReviewTask.importance === false
                                      ? "bg-surface-container-highest text-muted-foreground border-outline-variant shadow-sm"
                                      : "bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5"
                                  )}
                                >
                                  {activeReviewTask.urgency === false && activeReviewTask.importance === false && (
                                    <Check className="w-3 h-3" />
                                  )}
                                  No importante ni urgente
                                </button>
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                onClick={goToPreviousNotionReviewTask}
                                disabled={!canGoToPreviousReviewTask}
                                className="h-14 px-4 rounded-2xl bg-surface-container-highest text-foreground text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <ArrowLeft className="w-4 h-4" />
                                Anterior
                              </button>
                              {canGoToNextReviewTask ? (
                                <button
                                  type="button"
                                  onClick={handleNextNotionReviewTask}
                                  className="h-14 flex-1 px-4 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                  Siguiente
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleSaveNotionReview}
                                  disabled={notion.importReviewed.isPending}
                                  className="h-14 flex-1 px-5 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest disabled:opacity-45 disabled:cursor-not-allowed"
                                >
                                  {notion.importReviewed.isPending ? 'Guardando' : 'Guardar tareas'}
                                </button>
                              )}
                            </div>
                            <div
                              className="h-2 overflow-hidden rounded-full bg-surface-container-highest"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(reviewProgressPercent)}
                            >
                              <motion.div
                                className="h-full rounded-full bg-primary"
                                initial={false}
                                animate={{ width: `${reviewProgressPercent}%` }}
                                transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            {/* Google Calendar Integration */}
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] overflow-hidden mt-4">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-white border border-black/10 shadow-sm flex items-center justify-center shrink-0">
                            <Calendar className="w-7 h-7 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <span className="block font-bold text-foreground">Google Calendar</span>
                            <span className="block text-[11px] text-on-surface-variant/60 font-medium max-w-[420px]">
                                Sincroniza tus eventos de Google Calendar con tus tareas y administra todo en un solo lugar.
                            </span>
                        </div>
                    </div>

                    <div className="self-stretch md:self-auto md:shrink-0">
                      {isAdmin ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-2">
                          {!calendar.connected ? (
                            <button
                              onClick={() => {
                                toast.loading('Iniciando conexión...');
                                calendar.connect.mutate();
                              }}
                              disabled={calendar.connect.isPending}
                              className="w-full md:w-auto min-h-12 px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                              <LinkIcon className="w-4 h-4" />
                              Conectar
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  toast.promise(calendar.sync.mutateAsync(), {
                                    loading: 'Sincronizando eventos...',
                                    success: 'Calendario sincronizado correctamente',
                                    error: 'Error al sincronizar calendario',
                                  });
                                }}
                                disabled={calendar.sync.isPending}
                                className="w-full md:w-auto min-h-12 px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 whitespace-normal text-center leading-tight"
                              >
                                <RefreshCw className={`w-4 h-4 ${calendar.sync.isPending ? 'animate-spin' : ''}`} />
                                {calendar.sync.isPending ? 'Sincronizando' : 'Sincronizar ahora'}
                              </button>
                              <button
                                onClick={() => {
                                  toast.promise(calendar.disconnect.mutateAsync(), {
                                    loading: 'Desconectando...',
                                    success: 'Google Calendar desconectado',
                                    error: 'Error al desconectar',
                                  });
                                }}
                                disabled={calendar.disconnect.isPending}
                                className="w-full md:w-auto min-h-12 px-4 py-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/30 text-xs font-black uppercase tracking-widest disabled:opacity-60 hover:bg-red-500/15 transition-colors"
                              >
                                Desactivar
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-on-surface-variant/50">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Pronto</span>
                        </div>
                      )}
                    </div>
                </div>
            </div>

            {/* Google Sheets Integration */}
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] overflow-hidden mt-4">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 shadow-sm flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                        </div>
                        <div className="space-y-1">
                            <span className="block font-bold text-foreground">Google Sheets</span>
                            <span className="block text-[11px] text-on-surface-variant/60 font-medium max-w-[420px]">
                                Vincula tus hojas de cálculo para importar todas tus tareas improvisadas y administrarlas definitivamente en Adonai.
                            </span>
                        </div>
                    </div>

                    <div className="self-stretch md:self-auto md:shrink-0">
                      {isAdmin ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-2">
                          {!sheets.connected && (
                            <button
                              onClick={() => {
                                toast.loading('Iniciando conexión...');
                                sheets.connect.mutate();
                              }}
                              disabled={sheets.connect.isPending}
                              className="w-full md:w-auto min-h-12 px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                              <LinkIcon className="w-4 h-4" />
                              Conectar
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-on-surface-variant/50">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Pronto</span>
                        </div>
                      )}
                    </div>
                </div>

                {isAdmin && sheets.connected && (
                  <div className="mt-4 px-6 pb-6 space-y-4 border-t border-outline-variant/10 pt-6">
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">Enlace de tu Google Sheet</span>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Pega la URL de tu Google Sheet (ej. https://docs.google.com/spreadsheets/d/...)"
                          value={sheetUrl}
                          onChange={(e) => setSheetUrl(e.target.value)}
                          className="flex-1 bg-surface-container-highest px-4 py-3 rounded-2xl text-xs font-bold outline-none border border-outline-variant/10 focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-on-surface-variant/40"
                        />
                        <button
                          onClick={() => {
                            if (!sheetUrl.trim()) {
                              toast.error("Por favor, ingresa una URL de Google Sheet válida");
                              return;
                            }
                            toast.promise(sheets.importSheets.mutateAsync(sheetUrl), {
                              loading: 'Importando tareas...',
                              success: (data) => {
                                setSheetUrl('');
                                return data.message;
                              },
                              error: (err) => err.message || 'Error al importar las tareas',
                            });
                          }}
                          disabled={sheets.importSheets.isPending}
                          className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 shrink-0"
                        >
                          {sheets.importSheets.isPending ? 'Importando...' : 'Importar'}
                        </button>
                      </div>
                      <p className="text-[10px] text-on-surface-variant/40 font-medium">
                        Nota: Asegúrate de que la primera fila contenga las cabeceras (Título, Prioridad, Vencimiento, etc.).
                      </p>
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          const confirmed = window.confirm('¿Quieres desconectar Google Sheets?');
                          if (confirmed) {
                            toast.promise(sheets.disconnect.mutateAsync(), {
                              loading: 'Desconectando...',
                              success: 'Google Sheets desconectado',
                              error: 'Error al desconectar',
                            });
                          }
                        }}
                        disabled={sheets.disconnect.isPending}
                        className="px-4 py-2.5 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/30 text-xs font-black uppercase tracking-widest hover:bg-red-500/15 transition-colors disabled:opacity-60"
                      >
                        Desactivar
                      </button>
                    </div>
                  </div>
                )}
            </div>
        </section>

        {/* Notification Settings */}
        <section className="space-y-4">
            <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] px-2">Notificaciones Inteligentes</h3>
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] overflow-hidden divide-y divide-outline-variant/5">
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center">
                            <BellRing className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <span className="block font-bold text-foreground">Notificaciones</span>
                            <span className="text-[11px] text-on-surface-variant/60 font-medium">Avisos externos del sistema y navegador</span>
                        </div>
                    </div>
                    <button 
                        onClick={async () => {
                            const next = !notificationsEnabled;
                            if (next && 'Notification' in window && Notification.permission === 'default') {
                                await Notification.requestPermission();
                            }
                            localStorage.setItem('adonai_notifications_enabled', String(next));
                            setNotificationsEnabled(next);
                            toast.success(next ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notificationsEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
                
                {/* Bedtime / Tomorrow Plan */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center">
                            <Clock className="w-6 h-6 text-foreground" />
                        </div>
                        <div>
                            <span className="block font-bold text-foreground">Plan de Mañana</span>
                            <span className="text-[11px] text-on-surface-variant/60 font-medium">Recordatorio para organizar el día</span>
                        </div>
                    </div>
                    <input 
                        type="time" 
                        defaultValue={localStorage.getItem('adonai_notif_bedtime') || '20:00'}
                        onChange={(e) => localStorage.setItem('adonai_notif_bedtime', e.target.value)}
                        className="bg-surface-container-highest px-4 py-2 rounded-xl text-sm font-black text-primary border-none focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>

                {/* Streak Protection */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center">
                            <Zap className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <span className="block font-bold text-foreground">Protección de Racha</span>
                            <span className="text-[11px] text-on-surface-variant/60 font-medium">Avisar si tu racha peligra a las 6pm</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            const next = !streakEnabled;
                            localStorage.setItem('adonai_notif_streak', String(next));
                            setStreakEnabled(next);
                            toast.success(next ? 'Protección activada' : 'Protección desactivada');
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${streakEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${streakEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {/* Health Reminders */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center">
                            <BellRing className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                            <span className="block font-bold text-foreground">Recordatorios de Salud</span>
                            <span className="text-[11px] text-on-surface-variant/60 font-medium">Sugerencias para beber agua o descansar</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            const next = !healthEnabled;
                            localStorage.setItem('adonai_notif_health', String(next));
                            setHealthEnabled(next);
                            toast.success(next ? 'Recordatorios activados' : 'Recordatorios desactivados');
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${healthEnabled ? 'bg-secondary' : 'bg-surface-container-highest'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${healthEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

            </div>
        </section>

        {/* Legal links */}
        <div className="flex justify-center gap-3 pt-2 pb-4">
          <a href="/privacy" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant/60 transition-colors">Privacidad</a>
          <span className="text-[10px] text-on-surface-variant/20">·</span>
          <a href="/terms" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant/60 transition-colors">Términos</a>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
