/**
 * World geometry, interactive doors, windows, furniture, and peers
 * Aligned 1:1 with the modern biophilic architectural layout (1024 x 571)
 */

export const WORLD_CONFIG = {
  width: 1024,
  height: 571,
  defaultEarshotRadius: 150, // pixels (≈ 10 meters)
  earshotPresets: {
    whisper: { label: 'Whisper', radius: 75, desc: 'Quiet conversation / Private pod (5m)' },
    normal: { label: 'Normal', radius: 150, desc: 'Natural boardroom voice (10m)' },
    shout: { label: 'Broadcast', radius: 260, desc: 'Full office announcement (18m)' },
  },
};

export const INITIAL_ROOMS = [
  {
    id: 'boardroom',
    name: 'Executive Boardroom',
    code: 'CONF-101',
    description: 'Executive suite with oval conference table, video display screen & living garden wall',
    x: 577,
    y: 16,
    w: 423,
    h: 189,
    color: '#06b6d4', // Cyan
    floorType: 'teak_parquet',
    doorId: 'door-boardroom',
  },
  {
    id: 'cafeteria',
    name: 'Cafeteria & Lounge',
    code: 'CAFE-102',
    description: 'Espresso coffee bar, dining seating, kitchenette, and indoor greenery',
    x: 577,
    y: 205,
    w: 275,
    h: 347,
    color: '#10b981', // Emerald
    floorType: 'hex_bistro',
    doorId: null, // Open lounge entrance
  },
  {
    id: 'devhub',
    name: 'Developer Hub',
    code: 'DEV-HUB',
    description: 'Open engineering floor with multi-monitor workstations and planter dividers',
    x: 18,
    y: 16,
    w: 418,
    h: 536,
    color: '#38bdf8', // Sky
    floorType: 'tech_carpet',
    doorId: 'door-devhub',
  },
  {
    id: 'corridor',
    name: 'Central Corridor & Atrium',
    code: 'ATRIUM',
    description: 'Slate tiled spine with motion-sensing glass sliding gates and lush planter boxes',
    x: 436,
    y: 16,
    w: 141,
    h: 349,
    color: '#818cf8', // Indigo
    floorType: 'basalt_slate',
    doorId: 'door-center-glass',
  },
  {
    id: 'reception',
    name: 'Welcome Lobby & Reception',
    code: 'LOBBY',
    description: 'Modern reception counter, logo wall, waiting armchairs, and South entrance',
    x: 410,
    y: 365,
    w: 167,
    h: 187,
    color: '#f59e0b', // Amber
    floorType: 'travertine_marble',
    doorId: 'door-south-entrance',
  },
  {
    id: 'focus_booths',
    name: 'Focus Pods & Research',
    code: 'PODS',
    description: 'Private quiet booths for deep concentration, coding, and private calls',
    x: 852,
    y: 205,
    w: 148,
    h: 235,
    color: '#a855f7', // Purple
    floorType: 'acoustic_felt',
    doorId: 'door-focus-1',
  },
  {
    id: 'restrooms',
    name: 'Restrooms',
    code: 'RESTROOMS',
    description: 'Executive washrooms with vanity sink and ceramic tiling',
    x: 852,
    y: 440,
    w: 148,
    h: 112,
    color: '#ec4899', // Rose
    floorType: 'subway_tile',
    doorId: 'door-restroom',
  },
];

