// Dialoge (Sheets) und wiederverwendbare Bedienelemente:
// Licht-Sheet mit Farbrad, Raum-Sheet, Thermostat-Drehregler, PIN-Feld.
import { D, $, h, sv, svg, bus, clamp, num, haptic, draggable, toggle, hslToHex, hexToRgb, kelvinToHex } from "./core.js";
import { lightColor, setLight, toggleLight, moveCover, setCover, setTarget, isHeating, byRoom, isOpen, roomName } from "./state.js";

// ---------- Sheet-Grundgerüst ----------
let current = null;
export function openSheet({ title, sub, body, cls = "", back, onClose }) {
  closeSheet(true);
  const panel = h("div", { class: `sheet ${cls}`, role: "dialog", "aria-modal": "true", "aria-label": title, tabindex: "-1" },
    h("header", { class: "sheet-h" },
      back && h("button", { class: "icon-btn back", type: "button", "aria-label": "Zurück", html: svg("chevron"), onclick: back }),
      h("div", { class: "sheet-titles" }, h("div", { class: "sheet-title" }, title), sub && h("div", { class: "sheet-sub" }, sub)),
      h("button", { class: "icon-btn", type: "button", "aria-label": "Schließen", html: svg("x"), onclick: () => closeSheet() })),
    h("div", { class: "sheet-body" }, body));
  const wrap = h("div", { class: "sheet-wrap" }, panel);
  wrap.addEventListener("pointerdown", (e) => { if (e.target === wrap) closeSheet(); });
  $("#layer").append(wrap);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add("in")));
  const prevFocus = current?.prevFocus || document.activeElement;
  panel.focus({ preventScroll: true });
  current = { wrap, onClose, prevFocus };
}
export function closeSheet(replacing = false) {
  if (!current) return;
  const c = current;
  current = null;
  c.onClose?.();
  if (replacing) { c.wrap.remove(); return; }
  c.wrap.classList.remove("in");
  setTimeout(() => c.wrap.remove(), 320);
  c.prevFocus?.focus?.({ preventScroll: true });
}
export const sheetOpen = () => !!current;
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && current) { e.stopImmediatePropagation(); closeSheet(); }
}, true);

// ---------- Licht-Sheet ----------
function hexToHs(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let hue = 0;
  if (d) hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  const l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [hue, clamp(s, 0, 1)];
}

const CT_PRESETS = [[2200, "Kerze"], [2700, "Warm"], [4000, "Neutral"], [6000, "Tageslicht"]];
const COLOR_PRESETS = ["#ff8a4c", "#ff5470", "#c86bff", "#6b7bff", "#38b6ff", "#3ddc97"];

