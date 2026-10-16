/**
 * Web Audio API Engine for ProxiSpeak
 * Features:
 * - 3D Spatial audio (StereoPannerNode + GainNode + BiquadFilterNode)
 * - Acoustic wall occlusion (low-pass 450Hz sound dampening)
 * - Procedural ambient outdoor sound generator (Gentle Rain / Garden Breeze via open windows)
 * - Interactive plant rustle sound effects
 * - Barista coffee brewing sound effects
 * - Meeting table focus chime
 * - Live microphone visualizer
 */

class SpatialAudioEngine {
  constructor() {
    this.ctx = null;
    this.micStream = null;
    this.micAnalyser = null;
    this.micDataArray = null;
    this.isMuted = false;
    this.isDeafened = false;

    // Ambient Outdoor Sound Generator Nodes
    this.ambienceGain = null;
    this.ambienceFilter = null;
    this.ambienceNoiseSource = null;
    this.isAmbiencePlaying = false;
    this.ambientSoundEnabled = true;
  }

  // Ensure AudioContext is initialized on user gesture
  initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Procedural pink/brown noise generator for realistic gentle rain on glass & breeze
   */
  startWindowAmbience() {
    if (this.isAmbiencePlaying || !this.ambientSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      // 5-second looping buffer of soft pink/rain noise
      const bufferSize = ctx.sampleRate * 4;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      this.ambienceNoiseSource = ctx.createBufferSource();
      this.ambienceNoiseSource.buffer = noiseBuffer;
      this.ambienceNoiseSource.loop = true;

      // Filter for soothing rainfall / outdoor wind acoustic
      this.ambienceFilter = ctx.createBiquadFilter();
      this.ambienceFilter.type = 'lowpass';
      this.ambienceFilter.frequency.setValueAtTime(850, ctx.currentTime);

      this.ambienceGain = ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(0.001, ctx.currentTime);

      this.ambienceNoiseSource.connect(this.ambienceFilter);
      this.ambienceFilter.connect(this.ambienceGain);
      this.ambienceGain.connect(ctx.destination);

      this.ambienceNoiseSource.start(0);
      this.isAmbiencePlaying = true;
    } catch (e) {
      console.warn('Ambience init note:', e);
    }
  }

  /**
   * Adjust outdoor ambient sound volume based on distance to nearest OPEN window
   */
  updateWindowAmbience(player, windows) {
    if (!this.ctx || !this.ambienceGain || this.isDeafened) return;

    let minDistanceToOpenWindow = Infinity;
    let nearestWindow = null;

    for (const win of windows) {
      if (win.isOpen) {
        // Distance to window center
        const winCenterX = win.x + win.w / 2;
        const winCenterY = win.y + win.h / 2;
        const dist = Math.hypot(player.x - winCenterX, player.y - winCenterY);
        if (dist < minDistanceToOpenWindow) {
          minDistanceToOpenWindow = dist;
          nearestWindow = win;
        }
      }
    }

    const now = this.ctx.currentTime;
    if (minDistanceToOpenWindow < 380 && nearestWindow) {
      // Closer you are to an open window, the clearer the rain/garden breeze
      const normalized = Math.max(0, 1 - minDistanceToOpenWindow / 380);
      const targetGain = Math.pow(normalized, 1.4) * 0.22;
      this.ambienceGain.gain.setTargetAtTime(targetGain, now, 0.2);

      // Open window air presence filter
      const targetFreq = 700 + normalized * 1200;
      this.ambienceFilter.frequency.setTargetAtTime(targetFreq, now, 0.2);
    } else {
      // Window closed or far away -> peaceful whisper
      this.ambienceGain.gain.setTargetAtTime(0.002, now, 0.4);
    }
  }

