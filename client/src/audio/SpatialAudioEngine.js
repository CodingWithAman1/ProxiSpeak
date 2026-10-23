/**
 * Spatial Audio Engine for ProxiSpeak
 * Integrates Web Audio API, WebRTC RTCPeerConnection mesh, line-of-sight lowpass filtering,
 * inverse distance falloff, stereo azimuth panning, and autonomous bot voice synthesis.
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class SpatialAudioEngine {
  constructor({ onVoiceActivity, onSignalingMessage } = {}) {
    this.onVoiceActivity = onVoiceActivity;
    this.onSignalingMessage = onSignalingMessage;

    this.audioContext = null;
    this.localStream = null;
    this.localSource = null;
    this.localAnalyser = null;
    this.isMuted = false;
    this.isDeafened = false;

    // peerId -> { pc, source, filter, gain, panner, stream }
    this.peers = new Map();
    // botId -> { osc1, osc2, gainNode, filter, panner, isPlaying }
    this.botSynths = new Map();

    this.analyserInterval = null;
    this.masterGain = null;
  }

  /**
   * Initializes AudioContext and acquires user microphone
   */
  async init() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (!this.masterGain) {
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
      this.masterGain.connect(this.audioContext.destination);
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.localSource = this.audioContext.createMediaStreamSource(this.localStream);
      this.localAnalyser = this.audioContext.createAnalyser();
      this.localAnalyser.fftSize = 256;
      this.localAnalyser.smoothingTimeConstant = 0.4;
      this.localSource.connect(this.localAnalyser);

      this.startVoiceActivityDetection();
      return { success: true, stream: this.localStream };
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Monitors local microphone RMS level to detect speech
   */
  startVoiceActivityDetection() {
    if (this.analyserInterval) clearInterval(this.analyserInterval);
    const dataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
    let wasSpeaking = false;

    this.analyserInterval = setInterval(() => {
      if (this.isMuted || !this.localAnalyser) {
        if (wasSpeaking) {
          wasSpeaking = false;
          this.onVoiceActivity?.(false, 0);
        }
        return;
      }

      this.localAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalizedLevel = Math.min(1, avg / 128);
      const isSpeaking = normalizedLevel > 0.08;

      if (isSpeaking !== wasSpeaking) {
        wasSpeaking = isSpeaking;
        this.onVoiceActivity?.(isSpeaking, normalizedLevel);
      }
    }, 100);
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
  }

  setDeafened(deafened) {
    this.isDeafened = deafened;
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setTargetAtTime(deafened ? 0 : 1, this.audioContext.currentTime, 0.05);
    }
  }

  /**
   * Setup WebRTC peer audio graph for a peer that entered earshot
   */
  createPeerConnection(peerId, peerSocketId, isInitiator = false) {
    if (this.peers.has(peerId)) return this.peers.get(peerId);

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Forward local track to remote peer
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignalingMessage?.('signal:ice-candidate', {
          toSocketId: peerSocketId,
          toUserId: peerId,
          candidate: event.candidate,
        });
      }
    };

    let peerNodes = null;

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!this.audioContext) return;

      const source = this.audioContext.createMediaStreamSource(remoteStream);
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(20000, this.audioContext.currentTime);

      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(0.0, this.audioContext.currentTime);

      const panner = this.audioContext.createStereoPanner ? this.audioContext.createStereoPanner() : null;

      if (panner) {
        source.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain || this.audioContext.destination);
      } else {
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain || this.audioContext.destination);
      }

      peerNodes = { source, filter, gain, panner, stream: remoteStream };
      const record = this.peers.get(peerId);
      if (record) {
        Object.assign(record, peerNodes);
      }
    };

    const peerRecord = {
      pc,
      peerSocketId,
      nodes: peerNodes,
    };
    this.peers.set(peerId, peerRecord);

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          this.onSignalingMessage?.('signal:offer', {
            toSocketId: peerSocketId,
            toUserId: peerId,
            offer: pc.localDescription,
          });
        })
        .catch((err) => console.error(`Error creating offer for ${peerId}:`, err));
    }

    return peerRecord;
  }

  async handleOffer(fromSocketId, fromUserId, offer) {
    let peer = this.peers.get(fromUserId);
    if (!peer) {
      peer = this.createPeerConnection(fromUserId, fromSocketId, false);
    }

    await peer.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);

    this.onSignalingMessage?.('signal:answer', {
      toSocketId: fromSocketId,
      toUserId: fromUserId,
      answer,
    });
  }

  async handleAnswer(fromUserId, answer) {
    const peer = this.peers.get(fromUserId);
    if (peer?.pc) {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(fromUserId, candidate) {
    const peer = this.peers.get(fromUserId);
    if (peer?.pc && candidate) {
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn(`ICE candidate error for ${fromUserId}:`, err.message);
      }
    }
  }

  /**
   * Dynamically adjusts volume gain, cutoff frequency (wall occlusion), and stereo pan
   */
  updatePeerAcoustics(peerId, profile) {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    // 1. If it's a real WebRTC peer
    const peer = this.peers.get(peerId);
    if (peer && peer.gain) {
      const targetGain = this.isDeafened ? 0 : profile.inEarshot ? profile.gain : 0;
      peer.gain.gain.setTargetAtTime(targetGain, now, 0.05);

      if (peer.filter) {
        peer.filter.frequency.setTargetAtTime(profile.cutoffFreq || 20000, now, 0.08);
      }
      if (peer.panner && typeof profile.pan === 'number') {
        peer.panner.pan.setTargetAtTime(profile.pan, now, 0.05);
      }
    }

    // 2. If it's a simulated bot synth
    const bot = this.botSynths.get(peerId);
    if (bot) {
      const targetGain = this.isDeafened ? 0 : profile.inEarshot && bot.isSpeaking ? profile.gain * 0.45 : 0;
      bot.gain.gain.setTargetAtTime(targetGain, now, 0.05);

      if (bot.filter) {
        bot.filter.frequency.setTargetAtTime(profile.cutoffFreq || 20000, now, 0.08);
      }
      if (bot.panner && typeof profile.pan === 'number') {
        bot.panner.pan.setTargetAtTime(profile.pan, now, 0.05);
      }
    }
  }

  /**
   * Initializes or updates simulated harmonic audio for a test bot
   */
  updateBotAudio(botUser, profile) {
    if (!this.audioContext) return;

    let bot = this.botSynths.get(botUser.userId);
    if (!bot) {
      // Build harmonic oscillator synth (pleasing conversational acoustic tone)
      const baseFreq = 220 + ((botUser.userId.charCodeAt(botUser.userId.length - 1) % 5) * 40);
      const osc1 = this.audioContext.createOscillator();
      const osc2 = this.audioContext.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
      osc2.frequency.setValueAtTime(baseFreq * 1.5, this.audioContext.currentTime);

      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(profile.cutoffFreq || 20000, this.audioContext.currentTime);

      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(0, this.audioContext.currentTime);

      const panner = this.audioContext.createStereoPanner ? this.audioContext.createStereoPanner() : null;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      if (panner) {
        gain.connect(panner);
        panner.connect(this.masterGain || this.audioContext.destination);
      } else {
        gain.connect(this.masterGain || this.audioContext.destination);
      }

      osc1.start();
      osc2.start();

      bot = { osc1, osc2, filter, gain, panner, isSpeaking: false };
      this.botSynths.set(botUser.userId, bot);
    }

    bot.isSpeaking = botUser.isSpeaking;
    this.updatePeerAcoustics(botUser.userId, profile);
  }

  /**
   * Tears down peer connection and audio nodes
   */
  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      if (peer.gain && this.audioContext) {
        peer.gain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
      }
      setTimeout(() => {
        try {
          peer.pc.close();
        } catch (e) {
          // ignore
        }
      }, 100);
      this.peers.delete(peerId);
    }

    const bot = this.botSynths.get(peerId);
    if (bot) {
      try {
        bot.osc1.stop();
        bot.osc2.stop();
        bot.gain.disconnect();
      } catch (e) {
        // ignore
      }
      this.botSynths.delete(peerId);
    }
  }

  destroy() {
    if (this.analyserInterval) clearInterval(this.analyserInterval);
    for (const peerId of this.peers.keys()) {
      this.removePeer(peerId);
    }
    for (const botId of this.botSynths.keys()) {
      this.removePeer(botId);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export default SpatialAudioEngine;
