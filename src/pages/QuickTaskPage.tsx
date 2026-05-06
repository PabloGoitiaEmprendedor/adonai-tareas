import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTasks } from '../hooks/useTasks';
import { useNavigate } from 'react-router-dom';

export default function QuickTaskPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const { addTask } = useTasks();

  useEffect(() => {
    // Get initial text from URL or main process
    const params = new URLSearchParams(window.location.search);
    const initialText = params.get('text');
    if (initialText) setText(initialText);

    const handleText = (_event, data) => {
      setText(data.text);
    };

    window.electron?.on('set-quick-task-text', handleText);
  }, []);

  const handleCreate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await addTask({
        title: text,
        priority: 'no_urgente_no_importante', // Default
      });
      window.electron?.send('close-quick-task');
    } catch (error) {
      console.error('Error creating quick task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#1a1c1e] text-foreground p-6 flex flex-col gap-4 border border-outline-variant/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Nueva Tarea</h2>
        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
          <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </div>

      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm font-bold placeholder:text-on-surface-variant/30 leading-relaxed"
          placeholder="¿Qué hay que hacer?"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => window.electron?.send('close-quick-task')}
          className="flex-1 py-3 rounded-2xl bg-surface-container-high text-xs font-black uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={loading || !text.trim()}
          className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear Tarea'}
        </button>
      </div>
    </div>
  );
}
