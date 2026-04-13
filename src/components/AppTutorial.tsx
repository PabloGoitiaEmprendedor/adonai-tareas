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
    },
    {
      target: '#tutorial-write-button',
      content: 'Aquí puedes escribir tus tareas de forma tradicional.',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-voice-button',
      content: 'Sabías que también puedes usar tu voz para agendar tareas rápidamente si no tienes las manos libres.',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-photo-button',
      content: 'Incluso puedes capturar fotos de tu agenda física y nosotros digitalizamos las tareas por ti.',
      spotlightClicks: true,
    },
    {
      target: '#nav-week',
      content: 'Ahora vamos al calendario semanal para tener una visión clara de tus tiempos.',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-block-button',
      content: 'Aquí puedes reservar bloques de tiempo. ¡Toca en Nuevo Bloque para ver cómo funciona!',
      spotlightClicks: true,
    },
    {
      target: '#block-title-input',
      content: 'Solo tienes que ponerle un nombre, elegir el horario y un color que te guste.',
      spotlightClicks: true,
    },
    {
      target: '#block-save-button',
      content: 'Al guardarlo, aparecerá en tu calendario para ayudarte a mantener el enfoque.',
      spotlightClicks: true,
    },
    {
      target: '#nav-folders',
      content: 'También puedes organizar tus tareas en proyectos o categorías usando carpetas.',
      spotlightClicks: true,
    },
    {
      target: '#add-folder-button',
      content: 'Crea una carpeta nueva para separar lo personal de lo profesional.',
      spotlightClicks: true,
    },
    {
      target: '#folder-name-input',
      content: 'Ponle un nombre, elige un color y ¡listo!',
      spotlightClicks: true,
    },
    {
      target: '#folder-create-confirm',
      content: 'Ya tienes tu carpeta organizada.',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-share-button',
      content: 'Y recuerda que puedes compartir tus carpetas para colaborar con amigos en tiempo real.',
      spotlightClicks: true,
    },
    {
      target: '#nav-friends',
      content: 'Aquí podrás ver a tus amigos y lo que están compartiendo contigo.',
      spotlightClicks: true,
    },
    {
      target: '#nav-goals',
      content: 'Define tus metas a largo plazo para no perder de vista lo que te inspira.',
      spotlightClicks: true,
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
        } else if (index === 7) { // Next on #block-save-button
          navigate('/folders'); 
          setTimeout(() => setStepIndex(8), 600);
          return;
        } else if (index === 8) { // Next on #nav-folders
          navigate('/folders');
          setTimeout(() => setStepIndex(9), 600);
          return;
        } else if (index === 12) { // Next on #tutorial-share-button
          navigate('/friends');
          setTimeout(() => setStepIndex(13), 600);
          return;
        } else if (index === 13) { // Next on #nav-friends
          navigate('/goals');
          setTimeout(() => setStepIndex(14), 600);
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
        { id: 'block-save-button', next: 8 },
        { id: 'nav-folders', next: 9 },
        { id: 'add-folder-button', next: 10 },
        { id: 'folder-create-confirm', next: 12 },
        { id: 'nav-friends', next: 13 },
        { id: 'nav-goals', next: 14 },
        { id: 'nav-today', next: 15 }
      ];

      const match = triggers.find(t => target.id === t.id || target.closest(`#${t.id}`));
      if (match) {
        setStepIndex(match.next);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [run]);

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
