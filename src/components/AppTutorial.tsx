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
      content: '¡Bienvenido! Toca aquí para empezar a organizar tu día.',
      disableBeacon: true,
      spotlightClicks: true,
      styles: { buttonNext: { display: 'none' } }
    },
    {
      target: '#tutorial-write-button',
      content: 'Primero, aquí puedes escribir tus tareas de forma tradicional si prefieres el teclado.',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-voice-button',
      content: 'O mucho mejor, ¡puedes usar tu voz! Toca el micrófono para dictar tareas en segundos cuando estés apurado.',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-photo-button',
      content: '¿Tienes una agenda física? Solo toma una foto y nosotros pasamos todo a digital por ti. ¡Es magia!',
      spotlightClicks: true,
    },
    {
      target: '#nav-week',
      content: 'Ahora vamos al calendario semanal para tener una visión clara de tus tiempos.',
      spotlightClicks: true,
      styles: { buttonNext: { display: 'none' } }
    },
    {
      target: '#tutorial-block-button',
      content: '¡Crea tu primer bloque de tiempo aquí! Toca en Nuevo Bloque.',
      spotlightClicks: true,
      styles: { buttonNext: { display: 'none' } }
    },
    {
      target: '#block-title-input',
      content: 'Escribe el nombre de tu actividad para saber en qué te enfocarás.',
      spotlightClicks: true,
    },
    {
      target: '#block-start-time',
      content: 'Define el horario de inicio y fin para reservar tu espacio.',
      spotlightClicks: true,
    },
    {
      target: '#block-color-picker',
      content: 'Elige un color para identificar rápidamente tu bloque.',
      spotlightClicks: true,
    },
    {
      target: '#block-recurring-toggle',
      content: 'Si es algo que haces seguido, puedes activar la repetición.',
      spotlightClicks: true,
    },
    {
      target: '#block-save-button',
      content: '¡Listo! Dale a Guardar para visualizarlo en tu calendario.',
      spotlightClicks: true,
      styles: { buttonNext: { display: 'none' } }
    },
    {
      target: '#nav-folders',
      content: 'También puedes organizar tus tareas en proyectos usando carpetas.',
      spotlightClicks: true,
      styles: { buttonNext: { display: 'none' } }
    },
    {
      target: '#add-folder-button',
      content: 'Crea una carpeta nueva para separar tus proyectos.',
      spotlightClicks: true,
      styles: { buttonNext: { display: 'none' } }
    },
    {
      target: '#folder-name-input',
      content: 'Ponle un nombre y elige un color para tu nueva carpeta.',
      spotlightClicks: true,
    },
    {
      target: '#folder-create-confirm',
      content: 'Dale a Crear para finalizar.',
      spotlightClicks: true,
      styles: { buttonNext: { display: 'none' } }
    },
    {
      target: '#tutorial-share-button',
      content: 'Recuerda que puedes compartir tus carpetas para colaborar con amigos.',
      spotlightClicks: true,
    },
    {
      target: '#nav-friends',
      content: 'Aquí podrás ver a tus amigos y lo que están compartiendo contigo.',
      spotlightClicks: true,
      styles: { buttonNext: { display: 'none' } }
    },
    {
      target: '#nav-goals',
      content: 'Define tus metas a largo plazo para no perder de vista lo que te inspira.',
      spotlightClicks: true,
      styles: { buttonNext: { display: 'none' } }
    },
    {
      target: 'body',
      content: '¡Excelente! Ya conoces lo básico. Vuelve a tu vista de Hoy y empieza a conquistar tus metas.',
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
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      if (action === ACTIONS.NEXT) {
        if (index === 4) { // Next on #nav-week
          navigate('/week');
          setTimeout(() => setStepIndex(5), 600);
          return;
        } else if (index === 10) { // Next on #block-save-button
          navigate('/folders'); 
          setTimeout(() => setStepIndex(11), 600);
          return;
        } else if (index === 11) { // Next on #nav-folders
          navigate('/folders');
          setTimeout(() => setStepIndex(12), 600);
          return;
        } else if (index === 15) { // Next on #tutorial-share-button
          navigate('/friends');
          setTimeout(() => setStepIndex(16), 600);
          return;
        } else if (index === 16) { // Next on #nav-friends
          navigate('/goals');
          setTimeout(() => setStepIndex(17), 600);
          return;
        }
      }

      setStepIndex(nextIndex);
    }
  };

  // Synchronize tutorial with current page and handle interactive step advancement
  useEffect(() => {
    if (!run) return;
    
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const triggers = [
        { id: 'global-add-task-button', next: 1 },
        { id: 'nav-week', next: 5 },
        { id: 'tutorial-block-button', next: 6 },
        { id: 'block-save-button', next: 11 },
        { id: 'nav-folders', next: 12 },
        { id: 'add-folder-button', next: 13 },
        { id: 'folder-create-confirm', next: 15 },
        { id: 'nav-friends', next: 17 },
        { id: 'nav-goals', next: 18 },
        { id: 'nav-today', next: 18 }
      ];

      const match = triggers.find(t => target.id === t.id || target.closest(`#${t.id}`));
      if (match) {
        if (match.id === 'global-add-task-button') {
          // Wait for modal animation
          setTimeout(() => setStepIndex(match.next), 400);
        } else {
          setStepIndex(match.next);
        }
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [run]);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      showSkipButton
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