// Interactive Doors & Gates with Smooth Opening / Closing Background Animations
export const INITIAL_DOORS = [
  {
    id: 'door-top-entrance',
    name: 'North Glass Entrance',
    roomId: 'corridor',
    x: 468,
    y: 8,
    w: 76,
    h: 16,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'glass_double', // Automatic sliding glass gate
    orientation: 'horizontal',
    autoSensor: true,
    label: 'North Entrance',
  },
  {
    id: 'door-center-glass',
    name: 'Atrium Glass Doors',
    roomId: 'corridor',
    x: 444,
    y: 194,
    w: 124,
    h: 18,
    isOpen: true,
    openProgress: 1,
    targetOpen: 1,
    type: 'glass_double', // Automatic sliding glass gate
    orientation: 'horizontal',
    autoSensor: true,
    label: 'Atrium Glass Doors',
  },
  {
    id: 'door-south-entrance',
    name: 'South Main Entrance',
    roomId: 'reception',
    x: 472,
    y: 544,
    w: 72,
    h: 16,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'glass_double',
    orientation: 'horizontal',
    autoSensor: true,
    label: 'South Entrance',
  },
  {
    id: 'door-boardroom',
    name: 'Boardroom Door',
    roomId: 'boardroom',
    x: 585,
    y: 198,
    w: 40,
    h: 14,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'wood_single',
    orientation: 'horizontal',
    hinge: 'left',
    label: 'Boardroom Door',
  },
  {
    id: 'door-devhub',
    name: 'Developer Hub Door',
    roomId: 'devhub',
    x: 430,
    y: 168,
    w: 14,
    h: 36,
    isOpen: true,
    openProgress: 1,
    targetOpen: 1,
    type: 'wood_single',
    orientation: 'vertical',
    hinge: 'top',
    label: 'Dev Hub Door',
  },
  {
    id: 'door-focus-1',
    name: 'Focus Pod 1 Door',
    roomId: 'focus_booths',
    x: 846,
    y: 228,
    w: 14,
    h: 36,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'wood_single',
    orientation: 'vertical',
    hinge: 'top',
    label: 'Focus Pod 1',
  },
  {
    id: 'door-focus-2',
    name: 'Focus Pod 2 Door',
    roomId: 'focus_booths',
    x: 846,
    y: 334,
    w: 14,
    h: 36,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'wood_single',
    orientation: 'vertical',
    hinge: 'top',
    label: 'Focus Pod 2',
  },
  {
    id: 'door-restroom',
    name: 'Restroom Door',
    roomId: 'restrooms',
    x: 880,
    y: 433,
    w: 36,
    h: 14,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'wood_single',
    orientation: 'horizontal',
    hinge: 'left',
    label: 'Restroom Door',
  },
];

// Interactive Architectural Multi-Pane Windows (Facing outside nature / forest / skyline; toggles rain and birdsong)
export const INITIAL_WINDOWS = [
  {
    id: 'win-dev-north',
    name: 'Dev Hub Panoramic Windows',
    roomId: 'devhub',
    x: 45,
    y: 8,
    w: 350,
    h: 16,
    orientation: 'horizontal',
    panes: 6,
    isOpen: false,
    soundType: 'gentle_rain',
    soundLabel: 'Pine Forest Rain',
  },
  {
    id: 'win-dev-west',
    name: 'West Redwood Garden Windows',
    roomId: 'devhub',
    x: 10,
    y: 100,
    w: 16,
    h: 350,
    orientation: 'vertical',
    panes: 6,
    isOpen: false,
    soundType: 'gentle_rain',
    soundLabel: 'West Redwood Wind & Rain',
  },
  {
    id: 'win-dev-south',
    name: 'Dev Hub Courtyard Windows',
    roomId: 'devhub',
    x: 55,
    y: 544,
    w: 320,
    h: 16,
    orientation: 'horizontal',
    panes: 5,
    isOpen: false,
    soundType: 'courtyard_breeze',
    soundLabel: 'South Courtyard Breeze',
  },
  {
    id: 'win-boardroom-north',
    name: 'Boardroom Panoramic Forest Windows',
    roomId: 'boardroom',
    x: 615,
    y: 8,
    w: 345,
    h: 16,
    orientation: 'horizontal',
    panes: 6,
    isOpen: true,
    soundType: 'courtyard_breeze',
    soundLabel: 'Courtyard Breeze & Birds',
  },
  {
    id: 'win-boardroom-east',
    name: 'Boardroom Skyline Window',
    roomId: 'boardroom',
    x: 992,
    y: 45,
    w: 16,
    h: 135,
    orientation: 'vertical',
    panes: 3,
    isOpen: false,
    soundType: 'courtyard_breeze',
    soundLabel: 'Skyline Morning Breeze',
  },
  {
    id: 'win-pod-east',
    name: 'Focus Pods Acoustic Zen Garden Window',
    roomId: 'focus_booths',
    x: 992,
    y: 230,
    w: 16,
    h: 180,
    orientation: 'vertical',
    panes: 3,
    isOpen: false,
    soundType: 'gentle_rain',
    soundLabel: 'Zen Garden Rain',
  },
];

