// Lebendiger Hintergrund: Himmel nach Tageszeit und Wetter (Sterne, Wolken, Regen, Schnee, Blitze)
import { D, bus, sunTimes, mix, reducedMotion } from "./core.js";

const K = {
  night: { top: "#03050b", bottom: "#0a1022", glow: "#1a2240" },
  dawn:  { top: "#10142c", bottom: "#4a2a46", glow: "#e0835a" },
  day:   { top: "#0a1830", bottom: "#1b3254", glow: "#4a78b8" },
  dusk:  { top: "#120d28", bottom: "#552648", glow: "#f0874a" },
};
const blend = (a, b, t) => ({ top: mix(a.top, b.top, t), bottom: mix(a.bottom, b.bottom, t), glow: mix(a.glow, b.glow, t) });

export function initSky(canvas) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, hourOverride = null, flash = 0, last = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const stars = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random() * 0.75, r: rnd(0.4, 1.4), p: rnd(0, 6.28) }));
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: rnd(0.05, 0.45), r: rnd(0.18, 0.34), v: rnd(0.000004, 0.00001) * (i % 2 ? 1 : 0.7) }));
  const drops = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), l: rnd(10, 22), v: rnd(0.9, 1.4), r: rnd(1, 2.6), d: rnd(0, 6.28) }));

  const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
  addEventListener("resize", resize);
  resize();
  bus.on("skyhour", (v) => { hourOverride = v; draw(performance.now(), true); });
  bus.on("weather", () => draw(performance.now(), true));

  function phase(hr) {
    const st = sunTimes();
    const rise = st.sunrise.getHours() + st.sunrise.getMinutes() / 60;
    const set = st.sunset.getHours() + st.sunset.getMinutes() / 60;
    let c, night;
    if (hr < rise - 1 || hr > set + 1) { c = K.night; night = 1; }
    else if (hr < rise + 1) { const f = (hr - rise + 1) / 2; c = f < 0.5 ? blend(K.night, K.dawn, f * 2) : blend(K.dawn, K.day, (f - 0.5) * 2); night = 1 - f; }
    else if (hr <= set - 1) { c = K.day; night = 0; }
    else { const f = (hr - set + 1) / 2; c = f < 0.5 ? blend(K.day, K.dusk, f * 2) : blend(K.dusk, K.night, (f - 0.5) * 2); night = f; }
    return { c, night, sunT: (hr - rise) / (set - rise) };
  }

  function draw(now, force = false) {
    const cond = D.weather.condition;
    const lite = document.body.classList.contains("lite");
    const busy = cond === "rain" || cond === "snow" || cond === "storm" || document.body.classList.contains("ambient-on");
    const fps = lite || reducedMotion() ? 0 : busy ? 30 : 12;
    if (!force && (document.hidden || !fps || now - last < 1000 / fps)) return;
    last = now;
    const d = new Date();
    const hr = hourOverride ?? d.getHours() + d.getMinutes() / 60;
    const { c, night, sunT } = phase(hr);
    const overcast = { clear: 0, cloudy: 0.45, rain: 0.8, snow: 0.7, storm: 0.95 }[cond] ?? 0.4;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c.top);
    g.addColorStop(1, mix(c.bottom, "#15181e", overcast * 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Horizont-Leuchten
    const hg = ctx.createRadialGradient(W * 0.5, H * 1.1, 0, W * 0.5, H * 1.1, Math.max(W, H) * 0.8);
    hg.addColorStop(0, c.glow + "66"); hg.addColorStop(1, c.glow + "00");
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);

    // Sonne bzw. Mond
    if (sunT > 0 && sunT < 1) {
      const sx = W * (0.1 + 0.8 * sunT), sy = H * (0.95 - Math.sin(Math.PI * sunT) * 0.75);
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.5);
      sg.addColorStop(0, `rgba(255,214,150,${0.32 * (1 - overcast * 0.7)})`); sg.addColorStop(1, "rgba(255,214,150,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    } else {
      const mg = ctx.createRadialGradient(W * 0.82, H * 0.16, 0, W * 0.82, H * 0.16, H * 0.3);
      mg.addColorStop(0, `rgba(200,215,255,${0.16 * (1 - overcast * 0.6)})`); mg.addColorStop(1, "rgba(200,215,255,0)");
      ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
    }

    // Sterne
    const sa = night * (1 - overcast);
    if (sa > 0.02) for (const s of stars) {
      ctx.globalAlpha = sa * (0.45 + 0.55 * Math.sin(now / 900 + s.p) ** 2);
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Wolken
    if (overcast > 0) for (const cl of clouds) {
      const x = ((cl.x + now * cl.v) % 1.4 - 0.2) * W, y = cl.y * H, r = cl.r * Math.max(W, H);
      const cg = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tone = night > 0.5 ? "60,68,88" : "150,160,180";
      cg.addColorStop(0, `rgba(${tone},${0.16 * overcast})`); cg.addColorStop(1, `rgba(${tone},0)`);
      ctx.fillStyle = cg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Niederschlag
    if (cond === "rain" || cond === "storm") {
      ctx.strokeStyle = "rgba(170,195,235,.35)"; ctx.lineWidth = 1; ctx.beginPath();
      const n = cond === "storm" ? 220 : 150;
      for (let i = 0; i < n; i++) {
        const p = drops[i];
        p.y += (p.v * 0.018); if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        const x = p.x * W, y = p.y * H;
        ctx.moveTo(x, y); ctx.lineTo(x - p.l * 0.25, y + p.l);
      }
      ctx.stroke();
    } else if (cond === "snow") {
      ctx.fillStyle = "rgba(235,240,255,.7)";
      for (let i = 0; i < 120; i++) {
        const p = drops[i];
        p.y += p.v * 0.0016; if (p.y > 1.02) { p.y = -0.02; p.x = Math.random(); }
        ctx.beginPath(); ctx.arc((p.x + Math.sin(now / 1400 + p.d) * 0.01) * W, p.y * H, p.r, 0, 6.283); ctx.fill();
      }
    }
    if (cond === "storm") {
      if (Math.random() < 0.004) flash = 1;
      if (flash > 0.02) { ctx.fillStyle = `rgba(210,220,255,${flash * 0.22})`; ctx.fillRect(0, 0, W, H); flash *= 0.82; }
    }
  }

  (function loop(now) { draw(now); requestAnimationFrame(loop); })(0);
  draw(0, true);
}
