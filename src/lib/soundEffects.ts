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
  playSound('/sounds/page-turn.mp3', 0.9);
};

export const playTaskCompleteSound = () => {
  playSound('/sounds/task-complete.mp3', 0.85);
};
