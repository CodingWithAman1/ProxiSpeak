# ProxiSpeak — Geospatial Proximity Audio Ecosystem (Branch: Aman)

A virtual space where **proximity is the volume knob**. You see a live 2D map, you move
your avatar, and the moment you walk inside somebody's earshot circle a WebRTC audio
connection opens and crossfades in; walk away and it closes. Walls between you muffle
the voice.

Developed for **Aman** according to **Infotact Solutions Standard Operating Procedures (SOP v1.1)** for Intern Projects.

---

## Architecture & Problem Statement

Voice chat today is flat: everyone in a call is equally loud no matter where they "are", leading to chaotic overlap or muted silence. ProxiSpeak treats conversation as something you *walk into*:
* **Calm Biophilic Office Workspace**: Frosted glass partitions, walnut executive meeting table, indoor monstera/bamboo plants, steaming espresso bar, and panoramic floor-to-ceiling windows.
* **Interactable Windows with Outdoor Sounds**: Click to open/slide windows to hear gentle rain on glass, courtyard breeze, and sweet birdsong.
* **Executive Meeting Suite**: Interactive 6-seat conference table with meeting discussion indicators and presentation whiteboard.
* **Real-Time Spatial Acoustics**: Dynamically computes Euclidean distance, earshot overlap, and wall occlusion.
* **Acoustic Glass Walls**: Attenuate and apply low-pass filtering (450Hz) to simulate sound dampening through office partitions.

---

## Multi-Step Implementation Roadmap

We have broken the project down into structured, verifiable phases:

| Phase | Milestone | Scope & Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Step 1** | **Frontend UI Base & Calm Biophilic Spatial Canvas** | Interactive 2D HTML5 Canvas world, walnut meeting table with chairs, frosted glass walls, interactive windows with outdoor rain/breeze soundscapes, potted plants, barista coffee station, Web Audio API engine. | **Done** |
| **Step 2** | **Backend Foundations & Geo Data Layer** | Express server, MongoDB integration, `2dsphere` spatial indexing for rooms and presence, seed scripts, REST endpoints. | **Next** |
| **Step 3** | **Real-Time Presence & Socket Gateway** | Socket.io server, presence lifecycle, client coordinates broadcast, Redis Pub/Sub adapter. | **Planned** |
| **Step 4** | **WebRTC Voice Mesh & Spatial Audio Engine** | Full mesh peer connections, audio signaling, Web Audio API distance gain curves, low-pass filter for acoustic wall occlusion. | **Planned** |
| **Step 5** | **Client Hardening, Load Testing & SOP Review Demo** | End-to-end integration, multi-user load testing, demo scripts, Infotact SOP submission readiness. | **Planned** |

---

## Tech Stack

* **Frontend**: React 19, HTML5 Canvas API, Web Audio API (`GainNode`, `StereoPannerNode`, `BiquadFilterNode`, `getUserMedia`), Tailwind CSS, Lucide icons, Vite 8.
* **Backend**: Node.js, Express, Socket.io, MongoDB (`2dsphere`, `$near`, `$geoWithin`), Redis Pub/Sub.

---

## Getting Started

### 1. Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Run the UI Base (Client)
From the project root:
```bash
npm run dev
# or
npm run dev:client
```
Visit `http://localhost:5173` in your browser.

### 3. Run the Backend Server
```bash
npm run dev:server
```
The server will start on `http://localhost:4000`. You can verify health at `http://localhost:4000/health`.

---

## Calm Office Features (Step 1)

1. **2D Biophilic Office Canvas**:
   * Executive Glass Boardroom with walnut meeting table & presentation whiteboard.
   * Zen Garden Lounge & Artisan Barista station with steaming coffee.
   * Quiet Acoustic Focus Pods Alpha & Beta.
   * Sunlit Atrium & Open Terrace.
2. **Interactive Panoramic Windows with Outdoor Audio**:
   * Boardroom Rain Window (click to slide open and hear soothing rain on glass).
   * Courtyard Garden Window (gentle breeze and soft birdsong).
   * Web Audio procedural rain/breeze synthesis (zero external audio dependencies).
3. **Potted Biophilic Plants**:
   * Monstera, Fiddle-leaf fig, Bamboo, Bonsai, and Palms with gentle sway animation and leaf rustle sound effects.
4. **Meeting Table & Chair Slots**:
   * Click any chair or "Join Table" to seat your avatar around the conference table.
5. **Dynamic Earshot & Proximity Detection**:
   * Presets: *Whisper* (5m / 80px), *Normal* (10m / 160px), and *Broadcast* (18m / 280px).
   * Real-time connection beams and volume gauges.
   * Acoustic frosted glass low-pass muffling (450Hz).
6. **Infotact SOP Compliance Modal**:
   * SOP v1.1 reference checklist (Mid Review 10-day commit requirement, Final Review 20-day rule, scoring criteria).
