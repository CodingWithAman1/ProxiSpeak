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

## Status

* **Day 1 status: setup done** — repo structure, `.gitignore`, `.env.example`,
  root scripts, Express server skeleton (config, logger, CORS, JSON parsing,
  trust proxy) and `GET /health`.
* MongoDB, Redis, Socket.io, WebRTC and the React client are intentionally
  **not** part of Day 1; they land with their own days/weeks above.
