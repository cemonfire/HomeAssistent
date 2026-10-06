// Schlankes Linien-/Flächendiagramm in SVG mit Fadenkreuz-Tooltip.
// Eine y-Achse, dünne Linien, dezente Gitterlinien, Legende ab 2 Serien.
import { h, sv } from "./core.js";

export function lineChart(container, opts) {
  const { series, xLabels, xTicks, yFmt = (v) => v, yTicks = 4, nowIndex, valueLabels, minY, tableCaption } = opts;
  const wrap = h("div", { class: "chart" });
  const legend = series.length > 1 && h("div", { class: "chart-legend" }, series.map((s) =>
    h("span", { class: "lg" }, h("i", { style: { background: s.color } }), s.name, h("b", { class: "lg-val", "data-key": s.name }))));
  const svgEl = sv("svg", { class: "chart-svg", role: "img", "aria-label": tableCaption || "Diagramm" });
  const tip = h("div", { class: "chart-tip", hidden: true });
  const plot = h("div", { class: "chart-plot" }, svgEl, tip);
  // Tabellenansicht für Screenreader
  const table = h("table", { class: "sr-only" }, h("caption", {}, tableCaption || ""),
    h("tr", {}, h("th", {}, "Zeit"), series.map((s) => h("th", {}, s.name))),
    xLabels.map((x, i) => h("tr", {}, h("td", {}, x), series.map((s) => h("td", {}, s.values[i] == null ? "–" : yFmt(s.values[i]))))));
  wrap.append(...[legend, plot, table].filter(Boolean));
  container.replaceChildren(wrap);

  const n = xLabels.length;
  const all = series.flatMap((s) => s.values.filter((v) => v != null));
  const lo = minY ?? Math.min(0, ...all);
  const rawHi = Math.max(...all);
  const step = niceStep((rawHi - lo) / yTicks);
  const hi = Math.ceil(rawHi / step) * step || 1;
  const yMin = Math.floor(lo / step) * step;

  let W = 0, H = 0, X, Y;
  const M = { l: 40, r: 14, t: valueLabels ? 22 : 12, b: 24 };

  function draw() {
    W = plot.clientWidth; H = plot.clientHeight;
    if (!W || !H) return;
    svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
    X = (i) => M.l + (i / (n - 1)) * (W - M.l - M.r);
    Y = (v) => M.t + (1 - (v - yMin) / (hi - yMin)) * (H - M.t - M.b);
    const g = [];
    const defs = sv("defs");
    for (let v = yMin; v <= hi + 1e-9; v += step) {
      g.push(sv("line", { x1: M.l, x2: W - M.r, y1: Y(v), y2: Y(v), class: "c-grid" }));
      g.push(sv("text", { x: M.l - 8, y: Y(v) + 4, class: "c-axis", "text-anchor": "end" }, yFmt(v, true)));
    }
    for (const i of xTicks) g.push(sv("text", { x: X(i), y: H - 6, class: "c-axis", "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle" }, xLabels[i]));
    if (nowIndex != null) {
      g.push(sv("line", { x1: X(nowIndex), x2: X(nowIndex), y1: M.t - 4, y2: H - M.b, class: "c-now" }));
      g.push(sv("text", { x: X(nowIndex) + 5, y: M.t + 6, class: "c-axis c-now-t" }, "Jetzt"));
    }
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => (v == null ? null : [X(i), Y(v)]));
      const split = s.dashedFrom ?? n;
      const solid = pts.slice(0, split + 1).filter(Boolean);
      const dashed = pts.slice(split).filter(Boolean);
      if (s.area) {
        const gid = `cg-${si}-${Math.random().toString(36).slice(2, 7)}`;
        defs.append(sv("linearGradient", { id: gid, x1: 0, x2: 0, y1: 0, y2: 1 },
          sv("stop", { offset: "0%", "stop-color": s.color, "stop-opacity": 0.32 }),
          sv("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": 0 })));
        const ap = pts.filter(Boolean);
        g.push(sv("path", { d: `${smooth(ap)} L${ap.at(-1)[0]} ${Y(yMin)} L${ap[0][0]} ${Y(yMin)} Z`, fill: `url(#${gid})`, class: "c-area" }));
      }
      if (solid.length > 1) g.push(sv("path", { d: smooth(solid), stroke: s.color, class: "c-line" }));
      if (dashed.length > 1) g.push(sv("path", { d: smooth(dashed), stroke: s.color, class: "c-line dashed" }));
      if (nowIndex != null && pts[nowIndex]) g.push(sv("circle", { cx: pts[nowIndex][0], cy: pts[nowIndex][1], r: 4, fill: s.color, class: "c-dot" }));
      if (valueLabels) valueLabels.forEach((i) => pts[i] && g.push(sv("text", { x: pts[i][0], y: pts[i][1] - 10, class: "c-vlabel", "text-anchor": "middle" }, yFmt(s.values[i]))));
    });
    const cross = sv("line", { class: "c-cross", y1: M.t, y2: H - M.b, visibility: "hidden" });
    const dots = series.map((s) => sv("circle", { r: 4.5, fill: s.color, class: "c-dot", visibility: "hidden" }));
    const hit = sv("rect", { x: M.l, y: 0, width: W - M.l - M.r, height: H, fill: "transparent", class: "c-hit" });
    svgEl.replaceChildren(defs, ...g, cross, ...dots, hit);

    const show = (e) => {
      const r = svgEl.getBoundingClientRect();
      const i = Math.round(((e.clientX - r.left - M.l) / (W - M.l - M.r)) * (n - 1));
      if (i < 0 || i >= n) return hide();
      cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("visibility", "visible");
      series.forEach((s, k) => {
        const v = s.values[i];
        dots[k].setAttribute("visibility", v == null ? "hidden" : "visible");
        if (v != null) { dots[k].setAttribute("cx", X(i)); dots[k].setAttribute("cy", Y(v)); }
      });
      tip.hidden = false;
      tip.replaceChildren(h("div", { class: "tip-x" }, xLabels[i]), ...series.map((s) =>
        h("div", { class: "tip-row" }, h("i", { style: { background: s.color } }), h("span", {}, s.name), h("b", {}, s.values[i] == null ? "–" : yFmt(s.values[i])))));
      const tx = X(i) + 14 + tip.offsetWidth > W ? X(i) - 14 - tip.offsetWidth : X(i) + 14;
      tip.style.transform = `translate(${tx}px, ${M.t}px)`;
    };
    const hide = () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); dots.forEach((d) => d.setAttribute("visibility", "hidden")); };
    hit.addEventListener("pointermove", show);
    hit.addEventListener("pointerdown", show);
    hit.addEventListener("pointerleave", hide);
  }
  if (legend) series.forEach((s) => {
    const v = s.values[nowIndex ?? s.values.length - 1];
    legend.querySelector(`[data-key="${s.name}"]`).textContent = v == null ? "" : yFmt(v);
  });
  new ResizeObserver(draw).observe(plot);
  draw();
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

// Weiche Kurve (Catmull-Rom → Bézier), ohne Überschwinger an Spitzen zu übertreiben
export function smooth(p) {
  if (p.length < 2) return "";
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const t = 0.18;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
