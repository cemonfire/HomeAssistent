(() => {
  "use strict";
  const D = window.DATA;

  // ---------- Helfer ----------
  const $ = (sel) => document.querySelector(sel);
  const h = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    n.append(...kids.flat().filter((k) => k != null && k !== false));
    return n;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, "0");
  const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const mmss = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

  const ICON = {
    bulb: '<path d="M9 18h6M10 22h4M15.1 14c.2-1 .7-1.7 1.4-2.5A4.7 4.7 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.4 2.5"/>',
    blinds: '<path d="M3 3h18M20 7H8M20 11H8M10 19h10M8 15h12M4 3v14"/><circle cx="4" cy="19" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    tv: '<rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/>',
    power: '<path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    cloudSun: '<path d="M12 2v2M4.9 4.9l1.4 1.4M20 12h2M19.1 4.9l-1.4 1.4M15.9 12.7a4 4 0 0 0-5.9-4.1"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    shrink: '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    camera: '<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    prev: '<path d="M6 5h2v14H6zM20 6v12a1 1 0 0 1-1.5.8L9 12.8a1 1 0 0 1 0-1.6l9.5-6A1 1 0 0 1 20 6Z"/>',
    next: '<path d="M16 5h2v14h-2zM4 6v12a1 1 0 0 0 1.5.8l9.5-6a1 1 0 0 0 0-1.6l-9.5-6A1 1 0 0 0 4 6Z"/>',
  };
  const FILLED = new Set(["play", "pause", "prev", "next"]);
  const svg = (n) => `<svg class="i${FILLED.has(n) ? " f" : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;

  // ---------- Toasts ----------
  const toastBox = $("#toasts");
  function toast(title, { sub, icon = "activity", action, onAction, ms = 4000 } = {}) {
    const close = () => { t.classList.remove("in"); setTimeout(() => t.remove(), 350); };
    const t = h("div", { class: "toast", role: "status" },
      h("span", { class: "toast-ico", html: svg(icon) }),
      h("div", { class: "toast-body" }, h("div", { class: "toast-title" }, title), sub && h("div", { class: "toast-sub" }, sub)),
      action && h("button", { class: "toast-btn", type: "button", onclick: () => { onAction(); close(); } }, action));
    toastBox.append(t);
    while (toastBox.children.length > 3) toastBox.firstElementChild.remove();
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("in")));
    setTimeout(close, ms);
  }

  // ---------- Uhr, Datum, Wetter ----------
  const greet = (hr) => (hr < 5 ? "Gute Nacht" : hr < 11 ? "Guten Morgen" : hr < 18 ? "Guten Tag" : "Guten Abend");
  $("#weather").append(h("span", { html: svg("cloudSun") }), h("b", {}, `${D.weather.temp}°`), D.weather.text);
  $("#btn-ambient").innerHTML = svg("moon");
  $("#btn-fs").innerHTML = svg("monitor");
  $("#cam-expand").innerHTML = svg("expand");

  function tick() {
    const d = new Date();
    const hr = d.getHours();
    const date = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    $("#clock").textContent = hhmm(d);
    $("#amb-clock").textContent = hhmm(d);
    $("#date").textContent = date;
    $("#amb-date").textContent = `${date} · ${D.weather.temp}° ${D.weather.text}`;
    $("#greeting").textContent = greet(hr) + (D.user ? `, ${D.user}` : "");
    $("#cam-time").textContent = d.toLocaleTimeString("de-DE");
    document.body.classList.toggle("night", hr >= 22 || hr < 6);
  }

  // ---------- Kameras ----------
  const sims = [];
  let active = null;
  let ambientOn = false;

  function person(ctx, x, base, s, t) {
    const sw = Math.sin(t / 140);
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
    ctx.beginPath(); ctx.arc(0, -108, 12, 0, Math.PI * 2); ctx.fill();
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
    ctx.fillText("Person", l, top - 7);
  }

  const glow = (ctx, x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 360);
  };
  const vgrad = (ctx, stops) => {
    const g = ctx.createLinearGradient(0, 0, 0, 360);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 360);
  };

  const SCENES = {
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
        for (let x = 0; x < 640; x += 22) ctx.fillRect(x, 166, 8, 34);
        ctx.fillRect(0, 176, 640, 4);
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

  function makeSim(cam) {
    const W = 640, H = 360, SCALE = 1.5; // Zeichnen in 640×360, Ausgabe in 960×540
    const canvas = h("canvas", { width: W * SCALE, height: H * SCALE });
    const ctx = canvas.getContext("2d");
    const nz = document.createElement("canvas");
    nz.width = 320; nz.height = 180;
    const nctx = nz.getContext("2d");
    const nimg = nctx.createImageData(320, 180);
    const cfg = SCENES[cam.scene] || SCENES.door;
    const offset = Math.random() * cfg.period;
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.6)");
    let wasWalking = null;

    function draw(now) {
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      cfg.bg(ctx);
      const ph = ((now + offset) % cfg.period) / cfg.period;
      const walking = ph < cfg.walk;
      if (walking) person(ctx, cfg.path(ph / cfg.walk), cfg.base, cfg.scale, now);
      if (walking && wasWalking === false) onMotion(cam);
      else if (walking && wasWalking === null) { cam.lastMotion = new Date(); if (cam === active) heroSub(); }
      wasWalking = walking;
      const d = nimg.data;
      for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = Math.random() * 255; d[i + 3] = 22; }
      nctx.putImageData(nimg, 0, 0);
      ctx.drawImage(nz, 0, 0, W, H);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    }
    return { canvas, draw };
  }

  async function startWebcam(box) {
    if (box.dataset.started) return;
    box.dataset.started = "1";
    box.querySelector("span").textContent = "Kamera wird gestartet …";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const v = h("video", { autoplay: true, playsinline: true });
      v.muted = true;
      v.srcObject = stream;
      box.replaceChildren(v);
      v.play().catch(() => {});
    } catch {
      box.replaceChildren(h("div", { class: "media-msg", html: svg("camera") },
        h("span", {}, "Keine Kamera verfügbar"),
        h("small", {}, "Braucht localhost oder HTTPS und eine Freigabe.")));
    }
  }

  function createMedia(cam) {
    const box = h("div", { class: "media" });
    if (cam.type === "sim") {
      const sim = makeSim(cam);
      sims.push(sim);
      box.append(sim.canvas);
    } else if (cam.type === "webcam") {
      box.append(h("div", { class: "media-msg", html: svg("camera") }, h("span", {}, "Webcam")));
      cam.start = () => startWebcam(box);
    } else if (cam.type === "mjpeg") {
      box.append(h("img", { src: cam.url, alt: "" }));
    } else if (cam.type === "iframe") {
      box.append(h("iframe", { src: cam.url, title: cam.name, allow: "autoplay; fullscreen" }));
    }
    return box;
  }

  const cams = D.cameras.map((c) => {
    const cam = { ...c, lastMotion: null, lastToast: 0 };
    cam.media = createMedia(cam);
    cam.thumb = h("button", { class: "thumb", type: "button", "aria-label": `${c.name} anzeigen`, onclick: () => selectCam(c.id) },
      h("span", { class: "thumb-name" }, c.name));
    $("#thumbs").append(cam.thumb);
    return cam;
  });

  function heroSub() {
    if (!active) return;
    $("#cam-sub").textContent = active.type !== "sim" ? "Live-Stream"
      : active.lastMotion ? `Letzte Bewegung ${hhmm(active.lastMotion)}` : "Keine Bewegung erkannt";
  }

  function selectCam(id) {
    active = cams.find((c) => c.id === id) || cams[0];
    for (const c of cams) {
      if (c === active) {
        $("#hero-media").replaceChildren(c.media);
        c.thumb.hidden = true;
      } else {
        if (c.media.parentNode !== c.thumb) c.thumb.prepend(c.media);
        c.thumb.hidden = false;
      }
      c.media.querySelectorAll("video").forEach((v) => v.play().catch(() => {}));
    }
    active.start?.();
    $("#cam-name").textContent = active.name;
    heroSub();
  }

  function onMotion(cam) {
    cam.lastMotion = new Date();
    if (cam === active) heroSub();
    if (!cam.notify || Date.now() - cam.lastToast < 60000) return;
    cam.lastToast = Date.now();
    const visible = cam === active && !ambientOn && !$("#hero").classList.contains("expanded");
    toast("Bewegung erkannt", {
      sub: `${cam.name} · Person`, icon: "activity",
      action: visible ? null : "Ansehen",
      onAction: () => { hideAmbient(); selectCam(cam.id); },
    });
  }

  const hero = $("#hero");
  function setExpanded(on) {
    hero.classList.toggle("expanded", on);
    $("#cam-expand").innerHTML = svg(on ? "shrink" : "expand");
    $("#cam-expand").setAttribute("aria-label", on ? "Kamera verkleinern" : "Kamera vergrößern");
  }
  $("#cam-expand").addEventListener("click", () => setExpanded(!hero.classList.contains("expanded")));

  let lastFrame = 0;
  (function loop(now) {
    if (now - lastFrame > 66) { lastFrame = now; for (const s of sims) s.draw(now); }
    requestAnimationFrame(loop);
  })(0);

  // ---------- Ziehbare Kacheln ----------
  function draggable(el, { axis, get, set, onTap }) {
    let s = null;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      s = { x: e.clientX, y: e.clientY, v: get(), moved: false, id: e.pointerId, size: axis === "x" ? el.offsetWidth : el.offsetHeight };
    });
    el.addEventListener("pointermove", (e) => {
      if (!s || e.pointerId !== s.id) return;
      const d = axis === "x" ? e.clientX - s.x : s.y - e.clientY;
      if (!s.moved) {
        if (Math.abs(d) < 6) return;
        s.moved = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add("dragging");
      }
      set(Math.round(clamp(s.v + (d / s.size) * 100, 0, 100)));
    });
    const end = (e) => {
      if (!s || e.pointerId !== s.id) return;
      const tap = e.type === "pointerup" && !s.moved;
      s = null;
      el.classList.remove("dragging");
      if (tap) onTap();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10 }[e.key];
      if (step) { e.preventDefault(); set(clamp(get() + step, 0, 100)); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(); }
    });
  }

  function tile(kind, name, icon) {
    const fill = h("span", { class: "fill" });
    const val = h("span", { class: "t-val" });
    const el = h("div", { class: `tile ${kind}`, role: "slider", tabindex: 0, "aria-valuemin": 0, "aria-valuemax": 100,
      "aria-label": `${kind === "light" ? "Licht" : "Rollladen"} ${name}` },
      fill, h("span", { class: "t-ico", html: svg(icon) }), val, h("span", { class: "t-name" }, name));
    return { el, fill, val };
  }

  // Lichter
  for (const l of D.lights) {
    const t = tile("light", l.name, "bulb");
    l.render = () => {
      t.el.classList.toggle("on", l.on);
      t.fill.style.transform = `scaleX(${l.on ? l.brightness / 100 : 0})`;
      t.val.textContent = l.on ? `${l.brightness} %` : "Aus";
      t.el.setAttribute("aria-valuenow", l.on ? l.brightness : 0);
      t.el.setAttribute("aria-valuetext", t.val.textContent);
    };
    draggable(t.el, {
      axis: "x",
      get: () => (l.on ? l.brightness : 0),
      set: (v) => { l.on = v > 0; if (v > 0) l.brightness = v; l.render(); clearScene(); },
      onTap: () => { l.on = !l.on; if (l.on && !l.brightness) l.brightness = 100; l.render(); clearScene(); },
    });
    l.render();
    $("#lights").append(t.el);
  }

  // Rollläden (fahren animiert wie ein echter Motor)
  for (const c of D.covers) {
    const t = tile("cover", c.name, "blinds");
    c.target = c.position;
    c.render = () => {
      const moving = c.position !== c.target;
      t.el.classList.toggle("open", c.position > 0);
      t.el.classList.toggle("moving", moving);
      t.fill.style.transform = `scaleY(${(100 - c.position) / 100})`;
      t.val.textContent = moving || (c.position > 0 && c.position < 100) ? `${c.position} %` : c.position ? "Offen" : "Zu";
      t.el.setAttribute("aria-valuenow", c.position);
      t.el.setAttribute("aria-valuetext", `${c.position} % offen`);
    };
    c.moveTo = (target) => {
      clearInterval(c.timer);
      c.target = target;
      c.timer = setInterval(() => {
        const diff = c.target - c.position;
        c.position = Math.abs(diff) <= 2 ? c.target : c.position + Math.sign(diff) * 2;
        if (c.position === c.target) clearInterval(c.timer);
        c.render();
      }, 40);
    };
    draggable(t.el, {
      axis: "y",
      get: () => c.position,
      set: (v) => { clearInterval(c.timer); c.position = c.target = v; c.render(); clearScene(); },
      onTap: () => { c.moveTo(c.target > 0 ? 0 : 100); clearScene(); },
    });
    c.render();
    $("#covers").append(t.el);
  }

  // ---------- Musik ----------
  const M = D.music;
  let elapsed = 72;
  const art = h("div", { class: "art" });
  const title = h("div", { class: "m-title" });
  const sub = h("div", { class: "m-sub" });
  const bar = h("i");
  const tCur = h("span"), tDur = h("span");
  const play = h("button", { class: "round primary", type: "button", onclick: () => { M.playing = !M.playing; renderMusic(); } });
  const vol = h("input", { type: "range", min: 0, max: 100, "aria-label": "Lautstärke" });
  const music = $("#music");
  const cur = () => M.queue[M.track];
  const fillRange = (r) => r.style.setProperty("--p", `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
  vol.addEventListener("input", () => { M.volume = +vol.value; fillRange(vol); });

  function skip(d) { M.track = (M.track + d + M.queue.length) % M.queue.length; elapsed = 0; renderMusic(); }
  function renderMusic() {
    const t = cur();
    music.style.setProperty("--art", `linear-gradient(135deg, hsl(${t.hue} 75% 55%), hsl(${t.hue + 50} 70% 28%))`);
    music.classList.toggle("playing", M.playing);
    title.textContent = t.title;
    sub.textContent = `${t.artist} · ${M.room}`;
    play.innerHTML = svg(M.playing ? "pause" : "play");
    play.setAttribute("aria-label", M.playing ? "Pause" : "Abspielen");
    bar.style.transform = `scaleX(${elapsed / t.dur})`;
    tCur.textContent = mmss(elapsed);
    tDur.textContent = mmss(t.dur);
    vol.value = M.volume;
    fillRange(vol);
  }
  music.append(
    h("div", { class: "m-head" }, art, h("div", { class: "m-info" }, title, sub), h("span", { class: "eq", "aria-hidden": "true" }, h("i"), h("i"), h("i"))),
    h("div", { class: "m-progress" }, bar),
    h("div", { class: "m-times" }, tCur, tDur),
    h("div", { class: "m-ctrl" },
      h("button", { class: "round", type: "button", "aria-label": "Zurück", html: svg("prev"), onclick: () => skip(-1) }),
      play,
      h("button", { class: "round", type: "button", "aria-label": "Weiter", html: svg("next"), onclick: () => skip(1) }),
      h("label", { class: "vol", html: svg("volume") }, vol)));
  setInterval(() => {
    if (!M.playing) return;
    if (++elapsed >= cur().dur) skip(1); else renderMusic();
  }, 1000);
  renderMusic();

  // ---------- Szenen ----------
  let activeScene = null;
  const sceneBtns = D.scenes.map((s) => h("button", { class: "scene", type: "button", "aria-pressed": "false", onclick: () => runScene(s) },
    h("span", { html: svg(s.icon) }), s.name));
  $("#scenes").append(...sceneBtns);
  function markScene() { D.scenes.forEach((s, i) => sceneBtns[i].setAttribute("aria-pressed", String(s === activeScene))); }
  function clearScene() { if (activeScene) { activeScene = null; markScene(); } }
  function runScene(s) {
    for (const l of D.lights) {
      const b = s.lights[l.name];
      l.on = !!b;
      if (b) l.brightness = b;
      l.render();
    }
    if (s.covers != null) D.covers.forEach((c) => c.moveTo(s.covers));
    if (s.music === false) { M.playing = false; renderMusic(); }
    activeScene = s;
    markScene();
    toast(s.name, { sub: `„Alexa, ${s.say}“`, icon: s.icon, ms: 2800 });
  }

  // ---------- Termine ----------
  const base = new Date();
  base.setSeconds(0, 0);
  base.setMinutes(Math.floor(base.getMinutes() / 5) * 5);
  const events = D.events.map((e) => ({ ...e, at: new Date(base.getTime() + e.in * 60000) })).sort((a, b) => a.at - b.at);
  const dayLabel = (d) => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - t) / 864e5);
    return diff === 0 ? null : diff === 1 ? "Morgen" : d.toLocaleDateString("de-DE", { weekday: "long" });
  };
  const until = (mins) => (mins <= 0 ? "Jetzt" : mins < 60 ? `in ${mins} min` : `in ${Math.round(mins / 60)} h`);

  function renderAgenda() {
    const now = Date.now();
    const list = $("#agenda");
    let next = null, lastDay, open = 0;
    list.replaceChildren();
    for (const e of events) {
      const day = dayLabel(e.at);
      if (day && day !== lastDay) list.append(h("li", { class: "day" }, day));
      lastDay = day;
      const past = e.at.getTime() + (e.dur || 30) * 60000 < now;
      const isNext = !past && !next;
      if (isNext) next = e;
      if (!past && !day) open++;
      list.append(h("li", { class: `ev${past ? " past" : ""}${isNext ? " next" : ""}`, style: `--c:${e.color}` },
        h("time", {}, hhmm(e.at)),
        h("div", {}, h("div", { class: "ev-title" }, e.title), h("div", { class: "ev-cal" }, e.cal)),
        isNext ? h("span", { class: "badge" }, until(Math.round((e.at - now) / 60000))) : null));
    }
    $("#agenda-meta").textContent = open ? `${open} anstehend` : "Nichts mehr";
    const amb = $("#amb-next");
    amb.textContent = next ? `${hhmm(next.at)}  ${next.title}` : "";
    amb.style.setProperty("--c", next ? next.color : "");
  }

  // ---------- Ruhemodus ----------
  const ambient = $("#ambient");
  const app = $("#app");
  let idleTimer;
  function showAmbient() {
    if (ambientOn) return;
    ambientOn = true;
    setExpanded(false);
    ambient.classList.add("show");
    ambient.setAttribute("aria-hidden", "false");
    app.inert = true;
  }
  function hideAmbient() {
    if (!ambientOn) return;
    ambientOn = false;
    ambient.classList.remove("show");
    ambient.setAttribute("aria-hidden", "true");
    app.inert = false;
    resetIdle();
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    if (D.idleSeconds > 0) idleTimer = setTimeout(showAmbient, D.idleSeconds * 1000);
  }
  ambient.addEventListener("pointerdown", (e) => { e.preventDefault(); hideAmbient(); });
  ["pointerdown", "keydown", "wheel"].forEach((ev) => addEventListener(ev, () => { if (!ambientOn) resetIdle(); }, { passive: true }));
  addEventListener("keydown", (e) => {
    if (ambientOn) { hideAmbient(); return; }
    if (e.key === "Escape") setExpanded(false);
  });
  $("#btn-ambient").addEventListener("click", showAmbient);
  // Gegen Einbrennen: Inhalt wandert langsam
  setInterval(() => {
    if (ambientOn) $("#amb-inner").style.transform = `translate(${(Math.random() - 0.5) * 6}vw, ${(Math.random() - 0.5) * 6}vh)`;
  }, 20000);

  // ---------- Vollbild ----------
  if (document.fullscreenEnabled) {
    $("#btn-fs").addEventListener("click", () =>
      document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}));
  } else {
    $("#btn-fs").hidden = true;
  }

  // ---------- Start ----------
  selectCam(cams[0].id);
  tick();
  renderAgenda();
  setInterval(tick, 1000);
  setInterval(renderAgenda, 30000);
  resetIdle();
})();
