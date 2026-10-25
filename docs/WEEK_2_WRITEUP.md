# PROXISPEAK: GEOSPATIAL PROXIMITY AUDIO ECOSYSTEM
## Week 2 Technical Implementation Write-Up: Real-Time Presence Lifecycle, Proximity Calculation Engine & Acoustic Raytracing

### 1. Executive Summary & Core Objectives
Building on the database foundations established in Week 1, Week 2 delivered the core real-time interactive engine of ProxiSpeak: transforming static geospatial records into an interactive, multi-user spatial workspace. This required engineering a low-latency bidirectional WebSocket gateway, managing the complete avatar presence lifecycle (join, move, disconnect), implementing server-authoritative coordinate verification and anti-cheat controls, calculating distance-based proximity audio gain, and executing real-time 2D raycasting to simulate physical acoustic wall and door occlusion with low-pass frequency filtering.

### 2. Real-Time Gateway Architecture (Socket.io)
Implemented in server/src/socket/index.js, the real-time communications engine uses Socket.io attached directly to the existing Express HTTP server on port 4000:
- Unified Port Architecture: Serving both REST endpoints (GET /health) and WebSocket connections on port 4000 eliminates cross-origin port issues, simplifies firewall configuration, and facilitates reverse-proxy load balancing.
- Transport Resilience: Utilizes WebSocket as the primary transport protocol with automatic transparent fallback to HTTP long-polling when client networks block WebSocket upgrades.
- Channel Isolation: Implements room-scoped channels (socket.join(roomId)) ensuring that state broadcasts are strictly delivered only to occupants in the same architectural space, preventing unnecessary network chatter and protecting multi-room privacy.

### 3. Presence Lifecycle Protocol & State Synchronization
The WebSocket gateway enforces a three-stage presence lifecycle:
- Avatar Registration (`user:join`): When an avatar connects, it transmits userId, name, color, and target roomId. The server validates room existence, computes an optimal dynamic spawn point located furthest away from currently occupied avatars to prevent coordinate stacking, executes an atomic upsert into MongoDB with GeoJSON Point coordinates, joins the socket to the room channel, and broadcasts user:joined to peers. The newcomer receives an immediate room snapshot containing all active peers, door states, and boundary geometry.
- Authoritative Movement (`user:move`): The client transmits desired coordinates (x, y). The server applies multi-stage validation: verifies numerical finiteness, clamps coordinates within room boundary walls, shortens displacement vectors exceeding SOCKET_MAX_STEP_PX (120px) to prevent teleportation, and throttles incoming traffic via a token bucket rate limiter (SOCKET_MOVE_EPS = 30 events/sec). Validated moves are updated in MongoDB and broadcast to room peers as user:moved.
- Graceful & Abrupt Disconnection (`disconnect`): When a client disconnects due to navigation, tab closure, or network loss, the server triggers the disconnect handler. It broadcasts user:left to room peers and executes an atomic UserPresence.deleteOne({ socketId: socket.id }) query, guaranteeing that no ghost avatars linger in memory or database.

### 4. Server-Authoritative Anti-Cheat & Security Mechanics
To protect spatial integrity in an open web environment, spatial position is strictly server-authoritative:
- Coordinate Bounds Clamping: Client coordinates are clamped inside the room's physical bounding rectangle (xmin <= x <= xmax and ymin <= y <= ymax). Avatars can never be hacked or pushed outside the structural floorplan.
- Step Distance Capping: Displacement delta is calculated as Delta_d = sqrt(Delta_x^2 + Delta_y^2). If Delta_d exceeds 120 pixels in a single update, the displacement vector is clamped along its unit direction: Candidate = Previous + (Delta_vec / Delta_d) * 120. This completely eliminates teleportation and speed-hacking.
- Token Bucket Rate Limiting: Each socket is monitored with a token bucket permitting up to 30 move events per second with burst allowance. Exorbitant packet floods are dropped silently to prevent server CPU exhaustion.

### 5. Proximity Audio Calculation & Natural Falloff Mechanics
The proximity audio engine computes dynamic sound volume and spatial placement:
- Euclidean Distance: Distance d between avatars is calculated as d = sqrt((x1 - x2)^2 + (y1 - y2)^2).
- Natural Logarithmic Falloff Curve: Proximity volume gain follows an acoustic curve: within the inner 20% of the earshot radius (d <= 0.2R), volume is 100% (Gain = 1.0). Between 20% and 100% of the radius, volume smoothly attenuates according to Gain = max(0, 1 - ((d - 0.2R) / 0.8R)^1.25). Beyond the radius (d >= R), volume drops to 0, closing audio mesh pipelines and saving network bandwidth.
- Configurable Earshot Presets: Supports three acoustic modes: Whisper Mode (75px / 5m range for private huddles), Normal Mode (150px / 10m range for conversational groups), and Broadcast Mode (260px / 18m range for presentations).
- Binaural Stereo Panning: Calculates pan = (peer.x - player.x) / radius, clamped between -1.0 (full left ear) and +1.0 (full right ear) using Web Audio StereoPannerNodes.

### 6. 2D Acoustic Raycasting & Low-Pass Occlusion Algorithm
To model architectural sound isolation realistically:
- Line-Segment Intersection Raycasting: A 2D ray is cast between the listener avatar and the speaking avatar. The ray is tested against all static structural walls and closed doors using the counter-clockwise determinant line intersection theorem: ccw(A, B, C) = (Cy - Ay)(Bx - Ax) > (By - Ay)(Cx - Ax). Two segments AB and CD intersect if and only if ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D).
- Acoustic Low-Pass Filtering: When an active wall or closed door intersects the audio ray, volume gain is attenuated by 65% (Gain = Gain * 0.35) and the Web Audio stream is routed through a native BiquadFilterNode configured as a low-pass filter with a cutoff frequency of 450 Hz. High and mid frequencies are filtered out, recreating the muffled acoustic sensation of hearing speech through walls or closed doors. When a door is opened (openProgress >= 65%), the occlusion barrier is removed, immediately restoring crisp, full-spectrum audio.

### 7. Interactive Door Synchronization & Frontend Optimization
- Interactive Door Synchronization: Doors support manual click toggles and autonomous motion sensing. State changes emit door:toggle and broadcast door:state across the mesh, animating opening and closing progress smoothly via linear interpolation (lerp).
- React Performance Optimization: Metered microphone telemetry updates at an 80ms interval rather than requestAnimationFrame, resolving React re-render depth saturation while allowing the HTML5 2D Canvas to render silky smooth avatar movement at 60 FPS.

### 8. Verification, Testing & Git Compliance
- Real-time event propagation verified with multi-client simulation scripts testing simultaneous join, movement, clamping, and disconnect flows.
- Production build verified using Vite (npm --prefix client run build) compiling 1,949 modules into a 357 kB production bundle with 0 errors.
- Both Week 1 and Week 2 codebases are fully integrated, tested, and pushed to GitHub on branch `Aman` and default branch `main` at https://github.com/CodingWithAman1/ProxiSpeak.git (Commit: 7b6955e).