// Interactive Biophilic Plants (Click to rustle leaves and emit audio)
export const INITIAL_PLANTS = [
  { id: 'p1', name: 'Dev Hub Corner Ficus', x: 40, y: 55, radius: 22 },
  { id: 'p2', name: 'Dev Hub South Palm', x: 35, y: 530, radius: 20 },
  { id: 'p3', name: 'Dev Hub Corridor Monstera', x: 395, y: 70, radius: 24 },
  { id: 'p4', name: 'Reception Left Palm', x: 382, y: 520, radius: 18 },
  { id: 'p5', name: 'Reception Right Ficus', x: 565, y: 520, radius: 18 },
  { id: 'p6', name: 'Cafeteria Coffee Bar Greenery', x: 615, y: 235, radius: 20 },
  { id: 'p7', name: 'Cafeteria Dining Planter Hedge', x: 760, y: 440, radius: 22 },
  { id: 'p8', name: 'Boardroom Vertical Living Wall', x: 968, y: 115, radius: 26 },
  { id: 'p9', name: 'Restroom Entry Plant', x: 940, y: 435, radius: 20 },
];

// Interactive Furniture & Appliances (1:1 aligned with the modern floorplan)
export const OFFICE_FURNITURE = {
  conferenceTable: {
    id: 'conf-table',
    name: 'Executive Oval Conference Table',
    x: 760,
    y: 118,
    w: 230,
    h: 64,
    chairs: [
      { id: 'seat-1', x: 676, y: 86, label: 'Seat 1', occupant: 'Alex Rivera' },
      { id: 'seat-2', x: 718, y: 86, label: 'Seat 2', occupant: 'Maya Chen' },
      { id: 'seat-3', x: 760, y: 86, label: 'Seat 3', occupant: null },
      { id: 'seat-4', x: 802, y: 86, label: 'Seat 4', occupant: null },
      { id: 'seat-5', x: 844, y: 86, label: 'Seat 5', occupant: null },
      { id: 'seat-6', x: 676, y: 152, label: 'Seat 6', occupant: null },
      { id: 'seat-7', x: 718, y: 152, label: 'Seat 7', occupant: null },
      { id: 'seat-8', x: 760, y: 152, label: 'Seat 8', occupant: null },
      { id: 'seat-9', x: 802, y: 152, label: 'Seat 9', occupant: null },
      { id: 'seat-10', x: 844, y: 152, label: 'Seat 10', occupant: null },
      { id: 'seat-head', x: 642, y: 118, label: 'Head of Table', occupant: null },
      { id: 'seat-foot', x: 882, y: 118, label: 'Foot of Table', occupant: null },
    ],
  },
  whiteboard: {
    id: 'whiteboard',
    name: 'Boardroom 4K Presentation Display',
    x: 718,
    y: 22,
    w: 86,
    h: 36,
    slideIndex: 0,
    slides: [
      'Sprint Agenda: Real-Time Spatial Voice Mesh',
      'Architecture: WebRTC P2P + Proximity Gain',
      'Acoustics: Low-Pass 450Hz Occlusion Through Closed Doors',
      'Biophilic Workspace: High-Res Vector Mapping & Path Physics',
      'Production System: Verified Enterprise Architecture',
    ],
  },
  coffeeMachine: {
    id: 'coffee-machine',
    name: 'Barista Espresso Bar',
    x: 720,
    y: 270,
    steamOffset: { x: 0, y: -12 },
  },
  waterCoolers: [
    { id: 'cooler-1', name: 'Cafeteria Water Station', x: 605, y: 350, radius: 12 },
    { id: 'cooler-2', name: 'Dev Hub Water Station', x: 422, y: 130, radius: 12 },
  ],
};

