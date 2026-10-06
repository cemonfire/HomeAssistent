(() => {
  const D = window.DATA;
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    kids.flat().forEach((k) => n.append(k));
    return n;
  };
  const log = (msg) => { $("log").innerHTML = `<b>${new Date().toLocaleTimeString("de-DE")}</b> ${msg}`; };
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const fill = (r) => r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min)) * 100 + "%");
  document.addEventListener("input", (e) => e.target.type === "range" && fill(e.target), true);
  const fillAll = () => document.querySelectorAll("input[type=range]").forEach(fill);

  // ---- Header ----
  function tick() {
    const d = new Date();
    const h = d.getHours();
    $("greeting").textContent = `${h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend"}, ${D.user}`;
    $("date").textContent = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    $("clock").textContent = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    $("weather").textContent = `${D.weather.temp}°  ${D.weather.text}`;
  }
  tick(); setInterval(tick, 1000);

  // ---- Kameras ----
  const sims = [];
  function simCam(canvas, seed) {
    const ctx = canvas.getContext("2d");
    canvas.width = 640; canvas.height = 360;
    const noise = document.createElement("canvas"); noise.width = 160; noise.height = 90;
    const nctx = noise.getContext("2d");
    let t = seed * 100;
    return function frame() {
      t += 1;
      const g = ctx.createLinearGradient(0, 0, 0, 360);
      g.addColorStop(0, `hsl(${200 + seed * 30},20%,18%)`); g.addColorStop(1, `hsl(${120 + seed * 40},15%,10%)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = "rgba(255,255,255,.06)"; // Boden/Wand-Struktur
      for (let i = 0; i < 6; i++) ctx.fillRect(0, 200 + i * 28, 640, 2);
      // "Person" läuft vorbei
      const x = ((t * (1.2 + seed * .3)) % 900) - 130;
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.beginPath(); ctx.ellipse(x, 300, 34, 9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#6b7488"; ctx.fillRect(x - 14, 190 + Math.sin(t / 6) * 3, 28, 80);
      ctx.beginPath(); ctx.arc(x, 175 + Math.sin(t / 6) * 3, 16, 0, 7); ctx.fill();
      // Rauschen
      const id = nctx.createImageData(160, 90);
      for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 60; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 40; }
      nctx.putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(noise, 0, 0, 640, 360);
      ctx.fillStyle = "#fff"; ctx.font = "16px monospace";
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillText(new Date().toLocaleString("de-DE"), 44, 30);
    };
  }

  async function startWebcam(box) {
    const v = el("video", { autoplay: true, muted: true, playsInline: true });
    try {
      v.srcObject = await navigator.mediaDevices.getUserMedia({ video: true });
      box.prepend(v);
    } catch (e) {
      box.prepend(el("div", { className: "err" }, "Webcam nicht verfügbar (" + (e.name || "Fehler") + ").\nBraucht HTTPS oder localhost + Erlaubnis."));
    }
  }

  D.cameras.forEach((c) => {
    const box = el("button", { className: "cam", type: "button", ariaLabel: `${c.name} vergrößern` });
    if (c.type === "sim") {
      const cv = el("canvas"); box.append(cv); sims.push(simCam(cv, c.seed));
    } else if (c.type === "webcam") {
      startWebcam(box);
    } else if (c.type === "mjpeg") {
      box.append(el("img", { src: c.url, alt: c.name }));
    } else if (c.type === "iframe") {
      box.append(el("iframe", { src: c.url, title: c.name, allow: "autoplay" }));
    }
    box.append(el("span", { className: "label" }, c.name), el("span", { className: "live" }, "LIVE"));
    box.addEventListener("click", () => box.classList.toggle("full"));
    $("cams").append(box);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".cam.full").forEach((n) => n.classList.remove("full")); });
  let last = 0;
  (function loop(ts) { if (ts - last > 66) { last = ts; sims.forEach((f) => f()); } requestAnimationFrame(loop); })(0);

  // ---- Termine ----
  D.events.forEach((e) => {
    $("events").append(el("li", { style: `--c:${e.color}` },
      el("div", { className: "t" }, e.time),
      el("div", {}, el("div", { className: "n" }, e.title), el("div", { className: "c" }, e.cal))));
  });

  // ---- Lichter ----
  D.lights.forEach((l) => {
    const row = el("div", { className: "row" });
    const val = el("span", { className: "val" });
    const sw = el("button", { className: "switch", role: "switch", type: "button", ariaLabel: `${l.name} Licht` });
    const sl = el("input", { type: "range", min: 1, max: 100, ariaLabel: `${l.name} Helligkeit` });
    const render = () => {
      row.classList.toggle("on", l.on);
      sw.setAttribute("aria-checked", l.on);
      sl.value = l.brightness; sl.disabled = !l.on;
      val.textContent = l.on ? `${l.brightness}%` : "Aus";
    };
    sw.onclick = () => { l.on = !l.on; render(); log(`Licht <b>${l.name}</b> ${l.on ? "an" : "aus"}`); };
    sl.oninput = () => { l.brightness = +sl.value; render(); };
    row.append(el("div", { className: "row-h" }, el("span", { className: "name" }, l.name), el("span", { style: "display:flex;gap:10px;align-items:center" }, val, sw)), sl);
    l.render = render; render();
    $("lights").append(row);
  });

  // ---- Rollläden ----
  D.covers.forEach((c) => {
    const row = el("div", { className: "row" });
    const val = el("span", { className: "val" });
    const sl = el("input", { type: "range", min: 0, max: 100, ariaLabel: `${c.name} Rollladen Position` });
    const render = () => { sl.value = c.position; val.textContent = c.position === 0 ? "Zu" : c.position === 100 ? "Offen" : `${c.position}% offen`; };
    const set = (p) => { c.position = p; render(); log(`Rollladen <b>${c.name}</b> → ${val.textContent}`); };
    sl.oninput = () => { c.position = +sl.value; render(); };
    const b = (txt, p) => el("button", { className: "btn", type: "button", onclick: () => set(p) }, txt);
    row.append(el("div", { className: "row-h" }, el("span", { className: "name" }, c.name), val), sl, el("div", { className: "btns" }, b("Auf", 100), b("50%", 50), b("Zu", 0)));
    c.render = render; render();
    $("covers").append(row);
  });

  // ---- Musik ----
  const ICON = {
    prev: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  };
  const M = D.music; let elapsed = 0;
  const mEl = $("music");
  const cover = el("div", { className: "cover" });
  const title = el("div", { className: "title" }), artist = el("div", { className: "artist" });
  const bar = el("i"); const time = el("div", { className: "val" });
  const play = el("button", { className: "btn", type: "button", ariaLabel: "Play/Pause" });
  const vol = el("input", { type: "range", min: 0, max: 100, ariaLabel: "Lautstärke" });
  const cur = () => M.queue[M.track];
  function renderMusic() {
    const t = cur();
    cover.style.background = `linear-gradient(135deg,hsl(${t.hue},70%,45%),hsl(${t.hue + 60},70%,25%))`;
    title.textContent = t.title; artist.textContent = `${t.artist} · ${M.room}`;
    play.innerHTML = M.playing ? ICON.pause : ICON.play; vol.value = M.volume;
    bar.style.width = `${(elapsed / t.dur) * 100}%`; time.textContent = `${mmss(elapsed)} / ${mmss(t.dur)}`;
  }
  const skip = (d) => { M.track = (M.track + d + M.queue.length) % M.queue.length; elapsed = 0; renderMusic(); log(`Musik: <b>${cur().title}</b>`); };
  play.onclick = () => { M.playing = !M.playing; renderMusic(); };
  vol.oninput = () => { M.volume = +vol.value; };
  mEl.append(el("div", { className: "player" }, cover, el("div", {}, title, artist),
    el("div", { className: "progress" }, bar), time,
    el("div", { className: "ctrl" }, el("button", { className: "btn", type: "button", ariaLabel: "Zurück", onclick: () => skip(-1), innerHTML: ICON.prev }), play, el("button", { className: "btn", type: "button", ariaLabel: "Weiter", onclick: () => skip(1), innerHTML: ICON.next })),
    el("label", { className: "vol" }, "🔈", vol)));
  setInterval(() => { if (M.playing) { elapsed++; if (elapsed >= cur().dur) skip(1); else renderMusic(); } }, 1000);
  renderMusic();

  // ---- Szenen / Alexa ----
  const apply = {
    morning: () => { D.covers.forEach((c) => (c.position = 100)); D.lights.forEach((l) => { if (l.name === "Küche") l.on = true; }); },
    movie: () => { D.lights.forEach((l) => { l.on = l.name === "Wohnzimmer"; if (l.on) l.brightness = 15; }); D.covers.forEach((c) => (c.position = 0)); },
    away: () => { D.lights.forEach((l) => (l.on = false)); D.covers.forEach((c) => (c.position = 0)); M.playing = false; },
    night: () => { D.lights.forEach((l) => (l.on = false)); D.covers.forEach((c) => (c.position = 0)); M.playing = false; },
  };
  D.scenes.forEach((s) => {
    $("scenes").append(el("button", { className: "scene", type: "button", onclick: () => {
      apply[s.id]();
      D.lights.forEach((l) => l.render()); D.covers.forEach((c) => c.render()); renderMusic();
      log(`„${s.say}“ → <b>${s.name}</b>`); fillAll();
    } }, el("span", {}, s.icon), s.name));
  });
  fillAll();
})();
