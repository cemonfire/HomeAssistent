// Seite 4: Sicherheit – Alarmanlage, Schloss, Sensoren, Kamera-Ereignisse
import { D, $, h, svg, bus, hhmm, haptic, toast } from "./core.js";
import { ALARM_LABEL, armAlarm, disarmAlarm, setLock, isOpen, roomName, camEvents, addCamEvent } from "./state.js";
import { openSheet, closeSheet, pinPad } from "./sheets.js";
import { snapshot } from "./sim.js";

// Wischen zum Bestätigen (auch im Klingel-Overlay)
export function slideConfirm(label, onConfirm, { icon = "unlock" } = {}) {
  const knob = h("span", { class: "slide-knob", html: svg(icon) });
  const el = h("div", { class: "slide", role: "button", tabindex: 0, "aria-label": label }, h("span", { class: "slide-label" }, label), knob);
  let start = null;
  const max = () => el.clientWidth - knob.offsetWidth - 8;
  const set = (x) => { knob.style.transform = `translateX(${x}px)`; el.style.setProperty("--p", `${(x / max()) * 100}%`); };
  knob.addEventListener("pointerdown", (e) => { start = e.clientX; knob.setPointerCapture(e.pointerId); el.classList.add("dragging"); });
  knob.addEventListener("pointermove", (e) => { if (start != null) set(Math.max(0, Math.min(max(), e.clientX - start))); });
  const end = (e) => {
    if (start == null) return;
    const x = Math.max(0, Math.min(max(), e.clientX - start));
    start = null;
    el.classList.remove("dragging");
    if (x > max() * 0.85) { set(max()); haptic(30); onConfirm(); setTimeout(() => set(0), 600); } else set(0);
  };
  knob.addEventListener("pointerup", end);
  knob.addEventListener("pointercancel", end);
  el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onConfirm(); } });
  return el;
}

export function askPin(title, onOk) {
  openSheet({
    title, sub: "Code für die Alarmanlage", cls: "sheet-pin",
    body: pinPad({ hint: `Demo-PIN: ${D.alarm.pin}`, onSubmit: (pin) => { if (pin !== D.alarm.pin) return false; closeSheet(); onOk(); return true; } }),
  });
  setTimeout(() => $(".sheet-pin .pin")?.setAttribute("tabindex", "0"), 0);
}

const SENSOR_ICON = { door: "door", window: "window", smoke: "smoke", water: "droplet" };
const STATE = {
  closed: ["Geschlossen", "good", "check"], ok: ["OK", "good", "check"],
  tilted: ["Gekippt", "warning", "window"], open: ["Offen", "serious", "window"], alarm: ["Alarm", "critical", "bell"],
};
const TYPE_COLOR = { Person: "#7aa2ff", Paket: "#e0a83a", Klingel: "#5fe0a8", "Verpasst": "#ff8a7a" };

