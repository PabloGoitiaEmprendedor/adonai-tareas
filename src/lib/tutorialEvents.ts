export const TUTORIAL_TIME_BLOCK_CREATED_EVENT = 'adonai:tutorial-time-block-created';
export const TUTORIAL_FOLDER_CREATED_EVENT = 'adonai:tutorial-folder-created';
export const TUTORIAL_GOAL_CREATED_EVENT = 'adonai:tutorial-goal-created';

export const dispatchTutorialTimeBlockCreated = () => {
  window.dispatchEvent(new CustomEvent(TUTORIAL_TIME_BLOCK_CREATED_EVENT));
};

export const dispatchTutorialFolderCreated = () => {
  window.dispatchEvent(new CustomEvent(TUTORIAL_FOLDER_CREATED_EVENT));
};

export const dispatchTutorialGoalCreated = () => {
  window.dispatchEvent(new CustomEvent(TUTORIAL_GOAL_CREATED_EVENT));
};