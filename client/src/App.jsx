/**
 * ProxiSpeak Main Application Container
 * Orchestrates Socket.io signaling, WebRTC mesh, spatial audio rendering,
 * and user interactions.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import SpatialAudioEngine from './audio/SpatialAudioEngine.js';
import WorldCanvas from './components/WorldCanvas.jsx';
import AudioControls from './components/AudioControls.jsx';
import SpatialChat from './components/SpatialChat.jsx';
import RoomSelector from './components/RoomSelector.jsx';
import SpatialAuditHUD from './components/SpatialAuditHUD.jsx';
import AudioSetupModal from './components/AudioSetupModal.jsx';

export function App() {
  const [hasJoined, setHasJoined] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [selfUser, setSelfUser] = useState(null);
  const [peers, setPeers] = useState([]);
  const [walls, setWalls] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAuditHUD, setShowAuditHUD] = useState(false);
  const [activeAcoustics, setActiveAcoustics] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [earshotRadius, setEarshotRadius] = useState(20);
  const [micLevel, setMicLevel] = useState(0);

  const socketRef = useRef(null);
  const audioEngineRef = useRef(null);
  const activeAcousticsRef = useRef(new Map());
  const userProfileRef = useRef({ name: '', color: '#3b82f6', enableMic: true });
  const lastMoveSentRef = useRef(0);

  // Fetch rooms on mount
  useEffect(() => {
    fetch('/api/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.data) {
          setRooms(data.data);
          setCurrentRoom(data.data[0]);
        }
      })
      .catch((err) => console.warn('Could not load rooms:', err.message));
  }, []);

  // Keyboard shortcut listeners (M for mute, D for deafen, H for HUD)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'm') toggleMute();
      if (e.key.toLowerCase() === 'd') toggleDeafen();
      if (e.key.toLowerCase() === 'h') setShowAuditHUD((prev) => !prev);
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMuted, isDeafened]);

  // Handle user joining the space
  const handleJoinSpace = async (profile) => {
    userProfileRef.current = profile;
    setHasJoined(true);

    // 1. Initialize Spatial Audio Engine
    const engine = new SpatialAudioEngine({
      onVoiceActivity: (isSpeaking, level) => {
        setMicLevel(level);
        setSelfUser((prev) => (prev ? { ...prev, isSpeaking } : prev));
        socketRef.current?.emit('presence:state', { isSpeaking });
      },
      onSignalingMessage: (eventType, payload) => {
        socketRef.current?.emit(eventType, payload);
      },
    });

    audioEngineRef.current = engine;
    await engine.init();

    if (!profile.enableMic) {
      engine.setMuted(true);
      setIsMuted(true);
    }

    // 2. Connect to Socket.io Gateway
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('presence:join', {
        roomId: currentRoom?.slug || 'central-plaza',
        user: {
          name: profile.name,
          color: profile.color,
          earshotRadius: 20,
        },
      });
    });

    socket.on('presence:init', (data) => {
      setSelfUser(data.self);
      setCurrentRoom(data.room);
      setPeers(data.users || []);
      setWalls(data.walls || []);
      setEarshotRadius(data.self.earshotRadius || 20);
    });

    socket.on('presence:joined', (newPeer) => {
      setPeers((prev) => {
        const filtered = prev.filter((p) => p.userId !== newPeer.userId);
        return [...filtered, newPeer];
      });
    });

    socket.on('presence:moved', (data) => {
      setPeers((prev) =>
        prev.map((p) => (p.userId === data.userId ? { ...p, x: data.x, y: data.y, orientation: data.orientation } : p))
      );
    });

    socket.on('presence:state-changed', (data) => {
      setPeers((prev) =>
        prev.map((p) => {
          if (p.userId === data.userId) {
            const updated = {
              ...p,
              isSpeaking: data.isSpeaking,
              isMuted: data.isMuted,
              isDeafened: data.isDeafened,
              earshotRadius: data.earshotRadius,
            };
            if (p.isBot && audioEngineRef.current) {
              const currentProfile = activeAcousticsRef.current.get(p.userId) || { inEarshot: false, gain: 0 };
              audioEngineRef.current.updateBotAudio(updated, currentProfile);
            }
            return updated;
          }
          return p;
        })
      );
    });

    socket.on('presence:left', ({ userId }) => {
      setPeers((prev) => prev.filter((p) => p.userId !== userId));
      activeAcousticsRef.current.delete(userId);
      setActiveAcoustics(new Map(activeAcousticsRef.current));
      audioEngineRef.current?.removePeer(userId);
    });

    // Proximity Event: Peer entered earshot
    socket.on('proximity:enter', ({ peerId, peerSocketId, peerName, profile }) => {
      activeAcousticsRef.current.set(peerId, { ...profile, peerName });
      setActiveAcoustics(new Map(activeAcousticsRef.current));

      const isBot = peerId.startsWith('bot_');
      if (!isBot) {
        audioEngineRef.current?.createPeerConnection(peerId, peerSocketId, true);
        audioEngineRef.current?.updatePeerAcoustics(peerId, profile);
      } else {
        // Find bot user data to start synthetic voice
        const botUser = peers.find((p) => p.userId === peerId) || { userId: peerId, isSpeaking: false };
        audioEngineRef.current?.updateBotAudio(botUser, profile);
      }
    });

    // Proximity Event: Peer exited earshot
    socket.on('proximity:exit', ({ peerId }) => {
      activeAcousticsRef.current.delete(peerId);
      setActiveAcoustics(new Map(activeAcousticsRef.current));
      audioEngineRef.current?.removePeer(peerId);
    });

    // Proximity Event: Continuous acoustic volume/occlusion/pan update
    socket.on('proximity:update', ({ peerId, profile }) => {
      const existing = activeAcousticsRef.current.get(peerId);
      activeAcousticsRef.current.set(peerId, { ...existing, ...profile });
      setActiveAcoustics(new Map(activeAcousticsRef.current));

      audioEngineRef.current?.updatePeerAcoustics(peerId, profile);
    });

    // WebRTC Signaling
    socket.on('signal:offer', ({ fromSocketId, fromUserId, offer }) => {
      audioEngineRef.current?.handleOffer(fromSocketId, fromUserId, offer);
    });

    socket.on('signal:answer', ({ fromUserId, answer }) => {
      audioEngineRef.current?.handleAnswer(fromUserId, answer);
    });

    socket.on('signal:ice-candidate', ({ fromUserId, candidate }) => {
      audioEngineRef.current?.handleIceCandidate(fromUserId, candidate);
    });

    // Spatial Chat
    socket.on('chat:message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });
  };

  // Movement handler from Canvas
  const handleMove = useCallback((x, y, orientation) => {
    setSelfUser((prev) => (prev ? { ...prev, x, y, orientation } : prev));

    const now = Date.now();
    if (now - lastMoveSentRef.current >= 40) {
      // Throttle movement network packet to max 25Hz
      lastMoveSentRef.current = now;
      socketRef.current?.emit('presence:move', { x, y, orientation });
    }
  }, []);

  // Audio toggles
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngineRef.current?.setMuted(nextMuted);
    setSelfUser((prev) => (prev ? { ...prev, isMuted: nextMuted } : prev));
    socketRef.current?.emit('presence:state', { isMuted: nextMuted });
  };

  const toggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    audioEngineRef.current?.setDeafened(nextDeafened);
    setSelfUser((prev) => (prev ? { ...prev, isDeafened: nextDeafened } : prev));
    socketRef.current?.emit('presence:state', { isDeafened: nextDeafened });
  };

  const handleEarshotChange = (newRadius) => {
    setEarshotRadius(newRadius);
    setSelfUser((prev) => (prev ? { ...prev, earshotRadius: newRadius } : prev));
    socketRef.current?.emit('presence:state', { earshotRadius: newRadius });
  };

  // Simulation Bot Controls
  const handleSpawnBots = () => {
    socketRef.current?.emit('simulation:spawn', { count: 3 });
  };

  const handleClearBots = () => {
    socketRef.current?.emit('simulation:clear');
  };

  // Room Switching
  const handleSelectRoom = (roomSlug) => {
    const selected = rooms.find((r) => r.slug === roomSlug);
    if (!selected || selected.slug === currentRoom?.slug) return;

    setCurrentRoom(selected);
    activeAcousticsRef.current.clear();
    setActiveAcoustics(new Map());

    socketRef.current?.emit('presence:join', {
      roomId: roomSlug,
      user: {
        name: userProfileRef.current.name,
        color: userProfileRef.current.color,
        earshotRadius,
      },
    });
  };

  const handleSendMessage = (text, isWhisper) => {
    socketRef.current?.emit('chat:send', { text, isWhisper });
  };

  const botCount = peers.filter((p) => p.isBot).length;

  return (
    <div className="relative w-screen h-screen bg-[#080c14] overflow-hidden">
      {!hasJoined && <AudioSetupModal onJoin={handleJoinSpace} />}

      {/* Top Header & Space Selector */}
      <RoomSelector
        currentRoom={currentRoom}
        rooms={rooms}
        onSelectRoom={handleSelectRoom}
        userCount={peers.length + 1}
      />

      {/* Interactive 2D World Canvas */}
      <WorldCanvas
        room={currentRoom}
        selfUser={selfUser}
        peers={peers}
        walls={walls}
        onMove={handleMove}
        zoom={12}
      />

      {/* Spatial Chat Panel */}
      <SpatialChat
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isOpen={isChatOpen}
        onToggleOpen={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Real-Time Acoustic & Spatial Telemetry HUD */}
      <SpatialAuditHUD
        isOpen={showAuditHUD}
        onClose={() => setShowAuditHUD(false)}
        activeAcoustics={activeAcoustics}
        selfUser={selfUser}
      />

      {/* Bottom Floating Audio Dock */}
      {hasJoined && (
        <AudioControls
          isMuted={isMuted}
          isDeafened={isDeafened}
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          earshotRadius={earshotRadius}
          onChangeEarshotRadius={handleEarshotChange}
          onSpawnBots={handleSpawnBots}
          onClearBots={handleClearBots}
          botCount={botCount}
          showAuditHUD={showAuditHUD}
          onToggleAuditHUD={() => setShowAuditHUD(!showAuditHUD)}
          micLevel={micLevel}
        />
      )}
    </div>
  );
}

export default App;
