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
      content: '¡Bienvenido! Empecemos por lo básico. Haz clic aquí para crear tu primera tarea. Puedes crear tareas simples o configurar repeticiones diarias, semanales o mensuales.',
      skipBeacon: true,
      placement: 'left',
    },
    {
      target: '#tutorial-photo-button',
      content: '¿Sabías que puedes agendar tareas con solo una foto? Solo apunta a tu nota o lista y Adonai se encarga del resto.',
      placement: 'top',
    },
    {
      target: '#nav-week',
      content: 'Aquí puedes ver toda tu semana y planificar bloques de tiempo.',
      placement: 'top',
    },
    {
      target: '#tutorial-block-button',
      content: 'Los bloques de tiempo te ayudan a enfocarte en una sola cosa. ¡Crea uno para organizar tu día!',
      placement: 'bottom',
    },
    {
      target: '#nav-folders',
      content: 'Organiza tus proyectos en carpetas y compártelas con amigos para trabajar juntos.',
      placement: 'top',
    },
    {
      target: '#tutorial-share-button',
      content: 'Desde aquí puedes invitar a tus amigos a cualquier carpeta y ver qué están haciendo.',
      placement: 'bottom',
    },
    {
      target: 'body',
      content: '¡Estás listo para dominar tu tiempo con Adonai! Si necesitas ayuda, busca el botón de tutorial en el menú.',
      placement: 'center',
    }
  ];

  const handleEvent = (data: EventData, controls: Controls) => {
    const { status, type, index } = data;
    const action = data.action;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setStepIndex(0);
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
      showProgress
      onEvent={handleEvent}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar tutorial',
      }}
      primaryColor="#4BE277"
      zIndex={10000}
      styles={{
        buttonNext: {
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
        tooltipTitle: {
          fontSize: '16px',
          fontWeight: 'bold',
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
