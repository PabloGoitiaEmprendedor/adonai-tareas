/**
 * AdminPanelPage — CEO-only analytics dashboard.
 * Accessible only by pablogoitiaemprendedor@gmail.com
 * 
 * Features:
 * - Real-time KPI cards
 * - Task creation breakdown by method
 * - User-level drill-down table
 * - Daily trends chart (CSS-only)
 * - Funnel analysis
 * - Clarity embed link
 * - Custom event query builder for future metrics
 */
import { useState, useMemo } from 'react';
import { useAdminAnalytics, useIsAdmin } from '@/hooks/useAdminAnalytics';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Users, CheckCircle2, Mic, Type, Camera, Repeat,
  Plus, Zap, Target, TrendingUp, Flame, Clock, UserCheck,
  ChevronDown, ChevronUp, ExternalLink, Search, RefreshCw, Trash2,
  Trophy, CalendarRange, Users2, Image as ImageIcon
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend } from 'recharts';

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'primary', large }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; large?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-card rounded-2xl p-5 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow ${large ? 'col-span-2' : ''}`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl bg-${color}/15 flex items-center justify-center`}>
        <Icon className={`w-5 h-5 text-${color}`} />
      </div>
      {sub && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">{sub}</span>
      )}
    </div>
    <p className="text-3xl font-black tabular-nums tracking-tight text-foreground">{value}</p>
    <p className="text-xs font-semibold text-on-surface-variant/60 mt-1">{label}</p>
  </motion.div>
);

// ─── Mini Bar ────────────────────────────────────────────────────────────────
const MiniBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="font-semibold text-on-surface-variant/70">{label}</span>
      <span className="font-black tabular-nums text-foreground">{value}</span>
    </div>
    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  </div>
);

// ─── Funnel Step ─────────────────────────────────────────────────────────────
const FunnelStep = ({ label, value, total, step }: { label: string; value: number; total: number; step: number }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{label}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1.5 flex-1 bg-surface-container-high rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <span className="text-xs font-black tabular-nums text-primary">{pct}%</span>
        </div>
      </div>
      <span className="text-xs font-bold tabular-nums text-on-surface-variant/60">{value}/{total}</span>
    </div>
  );
};

// ─── Daily Trends Chart (Recharts) ──────────────────────────────────────────
const DailyTrendsChart = ({ data }: { data: any[] }) => (
  <div className="h-64 w-full mt-4">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--outline-variant) / 0.2)" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5)} stroke="hsl(var(--on-surface-variant) / 0.5)" />
        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--on-surface-variant) / 0.5)" />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
          labelStyle={{ fontWeight: 'bold', color: 'black', marginBottom: '4px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="tasks_created" name="Creadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="tasks_completed" name="Completadas" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ─── User Growth Chart (Recharts) ───────────────────────────────────────────
const UserGrowthChart = ({ data }: { data: any[] }) => (
  <div className="h-64 w-full mt-4">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--outline-variant) / 0.2)" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5)} stroke="hsl(var(--on-surface-variant) / 0.5)" />
        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--on-surface-variant) / 0.5)" />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
          labelStyle={{ fontWeight: 'bold', color: 'black', marginBottom: '4px' }}
        />
        <Area type="monotone" dataKey="cumulative_users" name="Usuarios Totales" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
