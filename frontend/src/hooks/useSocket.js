import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useSocket(token, handlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      transports: ["websocket"],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("message:new", (payload) => handlersRef.current.onMessage?.(payload));
    socket.on("message:update", (payload) => handlersRef.current.onMessageUpdate?.(payload));
    socket.on("message:delete", (payload) => handlersRef.current.onMessageDelete?.(payload));
    socket.on("message:warning", (payload) => handlersRef.current.onWarning?.(payload));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return { socket: socketRef.current, connected };
}
