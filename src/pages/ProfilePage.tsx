import { useState, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useSettings } from '@/hooks/useSettings';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStreaks } from '@/hooks/useStreaks';
import { useTasks } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Flame, CalendarDays, CheckCircle2, LogOut, Mic, Bell, Moon, Settings, ChevronDown, Brain, Upload, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ProfilePage = () => {
  const { profile, updateProfile } = useProfile();
  const { settings, updateSettings } = useSettings();
  const { userContext, updateContext } = useUserContext();
  const { signOut, user } = useAuth();
  const { metrics } = useStreaks();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const completedTotal = tasks.filter((t) => t.status === 'done').length;

  const [editingField, setEditingField] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Context field editing
  const [editingContext, setEditingContext] = useState<string | null>(null);
  const [contextValue, setContextValue] = useState('');

  // Fetch uploaded files
  const { data: contextFiles = [] } = useQuery({
    queryKey: ['context-files', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.storage
        .from('context-files')
        .list(user.id, { limit: 50 });
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('adonai_onboarding_done');
      navigate('/auth');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Máximo 5MB por archivo');
      return;
    }
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('context-files').upload(path, file);
      if (error) throw error;
      toast.success('Archivo subido');
      queryClient.invalidateQueries({ queryKey: ['context-files'] });
    } catch {
      toast.error('Error al subir archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!user) return;
    const { error } = await supabase.storage.from('context-files').remove([`${user.id}/${fileName}`]);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Archivo eliminado');
    queryClient.invalidateQueries({ queryKey: ['context-files'] });
  };

  const startEditContext = (field: string, value: string | null) => {
    setEditingContext(field);
    setContextValue(value || '');
  };

  const saveContextField = (field: string) => {
    updateContext.mutate({ [field]: contextValue });
    setEditingContext(null);
  };

  const contextFields = [
    { key: 'occupation', label: 'Ocupación', icon: '💼' },
    { key: 'industry', label: 'Industria', icon: '🏢' },
    { key: 'work_hours', label: 'Horario laboral', icon: '🕐' },
    { key: 'work_style', label: 'Estilo de trabajo', icon: '🎯' },
    { key: 'energy_patterns', label: 'Patrones de energía', icon: '⚡' },
    { key: 'personal_goals', label: 'Metas personales', icon: '🌟' },
    { key: 'recurring_commitments', label: 'Compromisos recurrentes', icon: '🔄' },
    { key: 'priorities_summary', label: 'Resumen de prioridades', icon: '📋' },
    { key: 'imported_context', label: 'Contexto adicional', icon: '📝' },
  ];

  const inputOptions = [
    { value: 'voice', label: 'Voz' },
    { value: 'text', label: 'Texto' },
    { value: 'both', label: 'Ambos' },
  ];

  const styleOptions = [
    { value: 'simple', label: 'Simple' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'guided', label: 'Guiado' },
  ];

  const themeOptions = [
    { value: 'dark', label: 'Oscuro' },
    { value: 'light', label: 'Claro' },
    { value: 'system', label: 'Sistema' },
  ];

  const inputLabels: Record<string, string> = { voice: 'Voz', text: 'Texto', both: 'Ambos' };
  const styleLabels: Record<string, string> = { simple: 'Simple', intermediate: 'Intermedio', guided: 'Guiado' };
  const themeLabels: Record<string, string> = { dark: 'Oscuro', light: 'Claro', system: 'Sistema' };


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
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 space-y-6">
        {/* Profile hero */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-container-high flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{(profile?.name || 'U')[0].toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{profile?.name || 'Usuario'}</h2>
            <p className="text-on-surface-variant text-sm">{profile?.email}</p>
          </div>
        </motion.section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-2">
          <div className="bg-surface-container-low p-4 rounded-lg text-center">
            <Flame className="w-6 h-6 text-primary mx-auto mb-1" />
            <div className="text-2xl font-extrabold">{metrics?.streak_current || 0}</div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Racha</p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg text-center">
            <CalendarDays className="w-6 h-6 text-primary mx-auto mb-1" />
            <div className="text-2xl font-extrabold">{metrics?.streak_max || 0}</div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Máx racha</p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg text-center">
            <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-1" />
            <div className="text-2xl font-extrabold">{completedTotal}</div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Hechas</p>
          </div>
        </section>

        {/* AI Context Section */}
        <section className="space-y-1">
          <button onClick={() => setContextExpanded(!contextExpanded)} className="w-full flex items-center justify-between px-1 mb-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Contexto IA</h3>
            </div>
            <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${contextExpanded ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {contextExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-surface-container-low rounded-lg overflow-hidden divide-y divide-outline-variant/10">
                  <div className="p-4">
                    <p className="text-xs text-on-surface-variant mb-3">
                      Esta información ayuda a la IA a tomar mejores decisiones sobre tus tareas.
                    </p>
                  </div>

                  {contextFields.map(({ key, label, icon }) => (
                    <div key={key} className="p-4">
                      {editingContext === key ? (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-on-surface-variant">{icon} {label}</label>
                          <textarea
                            autoFocus
                            value={contextValue}
                            onChange={(e) => setContextValue(e.target.value)}
                            className="w-full bg-surface-container-high rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[80px] border-none"
                            placeholder={`Describe tu ${label.toLowerCase()}...`}
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingContext(null)} className="px-3 py-1.5 text-xs text-on-surface-variant">Cancelar</button>
                            <button onClick={() => saveContextField(key)} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-bold">Guardar</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => startEditContext(key, (userContext as any)?.[key])} className="w-full text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{icon} {label}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                            {(userContext as any)?.[key] || 'Toca para agregar...'}
                          </p>
                        </button>
                      )}
                    </div>
                  ))}

                  {/* File uploads */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">📎 Archivos de contexto</span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold"
                      >
                        <Upload className="w-3 h-3" />
                        {uploading ? 'Subiendo...' : 'Subir'}
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt,.md,.csv,.json" />
                    <p className="text-[10px] text-on-surface-variant">PDF, DOC, TXT, CSV, JSON — máx 5MB</p>

                    {contextFiles.length > 0 && (
                      <div className="space-y-1">
                        {contextFiles.map((file) => (
                          <div key={file.name} className="flex items-center justify-between bg-surface-container-high rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                              <span className="text-xs text-foreground truncate">{file.name.replace(/^\d+_/, '')}</span>
                            </div>
                            <button onClick={() => handleDeleteFile(file.name)} className="text-on-surface-variant hover:text-error flex-shrink-0 ml-2">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Settings */}
        <section className="space-y-1">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em] px-1 mb-2">Configuración</h3>
          <div className="bg-surface-container-low rounded-lg overflow-hidden divide-y divide-outline-variant/10">
            {/* Theme */}
            <div>
              <button onClick={() => setEditingField(editingField === 'theme' ? null : 'theme')} className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Moon className="w-5 h-5 text-foreground" /></div>
                  <span className="font-semibold text-foreground text-sm">Tema</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-primary font-medium">{themeLabels[profile?.theme || 'dark']}</span>
                  <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${editingField === 'theme' ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <OptionSelector field="theme" options={themeOptions} currentValue={profile?.theme || 'dark'}
                onSelect={(v) => updateProfile.mutate({ theme: v })} />
            </div>

            {/* Input mode */}
            <div>
              <button onClick={() => setEditingField(editingField === 'input' ? null : 'input')} className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Mic className="w-5 h-5 text-foreground" /></div>
                  <span className="font-semibold text-foreground text-sm">Modo de Entrada</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-primary font-medium">{inputLabels[profile?.preferred_input || 'both']}</span>
                  <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${editingField === 'input' ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <OptionSelector field="input" options={inputOptions} currentValue={profile?.preferred_input || 'both'}
                onSelect={(v) => updateProfile.mutate({ preferred_input: v })} />
            </div>

            {/* Style */}
            <div>
              <button onClick={() => setEditingField(editingField === 'style' ? null : 'style')} className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Settings className="w-5 h-5 text-foreground" /></div>
                  <span className="font-semibold text-foreground text-sm">Estilo</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-primary font-medium">{styleLabels[profile?.organization_style || 'simple']}</span>
                  <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${editingField === 'style' ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <OptionSelector field="style" options={styleOptions} currentValue={profile?.organization_style || 'simple'}
                onSelect={(v) => updateProfile.mutate({ organization_style: v })} />
            </div>

            {/* Notifications toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Bell className="w-5 h-5 text-foreground" /></div>
                <span className="font-semibold text-foreground text-sm">Notificaciones</span>
              </div>
              <button onClick={() => updateSettings.mutate({ notifications_enabled: !settings?.notifications_enabled })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center ${settings?.notifications_enabled ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'}`}>
                <div className="w-[18px] h-[18px] bg-foreground rounded-full mx-0.5" />
              </button>
            </div>

            {/* Voice toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Mic className="w-5 h-5 text-foreground" /></div>
                <span className="font-semibold text-foreground text-sm">Voz</span>
              </div>
              <button onClick={() => updateSettings.mutate({ voice_enabled: !settings?.voice_enabled })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center ${settings?.voice_enabled ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'}`}>
                <div className="w-[18px] h-[18px] bg-foreground rounded-full mx-0.5" />
              </button>
            </div>

            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center">
                  <span className="text-lg">📧</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground text-sm">Recordatorios por Email</span>
                  <p className="text-[10px] text-on-surface-variant/60">Recibe alertas de tareas importantes</p>
                </div>
              </div>
              <button onClick={() => updateSettings.mutate({ notifications_enabled: !(settings as any)?.notifications_enabled })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center ${(settings as any)?.notifications_enabled !== false ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'}`}>
                <div className="w-[18px] h-[18px] bg-foreground rounded-full mx-0.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full py-4 rounded-lg bg-tertiary-container/10 text-tertiary font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-tertiary-container/20 transition-all">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>

        {/* Legal links - subtle */}
        <div className="flex justify-center gap-3 pt-2 pb-4">
          <a href="/privacy" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant/60 transition-colors">Privacidad</a>
          <span className="text-[10px] text-on-surface-variant/20">·</span>
          <a href="/terms" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant/60 transition-colors">Términos</a>
        </div>
      </div>
      </div>
  );
};

export default ProfilePage;
