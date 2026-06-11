import { createRoot } from "react-dom/client";
import React from "react";
import { ClerkProvider } from "@clerk/react";
import { shadcn } from "@clerk/ui/themes";
import "@clerk/ui/themes/shadcn.css";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { adonaiClerkAppearance, adonaiClerkLocalization } from "./lib/clerkAppearance";
import { clerkPublishableKey } from "./lib/clerkConfig";

const isCapacitor = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNative;

const isLocalhost =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

if (isLocalhost && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });

  if ("caches" in window) {
    void caches.keys().then((keys) => {
      keys.forEach((key) => {
        void caches.delete(key);
      });
    });
  }
}

initAnalytics();

if (!clerkPublishableKey) {
  const root = document.getElementById("root")!;
  root.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#151820;color:#fff;font-family:Inter,sans-serif;padding:2rem;text-align:center;gap:1rem">
      <h1 style="font-size:1.5rem;font-weight:700">Adonai</h1>
      <p style="color:#94a3b8;max-width:400px">Adonai necesita configuración de autenticación para funcionar. Revisa tus variables de entorno.</p>
      <code style="background:#1e293b;padding:0.5rem 1rem;border-radius:8px;font-size:0.875rem;color:#f59e0b">VITE_CLERK_PUBLISHABLE_KEY</code>
    </div>
  `;
} else {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        afterSignOutUrl="/"
        afterSignInUrl={isCapacitor ? "com.adonaitasks.app://" : undefined}
        afterSignUpUrl={isCapacitor ? "com.adonaitasks.app://" : undefined}
        localization={adonaiClerkLocalization}
        appearance={{ theme: shadcn, ...adonaiClerkAppearance }}
      >
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}
