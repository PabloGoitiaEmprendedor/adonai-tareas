import { useState, useEffect } from 'react';
import { Joyride, type Step, type EventData, ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useNavigate } from 'react-router-dom';

interface AppTutorialProps {
  run: boolean;
  onFinish: () => void;
}

const AppTutorial = ({ run, onFinish }: AppTutorialProps) => {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: '#global-add-task-button',
      content: '¡Bienvenido! Haz clic aquí para añadir tu primera tarea. Puedes dictarla por voz o escribirla rápidamente.',
      skipBeacon: true,
      placement: 'left',
      blockTargetInteraction: false,
    },
    {
      target: '#tutorial-voice-button',
      content: 'Toca el ícono de micrófono para dictar una tarea. ¡Pruébalo ahora mismo!',
      placement: 'top',
      skipBeacon: true,
      blockTargetInteraction: false,
    },
    {
      target: '#tutorial-photo-button',
      content: 'O si prefieres, toma una foto de tu agenda física para digitalizarla.',
      placement: 'top',
      skipBeacon: true,
      blockTargetInteraction: false,
    },
    {
      target: '#nav-week',
      content: 'Ahora vamos al calendario para organizar tu tiempo.',
      placement: 'top',
      skipBeacon: true,
      blockTargetInteraction: false,
    },
    {
      target: '#tutorial-block-button',
      content: '¡Crea tu primer bloque de tiempo aquí! Haz clic y reserva un espacio para enfocarte.',
      placement: 'bottom',
      skipBeacon: true,
      blockTargetInteraction: false,
    },
    {
      target: '#nav-folders',
      content: 'Finalmente, organiza todo en carpetas.',
      placement: 'top',
      skipBeacon: true,
      blockTargetInteraction: false,
    },
    {
      target: '#tutorial-share-button',
      content: 'Crea tu primera carpeta y compártela para colaborar con otros.',
      placement: 'bottom',
      skipBeacon: true,
      blockTargetInteraction: false,
    },
    {
      target: 'body',
      content: '¡Listo! Ya tienes todo para dominar Adonai.',
      placement: 'center',
    }
  ];

  const handleCallback = (data: EventData) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      setStepIndex(0);
      localStorage.setItem('adonai_tutorial_completed', 'true');
      onFinish();
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      if (index === 0 && action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (index === 3 && action === ACTIONS.NEXT) {
        navigate('/week');
        setTimeout(() => setStepIndex(index + 1), 800);
      } else if (index === 5 && action === ACTIONS.NEXT) {
        navigate('/folders');
        setTimeout(() => setStepIndex(index + 1), 800);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      } else if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      }
    }
  };

  // Synchronize tutorial with current page and handle interactive step advancement
  useEffect(() => {
    if (!run) return;
    
    // Auto-advance if we detect the user clicked the FAB but index didn't update
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (stepIndex === 0 && (target.closest('#global-add-task-button') || target.id === 'global-add-task-button')) {
        // Give the modal a split second to start opening before moving the tooltip
        setTimeout(() => setStepIndex(1), 100);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [run, stepIndex]);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      onEvent={handleCallback}
      options={{
        buttons: ['back', 'close', 'primary'],
        dismissKeyAction: 'close',
        overlayClickAction: 'close',
        overlayColor: 'hsl(var(--background) / 0.6)',
        primaryColor: 'hsl(var(--primary))',
        showProgress: false,
        zIndex: 10000,
      }}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      styles={{
        buttonPrimary: {
          fontSize: '13px',
          fontWeight: '700',
          padding: '12px 24px',
          borderRadius: '16px',
          backgroundColor: 'hsl(var(--primary))',
          boxShadow: '0 4px 12px hsl(var(--primary) / 0.3)',
        },
        buttonBack: {
          fontSize: '13px',
          fontWeight: '600',
          color: 'hsl(var(--muted-foreground))',
          marginRight: '10px',
        },
        tooltip: {
          borderRadius: '28px',
          padding: '20px',
          backgroundColor: 'hsl(var(--card))',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          fontSize: '16px',
          padding: '10px 0 20px 0',
          lineHeight: '1.5',
          color: 'hsl(var(--foreground))',
        }
      }}
    />
  );
};

export default AppTutorial;
