/**
 * Calm Biophilic Office World Geometry & Interactive Objects
 * Includes frosted glass partitions, interactive windows with outdoor sounds,
 * potted plants, conference meeting table, espresso barista, and acoustic pods.
 */

export const WORLD_CONFIG = {
  width: 1180,
  height: 760,
  defaultEarshotRadius: 160, // pixels (≈ 10.6 meters)
  earshotPresets: {
    whisper: { label: 'Whisper', radius: 80, desc: 'Quiet conversation / Private pod (5m)' },
    normal: { label: 'Normal', radius: 160, desc: 'Natural boardroom voice (10m)' },
    shout: { label: 'Broadcast', radius: 280, desc: 'Full office announcement (18m)' },
  },
};

export const INITIAL_ROOMS = [
  {
    id: 'boardroom',
    name: 'Executive Glass Boardroom',
    code: 'CONF-A',
    description: 'Sound-isolated acoustic conference room with walnut meeting table & whiteboard',
    x: 40,
    y: 40,
    w: 500,
    h: 370,
    color: '#06b6d4', // Cyan
    bgTint: 'rgba(6, 182, 212, 0.04)',
    borderTint: 'rgba(34, 211, 238, 0.25)',
    floorType: 'carpet',
    icon: 'Users',
  },
  {
    id: 'lounge',
    name: 'Biophilic Zen Lounge & Cafe',
    code: 'LOUNGE-01',
    description: 'Natural oak flooring, steaming espresso bar, and garden courtyard windows',
    x: 580,
    y: 40,
    w: 560,
    h: 370,
    color: '#10b981', // Emerald
    bgTint: 'rgba(16, 185, 129, 0.04)',
    borderTint: 'rgba(52, 211, 153, 0.25)',
    floorType: 'wood',
    icon: 'Coffee',
  },
  {
    id: 'pod-a',
    name: 'Quiet Acoustic Pod Alpha',
    code: 'POD-A',
    description: 'Frosted fluted glass booth for private 1-on-1s and deep concentration',
    x: 40,
    y: 450,
    w: 240,
    h: 270,
    color: '#f59e0b', // Amber
    bgTint: 'rgba(245, 158, 11, 0.04)',
    borderTint: 'rgba(251, 191, 36, 0.25)',
    floorType: 'felt',
    icon: 'ShieldCheck',
  },
  {
    id: 'pod-b',
    name: 'Acoustic Studio Pod Beta',
    code: 'POD-B',
    description: 'Sound-dampened studio booth with acoustic wall baffles',
    x: 310,
    y: 450,
    w: 230,
    h: 270,
    color: '#ec4899', // Rose
    bgTint: 'rgba(236, 72, 153, 0.04)',
    borderTint: 'rgba(244, 114, 182, 0.25)',
    floorType: 'felt',
    icon: 'Lock',
  },
  {
    id: 'terrace',
    name: 'Sunlit Atrium & Open Terrace',
    code: 'ATRIUM-02',
    description: 'Open collaborative workspace with botanical palms and breeze sliding doors',
    x: 580,
    y: 450,
    w: 560,
    h: 270,
    color: '#8b5cf6', // Violet
    bgTint: 'rgba(139, 92, 246, 0.04)',
    borderTint: 'rgba(167, 139, 250, 0.25)',
    floorType: 'terrazzo',
    icon: 'Sun',
  },
];

// Interactive Windows with Outdoor Sounds (Rain, Courtyard Breeze, Birds)
export const INITIAL_WINDOWS = [
  {
    id: 'win-boardroom',
    name: 'Boardroom Rain Window',
    roomId: 'boardroom',
    x: 160,
    y: 40,
    w: 260,
    h: 12,
    isOpen: false,
    soundType: 'gentle_rain',
    soundLabel: 'Gentle Rain on Glass',
  },
  {
    id: 'win-lounge',
    name: 'Garden Courtyard Window',
    roomId: 'lounge',
    x: 740,
    y: 40,
    w: 280,
    h: 12,
    isOpen: true,
    soundType: 'courtyard_breeze',
    soundLabel: 'Courtyard Birds & Soft Breeze',
  },
  {
    id: 'win-terrace',
    name: 'Balcony Panoramic Slider',
    roomId: 'terrace',
    x: 840,
    y: 710,
    w: 240,
    h: 12,
    isOpen: false,
    soundType: 'urban_zen',
    soundLabel: 'Outdoor Garden Breeze',
  },
];

