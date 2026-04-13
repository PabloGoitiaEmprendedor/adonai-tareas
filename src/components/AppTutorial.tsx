import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';

interface AppTutorialProps {
  run: boolean;
  onFinish: () => void;
}

const AppTutorial = ({ run, onFinish }: AppTutorialProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: '#global-add-task-button',
      content: '¡Bienvenido! Empecemos por lo básico. Haz clic aquí para añadir tu primera tarea o planificar tu día.',
      disableBeacon: true,
      placement: 'left',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-photo-button',
      content: '¿No tienes tiempo de escribir? Toma una foto de tu agenda o notas y Adonai la transcribirá por ti. ¡Pruébalo cuando tengas tu libreta a mano!',
      placement: 'top',
      spotlightClicks: true,
    },
    {
      target: '#nav-week',
      content: 'En la vista de calendario puedes ver tu semana completa y organizar tus tiempos de forma visual.',
      placement: 'top',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-block-button',
      content: 'Los bloques de tiempo son ideales para proteger tus horas de enfoque. ¡Crea uno para tus tareas más importantes!',
      placement: 'bottom',
      spotlightClicks: true,
    },
    {
      target: '#nav-folders',
      content: 'Crea carpetas para separar tus proyectos personales, de trabajo o estudio.',
      placement: 'top',
      spotlightClicks: true,
    },
    {
      target: '#tutorial-share-button',
      content: '¡Lo mejor es hacerlo acompañado! Invita a tus amigos a tus carpetas para compartir tareas y metas.',
      placement: 'bottom',
      spotlightClicks: true,
    },
    {
      target: 'body',
      content: '¡Ya conoces lo esencial! Recuerda que Adonai está aquí para ayudarte a que nada se te olvide. ¡A por ello!',
      placement: 'center',
    }
  ];

  const handleCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setStepIndex(0);
      localStorage.setItem('adonai_tutorial_completed', 'true');
      onFinish();
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      if (index === 0 && action === ACTIONS.NEXT) {
        // We move to step 1 (photo button), which is in the modal.
        // We hope the modal is open if they clicked it, or we skip if not found.
        setStepIndex(index + 1);
      } else if (index === 1 && action === ACTIONS.NEXT) {
        navigate('/week');
        setTimeout(() => setStepIndex(index + 1), 800);
      } else if (index === 3 && action === ACTIONS.NEXT) {
        navigate('/folders');
        setTimeout(() => setStepIndex(index + 1), 800);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      } else if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      }
    }
  };

  // Synchronize tutorial with current page to avoid missing targets
  useEffect(() => {
    if (!run) return;
    
    if (location.pathname === '/week' && stepIndex < 2) {
      // If we are at /week but tutorial is lagging
    }
    if (location.pathname === '/' && stepIndex >= 2 && stepIndex < 4) {
      // If we went back home
    }
  }, [location.pathname, run, stepIndex]);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      hideCloseButton
      disableOverlayClose
      scrollToSteps={false}
      callback={handleCallback}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      styles={{
        options: {
          primaryColor: '#4BE277',
          zIndex: 10000,
        },
        buttonNext: {
          fontSize: '12px',
          fontWeight: 'bold',
          padding: '10px 18px',
          borderRadius: '12px',
          backgroundColor: '#4BE277',
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
        }
      }}
    />
  );
};

export default AppTutorial;