export function openLightSheet(l, { back } = {}) {
  const offs = [];
  const fill = h("span", { class: "ls-fill" });
  const pct = h("span", { class: "ls-pct" });
  const big = h("div", { class: "ls-big", role: "slider", tabindex: 0, "aria-label": `Helligkeit ${l.name}`, "aria-valuemin": 0, "aria-valuemax": 100 },
    fill, h("span", { class: "ls-ico", html: svg("bulb") }), pct);
  draggable(big, {
    axis: "y",
    get: () => (l.on ? l.brightness : 0),
    set: (v) => setLight(l, v > 0 ? { on: true, brightness: v } : { on: false }),
    onTap: () => toggleLight(l),
  });

  const modeSeg = l.rgb && h("div", { class: "seg", role: "tablist" },
    h("button", { type: "button", role: "tab", "data-mode": "ct", onclick: () => setLight(l, { mode: "ct", on: true }) }, "Weißton"),
    h("button", { type: "button", role: "tab", "data-mode": "color", onclick: () => setLight(l, { mode: "color", on: true }) }, "Farbe"));

  // Weißton
  const ct = h("input", { type: "range", class: "ct-range", min: 2200, max: 6500, step: 100, "aria-label": "Farbtemperatur" });
  ct.addEventListener("input", () => setLight(l, { ct: +ct.value, mode: "ct", on: true }));
  const ctBox = h("div", { class: "ls-ct" },
    h("div", { class: "ls-label" }, h("span", {}, "Farbtemperatur"), h("span", { class: "ls-k" })),
    ct,
    h("div", { class: "swatches" }, CT_PRESETS.map(([k, name]) =>
      h("button", { type: "button", class: "swatch", style: { "--sw": kelvinToHex(k) }, "aria-label": `${name} (${k} K)`, title: name,
        onclick: () => setLight(l, { ct: k, mode: "ct", on: true }) }))));

  // Farbrad
  const knob = h("span", { class: "wheel-knob" });
  const wheel = h("div", { class: "wheel", role: "application", "aria-label": "Farbrad" }, knob);
  const pick = (e) => {
    const r = wheel.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
    const sat = clamp(Math.hypot(dx, dy) / (r.width / 2), 0, 1);
    setLight(l, { mode: "color", on: true, color: hslToHex(hue, sat * 100, 100 - sat * 50) });
  };
  wheel.addEventListener("pointerdown", (e) => { wheel.setPointerCapture(e.pointerId); pick(e); });
  wheel.addEventListener("pointermove", (e) => { if (wheel.hasPointerCapture(e.pointerId)) pick(e); });
  const colorBox = h("div", { class: "ls-color" }, wheel,
    h("div", { class: "swatches" }, COLOR_PRESETS.map((c) =>
      h("button", { type: "button", class: "swatch", style: { "--sw": c }, "aria-label": `Farbe ${c}`, onclick: () => setLight(l, { color: c, mode: "color", on: true }) }))));

  const onSwitch = toggle(l.on, (v) => setLight(l, { on: v }), `${l.name} an/aus`);
  const body = h("div", { class: "ls" }, big,
    h("div", { class: "ls-side" },
      h("div", { class: "ls-row" }, h("span", {}, "Eingeschaltet"), onSwitch),
      modeSeg, ctBox, l.rgb && colorBox));

  function render() {
    const c = lightColor(l);
    body.style.setProperty("--lc", c);
    fill.style.transform = `scaleY(${l.on ? l.brightness / 100 : 0})`;
    pct.textContent = l.on ? `${l.brightness} %` : "Aus";
    big.classList.toggle("on", l.on);
    big.setAttribute("aria-valuenow", l.on ? l.brightness : 0);
    onSwitch.setAttribute("aria-checked", String(l.on));
    ct.value = l.ct || 2700;
    ct.style.setProperty("--p", `${((ct.value - 2200) / 4300) * 100}%`);
    ctBox.querySelector(".ls-k").textContent = `${l.ct || 2700} K`;
    const colorMode = l.rgb && l.mode === "color";
    modeSeg?.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === (colorMode ? "color" : "ct"))));
    ctBox.hidden = colorMode;
    if (l.rgb) {
      colorBox.hidden = !colorMode;
      const [hue, sat] = hexToHs(l.color || "#ffffff");
      const a = (hue - 90) * Math.PI / 180;
      knob.style.left = `${50 + Math.cos(a) * sat * 50}%`;
      knob.style.top = `${50 + Math.sin(a) * sat * 50}%`;
      knob.style.background = l.color;
    }
  }
  offs.push(bus.on("light", (x) => x === l && render()));
  render();
  const kind = l.rgb ? "Farbe & Weißton" : "Weißton & Helligkeit";
  openSheet({ title: l.name, sub: roomName(l.room) === l.name ? kind : `${roomName(l.room)} · ${kind}`, body, cls: "sheet-light", back, onClose: () => offs.forEach((f) => f()) });
}

