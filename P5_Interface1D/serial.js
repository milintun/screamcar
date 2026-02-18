// Serial connection handler for Arduino
// Uses Web Serial API (Chrome/Edge only)

let serial = {
  port: null,
  reader: null,
  connected: false,
  values: {},        // keyed by car id, e.g. { 1: 512, 2: 300 }
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
            // Expected format: "id value" e.g. "1 512" or "2 300"
            let parts = line.split(" ");
            if (parts.length === 2) {
              let id = parseInt(parts[0]);
              let val = parseInt(parts[1]);
              if (!isNaN(id) && !isNaN(val)) {
                this.values[id] = val;
              }
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
