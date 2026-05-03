import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
  const isElectron = !!window.electronAPI;

  if (!isElectron) return null;

  return (
    <div className="h-8 w-full bg-transparent flex items-center justify-end px-1 fixed top-0 left-0 z-[100] drag select-none">
      <div className="flex items-center no-drag">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="w-10 h-8 flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <Minus className="w-4 h-4 text-[#8C8C8C]" />
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="w-10 h-8 flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <Square className="w-3 h-3 text-[#8C8C8C]" />
        </button>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="w-12 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
