# PROXISPEAK: GEOSPATIAL PROXIMITY AUDIO ECOSYSTEM
## Week 1 Technical Implementation Write-Up: System Architecture, Server Infrastructure & Geospatial Data Layer

### 1. Executive Summary & Problem Formulation
Traditional audio communication platforms (Zoom, Google Meet, Discord voice channels) treat voice data as a flat, single-channel broadcast where every participant is mixed with uniform volume regardless of virtual position. This leads to conversational collisions, social inhibition, and the complete elimination of serendipitous side-conversations. ProxiSpeak re-architects digital workspace collaboration around physical acoustics: proximity acts as the volume knob. Users navigate a continuous 2D spatial workspace where volume, binaural stereo panning, and acoustic wall occlusion are calculated dynamically in real time based on Euclidean distance, obstacle raycasting, and physical boundaries. Week 1 established the enterprise-grade foundation for this ecosystem: the Node.js/Express server microservice architecture, resilient database lifecycle management, MongoDB 2dsphere geospatial modeling, affine metric coordinate projection, and automated idempotent database seeding.

### 2. Technology Stack & Module Architecture
The Week 1 implementation establishes the core data and server tiers:
- Backend Runtime: Node.js (v20+ / v24) providing high-throughput asynchronous non-blocking event-driven execution.
- HTTP Microservice Framework: Express.js configured with security middleware, payload parsers, and custom routing layers.
- Geospatial Database Layer: MongoDB with Mongoose ODM utilizing native 2dsphere spherical geospatial indexing.
- Observability & Logging: Winston structured JSON logger with timestamped multi-level output (error, warn, info, debug).
- Security & Network Hygiene: Strict CORS configuration, reverse-proxy trust flags, and environment validation.

### 3. Server Architecture & Operational Lifecycle
Implemented in server/src/app.js and server/src/index.js, the backend service delivers an enterprise microservice foundation:
- Protocol Security: Configured CORS policies using an explicit origin allow-list (http://localhost:5173 for client development) while prohibiting wildcard reflection in production environments. Added standard body parsing middleware (express.json() and express.urlencoded({ extended: true })) with strict payload size caps.
- Production Health Probes: Implemented a lightweight GET /health diagnostics endpoint that returns service identifier, process uptime in seconds, database connectivity status, and ISO-8601 server timestamps. This serves as an automated liveness and readiness probe for container orchestrators and load balancers.
- Graceful Process Termination: Attached unified process listeners for SIGINT and SIGTERM signals. When termination is initiated, the server stops accepting incoming HTTP connections, alerts connected sessions, closes active database connection pools gracefully, and terminates without orphaned locks or unclosed file descriptors.

### 4. MongoDB Geospatial Architecture & 2dsphere Indexing
Implemented in server/src/database/mongo.js, the data layer establishes a resilient, production-ready document store:
- Connection Management: Configured Mongoose connection pooling with maxPoolSize: 50, serverSelectionTimeoutMS: 5000, and automatic exponential backoff reconnection logic. Credentials and connection strings are masked in logs to protect operational secrets.
- GeoJSON Coordinate Primitives: Avatar coordinates are stored using official GeoJSON Point primitives [longitude (X), latitude (Y)] representing metric projected coordinates.
- 2dsphere Spatial Indexing: Ensured a native 2dsphere spherical index on the location field of the presence collection. This allows the database engine to execute optimized geospatial queries ($near, $geoNear, and $geoWithin) using spatial B-trees rather than scanning unindexed documents, enabling sub-millisecond proximity queries across large concurrent user populations.

### 5. Data Modeling & Schema Design
- UserPresence Schema (server/src/models/UserPresence.js): Models ephemeral user sessions and spatial state. Key fields include userId (unique string identifier), socketId (WebSocket session identifier), roomId (current active architectural room), name (display name), color (hex avatar color code), x and y (canvas pixel coordinates), location (GeoJSON Point object with type 'Point' and coordinates [x, y] in projected meters), audio state flags (isMuted, isDeafened, isSpeaking, isSeated), and lastSeen (timestamp). Configured two primary indexes: a 2dsphere index on location for geospatial queries and a compound index on { roomId: 1, lastSeen: -1 } for high-speed room-level roster fetching.
- Room Schema (server/src/models/Room.js): Models virtual architectural spaces and physical geometry. Key fields include roomId (unique alphanumeric identifier), name (descriptive title), code (architectural code like CONF-101), bounds (x, y, width, height in pixels), floorType (architectural floor material), obstacles (array of acoustic boundary lines containing start/end coordinates, blocksAudio flags, and sound attenuation percentages), and spawnPoints (array of designated entry coordinates).

### 6. Metric Coordinate Projection & Automated Seeding
To bridge screen pixel rendering (1024x571 canvas) with geospatial spherical calculations, an affine coordinate projection system was engineered: 15 pixels equal 1 virtual meter (1 pixel = 0.067 meters). This ensures distance math corresponds directly to human acoustic hearing ranges. An automated, idempotent database seed script was created (server/src/seed/seedData.js) that initializes the official architectural layout:
- Executive Boardroom: 423x189px suite featuring teak parquet flooring and conference table.
- Developer Hub: 418x536px open engineering floor featuring acoustic tech carpet tile.
- Cafeteria & Lounge: 275x347px dining and espresso bar featuring hex bistro ceramic tiles.
- Central Atrium & Corridor: 141x349px spine featuring basalt slate pavers and glass sliding gates.
- Welcome Lobby & Reception: 167x187px entryway featuring polished travertine marble.
- Focus Pods Alpha & Beta: 148x235px private quiet rooms featuring soundproof felt flooring.
- Restrooms: 148x112px executive washrooms featuring porcelain subway tiles.

### 7. Verification, Quality Assurance & Git Compliance
- Unit Testing: Verified coordinate projection algorithms, meter conversions, and bounding calculations with unit tests in server/tests/geo.test.js achieving a 100% pass rate.
- Database Verification: Verified database indexing directly through MongoDB shell, confirming active 2dsphere indexes on UserPresence.location and compound room indexes.
- Git Branching Discipline: All Week 1 work was developed on dedicated feature branch `Aman`, verified against CI/CD criteria, and maintained in clean linear history synchronized with GitHub at https://github.com/CodingWithAman1/ProxiSpeak.git.
