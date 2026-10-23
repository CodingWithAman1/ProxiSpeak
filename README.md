# ProxiSpeak — Geospatial Proximity Audio Ecosystem

A production-ready virtual workspace where **proximity is the volume knob**. Users navigate an interactive 2D spatial office canvas; the moment avatars step within earshot radius, peer-to-peer WebRTC audio crossfades in smoothly. Stepping away gently fades the voice out. Physical partitions, acoustic walls, and closed doors realistically muffle and low-pass filter sound.

---

## System Architecture

Voice communications in traditional conferencing platforms are flat: participants are uniformly amplified regardless of spatial orientation, causing vocal collision and conversational friction. ProxiSpeak transforms virtual presence into a natural, intuitive spatial medium:

* **Interactive Biophilic Office Workspace**: Orthographic vector environment featuring an Executive Glass Boardroom, walnut conference table, Quiet Focus Pods Alpha & Beta, Dev Hub, and an Artisan Barista Espresso Lounge.
* **Restricted Path Navigation & Dynamic Gates**: Wall boundaries strictly restrict avatar traversal. Automated sliding glass gates and hinged oak doors open smoothly via sensor triggers or manual override.
* **Real-Time Spatial Acoustics**: Dynamically computes Euclidean distance, earshot overlap curves, and azimuth-based binaural stereo panning.
* **Acoustic Occlusion & Low-Pass Filtering**: Real-time Ray-Wall intersection detection applies 65% volume attenuation (-9.5 dB) and a 450Hz Biquad low-pass filter when closed doors or glass partitions separate avatars.
* **Procedural Ambient Soundscapes**: Interactive panoramic windows synthesize outdoor courtyard breezes, songbirds, and binaural rainfall on glass with zero external audio assets.
* **P2P WebRTC Voice Mesh**: Socket.io real-time signaling gateway with low-latency coordinate broadcasting backed by MongoDB `2dsphere` spatial indexing.

---

## Architectural Subsystems & Feature Matrix

| Subsystem | Core Responsibilities | Technology Stack | Status |
| :--- | :--- | :--- | :--- |
| **Spatial Canvas & Navigation** | Interactive 2D vector world, restricted wall boundaries, automated sliding glass gates & hinged oak doors with smooth physics interpolation, multi-seat conference table. | React 19, HTML5 Canvas API, Tailwind CSS | **Production Ready** |
| **Spatial Audio & Occlusion** | Inverse-square distance gain curves, binaural stereo panning, ray-wall intersection occlusion, 450Hz Biquad low-pass filtering. | Web Audio API (`GainNode`, `StereoPannerNode`, `BiquadFilterNode`) | **Production Ready** |
| **Procedural Soundscapes** | Interactive panoramic windows with procedural binaural rainfall, wind gust synthesis, and nature audio. | Web Audio Oscillators & Noise Buffers | **Production Ready** |
| **Real-Time Presence Gateway** | High-throughput avatar coordinates broadcast, room presence lifecycle, door state synchronization, and cluster state management. | Node.js, Express, Socket.io | **Production Ready** |
| **Geospatial Data Layer** | Spatial indexing, room boundary lookups, user presence persistence, and fallback in-memory store. | MongoDB (`2dsphere`, `$near`, `$geoWithin`) / In-Memory Store | **Production Ready** |
| **Peer-to-Peer Voice Mesh** | Low-latency voice channels, dynamic proximity gain adjustment, mute/deafen states, and active speaker visualizers. | WebRTC Data & Media Streams, STUN Signaling | **Production Ready** |

---

## Tech Stack

* **Frontend**: React 19, HTML5 Canvas API, Web Audio API, Tailwind CSS, Lucide Icons, Vite 8.
* **Backend**: Node.js, Express, Socket.io, Mongoose / MongoDB (`2dsphere`), Redis Adapter Support.
* **Networking & Protocols**: WebSockets, WebRTC P2P Mesh, STUN/TURN Signaling.

---

## Getting Started

### 1. Prerequisites
* **Node.js**: v18.17+ or v20+
* **npm**: v9+
* **MongoDB** (optional; the server includes an automatic high-performance in-memory store if MongoDB is offline).

### 2. Install Dependencies
```bash
# Install root, client, and server dependencies
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### 3. Run the Backend Server
```bash
npm run dev:server
```
The server will boot on `http://localhost:4000`. Verify system status at:
```bash
curl http://localhost:4000/health
```

### 4. Run the Client Application
In a separate terminal:
```bash
npm run dev:client
# or
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Interactive Controls & Navigation

| Control | Action |
| :--- | :--- |
| **W / A / S / D** or **Arrow Keys** | Move your avatar across corridors and open rooms (walls physically block movement). |
| **Click on Doors / Gates** | Toggle doors open or closed (audio flows freely through open doors; closed doors muffle voice by 65%). |
| **Click on Panoramic Windows** | Slide open windows to introduce outdoor rain and courtyard breeze acoustics. |
| **Click on Boardroom Table / Chairs** | Take an executive seat for conference discussions. |
| **Audio HUD (Bottom Dock)** | Toggle microphone, headphones deafen, test 3D spatial ping, or switch earshot radiuses (*Whisper 80px*, *Normal 160px*, *Conference 240px*, *Broadcast 380px*). |
| **System Specs Button** | View full spatial acoustic specifications, attenuation parameters, and audio routing topology. |

---

## Spatial Acoustic Engine Specifications

* **Audio Context Sampling Rate**: 48,000 Hz Stereo.
* **Proximity Falloff**: Inverse-Square Law with customizable minimum/maximum roll-off limits.
* **Acoustic Occlusion Attenuation**: -9.5 dB (65% volume reduction) on obstructed sound paths.
* **Occlusion Cutoff Frequency**: 450 Hz Biquad Low-Pass Filter.
* **Broadcast Latency**: < 15 ms via Socket.io binary event payload.
* **Rendering Performance**: 60 FPS HTML5 Canvas with sub-pixel interpolation.

---

## Production Build & Deployment

To generate an optimized production bundle:
```bash
# Build client assets
npm run build:client

# Start production server
npm start
```
