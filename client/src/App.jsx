import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Radio,
  Sparkles,
  CloudRain,
  Coffee,
  Users,
  FileCheck2,
  TreePine,
  DoorOpen,
  Droplets,
  Wifi,
  WifiOff,
} from 'lucide-react';
import SpatialCanvas from './components/SpatialCanvas';
import AudioHUD from './components/AudioHUD';
import PeersPanel from './components/PeersPanel';
import RoomNavigator from './components/RoomNavigator';
import SOPGuidanceModal from './components/SOPGuidanceModal';
import socketService from './services/socketService';
import webrtcMesh from './services/webrtcMesh';
import {
  WORLD_CONFIG,
  INITIAL_ROOMS,
  INITIAL_WALLS,
  INITIAL_DOORS,
  INITIAL_PEERS,
  INITIAL_WINDOWS,
  INITIAL_PLANTS,
  OFFICE_FURNITURE,
} from './data/worldData';
import {
  calculateDistance,
  calculateStereoPan,
  calculateProximityGain,
  checkWallOcclusion,
  getContainingRoom,
} from './utils/spatialGeometry';
import spatialAudio from './utils/spatialAudioEngine';

export function App() {
  // Player state starts in Central Corridor Atrium
  const [player, setPlayer] = useState({
    x: 505,
    y: 120,
    name: 'You (Host)',
    id: `user-${Math.random().toString(36).substring(2, 8)}`,
    isSeated: false,
  });

  // World entities
  const [rooms] = useState(INITIAL_ROOMS);
  const [walls] = useState(INITIAL_WALLS);
  const [doors, setDoors] = useState(INITIAL_DOORS);
  const [peers, setPeers] = useState(INITIAL_PEERS);
  const [windows, setWindows] = useState(INITIAL_WINDOWS);
  const [plants] = useState(INITIAL_PLANTS);
  const [furniture, setFurniture] = useState(OFFICE_FURNITURE);

  // Real-time backend connection status
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [socketId, setSocketId] = useState(null);

  // Audio & HUD controls
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [earshotPreset, setEarshotPreset] = useState('normal');
  const [ambientSoundEnabled, setAmbientSoundEnabled] = useState(true);
  const [micDecibels, setMicDecibels] = useState(0.2);
  const [isSOPModalOpen, setIsSOPModalOpen] = useState(false);

  const earshotRadius = WORLD_CONFIG.earshotPresets[earshotPreset].radius;

  // Real-time Socket.io & WebRTC Presence Gateway Lifecycle
  useEffect(() => {
    const socket = socketService.connect(
      {
        userId: player.id,
        name: player.name,
        color: '#06b6d4',
        x: player.x,
        y: player.y,
        currentRoom: 'corridor',
        isMuted,
        isDeafened,
        earshotRadius,
      },
      {
        onConnectionChange: (online, id) => {
          setIsServerOnline(online);
          setSocketId(id);
        },
        onInitialSync: (data) => {
          if (data.doors && data.doors.length) {
            setDoors((prev) =>
              prev.map((d) => {
                const remote = data.doors.find((rd) => rd.id === d.id);
                return remote ? { ...d, isOpen: remote.isOpen, targetOpen: remote.isOpen ? 1 : 0 } : d;
              })
            );
          }
        },
        onUserJoined: (newUser) => {
          setPeers((prev) => {
            if (prev.some((p) => p.id === newUser.userId)) return prev;
            return [
              ...prev,
              {
                id: newUser.userId,
                name: newUser.name,
                handle: `@${newUser.name.toLowerCase().replace(/\s+/g, '.')}`,
                role: 'Online Colleague',
                statusTag: 'In Office 🟢',
                x: newUser.x,
                y: newUser.y,
                color: newUser.color || '#38bdf8',
                earshotRadius: newUser.earshotRadius || 150,
                isMuted: newUser.isMuted,
                isSpeaking: newUser.isSpeaking,
                speechCycle: 0,
                isSeated: newUser.isSeated,
                wanderTarget: { x: newUser.x, y: newUser.y },
              },
            ];
          });
        },
        onUserMoved: ({ userId, x, y }) => {
          setPeers((prev) =>
            prev.map((p) => (p.id === userId ? { ...p, x, y, wanderTarget: { x, y } } : p))
          );
        },
        onUserLeft: ({ userId }) => {
          setPeers((prev) => prev.filter((p) => p.id !== userId));
          webrtcMesh.closePeer(userId);
        },
        onDoorUpdated: (updatedDoor) => {
          setDoors((prev) =>
            prev.map((d) => (d.id === updatedDoor.id ? { ...d, isOpen: updatedDoor.isOpen, targetOpen: updatedDoor.isOpen ? 1 : 0 } : d))
          );
        },
        onProximityUpdate: ({ neighbors }) => {
          neighbors.forEach((n) => {
            webrtcMesh.updateSpatialAudio(n.socketId, {
              gain: n.gain,
              pan: n.pan,
              isOccluded: n.isOccluded,
            });
          });
        },
      }
    );

    if (socket) {
      webrtcMesh.init(socket, spatialAudio.ctx);
    }

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Broadcast player movements to server in real-time
  useEffect(() => {
    const currentRoom = getContainingRoom(player, rooms);
    socketService.sendMovement(player.x, player.y, currentRoom ? currentRoom.id : 'corridor');
  }, [player.x, player.y, player.isSeated, rooms]);

  // Sync mute state to server and WebRTC tracks
  useEffect(() => {
    socketService.sendAudioState({
      isMuted,
      isDeafened,
      isSpeaking: micDecibels > 0.05,
      isSeated: player.isSeated,
    });
    webrtcMesh.setMicMuted(isMuted);
  }, [isMuted, isDeafened, micDecibels, player.isSeated]);

  // Sync audio engine settings
  useEffect(() => {
    spatialAudio.isMuted = isMuted;
    spatialAudio.isDeafened = isDeafened;
    spatialAudio.ambientSoundEnabled = ambientSoundEnabled;
    if (ambientSoundEnabled) {
      spatialAudio.startWindowAmbience();
    }
  }, [isMuted, isDeafened, ambientSoundEnabled]);

  // Continuously update window outdoor ambience based on proximity to nearest open window
  useEffect(() => {
    const interval = setInterval(() => {
      if (ambientSoundEnabled) {
        spatialAudio.updateWindowAmbience(player, windows);

        // Random delicate birdsong if Boardroom nature window is open and player is nearby
        const natureWin = windows.find((w) => w.id === 'win-boardroom-north');
        if (natureWin && natureWin.isOpen && Math.random() < 0.12) {
          const dist = Math.hypot(player.x - (natureWin.x + natureWin.w / 2), player.y - natureWin.y);
          if (dist < 320) {
            const pan = calculateStereoPan(player, { x: natureWin.x + natureWin.w / 2, y: natureWin.y }, 300);
            spatialAudio.playBirdChirp(pan);
          }
        }
      }
    }, 400);

    return () => clearInterval(interval);
  }, [player, windows, ambientSoundEnabled]);

  // Microphone audio visualizer
  useEffect(() => {
    let animId;
    let tick = 0;

    const updateMicActivity = () => {
      tick += 0.05;
      if (isMuted) {
        setMicDecibels(0);
      } else {
        const realVol = spatialAudio.getMicVolume();
        if (realVol > 0.01) {
          setMicDecibels(realVol);
        } else {
          const naturalSim = Math.max(0, (Math.sin(tick * 3) + Math.cos(tick * 5)) * 0.25 + 0.15);
          setMicDecibels(naturalSim);
        }
      }
      animId = requestAnimationFrame(updateMicActivity);
    };

    animId = requestAnimationFrame(updateMicActivity);
    return () => cancelAnimationFrame(animId);
  }, [isMuted]);

  // Subtle natural peer movements
  useEffect(() => {
    const interval = setInterval(() => {
      setPeers((prevPeers) =>
        prevPeers.map((peer) => {
          if (peer.isSeated) {
            const nextCycle = (peer.speechCycle + 0.04) % 10;
            const isSpeakingNow = Math.sin(nextCycle) > 0.35 && !peer.isMuted;
            return { ...peer, speechCycle: nextCycle, isSpeaking: isSpeakingNow };
          }

          let tx = peer.wanderTarget.x;
          let ty = peer.wanderTarget.y;

          if (Math.hypot(tx - peer.x, ty - peer.y) < 12) {
            if (peer.id === 'peer-rohan') {
              tx = 100 + Math.random() * 120;
              ty = 130 + Math.random() * 80;
            } else {
              tx = 600 + Math.random() * 100;
              ty = 130 + Math.random() * 80;
            }
          }

          const dx = tx - peer.x;
          const dy = ty - peer.y;
          const dist = Math.hypot(dx, dy);
          const step = Math.min(dist, 0.85);
          const nextX = peer.x + (dx / (dist || 1)) * step;
          const nextY = peer.y + (dy / (dist || 1)) * step;

          const nextCycle = (peer.speechCycle + 0.04) % 10;
          const isSpeakingNow = Math.sin(nextCycle) > 0.4 && !peer.isMuted;

          return {
            ...peer,
            x: nextX,
            y: nextY,
            speechCycle: nextCycle,
            isSpeaking: isSpeakingNow,
            wanderTarget: { x: tx, y: ty },
          };
        })
      );
    }, 45);

    return () => clearInterval(interval);
  }, []);

  // Door toggle (Open/Close with realistic acoustic latch or pneumatic sliding sound)
  const handleToggleDoor = useCallback((doorId) => {
    setDoors((prev) =>
      prev.map((door) => {
        if (door.id === doorId) {
          const nextOpen = !door.isOpen;
          const pan = calculateStereoPan(player, { x: door.x + door.w / 2, y: door.y + door.h / 2 }, 250);
          if (door.type === 'glass_double') {
            spatialAudio.playGlassGateSound(nextOpen, pan);
          } else {
            spatialAudio.playDoorSound(nextOpen, pan);
          }
          socketService.toggleDoor(doorId, nextOpen);
          return {
            ...door,
            isOpen: nextOpen,
            targetOpen: nextOpen ? 1 : 0,
            sensorActive: false, // Manual override cancels auto sensor timer
          };
        }
        return door;
      })
    );
  }, [player]);

  // Programmatic door/gate state setter (used by proximity sensors & background routines)
  const handleSetDoorOpen = useCallback((doorId, isOpen, triggeredBySensor = false) => {
    setDoors((prev) =>
      prev.map((door) => {
        if (door.id === doorId) {
          if (door.isOpen === isOpen) return door;
          const pan = calculateStereoPan(player, { x: door.x + door.w / 2, y: door.y + door.h / 2 }, 250);
          if (door.type === 'glass_double') {
            spatialAudio.playGlassGateSound(isOpen, pan);
          } else {
            spatialAudio.playDoorSound(isOpen, pan);
          }
          socketService.toggleDoor(doorId, isOpen);
          return {
            ...door,
            isOpen,
            targetOpen: isOpen ? 1 : 0,
            sensorActive: triggeredBySensor,
            lastSensorTriggered: Date.now(),
          };
        }
        return door;
      })
    );
  }, [player]);

  // Autonomous Background Motion Sensors for Double Glass Gates
  useEffect(() => {
    const sensorInterval = setInterval(() => {
      setDoors((prevDoors) => {
        let hasChanges = false;
        const now = Date.now();

        const updated = prevDoors.map((door) => {
          if (!door.autoSensor) return door;

          const gateCenterX = door.x + door.w / 2;
          const gateCenterY = door.y + door.h / 2;

          // Proximity detection: is local player or any peer within 72px?
          const isPlayerNear = Math.hypot(player.x - gateCenterX, player.y - gateCenterY) < 72;
          const isPeerNear = peers.some(
            (p) => Math.hypot(p.x - gateCenterX, p.y - gateCenterY) < 72
          );

          const someoneNear = isPlayerNear || isPeerNear;

          if (someoneNear) {
            if (!door.isOpen) {
              hasChanges = true;
              const pan = calculateStereoPan(player, { x: gateCenterX, y: gateCenterY }, 250);
              spatialAudio.playGlassGateSound(true, pan);
              return {
                ...door,
                isOpen: true,
                targetOpen: 1,
                sensorActive: true,
                lastSensorTriggered: now,
              };
            } else if (door.sensorActive) {
              // Refresh activity timestamp while someone remains near
              return { ...door, lastSensorTriggered: now };
            }
          } else {
            // If opened by motion sensor and nobody has been near for > 3.8 seconds
            if (door.isOpen && door.sensorActive && now - (door.lastSensorTriggered || 0) > 3800) {
              hasChanges = true;
              const pan = calculateStereoPan(player, { x: gateCenterX, y: gateCenterY }, 250);
              spatialAudio.playGlassGateSound(false, pan);
              return {
                ...door,
                isOpen: false,
                targetOpen: 0,
                sensorActive: false,
              };
            }
          }

          return door;
        });

        return hasChanges ? updated : prevDoors;
      });
    }, 200);

    return () => clearInterval(sensorInterval);
  }, [player, peers]);

  // Autonomous Colleague Office Activity in Background (Periodic door interactions)
  useEffect(() => {
    const ambientRoutine = setInterval(() => {
      const candidateDoors = ['door-devhub', 'door-boardroom', 'door-restroom'];
      const chosenId = candidateDoors[Math.floor(Math.random() * candidateDoors.length)];

      setDoors((prev) =>
        prev.map((d) => {
          if (d.id === chosenId && !d.isOpen) {
            const pan = calculateStereoPan(player, { x: d.x + d.w / 2, y: d.y + d.h / 2 }, 250);
            spatialAudio.playDoorSound(true, pan);

            // Close after 4.5 seconds
            setTimeout(() => {
              setDoors((innerPrev) =>
                innerPrev.map((innerD) => {
                  if (innerD.id === chosenId && innerD.isOpen) {
                    spatialAudio.playDoorSound(false, pan);
                    return { ...innerD, isOpen: false, targetOpen: 0 };
                  }
                  return innerD;
                })
              );
            }, 4500);

            return { ...d, isOpen: true, targetOpen: 1 };
          }
          return d;
        })
      );
    }, 24000);

    return () => clearInterval(ambientRoutine);
  }, [player]);


  // Window toggle (Open/Close with sound)
  const handleToggleWindow = useCallback((windowId) => {
    setWindows((prev) =>
      prev.map((win) => {
        if (win.id === windowId) {
          const nextOpen = !win.isOpen;
          spatialAudio.playWindowSlide();
          return { ...win, isOpen: nextOpen };
        }
        return win;
      })
    );
  }, []);

  // Plant interaction (rustle leaves)
  const handleInteractPlant = useCallback((plant) => {
    const pan = calculateStereoPan(player, plant, 200);
    spatialAudio.playPlantRustle(pan);
  }, [player]);

  // Barista coffee brew
  const handleBrewCoffee = useCallback(() => {
    spatialAudio.playEspressoBrew(0.5);
  }, []);

  // Water cooler drink
  const handleDrinkWater = useCallback((cooler) => {
    const pan = calculateStereoPan(player, cooler, 200);
    spatialAudio.playWaterDispenseSound(pan);
  }, [player]);

  // Whiteboard slide toggle
  const handleToggleWhiteboard = useCallback(() => {
    setFurniture((prev) => {
      const nextSlide = (prev.whiteboard.slideIndex + 1) % prev.whiteboard.slides.length;
      return {
        ...prev,
        whiteboard: { ...prev.whiteboard, slideIndex: nextSlide },
      };
    });
    spatialAudio.playMeetingChime();
  }, []);

  // Chair sit interaction
  const handleSitChair = useCallback((chair) => {
    setPlayer((prev) => ({
      ...prev,
      x: chair.x,
      y: chair.y,
      isSeated: true,
    }));
    spatialAudio.playMeetingChime();
  }, []);

  // Toggle sit/leave boardroom meeting table
  const handleToggleMeetingTable = useCallback(() => {
    if (player.isSeated) {
      setPlayer((prev) => ({ ...prev, x: 640, y: 175, isSeated: false }));
    } else {
      const table = furniture.conferenceTable;
      const openChair = table.chairs.find((c) => c.occupant === null) || table.chairs[2];
      handleSitChair(openChair);
    }
  }, [player.isSeated, furniture, handleSitChair]);

  // Teleport to room center
  const handleTeleportToRoom = useCallback((room) => {
    const targetX = room.x + room.w / 2;
    const targetY = room.y + room.h / 2;
    setPlayer((prev) => ({ ...prev, x: targetX, y: targetY, isSeated: false }));
  }, []);

  // Teleport near peer
  const handleTeleportToPeer = useCallback((peer) => {
    setPlayer((prev) => ({
      ...prev,
      x: Math.max(35, peer.x - 35),
      y: Math.max(35, peer.y),
      isSeated: false,
    }));
  }, []);

  // Reset positions
  const handleResetPositions = useCallback(() => {
    setPlayer({ x: 505, y: 120, name: 'You (Host)', id: 'local-player', isSeated: false });
    setPeers(INITIAL_PEERS);
  }, []);

  // Test spatial audio
  const handleTestAudioBeep = useCallback(() => {
    let closestPeer = null;
    let minDistance = Infinity;

    peers.forEach((p) => {
      const d = calculateDistance(player, p);
      if (d < minDistance) {
        minDistance = d;
        closestPeer = p;
      }
    });

    if (closestPeer) {
      // Build active walls including closed doors
      const activeWalls = [...walls];
      doors.forEach((door) => {
        if (!door.isOpen) {
          activeWalls.push({
            id: `wall-closed-${door.id}`,
            start: { x: door.x, y: door.y + door.h / 2 },
            end: { x: door.x + door.w, y: door.y + door.h / 2 },
          });
        }
      });

      const isOccluded = checkWallOcclusion(player, closestPeer, activeWalls);
      const gain = calculateProximityGain(minDistance, earshotRadius, isOccluded);
      const pan = calculateStereoPan(player, closestPeer, earshotRadius);
      spatialAudio.playSpatialChirp(pan, Math.max(0.2, gain), isOccluded);
    } else {
      spatialAudio.playSpatialChirp(0, 0.5, false);
    }
  }, [player, peers, walls, doors, earshotRadius]);

  const handlePlayPeerChirp = useCallback((peer, pan, gain, isOccluded) => {
    spatialAudio.playSpatialChirp(pan, Math.max(0.15, gain), isOccluded);
  }, []);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col p-2.5 md:p-4 selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Top Header */}
      <header className="glass-panel flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20 font-black">
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">ProxiSpeak Virtual Workspace</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <DoorOpen size={11} /> Interactive Doors & Windows
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Click doors to open/close (muffles audio when shut) • Windows stream rain audio • Sit in chairs for meetings
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
              isServerOnline
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm shadow-emerald-500/10'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse'
            }`}
          >
            {isServerOnline ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} className="text-amber-400" />}
            <span className="font-mono text-[11px]">
              {isServerOnline ? 'Live Mesh: Connected' : 'Mesh: Offline (Local Mode)'}
            </span>
          </div>

          {player.isSeated && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-300 font-semibold animate-pulse">
              <Users size={13} />
              <span>In Boardroom Meeting</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl glass-card text-xs">
            <CloudRain size={13} className="text-cyan-400" />
            <span className="text-slate-300 font-mono text-[11px]">
              Rain Ambience: {ambientSoundEnabled ? 'Active' : 'Off'}
            </span>
          </div>

          <button
            onClick={() => setIsSOPModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            <FileCheck2 size={13} />
            <span>SOP Checklist</span>
          </button>
        </div>
      </header>

      {/* Room Jump Bar */}
      <div className="my-2.5">
        <RoomNavigator
          player={player}
          rooms={rooms}
          onTeleportToRoom={handleTeleportToRoom}
        />
      </div>

      {/* Main Workspace (Canvas + Peers Side Matrix) */}
      <main className="flex-1 flex flex-col lg:flex-row gap-3 items-stretch min-h-[500px]">
        {/* Center 2D Map Canvas */}
        <div className="flex-1 flex flex-col min-h-[460px]">
          <SpatialCanvas
            player={player}
            setPlayer={setPlayer}
            peers={peers}
            rooms={rooms}
            walls={walls}
            doors={doors}
            windows={windows}
            plants={plants}
            furniture={furniture}
            earshotRadius={earshotRadius}
            isMicActive={!isMuted}
            micDecibels={micDecibels}
            onToggleDoor={handleToggleDoor}
            onSetDoorOpen={handleSetDoorOpen}
            onToggleWindow={handleToggleWindow}
            onInteractPlant={handleInteractPlant}
            onBrewCoffee={handleBrewCoffee}
            onDrinkWater={handleDrinkWater}
            onToggleWhiteboard={handleToggleWhiteboard}
            onSitChair={handleSitChair}
            onPeerClick={handleTeleportToPeer}
          />
        </div>

        {/* Right Mesh Matrix Panel */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <PeersPanel
            player={player}
            peers={peers}
            walls={walls}
            doors={doors}
            windows={windows}
            furniture={furniture}
            earshotRadius={earshotRadius}
            onTeleportToPeer={handleTeleportToPeer}
            onPlayPeerChirp={handlePlayPeerChirp}
            onToggleDoor={handleToggleDoor}
            onToggleWindow={handleToggleWindow}
            onSitChair={handleSitChair}
          />
        </div>
      </main>

      {/* Floating Audio Control Dock */}
      <footer className="mt-2.5">
        <AudioHUD
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isDeafened={isDeafened}
          setIsDeafened={setIsDeafened}
          earshotPreset={earshotPreset}
          setEarshotPreset={setEarshotPreset}
          ambientSoundEnabled={ambientSoundEnabled}
          setAmbientSoundEnabled={setAmbientSoundEnabled}
          onSitAtTable={handleToggleMeetingTable}
          onBrewCoffee={handleBrewCoffee}
          onResetPositions={handleResetPositions}
          onTestAudioBeep={handleTestAudioBeep}
          micDecibels={micDecibels}
          onOpenSOPModal={() => setIsSOPModalOpen(true)}
          isSeated={player.isSeated}
        />
      </footer>

      {/* Infotact SOP Guidelines & Roadmap Modal */}
      <SOPGuidanceModal
        isOpen={isSOPModalOpen}
        onClose={() => setIsSOPModalOpen(false)}
      />
    </div>
  );
}
export default App;
