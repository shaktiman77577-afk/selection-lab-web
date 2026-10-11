/**
 * lib/typingSound.ts — typing screen ki awaazein (key sound + room sound).
 *
 * Sab kuch browser me hota hai: files ek baar /sounds/typing/ se aati hain
 * (Vercel CDN, Railway ko pata bhi nahi), decode hokar memory me rehti hain,
 * aur har keypress par wahi buffer bajta hai — koi network request nahi.
 *
 * Default sab OFF. Student ki choice localStorage me (sirf is browser ki
 * suvidha — na mile to bhi page theek chalta hai).
 *
 * Scoring / keystroke ginti / timer se iska koi lena-dena nahi. Yahan kuch
 * bhi fail ho (file na mile, purana browser) to chup-chaap kuch nahi bajta.
 *
 * Room sound 3 hisson me:
 *  - room_base   (60s, mono)   : AC/fan ki hum + door ka Indian traffic
 *  - room_typing (48s, stereo) : 4 doosre candidates ki typing
 *  - events                    : chair / kadmon ki awaaz, har 15–40s random,
 *                                kabhi left kabhi right — taaki loop repeat na lage
 */

export type SoundSettings = {
  keys: boolean;
  keysVol: number;   // 0..1
  room: boolean;
  roomVol: number;   // 0..1
};

const STORE_KEY = "sl_typing_sound_v1";
const DEFAULTS: SoundSettings = { keys: false, keysVol: 0.7, room: false, roomVol: 0.5 };

// Files badlo to ye number badha do — browser purani cached file chhod dega.
// v1 par files upload hone se pehle 404 aaya tha aur browsers ne wahi 404
// 1 saal ke liye cache kar liya — isliye v2.
const VERSION = "2";
const BASE_URL = "/sounds/typing/";

// Loop files ki asli lambai (mp3 encoder aage-peeche thoda khaali jod deta hai,
// isliye buffer.duration par bharosa nahi — yahi lambai loop hogi)
const LOOP_LEN: Record<string, number> = { room_base: 60, room_typing: 48 };
const EVENTS = ["chair_drag_1", "chair_drag_2", "chair_drag_3", "chair_squeak_1", "chair_squeak_2", "footsteps"];

// Poore volume par kitna tez. Key sound room se kaafi upar rehna chahiye —
// student ko apni typing saaf sunai de.
const KEY_MAX = 1.0;
const ROOM_MAX = 2.4;
const MAX_KEY_VOICES = 10;

// ───────────────────────── settings store ─────────────────────────

let settings: SoundSettings = { ...DEFAULTS };
let loaded = false;
const listeners = new Set<(s: SoundSettings) => void>();

function clamp01(n: unknown, d: number): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d;
}

function readStore(): SoundSettings {
  if (loaded) return settings;
  loaded = true;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORE_KEY) : null;
    if (raw) {
      const p = JSON.parse(raw) || {};
      settings = {
        keys: p.keys === true,
        keysVol: clamp01(p.keysVol, DEFAULTS.keysVol),
        room: p.room === true,
        roomVol: clamp01(p.roomVol, DEFAULTS.roomVol),
      };
    }
  } catch {}
  return settings;
}

export function getSoundSettings(): SoundSettings {
  return readStore();
}

export function subscribeSound(fn: (s: SoundSettings) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Switch / slider se badlav. Ye hamesha kisi tap/click ke andar se aata hai,
 *  isliye yahin AudioContext "unlock" ho jaata hai (iPhone/WebView ka niyam). */
export function updateSoundSettings(patch: Partial<SoundSettings>) {
  const prev = readStore();
  settings = { ...prev, ...patch };
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch {}
  listeners.forEach((fn) => { try { fn(settings); } catch {} });

  if (settings.keys || settings.room) {
    const ctx = ensureCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  }
  if (settings.keys && !prev.keys) {
    void load("key"); void load("space");
    // Chhota sa "click" — student ko turant pata chale kitna tez hai
    setTimeout(() => playKey("key"), 60);
  }
  applyVolumes();
  syncRoom();
}

// ───────────────────────── audio engine ─────────────────────────

let ctx: AudioContext | null = null;
let keyBus: GainNode | null = null;
let roomBus: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();
const failedAt = new Map<string, number>();   // fail hui file ko har key par dobara na maangein
let keyVoices = 0;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  const AC: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC({ latencyHint: "interactive" } as AudioContextOptions);
  } catch {
    try { ctx = new AC(); } catch { return null; }
  }
  keyBus = ctx.createGain();
  roomBus = ctx.createGain();
  keyBus.connect(ctx.destination);
  roomBus.connect(ctx.destination);
  applyVolumes();
  document.addEventListener("visibilitychange", syncRoom);
  return ctx;
}