export function initSecurity(page) {
  const alarm = h("div", { class: "alarm" });
  const lock = h("div", { class: "lock" });
  const sensors = h("div", { class: "sensors" });
  const sensorSum = h("span", { class: "status-chip" });
  const events = h("div", { class: "events-view" });
  const evCount = h("span", { class: "hint" });

  page.append(h("div", { class: "wrap security-layout" },
    h("div", { class: "col sec-left" },
      h("div", { class: "page-h" }, h("div", {}, h("h1", {}, "Sicherheit"), h("p", { class: "page-sub" }, "Alarm, Zugang und Sensoren"))),
      h("section", { class: "panel" }, alarm),
      h("section", { class: "panel" }, lock),
      h("section", { class: "panel sensors-panel" }, h("div", { class: "group-h" }, h("h2", {}, "Sensoren"), sensorSum), sensors)),
    h("section", { class: "panel events-panel" }, h("div", { class: "group-h" }, h("h2", {}, "Kamera-Ereignisse"), evCount), events)));

  // ---------- Alarmanlage ----------
  function renderAlarm() {
    const A = D.alarm;
    const armed = A.mode === "home" || A.mode === "away";
    const icon = A.mode === "triggered" ? "shieldAlert" : armed || A.mode === "arming" ? "shieldCheck" : "shield";
    const opened = D.sensors.filter(isOpen);
    const sub = A.mode === "arming" ? `Scharf in ${A.left} s – bitte Haus verlassen`
      : A.mode === "triggered" ? A.reason
      : armed ? "Alle Sensoren werden überwacht"
      : opened.length ? `${opened.length} offen: ${opened.map((s) => s.name).join(", ")}` : "Alle Türen und Fenster geschlossen";
    alarm.className = `alarm m-${A.mode}`;
    alarm.replaceChildren(
      h("div", { class: "alarm-top" },
        h("div", { class: "alarm-badge", style: { "--p": A.mode === "arming" ? `${(A.left / A.exitDelay) * 100}%` : "100%" } }, h("span", { html: svg(icon) })),
        h("div", {}, h("div", { class: "alarm-state" }, ALARM_LABEL[A.mode]), h("div", { class: "alarm-sub" }, sub))),
      h("div", { class: "seg alarm-seg" },
        h("button", { type: "button", "aria-pressed": String(A.mode === "home" || (A.mode === "arming" && A.target === "home")), onclick: () => armed || A.mode === "arming" ? null : armAlarm("home") }, h("span", { html: svg("home") }), "Zuhause"),
        h("button", { type: "button", "aria-pressed": String(A.mode === "away" || (A.mode === "arming" && A.target === "away")), onclick: () => armed || A.mode === "arming" ? null : armAlarm("away") }, h("span", { html: svg("user") }), "Abwesend"),
        h("button", { type: "button", "aria-pressed": String(A.mode === "disarmed"), onclick: () => {
          if (A.mode === "arming") disarmAlarm();
          else if (A.mode !== "disarmed") askPin("Alarmanlage ausschalten", disarmAlarm);
        } }, h("span", { html: svg("power") }), "Aus")));
  }
  bus.on("alarm", renderAlarm);
  bus.on("sensor", renderAlarm);
  renderAlarm();

  // ---------- Schloss ----------
  function renderLock() {
    const L = D.lock;
    const sub = L.locked ? "Verriegelt" : `Entriegelt · verriegelt in 0:${String(L.relockIn).padStart(2, "0")}`;
    lock.className = `lock${L.locked ? "" : " unlocked"}`;
    lock.replaceChildren(
      h("div", { class: "lock-top" },
        h("span", { class: "lock-ico", html: svg(L.locked ? "lock" : "unlock") }),
        h("div", {}, h("div", { class: "lock-name" }, L.name), h("div", { class: "lock-sub" }, sub)),
        !L.locked && h("button", { class: "btn btn-solid", type: "button", onclick: () => setLock(true) }, "Verriegeln")),
      L.locked && slideConfirm("Zum Entriegeln schieben", () => { setLock(false); toast("Haustür entriegelt", { icon: "unlock", ms: 2500 }); }));
  }
  bus.on("lock", (L) => {
    // Während des Countdowns nur den Text aktualisieren, damit der Schieber nicht neu entsteht
    const sub = lock.querySelector(".lock-sub");
    if (!L.locked && sub && lock.classList.contains("unlocked")) sub.textContent = `Entriegelt · verriegelt in 0:${String(L.relockIn).padStart(2, "0")}`;
    else renderLock();
  });
  renderLock();

  // ---------- Sensoren ----------
  function renderSensors() {
    const opened = D.sensors.filter(isOpen);
    const lowBatt = D.sensors.filter((s) => s.battery < 20);
    sensorSum.className = `status-chip ${opened.length ? "warning" : "good"}`;
    sensorSum.innerHTML = `${svg(opened.length ? "window" : "check")}<span>${opened.length ? `${opened.length} offen` : "Alles zu"}</span>`;
    sensors.replaceChildren(...D.sensors.map((s) => {
      const [txt, tone, ico] = STATE[s.state];
      return h("div", { class: "sensor" },
        h("span", { class: "sensor-ico", html: svg(SENSOR_ICON[s.type]) }),
        h("div", { class: "sensor-info" }, h("div", {}, s.name), h("div", { class: "sensor-sub" }, roomName(s.room),
          h("span", { class: `batt-s${s.battery < 20 ? " low" : ""}` }, ` · Batterie ${s.battery} %${s.battery < 20 ? " – bald tauschen" : ""}`))),
        h("span", { class: `status-chip ${tone}` }, h("span", { html: svg(ico) }), txt));
    }), lowBatt.length ? h("div", { class: "sensor-note" }, `${lowBatt.length} Batterie schwach`) : null);
  }
  bus.on("sensor", renderSensors);
  renderSensors();

  // ---------- Kamera-Ereignisse ----------
  // Beispiel-Ereignisse von heute mit erzeugten Standbildern
  const today = new Date();
  const seed = [[7.1, "door", "Person", 0.42], [8.4, "garage", "Person", 0.5], [10.25, "door", "Paket", 0.55], [11.7, "garden", "Person", 0.45], [13.2, "door", "Klingel", 0.48], [14.05, "garden", "Person", 0.6]];
  const nowH = today.getHours() + today.getMinutes() / 60;
  for (const [hr, cam, type, p] of seed.filter(([hr]) => hr < nowH)) {
    const at = new Date(today); at.setHours(Math.floor(hr), Math.round((hr % 1) * 60), 0, 0);
    camEvents.push({ id: `seed-${hr}`, at, cam: D.cameras.find((c) => c.id === cam).name, camId: cam, type, snap: snapshot(cam, type === "Paket" ? null : p, { pkg: type === "Paket" }) });
  }
  let selected = null;
  function renderEvents() {
    const list = [...camEvents].reverse();
    evCount.textContent = `${list.length} heute`;
    if (!list.length) { events.replaceChildren(h("p", { class: "empty" }, "Noch keine Ereignisse heute.")); return; }
    const ev = list.find((e) => e.id === selected) || list[0];
    const dayMs = 864e5, start = new Date(today).setHours(0, 0, 0, 0);
    events.replaceChildren(
      h("figure", { class: "ev-preview" },
        h("img", { src: ev.snap, alt: `${ev.type} – ${ev.cam}, ${hhmm(ev.at)}` }),
        h("figcaption", {}, h("span", { class: "chip" }, h("i", { class: "dot", style: { background: TYPE_COLOR[ev.type] || "#fff" } }), ev.type),
          h("span", { class: "chip" }, `${ev.cam} · ${hhmm(ev.at)}`))),
      h("div", { class: "timeline", "aria-label": "Zeitleiste heute" },
        h("div", { class: "tl-bar" },
          list.map((e) => h("button", { type: "button", class: `tl-dot${e === ev ? " sel" : ""}`, style: { left: `${((e.at - start) / dayMs) * 100}%`, "--tc": TYPE_COLOR[e.type] || "#fff" },
            "aria-label": `${e.type} ${e.cam} ${hhmm(e.at)}`, onclick: () => { selected = e.id; renderEvents(); } })),
          h("i", { class: "tl-now", style: { left: `${((Date.now() - start) / dayMs) * 100}%` } })),
        h("div", { class: "tl-ticks" }, ["0", "6", "12", "18", "24 Uhr"].map((t) => h("span", {}, t)))),
      h("div", { class: "ev-strip" }, list.map((e) => h("button", { type: "button", class: `ev-card${e === ev ? " sel" : ""}`, onclick: () => { selected = e.id; renderEvents(); } },
        h("img", { src: e.snap, alt: "" }),
        h("div", { class: "ev-card-t" }, h("i", { class: "dot", style: { background: TYPE_COLOR[e.type] || "#fff" } }), h("span", {}, e.type), h("time", {}, hhmm(e.at))),
        h("div", { class: "ev-card-s" }, e.cam)))));
  }
  bus.on("camevent", () => { selected = null; renderEvents(); });
  renderEvents();

  // ---------- Alarm-Overlay ----------
  let siren;
  function beep(on) {
    clearInterval(siren);
    if (!on || D.muteSiren) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      siren = setInterval(() => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = 880; o.type = "square"; g.gain.value = 0.03;
        o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.18);
      }, 700);
    } catch { /* kein Audio */ }
  }
  bus.on("alarm", (A) => {
    const existing = $("#alarm-overlay");
    if (A.mode !== "triggered") { existing?.remove(); beep(false); return; }
    if (existing) return;
    const mute = h("button", { class: "btn", type: "button", onclick: () => { D.muteSiren = true; beep(false); mute.disabled = true; mute.textContent = "Ton aus"; } }, "Ton aus");
    const ov = h("div", { id: "alarm-overlay", class: "alarm-overlay", role: "alertdialog", "aria-label": "Alarm ausgelöst" },
      h("div", { class: "ao-inner" },
        h("span", { class: "ao-ico", html: svg("shieldAlert") }),
        h("div", { class: "ao-title" }, "Alarm"),
        h("div", { class: "ao-reason" }, A.reason),
        pinPad({ hint: `PIN eingeben zum Ausschalten · Demo: ${D.alarm.pin}`, onSubmit: (pin) => { if (pin !== D.alarm.pin) return false; disarmAlarm(); return true; } }),
        mute));
    document.body.append(ov);
    D.muteSiren = false;
    beep(true);
    ov.querySelector(".pin-key")?.focus();
  });

  // Klingel-Ereignisse aus dem Overlay
  bus.on("doorbell-event", (e) => addCamEvent(e));
}
