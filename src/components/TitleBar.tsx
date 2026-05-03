import React from 'react';
import { Minus, Square, X, Check } from 'lucide-react';

const TitleBar = () => {
  const isElectron = !!window.electronAPI;

  if (!isElectron) return null;

  return (
    <div className="h-10 w-full bg-background/50 backdrop-blur-md flex items-center justify-between px-4 fixed top-0 left-0 z-[100] drag select-none border-b border-outline-variant/5">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={4} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
          Adonai
        </span>
      </div>

      <div className="flex items-center no-drag">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <Minus className="w-4 h-4 text-on-surface-variant/60" />
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <Square className="w-3 h-3 text-on-surface-variant/60" />
        </button>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="w-10 h-10 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
