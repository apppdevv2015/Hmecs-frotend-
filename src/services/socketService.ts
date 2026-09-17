type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

const AUTH_FAILURE_CODES = new Set([4001, 4003]); 
const HEARTBEAT_INTERVAL = 25000; 
const HEARTBEAT_TIMEOUT = 10000; 
const MAX_RECONNECT_DELAY = 30000;
const BASE_RECONNECT_DELAY = 1000;

class SocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;
  private lastCreds: { userId: string; role: string; token?: string } | null = null;
  private emitter = new EventTarget();
  private status: ConnectionStatus = "disconnected";
  private statusListeners = new Set<(status: ConnectionStatus) => void>();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleNetworkOnline);
    }
  }

  private handleNetworkOnline = () => {
    if (this.lastCreds && !this.isConnected() && !this.intentionalDisconnect) {
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.connect(this.lastCreds.userId, this.lastCreds.role, this.lastCreds.token);
    }
  };

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  onStatusChange(cb: (status: ConnectionStatus) => void) {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  getStatus() {
    return this.status;
  }

  connect(userId: string, role: string, token?: string) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return this.socket;
    }

    this.intentionalDisconnect = false;
    this.lastCreds = { userId, role, token };
    this.setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

    try {
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (role) params.append("role", role);
      if (token) params.append("token", token);

      const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || "ws://localhost:4000/ws/alerts";
      const host = typeof window !== "undefined" && window.location ? window.location.hostname : "localhost";
      let resolvedSocketUrl = rawSocketUrl.replace(/localhost|127\.0\.0\.1/g, host);

      
      if (typeof window !== "undefined" && window.location.protocol === "https:" && resolvedSocketUrl.startsWith("ws://")) {
        resolvedSocketUrl = resolvedSocketUrl.replace("ws://", "wss://");
      }

      const socketUrl = `${resolvedSocketUrl}?${params.toString()}`;
      this.socket = new WebSocket(socketUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus("connected");
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data?.type === "pong") {
            this.clearHeartbeatTimeout();
            return;
          }

          this.emitter.dispatchEvent(new CustomEvent("message", { detail: data }));
        } catch {
          
        }
      };

      this.socket.onerror = () => {
  
      };

      this.socket.onclose = (event) => {
        this.stopHeartbeat();
        this.socket = null;
        this.setStatus("disconnected");

        if (this.intentionalDisconnect) return;

        if (AUTH_FAILURE_CODES.has(event.code)) {
          
          this.emitter.dispatchEvent(new CustomEvent("auth-failed", { detail: event }));
          return;
        }

        this.scheduleReconnect(userId, role, token);
      };

      return this.socket;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.setStatus("disconnected");
      this.scheduleReconnect(userId, role, token);
      return null;
    }
  }

  private scheduleReconnect(userId: string, role: string, token?: string) {
    this.clearReconnectTimer();
    this.reconnectAttempts++;

    const delay = Math.min(
      BASE_RECONNECT_DELAY * 2 ** (this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY,
    );
    const jitter = delay * 0.2 * Math.random();

    this.setStatus("reconnecting");

    this.reconnectTimer = setTimeout(() => {
      this.connect(userId, role, token);
    }, delay + jitter);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));

        this.heartbeatTimeoutTimer = setTimeout(() => {
        
          this.socket?.close();
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private clearHeartbeatTimeout() {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearHeartbeatTimeout();
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  }

  onMessage(callback: (data: any) => void) {
    const handler = (event: Event) => callback((event as CustomEvent).detail);
    this.emitter.addEventListener("message", handler);
    return () => this.emitter.removeEventListener("message", handler);
  }

  onAuthFailed(callback: () => void) {
    const handler = () => callback();
    this.emitter.addEventListener("auth-failed", handler);
    return () => this.emitter.removeEventListener("auth-failed", handler);
  }

  disconnect() {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.lastCreds = null;
    this.reconnectAttempts = 0;

    if (this.socket) {
      this.socket.close(1000, "client disconnect");
      this.socket = null;
    }
    this.setStatus("disconnected");
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export default new SocketService();