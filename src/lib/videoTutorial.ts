export const VIDEO_TUTORIAL_SRC = '/videos/video-tutorial.mp4';

const POST_ONBOARDING_VIDEO_PENDING_KEY = 'adonai_post_onboarding_video_pending';
const VIDEO_TUTORIAL_SEEN_KEY = 'adonai_video_tutorial_seen_v1';

export const queuePostOnboardingVideoTutorial = () => {
  localStorage.setItem(POST_ONBOARDING_VIDEO_PENDING_KEY, 'true');
  localStorage.removeItem(VIDEO_TUTORIAL_SEEN_KEY);
};

export const shouldShowPostOnboardingVideoTutorial = () => (
  localStorage.getItem(POST_ONBOARDING_VIDEO_PENDING_KEY) === 'true' &&
  localStorage.getItem(VIDEO_TUTORIAL_SEEN_KEY) !== 'true'
);

export const completePostOnboardingVideoTutorial = () => {
  localStorage.setItem(VIDEO_TUTORIAL_SEEN_KEY, 'true');
  localStorage.removeItem(POST_ONBOARDING_VIDEO_PENDING_KEY);
};

export const replayVideoTutorial = () => {
  localStorage.removeItem(VIDEO_TUTORIAL_SEEN_KEY);
  localStorage.setItem(POST_ONBOARDING_VIDEO_PENDING_KEY, 'true');
  window.dispatchEvent(new CustomEvent('adonai:open-video-tutorial'));
};
