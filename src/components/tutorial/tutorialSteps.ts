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
    buttons: [],
  },
  {
    target: '#tutorial-write-button',
    content: 'Aquí puedes escribir tus tareas de forma tradicional.',
    blockTargetInteraction: true,
  },
  {
    target: '#tutorial-voice-button',
    content: 'Aquí puedes capturar tareas con tu voz en segundos.',
    blockTargetInteraction: true,
  },
  {
    target: '#tutorial-photo-button',
    content: 'Y aquí puedes fotografiar tu agenda para digitalizarla automáticamente.',
    blockTargetInteraction: true,
  },
  {
    target: '#tutorial-close-capture',
    content: 'Perfecto. Cierra este panel y te llevo al calendario para seguir con el flujo.',
    blockTargetInteraction: false,
    buttons: [],
  },
  {
    target: '#tutorial-block-button',
    content: 'Ahora crea un bloque de tiempo para organizar una actividad en tu calendario.',
    blockTargetInteraction: false,
    buttons: [],
  },
  {
    target: '#block-title-input',
    content: 'Ponle un nombre al bloque. Por ejemplo: Trabajo profundo, Gym o Lectura.',
    blockTargetInteraction: false,
  },
  {
    target: '#block-start-time',
    content: 'Define aquí la hora de inicio del bloque.',
    blockTargetInteraction: false,
  },
  {
    target: '#block-end-time',
    content: 'Ahora define la hora de finalización.',
    blockTargetInteraction: false,
  },
  {
    target: '#block-color-picker',
    content: 'Elige un color para identificarlo visualmente en tu calendario.',
    blockTargetInteraction: false,
  },
  {
    target: '#block-recurring-toggle',
    content: 'Si esta actividad se repite, actívalo y elige los días.',
    blockTargetInteraction: false,
  },
  {
    target: '#block-save-button',
    content: 'Guarda el bloque. Cuando se cree correctamente, seguiremos a Carpetas.',
    blockTargetInteraction: false,
    buttons: [],
  },
  {
    target: '#add-folder-button',
    content: 'Las carpetas te ayudan a agrupar tareas por proyecto o área. Crea una ahora.',
    blockTargetInteraction: false,
    buttons: [],
  },
  {
    target: '#folder-name-input',
    content: 'Escribe el nombre de tu carpeta. Por ejemplo: Trabajo, Casa o Salud.',
    blockTargetInteraction: false,
  },
  {
    target: '#folder-color-selector',
    content: 'Elige un color para identificar tu carpeta.',
    blockTargetInteraction: false,
  },
  {
    target: '#folder-create-confirm',
    content: 'Confirma la creación. Cuando termine, te mostraré la parte de amigos.',
    blockTargetInteraction: false,
    buttons: [],
  },
  {
    target: '#friend-search-input',
    content: 'Aquí puedes buscar amigos por nombre o email para conectar con ellos.',
    blockTargetInteraction: false,
  },
  {
    target: '#friends-tabs',
    content: 'Y aquí ves tus amigos y las solicitudes pendientes en un solo lugar.',
    blockTargetInteraction: false,
  },
  {
    target: '#goals-overview',
    content: 'En Metas defines tu dirección. Cada tarea completada te acerca a tus objetivos.',
    blockTargetInteraction: false,
  },
];

const existingGoalsSteps: Step[] = [
  {
    target: '#goal-add-button',
    content: 'Desde aquí puedes crear nuevas metas cuando quieras.',
    blockTargetInteraction: false,
  },
  {
    target: 'body',
    content: '¡Listo! Ya viste el flujo principal completo de Adonai de principio a fin.',
    placement: 'center',
  },
];

const firstGoalSteps: Step[] = [
  {
    target: '#goal-add-button',
    content: 'Como aún no tienes metas, toca aquí para crear la primera.',
    blockTargetInteraction: false,
    buttons: [],
  },
  {
    target: '#goal-title-input',
    content: 'Escribe el título de tu primera meta.',
    blockTargetInteraction: false,
  },
  {
    target: '#goal-horizon-options',
    content: 'Elige el horizonte temporal que mejor encaje con ese objetivo.',
    blockTargetInteraction: false,
  },
  {
    target: '#goal-create-button',
    content: 'Crea la meta y terminaremos el tutorial.',
    blockTargetInteraction: false,
    buttons: [],
  },
  {
    target: 'body',
    content: '¡Perfecto! Ya recorriste el tutorial completo y sabes cómo usar la plataforma.',
    placement: 'center',
  },
];

export const getTutorialSteps = ({ hasGoals }: TutorialStepsOptions): Step[] => {
  return [...baseSteps, ...(hasGoals ? existingGoalsSteps : firstGoalSteps)];
};