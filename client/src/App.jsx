import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Radio,
  Sparkles,
  CloudRain,
  Coffee,
  Users,
  FileCheck2,
  TreePine,
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
  // Player state (starts at Executive Boardroom entrance)
  const [player, setPlayer] = useState({
    x: 420,
    y: 350,
    name: 'You (Host)',
    id: 'local-player',
    isSeated: false,
  });

  // World entities
  const [rooms] = useState(INITIAL_ROOMS);
  const [walls] = useState(INITIAL_WALLS);
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

  // Continuously update window outdoor ambience based on player proximity to open windows
  useEffect(() => {
    const interval = setInterval(() => {
      if (ambientSoundEnabled) {
        spatialAudio.updateWindowAmbience(player, windows);

        // Random subtle birdsong if garden courtyard window is open and player is nearby
        const gardenWin = windows.find((w) => w.id === 'win-lounge');
        if (gardenWin && gardenWin.isOpen && Math.random() < 0.1) {
          const dist = Math.hypot(player.x - (gardenWin.x + gardenWin.w / 2), player.y - gardenWin.y);
          if (dist < 320) {
            const pan = calculateStereoPan(player, { x: gardenWin.x + gardenWin.w / 2, y: gardenWin.y }, 300);
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

  // Subtle natural peer movements (focusing at desks, occasionally speaking)
  useEffect(() => {
    const interval = setInterval(() => {
      setPeers((prevPeers) =>
        prevPeers.map((peer) => {
          // If seated in meeting, stay at chair
          if (peer.isSeated) {
            const nextCycle = (peer.speechCycle + 0.04) % 10;
            const isSpeakingNow = Math.sin(nextCycle) > 0.35 && !peer.isMuted;
            return { ...peer, speechCycle: nextCycle, isSpeaking: isSpeakingNow };
          }

          let tx = peer.wanderTarget.x;
          let ty = peer.wanderTarget.y;

          if (Math.hypot(tx - peer.x, ty - peer.y) < 12) {
            if (peer.id === 'peer-rohan') {
              // Stays inside Quiet Pod Alpha
              tx = 100 + Math.random() * 120;
              ty = 520 + Math.random() * 120;
            } else {
              // Elena around lounge coffee area
              tx = 860 + Math.random() * 180;
              ty = 160 + Math.random() * 160;
            }
          }

          const dx = tx - peer.x;
          const dy = ty - peer.y;
          const dist = Math.hypot(dx, dy);
          const step = Math.min(dist, 0.9);
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
    spatialAudio.playEspressoBrew(0.6);
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
      // Stand up and step away from table
      setPlayer((prev) => ({ ...prev, x: 290, y: 360, isSeated: false }));
    } else {
      // Find open chair at conference table
      const table = furniture.conferenceTable;
      const openChair = table.chairs.find((c) => c.occupant === null) || table.chairs[2];
      handleSitChair(openChair);
    }
  }, [player.isSeated, furniture, handleSitChair]);

  // Teleport to room
  const handleTeleportToRoom = useCallback((room) => {
    const targetX = room.x + room.w / 2;
    const targetY = room.y + room.h / 2;
    setPlayer((prev) => ({ ...prev, x: targetX, y: targetY, isSeated: false }));
  }, []);

  // Teleport near peer
  const handleTeleportToPeer = useCallback((peer) => {
    setPlayer((prev) => ({
      ...prev,
      x: Math.max(40, peer.x - 45),
      y: Math.max(40, peer.y),
      isSeated: false,
    }));
  }, []);

  // Reset positions
  const handleResetPositions = useCallback(() => {
    setPlayer({ x: 420, y: 350, name: 'You (Host)', id: 'local-player', isSeated: false });
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
      const isOccluded = checkWallOcclusion(player, closestPeer, walls);
      const gain = calculateProximityGain(minDistance, earshotRadius, isOccluded);
      const pan = calculateStereoPan(player, closestPeer, earshotRadius);
      spatialAudio.playSpatialChirp(pan, Math.max(0.2, gain), isOccluded);
    } else {
      spatialAudio.playSpatialChirp(0, 0.5, false);
    }
  }, [player, peers, walls, earshotRadius]);

  const handlePlayPeerChirp = useCallback((peer, pan, gain, isOccluded) => {
    spatialAudio.playSpatialChirp(pan, Math.max(0.15, gain), isOccluded);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-3 md:p-5 selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20 font-black">
            <Radio size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">ProxiSpeak</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <TreePine size={12} /> Biophilic Calm Office
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Frosted glass suites, outdoor panoramic windows, botanical planters & spatial audio
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {player.isSeated && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-300 font-semibold animate-pulse">
              <Users size={14} />
              <span>In Executive Meeting</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <CloudRain size={13} className="text-cyan-400" />
            <span className="text-slate-300 font-mono">
              Rain Ambience: {ambientSoundEnabled ? 'Active' : 'Off'}
            </span>
          </div>

          <button
            onClick={() => setIsSOPModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/25 cursor-pointer"
          >
            <FileCheck2 size={15} />
            <span>SOP & Steps</span>
          </button>
        </div>
      </header>

      {/* Room Jump Bar */}
      <div className="my-3">
        <RoomNavigator
          player={player}
          rooms={rooms}
          onTeleportToRoom={handleTeleportToRoom}
        />
      </div>

      {/* Main Workspace (Canvas + Peers Side Matrix) */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 items-stretch min-h-[580px]">
        {/* Center 2D Map Canvas */}
        <div className="flex-1 flex flex-col min-h-[500px]">
          <SpatialCanvas
            player={player}
            setPlayer={setPlayer}
            peers={peers}
            rooms={rooms}
            walls={walls}
            windows={windows}
            plants={plants}
            furniture={furniture}
            earshotRadius={earshotRadius}
            isMicActive={!isMuted}
            micDecibels={micDecibels}
            onToggleWindow={handleToggleWindow}
            onInteractPlant={handleInteractPlant}
            onBrewCoffee={handleBrewCoffee}
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
            windows={windows}
            furniture={furniture}
            earshotRadius={earshotRadius}
            onTeleportToPeer={handleTeleportToPeer}
            onPlayPeerChirp={handlePlayPeerChirp}
            onToggleWindow={handleToggleWindow}
            onSitChair={handleSitChair}
          />
        </div>
      </main>

      {/* Floating Audio Control Dock */}
      <footer className="mt-3">
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
