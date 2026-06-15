"use client";
import { useEffect, useRef, useCallback } from "react";
import type { WSEvent } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1";

interface UseWebSocketOptions {
  onMessage?: (event: WSEvent) => void;
  onMatch?: (matchId: string, withUserId: string) => void;
  onTyping?: (matchId: string, userId: string) => void;
  enabled?: boolean;
}

export function useWebSocket({
  onMessage,
  onMatch,
  onTyping,
  enabled = true,
}: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem("radius_token");
    if (!token || !enabled) return;

    const ws = new WebSocket(`${WS_URL}/ws/chat?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Keepalive ping every 20s
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20_000);
    };

    ws.onmessage = (e) => {
      try {
        const event: WSEvent = JSON.parse(e.data);
        onMessage?.(event);

        if (event.type === "match" && event.data) {
          onMatch?.(
            event.data.match_id as string,
            event.data.with_user as string
          );
        }
        if (event.type === "typing" && event.match_id && event.user_id) {
          onTyping?.(event.match_id, event.user_id);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      // Reconnect after 3s
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [enabled, onMessage, onMatch, onTyping]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const joinChat = useCallback(
    (matchId: string) => send({ type: "join_chat", match_id: matchId }),
    [send]
  );

  const sendTyping = useCallback(
    (matchId: string) => send({ type: "typing", match_id: matchId }),
    [send]
  );

  return { send, joinChat, sendTyping };
}
