import { useState, useEffect } from 'react';
import Joyride, { type Step, type CallBackProps, ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useNavigate } from 'react-router-dom';

interface AppTutorialProps {
  run: boolean;
  onFinish: () => void;
}

const AppTutorial = ({ run, onFinish }: AppTutorialProps) => {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  // Reset step index when tutorial starts fresh
  useEffect(() => {
    if (run) setStepIndex(0);
  }, [run]);

  const steps: Step[] = [
    {
      target: '#global-add-task-button',
      content: '¡Bienvenido! Toca este botón para empezar a organizar tu día.',
      disableBeacon: true,
      spotlightClicks: true,
      hideFooter: true,
    },
    {
      target: '#tutorial-write-button',
      content: 'Aquí puedes escribir tus tareas de forma tradicional.',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#tutorial-voice-button',
      content: 'O usa tu voz para agendar tareas en segundos. ¡Solo habla!',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#tutorial-photo-button',
      content: 'También puedes fotografiar tu agenda física para digitalizarla automáticamente.',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#tutorial-close-capture',
      content: 'Perfecto. Ahora cierra este panel para continuar el recorrido.',
      spotlightClicks: true,
      hideFooter: true,
      disableBeacon: true,
    },
    {
      target: '#nav-week',
      content: 'Toca el Calendario para planificar tu semana con bloques de tiempo.',
      spotlightClicks: true,
      hideFooter: true,
      disableBeacon: true,
    },
    {
      target: '#tutorial-block-button',
      content: 'Toca "Nuevo Bloque" para crear un bloque de tiempo.',
      spotlightClicks: true,
      hideFooter: true,
      disableBeacon: true,
    },
    {
      target: '#block-title-input',
      content: 'Dale un nombre a tu actividad. Por ejemplo: "Trabajo profundo", "Gym", "Lectura".',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#block-start-time',
      content: 'Define el horario de inicio y fin de tu actividad.',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#block-color-picker',
      content: 'Elige un color para identificar este bloque visualmente en tu calendario.',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#block-recurring-toggle',
      content: 'Activa esto si es una actividad que se repite. Puedes elegir qué días.',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#block-save-button',
      content: '¡Listo! Guarda el bloque y quedará registrado en tu semana.',
      spotlightClicks: true,
      hideFooter: true,
      disableBeacon: true,
    },
    {
      target: '#nav-folders',
      content: 'Las Carpetas te permiten agrupar tareas por proyecto o área de tu vida.',
      spotlightClicks: true,
      hideFooter: true,
      disableBeacon: true,
    },
    {
      target: '#add-folder-button',
      content: 'Toca aquí para crear tu primera carpeta.',
      spotlightClicks: true,
      hideFooter: true,
      disableBeacon: true,
    },
    {
      target: '#folder-name-input',
      content: 'Escribe el nombre de tu proyecto o área. Por ejemplo: "Trabajo", "Casa", "Salud".',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#folder-color-selector',
      content: 'Elige un color para identificar esta carpeta de un vistazo.',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#folder-create-confirm',
      content: 'Confirma para crear la carpeta. Después podrás asignar tareas a ella.',
      spotlightClicks: true,
      hideFooter: true,
      disableBeacon: true,
    },
    {
      target: '#tutorial-share-button',
      content: 'Desde aquí puedes compartir esta carpeta con amigos o compañeros de equipo.',
      spotlightClicks: true,
      disableBeacon: true,
    },
    {
      target: '#nav-friends',
      content: 'En Amigos puedes conectar con personas de tu entorno y ver su progreso.',
      spotlightClicks: true,
      hideFooter: true,
      disableBeacon: true,
    },
    {
      target: '#nav-goals',
      content: 'En Metas defines tus objetivos grandes. Cada tarea que completes te acerca a ellos.',
      spotlightClicks: true,
      hideFooter: true,
      disableBeacon: true,
    },
    {
      target: 'body',
      content: '¡Felicidades! Ya conoces Adonai. Recuerda: puedes volver a este recorrido desde el menú lateral en "Guía rápida". ¡A darle con todo!',
      placement: 'center',
      disableBeacon: true,
    }
  ];

  const handleCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      action === ACTIONS.CLOSE
    ) {
      setStepIndex(0);
      localStorage.setItem('adonai_tutorial_completed', 'true');
      onFinish();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const next = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(next);
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      // If target not found, skip this step to avoid getting stuck
      setStepIndex(index + 1);
    }
  };

  useEffect(() => {
    if (!run) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Steps that require user interaction to advance (no Next button shown)
      const interactiveTriggers: Record<number, string> = {
        0: 'global-add-task-button',
        4: 'tutorial-close-capture',
        5: 'nav-week',
        6: 'tutorial-block-button',
        11: 'block-save-button',
        12: 'nav-folders',
        13: 'add-folder-button',
        16: 'folder-create-confirm',
        18: 'nav-friends',
        19: 'nav-goals',
      };

      const requiredId = interactiveTriggers[stepIndex];
      if (!requiredId) return;

      const isMatch = target.id === requiredId || !!target.closest(`#${requiredId}`);
      if (!isMatch) return;

      // Navigate before updating step for page-transition steps
      if (stepIndex === 5) navigate('/week');
      if (stepIndex === 12) navigate('/folders');
      if (stepIndex === 18) navigate('/friends');
      if (stepIndex === 19) navigate('/goals');

      // Delay: more time for page transitions and modal animations
      const delay =
        stepIndex === 0 ? 600 :
        (stepIndex === 5 || stepIndex === 12 || stepIndex === 18 || stepIndex === 19) ? 900 :
        400;

      setTimeout(() => {
        setStepIndex((prev) => prev + 1);
      }, delay);
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
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          overlayColor: 'rgba(0,0,0,0.55)',
          zIndex: 10000,
        },
        buttonPrimary: {
          fontSize: '13px',
          fontWeight: '700',
          padding: '12px 24px',
          borderRadius: '16px',
        },
        buttonBack: {
          fontSize: '13px',
          fontWeight: '600',
          marginRight: '10px',
        },
        buttonSkip: {
          fontSize: '13px',
          fontWeight: '600',
        },
        tooltip: {
          borderRadius: '28px',
          padding: '20px',
          backgroundColor: 'hsl(var(--card))',
        },
        tooltipContent: {
          fontSize: '15px',
          padding: '10px 0 20px 0',
          lineHeight: '1.5',
          color: 'hsl(var(--foreground))',
        },
      }}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
    />
  );
};

export default AppTutorial;