// ---------- Thermostat-Drehregler ----------
const T_MIN = 15, T_MAX = 28, A0 = 135, SWEEP = 270;
export function dial(t) {
  const cx = 120, cy = 120, R = 92;
  const pt = (deg, r = R) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
  const ang = (v) => A0 + ((v - T_MIN) / (T_MAX - T_MIN)) * SWEEP;
  const arc = (a1, a2) => {
    const [x1, y1] = pt(a1), [x2, y2] = pt(a2);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const ticks = [];
  for (let i = 0; i <= 52; i++) {
    const a = A0 + (i / 52) * SWEEP;
    const [x1, y1] = pt(a, R + 14), [x2, y2] = pt(a, R + (i % 4 === 0 ? 22 : 19));
    ticks.push(sv("line", { x1, y1, x2, y2, class: "d-tick", "data-v": T_MIN + (i / 52) * (T_MAX - T_MIN) }));
  }
  const valuePath = sv("path", { class: "d-val" });
  const knob = sv("circle", { r: 11, class: "d-knob" });
  const curMark = sv("circle", { r: 4, class: "d-cur" });
  const tTarget = sv("text", { x: cx, y: cy + 8, class: "d-target" });
  const tLabel = sv("text", { x: cx, y: cy - 34, class: "d-label" });
  const tCur = sv("text", { x: cx, y: cy + 38, class: "d-sub" });
  const el = sv("svg", { viewBox: "0 0 240 240", class: "dial", role: "slider", tabindex: 0, "aria-label": `Zieltemperatur ${t.name}`, "aria-valuemin": T_MIN, "aria-valuemax": T_MAX },
    ticks, sv("path", { d: arc(A0, A0 + SWEEP), class: "d-track" }), valuePath, curMark, knob, tLabel, tTarget, tCur);

  const fromEvent = (e) => {
    const r = el.getBoundingClientRect();
    const deg = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    let a = (deg - A0 + 720) % 360;
    if (a > SWEEP) a = a > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP;
    setTarget(t, T_MIN + (a / SWEEP) * (T_MAX - T_MIN));
  };
  el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); fromEvent(e); haptic(); });
  el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId)) fromEvent(e); });
  el.addEventListener("keydown", (e) => {
    const d = { ArrowUp: 0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowLeft: -0.5 }[e.key];
    if (d) { e.preventDefault(); setTarget(t, t.target + d); }
  });

  function render() {
    const heat = isHeating(t);
    el.classList.toggle("heating", heat);
    valuePath.setAttribute("d", arc(A0, Math.max(A0 + 0.5, ang(t.target))));
    const [kx, ky] = pt(ang(t.target));
    knob.setAttribute("cx", kx); knob.setAttribute("cy", ky);
    const [mx, my] = pt(ang(clamp(t.current, T_MIN, T_MAX)), R - 18);
    curMark.setAttribute("cx", mx); curMark.setAttribute("cy", my);
    const lo = Math.min(t.current, t.target), hi = Math.max(t.current, t.target);
    ticks.forEach((tk) => { const v = +tk.dataset.v; tk.classList.toggle("lit", v >= lo && v <= hi && heat); });
    tTarget.textContent = `${num(t.target)}°`;
    tLabel.textContent = heat ? "HEIZT AUF" : "HÄLT";
    tCur.textContent = `Ist ${num(t.current)}° · ${t.humidity} %`;
    el.setAttribute("aria-valuenow", t.target);
    el.setAttribute("aria-valuetext", `${num(t.target)} Grad`);
  }
  render();
  return { el, render };
}

export function climateControl(t) {
  const d = dial(t);
  const off = bus.on("climate", (x) => x === t && d.render());
  const el = h("div", { class: "climate-ctl" }, d.el,
    h("div", { class: "climate-btns" },
      h("button", { class: "round", type: "button", "aria-label": "Kälter", html: svg("minus"), onclick: () => setTarget(t, t.target - 0.5) }),
      h("button", { class: "round", type: "button", "aria-label": "Wärmer", html: svg("plus"), onclick: () => setTarget(t, t.target + 0.5) })));
  return { el, off };
}

// ---------- PIN-Feld ----------
export function pinPad({ onSubmit, hint }) {
  let pin = "";
  const dots = h("div", { class: "pin-dots", "aria-live": "polite" }, [0, 1, 2, 3].map(() => h("i")));
  const show = () => dots.querySelectorAll("i").forEach((d, i) => d.classList.toggle("on", i < pin.length));
  const press = (k) => {
    haptic();
    if (k === "del") pin = pin.slice(0, -1);
    else if (pin.length < 4) pin += k;
    show();
    if (pin.length === 4) {
      const ok = onSubmit(pin);
      if (!ok) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); haptic(60); }
      pin = "";
      setTimeout(show, ok ? 0 : 350);
    }
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k) =>
    k === "" ? h("span") : h("button", { type: "button", class: "pin-key", "aria-label": k === "del" ? "Löschen" : k, onclick: () => press(k) },
      k === "del" ? h("span", { html: svg("x") }) : k));
  const el = h("div", { class: "pin" }, dots, h("div", { class: "pin-grid" }, keys), hint && h("div", { class: "pin-hint" }, hint));
  el.addEventListener("keydown", (e) => {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("del");
  });
  return el;
}