// Slider seedha (linear) lagao to aadha slider bhi lagbhag poora tez lagta hai —
// square se kaan ke hisaab se barabar badhta hai
function curve(v: number) { return v * v; }

function applyVolumes() {
  if (!ctx || !keyBus || !roomBus) return;
  const t = ctx.currentTime;
  keyBus.gain.setTargetAtTime(settings.keys ? curve(settings.keysVol) * KEY_MAX : 0, t, 0.02);
  roomBus.gain.setTargetAtTime(curve(settings.roomVol) * ROOM_MAX, t, 0.05);
}

function decode(c: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // Purana Safari sirf callback wala decodeAudioData jaanta hai
  return new Promise((resolve, reject) => {
    const p = c.decodeAudioData(data, resolve, reject) as unknown;
    if (p && typeof (p as Promise<AudioBuffer>).then === "function") {
      (p as Promise<AudioBuffer>).then(resolve, reject);
    }
  });
}

function load(name: string): Promise<AudioBuffer | null> {
  const have = buffers.get(name);
  if (have) return Promise.resolve(have);
  const c = ensureCtx();
  if (!c) return Promise.resolve(null);
  let p = pending.get(name);
  if (!p) {
    const last = failedAt.get(name);
    if (last && Date.now() - last < 15000) return Promise.resolve(null);
    const url = `${BASE_URL}${name}.mp3?v=${VERSION}`;
    p = fetch(url)
      // Galat jawab (jaise pehle ka cached 404) mila to cache chhod kar seedha
      // server se ek baar aur maango
      .then((r) => (r.ok ? r : fetch(url, { cache: "reload" })))
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then((data) => decode(c, data))
      .then((buf) => { buffers.set(name, buf); failedAt.delete(name); return buf; })
      .catch(() => { pending.delete(name); failedAt.set(name, Date.now()); return null; });
    pending.set(name, p);
  }
  return p;
}

/** Ek key ki awaaz. Har baar pitch/volume halka sa alag — robotic na lage. */
export function playKey(kind: "key" | "space" = "key") {
  if (!readStore().keys) return;
  const c = ensureCtx();
  if (!c || !keyBus) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  if (!buffers.has(kind)) void load(kind);
  const buf = buffers.get(kind) || buffers.get("key");
  if (!buf) return;
  if (keyVoices >= MAX_KEY_VOICES) return;
  try {
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 1 + (Math.random() - 0.5) * (kind === "space" ? 0.05 : 0.09);
    const g = c.createGain();
    g.gain.value = 0.82 + Math.random() * 0.18;
    src.connect(g).connect(keyBus);
    keyVoices += 1;
    src.onended = () => { keyVoices = Math.max(0, keyVoices - 1); try { g.disconnect(); } catch {} };
    src.start();
  } catch {}
}

/** Textarea ka purana aur naya text dekh kar sahi awaaz — phone ke keyboard
 *  keydown me key ka naam nahi bhejte, isliye text ke badlav se pakadte hain. */
export function playKeyForChange(prev: string, next: string) {
  if (!readStore().keys || prev === next) return;
  if (next.length > prev.length) {
    let i = 0;
    while (i < prev.length && prev[i] === next[i]) i++;
    const added = next.slice(i, i + (next.length - prev.length));
    const last = added[added.length - 1];
    playKey(last === " " || last === "\n" ? "space" : "key");
  } else {
    playKey("key");     // Backspace / Delete / badla hua akshar
  }
}

// ───────────────────────── room sound ─────────────────────────

let roomWanted = false;            // page kehta hai: abhi typing screen khuli hai
let roomNodes: { srcs: AudioBufferSourceNode[]; fade: GainNode } | null = null;
let roomStarting = false;
let eventTimer: ReturnType<typeof setTimeout> | null = null;