// Biophilic Plants (Click or walk past to rustle leaves)
export const INITIAL_PLANTS = [
  { id: 'p1', type: 'monstera', name: 'Monstera Deliciosa', x: 75, y: 75, radius: 22, color: '#10b981' },
  { id: 'p2', type: 'fiddle', name: 'Fiddle-Leaf Fig', x: 505, y: 75, radius: 24, color: '#059669' },
  { id: 'p3', type: 'bamboo', name: 'Zen Bamboo Divider', x: 595, y: 220, radius: 20, color: '#34d399' },
  { id: 'p4', type: 'palm', name: 'Paradise Palm', x: 1105, y: 80, radius: 26, color: '#047857' },
  { id: 'p5', type: 'bonsai', name: 'Japanese Pine Bonsai', x: 235, y: 485, radius: 16, color: '#10b981' },
  { id: 'p6', type: 'snake', name: 'Snake Plant Cluster', x: 610, y: 480, radius: 18, color: '#059669' },
  { id: 'p7', type: 'monstera', name: 'Giant Monstera', x: 1105, y: 685, radius: 25, color: '#10b981' },
  { id: 'p8', type: 'pothos', name: 'Trailing Marble Pothos', x: 345, y: 485, radius: 16, color: '#34d399' },
];

// Office Furniture & Meeting Amenities
export const OFFICE_FURNITURE = {
  conferenceTable: {
    id: 'conf-table',
    name: 'Walnut Executive Conference Table',
    x: 180,
    y: 170,
    w: 220,
    h: 120,
    color: '#3b2f2f',
    chairs: [
      { id: 'chair-1', x: 225, y: 145, label: 'Seat 1', occupant: 'Alex Rivera' },
      { id: 'chair-2', x: 290, y: 145, label: 'Seat 2', occupant: 'Maya Chen' },
      { id: 'chair-3', x: 355, y: 145, label: 'Seat 3', occupant: null },
      { id: 'chair-4', x: 225, y: 315, label: 'Seat 4', occupant: null },
      { id: 'chair-5', x: 290, y: 315, label: 'Seat 5', occupant: null },
      { id: 'chair-6', x: 355, y: 315, label: 'Seat 6', occupant: null },
    ],
  },
  whiteboard: {
    id: 'whiteboard',
    name: 'Interactive Presentation Whiteboard',
    x: 52,
    y: 160,
    w: 10,
    h: 140,
    topic: 'Q4 Spatial Mesh & WebRTC Voice Architecture',
    bullets: ['• Proximity Gain Curve: 1 - (d/R)^1.25', '• Acoustic Wall Occlusion (-65% gain, 450Hz lowpass)', '• Zero-Latency Web Audio Engine', '• Biophilic Office Aesthetics & Calm Ambiance'],
  },
  espressoBar: {
    id: 'espresso-bar',
    name: 'Artisan Barista & Coffee Station',
    x: 970,
    y: 150,
    w: 130,
    h: 70,
    isBrewing: false,
  },
  waterDispenser: {
    id: 'water-cooler',
    name: 'Pure Spring Water Cooler',
    x: 600,
    y: 130,
    w: 28,
    h: 28,
  },
  loungeSofas: [
    { x: 740, y: 180, w: 90, h: 48, label: 'Nordic Wool Sofa' },
    { x: 860, y: 180, w: 90, h: 48, label: 'Nordic Wool Sofa' },
  ],
};

