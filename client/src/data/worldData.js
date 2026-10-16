/**
 * World geometry, interactive doors, windows, furniture, and peers
 * Aligned 1:1 with the stylized office architectural layout (1024 x 571)
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
    description: 'Conference room with 9-seat walnut table, presentation screen & forest windows',
    x: 742,
    y: 15,
    w: 256,
    h: 235,
    color: '#06b6d4', // Cyan
    doorId: 'door-boardroom',
  },
  {
    id: 'breakroom',
    name: 'Cafeteria & Lounge',
    code: 'CAFE-102',
    description: 'Checkerboard lounge with vending, microwave, coffee station & sofas',
    x: 558,
    y: 15,
    w: 184,
    h: 235,
    color: '#10b981', // Emerald
    doorId: 'door-breakroom',
  },
  {
    id: 'devhub_top',
    name: 'Engineering Hub (North)',
    code: 'ENG-NORTH',
    description: 'Workstations with dual monitors, code terminals & ergonomic task chairs',
    x: 15,
    y: 15,
    w: 260,
    h: 265,
    color: '#38bdf8', // Sky
    doorId: null, // Open plan
  },
  {
    id: 'devhub_bottom',
    name: 'Design & Engineering (South)',
    code: 'ENG-SOUTH',
    description: 'Open collaborative space with modular desks and monstera plants',
    x: 15,
    y: 285,
    w: 285,
    h: 270,
    color: '#818cf8', // Indigo
    doorId: null,
  },
  {
    id: 'reception',
    name: 'Welcome Lobby & Reception',
    code: 'LOBBY-01',
    description: 'Central greeting desk, waiting armchairs, and colorful area rug',
    x: 300,
    y: 285,
    w: 258,
    h: 270,
    color: '#f59e0b', // Amber
    doorId: null,
  },
  {
    id: 'manager_office',
    name: 'Lead Director Office',
    code: 'OFFICE-201',
    description: 'Executive office with desk, computer, bookshelf & guest seating',
    x: 808,
    y: 245,
    w: 190,
    h: 150,
    color: '#ec4899', // Rose
    doorId: 'door-manager',
  },
  {
    id: 'private_office',
    name: 'Focus Pod & Research',
    code: 'OFFICE-202',
    description: 'Quiet concentration booth with desk and ficus bonsai',
    x: 830,
    y: 415,
    w: 168,
    h: 135,
    color: '#a855f7', // Purple
    doorId: 'door-private',
  },
];

// Interactive Doors & Gates with Smooth Opening / Closing Background Animations
export const INITIAL_DOORS = [
  {
    id: 'door-boardroom',
    name: 'Boardroom Door',
    roomId: 'boardroom',
    x: 772,
    y: 232,
    w: 34,
    h: 20,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'wood_single',
    orientation: 'horizontal',
    hinge: 'left', // swings inward to the left
    label: 'Boardroom Door',
  },
  {
    id: 'door-breakroom',
    name: 'Cafeteria Door',
    roomId: 'breakroom',
    x: 620,
    y: 232,
    w: 34,
    h: 20,
    isOpen: true,
    openProgress: 1,
    targetOpen: 1,
    type: 'wood_single',
    orientation: 'horizontal',
    hinge: 'left',
    label: 'Cafeteria Door',
  },
  {
    id: 'door-top-entrance',
    name: 'North Glass Entrance',
    roomId: 'hallway',
    x: 474,
    y: 48,
    w: 58,
    h: 36,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'glass_double', // sliding automatic glass gate
    orientation: 'horizontal',
    autoSensor: true,
    label: 'North Entrance',
  },
  {
    id: 'door-center-glass',
    name: 'Atrium Glass Doors',
    roomId: 'hallway',
    x: 472,
    y: 270,
    w: 60,
    h: 32,
    isOpen: true,
    openProgress: 1,
    targetOpen: 1,
    type: 'glass_double', // sliding automatic glass gate
    orientation: 'horizontal',
    autoSensor: true,
    label: 'Atrium Glass Doors',
  },
  {
    id: 'door-bottom-entrance',
    name: 'South Glass Entrance',
    roomId: 'hallway',
    x: 472,
    y: 524,
    w: 60,
    h: 36,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'glass_double',
    orientation: 'horizontal',
    autoSensor: true,
    label: 'South Entrance',
  },
  {
    id: 'door-manager',
    name: 'Director Office Door',
    roomId: 'manager_office',
    x: 800,
    y: 275,
    w: 16,
    h: 28,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'wood_single',
    orientation: 'vertical',
    hinge: 'top',
    label: 'Director Office Door',
  },
  {
    id: 'door-restroom',
    name: 'Restroom Door',
    roomId: 'restroom',
    x: 778,
    y: 408,
    w: 26,
    h: 20,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'wood_single',
    orientation: 'horizontal',
    hinge: 'left',
    label: 'Restroom Door',
  },
  {
    id: 'door-private',
    name: 'Focus Pod Door',
    roomId: 'private_office',
    x: 875,
    y: 408,
    w: 28,
    h: 20,
    isOpen: false,
    openProgress: 0,
    targetOpen: 0,
    type: 'wood_single',
    orientation: 'horizontal',
    hinge: 'left',
    label: 'Focus Pod Door',
  },
];

// Interactive Windows (Facing outside nature / forest; toggles rain and birdsong)
export const INITIAL_WINDOWS = [
  {
    id: 'win-dev-north',
    name: 'Dev Hub Panoramic Windows',
    roomId: 'devhub_top',
    x: 25,
    y: 12,
    w: 240,
    h: 22,
    isOpen: false,
    soundType: 'gentle_rain',
    soundLabel: 'Gentle Rain on Forest',
  },
  {
    id: 'win-boardroom-north',
    name: 'Boardroom Panoramic Window',
    roomId: 'boardroom',
    x: 745,
    y: 12,
    w: 240,
    h: 22,
    isOpen: true,
    soundType: 'courtyard_breeze',
    soundLabel: 'Courtyard Breeze & Birds',
  },
  {
    id: 'win-breakroom',
    name: 'Cafeteria Window',
    roomId: 'breakroom',
    x: 605,
    y: 12,
    w: 80,
    h: 22,
    isOpen: false,
    soundType: 'courtyard_breeze',
    soundLabel: 'Courtyard Breeze',
  },
  {
    id: 'win-dev-west',
    name: 'West Garden Window Bank',
    roomId: 'devhub_bottom',
    x: 10,
    y: 180,
    w: 18,
    h: 200,
    isOpen: false,
    soundType: 'gentle_rain',
    soundLabel: 'Forest Wind & Rain',
  },
];

// Interactive Biophilic Plants (Click to rustle leaves and emit audio)
export const INITIAL_PLANTS = [
  { id: 'p1', name: 'Central Ficus Tree', x: 538, y: 215, radius: 24 },
  { id: 'p2', name: 'Cafeteria Birch', x: 708, y: 215, radius: 24 },
  { id: 'p3', name: 'Boardroom Palm Left', x: 750, y: 65, radius: 18 },
  { id: 'p4', name: 'Boardroom Palm Right', x: 948, y: 65, radius: 18 },
  { id: 'p5', name: 'Hallway Monstera', x: 318, y: 225, radius: 20 },
  { id: 'p6', name: 'Dev Hub Monstera', x: 45, y: 230, radius: 22 },
  { id: 'p7', name: 'Dev Hub Fig', x: 52, y: 95, radius: 18 },
  { id: 'p8', name: 'Reception Fern', x: 328, y: 360, radius: 20 },
];

// Interactive Furniture & Appliances
export const OFFICE_FURNITURE = {
  conferenceTable: {
    id: 'conf-table',
    name: 'Walnut Boardroom Table',
    x: 852,
    y: 155,
    w: 130,
    h: 60,
    chairs: [
      { id: 'seat-1', x: 800, y: 125, label: 'Seat 1', occupant: 'Alex Rivera' },
      { id: 'seat-2', x: 835, y: 125, label: 'Seat 2', occupant: 'Maya Chen' },
      { id: 'seat-3', x: 870, y: 125, label: 'Seat 3', occupant: null },
      { id: 'seat-4', x: 905, y: 125, label: 'Seat 4', occupant: null },
      { id: 'seat-5', x: 818, y: 185, label: 'Seat 5', occupant: null },
      { id: 'seat-6', x: 852, y: 185, label: 'Seat 6', occupant: null },
      { id: 'seat-7', x: 888, y: 185, label: 'Seat 7', occupant: null },
      { id: 'seat-8', x: 780, y: 155, label: 'Head of Table', occupant: null },
      { id: 'seat-9', x: 922, y: 155, label: 'Foot of Table', occupant: null },
    ],
  },
  whiteboard: {
    id: 'whiteboard',
    name: 'Presentation Whiteboard',
    x: 852,
    y: 55,
    w: 90,
    h: 40,
    slideIndex: 0,
    slides: [
      'Sprint Agenda: Real-Time Spatial Voice Mesh',
      'Architecture: WebRTC P2P + Proximity Gain',
      'Acoustics: Low-Pass 450Hz Occlusion Through Closed Doors',
      'Infotact SOP Compliance: 10/20 Day Commit Rules',
    ],
  },
  coffeeMachine: {
    id: 'coffee-machine',
    name: 'Espresso Barista Station',
    x: 670,
    y: 72,
    w: 30,
    h: 30,
  },
  waterCoolers: [
    { id: 'water-hallway', name: 'Central Hallway Cooler', x: 368, y: 220, radius: 15 },
    { id: 'water-reception', name: 'Reception Cooler', x: 318, y: 510, radius: 15 },
    { id: 'water-director', name: 'Executive Cooler', x: 852, y: 340, radius: 15 },
  ],
  vendingMachine: {
    id: 'vending-machine',
    name: 'Snack Vending Machine',
    x: 585,
    y: 75,
    w: 30,
    h: 36,
  },
};

// Acoustic Walls for sound occlusion calculations & physical collision boundaries
// Avatars CANNOT walk through these walls!
export const INITIAL_WALLS = [
  // 1. Exterior Boundary Walls (keeps avatar inside the office map)
  { id: 'w-top-1', start: { x: 18, y: 24 }, end: { x: 474, y: 24 }, label: 'North Boundary 1' },
  { id: 'w-top-2', start: { x: 532, y: 24 }, end: { x: 994, y: 24 }, label: 'North Boundary 2' },
  { id: 'w-bot-1', start: { x: 18, y: 546 }, end: { x: 472, y: 546 }, label: 'South Boundary 1' },
  { id: 'w-bot-2', start: { x: 532, y: 546 }, end: { x: 994, y: 546 }, label: 'South Boundary 2' },
  { id: 'w-left', start: { x: 18, y: 24 }, end: { x: 18, y: 546 }, label: 'West Boundary' },
  { id: 'w-right', start: { x: 994, y: 24 }, end: { x: 994, y: 546 }, label: 'East Boundary' },

  // 2. Executive Boardroom Walls (room in top right)
  { id: 'w-br-w', start: { x: 742, y: 24 }, end: { x: 742, y: 242 }, label: 'Boardroom West Wall' },
  { id: 'w-br-s1', start: { x: 742, y: 242 }, end: { x: 772, y: 242 }, label: 'Boardroom South Wall 1' },
  // Door gap is at x: 772 to 806
  { id: 'w-br-s2', start: { x: 806, y: 242 }, end: { x: 994, y: 242 }, label: 'Boardroom South Wall 2' },

  // 3. Cafeteria & Lounge Walls (top middle-right)
  { id: 'w-cafe-w', start: { x: 558, y: 24 }, end: { x: 558, y: 242 }, label: 'Cafeteria West Wall' },
  { id: 'w-cafe-s1', start: { x: 558, y: 242 }, end: { x: 620, y: 242 }, label: 'Cafeteria South Wall 1' },
  // Door gap is at x: 620 to 654
  { id: 'w-cafe-s2', start: { x: 654, y: 242 }, end: { x: 742, y: 242 }, label: 'Cafeteria South Wall 2' },

  // 4. Dev Hub Right Partition (separating Left Dev Hub from Central Hallway)
  { id: 'w-dev-r1', start: { x: 275, y: 24 }, end: { x: 275, y: 260 }, label: 'Dev Hub North Wall' },
  // Open walkway between y: 260 and y: 295
  { id: 'w-dev-r2', start: { x: 300, y: 295 }, end: { x: 300, y: 546 }, label: 'Dev Hub South Wall' },

  // 5. Central Corridor Dividing Wall (separates top hallway and reception)
  { id: 'w-hall-s1', start: { x: 300, y: 285 }, end: { x: 472, y: 285 }, label: 'Central Corridor Wall 1' },
  // Atrium Glass Doors at x: 472 to 532
  { id: 'w-hall-s2', start: { x: 532, y: 285 }, end: { x: 742, y: 285 }, label: 'Central Corridor Wall 2' },

  // 6. Kitchen Lower Lounge (Checkerboard area left boundary)
  { id: 'w-cafe-low-w', start: { x: 558, y: 285 }, end: { x: 558, y: 546 }, label: 'Lower Kitchen West Wall' },

  // 7. Lead Director Office (Middle Right)
  { id: 'w-dir-n', start: { x: 808, y: 242 }, end: { x: 994, y: 242 }, label: 'Director North Wall' },
  { id: 'w-dir-s', start: { x: 808, y: 395 }, end: { x: 994, y: 395 }, label: 'Director South Wall' },
  { id: 'w-dir-w1', start: { x: 808, y: 242 }, end: { x: 808, y: 275 }, label: 'Director West Wall 1' },
  // Door gap is at y: 275 to 302
  { id: 'w-dir-w2', start: { x: 808, y: 302 }, end: { x: 808, y: 395 }, label: 'Director West Wall 2' },

  // 8. Restroom & Focus Pod (Bottom Right)
  { id: 'w-pod-n1', start: { x: 742, y: 418 }, end: { x: 778, y: 418 }, label: 'Restroom North Wall' },
  // Restroom door gap at x: 778 to 804
  { id: 'w-pod-n2', start: { x: 804, y: 418 }, end: { x: 875, y: 418 }, label: 'Mid Pod North Wall' },
  // Focus pod door gap at x: 875 to 903
  { id: 'w-pod-n3', start: { x: 903, y: 418 }, end: { x: 994, y: 418 }, label: 'Focus Pod North Wall' },
  { id: 'w-pod-mid', start: { x: 830, y: 418 }, end: { x: 830, y: 546 }, label: 'Restroom Divider Wall' },

  // 9. Conference Table Solid Collision Core (cannot walk onto the center table slab)
  { id: 'obs-tbl-t', start: { x: 805, y: 138 }, end: { x: 900, y: 138 }, label: 'Boardroom Table Top' },
  { id: 'obs-tbl-b', start: { x: 805, y: 172 }, end: { x: 900, y: 172 }, label: 'Boardroom Table Bottom' },
  { id: 'obs-tbl-l', start: { x: 805, y: 138 }, end: { x: 805, y: 172 }, label: 'Boardroom Table Left' },
  { id: 'obs-tbl-r', start: { x: 900, y: 138 }, end: { x: 900, y: 172 }, label: 'Boardroom Table Right' },
];

export const INITIAL_PEERS = [
  {
    id: 'peer-alex',
    name: 'Alex Rivera',
    handle: '@alex.lead',
    role: 'Team Lead',
    statusTag: 'In Meeting 👥',
    x: 800,
    y: 125, // Seated at Boardroom Table Seat 1
    color: '#06b6d4',
    earshotRadius: 150,
    isMuted: false,
    isSpeaking: true,
    speechCycle: 0,
    isSeated: true,
    wanderTarget: { x: 800, y: 125 },
  },
  {
    id: 'peer-maya',
    name: 'Maya Chen',
    handle: '@maya.design',
    role: 'Product Designer',
    statusTag: 'Reviewing UI 🎨',
    x: 835,
    y: 125, // Seated at Boardroom Table Seat 2
    color: '#ec4899',
    earshotRadius: 150,
    isMuted: false,
    isSpeaking: false,
    speechCycle: 2,
    isSeated: true,
    wanderTarget: { x: 835, y: 125 },
  },
  {
    id: 'peer-rohan',
    name: 'Rohan Sharma',
    handle: '@rohan.backend',
    role: 'Distributed Systems',
    statusTag: 'Deep Focus 🎧',
    x: 188,
    y: 180, // At Dev Cubicle North
    color: '#f59e0b',
    earshotRadius: 130,
    isMuted: false,
    isSpeaking: false,
    speechCycle: 4,
    isSeated: true,
    wanderTarget: { x: 188, y: 180 },
  },
  {
    id: 'peer-elena',
    name: 'Elena Rostova',
    handle: '@elena.ai',
    role: 'AI Researcher',
    statusTag: 'Coffee Break ☕',
    x: 650,
    y: 140, // In Cafeteria Lounge
    color: '#a855f7',
    earshotRadius: 150,
    isMuted: true,
    isSpeaking: false,
    speechCycle: 1,
    isSeated: false,
    wanderTarget: { x: 650, y: 140 },
  },
];
