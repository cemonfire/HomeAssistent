// Seite 5: Infos – Wetter (Stundenkurve + 6 Tage), Abfahrten, Müll, Pakete
import { D, h, svg, bus, num, hhmm, sunTimes, condOf, mix } from "./core.js";
import { lineChart } from "./chart.js";

const TEMP = "#c08a1e", RAIN = "#4f8cf0";
const PKG_STEPS = ["Bestellt", "Versandt", "Unterwegs", "Zugestellt"];

export function initInfo(page) {
  const now = h("div", { class: "wx-now" });
  const chart = h("div", { class: "chart-box wx-chart" });
  const rain = h("div", { class: "rain-bars", "aria-label": "Regenwahrscheinlichkeit" });
  const days = h("div", { class: "days" });
  const transit = h("div", { class: "departures" });
  const trash = h("div", { class: "trash" });
  const pkgs = h("div", { class: "pkgs" });

  page.append(h("div", { class: "wrap info-layout" },
    h("section", { class: "panel wx-panel", "aria-labelledby": "h-info" },
      h("div", { class: "page-h" }, h("div", {}, h("h1", { id: "h-info" }, "Infos"), h("p", { class: "page-sub" }, "Wetter, Wege und Erledigungen")), now),
      h("div", { class: "group-h" }, h("h2", {}, "Nächste 24 Stunden"), h("span", { class: "hint" }, "Temperatur °C")),
      chart,
      h("div", { class: "group-h rain-h" }, h("h2", {}, "Regen"), h("span", { class: "hint" }, "Wahrscheinlichkeit")),
      rain),
    h("section", { class: "panel days-panel" }, h("div", { class: "group-h" }, h("h2", {}, "6 Tage")), days),
    h("section", { class: "panel" }, h("div", { class: "group-h" }, h("h2", {}, "Abfahrten"), h("span", { class: "hint" }, `${D.transit.stop} · ${D.transit.walk ?? 4} min zu Fuß`)), transit),
    h("section", { class: "panel" }, h("div", { class: "group-h" }, h("h2", {}, "Müllabfuhr")), trash),
    h("section", { class: "panel" }, h("div", { class: "group-h" }, h("h2", {}, "Pakete")), pkgs)));

  // ---------- Wetter ----------
  function hourly() {
    const W = D.weather, start = new Date();
    const base = (hr, day) => {
      const d = W.days[Math.min(day, W.days.length - 1)];
      return (d.min + d.max) / 2 + ((d.max - d.min) / 2) * Math.cos((2 * Math.PI * (hr - 15)) / 24);
    };
    const h0 = start.getHours();
    const delta = W.temp - base(h0, 0);
    const wet = W.condition === "rain" || W.condition === "storm" || W.condition === "snow";
    return Array.from({ length: 25 }, (_, i) => {
      const hr = h0 + i, day = Math.floor(hr / 24);
      const temp = base(hr % 24, day) + delta * Math.max(0, 1 - i / 6);
      const dayRain = W.days[Math.min(day, W.days.length - 1)].rain;
      const r = Math.round(Math.max(0, Math.min(100, (wet && i < 6 ? 75 : dayRain) + 18 * Math.sin(i * 0.9 + 1))) / 5) * 5;
      return { label: `${String(hr % 24).padStart(2, "0")} Uhr`, temp: Math.round(temp * 10) / 10, rain: r };
    });
  }

  function renderWeather() {
    const W = D.weather, c = condOf(W.condition), st = sunTimes();
    const today = W.days[0];
    now.replaceChildren(
      h("span", { class: "wx-ico", html: svg(c.icon) }),
      h("div", { class: "wx-temp" }, `${W.temp}°`),
      h("div", { class: "wx-meta" },
        h("div", { class: "wx-text" }, c.text),
        h("div", { class: "wx-hl" }, `H ${today.max}° · T ${today.min}°`),
        h("div", { class: "wx-chips" },
          h("span", { class: "chip-s" }, h("span", { html: svg("droplet") }), `${W.humidity} %`),
          h("span", { class: "chip-s" }, h("span", { html: svg("wind") }), `${W.wind} km/h`),
          h("span", { class: "chip-s" }, h("span", { html: svg("sunset") }), `${hhmm(st.sunrise)} – ${hhmm(st.sunset)}`))));

    const hrs = hourly();
    lineChart(chart, {
      xLabels: hrs.map((x) => x.label),
      xTicks: [0, 6, 12, 18, 24],
      series: [{ name: "Temperatur", color: TEMP, values: hrs.map((x) => x.temp), area: true }],
      valueLabels: [3, 6, 9, 12, 15, 18, 21, 24],
      nowIndex: 0,
      minY: Math.floor(Math.min(...hrs.map((x) => x.temp)) - 2),
      yFmt: (v, axis) => (axis ? `${num(v, 0)}°` : `${num(v, 0)}°`),
      tableCaption: "Temperatur der nächsten 24 Stunden",
    });
    rain.replaceChildren(...hrs.map((x, i) => h("div", { class: "rb", style: { "--i": i }, title: `${x.label}: ${x.rain} %` },
      h("i", { style: { height: `${Math.max(2, x.rain)}%`, background: RAIN, opacity: x.rain < 10 ? 0.35 : 1 } }),
      i % 3 === 0 && x.rain >= 20 ? h("span", {}, `${x.rain}`) : null)));

    // 6 Tage mit Spannweiten-Balken
    const lo = Math.min(...W.days.map((d) => d.min)), hi = Math.max(...W.days.map((d) => d.max));
    const pos = (v) => ((v - lo) / (hi - lo)) * 100;
    const tcol = (v) => mix(RAIN, TEMP, Math.max(0, Math.min(1, (v - lo) / (hi - lo))));
    days.replaceChildren(...W.days.map((d, i) => h("div", { class: "day-row" },
      h("span", { class: "day-name" }, d.day),
      h("span", { class: "day-ico", html: svg(condOf(d.cond).icon) }),
      h("span", { class: "day-rain" }, d.rain >= 20 ? `${d.rain} %` : ""),
      h("span", { class: "day-min" }, `${d.min}°`),
      h("span", { class: "range" },
        h("i", { style: { left: `${pos(d.min)}%`, width: `${pos(d.max) - pos(d.min)}%`, background: `linear-gradient(90deg, ${tcol(d.min)}, ${tcol(d.max)})` } }),
        i === 0 && h("b", { style: { left: `${pos(W.temp)}%` } })),
      h("span", { class: "day-max" }, `${d.max}°`))));
  }
  bus.on("weather", renderWeather);
  renderWeather();
  setInterval(renderWeather, 15 * 60000);

  // ---------- Abfahrten ----------
  const walk = D.transit.walk ?? 4;
  function renderTransit() {
    const d = new Date();
    const m = d.getMinutes() + d.getSeconds() / 60;
    const deps = [];
    for (const l of D.transit.lines) {
      let first = (((l.offset - m) % l.every) + l.every) % l.every;
      for (let k = 0; k < 3; k++) deps.push({ ...l, in: Math.floor(first + k * l.every + (l.delay || 0)) });
    }
    deps.sort((a, b) => a.in - b.in);
    transit.replaceChildren(...deps.slice(0, 5).map((x) => {
      const go = x.in >= walk && x.in <= walk + 1;
      const late = x.in < walk;
      return h("div", { class: `dep${late ? " late" : ""}` },
        h("span", { class: "line", style: { background: x.color } }, x.line),
        h("div", { class: "dep-dir" }, h("div", {}, x.dir), x.delay ? h("div", { class: "dep-delay" }, h("span", { html: svg("clock") }), `+${x.delay} min Verspätung`) : null),
        go && h("span", { class: "badge" }, "Jetzt los"),
        h("span", { class: "dep-in" }, x.in <= 0 ? "jetzt" : `${x.in}`, x.in > 0 && h("small", {}, " min")));
    }));
  }
  renderTransit();
  setInterval(renderTransit, 10000);

  // ---------- Müll ----------
  const dayStr = (n) => {
    if (n === 0) return "Heute";
    if (n === 1) return "Morgen";
    const d = new Date(); d.setDate(d.getDate() + n);
    return d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
  };
  trash.replaceChildren(...[...D.trash].sort((a, b) => a.inDays - b.inDays).map((t) => h("div", { class: `bin${t.inDays <= 1 ? " soon" : ""}` },
    h("span", { class: "bin-ico", style: { "--bc": t.color }, html: svg("trash") }),
    h("div", { class: "bin-info" }, h("div", {}, t.type), h("div", { class: "bin-sub" }, t.inDays === 1 ? "Heute Abend rausstellen" : `alle ${t.every} Tage`)),
    h("span", { class: "bin-when" }, dayStr(t.inDays)))));

  // ---------- Pakete ----------
  pkgs.replaceChildren(...D.packages.map((p) => h("div", { class: `pkg${p.step >= 3 ? " done" : ""}` },
    h("div", { class: "pkg-top" }, h("span", { class: "pkg-ico", html: svg("pkg") }),
      h("div", { class: "pkg-info" }, h("div", {}, p.name), h("div", { class: "pkg-sub" }, `${p.carrier} · ${p.eta}`))),
    h("ol", { class: "pkg-steps", "aria-label": `Status: ${PKG_STEPS[p.step]}` },
      PKG_STEPS.map((s, i) => h("li", { class: i <= p.step ? "on" : "", title: s }, h("span", {}, s)))))));
}