// Acoustic Frosted Glass Walls & Partitions
export const INITIAL_WALLS = [
  // Boardroom Glass Enclosure (with doorway gap at x: 380 to 450)
  { id: 'w1', start: { x: 40, y: 40 }, end: { x: 540, y: 40 }, type: 'glass', label: 'North Glass Wall' },
  { id: 'w2', start: { x: 40, y: 40 }, end: { x: 40, y: 410 }, type: 'acoustic', label: 'West Wall' },
  { id: 'w3', start: { x: 540, y: 40 }, end: { x: 540, y: 410 }, type: 'glass', label: 'East Frosted Partition' },
  { id: 'w4', start: { x: 40, y: 410 }, end: { x: 380, y: 410 }, type: 'glass', label: 'South Glass Wall A' },
  { id: 'w5', start: { x: 460, y: 410 }, end: { x: 540, y: 410 }, type: 'glass', label: 'South Glass Wall B' },
  // Boardroom Sliding Glass Door (between 380 and 460)
  { id: 'door-boardroom', start: { x: 380, y: 410 }, end: { x: 460, y: 410 }, type: 'door', isOpen: true, label: 'Boardroom Glass Slider' },

  // Pod Alpha Glass Enclosure (Door at y: 450 to 500 on right wall)
  { id: 'w6', start: { x: 40, y: 450 }, end: { x: 280, y: 450 }, type: 'glass', label: 'Pod A North' },
  { id: 'w7', start: { x: 40, y: 450 }, end: { x: 40, y: 720 }, type: 'acoustic', label: 'Pod A West' },
  { id: 'w8', start: { x: 40, y: 720 }, end: { x: 280, y: 720 }, type: 'acoustic', label: 'Pod A South' },
  { id: 'w9', start: { x: 280, y: 520 }, end: { x: 280, y: 720 }, type: 'glass', label: 'Pod A East' },
  { id: 'door-poda', start: { x: 280, y: 450 }, end: { x: 280, y: 520 }, type: 'door', isOpen: false, label: 'Pod A Acoustic Slider' },

  // Pod Beta Glass Enclosure
  { id: 'w10', start: { x: 310, y: 450 }, end: { x: 540, y: 450 }, type: 'glass', label: 'Pod B North' },
  { id: 'w11', start: { x: 540, y: 450 }, end: { x: 540, y: 720 }, type: 'acoustic', label: 'Pod B East' },
  { id: 'w12', start: { x: 310, y: 720 }, end: { x: 540, y: 720 }, type: 'acoustic', label: 'Pod B South' },
  { id: 'w13', start: { x: 310, y: 520 }, end: { x: 310, y: 720 }, type: 'glass', label: 'Pod B West' },
  { id: 'door-podb', start: { x: 310, y: 450 }, end: { x: 310, y: 520 }, type: 'door', isOpen: false, label: 'Pod B Acoustic Slider' },

  // Central corridor dividing glass wall
  { id: 'w14', start: { x: 560, y: 40 }, end: { x: 560, y: 340 }, type: 'glass', label: 'Lounge Frosted Divider' },
];

export const INITIAL_PEERS = [
  {
    id: 'peer-alex',
    name: 'Alex Rivera',
    handle: '@alex.lead',
    role: 'Team Lead',
    statusTag: 'In Meeting 👥',
    x: 225,
    y: 145, // Seated at Conference Table Chair 1
    color: '#06b6d4', // Calm Cyan
    earshotRadius: 160,
    isMuted: false,
    isSpeaking: true,
    speechCycle: 0,
    isSeated: true,
    wanderTarget: { x: 225, y: 145 },
  },
  {
    id: 'peer-maya',
    name: 'Maya Chen',
    handle: '@maya.design',
    role: 'Product Designer',
    statusTag: 'Reviewing UI 🎨',
    x: 290,
    y: 145, // Seated at Conference Table Chair 2
    color: '#ec4899', // Rose
    earshotRadius: 160,
    isMuted: false,
    isSpeaking: false,
    speechCycle: 2,
    isSeated: true,
    wanderTarget: { x: 290, y: 145 },
  },
  {
    id: 'peer-rohan',
    name: 'Rohan Sharma',
    handle: '@rohan.backend',
    role: 'Distributed Systems',
    statusTag: 'Deep Focus 🎧',
    x: 150,
    y: 560, // Inside Acoustic Pod Alpha
    color: '#f59e0b', // Amber
    earshotRadius: 140,
    isMuted: false,
    isSpeaking: false,
    speechCycle: 4,
    isSeated: false,
    wanderTarget: { x: 160, y: 580 },
  },
  {
    id: 'peer-elena',
    name: 'Elena Rostova',
    handle: '@elena.ai',
    role: 'AI Researcher',
    statusTag: 'Coffee Break ☕',
    x: 940,
    y: 190, // Near Espresso Bar in Lounge
    color: '#a855f7', // Violet
    earshotRadius: 160,
    isMuted: true,
    isSpeaking: false,
    speechCycle: 1,
    isSeated: false,
    wanderTarget: { x: 950, y: 200 },
  },
];
