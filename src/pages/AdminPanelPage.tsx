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

// ─── Cohort Retention Chart (Recharts) ───────────────────────────────────────────
const CohortRetentionChart = ({ data, title }: { data: { day: string; retention: number }[], title: string }) => (
  <div className="h-64 w-full mt-4">
    <h3 className="text-sm font-bold text-on-surface-variant/80 mb-2">{title}</h3>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--outline-variant) / 0.2)" />
        <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--on-surface-variant) / 0.5)" />
        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--on-surface-variant) / 0.5)" tickFormatter={(val) => `${val}%`} />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
          labelStyle={{ fontWeight: 'bold', color: 'black', marginBottom: '4px' }}
          formatter={(value: number) => [`${value}%`, 'Retención']}
        />
        <Area type="monotone" dataKey="retention" name="Retención" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRetention)" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
const AdminPanelPage = () => {
  const isAdmin = useIsAdmin();
  const [timeRange, setTimeRange] = useState<number | 'all'>('all');
  const [excludedUsers, setExcludedUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem('adonai_admin_excluded_users');
    return saved ? JSON.parse(saved) : [];
  });
  const { data: analytics, isLoading, error, refetch } = useAdminAnalytics(timeRange, excludedUsers);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [selectedSubcohort, setSelectedSubcohort] = useState<'all' | '1-2 tareas' | '3+ tareas'>('all');
  const [retentionDays, setRetentionDays] = useState<7 | 14 | 30>(14);
  const [viewingCohortUsers, setViewingCohortUsers] = useState<{ name: string, group: any } | null>(null);

  const handleExcludeUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Excluir a este usuario de las analíticas? No contará para las métricas.')) {
      const newExcluded = [...excludedUsers, userId];
      setExcludedUsers(newExcluded);
      localStorage.setItem('adonai_admin_excluded_users', JSON.stringify(newExcluded));
    }
  };

  // Cohort Graph Logic — must be before any conditional returns (Rules of Hooks)
  const getGroup = (cohortData: any, sub: string) => {
    if (sub === 'all') return cohortData;
    return cohortData?.subcohorts?.[sub] || { users: 0, retention: {} };
  };

  const cohortGraphData = useMemo(() => {
    if (!analytics?.cohortRetention || analytics.cohortRetention.length === 0) return [];
    
    if (selectedCohort) {
      const cohort = analytics.cohortRetention.find(c => c.cohort === selectedCohort);
      if (cohort) {
        const group = getGroup(cohort, selectedSubcohort);
        return Array.from({ length: retentionDays }).map((_, i) => ({
          day: `Día ${i}`,
          retention: group?.retention?.[i] || 0
        }));
      }
    }
    
    // Average
    const avgRetention = Array.from({ length: retentionDays }).map((_, i) => {
      let sum = 0;
      let count = 0;
      analytics.cohortRetention.forEach(c => {
        const group = getGroup(c, selectedSubcohort);
        if (group && group.users > 0 && group.retention?.[i] !== undefined) {
          sum += group.retention[i];
          count++;
        }
      });
      return {
        day: `Día ${i}`,
        retention: count > 0 ? Math.round(sum / count) : 0
      };
    });
    return avgRetention;
  }, [analytics?.cohortRetention, selectedCohort, selectedSubcohort, retentionDays]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-red-500 text-4xl">⚠️</div>
        <p className="text-red-400 font-bold text-lg">Error cargando Analytics</p>
        <p className="text-on-surface-variant/60 text-sm max-w-md text-center">{(error as Error).message}</p>
        <button onClick={() => refetch()} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-80 transition-opacity">
          Reintentar
        </button>
      </div>
    );
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
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard icon={Users} label="Usuarios totales" value={analytics.totalUsers} color="primary" />
          <StatCard icon={UserCheck} label="Abrieron app hoy" value={analytics.activeTodayOpened ?? analytics.activeToday} sub="Sesión" color="primary" />
          <StatCard icon={Zap} label="Hicieron acción hoy" value={analytics.activeTodayAction ?? 0} sub="Tarea creada/completada" color="primary" />
          <StatCard icon={BarChart3} label="Tareas creadas" value={analytics.totalTasksCreated} sub="Total" color="primary" />
          <StatCard icon={CheckCircle2} label="Tareas completadas" value={analytics.totalTasksCompleted} sub={pct(analytics.totalTasksCompleted, analytics.totalTasksCreated)} color="primary" />
          <StatCard icon={TrendingUp} label="Promedio tareas/usuario/día" value={analytics.avgTasksPerUserPerDay} color="primary" />
          <StatCard icon={Clock} label="Sesión promedio (min)" value={analytics.avgSessionMinutes || '—'} color="primary" />
          <StatCard icon={Target} label="Con meta vinculada" value={analytics.tasksWithGoal} sub={pct(analytics.tasksWithGoal, analytics.totalTasksCreated)} color="primary" />
          <StatCard icon={Zap} label="Priorizadas" value={analytics.tasksImportant + analytics.tasksUrgent} sub={pct(analytics.tasksImportant + analytics.tasksUrgent, analytics.totalTasksCreated)} color="primary" />
        </section>

        {/* ─── Retention KPIs ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-card rounded-2xl p-5 border border-purple-500/20 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/70 mb-1">Retención Día 1</p>
            <p className="text-3xl font-black tabular-nums text-purple-400">{analytics.retentionD1 ?? 0}%</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-1">Benchmark clave</p>
          </div>
          <div className="bg-card rounded-2xl p-5 border border-indigo-500/20 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/70 mb-1">Retención Día 7</p>
            <p className="text-3xl font-black tabular-nums text-indigo-400">{analytics.retentionD7 ?? 0}%</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-1">Salud semanal</p>
          </div>
          <div className="bg-card rounded-2xl p-5 border border-emerald-500/20 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70 mb-1">WAU (7 días)</p>
            <p className="text-3xl font-black tabular-nums text-emerald-400">{analytics.wau ?? 0}</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-1">Usuarios activos últimos 7d</p>
          </div>
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

        {/* ─── Cohort Retention ────────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm mb-8 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60">
                Retención por Cohorte (Desde registro)
              </h2>
              {selectedCohort && (
                <button 
                  onClick={() => setSelectedCohort(null)}
                  className="text-xs font-bold text-primary hover:underline mt-1"
                >
                  Ver Promedio Global
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={selectedSubcohort}
                onChange={(e) => setSelectedSubcohort(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high text-xs font-bold text-on-surface-variant outline-none"
              >
                <option value="all">Todos los usuarios</option>
                <option value="1-2 tareas">1-2 tareas el Día 0</option>
                <option value="3+ tareas">3+ tareas el Día 0</option>
              </select>

              <select 
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value) as any)}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high text-xs font-bold text-on-surface-variant outline-none"
              >
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="text-left py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 sticky left-0 bg-card z-10 min-w-[120px]">Cohorte</th>
                  <th className="text-right py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Usuarios</th>
                  {Array.from({ length: retentionDays }).map((_, day) => (
                    <th key={day} className="text-right py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 min-w-[60px]">
                      Día {day}
                    </th>
                  ))}
                  <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Acción</th>
                </tr>
              </thead>
              <tbody>
                {analytics.cohortRetention?.map(cohortData => {
                  const cohort = getGroup(cohortData, selectedSubcohort);
                  if (!cohort) return null;
                  return (
                    <tr key={cohortData.cohort} className={`border-b border-outline-variant/5 hover:bg-surface-container-low/50 transition-colors ${selectedCohort === cohortData.cohort ? 'bg-primary/5' : ''}`}>
                      <td className="py-3 px-2 font-bold text-foreground sticky left-0 bg-card z-10">{cohortData.cohort}</td>
                      <td className="text-right py-3 px-2 font-bold tabular-nums">{cohort.users || 0}</td>
                      {Array.from({ length: retentionDays }).map((_, day) => {
                        const val = cohort.retention?.[day];
                        // Heatmap: ≥40% green, 20-39% yellow, <20% red, 0% gray
                        let bgClass = "bg-transparent";
                        let textClass = "text-on-surface-variant/60";
                        if (val !== undefined && cohort.users > 0) {
                          if (val >= 40) { bgClass = "bg-green-500/20"; textClass = "text-green-600 dark:text-green-400"; }
                          else if (val >= 20) { bgClass = "bg-yellow-500/15"; textClass = "text-yellow-600 dark:text-yellow-400"; }
                          else if (val > 0) { bgClass = "bg-red-500/15"; textClass = "text-red-600 dark:text-red-400"; }
                          else { bgClass = "bg-gray-500/10"; textClass = "text-gray-500"; }
                        }

                        return (
                          <td key={day} className={`text-right py-3 px-2 font-bold tabular-nums ${bgClass}`}>
                            {val !== undefined ? (
                              <span className={textClass}>
                                {val}%
                              </span>
                            ) : '—'}
                          </td>
                        );
                      })}
                      <td className="text-center py-3 px-2 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedCohort(selectedCohort === cohortData.cohort ? null : cohortData.cohort)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${selectedCohort === cohortData.cohort ? 'bg-primary text-primary-foreground' : 'bg-surface-container-high text-on-surface-variant hover:text-foreground'}`}
                        >
                          {selectedCohort === cohortData.cohort ? 'Ocultar' : 'Graficar'}
                        </button>
                        <button
                          onClick={() => setViewingCohortUsers({ name: cohortData.cohort, group: cohort })}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-high text-on-surface-variant hover:text-foreground hover:bg-surface-container-highest transition-colors whitespace-nowrap"
                        >
                          Ver Usuarios
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-outline-variant/10">
            <CohortRetentionChart 
              data={cohortGraphData} 
              title={selectedCohort ? `Retención: ${selectedCohort} (${selectedSubcohort})` : `Retención Promedio Global (${selectedSubcohort})`} 
            />
          </div>
        </section>

        {/* ─── Feature Retention Correlation ──────────────────────────────── */}
        {analytics.featureRetention && analytics.featureRetention.length > 0 && (
          <section className="bg-card rounded-2xl p-6 border border-outline-variant/10 shadow-sm mb-8 overflow-hidden">
            <div className="mb-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/60">
                ¿Qué acciones retienen usuarios?
              </h2>
              <p className="text-xs text-on-surface-variant/50 mt-1">
                Usuarios que hicieron X acción vs los que no — retención a 7 días. Ordenado por impacto.
              </p>
            </div>

            <div className="space-y-3">
              {analytics.featureRetention.map(feat => {
                const deltaColor = feat.delta > 20 ? 'text-green-500' : feat.delta > 0 ? 'text-yellow-500' : 'text-red-400';
                const deltaIcon = feat.delta > 0 ? '↑' : feat.delta < 0 ? '↓' : '→';
                return (
                  <div key={feat.key} className="bg-surface-container-low/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{feat.emoji}</span>
                        <span className="text-sm font-bold text-foreground">{feat.label}</span>
                      </div>
                      <span className={`text-sm font-black tabular-nums ${deltaColor}`}>
                        {deltaIcon} {feat.delta > 0 ? '+' : ''}{feat.delta}pp
                      </span>
                    </div>

                    {/* Bar: Users who DID the action */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-on-surface-variant/50 w-20 shrink-0 text-right">Hicieron</span>
                      <div className="flex-1 h-5 bg-surface-container-high rounded-full overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${feat.pctRetainedWho}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-green-500/80"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tabular-nums text-foreground">
                          {feat.pctRetainedWho}% retenidos ({feat.retainedWho}/{feat.usersWho})
                        </span>
                      </div>
                    </div>

                    {/* Bar: Users who DID NOT do the action */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-on-surface-variant/50 w-20 shrink-0 text-right">No hicieron</span>
                      <div className="flex-1 h-5 bg-surface-container-high rounded-full overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${feat.pctChurnedWhoNot}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-red-400/60"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tabular-nums text-foreground">
                          {feat.pctChurnedWhoNot}% se fueron ({feat.churnedWhoNot}/{feat.usersWhoNot})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
                  <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Estado</th>
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
                          <span className="font-bold text-foreground truncate max-w-[200px]">
                            {u.name || u.email?.split('@')[0] || 'Sin nombre'}
                            {!u.email && (
                              <span className="font-normal text-on-surface-variant/60 ml-1">
                                "todavía no registrado"
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/50">{u.email || u.user_id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          u.status === 'activo' ? 'bg-green-500/15 text-green-500' :
                          u.status === 'en_riesgo' ? 'bg-yellow-500/15 text-yellow-500' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {u.status === 'activo' ? '● Activo' : u.status === 'en_riesgo' ? '◐ Riesgo' : '○ Churned'}
                        </span>
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
                        <td colSpan={9} className="py-4 px-4">
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

        {/* ─── Cohort User Details Modal ────────────────────────────────────── */}
        <AnimatePresence>
          {viewingCohortUsers && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
              onClick={() => setViewingCohortUsers(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-card w-full max-w-4xl max-h-[85vh] rounded-3xl border border-outline-variant/10 shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                      Usuarios: {viewingCohortUsers.name}
                    </h2>
                    <p className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest mt-1">
                      {viewingCohortUsers.group.users} usuarios en total • Ordenados por días activos
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingCohortUsers(null)}
                    className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors"
                  >
                    <Plus className="w-6 h-6 rotate-45 text-on-surface-variant" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid gap-3">
                    {(() => {
                      // Fallback logic if Edge Function hasn't been deployed
                      let usersToShow = [];
                      if (viewingCohortUsers.group.userDetails) {
                        usersToShow = viewingCohortUsers.group.userDetails
                          .sort((a: any, b: any) => b.activeDaysCount - a.activeDaysCount)
                          .map((detail: any) => ({
                            uid: detail.uid,
                            activeDaysCount: detail.activeDaysCount,
                            days: detail.days
                          }));
                      } else {
                        // RECONSTRUCT cohort from userStats by date
                        const cohortDateStr = viewingCohortUsers.name.split('Semana del ')[1];
                        if (cohortDateStr) {
                          const startDate = new Date(cohortDateStr);
                          const endDate = new Date(startDate);
                          endDate.setDate(startDate.getDate() + 7);

                          usersToShow = analytics.userStats
                            .filter(stat => {
                              const regDate = new Date(stat.created_at);
                              return regDate >= startDate && regDate < endDate;
                            })
                            .sort((a, b) => b.completed_tasks - a.completed_tasks)
                            .map(stat => ({
                              uid: stat.user_id,
                              activeDaysCount: stat.streak_max || 0, // Fallback to max streak
                              days: [] // No day-by-day data in fallback
                            }));
                        }
                      }

                      if (usersToShow.length === 0) {
                        return (
                          <div className="text-center py-12 px-6">
                            <p className="text-on-surface-variant/60 font-bold">No se encontraron usuarios en esta cohorte.</p>
                          </div>
                        );
                      }

                      return usersToShow.map((detail: any) => {
                        const stat = analytics.userStats.find(s => s.user_id === detail.uid);
                        if (!stat) return null;
                        return (
                          <div key={detail.uid} className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/5 hover:border-primary/20 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                                  {stat.name?.[0] || stat.email?.[0] || '?'}
                                </div>
                                <div>
                                  <p className="font-black text-foreground">{stat.name || stat.email?.split('@')[0] || 'Usuario'}</p>
                                  <p className="text-xs font-bold text-on-surface-variant/60">{stat.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black tabular-nums text-primary">
                                  {viewingCohortUsers.group.userDetails ? detail.activeDaysCount : stat.completed_tasks}
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
                                  {viewingCohortUsers.group.userDetails ? 'Días Activos' : 'Tareas Hechas'}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                              <div className="bg-surface-container-high/40 rounded-xl p-2 text-center">
                                <p className="text-[10px] font-bold text-on-surface-variant/50 mb-0.5">Creadas</p>
                                <p className="text-sm font-black">{stat.total_tasks}</p>
                              </div>
                              <div className="bg-surface-container-high/40 rounded-xl p-2 text-center">
                                <p className="text-[10px] font-bold text-on-surface-variant/50 mb-0.5">Hechas</p>
                                <p className="text-sm font-black text-green-500">{stat.completed_tasks}</p>
                              </div>
                              <div className="bg-surface-container-high/40 rounded-xl p-2 text-center">
                                <p className="text-[10px] font-bold text-on-surface-variant/50 mb-0.5">Racha Actual</p>
                                <p className="text-sm font-black text-orange-500">{stat.streak_current}</p>
                              </div>
                              <div className="bg-surface-container-high/40 rounded-xl p-2 text-center">
                                <p className="text-[10px] font-bold text-on-surface-variant/50 mb-0.5">Estado</p>
                                <p className={`text-[10px] font-black uppercase ${stat.status === 'activo' ? 'text-green-500' : stat.status === 'en_riesgo' ? 'text-yellow-500' : 'text-red-400'}`}>
                                  {stat.status}
                                </p>
                              </div>
                            </div>

                            {viewingCohortUsers.group.userDetails && (
                              <div className="flex flex-wrap gap-1.5">
                                <p className="text-[10px] font-bold text-on-surface-variant/40 w-full mb-1">Mapa de actividad (Días desde registro):</p>
                                {Array.from({ length: 31 }).map((_, i) => {
                                  const isActive = detail.days.includes(i);
                                  return (
                                    <div
                                      key={i}
                                      title={`Día ${i}: ${isActive ? 'Activo' : 'Inactivo'}`}
                                      className={`w-4 h-4 rounded-sm ${isActive ? 'bg-primary' : 'bg-surface-container-high/30'}`}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="p-4 bg-surface-container-low border-t border-outline-variant/10 text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                    Fin de la lista de usuarios
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminPanelPage;