// Acoustic Walls for sound occlusion calculations & physical collision boundaries
// Aligned 1:1 with the modern biophilic architectural layout
export const INITIAL_WALLS = [
  // 1. Exterior Perimeter Structural Walls (Solid 12px structural boundaries)
  { id: 'w-top-1', start: { x: 18, y: 16 }, end: { x: 468, y: 16 }, type: 'exterior', label: 'North Perimeter 1' },
  { id: 'w-top-2', start: { x: 544, y: 16 }, end: { x: 1000, y: 16 }, type: 'exterior', label: 'North Perimeter 2' },
  { id: 'w-right', start: { x: 1000, y: 16 }, end: { x: 1000, y: 552 }, type: 'exterior', label: 'East Perimeter' },
  { id: 'w-bot-2', start: { x: 544, y: 552 }, end: { x: 1000, y: 552 }, type: 'exterior', label: 'South Perimeter 2' },
  { id: 'w-bot-1', start: { x: 18, y: 552 }, end: { x: 472, y: 552 }, type: 'exterior', label: 'South Perimeter 1' },
  { id: 'w-left', start: { x: 18, y: 16 }, end: { x: 18, y: 552 }, type: 'exterior', label: 'West Perimeter' },

  // 2. Dev Hub East Dividing Partition
  { id: 'w-dev-e1', start: { x: 436, y: 16 }, end: { x: 436, y: 168 }, type: 'interior', label: 'Dev Hub North-East Wall' },
  // Doorway gap at y: 168 to 204 (door-devhub)
  { id: 'w-dev-e2', start: { x: 436, y: 204 }, end: { x: 436, y: 365 }, type: 'interior', label: 'Dev Hub Mid-East Wall' },
  { id: 'w-dev-e-corner', start: { x: 410, y: 365 }, end: { x: 436, y: 365 }, type: 'interior', label: 'Dev Hub Corner Transition' },
  { id: 'w-dev-e3', start: { x: 410, y: 365 }, end: { x: 410, y: 552 }, type: 'interior', label: 'Dev Hub South-East Wall' },

  // 3. Central Corridor East Dividing Partition
  { id: 'w-corr-e1', start: { x: 577, y: 16 }, end: { x: 577, y: 205 }, type: 'interior', label: 'Corridor to Boardroom Wall' },
  { id: 'w-corr-e2', start: { x: 577, y: 205 }, end: { x: 577, y: 245 }, type: 'interior', label: 'Corridor to Cafeteria Wall 1' },
  // Open lounge archway at y: 245 to 335
  { id: 'w-corr-e3', start: { x: 577, y: 335 }, end: { x: 577, y: 552 }, type: 'interior', label: 'Lobby to Cafeteria Wall' },

  // 4. Boardroom South Acoustic Glazed Partition
  { id: 'w-br-s1', start: { x: 577, y: 205 }, end: { x: 585, y: 205 }, type: 'interior', label: 'Boardroom Door Left Jamb' },
  // Door gap at x: 585 to 625 (door-boardroom)
  { id: 'w-br-s2', start: { x: 625, y: 205 }, end: { x: 1000, y: 205 }, type: 'glass_partition', label: 'Boardroom Frosted Glass Wall' },

  // 5. Reception North Wall (separates corridor from lobby)
  { id: 'w-rec-n1', start: { x: 410, y: 365 }, end: { x: 468, y: 365 }, type: 'interior', label: 'Reception North Wall 1' },
  // Open atrium walkway from x: 468 to 544
  { id: 'w-rec-n2', start: { x: 544, y: 365 }, end: { x: 577, y: 365 }, type: 'interior', label: 'Reception North Wall 2' },

  // 6. Focus Pods West Wall & Divider
  { id: 'w-pod-w1', start: { x: 852, y: 205 }, end: { x: 852, y: 228 }, type: 'interior', label: 'Focus Pod 1 Wall Top' },
  // Door gap 1 at y: 228 to 264 (door-focus-1)
  { id: 'w-pod-w2', start: { x: 852, y: 264 }, end: { x: 852, y: 334 }, type: 'interior', label: 'Focus Pod 1-2 Mid Wall' },
  // Door gap 2 at y: 334 to 370 (door-focus-2)
  { id: 'w-pod-w3', start: { x: 852, y: 370 }, end: { x: 852, y: 440 }, type: 'interior', label: 'Focus Pod 2 Wall Bottom' },
  { id: 'w-pod-div', start: { x: 852, y: 320 }, end: { x: 1000, y: 320 }, type: 'interior', label: 'Focus Pod Acoustic Divider' },

  // 7. Restroom North Partition
  { id: 'w-rest-n1', start: { x: 852, y: 440 }, end: { x: 880, y: 440 }, type: 'interior', label: 'Restroom North Wall 1' },
  // Door gap at x: 880 to 916 (door-restroom)
  { id: 'w-rest-n2', start: { x: 916, y: 440 }, end: { x: 1000, y: 440 }, type: 'interior', label: 'Restroom North Wall 2' },

  // 8. Boardroom Table Solid Collision Core (cannot walk onto the center table slab)
  { id: 'obs-tbl-t', start: { x: 660, y: 105 }, end: { x: 860, y: 105 }, type: 'furniture_obstacle', label: 'Boardroom Table Top' },
  { id: 'obs-tbl-b', start: { x: 660, y: 131 }, end: { x: 860, y: 131 }, type: 'furniture_obstacle', label: 'Boardroom Table Bottom' },
  { id: 'obs-tbl-l', start: { x: 660, y: 105 }, end: { x: 660, y: 131 }, type: 'furniture_obstacle', label: 'Boardroom Table Left' },
  { id: 'obs-tbl-r', start: { x: 860, y: 105 }, end: { x: 860, y: 131 }, type: 'furniture_obstacle', label: 'Boardroom Table Right' },

  // 9. Workstation Pod Core Obstacles
  { id: 'obs-desk-1', start: { x: 50, y: 115 }, end: { x: 350, y: 115 }, type: 'furniture_obstacle', label: 'Dev Workstations Row 1' },
  { id: 'obs-desk-2', start: { x: 50, y: 275 }, end: { x: 350, y: 275 }, type: 'furniture_obstacle', label: 'Dev Workstations Row 2' },
  { id: 'obs-desk-3', start: { x: 50, y: 435 }, end: { x: 350, y: 435 }, type: 'furniture_obstacle', label: 'Dev Workstations Row 3' },

  // 10. Coffee Bar Counter Core
  { id: 'obs-bar-1', start: { x: 655, y: 275 }, end: { x: 800, y: 275 }, type: 'furniture_obstacle', label: 'Coffee Bar Counter' },
];

