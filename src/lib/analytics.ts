import { identifyClarityUser, initClarity, setClarityTag, trackClarityEvent } from "./clarity";
import { supabase } from "@/integrations/supabase/client";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-1EB0BM6V81";
const ENABLE_ANALYTICS_IN_DEV = import.meta.env.VITE_ENABLE_ANALYTICS_IN_DEV === "true";
const ENABLE_ANALYTICS_IN_DESKTOP = import.meta.env.VITE_ENABLE_ANALYTICS_IN_DESKTOP !== "false";
const ENABLE_GA_MEASUREMENT_PROTOCOL = import.meta.env.VITE_ENABLE_GA_MEASUREMENT_PROTOCOL === "true";
const GA_CLIENT_ID_KEY = "adonai_ga_client_id";

type AnalyticsSurface = "web" | "desktop" | "local" | "unknown";
type AnalyticsExperience = "landing" | "web_app" | "desktop_app" | "mini_window" | "local_app";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
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

export const getAnalyticsSurface = (): AnalyticsSurface => {
  if (isElectron()) return "desktop";
  if (isLocalHost()) return "local";
  if (window.location.hostname) return "web";
  return "unknown";
};

export const getAnalyticsExperience = (path = window.location.hash.replace(/^#/, "") || window.location.pathname): AnalyticsExperience => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath.startsWith("/mini")) return "mini_window";
  if (isElectron()) return "desktop_app";
  if (normalizedPath === "/" || normalizedPath.startsWith("/landing") || normalizedPath.startsWith("/caracteristicas") || normalizedPath.startsWith("/faq")) {
    return "landing";
  }
  return isLocalHost() ? "local_app" : "web_app";
};

const getAnalyticsPageLocation = () => {
  if (!isElectron()) return window.location.href;
  const hashPath = window.location.hash || "#/";
  return `https://webadonai.com/desktop${hashPath}`;
};

const canLoadGoogleAnalytics = () => {
  if (!GA_MEASUREMENT_ID) return false;
  if (isElectron() && !ENABLE_ANALYTICS_IN_DESKTOP) return false;
  if ((import.meta.env.DEV || isLocalHost()) && !ENABLE_ANALYTICS_IN_DEV) return false;
  return true;
};

const createGtag = () => {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => {
    window.dataLayer!.push(args);
  }) as Window["gtag"];
};

const getClientId = () => {
  const existing = localStorage.getItem(GA_CLIENT_ID_KEY);
  if (existing) return existing;

  const clientId = `${Date.now()}.${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  localStorage.setItem(GA_CLIENT_ID_KEY, clientId);
  return clientId;
};

const trackMeasurementProtocolEvent = (eventName: string, params: Record<string, unknown>) => {
  if (!ENABLE_GA_MEASUREMENT_PROTOCOL) return;

  supabase.functions
    .invoke("google-analytics-event", {
      body: {
        client_id: getClientId(),
        name: eventName,
        params: {
          page_location: getAnalyticsPageLocation(),
          page_title: document.title,
          app_platform: getAnalyticsSurface(),
          app_experience: getAnalyticsExperience(),
          ...params,
        },
      },
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn("[Analytics] Measurement Protocol error", error);
    });
};

export const initAnalytics = () => {
  initClarity();

  if (!canLoadGoogleAnalytics()) return;
  if (document.querySelector(`script[data-ga-id="${GA_MEASUREMENT_ID}"]`)) return;

  createGtag();
  window.gtag!("js", new Date());
  window.gtag!("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    app_name: "Adonai",
    app_platform: getAnalyticsSurface(),
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.dataset.gaId = GA_MEASUREMENT_ID;
  document.head.appendChild(script);
};

export const setAnalyticsUser = (identity: {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  isAnonymous?: boolean | null;
  onboardingCompleted?: boolean | null;
}) => {
  const userId = identity.userId || undefined;
  const surface = getAnalyticsSurface();
  const experience = getAnalyticsExperience();
  const userProperties = {
    app_platform: surface,
    app_experience: experience,
    auth_type: identity.isAnonymous ? "anonymous" : userId ? "registered" : "guest",
    onboarding_completed: identity.onboardingCompleted === true ? "true" : "false",
  };

  if (userId) {
    if (canLoadGoogleAnalytics()) {
      createGtag();
      window.gtag!("set", "user_id", userId);
      window.gtag!("set", "user_properties", userProperties);
    }

    trackMeasurementProtocolEvent("adonai_user_identified", {
      user_id: userId,
      ...userProperties,
    });
    identifyClarityUser(userId, identity.name || undefined);
  }

  setClarityTag("app_platform", surface);
  setClarityTag("app_experience", experience);
  setClarityTag("auth_type", userProperties.auth_type);
  setClarityTag("onboarding_completed", userProperties.onboarding_completed);
};

export const trackPageView = (path: string, title = document.title) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const pagePath = window.location.hash ? `/${window.location.hash}` : normalizedPath;
  const experience = getAnalyticsExperience(normalizedPath);

  if (canLoadGoogleAnalytics()) {
    createGtag();
    window.gtag!("config", GA_MEASUREMENT_ID, {
      page_title: title,
      page_location: getAnalyticsPageLocation(),
      page_path: pagePath,
      app_platform: getAnalyticsSurface(),
      app_experience: experience,
    });
  }

  trackMeasurementProtocolEvent("adonai_route_view", {
    route_path: normalizedPath,
    app_experience: experience,
  });
  setClarityTag("route_path", pagePath);
  setClarityTag("app_experience", experience);
  trackClarityEvent(`route_${normalizedPath === "/" ? "home" : normalizedPath.replace(/^\/+/, "").replace(/\//g, "_")}`);
};

export const trackAnalyticsEvent = (eventName: string, params: Record<string, unknown> = {}) => {
  if (!eventName) return;

  if (canLoadGoogleAnalytics()) {
    createGtag();
    window.gtag!("event", eventName, {
      app_platform: getAnalyticsSurface(),
      app_experience: getAnalyticsExperience(),
      ...params,
    });
  }

  trackMeasurementProtocolEvent(eventName, params);
  trackClarityEvent(eventName);
};
