const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID;
const ENABLE_CLARITY_IN_DEV = import.meta.env.VITE_ENABLE_CLARITY_IN_DEV === "true";
const ENABLE_CLARITY_IN_DESKTOP = import.meta.env.VITE_ENABLE_CLARITY_IN_DESKTOP === "true";

type ClarityCommand = "event" | "identify" | "set" | "consent";

declare global {
  interface Window {
    clarity?: {
      (command: "event", eventName: string): void;
      (command: "identify", customId: string, customSessionId?: string, customPageId?: string, friendlyName?: string): void;
      (command: "set", key: string, value: string | string[]): void;
      (command: "consent", hasConsent?: boolean): void;
      q?: unknown[];
    };
  }
}

const isElectron = () =>
  !!window.electronAPI ||
  navigator.userAgent.toLowerCase().includes("electron") ||
  !!window.process?.versions?.electron;

const isLocalHost = () =>
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.startsWith("192.168.");

const canLoadClarity = () => {
  if (!CLARITY_PROJECT_ID) return false;
  if (isElectron() && !ENABLE_CLARITY_IN_DESKTOP) return false;
  if (import.meta.env.DEV && !ENABLE_CLARITY_IN_DEV) return false;
  if (isLocalHost() && !ENABLE_CLARITY_IN_DEV) return false;
  return true;
};

const enqueueClarity = (command: ClarityCommand, ...args: unknown[]) => {
  window.clarity = window.clarity || ((...queuedArgs: unknown[]) => {
    (window.clarity!.q = window.clarity!.q || []).push(queuedArgs);
  });

  window.clarity(command as never, ...(args as never[]));
};

export const initClarity = () => {
  if (!canLoadClarity()) return;
  if (document.querySelector(`script[data-clarity-id="${CLARITY_PROJECT_ID}"]`)) return;

  enqueueClarity("consent", true);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
  script.dataset.clarityId = CLARITY_PROJECT_ID;
  document.head.appendChild(script);
};

export const trackClarityEvent = (eventName: string) => {
  if (!eventName || !canLoadClarity()) return;
  enqueueClarity("event", eventName);
};

export const setClarityTag = (key: string, value: string | string[]) => {
  if (!key || !canLoadClarity()) return;
  enqueueClarity("set", key, value);
};

export const identifyClarityUser = (customId: string, friendlyName?: string) => {
  if (!customId || !canLoadClarity()) return;
  enqueueClarity("identify", customId, undefined, undefined, friendlyName);
};
