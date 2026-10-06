// Simulierte Kamerabilder (Canvas). Ersetzt später echte Streams.
import { h } from "./core.js";

const W = 640, H = 360;

function glow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
function vgrad(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function person(ctx, x, base, s, t, { walk = true, label = "Person" } = {}) {
  const sw = walk ? Math.sin(t / 140) : Math.sin(t / 900) * 0.08;
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#646a7a"; ctx.fillStyle = "#6e7587"; ctx.lineCap = "round";
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(sw * 12, -3); ctx.moveTo(0, -44); ctx.lineTo(-sw * 12, -3); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-13, -94, 26, 54, 10); ctx.fill();
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-11, -84); ctx.lineTo(-11 - sw * 8, -52); ctx.moveTo(11, -84); ctx.lineTo(11 + sw * 8, -52); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -108 + (walk ? 0 : Math.sin(t / 700) * 1.5), 12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Erkennungsrahmen
  const bw = 64 * s, top = base - 128 * s, bh = 132 * s, l = x - bw / 2, c = 10;
  ctx.strokeStyle = "rgba(255,197,102,.9)"; ctx.lineWidth = 2;
  ctx.beginPath();
  [[l, top, 1, 1], [l + bw, top, -1, 1], [l, top + bh, 1, -1], [l + bw, top + bh, -1, -1]].forEach(([px, py, dx, dy]) => {
    ctx.moveTo(px + dx * c, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * c);
  });
  ctx.stroke();
  ctx.fillStyle = "rgba(255,197,102,.9)";
  ctx.font = "600 12px Inter, system-ui, sans-serif";
  ctx.fillText(label, l, top - 7);
}

function parcel(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#5c4529"; ctx.fillRect(-22, -30, 44, 30);
  ctx.fillStyle = "#735835"; ctx.beginPath(); ctx.moveTo(-22, -30); ctx.lineTo(-12, -38); ctx.lineTo(32, -38); ctx.lineTo(22, -30); ctx.fill();
  ctx.fillStyle = "#4a3820"; ctx.beginPath(); ctx.moveTo(22, -30); ctx.lineTo(32, -38); ctx.lineTo(32, -8); ctx.lineTo(22, 0); ctx.fill();
  ctx.fillStyle = "rgba(220,200,160,.5)"; ctx.fillRect(-3, -30, 6, 30);
  ctx.restore();
}

export const SCENES = {
  door: {
    period: 26000, walk: 0.5, base: 316, scale: 1.25, path: (p) => -60 + p * 760,
    bg(ctx) {
      vgrad(ctx, [[0, "#1c1f25"], [0.7, "#141619"], [0.7, "#1f2023"], [1, "#111214"]]);
      ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(262, 64, 116, 192);
      ctx.fillStyle = "#0b0c0f"; ctx.fillRect(270, 72, 100, 180);
      ctx.fillStyle = "rgba(255,210,150,.55)"; ctx.fillRect(352, 160, 6, 6);
      ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(236, 252, 168, 10);
      glow(ctx, 320, 36, 270, "rgba(255,205,140,.30)");
    },
  },
  garden: {
    period: 37000, walk: 0.45, base: 276, scale: 0.8, path: (p) => 690 - p * 760,
    bg(ctx) {
      vgrad(ctx, [[0, "#0c1220"], [0.55, "#1a2233"], [0.55, "#111813"], [1, "#0a0f0b"]]);
      glow(ctx, 530, 46, 140, "rgba(200,215,255,.20)");
      ctx.fillStyle = "rgba(255,255,255,.05)";
      for (let x = 0; x < W; x += 22) ctx.fillRect(x, 166, 8, 34);
      ctx.fillRect(0, 176, W, 4);
      ctx.fillStyle = "#060908";
      [[90, 140, 70], [196, 166, 44], [566, 132, 86]].forEach(([x, y, r]) => {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 5, y, 10, 210 - y);
      });
    },
  },
  garage: {
    period: 48000, walk: 0.4, base: 336, scale: 1.05, path: (p) => -60 + p * 760,
    bg(ctx) {
      vgrad(ctx, [[0, "#16171a"], [0.55, "#1c1d21"], [0.55, "#202125"], [1, "#121316"]]);
      ctx.strokeStyle = "rgba(255,255,255,.04)"; ctx.lineWidth = 2;
      for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(320, 198); ctx.lineTo(320 + i * 130, 360); ctx.stroke(); }
      glow(ctx, 320, 0, 320, "rgba(190,215,255,.20)");
      ctx.fillStyle = "#0b0c0e";
      ctx.beginPath(); ctx.roundRect(226, 156, 188, 64, 24); ctx.fill();
      ctx.beginPath(); ctx.roundRect(166, 200, 308, 92, 26); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.05)";
      ctx.beginPath(); ctx.roundRect(242, 168, 156, 38, 12); ctx.fill();
      ctx.fillStyle = "#050506";
      [[230, 292], [410, 292]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill(); });
      ctx.save(); ctx.shadowColor = "rgba(255,60,50,.9)"; ctx.shadowBlur = 18; ctx.fillStyle = "#ff4a3d";
      ctx.fillRect(180, 228, 34, 7); ctx.fillRect(426, 228, 34, 7); ctx.restore();
    },
  },
};

