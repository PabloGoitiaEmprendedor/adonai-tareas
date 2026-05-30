import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "./useSettings";

const readableFunctionError = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : "No se pudo completar la operacion";
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

export const useSheetsIntegration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings } = useSettings();

  const connectionDetails = useQuery({
    queryKey: ["sheets-connection-details", user?.id],
    enabled: !!user && !!settings?.sheets_connected,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("google_sheets_tokens")
        .select("email")
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
        ? "https://adonai-tareas.vercel.app/sheets-callback"
        : `${window.location.origin}/sheets-callback`;
      
      const data = await invokeFunction<{ url?: string }>("google-auth", {
        action: "get-url",
        redirect_uri: redirectUri,
        service: "sheets",
        state: isElectron ? "desktop" : undefined,
      });
      if (!data?.url) throw new Error("No se pudo iniciar la conexion con Google Sheets");

      if (isElectron && window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(data.url);
      } else {
        window.location.href = data.url;
      }
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      await invokeFunction("google-auth", {
        action: "disconnect",
        service: "sheets",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["sheets-connection-details"] });
    },
  });

  const importSheets = useMutation({
    mutationFn: async (spreadsheetUrl: string) => {
      return invokeFunction<{ success: boolean; importedCount: number; message: string }>(
        "import-sheets",
        { spreadsheetUrl }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    connected: !!settings?.sheets_connected,
    email: connectionDetails.data?.email || null,
    isLoading: connectionDetails.isLoading,
    connect,
    disconnect,
    importSheets,
  };
};
