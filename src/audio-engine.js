const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;

export class GameAudio {
  #context = null;
  #masterGain = null;
  #buffers = new Map();
  #sources = new Set();
  #startAt = null;
  #muted = false;

  constructor({ bgmUrl, birdCallUrl }) {
    this.urls = Object.freeze({ bgm: bgmUrl, birdCall: birdCallUrl });
  }

  async load() {
    if (!AudioContextClass) {
      throw new Error("このブラウザはWeb Audio APIに対応していません。");
    }

    this.#context = new AudioContextClass({ latencyHint: "interactive" });
    this.#masterGain = this.#context.createGain();
    this.#masterGain.gain.value = this.#muted ? 0 : 1;
    this.#masterGain.connect(this.#context.destination);

    const entries = await Promise.all(
      Object.entries(this.urls).map(async ([name, url]) => {
        const response = await fetch(url, {
          cache: "force-cache",
          credentials: "same-origin",
          redirect: "error",
        });

        if (!response.ok) {
          throw new Error(`音源の読み込みに失敗しました (${response.status})`);
        }

        const encoded = await response.arrayBuffer();
        const decoded = await this.#context.decodeAudioData(encoded);
        return [name, decoded];
      }),
    );

    this.#buffers = new Map(entries);
  }

  async start(cueTimesMs) {
    if (!this.#context || !this.#masterGain || !this.#buffers.size) {
      throw new Error("音源の準備が完了していません。");
    }

    this.stop();
    await this.#context.resume();

    this.#startAt = this.#context.currentTime + 0.16;
    this.#schedule("bgm", this.#startAt, 0.72);

    for (const cueTimeMs of cueTimesMs) {
      this.#schedule("birdCall", this.#startAt + cueTimeMs / 1_000, 0.82);
    }

    return this.#startAt;
  }

  async pause() {
    if (this.#context?.state === "running") {
      await this.#context.suspend();
    }
  }

  async resume() {
    if (this.#context?.state === "suspended") {
      await this.#context.resume();
    }
  }

  stop() {
    for (const source of this.#sources) {
      try {
        source.stop();
      } catch {
        // A source that already ended does not need another stop call.
      }
    }
    this.#sources.clear();
    this.#startAt = null;
  }

  setMuted(muted) {
    this.#muted = Boolean(muted);
    if (this.#masterGain && this.#context) {
      this.#masterGain.gain.setValueAtTime(this.#muted ? 0 : 1, this.#context.currentTime);
    }
  }

  elapsedMs() {
    if (!this.#context || this.#startAt === null) {
      return 0;
    }
    return (this.#context.currentTime - this.#startAt) * 1_000;
  }

  #schedule(name, when, volume) {
    const buffer = this.#buffers.get(name);
    if (!buffer || !this.#context || !this.#masterGain) {
      return;
    }

    const source = this.#context.createBufferSource();
    const gain = this.#context.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.#masterGain);
    source.addEventListener("ended", () => this.#sources.delete(source), { once: true });
    this.#sources.add(source);
    source.start(when);
  }
}
