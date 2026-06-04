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

export const playPageTurnSound = () => {
  playSound(getSoundSrc('page-turn.mp3'), 0.9);
};

export const playTaskCompleteSound = () => {
  playSound(getSoundSrc('task-complete.mp3'), 0.85);
};

export const playReminderSound = () => {
  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const now = context.currentTime;
    const master = context.createGain();

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
    master.connect(context.destination);

    [880, 1175].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = now + index * 0.09;
      const stopAt = startAt + 0.28;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.18 : 0.13, startAt + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(startAt);
      oscillator.stop(stopAt + 0.03);
    });

    window.setTimeout(() => {
      void context.close();
    }, 650);
  } catch {
    playSound(getSoundSrc('page-turn.mp3'), 0.35);
  }
};
