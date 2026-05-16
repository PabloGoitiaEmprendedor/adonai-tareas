import { useEffect, useMemo, useState, useCallback } from 'react';
import { Joyride, type EventData, ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGoals } from '@/hooks/useGoals';
import { getTutorialSteps } from './tutorial/tutorialSteps';

interface AppTutorialProps {
  run: boolean;
  onFinish: () => void;
}

const click = (selector: string) => {
  const el = document.querySelector(selector) as HTMLElement;
  if (el) el.click();
};

// Inyectamos estilos sutiles y diferenciados
const injectTutorialStyles = () => {
  if (document.getElementById('tutorial-anim-styles')) return;
  const style = document.createElement('style');
  style.id = 'tutorial-anim-styles';
  style.innerHTML = `
    @keyframes tutorial-subtle-jump {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    .tutorial-activate {
      animation: tutorial-subtle-jump 2s ease-in-out infinite !important;
      border-color: #5B7CFA !important;
      box-shadow: 0 0 15px rgba(195, 245, 60, 0.4) !important;
      z-index: 999999 !important;
      position: relative !important;
    }
    .tutorial-deactivate {
      animation: tutorial-subtle-jump 2s ease-in-out infinite !important;
      border-color: #ef4444 !important;
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.3) !important;
      z-index: 999999 !important;
      position: relative !important;
    }
  `;
  document.head.appendChild(style);
};

