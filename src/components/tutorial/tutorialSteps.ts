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
    },

    // PASO 1: Pulsar el + (tutorial hace: click+ → wait → click Texto → wait → advance)
    {
      target: '#global-add-task-button',
      title: 'Crea tu Primera Tarea 🧠',
      content: 'Cada vez que una idea cruce tu mente, pulsa este botón "+" para sacarla de tu cabeza.\n\nTienes dos opciones al abrirlo:\n✏️ Texto: Para escribir tu tarea.\n🎙️ Voz: Para dictarla en movimiento.\n\nPulsa "Siguiente" y abriremos el formulario de Texto por ti.',
      placement: 'left',
      disableBeacon: true,
    },

    // PASO 2: Título (modal ya está abierto)
    {
      target: '#task-title-input',
      title: 'Escribe tu tarea ✏️',
      content: '¡Es tu momento! Escribe aquí lo que necesitas hacer.\n\nSé claro y directo. Por ejemplo:\n• "Estudiar capítulo 3 de matemáticas"\n• "Llamar al dentista a las 10am"\n\nEscribirlo reduce tu ansiedad y libera espacio mental.',
      placement: 'left',
      disableBeacon: true,
    },

    // PASO 3: Descripción
    {
      target: '#task-description-input',
      title: 'Descripción (opcional) 📝',
      content: '¿Necesitas recordar detalles importantes? Escríbelos aquí.\n\nPor ejemplo: "Revisar páginas 45-60 y hacer los ejercicios del final".\n\nNo confíes en tu memoria. Deja que Adonai guarde los detalles por ti.',
      placement: 'left',
      disableBeacon: true,
    },

    // PASO 4: Link (Este paso hará el auto-clic a continuar)
    {
      target: '#task-link-input',
      title: 'Tu Fuente de Poder 🔗',
      content: 'Aquí está el truco de los que ejecutan sin excusas.\n\n¿Tienes un video de YouTube que explica cómo hacerlo? ¿Un foro con la respuesta? ¿Un documento, artículo o curso?\n\nPégalo aquí. Cuando llegue el momento de actuar, todo estará en un solo lugar. Sin búsquedas, sin distracciones, sin excusas para postergar.',
      placement: 'left',
      disableBeacon: true,
    },

    // PASO 5: Lápiz (edición)
    {
      target: '#task-edit-pencil',
      title: 'Edición rápida ✏️',
      content: '¿Te equivocaste al escribir el título o los detalles? No te preocupes.\n\nPulsa este lápiz en cualquier momento para corregirlo sin tener que empezar de cero.',
      placement: 'left',
      disableBeacon: true,
    },

    // PASO 7: Fecha
    {
      target: '#task-date-selector',
      title: 'La Regla de Oro: Ponle Fecha ⏳',
      content: '⚠️ Este es el paso MÁS importante.\n\nUna tarea sin fecha es solo un deseo. Los estudios demuestran que poner una fecha límite aumenta un 80% la probabilidad de que la cumplas.\n\nTu cerebro necesita una línea de meta para activarse. ¡No lo dejes al azar!',
      placement: 'left',
      disableBeacon: true,
    },

    // PASO 8: Metas (condicional)
    ...(hasGoals ? [{
      target: '#task-goal-selector',
      title: 'Conecta con tus Metas 🎯',
      content: 'Aquí puedes asignar esta tarea a una de tus metas.\n\nSi lo que haces no está conectado con tus metas, podrías estar haciendo "trabajo basura".\n\nCada tarea asignada a una meta te acerca a lo que realmente quieres lograr.',
      placement: 'left',
      disableBeacon: true,
    } as Step] : []),

    // PASO 9: Matriz Eisenhower
    {
      target: '#task-matrix-selector',
      title: 'La Matriz que Cambiará tu Vida ⚡',
      content: 'Esto lo usaban los presidentes. Hay 4 tipos de tareas:\n\n🔴 URGENTE + IMPORTANTE → Hazlo YA.\n\n🟡 IMPORTANTE, no urgente → Planifícala. El secreto de la gente exitosa.\n\n🟠 URGENTE, no importante → Delégala si puedes.\n\n⚪ Ni urgente ni importante → Elimínala. Te roba tiempo.\n\nDominar esto cambiará tu forma de vivir.',
      placement: 'left',
      disableBeacon: true,
    },

    // PASO 10: Guardar (auto-clic)
    {
      target: '#task-save-btn',
      title: '¡Guarda tu primera tarea! ✅',
      content: '¡Felicidades! Has creado tu primera tarea como un profesional.\n\nPulsa "Siguiente" para guardarla y sentir la paz mental de tener el control de tu día.',
      placement: 'left',
      disableBeacon: true,
    },

    // PASO 11: Mini ventana
    {
      target: '#mini-window-btn',
      title: 'Captura desde cualquier lugar ⚡',
      content: 'Tu productividad no se detiene. Abre la mini-ventana para capturar ideas mientras navegas en otras apps, sin perder el enfoque.',
      placement: 'bottom',
      disableBeacon: true,
    },

    // PASO 12: Semana
    {
      target: '#nav-week',
      title: 'Tu Semana Completa 📅',
      content: 'Aquí puedes ver toda tu semana de un vistazo.\n\nOrganiza tus días para asegurarte de que tus metas tengan el espacio que merecen.',
      placement: 'top',
      disableBeacon: true,
    },

    // PASO 13: Perfil
    {
      target: '#nav-profile',
      title: 'Tu Progreso 🏆',
      content: 'Analiza tu evolución y ajusta tus hábitos.\n\nTu perfil es el espejo de tu crecimiento personal.',
      placement: 'top',
      disableBeacon: true,
    },

    // PASO 14: Final
    {
      target: 'body',
      title: '¡Estás listo para dominar tu día! 🌟',
      content: 'Ya tienes las herramientas y el conocimiento.\n\nRecuerda: cada tarea que sacas de tu cabeza es un paso hacia la claridad mental.\n\n¡Empieza ahora!',
      placement: 'center',
      disableBeacon: true,
    },
  ];

  return steps;
};