import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ToolResult {
  tool: string;
  result: {
    success: boolean;
    message: string;
    data?: unknown;
  };
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimated: boolean;
}

export interface StreamEvent {
  type: 'content' | 'done' | 'tool_result' | 'followup' | 'usage' | 'error' | 'complete';
  text?: string;
  content?: string;
  tool?: string;
  result?: ToolResult['result'];
  usage?: AiUsage;
  error?: string;
}

const SUPABASE_URL = "https://bpckgibqjrqdxzbvtiyn.supabase.co";

export function useChatAgent() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [toolResults, setToolResults] = useState<ToolResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    sessionId: string,
    sessionHistory: Array<{ role: string; content: string }>,
    onEvent?: (event: StreamEvent) => void,
  ) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('No auth session');

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setIsStreaming(true);
    setStreamedContent('');
    setToolResults([]);

    try {
      const funcUrl = `${SUPABASE_URL}/functions/v1/chat-adonai`;

      const response = await fetch(funcUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, sessionId, sessionHistory }),
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API error ${response.status}: ${text}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(trimmed.slice(6)) as StreamEvent;
            onEvent?.(event);

            if ((event.type === 'content' || event.type === 'followup') && event.text) {
              setStreamedContent(prev => prev + event.text);
            } else if (event.type === 'done' && event.content) {
              setStreamedContent(event.content);
            } else if (event.type === 'tool_result' && event.tool && event.result) {
              setToolResults(prev => [...prev, { tool: event.tool!, result: event.result! }]);
            } else if (event.type === 'error') {
              console.error('Chat error:', event.error);
            }
          } catch {
            // skip parse errors
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      onEvent?.({ type: 'error', error: msg });
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { sendMessage, cancel, isStreaming, streamedContent, toolResults };
}