// ---------- Raum-Sheet ----------
const STATE_TXT = { closed: "Geschlossen", open: "Offen", tilted: "Gekippt", ok: "OK", alarm: "Alarm" };
export function openRoomSheet(roomId) {
  const room = D.floorplan.rooms.find((r) => r.id === roomId);
  const offs = [];
  const sections = [];

  const lights = byRoom(D.lights, roomId);
  if (lights.length) {
    sections.push(h("section", { class: "rs-sec" }, h("h3", {}, "Licht"), lights.map((l) => {
      const sw = toggle(l.on, (v) => setLight(l, { on: v }), `${l.name} an/aus`);
      const range = h("input", { type: "range", min: 1, max: 100, "aria-label": `${l.name} Helligkeit` });
      range.addEventListener("input", () => setLight(l, { on: true, brightness: +range.value }));
      const dot = h("button", { class: "rs-color", type: "button", "aria-label": `Farbe ${l.name}`, title: "Farbe & Weißton",
        onclick: () => openLightSheet(l, { back: () => openRoomSheet(roomId) }) });
      const row = h("div", { class: "rs-row" }, dot, h("div", { class: "rs-grow" }, h("div", { class: "rs-name" }, l.name), range), sw);
      const render = () => {
        row.classList.toggle("on", l.on);
        row.style.setProperty("--lc", lightColor(l));
        range.value = l.brightness;
        range.style.setProperty("--p", `${l.brightness}%`);
        sw.setAttribute("aria-checked", String(l.on));
      };
      offs.push(bus.on("light", (x) => x === l && render()));
      render();
      return row;
    })));
  }

  const covers = byRoom(D.covers, roomId);
  if (covers.length) {
    sections.push(h("section", { class: "rs-sec" }, h("h3", {}, "Rollladen"), covers.map((c) => {
      const range = h("input", { type: "range", min: 0, max: 100, "aria-label": `${c.name} Position` });
      range.addEventListener("input", () => setCover(c, +range.value));
      const val = h("span", { class: "rs-val" });
      const row = h("div", { class: "rs-row" },
        h("div", { class: "rs-grow" }, h("div", { class: "rs-name" }, h("span", {}, "Position"), val), range),
        h("div", { class: "btns" },
          h("button", { class: "btn", type: "button", onclick: () => moveCover(c, 100) }, "Auf"),
          h("button", { class: "btn", type: "button", onclick: () => moveCover(c, 0) }, "Zu")));
      const render = () => { range.value = c.position; range.style.setProperty("--p", `${c.position}%`); val.textContent = `${c.position} % offen`; };
      offs.push(bus.on("cover", (x) => x === c && render()));
      render();
      return row;
    })));
  }

  const clim = byRoom(D.climate, roomId)[0];
  if (clim) {
    const cc = climateControl(clim);
    offs.push(cc.off);
    sections.push(h("section", { class: "rs-sec rs-climate" }, h("h3", {}, "Heizung"), cc.el));
  }

  const sensors = byRoom(D.sensors, roomId);
  const people = D.people.filter((p) => p.home && p.room === roomId);
  if (sensors.length || people.length) {
    sections.push(h("section", { class: "rs-sec" }, h("h3", {}, "Status"),
      h("div", { class: "chips" },
        people.map((p) => h("span", { class: "chip-s" }, h("i", { class: "av", style: { background: p.color } }, p.name[0]), `${p.name} ist hier`)),
        sensors.map((s) => h("span", { class: `chip-s${isOpen(s) || s.state === "alarm" ? " warn" : ""}` },
          h("span", { html: svg(s.type === "smoke" ? "smoke" : s.type === "water" ? "droplet" : s.type) }), `${s.name.replace(/ (Wohnzimmer|Küche|Schlafzimmer|Büro|Flur|Bad)$/, "")}: ${STATE_TXT[s.state]}`)))));
  }

  const t = clim ? `${num(clim.current)}° · ${clim.humidity} % Luftfeuchte` : "";
  openSheet({ title: room.name, sub: t, body: h("div", { class: "rs" }, sections), cls: "sheet-room", onClose: () => offs.forEach((f) => f()) });
}
