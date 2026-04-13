import { useState } from 'react';
import { Joyride, type EventData, type Step, ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useNavigate } from 'react-router-dom';

interface AppTutorialProps {
  run: boolean;
  onFinish: () => void;
}

const steps: Step[] = [
  {
    target: '#global-add-task-button',
    content: '¡Bienvenido! Empecemos por lo básico. Haz clic aquí para añadir tu primera tarea o planificar tu día.',
    skipBeacon: true,
    placement: 'left',
  },
  {
    target: '#tutorial-photo-button',
    content: '¿No tienes tiempo de escribir? Toma una foto de tu agenda o notas y Adonai la transcribirá por ti. ¡Pruébalo cuando tengas tu libreta a mano!',
    placement: 'top',
  },
  {
    target: '#nav-week',
    content: 'En la vista de calendario puedes ver tu semana completa y organizar tus tiempos de forma visual.',
    placement: 'top',
  },
  {
    target: '#tutorial-block-button',
    content: 'Los bloques de tiempo son ideales para proteger tus horas de enfoque. ¡Crea uno para tus tareas más importantes!',
    placement: 'bottom',
  },
  {
    target: '#nav-folders',
    content: 'Crea carpetas para separar tus proyectos personales, de trabajo o estudio.',
    placement: 'top',
  },
  {
    target: '#tutorial-share-button',
    content: '¡Lo mejor es hacerlo acompañado! Invita a tus amigos a tus carpetas para compartir tareas y metas.',
    placement: 'bottom',
  },
  {
    target: 'body',
    content: '¡Ya conoces lo esencial! Recuerda que Adonai está aquí para ayudarte a que nada se te olvide. ¡A por ello!',
    placement: 'center',
  },
];

const AppTutorial = ({ run, onFinish }: AppTutorialProps) => {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const handleEvent = (data: EventData) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setStepIndex(0);
      localStorage.setItem('adonai_tutorial_completed', 'true');
      onFinish();
      return;
    }

    if (type !== EVENTS.STEP_AFTER && type !== EVENTS.TARGET_NOT_FOUND) {
      return;
    }

    if (index === 1 && action === ACTIONS.NEXT) {
      navigate('/week');
      window.setTimeout(() => setStepIndex(index + 1), 800);
      return;
    }

    if (index === 3 && action === ACTIONS.NEXT) {
      navigate('/folders');
      window.setTimeout(() => setStepIndex(index + 1), 800);
      return;
    }

    if (action === ACTIONS.PREV) {
      setStepIndex(Math.max(index - 1, 0));
      return;
    }

    setStepIndex(index + 1);
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      onEvent={handleEvent}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      options={{
        buttons: ['back', 'primary', 'skip'],
        overlayClickAction: false,
        primaryColor: '#4BE277',
        showProgress: true,
        skipScroll: true,
        zIndex: 10000,
      }}
      styles={{
        buttonPrimary: {
          fontSize: '12px',
          fontWeight: 'bold',
          padding: '10px 18px',
          borderRadius: '12px',
        },
        buttonBack: {
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#666',
        },
        buttonSkip: {
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#666',
        },
        tooltip: {
          borderRadius: '24px',
          padding: '15px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          fontSize: '15px',
          padding: '15px 0',
          lineHeight: '1.4',
        },
      }}
    />
  );
};

export default AppTutorial;