  /**
   * Plays a delicate bird chirp from the courtyard window
   */
  playBirdChirp(pan = 0.3) {
    if (this.isDeafened) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    let panner;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, now);
    }

    osc.type = 'sine';
    // Frequency glide simulating melodious finch chirp
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(3600, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(2600, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(3400, now + 0.24);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    if (panner) {
      osc.connect(panner);
      panner.connect(gainNode);
    } else {
      osc.connect(gainNode);
    }
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Sound effect when interacting with a plant (leaf rustle)
   */
  playPlantRustle(pan = 0) {
    if (this.isDeafened) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.25;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(2.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    let panner;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, now);
    }

    if (panner) {
      noise.connect(filter);
      filter.connect(panner);
      panner.connect(gain);
    } else {
      noise.connect(filter);
      filter.connect(gain);
    }
    gain.connect(ctx.destination);

    noise.start(now);
  }

  /**
   * Sound effect for brewing artisan espresso at the coffee bar
   */
  playEspressoBrew(pan = 0.5) {
    if (this.isDeafened) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Steam hiss
    const bufferSize = ctx.sampleRate * 0.7;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);

    const steamGain = ctx.createGain();
    steamGain.gain.setValueAtTime(0.001, now);
    steamGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    steamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    // Warm ceramic cup clink chime
    const bell = ctx.createOscillator();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(1320, now + 0.2); // E6
    const bellGain = ctx.createGain();
    bellGain.gain.setValueAtTime(0.001, now);
    bellGain.gain.setValueAtTime(0.1, now + 0.2);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    noise.connect(filter);
    filter.connect(steamGain);
    steamGain.connect(ctx.destination);

    bell.connect(bellGain);
    bellGain.connect(ctx.destination);

    noise.start(now);
    bell.start(now + 0.2);
    bell.stop(now + 0.75);
  }

  /**
   * Zen chime when sitting down at the meeting conference table
   */
  playMeetingChime() {
    if (this.isDeafened) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.65);
    });
  }

  /**
   * Window slide latch sound
   */
  playWindowSlide() {
    if (this.isDeafened) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Sound effect for opening/closing doors with spatial panning
   */
  playDoorSound(isOpen = true, pan = 0) {
    if (this.isDeafened) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    let panner;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    }

    if (isOpen) {
      // Unlatch click
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(800, now);
      clickOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);

      clickGain.gain.setValueAtTime(0.001, now);
      clickGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      // Gentle door creak/swing
      const creakOsc = ctx.createOscillator();
      const creakGain = ctx.createGain();
      creakOsc.type = 'sine';
      creakOsc.frequency.setValueAtTime(160, now + 0.04);
      creakOsc.frequency.linearRampToValueAtTime(90, now + 0.22);

      creakGain.gain.setValueAtTime(0.001, now + 0.04);
      creakGain.gain.linearRampToValueAtTime(0.08, now + 0.1);
      creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      if (panner) {
        clickOsc.connect(clickGain);
        creakOsc.connect(creakGain);
        clickGain.connect(panner);
        creakGain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        clickOsc.connect(clickGain);
        creakOsc.connect(creakGain);
        clickGain.connect(ctx.destination);
        creakGain.connect(ctx.destination);
      }

      clickOsc.start(now);
      clickOsc.stop(now + 0.09);
      creakOsc.start(now + 0.04);
      creakOsc.stop(now + 0.25);
    } else {
      // Solid wooden door latch closure bump
      const bumpOsc = ctx.createOscillator();
      const bumpGain = ctx.createGain();
      bumpOsc.type = 'sine';
      bumpOsc.frequency.setValueAtTime(110, now);
      bumpOsc.frequency.exponentialRampToValueAtTime(50, now + 0.12);

      bumpGain.gain.setValueAtTime(0.001, now);
      bumpGain.gain.linearRampToValueAtTime(0.16, now + 0.02);
      bumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      if (panner) {
        bumpOsc.connect(bumpGain);
        bumpGain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        bumpOsc.connect(bumpGain);
        bumpGain.connect(ctx.destination);
      }

      bumpOsc.start(now);
      bumpOsc.stop(now + 0.15);
    }
  }

  /**
   * Sound effect for high-tech automatic sliding glass gate
   * Produces smooth pneumatic air hiss and futuristic servo glide
   */
  playGlassGateSound(isOpen = true, pan = 0) {
    if (this.isDeafened) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    let panner;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    }

    // Pneumatic air release / whoosh
    const bufferSize = Math.floor(ctx.sampleRate * 0.22);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.05;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(isOpen ? 2200 : 1600, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.06, now + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    // High-tech servo glide tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    if (isOpen) {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
    } else {
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);
    }

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.05, now + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    if (panner) {
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(panner);

      osc.connect(oscGain);
      oscGain.connect(panner);

      panner.connect(ctx.destination);
    } else {
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
    }

    noise.start(now);
    noise.stop(now + 0.22);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Sound effect for drinking from water cooler
   */
  playWaterDispenseSound(pan = 0) {
    if (this.isDeafened) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 3 water bubbles
    [0, 0.08, 0.16].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 600 + i * 150;
      osc.frequency.setValueAtTime(baseFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 350, now + delay + 0.06);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(0.09, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.08);
    });
  }

  /**
   * Connect real user microphone for real-time visual VU meter & activity
   */
  async initMicrophone() {
    try {
      this.initContext();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.micStream = stream;
      const source = this.ctx.createMediaStreamSource(stream);
      this.micAnalyser = this.ctx.createAnalyser();
      this.micAnalyser.fftSize = 64;
      this.micAnalyser.smoothingTimeConstant = 0.5;

      source.connect(this.micAnalyser);
      this.micDataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);
      return { success: true };
    } catch (err) {
      console.warn('Microphone access note:', err.message);
      return { success: false, error: err.message };
    }
  }

  getMicVolume() {
    if (this.isMuted || !this.micAnalyser || !this.micDataArray) {
      return 0;
    }
    this.micAnalyser.getByteFrequencyData(this.micDataArray);
    let sum = 0;
    for (let i = 0; i < this.micDataArray.length; i++) {
      sum += this.micDataArray[i];
    }
    const average = sum / this.micDataArray.length;
    return Math.min(1, average / 128);
  }

  stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
      this.micAnalyser = null;
    }
  }

  /**
   * Plays a spatial voice chirp representing speech from a peer
   */
  playSpatialChirp(pan = 0, gain = 0.5, isOccluded = false) {
    if (this.isDeafened || gain <= 0.01) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = isOccluded ? 'triangle' : 'sine';
    // Gentle melodic human formant harmonics
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.25);

    // Acoustic low-pass filter (muffles voice through frosted glass & partitions)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    if (isOccluded) {
      filter.frequency.setValueAtTime(450, now); // Muffled interior rumble
      filter.Q.setValueAtTime(1.5, now);
    } else {
      filter.frequency.setValueAtTime(4500, now); // Crisp speech clarity
      filter.Q.setValueAtTime(0.7, now);
    }

    let panner;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    }

    const gainNode = ctx.createGain();
    const effectiveGain = Math.max(0.001, Math.min(1, gain * 0.35));
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(effectiveGain, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(filter);
    if (panner) {
      filter.connect(panner);
      panner.connect(gainNode);
    } else {
      filter.connect(gainNode);
    }
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }
}

export const spatialAudio = new SpatialAudioEngine();
export default spatialAudio;
