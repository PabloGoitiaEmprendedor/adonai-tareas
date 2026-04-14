import { useEffect, useMemo, useRef, useState } from 'react';
import { Joyride, type EventData, type Controls, ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGoals } from '@/hooks/useGoals';
import {
  TUTORIAL_FOLDER_CREATED_EVENT,
  TUTORIAL_GOAL_CREATED_EVENT,
  TUTORIAL_TIME_BLOCK_CREATED_EVENT,
  dispatchTutorialCloseCaptureModal
} from '@/lib/tutorialEvents';
import { getTutorialSteps } from './tutorial/tutorialSteps';

interface AppTutorialProps {
  run: boolean;
  onFinish: () => void;
}

const AppTutorial = ({ run, onFinish }: AppTutorialProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { goals, isLoading } = useGoals();
  const [stepIndex, setStepIndex] = useState(0);
  const controlsRef = useRef<Controls | null>(null);

  const hasGoals = goals.length > 0;
  const steps = useMemo(() => getTutorialSteps({ hasGoals }), [hasGoals]);

  const goalCreationStartIndex = 16;
  const goalCreationSaveIndex = 19;

  const manualClickDelays: Record<number, number> = {
    0: 250,
    4: 250,
    11: 250,
    [goalCreationStartIndex]: 250,
  };

  const getRouteForStep = (index: number) => {
    if (index <= 3) return '/';
    if (index <= 10) return '/week';
    if (index <= 14) return '/folders';
    
    const friendsIndex = hasGoals ? 17 : 20;
    if (index >= friendsIndex && index < friendsIndex + 1) return '/friends';
    if (index >= friendsIndex + 1) return '/'; // End step

    return '/goals';
  };

  const advanceToStep = (nextStep: number, delay = 0) => {
    window.setTimeout(() => {
      setStepIndex(nextStep);
      controlsRef.current?.go(nextStep);
    }, delay);
  };

  // react-joyride v3: callback is onEvent(data, controls)
  const handleEvent = (data: EventData, controls: Controls) => {
    const { action, index, status, type } = data;

    // Store controls reference for external use
    controlsRef.current = controls;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      setStepIndex(0);
      localStorage.setItem('adonai_tutorial_completed', 'true');
      onFinish();
      return;
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      const expectedRoute = getRouteForStep(index);
      if (location.pathname !== expectedRoute) {
        navigate(expectedRoute);
      }
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const isManualStep = index === 0 || index === 4 || index === 10 || index === 11 || index === 14 || (!hasGoals && index === goalCreationSaveIndex);

      if (!isManualStep) {
        if (index === 3) {
          dispatchTutorialCloseCaptureModal();
        }
        const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        setStepIndex(nextIndex);
      }
    }
  };

  // Ensure we are on the correct route for the current step
  useEffect(() => {
    if (!run) return;

    const expectedRoute = getRouteForStep(stepIndex);
    if (location.pathname !== expectedRoute) {
      navigate(expectedRoute);
    }
  }, [run, stepIndex, location.pathname, navigate]);

  // Reset when tutorial starts
  const prevRunRef = useRef(false);
  useEffect(() => {
    if (run && !prevRunRef.current) {
      navigate('/');
      setStepIndex(0);
    }
    prevRunRef.current = run;
  }, [run, navigate]);

  // Handle interactive button clicks (steps where user must click the actual UI)
  useEffect(() => {
    if (!run) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const interactiveTriggers: Record<number, string> = {
        0: 'global-add-task-button',
        4: 'tutorial-block-button',
        11: 'add-folder-button',
        ...(!hasGoals ? { [goalCreationStartIndex]: 'goal-add-button' } : {}),
      };

      const requiredId = interactiveTriggers[stepIndex];
      if (requiredId) {
        const isMatch = target.id === requiredId || target.closest(`#${requiredId}`);
        if (isMatch) {
          advanceToStep(stepIndex + 1, manualClickDelays[stepIndex] ?? 0);
        }
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [run, stepIndex, hasGoals]);

  // Handle custom events from creation flows
  useEffect(() => {
    if (!run) return;

    const handleTimeBlockCreated = () => advanceToStep(11, 300);
    const handleFolderCreated = () => advanceToStep(15, 300);
    const handleGoalCreated = () => {
      if (!hasGoals) {
        advanceToStep(20, 300);
      }
    };

    window.addEventListener(TUTORIAL_TIME_BLOCK_CREATED_EVENT, handleTimeBlockCreated);
    window.addEventListener(TUTORIAL_FOLDER_CREATED_EVENT, handleFolderCreated);
    window.addEventListener(TUTORIAL_GOAL_CREATED_EVENT, handleGoalCreated);

    return () => {
      window.removeEventListener(TUTORIAL_TIME_BLOCK_CREATED_EVENT, handleTimeBlockCreated);
      window.removeEventListener(TUTORIAL_FOLDER_CREATED_EVENT, handleFolderCreated);
      window.removeEventListener(TUTORIAL_GOAL_CREATED_EVENT, handleGoalCreated);
    };
  }, [run, hasGoals]);

  if (!run || isLoading) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: 'hsl(var(--primary))',
        },
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