function makeCanvas(scale) {
  const canvas = h("canvas", { width: W * scale, height: H * scale });
  const ctx = canvas.getContext("2d");
  const nz = document.createElement("canvas");
  nz.width = 320; nz.height = 180;
  const nctx = nz.getContext("2d");
  const nimg = nctx.createImageData(320, 180);
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,.6)");
  const finish = () => {
    const d = nimg.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = Math.random() * 255; d[i + 3] = 22; }
    nctx.putImageData(nimg, 0, 0);
    ctx.drawImage(nz, 0, 0, W, H);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  };
  return { canvas, ctx, finish, begin: () => ctx.setTransform(scale, 0, 0, scale, 0, 0) };
}

// Live-Simulation mit Bewegungserkennung
export function makeSim(cam, onMotion) {
  const c = makeCanvas(1.5);
  const cfg = SCENES[cam.scene] || SCENES.door;
  const offset = Math.random() * cfg.period;
  let wasWalking = null;
  function draw(now) {
    c.begin();
    cfg.bg(c.ctx);
    const ph = ((now + offset) % cfg.period) / cfg.period;
    const walking = ph < cfg.walk;
    if (walking) person(c.ctx, cfg.path(ph / cfg.walk), cfg.base, cfg.scale, now);
    if (walking && wasWalking === false) onMotion(cam, false);
    else if (walking && wasWalking === null) onMotion(cam, true);
    wasWalking = walking;
    c.finish();
  }
  return { canvas: c.canvas, draw };
}

// Besucher an der Tür (für das Klingel-Overlay)
export function makeVisitor() {
  const c = makeCanvas(2);
  function draw(now) {
    c.begin();
    SCENES.door.bg(c.ctx);
    person(c.ctx, 300 + Math.sin(now / 1800) * 3, 322, 1.5, now, { walk: false, label: "Person · Paket" });
    parcel(c.ctx, 372, 318, 1.1);
    c.finish();
  }
  return { canvas: c.canvas, draw };
}

// Standbild für die Ereignis-Zeitleiste
export function snapshot(scene, progress, { pkg = false, from } = {}) {
  const out = document.createElement("canvas");
  out.width = 480; out.height = 270;
  const ctx = out.getContext("2d");
  if (from) {
    ctx.drawImage(from, 0, 0, 480, 270);
  } else {
    const c = makeCanvas(0.75);
    const cfg = SCENES[scene] || SCENES.door;
    c.begin();
    cfg.bg(c.ctx);
    if (pkg) parcel(c.ctx, 330, 262, 1);
    if (progress != null) person(c.ctx, cfg.path(progress), cfg.base, cfg.scale, 0);
    c.finish();
    ctx.drawImage(c.canvas, 0, 0);
  }
  return out.toDataURL("image/jpeg", 0.72);
}
