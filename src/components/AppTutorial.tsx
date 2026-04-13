import { useState } from 'react';
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

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      onEvent={handleCallback}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      options={{
        primaryColor: '#4BE277',
        overlayColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 10000,
        showProgress: false,
      }}
      styles={{
        buttonPrimary: {
          fontSize: '13px',
          fontWeight: '700',
          padding: '12px 24px',
          borderRadius: '16px',
          backgroundColor: '#4BE277',
          boxShadow: '0 4px 12px rgba(75, 226, 119, 0.3)',
        },
        buttonBack: {
          fontSize: '13px',
          fontWeight: '600',
          color: '#888',
          marginRight: '10px',
        },
        tooltip: {
          borderRadius: '28px',
          padding: '20px',
          backgroundColor: '#ffffff',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          fontSize: '16px',
          padding: '10px 0 20px 0',
          lineHeight: '1.5',
          color: '#1A1C1E',
        }
      }}
    />
  );
};

export default AppTutorial;
