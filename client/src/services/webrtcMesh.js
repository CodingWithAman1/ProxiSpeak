/**
 * WebRTC Mesh Voice Engine with Web Audio API Spatial Panning & Acoustic Occlusion
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class WebRTCMeshService {
  constructor() {
    this.socket = null;
    this.localStream = null;
    this.audioCtx = null;
    this.peerConnections = new Map(); // socketId -> RTCPeerConnection
    this.audioNodes = new Map(); // socketId -> { source, filter, gain, panner, remoteAudioEl }
    this.isMicEnabled = true;
  }

  init(socket, audioCtx) {
    this.socket = socket;
    this.audioCtx = audioCtx;

    if (!this.socket) return;

    // Handle incoming mesh initiation request (as initiator)
    this.socket.on('webrtc:initiate_mesh', async ({ targetSocketId, targetUserId, gain, pan, isOccluded }) => {
      console.log(`[WebRTC] Initiating mesh to peer ${targetUserId} (${targetSocketId})`);
      await this.createPeerConnection(targetSocketId, true, { gain, pan, isOccluded });
    });

    // Handle SDP offer
    this.socket.on('signal:offer', async ({ fromSocketId, offer }) => {
      console.log(`[WebRTC] Received SDP offer from ${fromSocketId}`);
      let pc = this.peerConnections.get(fromSocketId);
      if (!pc) {
        pc = await this.createPeerConnection(fromSocketId, false);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket.emit('signal:answer', {
        toSocketId: fromSocketId,
        answer,
      });
    });

    // Handle SDP answer
    this.socket.on('signal:answer', async ({ fromSocketId, answer }) => {
      console.log(`[WebRTC] Received SDP answer from ${fromSocketId}`);
      const pc = this.peerConnections.get(fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Handle ICE Candidate
    this.socket.on('signal:ice-candidate', async ({ fromSocketId, candidate }) => {
      const pc = this.peerConnections.get(fromSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[WebRTC] Error adding ICE candidate:', e.message);
        }
      }
    });

    // Handle mesh teardown
    this.socket.on('webrtc:teardown_mesh', ({ targetSocketId }) => {
      console.log(`[WebRTC] Tearing down mesh to ${targetSocketId}`);
      this.closePeer(targetSocketId);
    });

    this.socket.on('signal:closed', ({ fromSocketId }) => {
      this.closePeer(fromSocketId);
    });
  }

  async getLocalStream() {
    if (this.localStream) return this.localStream;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      return this.localStream;
    } catch (err) {
      console.warn('[WebRTC] Microphone access not granted or unavailable:', err.message);
      return null;
    }
  }

  async createPeerConnection(targetSocketId, isInitiator, initialSpatialParams = {}) {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(targetSocketId, pc);

    // Add local tracks if microphone is active
    const stream = await this.getLocalStream();
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    // ICE Candidate routing
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('signal:ice-candidate', {
          toSocketId: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming remote audio track
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote audio stream from ${targetSocketId}`);
      const remoteStream = event.streams[0];
      this.attachRemoteAudio(targetSocketId, remoteStream, initialSpatialParams);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${targetSocketId}: ${pc.connectionState}`);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this.closePeer(targetSocketId);
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      this.socket.emit('signal:offer', {
        toSocketId: targetSocketId,
        offer,
      });
    }

    return pc;
  }

  attachRemoteAudio(socketId, stream, { gain = 1, pan = 0, isOccluded = false } = {}) {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
    }
    if (!this.audioCtx) return;

    try {
      const source = this.audioCtx.createMediaStreamSource(stream);

      // 450Hz Low-Pass Filter for closed door & wall acoustic occlusion
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isOccluded ? 450 : 20000, this.audioCtx.currentTime);

      // Distance Proximity Gain
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.setValueAtTime(gain, this.audioCtx.currentTime);

      // Stereo 3D Spatial Panner
      let pannerNode = null;
      if (this.audioCtx.createStereoPanner) {
        pannerNode = this.audioCtx.createStereoPanner();
        pannerNode.pan.setValueAtTime(pan, this.audioCtx.currentTime);
      }

      // Connect pipeline
      source.connect(filter);
      filter.connect(gainNode);

      if (pannerNode) {
        gainNode.connect(pannerNode);
        pannerNode.connect(this.audioCtx.destination);
      } else {
        gainNode.connect(this.audioCtx.destination);
      }

      this.audioNodes.set(socketId, {
        source,
        filter,
        gain: gainNode,
        panner: pannerNode,
      });
    } catch (e) {
      console.warn('[WebRTC] Web Audio attachment fallback:', e.message);
    }
  }

  updateSpatialAudio(socketId, { gain, pan, isOccluded }) {
    const nodes = this.audioNodes.get(socketId);
    if (!nodes || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    if (gain !== undefined) {
      nodes.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, gain)), now, 0.05);
    }
    if (pan !== undefined && nodes.panner) {
      nodes.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), now, 0.05);
    }
    if (isOccluded !== undefined) {
      const targetFreq = isOccluded ? 450 : 20000;
      nodes.filter.frequency.setTargetAtTime(targetFreq, now, 0.1);
    }
  }

  closePeer(socketId) {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }

    const nodes = this.audioNodes.get(socketId);
    if (nodes) {
      try {
        nodes.source.disconnect();
        nodes.filter.disconnect();
        nodes.gain.disconnect();
        if (nodes.panner) nodes.panner.disconnect();
      } catch (e) {
        // ignore
      }
      this.audioNodes.delete(socketId);
    }
  }

  setMicMuted(isMuted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }
}

export const webrtcMesh = new WebRTCMeshService();
export default webrtcMesh;
