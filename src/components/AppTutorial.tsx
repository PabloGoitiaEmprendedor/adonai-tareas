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
      content: '¡Bienvenido! Toca este botón para empezar a organizar tu día.',
      disableBeacon: true,
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#tutorial-write-button',
      content: 'Aquí puedes escribir tus tareas de forma tradicional.',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-voice-button',
      content: 'También puedes usar tu voz para agendar tareas rápidamente.',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-photo-button',
      content: 'Incluso puedes subir fotos de tu agenda física para digitalizarla.',
      spotlightClicks: true,
    },
    {
      target: '#nav-week',
      content: 'Ahora, toca el icono de Calendario para organizar tu semana.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#tutorial-block-button',
      content: 'Toca en Nuevo Bloque para empezar a planificar.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#block-title-input',
      content: 'Escribe el nombre de tu actividad aquí.',
      spotlightClicks: true,
    },
    {
      target: '#block-start-time',
      content: 'Define el horario de tu actividad.',
      spotlightClicks: true,
    },
    {
      target: '#block-color-picker',
      content: 'Elige un color para identificar tu bloque.',
      spotlightClicks: true,
    },
    {
      target: '#block-recurring-toggle',
      content: 'Activa la repetición si es una tarea frecuente.',
      spotlightClicks: true,
    },
    {
      target: '#block-save-button',
      content: '¡Listo! Dale a Guardar para confirmar.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#nav-folders',
      content: 'Toca aquí para ir a tus Carpetas y proyectos.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#add-folder-button',
      content: 'Crea una nueva carpeta tocando el botón de añadir.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#folder-name-input',
      content: 'Configura el nombre y color de tu carpeta.',
      spotlightClicks: true,
    },
    {
      target: '#folder-create-confirm',
      content: 'Toca en Crear para finalizar la carpeta.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#tutorial-share-button',
      content: 'Puedes compartir esta carpeta con tus amigos.',
      spotlightClicks: true,
    },
    {
      target: '#nav-friends',
      content: 'Toca aquí para ver a tus Amigos.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#nav-goals',
      content: 'Finalmente, toca aquí para ver tus Metas.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: 'body',
      content: '¡Felicidades! Has completado el tutorial. ¡A darle con todo!',
      placement: 'center',
    }
  ];

  const handleCallback = (data: EventData) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      setStepIndex(0);
      localStorage.setItem('adonai_tutorial_completed', 'true');
      onFinish();
    } else if (type === EVENTS.STEP_AFTER) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      if (action === ACTIONS.NEXT) {
        if (index === 4) { // Next on #nav-week transition
          navigate('/week');
          setTimeout(() => setStepIndex(5), 600);
          return;
        } else if (index === 10) { // Next on save button transition
          navigate('/folders'); 
          setTimeout(() => setStepIndex(11), 600);
          return;
        } else if (index === 11) { // Next on folders nav transition
          navigate('/folders');
          setTimeout(() => setStepIndex(12), 600);
          return;
        } else if (index === 15) { // Next on share transition
          navigate('/friends');
          setTimeout(() => setStepIndex(16), 600);
          return;
        } else if (index === 16) { // Next on friends transition
          navigate('/goals');
          setTimeout(() => setStepIndex(17), 600);
          return;
        }
      }

      setStepIndex(nextIndex);
    }
  };

  // Strict interactive step advancement
  useEffect(() => {
    if (!run) return;
    
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const interactiveTriggers: Record<number, string> = {
        0: 'global-add-task-button',
        4: 'nav-week',
        5: 'tutorial-block-button',
        10: 'block-save-button',
        11: 'nav-folders',
        12: 'add-folder-button',
        14: 'folder-create-confirm',
        16: 'nav-friends',
        17: 'nav-goals'
      };

      const requiredId = interactiveTriggers[stepIndex];
      if (requiredId) {
        const isMatch = target.id === requiredId || target.closest(`#${requiredId}`);
        if (isMatch) {
          if (stepIndex === 0) {
            setTimeout(() => setStepIndex(1), 400);
          } else {
            setStepIndex(stepIndex + 1);
          }
        }
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [run, stepIndex]);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      showSkipButton
      disableScrolling={false}
      spotlightClicks={true}
      disableOverlayClose={true}
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
        buttonSkip: {
          fontSize: '13px',
          fontWeight: '600',
          color: 'hsl(var(--muted-foreground))',
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
