// Gemeinsame Helfer: DOM, Icons, Farben, Zeit, Event-Bus, Toasts.
export const D = window.DATA;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function build(n, attrs, kids) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") n.setAttribute("class", v);
    else if (k === "html") n.innerHTML = v;
    else if (k === "style" && typeof v === "object") for (const [prop, val] of Object.entries(v)) n.style.setProperty(prop.startsWith("--") ? prop : prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), val);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  n.append(...kids.flat(Infinity).filter((k) => k != null && k !== false));
  return n;
}
export const h = (tag, attrs = {}, ...kids) => build(document.createElement(tag), attrs, kids);
export const sv = (tag, attrs = {}, ...kids) => build(document.createElementNS("http://www.w3.org/2000/svg", tag), attrs, kids);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const pad = (n) => String(n).padStart(2, "0");
export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const mmss = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
export const num = (n, digits = 1) => n.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const isKiosk = () => matchMedia("(min-width: 1000px) and (min-height: 600px)").matches;
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Event-Bus ----------
const handlers = new Map();
export const bus = {
  on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, []);
    handlers.get(type).push(fn);
    return () => { const list = handlers.get(type); const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); };
  },
  emit(type, payload) { (handlers.get(type) || []).forEach((fn) => fn(payload)); },
};

// ---------- Speicher (pro Gerät) ----------
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(`zh:${key}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(`zh:${key}`, JSON.stringify(value)); } catch { /* privat/gesperrt */ } },
};

export const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* nicht unterstützt */ } };

// ---------- Icons (Lucide-Stil) ----------
export const ICON = {
  bulb: '<path d="M9 18h6M10 22h4M15.1 14c.2-1 .7-1.7 1.4-2.5A4.7 4.7 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.4 2.5"/>',
  blinds: '<path d="M3 3h18M20 7H8M20 11H8M10 19h10M8 15h12M4 3v14"/><circle cx="4" cy="19" r="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  tv: '<rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/>',
  power: '<path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  cloudSun: '<path d="M12 2v2M4.9 4.9l1.4 1.4M20 12h2M19.1 4.9l-1.4 1.4M15.9 12.7a4 4 0 0 0-5.9-4.1"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>',
  rain: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6M8 14v6M12 16v6"/>',
  snow: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/>',
  storm: '<path d="M6 16.3A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 .5 9"/><path d="m13 12-3 5h4l-3 5"/>',
  expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  shrink: '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  camera: '<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  plan: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 11h8M11 3v18M11 15h10"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  shieldAlert: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  thermo: '<path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  wind: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  door: '<path d="M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01M13 4.6v16.9a.5.5 0 0 1-.6.5L5 20V5.6a1 1 0 0 1 .8-1l6-1.5a1 1 0 0 1 1.2 1Z"/>',
  window: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M4 12h16"/>',
  smoke: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
  battery: '<rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  pylon: '<path d="M12 2v20M5 6h14M7 6l-3 6M17 6l3 6M4 12h16M9 22l3-10 3 10"/>',
  pkg: '<path d="m7.5 4.3 9 5.1M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
  tram: '<rect x="4" y="3" width="16" height="16" rx="3"/><path d="M4 11h16M12 3v8M8 15h.01M16 15h.01M8 19l-2 3M18 22l-2-3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.7h2a5.6 5.6 0 0 0 5.5-5.3C22 6 17.5 2 12 2Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sunset: '<path d="M12 10V2M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2M16 6l-4 4-4-4M16 18a4 4 0 0 0-8 0"/>',
  phoneOff: '<path d="M22 2 2 22"/><path d="M8.6 15.4A19 19 0 0 1 4.2 9 2 2 0 0 1 5 6.8L7 5a2 2 0 0 1 2.8.1l1.4 1.6a2 2 0 0 1 0 2.6L10 10.6M13.4 14l1-1.1a2 2 0 0 1 2.6 0l1.6 1.4A2 2 0 0 1 18.8 17l-1.8 2a2 2 0 0 1-2.2.6 19 19 0 0 1-3.2-1.6"/>',
  keypad: '<path d="M6 5h.01M12 5h.01M18 5h.01M6 11h.01M12 11h.01M18 11h.01M6 17h.01M12 17h.01M18 17h.01"/>',
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  prev: '<path d="M6 5h2v14H6zM20 6v12a1 1 0 0 1-1.5.8L9 12.8a1 1 0 0 1 0-1.6l9.5-6A1 1 0 0 1 20 6Z"/>',
  next: '<path d="M16 5h2v14h-2zM4 6v12a1 1 0 0 0 1.5.8l9.5-6a1 1 0 0 0 0-1.6l-9.5-6A1 1 0 0 0 4 6Z"/>',
};
const FILLED = new Set(["play", "pause", "prev", "next"]);
export const svg = (name) => `<svg class="i${FILLED.has(name) ? " f" : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ""}</svg>`;

// ---------- Wetter ----------
export const COND = {
  clear:  { text: "Klar",           icon: "sun" },
  cloudy: { text: "Leicht bewölkt", icon: "cloudSun" },
  rain:   { text: "Regen",          icon: "rain" },
  snow:   { text: "Schnee",         icon: "snow" },
  storm:  { text: "Gewitter",       icon: "storm" },
};
export const condOf = (c) => COND[c] || COND.cloudy;

// ---------- Farben ----------
export const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgbToHex = (r, g, b) => "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(...A.map((v, i) => lerp(v, B[i], t))); };
export function hslToHex(hue, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
// Farbtemperatur → RGB (Näherung nach Tanner Helland), leicht aufgehellt für dunkle UI
export function kelvinToHex(k) {
  const t = k / 100;
  const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  return rgbToHex(r, g, b);
}

// ---------- Sonne (vereinfachte NOAA-Formel) ----------
export function sunTimes(date = new Date(), lat = D.location.lat, lon = D.location.lon) {
  const rad = Math.PI / 180;
  const n = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
  const g = (2 * Math.PI / 365) * (n - 1);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
  const noon = 720 - 4 * lon - eqt;
  const at = (min) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) + min * 60000);
  return { sunrise: at(noon - 4 * ha), sunset: at(noon + 4 * ha), noon: at(noon) };
}

