# ProxiSpeak — Geospatial Proximity Audio Ecosystem

A virtual space where **proximity is the volume knob**. You see a live 2D map, you move
your avatar, and the moment you walk inside somebody's earshot circle a WebRTC audio
connection opens and crossfades in; walk away and it closes. Walls between you muffle
the voice.

## Problem statement

Voice chat today is flat: everyone in a call is equally loud no matter where they
"are", so large calls turn into either chaos or muted silence, and there is no sense
of place, distance or serendipity. ProxiSpeak treats conversation as something you
*walk into* — participants live on a geolocated 2D map, rooms are anchored to
coordinates, and the server continuously computes who is within earshot of whom.
Moving closer makes a voice louder and clearer; moving away fades it out and
eventually tears the audio connection down.

The result is a persistent audio world for events, campuses, offices and
communities: no hand-raising, no lobby moderation — you simply walk up to people
and talk.

## Tech stack

* **Backend** — Node.js, Express, Socket.io, MongoDB (`$near` / `$geoWithin` /
  `$geoNear`, `2dsphere`), Redis Pub/Sub (`@socket.io/redis-adapter` + a
  domain-event channel).
* **Frontend** — React, HTML5 Canvas API, WebRTC (`getUserMedia`), Web Audio API.

No other libraries. No TURN. No UI kit, no state-management library, no extra
database.

## Key modules

| Module | What it does | Status |
| --- | --- | --- |
| `server/` — Express app | Health endpoint, JSON API surface, config + logger | **Day 1 — done** |
| Geospatial engine | MongoDB `2dsphere` queries (`$near`, `$geoWithin`) mapped onto the 2D world plane | Week 1–2 |
| Presence & signaling | Socket.io gateway, presence lifecycle, Redis Pub/Sub for multi-instance scaling | Week 2 |
| Voice mesh | WebRTC peer connections with mesh hygiene (renegotiation, ICE restarts) | Week 3 |
| Spatial audio | Web Audio API crossfade, proximity gain and wall occlusion | Week 3 |
| Client | React + Canvas live map, avatar movement, audio UI | Week 3–4 |

## Week-wise plan

| Week | Focus | Deliverables | Review |
| --- | --- | --- | --- |
| **Week 1** | Foundations & data layer | Project setup (Day 1), MongoDB connection, `UserPresence` / `Room` schemas with `2dsphere` index, seed script, health endpoint | Week 1 review: server boots green, geo data seeds and queries |
| **Week 2** | Real-time presence & proximity | Socket.io gateway, Redis Pub/Sub adapter, presence lifecycle, earshot queries on the world plane | Week 2 review: presence flows, proximity queries stay inside the latency budget |
| **Week 3** | Voice mesh & spatial audio | WebRTC signaling, peer graph hygiene, Web Audio proximity crossfade and occlusion | Week 3 review: audio opens/closes by distance, mute/occlusion works |
| **Week 4** | Client & hardening | Full React/Canvas client, movement + audio UX, load testing, production hardening | Final review: end-to-end multi-user demo |

## Day 2: MongoDB setup

Day 2 adds the data layer: the MongoDB connection lifecycle, the `UserPresence`
and `Room` schemas, the `2dsphere` index on `UserPresence.location`, the
pixel ⇄ GeoJSON projection the schema depends on (1 px = 0.1 m), a position
persistence helper and a seed script.

### 1. Point the server at a MongoDB

Copy `.env.example` to `.env` (repo root) and set `MONGO_URI`.

* **Local MongoDB** — start `mongod --dbpath ./data` (or your usual service)
  and keep the default:
  ```bash
  MONGO_URI=mongodb://127.0.0.1:27017/proxispeak
  ```
* **Atlas (or any remote MongoDB)** — create a cluster + database user, allow
  your IP in *Network Access*, then paste the driver connection string:
  ```bash
  MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/proxispeak?retryWrites=true&w=majority
  ```

`MONGO_URI` is never printed verbatim: the server boot and the seed script
redact credentials before anything reaches the logs.

### 2. Install and seed

```bash
npm install --prefix server     # Day 2 adds mongoose
npm run seed                    # creates the 2dsphere index + default rooms
```

`npm run seed` works against any reachable `MONGO_URI` (local or Atlas) and is
idempotent — existing rooms are left untouched, indexes are re-checked. It ends
by printing the resulting index list:

```
indexes ensured (UserPresence.location = 2dsphere)
room "lobby" created
room "studio" created
room "lounge" created
UserPresence indexes: {"_id":1}, {"sessionId":1}, {"roomId":1}, {"location":"2dsphere"}, {"sessionId":1,"roomId":1}, {"roomId":1,"lastSeen":-1}
done
```

### 3. Verify the 2dsphere index

`ensureIndexes()` also runs on every server boot, so the index exists even if
you never seed. To inspect it directly:

```bash
mongosh "mongodb://127.0.0.1:27017/proxispeak" --eval 'printjson(db.userpresences.getIndexes())'
```

Expected (trimmed):

```js
[
  { v: 2, key: { _id: 1 }, name: '_id_' },
  { v: 2, key: { location: '2dsphere' }, name: 'location_2dsphere', '2dsphereIndexVersion': 3 },
  { v: 2, key: { sessionId: 1, roomId: 1 }, name: 'sessionId_1_roomId_1', unique: true },
  { v: 2, key: { roomId: 1, lastSeen: -1 }, name: 'roomId_1_lastSeen_-1' }
]
```

In **Compass**: `proxispeak` → `userpresences` → *Indexes* → `location_2dsphere`.
The rooms are visible in `proxispeak` → `rooms` (`lobby`, `studio`, `lounge`,
each with `width`/`height` and its obstacle layout).

### 4. Run

```bash
npm start        # connects to MongoDB, ensures indexes, then listens on :4000
curl http://localhost:4000/health
# {"status":"ok","service":"proxispeak","uptimeSeconds":1,"time":"…"}
```

`/health` stays pure liveness — it never touches MongoDB, so a blip in the
database can never mark a healthy process as dead. `SIGINT` / `SIGTERM` close
the HTTP server, disconnect from MongoDB and exit.

Run the geo projection unit tests with `npm test` (wired to `node --test`).

## Status

* **Day 1 status: setup done** — repo structure, `.gitignore`, `.env.example`,
  root scripts, Express server skeleton (config, logger, CORS, JSON parsing,
  trust proxy) and `GET /health`.
* **Day 2 status: MongoDB + geospatial schema done** — connection lifecycle
  (`connectMongo` / `disconnectMongo` / `ensureIndexes`), `UserPresence`
  (GeoJSON `location` + `2dsphere`), `Room` (pixel dimensions + obstacle
  layout), geo projection utility with unit tests, position persistence helper
  and the `lobby` / `studio` / `lounge` seed.
* Redis, Socket.io, WebRTC, the proximity queries (`$near` / `$geoWithin`) and
  the React client are intentionally **not** part of Days 1–2; they land with
  their own days/weeks above.
