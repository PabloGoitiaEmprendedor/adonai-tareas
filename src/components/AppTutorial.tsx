import { useEffect, useMemo, useState } from 'react';
import { Joyride, type EventData, ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { getTutorialSteps } from './tutorial/tutorialSteps';

interface AppTutorialProps {
  run: boolean;
  onFinish: () => void;
}

const CustomTooltip = ({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep
}: any) => {
  const [canProceed, setCanProceed] = useState(true);

  useEffect(() => {
    // Step 2 is Título ("Escribe tu tarea")
    if (index === 2) {
      setCanProceed(false);
      const checkInput = () => {
        const input = document.getElementById('task-title-input') as HTMLInputElement;
        if (input && input.value.trim().length > 0) {
          setCanProceed(true);
        } else {
          setCanProceed(false);
        }
      };
      
      checkInput();
      const interval = setInterval(checkInput, 200);
      return () => clearInterval(interval);
    } else {
      setCanProceed(true);
    }
  }, [index]);

  // Enter key listener to bypass clicks entirely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canProceed) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isLastStep) {
          if (closeProps.onClick) closeProps.onClick(e as any);
        } else {
          document.dispatchEvent(new CustomEvent('force-tutorial-next', { detail: index + 1 }));
          if (index === 4) {
             const continueBtn = document.getElementById('task-continue-btn');
             if (continueBtn) {
               continueBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
               continueBtn.click();
             }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [canProceed, index, isLastStep, closeProps]);

  return (
    <div 
      {...tooltipProps} 
      style={{ 
        ...tooltipProps.style, 
        zIndex: 100001,
        pointerEvents: 'auto'
      }} 
      className="max-w-sm w-full bg-[#111111] border border-white/5 rounded-[32px] p-8 shadow-2xl text-white overflow-hidden relative group pointer-events-auto"
    >
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 blur-[60px] rounded-full pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/10">
            Paso {index + 1} de {step.totalSteps || 14}
          </span>
          <button {...closeProps} className="text-white/20 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step.title && (
          <h3 className="text-2xl font-black mb-4 tracking-tight leading-tight text-white font-headline">
            {step.title}
          </h3>
        )}
        
        <div className="text-[16px] leading-relaxed text-white/60 font-medium mb-10 whitespace-pre-line">
          {step.content}
        </div>

        <div className="flex items-center gap-4">
          {index > 0 && (
            <button
              {...backProps}
              className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/5 text-sm font-bold hover:bg-white/10 transition-all text-white"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); }} // Prevent focus loss
            onMouseDown={(e) => {
              if (!canProceed) return;
              e.stopPropagation();
              if (isLastStep) {
                if (closeProps.onClick) closeProps.onClick(e);
              } else {
                document.dispatchEvent(new CustomEvent('force-tutorial-next', { detail: index + 1 }));
                if (index === 4) {
                   const continueBtn = document.getElementById('task-continue-btn');
                   if (continueBtn) {
                     continueBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                     continueBtn.click();
                   }
                }
              }
            }}
            onClick={(e) => {
              if (!canProceed) return;
              e.stopPropagation();
              if (isLastStep) {
                if (closeProps.onClick) closeProps.onClick(e);
              } else {
                document.dispatchEvent(new CustomEvent('force-tutorial-next', { detail: index + 1 }));
              }
            }}
            disabled={!canProceed}
            style={{ position: 'relative', zIndex: 999999, pointerEvents: 'auto' }}
            className={`flex-[2] h-12 rounded-2xl text-sm font-black transition-all flex flex-col items-center justify-center ${
              canProceed 
                ? 'bg-primary text-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            <span>{isLastStep ? '¡Empezar!' : 'Siguiente'}</span>
            {canProceed && !isLastStep && <span className="text-[9px] opacity-60 font-medium -mt-1">(Presiona Enter)</span>}
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
      if (nextIdx >= 4) {
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
    if (index >= total - 1) return location.pathname;
    if (index >= total - 2) return '/profile';
    if (index >= total - 3) return '/week';
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
    
    // Robust recovery if Framer Motion causes Joyride to lose the target during transitions
    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Tutorial target not found for step ${index}. Retrying or skipping...`);
      // If we lost target at description or link, we probably transitioned to Planning phase
      if (index === 3 || index === 4) {
        document.dispatchEvent(new CustomEvent('force-tutorial-next', { detail: 5 }));
      } else {
        // Just retry the same step after a brief delay to allow animations to finish
        setTimeout(() => setStepIndex(index), 500);
      }
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
          overlayColor: 'transparent',
        }
      }}
    />
  );
};

export default AppTutorial;
