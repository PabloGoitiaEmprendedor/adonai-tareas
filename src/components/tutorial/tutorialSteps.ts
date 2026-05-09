import type { Step } from 'react-joyride';

interface TutorialStepsOptions {
  hasGoals: boolean;
}

export const getTutorialSteps = ({ hasGoals }: TutorialStepsOptions): Step[] => {
  const steps: Step[] = [
    // PASO 0: Bienvenida
    {
      target: 'body',
      title: '🚀 ¡Bienvenido a tu Refugio Mental!',
      content: 'Estás a punto de descubrir cómo liberar el 80% de tu carga mental. Esta no es una app de tareas común; es tu copiloto para recuperar tu tiempo.\n\n¿Hacemos el recorrido?',
      placement: 'center',
      disableBeacon: true,
      spotlightClicks: true,
    },

    // PASO 1: Pulsar el + (tutorial hace: click+ → wait → click Texto → wait → advance)
    {
      target: '#global-add-task-button',
      title: 'Crea tu Primera Tarea 🧠',
      content: 'Cada vez que una idea cruce tu mente, pulsa este botón "+" para sacarla de tu cabeza.\n\nTienes dos opciones al abrirlo:\n✏️ Texto: Para escribir tu tarea.\n🎙️ Voz: Para dictarla en movimiento.',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: true,
    },

    // PASO 2: Título (modal ya está abierto)
    {
      target: '#task-title-input',
      title: 'Escribe tu tarea ✏️',
      content: '¡Es tu momento! Escribe aquí lo que necesitas hacer.\n\nSé claro y directo. Por ejemplo:\n• "Estudiar capítulo 3 de matemáticas"',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: true,
    },

    // PASO 3: Descripción
    {
      target: '#task-description-input',
      title: 'Descripción (opcional) 📝',
      content: '¿Necesitas recordar detalles importantes? Escríbelos aquí.\n\nNo confíes en tu memoria. Deja que Adonai guarde los detalles por ti.',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: true,
    },

    // PASO 4: Link (Este paso hará el auto-clic a continuar)
    {
      target: '#task-link-input',
      title: 'Tu Fuente de Poder 🔗',
      content: 'Aquí está el truco de los que ejecutan sin excusas.\n\n¿Tienes un video de YouTube, un documento o un curso? Pégalo aquí. Cuando llegue el momento de actuar, todo estará en un solo lugar.',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: true,
    },

    // PASO 5: Lápiz (edición)
    {
      target: '#task-edit-pencil',
      title: 'Edición rápida ✏️',
      content: '¿Te equivocaste al escribir el título o los detalles? No te preocupes.\n\nEste lápiz te permite volver atrás en cualquier momento para corregir lo que necesites sin perder tu progreso.',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 6: Fecha
    {
      target: '#task-date-selector',
      title: 'La Regla de Oro: Ponle Fecha ⏳',
      content: '⚠️ Este es el paso MÁS importante.\n\nUna tarea sin fecha es solo un deseo. Los estudios demuestran que poner una fecha límite aumenta un 80% la probabilidad de que la cumplas.\n\nTu cerebro necesita una línea de meta para activarse. ¡No lo dejes al azar!',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 7: Metas (condicional)
    ...(hasGoals ? [{
      target: '#task-goal-selector',
      title: 'Conecta con tus Metas 🎯',
      content: 'Aquí puedes asignar esta tarea a una de tus metas.\n\nSi lo que haces no está conectado con tus metas, podrías estar haciendo "trabajo basura".\n\nCada tarea asignada a una meta te acerca a lo que realmente quieres lograr.',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: false,
    } as Step] : []),

    // PASO 8: Prioridad
    {
      target: '#task-matrix-selector',
      title: 'El Secreto de la Prioridad',
      content: 'Líderes como Steve Jobs o Elon Musk usan esto para alcanzar sus metas.\n\n1. 🔴 Importante + Urgente: Hazlo ya.\n2. 🟠 Solo Urgente: Hazlo o pide ayuda.\n3. 🟡 Solo Importante: Planifícalo.\n4. ⚪ Ninguno: Baja prioridad.',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: true,
    },

    // PASO 9: Guardar (auto-clic)
    {
      target: '#task-save-btn',
      title: '¡Guarda tu primera tarea! ✅',
      content: '¡Felicidades! Has creado tu primera tarea como un profesional.\n\nGuárdala ahora para sentir la paz mental de tener el control de tu día.',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: true,
    },

    // PASO 10: Mini ventana
    {
      target: '#mini-window-btn',
      title: 'Captura desde cualquier lugar ⚡',
      content: 'Tu productividad no se detiene. Abre la mini-ventana para capturar ideas mientras navegas en otras apps, sin perder el enfoque.',
      placement: 'bottom',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 11: Botón Semana
    {
      target: '#nav-week',
      title: 'Tu Semana Completa 📅',
      content: 'Haz clic aquí para ver toda tu semana de un vistazo. Es ideal para tener una perspectiva clara de tus próximos compromisos.',
      placement: 'right',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 12: Grid de Calendario
    {
      target: '#weekly-calendar-main',
      title: 'Organiza tu Tiempo ⏳',
      content: 'En esta vista puedes arrastrar tus tareas para asegurar de que tus metas tengan el espacio que merecen en tu agenda.',
      placement: 'left',
      disableBeacon: true,
      spotlightClicks: true,
      spotlightPadding: 20,
      // @ts-ignore - custom property for our tooltip
      width: 288,
    },

    // PASO 13: Carpetas
    {
      target: '#nav-folders',
      title: 'Organiza por Áreas 📁',
      content: 'Haz clic aquí para gestionar tus proyectos. Separar tus áreas de vida es clave para mantener el foco en lo que importa.',
      placement: 'right',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 14: Vista de Carpetas Intro
    {
      target: '#folders-header',
      title: 'Tus Espacios de Enfoque 🎯',
      content: 'Este es tu centro de organización. Aquí es donde divides tus grandes metas en áreas manejables como "Trabajo", "Salud" o "Proyectos Personales".',
      placement: 'bottom',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 15: Crear Carpeta
    {
      target: '#btn-new-folder',
      title: 'Tus Áreas de Trabajo ✨',
      content: 'Este botón es tu punto de partida. Úsalo para crear espacios dedicados a cada uno de tus sueños o responsabilidades principales.',
      placement: 'bottom',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 16: Enlace al Perfil
    {
      target: '#nav-profile',
      title: 'Tu Progreso 🏆',
      content: 'Desde aquí puedes acceder a tu perfil para ver tus estadísticas, rachas y logros desbloqueados.',
      placement: 'right',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 17: Detalle del Progreso
    {
      target: '#profile-stats-section',
      title: 'Monitorea tu Crecimiento 📈',
      content: 'Aquí verás tus rachas y éxitos totales. Mantener tu racha diaria es el secreto para construir hábitos imparables.',
      placement: 'bottom',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 18: Reporte Semanal
    {
      target: '#profile-weekly-report',
      title: 'Tu Inteligencia Semanal 🧠',
      content: 'Este reporte analiza tu eficiencia y te muestra cuánto tiempo y energía has ahorrado gracias a tu enfoque.',
      placement: 'top',
      disableBeacon: true,
      spotlightClicks: false,
    },

    // PASO 19: Final
    {
      target: 'body',
      title: '¡Todo listo! 🚀',
      content: 'Ya estás preparado para dominar tu día con Adonai. ¡Empieza creando tu primera meta!',
      placement: 'center',
      disableBeacon: true,
      spotlightClicks: true,
    },
  ];

  return steps;
};