const PriorityHighlighter = ({ content }: { content: string }) => {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [nextTarget, setNextTarget] = useState<number>(1);

  useEffect(() => {
    injectTutorialStyles();
    
    const checkButtons = () => {
      const impBtn = document.getElementById('task-importance-btn');
      const urgBtn = document.getElementById('task-urgency-btn');
      
      if (!impBtn || !urgBtn) return;
      
      const isImp = impBtn.className.includes('bg-amber-500') || impBtn.className.includes('text-amber-600');
      const isUrg = urgBtn.className.includes('bg-red-500') || urgBtn.className.includes('text-red-600');
      
      let p = 4;
      if (isImp && isUrg) p = 1;
      else if (!isImp && isUrg) p = 2;
      else if (isImp && !isUrg) p = 3;
      
      setActiveLine(p);

      if (p === nextTarget && nextTarget <= 4) {
        setNextTarget(prev => prev + 1);
      }

      // LÓGICA DE ANIMACIÓN SECUENCIAL Y SUTIL
      const updateBtnAnim = (btn: HTMLElement, shouldBeOn: boolean, isNowOn: boolean, canShow: boolean) => {
        btn.classList.remove('tutorial-activate', 'tutorial-deactivate');
        if (!canShow) return;
        
        if (shouldBeOn && !isNowOn) {
          btn.classList.add('tutorial-activate');
        } else if (!shouldBeOn && isNowOn) {
          btn.classList.add('tutorial-deactivate');
        }
      };

      if (nextTarget <= 4) {
        const targetImp = (nextTarget === 1 || nextTarget === 3);
        const targetUrg = (nextTarget === 1 || nextTarget === 2);
        
        // Guía secuencial para evitar confusión
        let showImp = true;
        let showUrg = true;

        if (nextTarget === 2) {
          // Para Solo Urgente: Primero apagar Importante si está encendida
          if (isImp) showUrg = false; 
        } else if (nextTarget === 3) {
          // Para Solo Importante: Primero apagar Urgente si está encendida
          if (isUrg) showImp = false;
        }

        updateBtnAnim(impBtn, targetImp, isImp, showImp);
        updateBtnAnim(urgBtn, targetUrg, isUrg, showUrg);
      } else {
        impBtn.classList.remove('tutorial-activate', 'tutorial-deactivate');
        urgBtn.classList.remove('tutorial-activate', 'tutorial-deactivate');
      }
    };

    const interval = setInterval(checkButtons, 100);
    return () => {
      clearInterval(interval);
      document.getElementById('task-importance-btn')?.classList.remove('tutorial-activate', 'tutorial-deactivate');
      document.getElementById('task-urgency-btn')?.classList.remove('tutorial-activate', 'tutorial-deactivate');
    };
  }, [nextTarget]);

  const isCompleted = nextTarget > 4;

  const getInstruction = () => {
    if (isCompleted) return "🎯 ¡Dominado! Pulsa Enter para continuar.";
    
    // Obtenemos estado actual para instrucciones dinámicas
    const impBtn = document.getElementById('task-importance-btn');
    const urgBtn = document.getElementById('task-urgency-btn');
    const isImp = impBtn?.className.includes('bg-amber-500') || impBtn?.className.includes('text-amber-600');
    const isUrg = urgBtn?.className.includes('bg-red-500') || urgBtn?.className.includes('text-red-600');

    switch (nextTarget) {
      case 1: return "Prueba Prioridad 1: Activa Importante y Urgente.";
      case 2: 
        if (isImp) return "Prioridad 2: Primero desactiva 'Importante'.";
        return "Ahora activa 'Urgente'.";
      case 3: 
        if (isUrg) return "Prioridad 3: Primero desactiva 'Urgente'.";
        return "Ahora activa 'Importante'.";
      case 4: return "Por último la 4: Desactiva ambos botones.";
      default: return "";
    }
  };

  return (
    <div 
      data-tutorial-completed={isCompleted} 
      data-tutorial-instruction={getInstruction()}
    >
      {content.split('\n').map((line, i) => {
        const trimmedLine = line.trim();
        const isPriorityLine = trimmedLine.match(/^[1-4]\./);
        const priorityNum = isPriorityLine ? parseInt(trimmedLine[0]) : null;
        
        const isActive = activeLine !== null && priorityNum === activeLine && priorityNum === nextTarget - 1;

        if (isPriorityLine) {
          return (
            <motion.div
              key={i}
              initial={false}
              animate={{ 
                scale: isActive ? 1.02 : 1,
                opacity: isActive ? 1 : 0.4,
                color: isActive ? '#fff' : '#fff',
                fontWeight: isActive ? 800 : 500,
                textShadow: isActive ? '0 0 20px rgba(195, 245, 60, 0.5)' : 'none',
              }}
              className="py-1 my-0.5 transition-all duration-300 relative origin-left"
            >
              {line}
            </motion.div>
          );
        }
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
};

  const CustomTooltip = ({
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    tooltipProps,
    isLastStep,
    setTooltipRef
  }: any) => {
    const [canProceed, setCanProceed] = useState(true);
    const [priorityInstruction, setPriorityInstruction] = useState<string | null>(null);

    useEffect(() => {
      const checkStep = () => {
        if (index === 2) {
          const input = document.getElementById('task-title-input') as HTMLInputElement;
          return input && input.value.trim().length > 0;
        }
        
        if (step.target === '#task-matrix-selector') {
          const completedEl = document.querySelector('[data-tutorial-completed="true"]');
          return !!completedEl;
        }
        
        return true;
      };

      const interval = setInterval(() => {
        setCanProceed(checkStep());
        const instr = document.querySelector('[data-tutorial-instruction]')?.getAttribute('data-tutorial-instruction');
        setPriorityInstruction(instr || null);
      }, 100);
      return () => clearInterval(interval);
    }, [index, step.target]);

    const isCompleted = priorityInstruction?.includes('🎯');

  // Advance tutorial (works for both keyboard Enter and touch tap)
  const advanceTutorial = useCallback(() => {
    if (!canProceed) return;
    if (isLastStep) {
      if (closeProps.onClick) closeProps.onClick(new MouseEvent('click') as any);
    } else {
      document.dispatchEvent(new CustomEvent('force-tutorial-next', { detail: index + 1 }));
    }
  }, [canProceed, isLastStep, closeProps, index]);

  // Enter key listener for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canProceed) {
        e.preventDefault();
        e.stopPropagation();
        advanceTutorial();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [canProceed, advanceTutorial]);

  const customWidth = (step as any).width ? `${(step as any).width}px` : 'min(440px,calc(100vw-32px))';

  return (
    <div 
      ref={setTooltipRef}
      {...tooltipProps} 
      style={{ 
        ...(tooltipProps?.style || {}), 
        zIndex: 100001,
        pointerEvents: 'auto',
        width: customWidth
      }} 
      className="bg-[#111111]/95 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] text-white relative overflow-hidden group pointer-events-auto"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className="mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-2 h-2 rounded-full bg-primary" 
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
                Progreso de Aprendizaje
              </span>
            </div>
            <button {...closeProps} className="text-white/20 hover:text-white transition-colors p-1 translate-x-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.pow((index + 1) / (step.totalSteps || 20), 0.45) * 100}%` }}
              transition={{ 
                type: "spring", 
                stiffness: 40, 
                damping: 12,
                mass: 1,
                restDelta: 0.001
              }}
              className="h-full bg-primary relative"
              style={{ boxShadow: '0 0 20px rgba(195, 245, 60, 0.4)' }}
            >
              <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/2"
              />
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/30 blur-sm" />
            </motion.div>
          </div>
        </div>

        {step.title && (
          <h3 className="text-xl font-black mb-2 tracking-tight leading-tight text-white font-headline uppercase">
            {step.title}
          </h3>
        )}
        
        <div className="text-[13.5px] leading-relaxed text-white/60 font-medium mb-5 whitespace-pre-line">
          {step.target === '#task-matrix-selector' ? ( // Priority Step
            <PriorityHighlighter content={step.content} />
          ) : (
            step.content
          )}
        </div>

        {(priorityInstruction || !canProceed) && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: isCompleted ? 1 : [1, 1.01, 1],
              boxShadow: isCompleted 
                ? '0 0 15px rgba(195, 245, 60, 0.15)' 
                : ['0 0 12px rgba(239, 68, 68, 0.08)', '0 0 22px rgba(239, 68, 68, 0.18)', '0 0 12px rgba(239, 68, 68, 0.08)']
            }}
            transition={{
              opacity: { duration: 0.4 },
              y: { duration: 0.4 },
              scale: { repeat: Infinity, duration: 4, ease: "easeInOut" },
              boxShadow: { repeat: Infinity, duration: 4, ease: "easeInOut" }
            }}
            className={`my-2 py-3 px-5 border rounded-[22px] flex items-center gap-3.5 transition-colors duration-500 relative overflow-hidden ${
              isCompleted 
                ? 'bg-primary/10 border-primary/20' 
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            {/* Shimmer effect background - más lento y suave */}
            <motion.div 
              animate={{ x: ['-200%', '200%'] }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
            />

            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className={`w-2 h-2 rounded-full shrink-0 ${isCompleted ? 'bg-primary shadow-[0_0_10px_#5B7CFA]' : 'bg-red-500 shadow-[0_0_10px_#EB5757]'}`}
            />
            <p className={`text-[12.5px] font-extrabold tracking-tight relative z-10 ${isCompleted ? 'text-primary' : 'text-red-400'}`}>
              {priorityInstruction || (index === 2 ? 'Escribe algo para continuar...' : 'Completa el paso para continuar...')}
            </p>
          </motion.div>
        )}

        <div className="flex items-center gap-4">
          {index > 0 && (
            <button
              {...backProps}
              className="flex-1 h-12 rounded-[20px] bg-white/5 border border-white/5 text-[13px] font-bold hover:bg-white/10 transition-all text-white/70"
            >
              Atrás
            </button>
          )}
          
          <button
            type="button"
            disabled={!canProceed}
            onClick={advanceTutorial}
            style={{ 
              position: 'relative', 
              zIndex: 999999,
              userSelect: 'none'
            }}
            className={`flex-[2] h-12 rounded-[20px] text-[14px] font-black transition-all flex items-center justify-center gap-2.5 ${
              canProceed 
                ? 'bg-primary text-black shadow-lg shadow-primary/20 opacity-100 cursor-pointer active:scale-[0.97]' 
                : 'bg-white/10 text-white/30 border border-white/5 opacity-50 cursor-default'
            }`}
          >
            <span>{isLastStep ? '¡Empezar!' : 'Siguiente'}</span>
            {canProceed && !isLastStep && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/10 rounded-lg border border-black/5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


const AppTutorial = ({ run, onFinish }: AppTutorialProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { goals, isLoading } = useGoals();
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => {
    const rawSteps = getTutorialSteps({ hasGoals: goals.length > 0 });
    return rawSteps.map(s => ({ ...s, totalSteps: rawSteps.length }));
  }, [goals.length]);

  // Bloqueo físico de interacciones para pasos informativos
  useEffect(() => {
    const currentStep = steps[stepIndex];
    const styleId = 'tutorial-interaction-blocker';
    
    if (run && currentStep && (currentStep as any).spotlightClicks === false) {
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      const targetSelector = typeof currentStep.target === 'string' ? currentStep.target : '';
      if (targetSelector) {
        // Bloqueamos el elemento específico y forzamos el cursor por defecto
        styleEl.innerHTML = `
          ${targetSelector} { 
            pointer-events: none !important; 
            cursor: default !important;
            user-select: none !important;
          }
          /* Aseguramos que el overlay de Joyride sea el que reciba cualquier clic residual */
          .react-joyride__spotlight {
            pointer-events: none !important;
          }
        `;
      }
    } else {
      const styleEl = document.getElementById(styleId);
      if (styleEl) styleEl.remove();
    }

    return () => {
      const styleEl = document.getElementById(styleId);
      if (styleEl) styleEl.remove();
    };
  }, [stepIndex, run, steps]);

  // Global event listener to force step advancement and bypass Joyride blocked events
  useEffect(() => {
    const handleForceNext = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nextIdx = customEvent.detail;
      const currentIdx = nextIdx - 1;
      const target = steps[currentIdx]?.target as string;

      // Handle specific click logic for current target before advancing
      if (target === '#global-add-task-button') {
        click('#global-add-task-button');
        setTimeout(() => {
          click('#fab-text-option');
          setTimeout(() => setStepIndex(nextIdx), 900);
        }, 450);
      } else if (target === '#task-link-input') {
        // This is the "Continuar" transition
        click('#task-continue-btn');
        setTimeout(() => setStepIndex(nextIdx), 700);
      } else if (target === '#task-save-btn') {
        click('#task-save-btn');
        setTimeout(() => {
          setStepIndex(nextIdx);
          document.body.classList.remove('tutorial-can-continue');
        }, 1000);
      } else {
        setStepIndex(nextIdx);
      }
      
      // Manage tutorial-can-continue class
      // Enable the continue button as soon as we reach the Title input step (index 2)
      if (nextIdx >= 2) {
        document.body.classList.add('tutorial-can-continue');
      } else {
        document.body.classList.remove('tutorial-can-continue');
      }
    };

    const handleFinish = () => {
      setStepIndex(0);
      localStorage.setItem('adonai_tutorial_completed', 'true');
      onFinish();
    };
    
    document.addEventListener('force-tutorial-next', handleForceNext);
    document.addEventListener('tutorial-finish', handleFinish);
    
    return () => {
      document.removeEventListener('force-tutorial-next', handleForceNext);
      document.removeEventListener('tutorial-finish', handleFinish);
    };
  }, [steps, onFinish]);

  const getRouteForStep = (index: number) => {
    const total = steps.length;
    // Step 19 (Final): Stay
    if (index >= total - 1) return location.pathname;
    // Step 18 (Weekly Report): Profile
    // Step 17 (Stats): Profile
    if (index >= total - 3) return '/profile';
    // Step 16 (Profile Link): Sidebar (can be on folders)
    // Step 15 (New Folder): Folders
    // Step 14 (Folders Intro): Folders
    if (index >= total - 6) return '/folders';
    // Step 13 (Folders Link): Sidebar (can be on week)
    // Step 12 (Calendar Grid): Week
    if (index >= total - 8) return '/week';
    // Step 11 (Week Link): Sidebar (can be on daily)
    return '/daily';
  };

  // Helper function to fire a native click event safely
  const click = (selector: string) => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) {
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.click();
    }
  };

  // We keep this just for external close events, but manual progression is handled by the custom events
  const handleEvent = (data: CallBackProps) => {
    const { action, status, type, index } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      setStepIndex(0);
      localStorage.setItem('adonai_tutorial_completed', 'true');
      onFinish();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      console.log(`Tutorial advancing to ${nextIndex}`);
      setStepIndex(nextIndex);
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Tutorial target not found for step ${index}. Recovering...`);
      
      // Phase regression check
      const isCapturePhase = !!document.getElementById('task-title-input');
      const isPlanningPhase = !!document.getElementById('task-date-selector');

      if (index >= 6 && isCapturePhase && !isPlanningPhase) {
        setStepIndex(4);
        return;
      }

      // Skip missing steps automatically if in a safe range
      if (index < steps.length - 1) {
        setStepIndex(index + 1);
      }
    }

    if (type === EVENTS.TOUR_END) {
      handleFinish();
    }
  };

  useEffect(() => {
    if (!run) return;
    const expectedRoute = getRouteForStep(stepIndex);
    if (location.pathname !== expectedRoute) {
      navigate(expectedRoute);
    }
  }, [run, stepIndex, location.pathname, navigate]);

  useEffect(() => {
    if (run) {
      document.body.classList.add('tutorial-active');
    } else {
      document.body.classList.remove('tutorial-active');
    }
    return () => {
      document.body.classList.remove('tutorial-active');
    };
  }, [run]);

  if (!run || isLoading) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep={false}
      disableScrolling={true}
      disableOverlayClose={true}
      tooltipComponent={CustomTooltip}
      onEvent={handleEvent}
      styles={{
        options: {
          zIndex: 2147483647,
          primaryColor: '#00D1FF',
          backgroundColor: '#111111',
          arrowColor: '#111111',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          spotlightShadowCursor: 'default'
        },
        spotlight: {
          borderRadius: 24,
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        },
        arrow: {
          color: '#111111',
        }
      }}
      floaterProps={{
        styles: {
          floater: { filter: 'none' }
        },
        options: {
          modifiers: [
            {
              name: 'preventOverflow',
              options: {
                padding: 24,
                boundary: 'viewport',
                altAxis: true,
              },
            },
            {
              name: 'flip',
              options: {
                padding: 24,
                behavior: ['top', 'bottom', 'right', 'left'],
              },
            },
            {
              name: 'offset',
              options: {
                offset: [0, 12],
              },
            },
          ],
        },
      }}
      spotlightPadding={8}
      disableOverlay={false}
      disableCloseOnEsc={false}
    />
  );
};

export default AppTutorial;
