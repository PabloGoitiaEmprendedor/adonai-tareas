import confetti from 'canvas-confetti';

const CELEBRATION_MESSAGES = [
  "¡Excelente trabajo, {name}! Una tarea menos para alcanzar tus metas.",
  "¡Así se hace! Has completado: {task}. ¡Sigue así!",
  "¡Brillante! Cada paso cuenta, y acabas de dar uno importante.",
  "¡Tarea cumplida! Eres imparable hoy, {name}.",
  "¡Boom! {task} está fuera de la lista. ¡A por la siguiente!",
  "¡Qué productividad! Estás dominando tu día.",
  "¡Felicidades! Acabas de tachar {task}. ¡Disfruta el progreso!",
  "¡Impresionante! Tu constancia está dando frutos.",
  "¡Un paso más cerca de tu meta principal! Buen trabajo con {task}.",
  "¡Lo lograste! {task} ya es historia."
];

const DAILY_FINISH_MESSAGES = [
  "¡Día completado! Has arrasado con todo, {name}. ¡Descansa, te lo has ganado!",
  "¡Misión cumplida! Todas tus tareas están listas. ¡Eres un crack!",
  "¡Increíble! No ha quedado nada pendiente. ¡Disfruta tu tiempo libre!",
  "Día redondo. Has cumplido con todos tus compromisos. ¡Felicidades, {name}!",
  "¡Victoria total! Has vencido a la lista de tareas hoy."
];

const playSound = (url: string, volume: number = 0.2) => {
  try {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(err => console.log('Audio play failed:', err));
  } catch (err) {
    console.log('Audio creation failed:', err);
  }
};

export const triggerTaskCelebration = (taskTitle: string, userName: string = 'Emprendedor') => {
  // Play subtle check sound
  playSound('https://www.soundjay.com/buttons/sounds/button-16.mp3', 0.50);

  // Confetti effect
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);

  // Pick a random message
  const randomIndex = Math.floor(Math.random() * CELEBRATION_MESSAGES.length);
  return CELEBRATION_MESSAGES[randomIndex]
    .replace('{name}', userName)
    .replace('{task}', taskTitle);
};

const ON_TIME_MESSAGES = [
  "⏱️ ¡A tiempo! Dominas tu agenda, {name}.",
  "⏱️ ¡Dentro del tiempo! Eres una máquina de productividad.",
  "⏱️ ¡Misión cumplida a tiempo! {task} no fue rival para ti.",
  "⏱️ ¡Impecable! Terminaste {task} antes de que se agotara el reloj.",
  "⏱️ ¡Reloj vencido! Tu disciplina es de otro nivel, {name}.",
  "⏱️ ¡Puntualidad perfecta! Eso se llama eficiencia.",
];

export const triggerOnTimeCelebration = (taskTitle: string, userName: string = 'Emprendedor') => {
  // Play a triumphant sound
  playSound('https://www.soundjay.com/buttons/sounds/button-3.mp3', 0.50);

  // Gold star burst confetti
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 200,
  };

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      particleCount: Math.floor(count * particleRatio),
      ...opts,
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55, colors: ['#FFD700', '#FFA500', '#FF8C00'] });
  fire(0.2, { spread: 60, colors: ['#FFD700', '#FFEC8B', '#FFA500'] });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#FFD700', '#22c55e', '#4ade80'] });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['#FFD700', '#FFA500'] });
  fire(0.1, { spread: 120, startVelocity: 45, colors: ['#22c55e', '#4ade80', '#FFD700'] });

  const randomIndex = Math.floor(Math.random() * ON_TIME_MESSAGES.length);
  return ON_TIME_MESSAGES[randomIndex]
    .replace('{name}', userName)
    .replace('{task}', taskTitle);
};

export const triggerDailyCelebration = (userName: string = 'Emprendedor') => {
  // Play success sound
  playSound('https://www.soundjay.com/misc/sounds/bell-ring-01.mp3', 0.50);

  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#22c55e', '#16a34a', '#4ade80']
  });

  const randomIndex = Math.floor(Math.random() * DAILY_FINISH_MESSAGES.length);
  return DAILY_FINISH_MESSAGES[randomIndex].replace('{name}', userName);
};
