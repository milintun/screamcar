// Serial connection handler for Arduino
// Uses Web Serial API (Chrome/Edge only)

let serial = {
  port: null,
  reader: null,
  connected: false,
  values: {},        // keyed by car id, e.g. { 1: 512, 2: 300 }
  buttons: {},       // keyed by car id, true on press edge; consumed after read
  buttonStates: {},  // keyed by car id, tracks raw hardware state for edge detection
  buffer: "",        // partial line buffer

  // Try to reconnect to a previously granted port (no popup needed)
  async autoConnect() {
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        this.port = ports[0];
        await this.port.open({ baudRate: 9600 });
        this.connected = true;
        console.log("Serial auto-reconnected!");
        this._readLoop();
        return true;
      }
    } catch (err) {
      console.log("Auto-connect failed, click button to connect manually.");
    }
    return false;
  },

  // Manual connect (shows port picker popup)
  async connect() {
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      this.connected = true;
      console.log("Serial connected!");
      this._readLoop();
    } catch (err) {
      console.error("Serial connection failed:", err);
    }
  },

  async send(message) {
    console.log(`[serial.send] → "${message}"`);
    if (!this.connected || !this.port || !this.port.writable) {
      console.warn(`[serial.send] not connected, dropped: "${message}"`);
      return;
    }
    const writer = this.port.writable.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(`${message}\n`));
    writer.releaseLock();
  },

  async _readLoop() {
    const decoder = new TextDecoderStream();
    this.port.readable.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();

    while (true) {
      try {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          this.buffer += value;
          // Process complete lines (Arduino println sends \r\n)
          let lines = this.buffer.split(/\r?\n/);
          // Keep the last incomplete chunk in the buffer
          this.buffer = lines.pop();
          for (let line of lines) {
            line = line.trim();
            if (line.length === 0) continue;
            // Expected format: "id pos buttonState" e.g. "1 512 1" or "2 300 0"
            // buttonState 0 = pressed
            let parts = line.split(" ");
            if (parts.length === 3) {
              let id = parseInt(parts[0]);
              let val = parseInt(parts[1]);
              let btnState = parseInt(parts[2]);
              if (!isNaN(id) && !isNaN(val)) {
                this.values[id] = val;
              }
              // Falling edge: only trigger on transition from non-zero → 0
              if (!isNaN(id) && btnState === 0 && this.buttonStates[id] !== 0) {
                this.buttons[id] = true;
              }
              if (!isNaN(id)) this.buttonStates[id] = btnState;
            }
          }
        }
      } catch (err) {
        console.error("Serial read error:", err);
        break;
      }
    }
  }
};

// Computer microphone via Web Audio API
let mic = {
  level: 0,          // 0-1023, updated every animation frame
  active: false,
  analyser: null,
  dataArray: null,

  async start() {
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let ctx = new AudioContext();
      let source = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.active = true;
      console.log("Microphone started!");
      this._updateLoop();
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  },

  _updateLoop() {
    if (!this.active) return;
    this.analyser.getByteTimeDomainData(this.dataArray);
    // Calculate RMS loudness
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      let v = (this.dataArray[i] - 128) / 128;
      sum += v * v;
    }
    let rms = Math.sqrt(sum / this.dataArray.length);
    // Map 0-1 RMS to 0-1023
    this.level = Math.floor(rms * 1023 * 4); // *4 to boost sensitivity
    if (this.level > 1023) this.level = 1023;
    requestAnimationFrame(() => this._updateLoop());
  }
};