/** Page batata hai ki typing screen abhi khuli hai ya nahi.
 *  Room sound tabhi bajta hai jab ye true ho, setting ON ho aur tab dikh raha ho.
 *  Khulte hi key sounds bhi pehle se load kar lete hain — pehli key par deri na ho. */
export function setTypingScreenOpen(on: boolean) {
  roomWanted = on;
  if (on && readStore().keys) { void load("key"); void load("space"); }
  syncRoom();
}

function shouldPlayRoom() {
  return roomWanted && readStore().room && typeof document !== "undefined" && !document.hidden;
}

function syncRoom() {
  if (shouldPlayRoom()) void startRoom();
  else stopRoom();
}

/** Loop ki shuruaat — decoder ne aage jo khaali hissa joda ho, use chhod do */
function loopStart(buf: AudioBuffer): number {
  const d = buf.getChannelData(0);
  const lim = Math.min(d.length, Math.floor(buf.sampleRate * 0.2));
  for (let i = 0; i < lim; i++) if (Math.abs(d[i]) > 1e-4) return i / buf.sampleRate;
  return 0;
}

async function startRoom() {
  if (roomNodes || roomStarting) return;
  const c = ensureCtx();
  if (!c || !roomBus) return;
  roomStarting = true;
  try {
    if (c.state === "suspended") await c.resume().catch(() => {});
    const [base, typing] = await Promise.all([load("room_base"), load("room_typing")]);
    EVENTS.forEach((e) => { void load(e); });
    if (!shouldPlayRoom() || roomNodes) return;     // beech me band ho gaya
    const fade = c.createGain();
    fade.gain.value = 0;
    fade.connect(roomBus);
    const srcs: AudioBufferSourceNode[] = [];
    for (const [name, buf, level] of [["room_base", base, 1.0], ["room_typing", typing, 0.85]] as const) {
      if (!buf) continue;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const s = loopStart(buf);
      src.loopStart = s;
      src.loopEnd = Math.min(buf.duration, s + LOOP_LEN[name]);
      const g = c.createGain();
      g.gain.value = level;
      src.connect(g).connect(fade);
      // Har baar loop ke alag hisse se shuru — har test ek jaisa na lage
      src.start(0, s + Math.random() * (src.loopEnd - s - 1));
      srcs.push(src);
    }
    if (!srcs.length) { try { fade.disconnect(); } catch {} return; }
    fade.gain.setTargetAtTime(1, c.currentTime, 0.5);   // dheere-dheere aata hai
    roomNodes = { srcs, fade };
    scheduleEvent(8 + Math.random() * 10);
  } finally {
    roomStarting = false;
  }
}

function stopRoom() {
  if (eventTimer) { clearTimeout(eventTimer); eventTimer = null; }
  const nodes = roomNodes;
  roomNodes = null;
  if (!nodes || !ctx) return;
  const t = ctx.currentTime;
  try {
    nodes.fade.gain.cancelScheduledValues(t);
    nodes.fade.gain.setValueAtTime(nodes.fade.gain.value, t);
    nodes.fade.gain.linearRampToValueAtTime(0, t + 0.4);
  } catch {}
  nodes.srcs.forEach((s) => { try { s.stop(t + 0.45); } catch {} });
  setTimeout(() => { try { nodes.fade.disconnect(); } catch {} }, 600);
}

function scheduleEvent(afterSec: number) {
  if (eventTimer) clearTimeout(eventTimer);
  eventTimer = setTimeout(() => {
    eventTimer = null;
    if (!roomNodes || !ctx) return;
    const ready = EVENTS.filter((e) => buffers.has(e));
    if (ready.length) {
      const buf = buffers.get(ready[Math.floor(Math.random() * ready.length)])!;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = 0.94 + Math.random() * 0.12;
        const g = ctx.createGain();
        g.gain.value = 0.35 + Math.random() * 0.3;
        let out: AudioNode = g;
        if (typeof ctx.createStereoPanner === "function") {
          const p = ctx.createStereoPanner();
          p.pan.value = (Math.random() * 2 - 1) * 0.75;
          g.connect(p);
          out = p;
        }
        src.connect(g);
        out.connect(roomNodes.fade);
        src.onended = () => { try { out.disconnect(); g.disconnect(); } catch {} };
        src.start();
      } catch {}
    }
    scheduleEvent(15 + Math.random() * 25);
  }, afterSec * 1000);
}
