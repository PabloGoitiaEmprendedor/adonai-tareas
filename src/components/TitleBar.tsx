import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
  const isElectron = !!window.electronAPI;

  if (!isElectron) return null;

  return (
    <div className="fixed left-0 top-0 z-[120] h-8 w-full drag select-none">
      <div className="no-drag absolute right-1 top-0.5 flex h-7 items-center justify-end rounded-xl border border-outline-variant/10 bg-background/80 px-1 shadow-sm shadow-black/5 backdrop-blur-xl">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="flex h-6 w-9 items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors"
        >
          <Minus className="w-3.5 h-3.5 text-on-surface-variant/60" />
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="flex h-6 w-9 items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors"
        >
          <Square className="w-2.5 h-2.5 text-on-surface-variant/60" />
        </button>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="flex h-6 w-9 items-center justify-center rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
