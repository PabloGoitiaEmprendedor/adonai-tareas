import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, History, Trash2, Send, User, Mic, X, Clock, CheckCircle, AlertCircle, Loader2, StopCircle } from 'lucide-react';
import { useChatAgent, type StreamEvent, type ToolResult } from '@/hooks/useChatAgent';
import { useIsAdmin } from '@/hooks/useAdminAnalytics';

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  toolResults?: ToolResult[];
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'adonai_chat_sessions';

const loadSessions = (): Session[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveSessions = (sessions: Session[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const ChatPage = () => {
  const isAdmin = useIsAdmin();
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [pendingToolResults, setPendingToolResults] = useState<ToolResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, cancel, isStreaming } = useChatAgent();

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  useEffect(() => {
    if (!isAdmin || activeSessionId) return;
    const newSession: Session = {
      id: generateId(),
      title: 'Nueva conversacion',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, [activeSessionId, isAdmin]);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (!activeSessionId) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, streamingMsgId]);

  const createNewSession = useCallback(() => {
    const newSession: Session = {
      id: generateId(),
      title: 'Nueva conversación',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setHistoryOpen(false);
  }, []);

  const deleteSession = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(next[0]?.id || null);
      }
      return next;
    });
  }, [activeSessionId]);

  const updateSessionMessages = useCallback((sessionId: string, updater: (messages: Message[]) => Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return { ...s, messages: updater(s.messages), updatedAt: Date.now() };
    }));
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !activeSessionId) {
      if (!trimmed && !activeSessionId) createNewSession();
      return;
    }

    const userMsgId = generateId();
    const assistantMsgId = generateId();
    const sessionId = activeSessionId;

    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updated = {
        ...s,
        messages: [...s.messages, userMsg],
        updatedAt: Date.now(),
        title: s.messages.length === 0 ? trimmed.slice(0, 60) : s.title,
      };
      return updated;
    }));

    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setStreamingMsgId(assistantMsgId);
    setPendingToolResults([]);

    const sessionHistory = (sessions.find(s => s.id === sessionId)?.messages || [])
      .concat(userMsg)
      .map(m => ({ role: m.role, content: m.content }));

    sendMessage(trimmed, sessionId, sessionHistory, (event: StreamEvent) => {
      if (event.type === 'content' && event.text) {
        updateSessionMessages(sessionId, msgs => {
          const existing = msgs.find(m => m.id === assistantMsgId);
          if (existing) {
            return msgs.map(m => m.id === assistantMsgId ? { ...m, content: m.content + event.text! } : m);
          }
          return [...msgs, { id: assistantMsgId, role: 'assistant' as Role, content: event.text!, timestamp: Date.now() }];
        });
      } else if (event.type === 'done' && event.content) {
        updateSessionMessages(sessionId, msgs => {
          const existing = msgs.find(m => m.id === assistantMsgId);
          if (existing) {
            return msgs.map(m => m.id === assistantMsgId ? { ...m, content: event.content!, toolResults: pendingToolResults.length > 0 ? [...pendingToolResults] : undefined } : m);
          }
          return [...msgs, { id: assistantMsgId, role: 'assistant' as Role, content: event.content!, timestamp: Date.now(), toolResults: pendingToolResults.length > 0 ? [...pendingToolResults] : undefined }];
        });
        setStreamingMsgId(null);
      } else if (event.type === 'tool_result' && event.tool && event.result) {
        setPendingToolResults(prev => {
          const newResults = [...prev, { tool: event.tool!, result: event.result! }];
          updateSessionMessages(sessionId, msgs => {
            const updated = msgs.map(m => {
              if (m.id === assistantMsgId && m.role === 'assistant') {
                return { ...m, toolResults: newResults };
              }
              return m;
            });
            // If the msg doesn't exist yet, add it with tool results
            if (!updated.find(m => m.id === assistantMsgId)) {
              updated.push({ id: assistantMsgId, role: 'assistant' as Role, content: '', timestamp: Date.now(), toolResults: newResults });
            }
            return updated;
          });
          return newResults;
        });
      } else if (event.type === 'error') {
        updateSessionMessages(sessionId, msgs => [
          ...msgs,
          { id: assistantMsgId, role: 'assistant' as Role, content: `⚠️ Error: ${event.error || 'Error al conectar con Adonai'}`, timestamp: Date.now() },
        ]);
        setStreamingMsgId(null);
      }
    });
  }, [input, activeSessionId, createNewSession, sendMessage, sessions, updateSessionMessages, pendingToolResults]);

  const handleCancel = useCallback(() => {
    cancel();
    if (streamingMsgId) {
      updateSessionMessages(activeSessionId!, msgs => {
        const existing = msgs.find(m => m.id === streamingMsgId);
        if (existing && !existing.content.trim()) {
          return msgs.filter(m => m.id !== streamingMsgId);
        }
        return msgs.map(m => m.id === streamingMsgId ? { ...m, content: m.content + '\n\n*[Cancelado]*' } : m);
      });
    }
    setStreamingMsgId(null);
  }, [cancel, streamingMsgId, activeSessionId, updateSessionMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const hasToolResults = (msg: Message) => msg.toolResults && msg.toolResults.length > 0;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background px-6 pb-32 pt-24 text-foreground">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary/10 ring-1 ring-primary/20">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary/70">Pronto</p>
          <h1 className="text-3xl font-black tracking-tight">Chat IA</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-on-surface-variant/65">
            Adonai AI esta en preparacion. Cuando este listo, podras organizar tareas, agenda y mensajes desde una conversacion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 pb-32">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-12 space-y-6">
        <div className="hidden lg:flex items-center justify-between pt-8 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="page-title !pl-0">Chat IA</h1>
              <p className="text-[11px] font-bold text-on-surface-variant/50 tracking-wide">Gestiona tu semana hablando</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={`p-2.5 rounded-xl transition-all ${historyOpen ? 'bg-primary/15 text-primary' : 'text-on-surface-variant/40 hover:text-foreground hover:bg-surface-container/50'}`}
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={createNewSession}
              className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-6 relative">
          {/* Session History Sidebar - Desktop */}
          <AnimatePresence>
            {historyOpen && (
              <motion.aside
                initial={{ opacity: 0, x: -20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 260 }}
                exit={{ opacity: 0, x: -20, width: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="hidden lg:block flex-shrink-0 overflow-hidden"
              >
                <div className="w-[260px] rounded-[24px] border border-outline-variant/15 bg-surface/60 backdrop-blur-xl p-3 space-y-2 max-h-[calc(100dvh-280px)] overflow-y-auto no-scrollbar">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/35 px-2 pb-1">
                    Historial de sesiones
                  </p>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/40 italic text-center py-8">Sin conversaciones aún</p>
                  ) : (
                    sessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => { setActiveSessionId(session.id); }}
                        className={`w-full text-left p-3 rounded-2xl transition-all group ${
                          session.id === activeSessionId
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-surface-container/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{session.title}</p>
                            <p className="text-[10px] text-on-surface-variant/40 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(session.updatedAt)}
                            </p>
                            <p className="text-[10px] text-on-surface-variant/30 mt-0.5">
                              {session.messages.length} mensajes
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteSession(e, session.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-on-surface-variant/30 hover:text-destructive flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <div className="flex-1 min-w-0">
            {/* Session History Drawer - Mobile */}
            <AnimatePresence>
              {historyOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setHistoryOpen(false)}
                  />
                  <motion.div
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '-100%', opacity: 0 }}
                    className="fixed left-0 top-0 bottom-0 w-[280px] z-50 bg-surface border-r border-outline-variant/20 p-4 space-y-3 overflow-y-auto no-scrollbar lg:hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/45">Historial</p>
                      <button onClick={() => setHistoryOpen(false)} className="p-1.5 rounded-xl hover:bg-surface-container transition-colors">
                        <X className="w-4 h-4 text-on-surface-variant/40" />
                      </button>
                    </div>
                    {sessions.length === 0 ? (
                      <p className="text-xs text-on-surface-variant/40 italic text-center py-8">Sin conversaciones aún</p>
                    ) : (
                      sessions.map(session => (
                        <button
                          key={session.id}
                          onClick={() => { setActiveSessionId(session.id); setHistoryOpen(false); }}
                          className={`w-full text-left p-3 rounded-2xl transition-all group ${
                            session.id === activeSessionId
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-surface-container/60 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{session.title}</p>
                              <p className="text-[10px] text-on-surface-variant/40 mt-0.5">{formatTime(session.updatedAt)}</p>
                            </div>
                            <button
                              onClick={(e) => deleteSession(e, session.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-on-surface-variant/30 hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </button>
                      ))
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="rounded-[28px] border border-outline-variant/12 bg-surface/80 backdrop-blur-xl shadow-sm overflow-hidden min-h-[500px] lg:min-h-[600px] flex flex-col">
              {!activeSession ? (
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="w-16 h-16 rounded-[20px] bg-primary/10 flex items-center justify-center mb-4 overflow-hidden ring-1 ring-primary/20">
                    <img src="/logo.png" alt="Adonai" className="w-10 h-10 object-contain" />
                  </div>
                  <h2 className="text-lg font-black mb-2">Habla con Adonai</h2>
                  <p className="text-sm text-on-surface-variant/60 max-w-xs mb-6 leading-relaxed">
                    Puedes crear tareas, organizar tu calendario, gestionar cuadernos y mucho más, todo con lenguaje natural.
                  </p>
                  <button
                    onClick={createNewSession}
                    className="px-6 py-3 rounded-[20px] bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Nueva conversación
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 no-scrollbar">
                    {activeSession.messages.length === 0 && !streamingMsgId && (
                      <div className="hidden">
                        <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center mb-3 overflow-hidden ring-1 ring-primary/20">
                          <img src="/logo.png" alt="Adonai" className="w-8 h-8 object-contain" />
                        </div>
                        <p className="text-sm font-bold text-on-surface-variant/60">¿En qué te ayudo hoy?</p>
                        <p className="text-xs text-on-surface-variant/40 mt-1">Escribe un mensaje para empezar</p>
                      </div>
                    )}
                    {activeSession.messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden ring-1 ring-primary/20">
                            <img src="/logo.png" alt="Adonai" className="w-5 h-5 object-contain" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] lg:max-w-[70%] rounded-[20px] px-4 py-3 text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-[6px]'
                              : 'bg-surface-container-high text-foreground rounded-bl-[6px] border border-outline-variant/10'
                          }`}
                        >
                          {/* Tool Results */}
                          {hasToolResults(msg) && (
                            <div className="mb-2 space-y-1">
                              {msg.toolResults!.map((tr, i) => (
                                <div key={i} className={`flex items-start gap-1.5 text-xs rounded-lg p-1.5 ${
                                  tr.result.success ? 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/8 text-red-600 dark:text-red-400'
                                }`}>
                                  {tr.result.success ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                                  <span className="font-medium">{tr.result.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-primary-foreground/50' : 'text-on-surface-variant/35'}`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {/* Streaming message */}
                    {streamingMsgId && !activeSession.messages.find(m => m.id === streamingMsgId) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3 justify-start"
                      >
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden ring-1 ring-primary/20">
                          <img src="/logo.png" alt="Adonai" className="w-5 h-5 object-contain" />
                        </div>
                        <div className="max-w-[85%] lg:max-w-[70%] rounded-[20px] px-4 py-3 bg-surface-container-high text-foreground rounded-bl-[6px] border border-outline-variant/10">
                          {/* Pending tool results */}
                          {pendingToolResults.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {pendingToolResults.map((tr, i) => (
                                <div key={i} className={`flex items-start gap-1.5 text-xs rounded-lg p-1.5 ${
                                  tr.result.success ? 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/8 text-red-600 dark:text-red-400'
                                }`}>
                                  {tr.result.success ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                                  <span className="font-medium">{tr.result.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm text-on-surface-variant/60 italic">Adonai está pensando...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Prompt Input */}
                  <div className="border-t border-outline-variant/10 p-3 lg:p-4">
                    <div className="flex items-end gap-2 bg-surface-container-low rounded-[20px] border border-outline-variant/15 p-1.5 transition-all focus-within:border-primary/30 focus-within:shadow-[0_0_0_2px_rgba(91,124,250,0.08)]">
                      <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-on-surface-variant/40 hover:text-foreground hover:bg-surface-container/50 transition-all"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        rows={1}
                        disabled={isStreaming}
                        className="flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm font-medium text-foreground placeholder:text-on-surface-variant/30 focus:outline-none focus-visible:outline-none min-h-[36px] max-h-[160px] no-scrollbar disabled:opacity-50"
                      />
                      {isStreaming ? (
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSend}
                          disabled={!input.trim()}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-on-surface-variant/25 mt-1.5 text-center">
                      Adonai puede cometer errores. Verifica la información importante.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
