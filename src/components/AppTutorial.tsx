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
      content: 'O usa tu voz para agendar tareas en segundos. ¡Solo habla!',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-photo-button',
      content: 'También puedes fotografiar tu agenda física para digitalizarla automáticamente.',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-close-capture',
      content: 'Perfecto. Ahora cierra este panel para continuar el recorrido.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#nav-week',
      content: 'Toca el Calendario para planificar tu semana con bloques de tiempo.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#tutorial-block-button',
      content: 'Toca "Nuevo Bloque" para crear un bloque de tiempo.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#block-title-input',
      content: 'Dale un nombre a tu actividad. Por ejemplo: "Trabajo profundo", "Gym", "Lectura".',
      spotlightClicks: true,
    },
    {
      target: '#block-start-time',
      content: 'Define el horario de inicio y fin de tu actividad.',
      spotlightClicks: true,
    },
    {
      target: '#block-color-picker',
      content: 'Elige un color para identificar este bloque visualmente en tu calendario.',
      spotlightClicks: true,
    },
    {
      target: '#block-recurring-toggle',
      content: 'Activa esto si es una actividad que se repite. Puedes elegir qué días.',
      spotlightClicks: true,
    },
    {
      target: '#block-save-button',
      content: '¡Listo! Guarda el bloque y quedará registrado en tu semana.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#nav-folders',
      content: 'Las Carpetas te permiten agrupar tareas por proyecto o área de tu vida.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#add-folder-button',
      content: 'Toca aquí para crear tu primera carpeta.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#folder-name-input',
      content: 'Escribe el nombre de tu proyecto o área. Por ejemplo: "Trabajo", "Casa", "Salud".',
      spotlightClicks: true,
    },
    {
      target: '#folder-create-confirm',
      content: 'Confirma para crear la carpeta. Después podrás asignar tareas a ella.',
      spotlightClicks: true,
      showNextButton: false,
      showBackButton: false,
    },
    {
      target: '#tutorial-share-button',
      content: 'Desde aquí puedes compartir esta carpeta con tus proyectos.',
      spotlightClicks: true,
    },
    {
      target: '#nav-goals',
      content: 'En Metas defines tus objetivos grandes. Cada tarea que completes te acerca a ellos.',
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
      setStepIndex(nextIndex);
    }
  };

  // Strict interactive step advancement with navigation support
  useEffect(() => {
    if (!run) return;
    
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const interactiveTriggers: Record<number, string> = {
        0: 'global-add-task-button',
        4: 'tutorial-close-capture',
        5: 'nav-week',
        6: 'tutorial-block-button',
        11: 'block-save-button',
        12: 'nav-folders',
        13: 'add-folder-button',
        15: 'folder-create-confirm',
        17: 'nav-goals'
      };

      const requiredId = interactiveTriggers[stepIndex];
      if (requiredId) {
        const isMatch = target.id === requiredId || target.closest(`#${requiredId}`);
        if (isMatch) {
          // Actions before index update
          if (stepIndex === 5) navigate('/week');
          if (stepIndex === 12) navigate('/folders');
          if (stepIndex === 17) navigate('/goals');

          const delay = (stepIndex === 5 || stepIndex === 12 || stepIndex === 17) ? 800 : 400;

          setTimeout(() => {
            setStepIndex(stepIndex + 1);
          }, delay);
        }
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [run, stepIndex, navigate]);

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
