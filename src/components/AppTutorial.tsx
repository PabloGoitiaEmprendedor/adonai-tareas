import { useState } from 'react';
import { Joyride, type Step, type EventData, type Controls, STATUS } from 'react-joyride';
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
      content: '¡Bienvenido! Empecemos por lo básico. Haz clic aquí para crear tu primera tarea.',
      skipBeacon: true,
      placement: 'left',
      primaryColor: '#4BE277',
      zIndex: 10000,
    },
    {
      target: '#tutorial-photo-button',
      content: '¿Sabías que puedes agendar tareas con solo una foto?',
      placement: 'top',
      primaryColor: '#4BE277',
      zIndex: 10000,
    },
    {
      target: '#nav-week',
      content: 'Aquí puedes ver toda tu semana y planificar bloques de tiempo.',
      placement: 'top',
      primaryColor: '#4BE277',
      zIndex: 10000,
    },
    {
      target: '#tutorial-block-button',
      content: 'Los bloques de tiempo te ayudan a enfocarte en una sola cosa.',
      placement: 'bottom',
      primaryColor: '#4BE277',
      zIndex: 10000,
    },
    {
      target: '#nav-folders',
      content: 'Organiza tus proyectos en carpetas y compártelas con amigos.',
      placement: 'top',
      primaryColor: '#4BE277',
      zIndex: 10000,
    },
    {
      target: '#tutorial-share-button',
      content: 'Desde aquí puedes invitar a tus amigos a cualquier carpeta.',
      placement: 'bottom',
      primaryColor: '#4BE277',
      zIndex: 10000,
    },
    {
      target: 'body',
      content: '¡Estás listo para dominar tu tiempo con Adonai!',
      placement: 'center',
      primaryColor: '#4BE277',
      zIndex: 10000,
    }
  ];

  const handleEvent = (data: EventData, controls: Controls) => {
    const { status, type, index, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setStepIndex(0);
      localStorage.setItem('adonai_tutorial_completed', 'true');
      onFinish();
    } else if (type === 'step:after') {
      if (index === 1 && action === 'next') {
        navigate('/week');
        setTimeout(() => setStepIndex(index + 1), 500);
      } else if (index === 3 && action === 'next') {
        navigate('/folders');
        setTimeout(() => setStepIndex(index + 1), 500);
      } else {
        setStepIndex(index + (action === 'prev' ? -1 : 1));
      }
    }
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
        skip: 'Saltar tutorial',
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
        tooltipContainer: {
          textAlign: 'left' as const,
          borderRadius: '20px',
        },
        tooltipContent: {
          fontSize: '14px',
          padding: '10px 0',
        }
      }}
    />
  );
};

export default AppTutorial;