export const INITIAL_PEERS = [
  {
    id: 'peer-alex',
    name: 'Alex Rivera',
    handle: '@alex.lead',
    role: 'Team Lead',
    statusTag: 'In Meeting 👥',
    x: 676,
    y: 86, // Seated at Boardroom Table Seat 1
    color: '#06b6d4',
    earshotRadius: 150,
    isMuted: false,
    isSpeaking: true,
    speechCycle: 0,
    isSeated: true,
    wanderTarget: { x: 676, y: 86 },
  },
  {
    id: 'peer-maya',
    name: 'Maya Chen',
    handle: '@maya.design',
    role: 'Product Designer',
    statusTag: 'Reviewing UI 🎨',
    x: 718,
    y: 86, // Seated at Boardroom Table Seat 2
    color: '#ec4899',
    earshotRadius: 150,
    isMuted: false,
    isSpeaking: false,
    speechCycle: 2,
    isSeated: true,
    wanderTarget: { x: 718, y: 86 },
  },
  {
    id: 'peer-rohan',
    name: 'Rohan Sharma',
    handle: '@rohan.backend',
    role: 'Distributed Systems',
    statusTag: 'Coding Terminals 💻',
    x: 180,
    y: 195, // At Dev Hub Workstations
    color: '#f59e0b',
    earshotRadius: 130,
    isMuted: false,
    isSpeaking: false,
    speechCycle: 4,
    isSeated: false,
    wanderTarget: { x: 180, y: 195 },
  },
  {
    id: 'peer-elena',
    name: 'Elena Rostova',
    handle: '@elena.ai',
    role: 'AI Researcher',
    statusTag: 'Espresso Break ☕',
    x: 680,
    y: 330, // At Cafeteria Lounge
    color: '#10b981',
    earshotRadius: 140,
    isMuted: false,
    isSpeaking: false,
    speechCycle: 1,
    isSeated: false,
    wanderTarget: { x: 680, y: 330 },
  },
];