// ---------- Toasts ----------
export function toast(title, { sub, icon = "activity", action, onAction, ms = 4000, tone } = {}) {
  const box = $("#toasts");
  const close = () => { t.classList.remove("in"); setTimeout(() => t.remove(), 350); };
  const t = h("div", { class: `toast${tone ? ` ${tone}` : ""}`, role: "status" },
    h("span", { class: "toast-ico", html: svg(icon) }),
    h("div", { class: "toast-body" }, h("div", { class: "toast-title" }, title), sub && h("div", { class: "toast-sub" }, sub)),
    action && h("button", { class: "toast-btn", type: "button", onclick: () => { onAction(); close(); } }, action));
  box.append(t);
  while (box.children.length > 3) box.firstElementChild.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("in")));
  setTimeout(close, ms);
}

// ---------- Ziehbare Elemente (Tippen, Ziehen, langes Drücken, Tastatur) ----------
export function draggable(el, { axis = "x", get, set, onTap, onLongPress, step = 10, min = 0, max = 100, size }) {
  let s = null;
  let longTimer;
  el.addEventListener("contextmenu", (e) => { if (onLongPress) { e.preventDefault(); onLongPress(); } });
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    s = { x: e.clientX, y: e.clientY, v: get(), moved: false, long: false, id: e.pointerId,
      size: size ? size() : axis === "x" ? el.offsetWidth : el.offsetHeight };
    if (onLongPress) longTimer = setTimeout(() => { if (s && !s.moved) { s.long = true; haptic(15); onLongPress(); } }, 520);
  });
  el.addEventListener("pointermove", (e) => {
    if (!s || e.pointerId !== s.id || s.long) return;
    const d = axis === "x" ? e.clientX - s.x : s.y - e.clientY;
    if (!s.moved) {
      if (Math.abs(d) < 6) return;
      s.moved = true;
      clearTimeout(longTimer);
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
    }
    set(Math.round(clamp(s.v + (d / s.size) * (max - min), min, max)));
  });
  const end = (e) => {
    if (!s || e.pointerId !== s.id) return;
    clearTimeout(longTimer);
    const tap = e.type === "pointerup" && !s.moved && !s.long;
    s = null;
    el.classList.remove("dragging");
    if (tap) { haptic(); onTap?.(); }
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("keydown", (e) => {
    const k = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step }[e.key];
    if (k) { e.preventDefault(); set(clamp(get() + k, min, max)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap?.(); }
    else if ((e.key === "m" || e.key === "ContextMenu") && onLongPress) { e.preventDefault(); onLongPress(); }
  });
}

// Schalter (role=switch)
export function toggle(on, onChange, label) {
  const b = h("button", { class: "switch", type: "button", role: "switch", "aria-checked": String(!!on), "aria-label": label });
  b.addEventListener("click", () => {
    const v = b.getAttribute("aria-checked") !== "true";
    b.setAttribute("aria-checked", String(v));
    haptic();
    onChange(v);
  });
  return b;
}