const AdminPanelPage = () => {
  const isAdmin = useIsAdmin();
  const [timeRange, setTimeRange] = useState<number | 'all'>(30);
  const [excludedUsers, setExcludedUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem('adonai_admin_excluded_users');
    return saved ? JSON.parse(saved) : [];
  });
  const { data: analytics, isLoading, refetch } = useAdminAnalytics(timeRange, excludedUsers);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const handleExcludeUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Excluir a este usuario de las analíticas? No contará para las métricas.')) {
      const newExcluded = [...excludedUsers, userId];
      setExcludedUsers(newExcluded);
      localStorage.setItem('adonai_admin_excluded_users', JSON.stringify(newExcluded));
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoading || !analytics) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-primary font-bold animate-pulse text-sm">Cargando Analytics...</p>
      </div>
    );
  }

  const filteredUsers = analytics.userStats.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.user_id.includes(q));
  });

  const pct = (v: number, t: number) => t > 0 ? `${Math.round((v / t) * 100)}%` : '0%';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/50">Panel Admin</p>
            <h1 className="text-3xl font-black tracking-tighter text-foreground">Adonai Analytics</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-4 py-2.5 rounded-xl bg-surface-container-high text-sm font-bold text-on-surface-variant hover:text-foreground hover:bg-surface-container-highest transition-colors cursor-pointer outline-none border-none focus:ring-0"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={14}>Últimos 14 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 3 meses</option>
              <option value={180}>Últimos 6 meses</option>
              <option value={365}>Último año</option>
              <option value="all">Todo el tiempo</option>
            </select>
            <a
              href="https://clarity.microsoft.com/projects/view/wa230iw439/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-sm font-bold text-on-surface-variant hover:text-foreground hover:bg-surface-container-highest transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Clarity
            </a>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
                refetch();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>

        {/* ─── KPI Cards ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard icon={Users} label="Usuarios totales" value={analytics.totalUsers} color="primary" />
          <StatCard icon={UserCheck} label="Activos hoy" value={analytics.activeToday} color="primary" />
          <StatCard icon={BarChart3} label="Tareas creadas" value={analytics.totalTasksCreated} sub="Total" color="primary" />
          <StatCard icon={CheckCircle2} label="Tareas completadas" value={analytics.totalTasksCompleted} sub={pct(analytics.totalTasksCompleted, analytics.totalTasksCreated)} color="primary" />
          <StatCard icon={TrendingUp} label="Promedio tareas/usuario/día" value={analytics.avgTasksPerUserPerDay} color="primary" />
          <StatCard icon={Clock} label="Sesión promedio (min)" value={analytics.avgSessionMinutes || '—'} color="primary" />
          <StatCard icon={Target} label="Con meta vinculada" value={analytics.tasksWithGoal} sub={pct(analytics.tasksWithGoal, analytics.totalTasksCreated)} color="primary" />
          <StatCard icon={Zap} label="Priorizadas" value={analytics.tasksImportant + analytics.tasksUrgent} sub={pct(analytics.tasksImportant + analytics.tasksUrgent, analytics.totalTasksCreated)} color="primary" />
        </section>

        {/* ─── Creation Method Breakdown ─────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60 mb-5">
              Método de creación
            </h2>
            <div className="space-y-3">
              <MiniBar label="📝 Texto" value={analytics.tasksByText} max={analytics.totalTasksCreated} color="hsl(142, 71%, 45%)" />
              <MiniBar label="🎤 Voz" value={analytics.tasksByVoice} max={analytics.totalTasksCreated} color="hsl(262, 83%, 58%)" />
              <MiniBar label="📸 Imagen" value={analytics.tasksByImage} max={analytics.totalTasksCreated} color="hsl(38, 92%, 50%)" />
              <MiniBar label="🔁 Recurrente" value={analytics.tasksByRecurrence} max={analytics.totalTasksCreated} color="hsl(199, 89%, 48%)" />
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60 mb-5">
              Punto de creación
            </h2>
            <div className="space-y-3">
              <MiniBar label="➕ Botón principal (FAB)" value={analytics.tasksByFab} max={analytics.totalTasksCreated} color="hsl(142, 71%, 45%)" />
              <MiniBar label="📥 Botón secundario" value={analytics.tasksBySecondary} max={analytics.totalTasksCreated} color="hsl(262, 83%, 58%)" />
              <MiniBar label="🖥️ Mini + (ventana)" value={analytics.tasksByMiniPlus} max={analytics.totalTasksCreated} color="hsl(38, 92%, 50%)" />
              <MiniBar label="🎙️ Mini voz (ventana)" value={analytics.tasksByMiniVoice} max={analytics.totalTasksCreated} color="hsl(199, 89%, 48%)" />
            </div>
          </div>
        </section>

        {/* ─── Funnel Analysis ──────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm mb-8">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60 mb-5">
            Flujo y fricción — Embudo
          </h2>
          <div className="space-y-4">
            <FunnelStep step={1} label="Se registraron" value={analytics.funnel.total_users} total={analytics.funnel.total_users} />
            <FunnelStep step={2} label="Crearon ≥1 tarea (primera sesión)" value={analytics.funnel.users_with_first_task} total={analytics.funnel.total_users} />
            <FunnelStep step={3} label="Completaron ≥1 tarea (primera sesión)" value={analytics.funnel.users_with_first_completion} total={analytics.funnel.total_users} />
            <FunnelStep step={4} label="Usaron priorización/metas (primera semana)" value={analytics.funnel.users_with_prioritization} total={analytics.funnel.total_users} />
          </div>
        </section>

        {/* ─── Ecosystem Metrics ──────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60 mb-4 px-2">
            Métricas de Ecosistema (Nuevas)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Target} label="Metas Totales" value={analytics.goalsTotal} sub={`${analytics.goalsActive} Activas`} color="blue-500" />
            <StatCard icon={CalendarRange} label="Bloques de Tiempo" value={analytics.timeBlocksTotal} color="purple-500" />
            <StatCard icon={Trophy} label="Logros Desbloqueados" value={analytics.achievementsUnlocked} color="orange-500" />
            <StatCard icon={Users2} label="Amistades Creadas" value={analytics.friendshipsTotal} color="pink-500" />
            <StatCard icon={ImageIcon} label="Fotos Analizadas (IA)" value={analytics.imageCapturesTotal} sub={`${analytics.tasksExtractedFromImages} tareas extraídas`} color="indigo-500" />
          </div>
        </section>

        {/* ─── Daily Trends ─────────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm mb-8">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">
            Tendencia de Actividad
          </h2>
          <DailyTrendsChart data={analytics.dailyMetrics} />
        </section>

        {/* ─── User Growth ──────────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm mb-8">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">
            Crecimiento de Usuarios
          </h2>
          <UserGrowthChart data={analytics.userGrowth} />
        </section>

        {/* ─── User Table ───────────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60">
              Detalle por usuario ({filteredUsers.length})
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Buscar usuario..."
                className="pl-9 pr-4 py-2 rounded-xl bg-surface-container-high text-sm text-foreground placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary border-none w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="text-left py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Usuario</th>
                  <th className="text-right py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Creadas</th>
                  <th className="text-right py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Completadas</th>
                  <th className="text-right py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Voz</th>
                  <th className="text-right py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Racha</th>
                  <th className="text-right py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Avg/día</th>
                  <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Excluir</th>
                  <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <AnimatePresence key={u.user_id}>
                    <tr
                      className="border-b border-outline-variant/5 hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedUser(expandedUser === u.user_id ? null : u.user_id)}
                    >
                      <td className="py-3 px-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground truncate max-w-[200px]">{u.name || u.email?.split('@')[0] || 'Sin nombre'}</span>
                          <span className="text-[10px] text-on-surface-variant/50">{u.email || u.user_id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 font-bold tabular-nums">{u.total_tasks}</td>
                      <td className="text-right py-3 px-2 font-bold tabular-nums text-green-500">{u.completed_tasks}</td>
                      <td className="text-right py-3 px-2 font-bold tabular-nums text-purple-400">{u.voice_tasks}</td>
                      <td className="text-right py-3 px-2">
                        <span className="inline-flex items-center gap-1 font-bold tabular-nums">
                          {u.streak_current > 0 && <Flame className="w-3 h-3 text-orange-400" />}
                          {u.streak_current}
                        </span>
                      </td>
                      <td className="text-right py-3 px-2 font-bold tabular-nums">{u.avg_tasks_per_day}</td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={(e) => handleExcludeUser(u.user_id, e)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
                          title="Excluir usuario de las analíticas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="text-center py-3 px-2">
                        {expandedUser === u.user_id ? (
                          <ChevronUp className="w-4 h-4 text-on-surface-variant/50 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-on-surface-variant/50 mx-auto" />
                        )}
                      </td>
                    </tr>
                    {expandedUser === u.user_id && (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={8} className="py-4 px-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Texto</p>
                              <p className="text-lg font-black">{u.text_tasks}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Imagen</p>
                              <p className="text-lg font-black">{u.image_tasks}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Recurrentes</p>
                              <p className="text-lg font-black">{u.recurrence_tasks}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Con meta</p>
                              <p className="text-lg font-black">{u.tasks_with_goal}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">FAB</p>
                              <p className="text-lg font-black">{u.fab_tasks}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Secundario</p>
                              <p className="text-lg font-black">{u.secondary_tasks}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Mini +</p>
                              <p className="text-lg font-black">{u.mini_plus_tasks}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Mini Voz</p>
                              <p className="text-lg font-black">{u.mini_voice_tasks}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Importantes</p>
                              <p className="text-lg font-black">{u.tasks_important}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Urgentes</p>
                              <p className="text-lg font-black">{u.tasks_urgent}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Primer uso</p>
                              <p className="text-sm font-black">{u.first_session_date || '—'}</p>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-3">
                              <p className="text-on-surface-variant/50 font-bold mb-1">Última actividad</p>
                              <p className="text-sm font-black">{u.last_active_date || '—'}</p>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── Clarity Integration Note ──────────────────────────────────── */}
        <section className="mt-8 bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">
            Integración con Clarity
          </h2>
          <p className="text-sm text-on-surface-variant/70 leading-relaxed mb-4">
            Clarity ya está integrada con tu proyecto (ID: <code className="bg-surface-container-high px-1.5 py-0.5 rounded text-xs font-mono">wa230iw439</code>).
            Los usuarios son identificados automáticamente por su user_id de Supabase. Para ver heatmaps,
            recordings, y métricas de engagement detalladas, accede al dashboard de Clarity:
          </p>
          <a
            href="https://clarity.microsoft.com/projects/view/wa230iw439/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Microsoft Clarity
          </a>
        </section>

        {/* ─── Custom Tracking Builder ────────────────────────────────────── */}
        <section className="mt-8 bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">
            Eventos rastreados
          </h2>
          <p className="text-xs text-on-surface-variant/60 leading-relaxed mb-4">
            Estos son los event_types que se registran automáticamente en <code className="bg-surface-container-high px-1.5 py-0.5 rounded font-mono">usage_events</code>.
            Puedes agregar nuevos en el código y aparecerán aquí automáticamente.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              'task_created_text', 'task_created_voice', 'task_created_image',
              'task_completed', 'day_active', 'return_next_day',
              'session_start', 'session_end', 'onboarding_completed',
            ].map(evt => (
              <span key={evt} className="px-3 py-1.5 rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant/70">
                {evt}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPanelPage;
