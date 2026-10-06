// Zustand und Aktionen. Jede Änderung läuft hierüber und wird per Bus verteilt,
// damit Übersicht, Grundriss, Sprachsteuerung usw. synchron bleiben.
// Später: hier die Aufrufe an Home Assistant einhängen.
import { D, bus, clamp, kelvinToHex, toast } from "./core.js";

export const byId = (list, id) => list.find((x) => x.id === id);
export const byRoom = (list, room) => list.filter((x) => x.room === room);
export const roomName = (id) => D.floorplan.rooms.find((r) => r.id === id)?.name || id;

// ---------- Licht ----------
export const lightColor = (l) => (l.rgb && l.mode === "color" && l.color ? l.color : kelvinToHex(l.ct || 2700));
export function setLight(l, patch, { quiet = false } = {}) {
  Object.assign(l, patch);
  if (l.on && !l.brightness) l.brightness = 100;
  bus.emit("light", l);
  if (!quiet) bus.emit("manual");
}
export const toggleLight = (l) => setLight(l, { on: !l.on });

// ---------- Rollläden (fahren animiert wie ein Motor) ----------
D.covers.forEach((c) => { c.target = c.position; });
export function moveCover(c, target, { quiet = false } = {}) {
  clearInterval(c.timer);
  c.target = clamp(Math.round(target), 0, 100);
  c.timer = setInterval(() => {
    const diff = c.target - c.position;
    c.position = Math.abs(diff) <= 2 ? c.target : c.position + Math.sign(diff) * 2;
    if (c.position === c.target) clearInterval(c.timer);
    bus.emit("cover", c);
  }, 40);
  if (!quiet) bus.emit("manual");
}
export function setCover(c, v) {
  clearInterval(c.timer);
  c.position = c.target = clamp(Math.round(v), 0, 100);
  bus.emit("cover", c);
  bus.emit("manual");
}

// ---------- Klima ----------
export const isHeating = (t) => t.current < t.target - 0.15;
export function setTarget(t, v) {
  t.target = clamp(Math.round(v * 2) / 2, 15, 28);
  bus.emit("climate", t);
}
setInterval(() => {
  for (const t of D.climate) {
    const d = t.target - t.current;
    if (Math.abs(d) < 0.05) continue;
    t.current = Math.round((t.current + Math.sign(d) * (d > 0 ? 0.1 : 0.05)) * 100) / 100;
    bus.emit("climate", t);
  }
}, 6000);

// ---------- Musik ----------
export const M = D.music;
export function setMusic(patch) { Object.assign(M, patch); bus.emit("music", M); }
export function skipTrack(d) {
  M.track = (M.track + d + M.queue.length) % M.queue.length;
  M.elapsed = 0;
  bus.emit("music", M);
}

// ---------- Szenen ----------
export let activeScene = null;
bus.on("manual", () => { if (activeScene) { activeScene = null; bus.emit("scene", null); } });
export function runScene(s) {
  for (const l of D.lights) {
    const b = s.lights[l.name];
    setLight(l, b ? { on: true, brightness: b } : { on: false }, { quiet: true });
  }
  if (s.covers != null) D.covers.forEach((c) => moveCover(c, s.covers, { quiet: true }));
  if (s.music === false) setMusic({ playing: false });
  activeScene = s;
  bus.emit("scene", s);
  toast(s.name, { sub: `„Alexa, ${s.say}“`, icon: s.icon, ms: 2800 });
}

// ---------- Sensoren, Schloss, Alarm ----------
export const isOpen = (s) => s.state === "open" || s.state === "tilted";
export function setSensor(s, state) {
  s.state = state;
  bus.emit("sensor", s);
  const A = D.alarm;
  if (isOpen(s) && (A.mode === "away" || (A.mode === "home" && s.type === "door"))) triggerAlarm(`${s.name} geöffnet`);
}

let relockTimer;
export function setLock(locked) {
  const L = D.lock;
  clearInterval(relockTimer);
  L.locked = locked;
  L.relockIn = locked ? 0 : L.autoRelock;
  if (!locked && L.autoRelock) {
    relockTimer = setInterval(() => {
      if (--L.relockIn <= 0) { clearInterval(relockTimer); L.locked = true; toast("Haustür verriegelt", { sub: "Automatisch", icon: "lock", ms: 2500 }); }
      bus.emit("lock", L);
    }, 1000);
  }
  bus.emit("lock", L);
}

let armTimer;
export const ALARM_LABEL = { disarmed: "Unscharf", arming: "Wird scharf geschaltet", home: "Scharf · Zuhause", away: "Scharf · Abwesend", triggered: "Alarm ausgelöst" };
export function armAlarm(target) {
  const A = D.alarm;
  clearInterval(armTimer);
  A.target = target;
  A.mode = "arming";
  A.left = A.exitDelay;
  bus.emit("alarm", A);
  armTimer = setInterval(() => {
    if (--A.left > 0) return bus.emit("alarm", A);
    clearInterval(armTimer);
    A.mode = target;
    bus.emit("alarm", A);
    toast("Alarmanlage scharf", { sub: target === "away" ? "Abwesend" : "Zuhause", icon: "shieldCheck", ms: 3000 });
  }, 1000);
}
export function disarmAlarm() {
  clearInterval(armTimer);
  Object.assign(D.alarm, { mode: "disarmed", reason: null, left: 0 });
  bus.emit("alarm", D.alarm);
  toast("Alarmanlage unscharf", { icon: "shield", ms: 2500 });
}
export function triggerAlarm(reason) {
  Object.assign(D.alarm, { mode: "triggered", reason });
  bus.emit("alarm", D.alarm);
  bus.emit("wake");
}

// ---------- Kamera-Ereignisse ----------
export const camEvents = [];
export function addCamEvent(ev) {
  camEvents.push({ id: Math.random().toString(36).slice(2), at: new Date(), ...ev });
  camEvents.sort((a, b) => a.at - b.at);
  bus.emit("camevent", ev);
}

// ---------- Anwesenheit ----------
setInterval(() => {
  for (const p of D.people) {
    if (p.home || p.eta == null) continue;
    p.eta = Math.max(0, p.eta - 1);
    if (p.eta === 0) {
      Object.assign(p, { home: true, room: "hall" });
      toast(`${p.name} ist zu Hause`, { icon: "home", ms: 3500 });
    }
    bus.emit("people", p);
  }
}, 60000);

// ---------- Wetter (Demo umschaltbar) ----------
export function setWeather(condition) {
  D.weather.condition = condition;
  D.weather.days[0].cond = condition;
  bus.emit("weather", D.weather);
}
