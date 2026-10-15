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
    x: 730,
    y: 15,
    w: 265,
    h: 235,
    color: '#06b6d4', // Cyan
    doorId: 'door-boardroom',
  },
  {
    id: 'breakroom',
    name: 'Cafeteria & Lounge',
    code: 'CAFE-102',
    description: 'Checkerboard lounge with vending, microwave, coffee station & sofas',
    x: 550,
    y: 15,
    w: 180,
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
    w: 245,
    h: 270,
    color: '#f59e0b', // Amber
    doorId: null,
  },
  {
    id: 'manager_office',
    name: 'Lead Director Office',
    code: 'OFFICE-201',
    description: 'Executive office with desk, computer, bookshelf & guest seating',
    x: 800,
    y: 250,
    w: 195,
    h: 145,
    color: '#ec4899', // Rose
    doorId: 'door-manager',
  },
  {
    id: 'private_office',
    name: 'Focus Pod & Research',
    code: 'OFFICE-202',
    description: 'Quiet concentration booth with desk and ficus bonsai',
    x: 830,
    y: 410,
    w: 165,
    h: 145,
    color: '#a855f7', // Purple
    doorId: 'door-private',
  },
];

// Interactive Doors (Click or walk into them to Open / Close & toggle sound occlusion)
export const INITIAL_DOORS = [
  {
    id: 'door-boardroom',
    name: 'Boardroom Door',
    roomId: 'boardroom',
    x: 772,
    y: 228,
    w: 34,
    h: 16,
    isOpen: false,
    type: 'wood_single',
    label: 'Boardroom Door',
  },
  {
    id: 'door-breakroom',
    name: 'Cafeteria Door',
    roomId: 'breakroom',
    x: 620,
    y: 228,
    w: 34,
    h: 16,
    isOpen: true,
    type: 'wood_single',
    label: 'Cafeteria Door',
  },
  {
    id: 'door-top-entrance',
    name: 'North Entrance Doors',
    roomId: 'hallway',
    x: 474,
    y: 62,
    w: 56,
    h: 36,
    isOpen: false,
    type: 'glass_double',
    label: 'North Entrance',
  },
  {
    id: 'door-center-glass',
    name: 'Atrium Glass Doors',
    roomId: 'hallway',
    x: 472,
    y: 338,
    w: 58,
    h: 36,
    isOpen: true,
    type: 'glass_double',
    label: 'Atrium Glass Doors',
  },
  {
    id: 'door-bottom-entrance',
    name: 'South Entrance Doors',
    roomId: 'hallway',
    x: 472,
    y: 520,
    w: 58,
    h: 36,
    isOpen: false,
    type: 'glass_double',
    label: 'South Entrance',
  },
  {
    id: 'door-manager',
    name: 'Director Office Door',
    roomId: 'manager_office',
    x: 778,
    y: 275,
    w: 26,
    h: 16,
    isOpen: false,
    type: 'wood_single',
    label: 'Director Office Door',
  },
  {
    id: 'door-private',
    name: 'Focus Pod Door',
    roomId: 'private_office',
    x: 875,
    y: 425,
    w: 26,
    h: 16,
    isOpen: false,
    type: 'wood_single',
    label: 'Focus Pod Door',
  },
  {
    id: 'door-restroom',
    name: 'Restroom Door',
    roomId: 'restroom',
    x: 778,
    y: 425,
    w: 24,
    h: 16,
    isOpen: false,
    type: 'wood_single',
    label: 'Restroom Door',
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

// Acoustic Walls for sound occlusion calculations
// Doors become acoustic barriers ONLY when closed!
export const INITIAL_WALLS = [
  // Boardroom left wall
  { id: 'w-br-left', start: { x: 730, y: 15 }, end: { x: 730, y: 248 }, label: 'Boardroom West Wall' },
  // Boardroom bottom wall (has door at 772)
  { id: 'w-br-bot-1', start: { x: 730, y: 248 }, end: { x: 772, y: 248 }, label: 'Boardroom South Wall 1' },
  { id: 'w-br-bot-2', start: { x: 806, y: 248 }, end: { x: 990, y: 248 }, label: 'Boardroom South Wall 2' },

  // Breakroom left wall
  { id: 'w-cafe-left', start: { x: 550, y: 15 }, end: { x: 550, y: 248 }, label: 'Cafeteria West Wall' },
  // Breakroom bottom wall (has door at 620)
  { id: 'w-cafe-bot-1', start: { x: 550, y: 248 }, end: { x: 620, y: 248 }, label: 'Cafeteria South Wall 1' },
  { id: 'w-cafe-bot-2', start: { x: 654, y: 248 }, end: { x: 730, y: 248 }, label: 'Cafeteria South Wall 2' },

  // Dev Hub right boundary dividing wall
  { id: 'w-dev-right-1', start: { x: 275, y: 15 }, end: { x: 275, y: 260 }, label: 'Dev Hub Boundary' },
  { id: 'w-dev-right-2', start: { x: 300, y: 285 }, end: { x: 300, y: 555 }, label: 'Design Hub Boundary' },

  // Director office boundary
  { id: 'w-dir-top', start: { x: 800, y: 248 }, end: { x: 990, y: 248 }, label: 'Director North Wall' },
  { id: 'w-dir-bot', start: { x: 800, y: 395 }, end: { x: 990, y: 395 }, label: 'Director South Wall' },
  { id: 'w-dir-left-1', start: { x: 800, y: 248 }, end: { x: 800, y: 275 }, label: 'Director West Wall 1' },
  { id: 'w-dir-left-2', start: { x: 800, y: 301 }, end: { x: 800, y: 395 }, label: 'Director West Wall 2' },
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
