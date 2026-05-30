import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "./useSettings";

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
  const { settings } = useSettings();

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
      const redirectUri = `${window.location.origin}/calendar-callback`;
      const data = await invokeFunction<{ url?: string }>("google-auth", {
        action: "get-url",
        redirect_uri: redirectUri,
      });
      if (!data?.url) throw new Error("No se pudo iniciar la conexión con Google Calendar");

      window.location.href = data.url;
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
    email: null,
    isLoading: connectionDetails.isLoading,
    connect,
    disconnect,
    sync,
  };
};
