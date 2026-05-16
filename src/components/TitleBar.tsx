import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
  const isElectron = !!window.electronAPI;

  if (!isElectron) return null;

  return (
    <div className="fixed left-0 top-0 z-[120] h-9 w-full drag select-none border-b border-outline-variant/10 bg-background/88 backdrop-blur-xl">
      <div className="flex h-full items-center justify-end px-1.5 no-drag">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="flex h-8 w-10 items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors"
        >
          <Minus className="w-4 h-4 text-on-surface-variant/60" />
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="flex h-8 w-10 items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors"
        >
          <Square className="w-3 h-3 text-on-surface-variant/60" />
        </button>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="flex h-8 w-10 items-center justify-center rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
