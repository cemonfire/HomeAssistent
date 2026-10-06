// Einstellungen + Demo-Steuerung
import { D, h, svg, bus, store, toggle, COND } from "./core.js";
import { setSensor, setWeather, byId, armAlarm } from "./state.js";
import { openSheet, closeSheet } from "./sheets.js";
import { setProximity } from "./ambient.js";

export function applyStoredSettings() {
  D.user = store.get("user", D.user);
  D.idleSeconds = store.get("idle", D.idleSeconds);
  document.body.classList.toggle("lite", store.get("lite", false));
}

export function openSettings() {
  const name = h("input", { type: "text", value: D.user, placeholder: "Vorname", "aria-label": "Dein Vorname", class: "text-in" });
  name.addEventListener("input", () => { D.user = name.value.trim(); store.set("user", D.user); bus.emit("user"); });

  const idle = h("select", { class: "text-in", "aria-label": "Ruhemodus nach" },
    [[0, "Nie"], [60, "1 Minute"], [120, "2 Minuten"], [300, "5 Minuten"], [600, "10 Minuten"]].map(([v, l]) => h("option", { value: v, selected: v === D.idleSeconds }, l)));
  idle.addEventListener("change", () => { D.idleSeconds = +idle.value; store.set("idle", D.idleSeconds); bus.emit("idle"); });

  const row = (label, sub, ctl) => h("div", { class: "set-row" }, h("div", {}, h("div", {}, label), sub && h("div", { class: "set-sub" }, sub)), ctl);
  const kitchen = byId(D.sensors, "s3");
  const hourIn = h("input", { type: "range", min: -1, max: 23.5, step: 0.5, value: -1, "aria-label": "Tageszeit-Vorschau" });
  const hourOut = h("span", { class: "set-sub" }, "Live");
  hourIn.addEventListener("input", () => {
    const v = +hourIn.value;
    hourOut.textContent = v < 0 ? "Live" : `${String(Math.floor(v)).padStart(2, "0")}:${v % 1 ? "30" : "00"} Uhr`;
    hourIn.style.setProperty("--p", `${((v + 1) / 24.5) * 100}%`);
    bus.emit("skyhour", v < 0 ? null : v);
  });

  const demo = (label, icon, fn) => h("button", { class: "demo-btn", type: "button", onclick: fn }, h("span", { html: svg(icon) }), label);

  const body = h("div", { class: "settings" },
    h("section", { class: "rs-sec" }, h("h3", {}, "Allgemein"),
      row("Name", "Für die Begrüßung", name),
      row("Ruhemodus nach", "Große Uhr, wenn niemand bedient", idle),
      row("Annäherung weckt Display", "Frontkamera erkennt Bewegung, Bild bleibt im Gerät", toggle(store.get("proximity", false), (v) => setProximity(v), "Annäherung")),
      row("Antworten vorlesen", "Sprachsteuerung antwortet laut", toggle(store.get("speak", false), (v) => store.set("speak", v), "Vorlesen")),
      row("Effekte reduzieren", "Für ältere Tablets: kein animierter Himmel, kein Glas-Effekt",
        toggle(store.get("lite", false), (v) => { store.set("lite", v); document.body.classList.toggle("lite", v); bus.emit("weather", D.weather); }, "Effekte reduzieren"))),
    h("section", { class: "rs-sec" }, h("h3", {}, "Ansicht"),
      h("div", { class: "demo-grid" },
        demo("Ruhemodus", "moon", () => { closeSheet(); bus.emit("sleep"); }),
        document.fullscreenEnabled && demo("Vollbild", "monitor", () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }))),
    h("section", { class: "rs-sec" }, h("h3", {}, "Demo"),
      h("div", { class: "demo-grid" },
        demo("Klingeln", "bell", () => { closeSheet(); bus.emit("doorbell"); }),
        demo("Bewegung Haustür", "activity", () => { closeSheet(); bus.emit("demo-motion"); }),
        demo("Fenster Küche auf/zu", "window", () => setSensor(kitchen, kitchen.state === "open" ? "closed" : "open")),
        demo("Einbruch simulieren", "shieldAlert", () => {
          closeSheet();
          Object.assign(D.alarm, { mode: "away" });
          bus.emit("alarm", D.alarm);
          const door = byId(D.sensors, "s5");
          setTimeout(() => setSensor(door, "open"), 600);
          setTimeout(() => setSensor(door, "closed"), 9000);
        }),
        demo("Alarm scharf (10 s)", "shieldCheck", () => { closeSheet(); armAlarm("away"); bus.emit("nav", "security"); })),
      row("Wetter", null, h("div", { class: "seg seg-sm" }, Object.entries(COND).map(([k, c]) =>
        h("button", { type: "button", "aria-pressed": String(D.weather.condition === k), title: c.text, "aria-label": c.text,
          onclick: (e) => { setWeather(k); e.currentTarget.parentNode.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); } },
          h("span", { html: svg(c.icon) }))))),
      row("Tageszeit-Vorschau", "Himmel zu anderer Uhrzeit ansehen", h("div", { class: "hour-ctl" }, hourIn, hourOut))));
  openSheet({ title: "Einstellungen", body, cls: "sheet-settings" });
}
