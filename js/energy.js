// Seite 3: Energie – Live-Energiefluss, Tageskurve, Batterie, Auto
import { D, h, sv, svg, ICON, bus, num, clamp, toggle, sunTimes, toast } from "./core.js";
import { M } from "./state.js";
import { lineChart } from "./chart.js";

const E = D.energy;
const COL = { solar: "#c08a1e", load: "#4f8cf0" };            // validiert (dunkel, CVD-sicher)
const NODE = { solar: "#e0a83a", grid: "#a9b0bd", home: "#6a9cf5", battery: "#3ec98a", car: "#a98bff" };
const CLOUD = { clear: 1, cloudy: 0.62, rain: 0.28, snow: 0.2, storm: 0.16 };
const bump = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

function solarAt(hour, date = new Date()) {
  const st = sunTimes(date);
  const rise = st.sunrise.getHours() + st.sunrise.getMinutes() / 60;
  const set = st.sunset.getHours() + st.sunset.getMinutes() / 60;
  const t = (hour - rise) / (set - rise);
  if (t <= 0 || t >= 1) return 0;
  const wobble = 1 - 0.12 * (0.5 + 0.5 * Math.sin(hour * 5.3)) * (D.weather.condition === "clear" ? 0.2 : 1);
  return E.solarPeak * 0.82 * Math.pow(Math.sin(Math.PI * t), 1.4) * (CLOUD[D.weather.condition] ?? 0.6) * wobble;
}
const loadAt = (hour) => 0.3 + 0.9 * bump(hour, 7.2, 0.8) + 1.15 * bump(hour, 12.4, 0.7) + 1.35 * bump(hour, 19.2, 1.5) + 0.08 * Math.sin(hour * 3.1);

