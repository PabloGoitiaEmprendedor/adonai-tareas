import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

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
      content: '¡Bienvenido! Empecemos por lo básico. Haz clic aquí para crear tu primera tarea. Puedes crear tareas simples o configurar repeticiones diarias, semanales o mensuales.',
      disableBeacon: true,
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

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setStepIndex(0);
      onFinish();
    } else if (type === 'step:after') {
      // Auto-navigation for steps
      if (index === 1 && action === 'next') {
        navigate('/week');
        // Small delay to let the page load
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
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar tutorial',
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
          textAlign: 'left',
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
