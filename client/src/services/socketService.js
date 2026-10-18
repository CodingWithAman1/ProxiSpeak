import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
    this.lastMoveSent = 0;
  }

  connect(userData, callbacks = {}) {
    if (this.socket && this.isConnected) return;

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('[SocketService] Connected to ProxiSpeak server:', this.socket.id);
      if (callbacks.onConnectionChange) callbacks.onConnectionChange(true, this.socket.id);

      // Announce presence
      this.socket.emit('user:join', userData);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('[SocketService] Disconnected from server');
      if (callbacks.onConnectionChange) callbacks.onConnectionChange(false, null);
    });

    this.socket.on('sync:initial_state', (data) => {
      if (callbacks.onInitialSync) callbacks.onInitialSync(data);
    });

    this.socket.on('user:joined', (user) => {
      if (callbacks.onUserJoined) callbacks.onUserJoined(user);
    });

    this.socket.on('user:moved', (moveData) => {
      if (callbacks.onUserMoved) callbacks.onUserMoved(moveData);
    });

    this.socket.on('user:state_changed', (stateData) => {
      if (callbacks.onUserStateChanged) callbacks.onUserStateChanged(stateData);
    });

    this.socket.on('proximity:update', (proxData) => {
      if (callbacks.onProximityUpdate) callbacks.onProximityUpdate(proxData);
    });

    this.socket.on('door:updated', (doorData) => {
      if (callbacks.onDoorUpdated) callbacks.onDoorUpdated(doorData);
    });

    this.socket.on('user:left', (leftData) => {
      if (callbacks.onUserLeft) callbacks.onUserLeft(leftData);
    });

    return this.socket;
  }

  sendMovement(x, y, currentRoom) {
    if (!this.socket || !this.isConnected) return;
    const now = Date.now();
    // Throttle to 30Hz network rate (every ~33ms)
    if (now - this.lastMoveSent < 33) return;
    this.lastMoveSent = now;

    this.socket.emit('user:move', {
      x: Math.round(x),
      y: Math.round(y),
      currentRoom,
    });
  }

  sendAudioState({ isMuted, isDeafened, isSpeaking, isSeated }) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('user:state', {
      isMuted,
      isDeafened,
      isSpeaking,
      isSeated,
    });
  }

  toggleDoor(doorId, isOpen) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('door:toggle', { doorId, isOpen });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketService = new SocketService();
export default socketService;