export function initEnergy(page) {
  const flowBox = h("div", { class: "flow" });
  const chartBox = h("div", { class: "chart-box" });
  const stats = h("div", { class: "stats" });
  const batt = h("div", { class: "batt" });
  const car = h("div", { class: "car" });

  page.append(h("div", { class: "wrap energy-layout" },
    h("section", { class: "panel flow-panel", "aria-labelledby": "h-energy" },
      h("div", { class: "page-h" }, h("div", {}, h("h1", { id: "h-energy" }, "Energie"), h("p", { class: "page-sub", id: "energy-sub" }, "Live-Energiefluss"))),
      flowBox),
    h("section", { class: "panel chart-panel", "aria-labelledby": "h-day" },
      h("div", { class: "group-h" }, h("h2", { id: "h-day" }, "Heute"), h("span", { class: "hint" }, "kW · gestrichelt = Prognose")),
      chartBox),
    h("div", { class: "col energy-side" }, stats,
      h("section", { class: "panel" }, h("div", { class: "group-h" }, h("h2", {}, "Batterie")), batt),
      h("section", { class: "panel" }, h("div", { class: "group-h" }, h("h2", {}, E.car.name)), car))));

  // ---------- Fluss-Diagramm ----------
  const hub = [210, 168];
  const nodes = {
    solar:   { x: 210, y: 52,  label: "Solar",    icon: "sun",     path: "M210 88 L210 150" },
    grid:    { x: 58,  y: 168, label: "Netz",     icon: "pylon",   path: "M94 168 L192 168" },
    home:    { x: 362, y: 168, label: "Haus",     icon: "home",    path: "M326 168 L228 168" },
    battery: { x: 122, y: 290, label: "Batterie", icon: "battery", path: "M140 258 Q150 196 196 180" },
    car:     { x: 298, y: 290, label: E.car.name, icon: "car",     path: "M280 258 Q270 196 224 180" },
  };
  const g = [];
  for (const [k, n] of Object.entries(nodes)) {
    n.track = sv("path", { d: n.path, class: "fl-track" });
    n.flow = sv("path", { d: n.path, class: "fl-flow", stroke: NODE[k] });
    n.ring = (k === "battery" || k === "car") && sv("circle", { cx: n.x, cy: n.y, r: 41, class: "fl-soc", stroke: NODE[k], pathLength: 100, transform: `rotate(-90 ${n.x} ${n.y})` });
    n.val = sv("text", { x: n.x, y: n.y + 58, class: "fl-val", "text-anchor": "middle" });
    n.circle = sv("circle", { cx: n.x, cy: n.y, r: 34, class: "fl-node", style: `--nc:${NODE[k]}` });
    g.push(n.track, n.flow);
    n.group = sv("g", { class: "fl-g", style: `--nc:${NODE[k]}` },
      n.ring && sv("circle", { cx: n.x, cy: n.y, r: 41, class: "fl-soc-track" }), n.ring, n.circle,
      sv("svg", { x: n.x - 13, y: n.y - 19, width: 26, height: 26, viewBox: "0 0 24 24", class: "i fl-ico", html: ICON[n.icon] }),
      sv("text", { x: n.x, y: n.y + 19, class: "fl-label", "text-anchor": "middle" }, n.label), n.val);
  }
  flowBox.append(sv("svg", { viewBox: "0 0 420 360", class: "flow-svg", role: "img", "aria-label": "Energiefluss" },
    ...g, sv("circle", { cx: hub[0], cy: hub[1], r: 7, class: "fl-hub" }), ...Object.values(nodes).map((n) => n.group)));

  // ---------- Live-Simulation ----------
  const P = { solar: 0, home: 0, battery: 0, grid: 0, car: 0 };
  function step() {
    const now = new Date();
    const hr = now.getHours() + now.getMinutes() / 60;
    P.solar = Math.max(0, solarAt(hr) * (0.96 + Math.random() * 0.06));
    const lightsOn = D.lights.filter((l) => l.on).reduce((a, l) => a + l.brightness, 0);
    P.home = loadAt(hr) + lightsOn * 0.0002 + (M.playing ? 0.04 : 0) + Math.random() * 0.06;
    P.car = E.car.charging && E.car.soc < 100 ? E.car.kw : 0;
    const surplus = P.solar - P.home - P.car;
    if (surplus >= 0) {
      P.battery = E.soc < 100 ? Math.min(surplus, 3.3) : 0;
      P.grid = -(surplus - P.battery);
    } else {
      const dis = E.soc > 8 ? Math.min(-surplus, 3.3) : 0;
      P.battery = -dis;
      P.grid = -surplus - dis;
    }
    E.soc = clamp(E.soc + (P.battery * 2) / 3600 / E.batteryKwh * 100 * 20, 0, 100);   // Demo: 20× beschleunigt
    E.car.soc = clamp(E.car.soc + (P.car * 2) / 3600 / E.car.capacity * 100 * 20, 0, 100);
    if (E.car.charging && E.car.soc >= 100) { E.car.charging = false; toast(`${E.car.name} vollgeladen`, { icon: "car" }); renderCar(); }
    renderFlow();
    renderSide();
  }

  const fmtKw = (v) => `${num(Math.abs(v))} kW`;
  function setFlow(n, kw, towardHub) {
    const a = Math.abs(kw);
    const active = a > 0.04;
    n.flow.classList.toggle("on", active);
    n.flow.classList.toggle("rev", !towardHub);
    n.flow.style.setProperty("--dur", `${clamp(2.6 / (a + 0.25), 0.35, 5).toFixed(2)}s`);
    n.group.classList.toggle("active", active);
  }
  function renderFlow() {
    const n = nodes;
    setFlow(n.solar, P.solar, true);
    setFlow(n.grid, P.grid, P.grid > 0);
    setFlow(n.home, P.home, false);
    setFlow(n.battery, P.battery, P.battery < 0);
    setFlow(n.car, P.car, false);
    n.solar.val.textContent = fmtKw(P.solar);
    n.home.val.textContent = fmtKw(P.home);
    n.grid.val.textContent = Math.abs(P.grid) < 0.04 ? "0 kW" : `${P.grid > 0 ? "Bezug" : "Einspeisung"} ${fmtKw(P.grid)}`;
    n.battery.val.textContent = `${Math.round(E.soc)} %`;
    n.car.val.textContent = `${Math.round(E.car.soc)} %`;
    n.battery.ring.setAttribute("stroke-dasharray", `${E.soc} 100`);
    n.car.ring.setAttribute("stroke-dasharray", `${E.car.soc} 100`);
    const self = P.home + P.car > 0 ? clamp((P.home + P.car - Math.max(0, P.grid)) / (P.home + P.car), 0, 1) : 1;
    page.querySelector("#energy-sub").textContent = `Gerade ${Math.round(self * 100)} % aus eigener Energie`;
  }

  // ---------- Tageswerte ----------
  function dayData() {
    const now = new Date();
    const nowH = now.getHours() + now.getMinutes() / 60;
    const xs = Array.from({ length: 97 }, (_, i) => i / 4);
    const solar = xs.map((x) => solarAt(x));
    const load = xs.map((x) => loadAt(x));
    const nowI = Math.round(nowH * 4);
    let prod = 0, cons = 0, direct = 0, surplus = 0, deficit = 0;
    for (let i = 0; i < nowI; i++) {
      prod += solar[i] / 4; cons += load[i] / 4;
      direct += Math.min(solar[i], load[i]) / 4;
      surplus += Math.max(0, solar[i] - load[i]) / 4;
      deficit += Math.max(0, load[i] - solar[i]) / 4;
    }
    const shift = Math.min(surplus, deficit, E.batteryKwh) * 0.9;
    const own = direct + shift;
    return { xs, solar, load, nowI, prod, cons, autarky: cons ? own / cons : 0, saved: own * E.price + (surplus - shift) * E.feedIn };
  }
  function renderChart() {
    const d = dayData();
    lineChart(chartBox, {
      xLabels: d.xs.map((x) => `${String(Math.floor(x)).padStart(2, "0")}:${String((x % 1) * 60).padStart(2, "0")}`),
      xTicks: [0, 24, 48, 72, 96],
      series: [
        { name: "Erzeugung", color: COL.solar, values: d.solar, dashedFrom: d.nowI, area: true },
        { name: "Verbrauch", color: COL.load, values: d.load, dashedFrom: d.nowI, area: true },
      ],
      nowIndex: d.nowI,
      yFmt: (v, axis) => (axis ? `${num(v, 0)}` : `${num(v)} kW`),
      tableCaption: "Erzeugung und Verbrauch heute in kW",
    });
    stats.replaceChildren(
      stat("Erzeugt", `${num(d.prod)}`, "kWh heute", "sun"),
      stat("Verbraucht", `${num(d.cons)}`, "kWh heute", "home"),
      stat("Autarkie", `${Math.round(d.autarky * 100)}`, "% eigene Energie", "zap"),
      stat("Gespart", `${num(d.saved, 2)}`, "€ heute", "check"));
  }
  const stat = (label, value, unit, icon) => h("div", { class: "stat" },
    h("div", { class: "stat-h" }, h("span", { html: svg(icon) }), label), h("div", { class: "stat-v" }, value), h("div", { class: "stat-u" }, unit));

  // ---------- Batterie & Auto ----------
  const bRing = sv("circle", { cx: 50, cy: 50, r: 42, class: "big-ring-val", pathLength: 100, transform: "rotate(-90 50 50)" });
  const bPct = h("div", { class: "batt-pct" });
  const bState = h("div", { class: "batt-state" });
  batt.append(h("div", { class: "batt-ring" }, sv("svg", { viewBox: "0 0 100 100" }, sv("circle", { cx: 50, cy: 50, r: 42, class: "big-ring-track" }), bRing), bPct),
    h("div", { class: "batt-info" }, bState, h("div", { class: "batt-cap" }, `${E.batteryKwh} kWh Speicher`)));

  const carBar = h("i");
  const carInfo = h("div", { class: "car-info" });
  const carSwitch = toggle(E.car.charging, (v) => { E.car.charging = v; renderCar(); step(); toast(v ? "Laden gestartet" : "Laden gestoppt", { sub: E.car.name, icon: "car", ms: 2200 }); }, "Auto laden");
  car.append(h("div", { class: "car-top" }, h("span", { class: "car-ico", html: svg("car") }), h("div", { class: "car-pct" }), carSwitch),
    h("div", { class: "car-bar" }, carBar), carInfo);
  function renderCar() {
    carSwitch.setAttribute("aria-checked", String(E.car.charging));
    car.classList.toggle("charging", E.car.charging);
  }
  function renderSide() {
    bRing.setAttribute("stroke-dasharray", `${E.soc} 100`);
    bPct.textContent = `${Math.round(E.soc)} %`;
    bState.textContent = P.battery > 0.04 ? `Lädt mit ${fmtKw(P.battery)}` : P.battery < -0.04 ? `Entlädt ${fmtKw(P.battery)}` : "Bereit";
    batt.classList.toggle("charging", P.battery > 0.04);
    car.querySelector(".car-pct").textContent = `${Math.round(E.car.soc)} %`;
    carBar.style.width = `${E.car.soc}%`;
    const rest = ((100 - E.car.soc) / 100) * E.car.capacity / E.car.kw;
    carInfo.textContent = E.car.charging ? `Lädt mit ${num(E.car.kw)} kW · voll in ${Math.floor(rest)} h ${Math.round((rest % 1) * 60)} min` : `Angesteckt · ca. ${Math.round(E.car.soc * 4.2)} km Reichweite`;
  }

  renderCar();
  step();
  renderChart();
  setInterval(step, 2000);
  setInterval(renderChart, 5 * 60000);
  bus.on("weather", () => { renderChart(); step(); });
}
