const getSoundSrc = (fileName: string) => {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return `./sounds/${fileName}`;
  }

  return `/sounds/${fileName}`;
};

const playSound = (src: string, volume: number) => {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    void audio.play();
  } catch {
    // Sound effects are decorative and may be blocked until the first user gesture.
  }
};

type AudioContextCtor = typeof AudioContext;

let reminderAudioContext: AudioContext | null = null;
let reminderAudioUnlocked = false;

const getAudioContextCtor = (): AudioContextCtor | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
};

const getReminderAudioContext = () => {
  const AudioContextConstructor = getAudioContextCtor();
  if (!AudioContextConstructor) return null;

  if (!reminderAudioContext || reminderAudioContext.state === 'closed') {
    reminderAudioContext = new AudioContextConstructor();
  }

  return reminderAudioContext;
};

const unlockReminderAudio = () => {
  if (reminderAudioUnlocked || typeof window === 'undefined') return;

  const resume = () => {
    const context = getReminderAudioContext();
    if (!context) return;

    if (context.state === 'suspended') {
      void context.resume().catch(() => {});
    }

    reminderAudioUnlocked = true;
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
    window.removeEventListener('touchstart', resume);
  };

  window.addEventListener('pointerdown', resume, { passive: true });
  window.addEventListener('keydown', resume);
  window.addEventListener('touchstart', resume, { passive: true });
};

unlockReminderAudio();

export const playPageTurnSound = () => {
  playSound(getSoundSrc('page-turn.mp3'), 0.9);
};

export const playTaskCompleteSound = () => {
  playSound(getSoundSrc('task-complete.mp3'), 0.85);
};

const playReminderTone = (context: AudioContext) => {
  const now = context.currentTime + 0.02;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.92);
  master.connect(compressor);
  compressor.connect(context.destination);

  [
    { frequency: 784, delay: 0, duration: 0.34, volume: 0.16 },
    { frequency: 1046.5, delay: 0.1, duration: 0.42, volume: 0.12 },
    { frequency: 1318.5, delay: 0.22, duration: 0.46, volume: 0.08 },
  ].forEach(({ frequency, delay, duration, volume }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = now + delay;
    const stopAt = startAt + duration;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.04);
  });
};

export const playReminderSound = () => {
  try {
    const context = getReminderAudioContext();
    if (!context) return;

    if (context.state === 'suspended') {
      void context.resume()
        .then(() => playReminderTone(context))
        .catch(() => playSound(getSoundSrc('page-turn.mp3'), 0.35));
      return;
    }

    playReminderTone(context);
  } catch {
    playSound(getSoundSrc('page-turn.mp3'), 0.35);
  }
};
