import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "./useSettings";
import { useEffect, useMemo } from "react";

const CALENDAR_CONNECTED_ONCE_KEY = "adonai_calendar_connected_once";

const readableFunctionError = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : "No se pudo completar la operación";
  const context = (error as { context?: Response })?.context;
  if (!context) return fallback;

  try {
    const payload = await context.clone().json();
    return payload?.error || payload?.message || fallback;
  } catch {
    return fallback;
  }
};

const invokeFunction = async <T>(name: string, body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(await readableFunctionError(error));
  return data as T;
};

export const useCalendarIntegration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings, isLoading: settingsLoading } = useSettings();

  const hasConnectedOnceLocally = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(CALENDAR_CONNECTED_ONCE_KEY) === "true";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (settings?.calendar_connected) {
      window.localStorage.setItem(CALENDAR_CONNECTED_ONCE_KEY, "true");
    }
  }, [settings?.calendar_connected]);

  const connectionDetails = useQuery({
    queryKey: ["calendar-connection-details", user?.id],
    enabled: !!user && !!settings?.calendar_connected,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("google_calendar_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const connect = useMutation({
    mutationFn: async () => {
      const isElectron = !!window.electronAPI;
      const redirectUri = isElectron
        ? "https://adonai-tareas.vercel.app/calendar-callback"
        : `${window.location.origin}/calendar-callback`;
      
      const data = await invokeFunction<{ url?: string }>("google-auth", {
        action: "get-url",
        redirect_uri: redirectUri,
        state: isElectron ? "desktop" : undefined,
      });
      if (!data?.url) throw new Error("No se pudo iniciar la conexión con Google Calendar");

      if (isElectron && window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(data.url);
      } else {
        window.location.href = data.url;
      }
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      await invokeFunction("google-auth", { action: "disconnect" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-connection-details"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const sync = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-calendar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "fetch" }),
        }
      );

      if (!response.ok) throw new Error("Error sincronizando calendario");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  return {
    connected: !!settings?.calendar_connected,
    hasConnectedBefore: !!settings?.calendar_connected || hasConnectedOnceLocally,
    email: null,
    isLoading: settingsLoading || connectionDetails.isLoading,
    connect,
    disconnect,
    sync,
  };
};
