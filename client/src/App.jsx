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
} from 'lucide-react';
import SpatialCanvas from './components/SpatialCanvas';
import AudioHUD from './components/AudioHUD';
import PeersPanel from './components/PeersPanel';
import RoomNavigator from './components/RoomNavigator';
import SOPGuidanceModal from './components/SOPGuidanceModal';
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
} from './utils/spatialGeometry';
import spatialAudio from './utils/spatialAudioEngine';

export function App() {
  // Player state starts in Central Hallway
  const [player, setPlayer] = useState({
    x: 480,
    y: 220,
    name: 'You (Host)',
    id: 'local-player',
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

  // Audio & HUD controls
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [earshotPreset, setEarshotPreset] = useState('normal');
  const [ambientSoundEnabled, setAmbientSoundEnabled] = useState(true);
  const [micDecibels, setMicDecibels] = useState(0.2);
  const [isSOPModalOpen, setIsSOPModalOpen] = useState(false);

  const earshotRadius = WORLD_CONFIG.earshotPresets[earshotPreset].radius;

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

  // Door toggle (Open/Close with realistic acoustic latch sound)
  const handleToggleDoor = useCallback((doorId) => {
    setDoors((prev) =>
      prev.map((door) => {
        if (door.id === doorId) {
          const nextOpen = !door.isOpen;
          const pan = calculateStereoPan(player, { x: door.x + door.w / 2, y: door.y + door.h / 2 }, 250);
          spatialAudio.playDoorSound(nextOpen, pan);
          return { ...door, isOpen: nextOpen };
        }
        return door;
      })
    );
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
      setPlayer((prev) => ({ ...prev, x: 772, y: 260, isSeated: false }));
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
    setPlayer({ x: 480, y: 220, name: 'You (Host)', id: 'local-player', isSeated: false });
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
