// src/services/socketService.ts

class SocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  connect(userId: string, role: string, token?: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.socket;
    }

    try {
      const params = new URLSearchParams();

      if (userId) params.append("userId", userId);
      if (role) params.append("role", role);
      if (token) params.append("token", token);

      const socketUrl = `${
        import.meta.env.VITE_SOCKET_URL
      }?${params.toString()}`;

      this.socket = new WebSocket(socketUrl);

      this.socket.onopen = () => {
        console.log("✅ WebSocket Connected");

        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          window.dispatchEvent(
            new CustomEvent("websocket-message", {
              detail: data,
            }),
          );
        } catch {
        
        }
      };
      this.socket.onerror = (error) => {
        console.error("🚨 WebSocket Error:", error);
      };
      this.socket.onclose = (event) => {
        this.socket = null;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;

         

          setTimeout(() => {
            this.connect(userId, role, token);
          }, this.reconnectDelay);
        }
      };

      return this.socket;
    } catch (error) {
      console.error("🚨 Failed to create WebSocket:", error);

      return null;
    }
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  }

  onMessage(callback: (data: any) => void) {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;

      callback(customEvent.detail);
    };

    window.addEventListener("websocket-message", handler);

    return () => {
      window.removeEventListener("websocket-message", handler);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export default new SocketService();
