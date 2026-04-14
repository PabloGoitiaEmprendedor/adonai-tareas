import type { Step } from 'react-joyride';

interface TutorialStepsOptions {
  hasGoals: boolean;
}

const baseSteps: Step[] = [
  {
    target: '#global-add-task-button',
    content: '¡Bienvenido! Toca este botón para empezar a organizar tu día.',
    skipBeacon: true,
    blockTargetInteraction: false,
    overlayClickAction: false,
    buttons: [],
  },
  {
    target: '#tutorial-write-button',
    content: 'Aquí puedes escribir tus tareas de forma tradicional.',
    blockTargetInteraction: true,
    overlayClickAction: false,
    skipScroll: true,
    isFixed: true,
  },
  {
    target: '#tutorial-voice-button',
    content: 'Aquí puedes capturar tareas con tu voz en segundos.',
    blockTargetInteraction: true,
    overlayClickAction: false,
    skipScroll: true,
    isFixed: true,
  },
  {
    target: '#tutorial-photo-button',
    content: 'Y aquí puedes fotografiar tu agenda para digitalizarla automáticamente. Al darle a Siguiente, iremos al calendario.',
    blockTargetInteraction: true,
    overlayClickAction: false,
    skipScroll: true,
    isFixed: true,
  },
  {
    target: '#tutorial-block-button',
    content: 'Ahora crea un bloque de tiempo para organizar una actividad en tu calendario.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    buttons: [],
  },
  {
    target: '#block-title-input',
    content: 'Ponle un nombre al bloque. Por ejemplo: Trabajo profundo, Gym o Lectura.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
  },
  {
    target: '#block-start-time',
    content: 'Define aquí la hora de inicio del bloque.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
  },
  {
    target: '#block-end-time',
    content: 'Ahora define la hora de finalización.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
  },
  {
    target: '#block-color-picker',
    content: 'Elige un color para identificarlo visualmente en tu calendario.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
  },
  {
    target: '#block-recurring-toggle',
    content: 'Si esta actividad se repite, actívalo y elige los días.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
  },
  {
    target: '#block-save-button',
    content: 'Guarda el bloque. Cuando se cree correctamente, seguiremos a Carpetas.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
    buttons: [],
  },
  {
    target: '#add-folder-button',
    content: 'Las carpetas te ayudan a agrupar tareas por proyecto o área. Crea una ahora.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    buttons: [],
  },
  {
    target: '#folder-name-input',
    content: 'Escribe el nombre de tu carpeta. Por ejemplo: Trabajo, Casa o Salud.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
  },
  {
    target: '#folder-color-selector',
    content: 'Elige un color para identificar tu carpeta.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
  },
  {
    target: '#folder-create-confirm',
    content: 'Confirma la creación. Cuando termine, seguiremos a Metas.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
    buttons: [],
  },
  {
    target: '#goals-overview',
    content: 'En Metas defines tu dirección. Cada tarea completada te acerca a tus objetivos.',
    blockTargetInteraction: false,
    overlayClickAction: false,
  },
];

const existingGoalsSteps: Step[] = [
  {
    target: '#goal-add-button',
    content: 'Desde aquí puedes crear nuevas metas cuando quieras.',
    blockTargetInteraction: false,
    overlayClickAction: false,
  },
  {
    target: '#friends-tabs',
    content: 'Finalmente, en Amigos puedes conectar con tu comunidad para ver qué están compartiendo.',
    blockTargetInteraction: false,
    overlayClickAction: false,
  },
  {
    target: 'body',
    content: '¡Listo! Ya viste el flujo principal completo de Adonai de principio a fin.',
    placement: 'center',
    overlayClickAction: false,
  },
];

const firstGoalSteps: Step[] = [
  {
    target: '#goal-add-button',
    content: 'Como aún no tienes metas, toca aquí para crear la primera.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    buttons: [],
  },
  {
    target: '#goal-title-input',
    content: 'Escribe el título de tu primera meta.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
  },
  {
    target: '#goal-horizon-options',
    content: 'Elige el horizonte temporal que mejor encaje con ese objetivo.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
  },
  {
    target: '#goal-create-button',
    content: 'Crea la meta y pasaremos a la sección de Amigos.',
    blockTargetInteraction: false,
    overlayClickAction: false,
    isFixed: true,
    buttons: [],
  },
  {
    target: '#friends-tabs',
    content: 'Finalmente, en Amigos puedes conectar con tu comunidad para ver qué están compartiendo.',
    blockTargetInteraction: false,
    overlayClickAction: false,
  },
  {
    target: 'body',
    content: '¡Perfecto! Ya recorriste el tutorial completo y sabes cómo usar la plataforma.',
    placement: 'center',
    overlayClickAction: false,
  },
];

export const getTutorialSteps = ({ hasGoals }: TutorialStepsOptions): Step[] => {
  return [...baseSteps, ...(hasGoals ? existingGoalsSteps : firstGoalSteps)];
};