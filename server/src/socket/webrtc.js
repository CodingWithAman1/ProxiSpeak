import logger from '../utils/logger.js';

// Active mesh connections tracked per socket pair: key = sorted [socketA, socketB].join(':')
const activeMeshPairs = new Set();

function getPairKey(a, b) {
  return [a, b].sort().join(':');
}

/**
 * WebRTC Signaling & Dynamic Mesh Connection Lifecycle
 */
export function setupWebRTCSignaling(io, socket) {
  // Relay SDP Offer
  socket.on('signal:offer', ({ toSocketId, offer }) => {
    if (!toSocketId || !offer) return;
    io.to(toSocketId).emit('signal:offer', {
      fromSocketId: socket.id,
      offer,
    });
  });

  // Relay SDP Answer
  socket.on('signal:answer', ({ toSocketId, answer }) => {
    if (!toSocketId || !answer) return;
    io.to(toSocketId).emit('signal:answer', {
      fromSocketId: socket.id,
      answer,
    });
  });

  // Relay ICE Candidate
  socket.on('signal:ice-candidate', ({ toSocketId, candidate }) => {
    if (!toSocketId || !candidate) return;
    io.to(toSocketId).emit('signal:ice-candidate', {
      fromSocketId: socket.id,
      candidate,
    });
  });

  // Explicit mesh closure
  socket.on('signal:close', ({ toSocketId }) => {
    const pair = getPairKey(socket.id, toSocketId);
    activeMeshPairs.delete(pair);
    io.to(toSocketId).emit('signal:closed', {
      fromSocketId: socket.id,
    });
  });

  // Clean up all active mesh pairs when socket disconnects
  socket.on('disconnect', () => {
    for (const pair of Array.from(activeMeshPairs)) {
      if (pair.includes(socket.id)) {
        activeMeshPairs.delete(pair);
      }
    }
  });
}

/**
 * Evaluates proximity neighbors and emits WebRTC initiate/teardown mesh events
 */
export function syncMeshConnections(socket, user, neighbors, io) {
  neighbors.forEach((neighbor) => {
    if (!neighbor.socketId) return;

    const pair = getPairKey(socket.id, neighbor.socketId);
    const isCurrentlyConnected = activeMeshPairs.has(pair);

    if (neighbor.inRange && !isCurrentlyConnected) {
      activeMeshPairs.add(pair);
      // Deterministic initiator election based on string comparison to prevent WebRTC glare
      const isInitiator = socket.id > neighbor.socketId;

      if (isInitiator) {
        socket.emit('webrtc:initiate_mesh', {
          targetSocketId: neighbor.socketId,
          targetUserId: neighbor.userId,
          targetName: neighbor.name,
          gain: neighbor.gain,
          pan: neighbor.pan,
          isOccluded: neighbor.isOccluded,
        });
      }
    } else if (!neighbor.inRange && isCurrentlyConnected) {
      activeMeshPairs.delete(pair);
      // User walked out of earshot -> tear down the WebRTC peer audio channel
      socket.emit('webrtc:teardown_mesh', {
        targetSocketId: neighbor.socketId,
        targetUserId: neighbor.userId,
      });
      io.to(neighbor.socketId).emit('webrtc:teardown_mesh', {
        targetSocketId: socket.id,
        targetUserId: user.userId,
      });
    }
  });
}

export default { setupWebRTCSignaling, syncMeshConnections };
