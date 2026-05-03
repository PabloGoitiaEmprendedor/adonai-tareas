import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
  const isElectron = !!window.electronAPI;

  if (!isElectron) return null;

  return (
    <div className="h-10 w-full bg-background/50 backdrop-blur-md flex items-center justify-end px-2 fixed top-0 left-0 z-[40] drag select-none">
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
