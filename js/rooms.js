// Seite 2: Räume – isometrischer Grundriss, Klima, Anwesenheit, Automationen
import { D, $, h, sv, svg, ICON, bus, num, toggle, toast, hhmm, sunTimes, mix } from "./core.js";
import { lightColor, byRoom, byId, isOpen, isHeating, roomName } from "./state.js";
import { openRoomSheet } from "./sheets.js";

const S = 40;                       // Pixel pro Meter
const C30 = Math.cos(Math.PI / 6);
const iso = (x, y, z = 0) => [(x - y) * C30 * S, (x + y) * 0.5 * S - z * S];
const P = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const WALL = { back: 1.3, inner: 0.55, front: 0.16 };
const T = 0.14;                     // Wandstärke

export function initRooms(page) {
  const FP = D.floorplan;
  const plan = h("div", { class: "plan" });
  const summary = h("div", { class: "plan-summary" });
  const climateList = h("div", { class: "clim-list" });
  const peopleList = h("div", { class: "people-list" });
  const autoList = h("div", { class: "auto-list" });

  page.append(h("div", { class: "wrap rooms-layout" },
    h("section", { class: "panel plan-panel", "aria-labelledby": "h-rooms" },
      h("div", { class: "page-h" }, h("div", {}, h("h1", { id: "h-rooms" }, "Räume"), h("p", { class: "page-sub" }, "Raum antippen zum Steuern")), summary),
      plan),
    h("div", { class: "col" },
      h("section", { class: "panel" }, h("div", { class: "group-h" }, h("h2", {}, "Klima")), climateList),
      h("section", { class: "panel" }, h("div", { class: "group-h" }, h("h2", {}, "Zuhause")), peopleList),
      h("section", { class: "panel" }, h("div", { class: "group-h" }, h("h2", {}, "Automationen"), h("span", { class: "hint" }, "Zeitpläne")), autoList))));

  // ---------- Geometrie ----------
  const Wd = FP.width, Dp = FP.depth;
  const corners = [[0, 0, WALL.back], [Wd, 0, WALL.back], [0, Dp, WALL.back], [Wd, Dp, 0], [0, 0, 0], [Wd, 0, 0], [0, Dp, 0]];
  const pts = corners.map(([x, y, z]) => iso(x, y, z));
  const pad = 26;
  const minX = Math.min(...pts.map((p) => p[0])) - pad, maxX = Math.max(...pts.map((p) => p[0])) + pad;
  const minY = Math.min(...pts.map((p) => p[1])) - pad, maxY = Math.max(...pts.map((p) => p[1])) + pad;

  // Wände: Raumkanten sammeln und kollineare Stücke zusammenführen
  const segs = { h: new Map(), v: new Map() };
  const add = (map, key, a, b) => { if (!map.has(key)) map.set(key, []); map.get(key).push([Math.min(a, b), Math.max(a, b)]); };
  for (const r of FP.rooms) {
    add(segs.h, r.y, r.x, r.x + r.w); add(segs.h, r.y + r.d, r.x, r.x + r.w);
    add(segs.v, r.x, r.y, r.y + r.d); add(segs.v, r.x + r.w, r.y, r.y + r.d);
  }
  const merge = (list) => list.sort((a, b) => a[0] - b[0]).reduce((acc, s) => {
    const last = acc.at(-1);
    if (last && s[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], s[1]); else acc.push([...s]);
    return acc;
  }, []);
  const walls = [];
  for (const [y, list] of segs.h) for (const [a, b] of merge(list)) walls.push({ x1: a, y1: y, x2: b, y2: y, dir: "h", kind: y === 0 ? "back" : y === Dp ? "front" : "inner" });
  for (const [x, list] of segs.v) for (const [a, b] of merge(list)) walls.push({ x1: x, y1: a, x2: x, y2: b, dir: "v", kind: x === 0 ? "back" : x === Wd ? "front" : "inner" });
  walls.sort((a, b) => (a.x1 + a.x2 + a.y1 + a.y2) - (b.x1 + b.x2 + b.y1 + b.y2));

  const gFloor = sv("g"), gGlow = sv("g", { class: "fp-glows" }), gWalls = sv("g"), gOpen = sv("g"), gLabels = sv("g"), gHit = sv("g");
  const defs = sv("defs",
    sv("linearGradient", { id: "fp-floor", x1: 0, y1: 0, x2: 1, y2: 1 },
      sv("stop", { offset: "0%", "stop-color": "#1b1e24" }), sv("stop", { offset: "100%", "stop-color": "#121418" })),
    sv("filter", { id: "fp-blur", x: "-50%", y: "-50%", width: "200%", height: "200%" }, sv("feGaussianBlur", { stdDeviation: 14 })));
  const root = sv("svg", { class: "fp", viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`, role: "group", "aria-label": "Grundriss" },
    defs, gFloor, gGlow, gWalls, gOpen, gLabels, gHit);
  plan.append(root);

  // Böden + Klickflächen (statisch)
  const floors = {};
  for (const r of FP.rooms) {
    const i = 0.04;
    const poly = P([iso(r.x + i, r.y + i), iso(r.x + r.w - i, r.y + i), iso(r.x + r.w - i, r.y + r.d - i), iso(r.x + i, r.y + r.d - i)]);
    floors[r.id] = sv("polygon", { points: poly, class: "fp-floor", fill: "url(#fp-floor)" });
    gFloor.append(floors[r.id]);
    const hit = sv("polygon", { points: poly, class: "fp-hit", tabindex: 0, role: "button", "aria-label": `${r.name} steuern` });
    hit.addEventListener("click", () => openRoomSheet(r.id));
    hit.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRoomSheet(r.id); } });
    hit.addEventListener("pointerenter", () => floors[r.id].classList.add("hover"));
    hit.addEventListener("pointerleave", () => floors[r.id].classList.remove("hover"));
    hit.addEventListener("focus", () => floors[r.id].classList.add("hover"));
    hit.addEventListener("blur", () => floors[r.id].classList.remove("hover"));
    gHit.append(hit);
  }

  // Wände (statisch): sichtbare Vorderseite + Oberkante
  for (const w of walls) {
    const hgt = WALL[w.kind];
    const o = w.kind === "back" ? 0 : w.kind === "front" ? -T : -T / 2; // Versatz zur Innenseite
    const [nx, ny] = w.dir === "h" ? [0, 1] : [1, 0];
    const fx1 = w.x1 + nx * (o + T), fy1 = w.y1 + ny * (o + T), fx2 = w.x2 + nx * (o + T), fy2 = w.y2 + ny * (o + T);
    const bx1 = w.x1 + nx * o, by1 = w.y1 + ny * o, bx2 = w.x2 + nx * o, by2 = w.y2 + ny * o;
    gWalls.append(
      sv("polygon", { class: `fp-wall ${w.dir === "h" ? "l" : "r"}`, points: P([iso(fx1, fy1), iso(fx2, fy2), iso(fx2, fy2, hgt), iso(fx1, fy1, hgt)]) }),
      sv("polygon", { class: "fp-top", points: P([iso(bx1, by1, hgt), iso(bx2, by2, hgt), iso(fx2, fy2, hgt), iso(fx1, fy1, hgt)]) }));
  }

  // ---------- Dynamische Ebenen ----------
  function opening(o) {
    const s = o.sensor && byId(D.sensors, o.sensor);
    const state = s ? s.state : "closed";
    const cls = state === "open" ? "open" : state === "tilted" ? "tilted" : "";
    const along = (t) => (o.side === "n" ? [t, 0] : o.side === "s" ? [t, Dp] : o.side === "w" ? [0, t] : [Wd, t]);
    const off = o.side === "n" || o.side === "w" ? T + 0.01 : -T - 0.01;
    const shift = ([x, y]) => (o.side === "n" || o.side === "s" ? [x, y + off] : [x + off, y]);
    const a = shift(along(o.from)), b = shift(along(o.to));
    const back = o.side === "n" || o.side === "w";
    const g = sv("g", { class: `fp-open ${cls}` });
    if (back) {
      const z0 = o.door ? 0.02 : 0.42, z1 = 1.12;
      g.append(sv("polygon", { class: "fp-glass", points: P([iso(...a, z0), iso(...b, z0), iso(...b, z1), iso(...a, z1)]) }));
      const c = o.cover && byId(D.covers, o.cover);
      if (c) {
        const zb = z1 - (1 - c.position / 100) * (z1 - z0);
        if (zb < z1 - 0.01) {
          g.append(sv("polygon", { class: "fp-blind", points: P([iso(...a, zb), iso(...b, zb), iso(...b, z1), iso(...a, z1)]) }));
          for (let z = z1 - 0.07; z > zb; z -= 0.07) g.append(sv("line", { class: "fp-slat", x1: iso(...a, z)[0], y1: iso(...a, z)[1], x2: iso(...b, z)[0], y2: iso(...b, z)[1] }));
        }
      }
    } else {
      g.append(sv("line", { class: "fp-glass-line", x1: iso(...a, WALL.front)[0], y1: iso(...a, WALL.front)[1], x2: iso(...b, WALL.front)[0], y2: iso(...b, WALL.front)[1] }));
      const c = o.cover && byId(D.covers, o.cover);
      if (c && c.position < 100) {
        const m = (1 - c.position / 100);
        const e = [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m];
        g.append(sv("line", { class: "fp-blind-line", x1: iso(...a, WALL.front + 0.02)[0], y1: iso(...a, WALL.front + 0.02)[1], x2: iso(...e, WALL.front + 0.02)[0], y2: iso(...e, WALL.front + 0.02)[1] }));
      }
      if (o.lock) {
        const [mx, my] = iso((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, WALL.front + 0.9);
        g.append(sv("g", { class: `fp-lock${D.lock.locked ? "" : " unlocked"}` },
          sv("circle", { cx: mx, cy: my, r: 13 }),
          sv("svg", { x: mx - 7, y: my - 7, width: 14, height: 14, viewBox: "0 0 24 24", class: "i", html: ICON[D.lock.locked ? "lock" : "unlock"] })));
      }
    }
    return g;
  }

  function renderDynamic() {
    gGlow.replaceChildren();
    gLabels.replaceChildren();
    for (const r of FP.rooms) {
      const cx = r.x + r.w / 2, cy = r.y + r.d / 2;
      const lights = byRoom(D.lights, r.id).filter((l) => l.on);
      floors[r.id].classList.toggle("lit", lights.length > 0);
      for (const l of lights) {
        const col = lightColor(l), b = l.brightness / 100;
        const rad = Math.min(r.w, r.d) * 0.62;
        const [x, y] = iso(cx, cy);
        gGlow.append(
          sv("polygon", { points: floors[r.id].getAttribute("points"), fill: col, opacity: (0.05 + 0.13 * b).toFixed(2) }),
          sv("ellipse", { cx: x, cy: y, rx: 1.22 * rad * S, ry: 0.7 * rad * S, fill: col, opacity: (0.18 + 0.5 * b).toFixed(2), filter: "url(#fp-blur)" }),
          sv("circle", { cx: x, cy: y - 1.6 * S * 0.5, r: 3.5, fill: mix(col, "#ffffff", 0.5), class: "fp-bulb" }));
      }
      const [lx, ly] = iso(cx, cy);
      const clim = byRoom(D.climate, r.id)[0];
      const label = sv("g", { class: "fp-label" },
        sv("text", { x: lx, y: ly + 4, class: "fp-name", "text-anchor": "middle" }, r.name),
        clim && sv("text", { x: lx, y: ly + 20, class: `fp-temp${isHeating(clim) ? " heat" : ""}`, "text-anchor": "middle" }, `${num(clim.current)}°`));
      gLabels.append(label);
      D.people.filter((p) => p.home && p.room === r.id).forEach((p, i) => {
        const [px, py] = iso(cx + 0.9 + i * 0.6, cy - 0.9);
        gLabels.append(sv("g", { class: "fp-person", style: `--pc:${p.color}` },
          sv("circle", { cx: px, cy: py, r: 13, class: "fp-ping" }),
          sv("circle", { cx: px, cy: py, r: 11, fill: p.color }),
          sv("text", { x: px, y: py + 4, "text-anchor": "middle", class: "fp-initial" }, p.name[0])));
      });
    }
    gOpen.replaceChildren(...FP.openings.map(opening));
    renderSummary();
  }

  function renderSummary() {
    const on = D.lights.filter((l) => l.on).length;
    const avg = D.climate.reduce((a, t) => a + t.current, 0) / D.climate.length;
    const opened = D.sensors.filter((s) => isOpen(s));
    const home = D.people.filter((p) => p.home).length;
    summary.replaceChildren(
      h("span", { class: "chip-s" }, h("span", { html: svg("bulb") }), on ? `${on} Lichter an` : "Alle Lichter aus"),
      h("span", { class: "chip-s" }, h("span", { html: svg("thermo") }), `Ø ${num(avg)}°`),
      h("span", { class: `chip-s${opened.length ? " warn" : ""}` }, h("span", { html: svg("window") }),
        opened.length ? `${opened.length} offen` : "Alles zu"),
      h("span", { class: "chip-s" }, h("span", { html: svg("user") }), `${home} zu Hause`));
  }

  let queued = false;
  const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; renderDynamic(); }); };
  ["light", "cover", "sensor", "climate", "people", "lock"].forEach((t) => bus.on(t, schedule));
  renderDynamic();

  // ---------- Klima-Liste ----------
  const climRows = new Map();
  for (const t of D.climate) {
    const ring = sv("circle", { cx: 20, cy: 20, r: 16, class: "mini-val", pathLength: 100 });
    const row = h("button", { class: "clim-row", type: "button", onclick: () => openRoomSheet(t.room) },
      sv("svg", { viewBox: "0 0 40 40", class: "mini-ring" }, sv("circle", { cx: 20, cy: 20, r: 16, class: "mini-track" }), ring),
      h("div", { class: "clim-name" }, h("div", {}, t.name), h("div", { class: "clim-sub" })),
      h("div", { class: "clim-temp" }));
    climRows.set(t, { row, ring });
    climateList.append(row);
  }
  const renderClimate = (t) => {
    const { row, ring } = climRows.get(t);
    const heat = isHeating(t);
    row.classList.toggle("heating", heat);
    ring.setAttribute("stroke-dasharray", `${((t.target - 15) / 13) * 100} 100`);
    row.querySelector(".clim-sub").innerHTML = `${heat ? svg("flame") : ""}<span>${heat ? "Heizt auf" : "Hält"} ${num(t.target)}° · ${t.humidity} %</span>`;
    row.querySelector(".clim-temp").textContent = `${num(t.current)}°`;
  };
  D.climate.forEach(renderClimate);
  bus.on("climate", renderClimate);

  // ---------- Anwesenheit ----------
  const renderPeople = () => peopleList.replaceChildren(...D.people.map((p) => {
    const where = p.home ? `Zu Hause · ${roomName(p.room)}` : `${p.where}${p.eta ? ` · in ${p.eta} min da` : ""}`;
    return h("div", { class: `person${p.home ? " home" : ""}`, style: { "--pc": p.color } },
      h("span", { class: "av lg" }, p.name[0]),
      h("div", { class: "person-info" }, h("div", { class: "person-name" }, p.name), h("div", { class: "person-where" }, where),
        !p.home && p.eta && h("div", { class: "eta" }, h("i", { style: { width: `${Math.max(6, 100 - p.eta * 1.6)}%` } }))));
  }));
  bus.on("people", renderPeople);
  renderPeople();

  // ---------- Automationen ----------
  const sunset = hhmm(sunTimes().sunset);
  for (const a of D.schedules) {
    const when = a.time === "sunset" ? `Sonnenuntergang · ${sunset}` : a.time;
    autoList.append(h("div", { class: "auto-row" },
      h("span", { class: "auto-ico", html: svg(a.icon) }),
      h("div", { class: "auto-info" }, h("div", {}, a.name), h("div", { class: "auto-sub" }, `${a.days} · ${when}`)),
      toggle(a.enabled, (v) => { a.enabled = v; toast(a.name, { sub: v ? "Aktiviert" : "Pausiert", icon: a.icon, ms: 2000 }); }, `${a.name} aktiv`)));
  }
}
