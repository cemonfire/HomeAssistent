// Seite 1: Übersicht (Kamera, Uhr, Szenen, Termine, Musik, Licht, Rollläden)
import { D, $, h, svg, bus, hhmm, mmss, toast, draggable, condOf } from "./core.js";
import { lightColor, setLight, toggleLight, moveCover, setCover, M, setMusic, skipTrack, runScene, addCamEvent } from "./state.js";
import { makeSim, snapshot } from "./sim.js";
import { openLightSheet, openRoomSheet } from "./sheets.js";

const greet = (hr) => (hr < 5 ? "Gute Nacht" : hr < 11 ? "Guten Morgen" : hr < 18 ? "Guten Tag" : "Guten Abend");

export function initOverview() {
  // ---------- Kopf ----------
  const weather = $("#weather");
  const renderWeather = () => {
    const c = condOf(D.weather.condition);
    weather.replaceChildren(h("span", { html: svg(c.icon) }), h("b", {}, `${D.weather.temp}°`), c.text);
  };
  bus.on("weather", renderWeather);
  renderWeather();

  const people = $("#people");
  const renderPeople = () => people.replaceChildren(...D.people.map((p) =>
    h("span", { class: `av${p.home ? "" : " away"}`, style: { "--pc": p.color }, title: p.home ? `${p.name} ist zu Hause` : `${p.name}: ${p.where}${p.eta ? `, in ${p.eta} min da` : ""}` }, p.name[0])));
  bus.on("people", renderPeople);
  renderPeople();

  function tick() {
    const d = new Date();
    $("#clock").textContent = hhmm(d);
    $("#date").textContent = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    $("#greeting").textContent = greet(d.getHours()) + (D.user ? `, ${D.user}` : "");
    $("#cam-time").textContent = d.toLocaleTimeString("de-DE");
  }
  tick();
  setInterval(tick, 1000);
  bus.on("user", tick);

  initCameras();
  initTiles();
  initMusic();
  initScenes();
  initAgenda();
}

// ---------- Kameras ----------
function initCameras() {
  const sims = [];
  let active = null;
  const hero = $("#hero");

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
        h("span", {}, "Keine Kamera verfügbar"), h("small", {}, "Braucht localhost oder HTTPS und eine Freigabe.")));
    }
  }

  function onMotion(cam, initial) {
    cam.lastMotion = new Date();
    if (cam === active) heroSub();
    if (initial) return;
    // Standbild, wenn die Person mitten im Bild ist
    setTimeout(() => addCamEvent({ cam: cam.name, camId: cam.id, type: "Person", snap: snapshot(null, null, { from: cam.canvas }) }), 2600);
    if (!cam.notify || Date.now() - (cam.lastToast || 0) < 60000) return;
    cam.lastToast = Date.now();
    const visible = cam === active && document.body.dataset.page === "home" && !document.body.classList.contains("ambient-on");
    toast("Bewegung erkannt", {
      sub: `${cam.name} · Person`, icon: "activity",
      action: visible ? null : "Ansehen",
      onAction: () => { bus.emit("wake"); bus.emit("nav", "home"); selectCam(cam.id); },
    });
  }

  const cams = D.cameras.map((c) => {
    const cam = { ...c, lastMotion: null };
    const box = h("div", { class: "media" });
    if (c.type === "sim") {
      const sim = makeSim(cam, onMotion);
      cam.canvas = sim.canvas;
      sims.push(sim);
      box.append(sim.canvas);
    } else if (c.type === "webcam") {
      box.append(h("div", { class: "media-msg", html: svg("camera") }, h("span", {}, "Webcam")));
      cam.start = () => startWebcam(box);
    } else if (c.type === "mjpeg") {
      box.append(h("img", { src: c.url, alt: "" }));
    } else if (c.type === "iframe") {
      box.append(h("iframe", { src: c.url, title: c.name, allow: "autoplay; fullscreen" }));
    }
    cam.media = box;
    cam.thumb = h("button", { class: "thumb", type: "button", "aria-label": `${c.name} anzeigen`, onclick: () => selectCam(c.id) },
      h("span", { class: "thumb-name" }, c.name));
    $("#thumbs").append(cam.thumb);
    return cam;
  });

  function heroSub() {
    $("#cam-sub").textContent = active.type !== "sim" ? "Live-Stream"
      : active.lastMotion ? `Letzte Bewegung ${hhmm(active.lastMotion)}` : "Keine Bewegung erkannt";
  }
  function selectCam(id) {
    active = cams.find((c) => c.id === id) || cams[0];
    for (const c of cams) {
      if (c === active) { $("#hero-media").replaceChildren(c.media); c.thumb.hidden = true; }
      else { if (c.media.parentNode !== c.thumb) c.thumb.prepend(c.media); c.thumb.hidden = false; }
      c.media.querySelectorAll("video").forEach((v) => v.play().catch(() => {}));
    }
    active.start?.();
    $("#cam-name").textContent = active.name;
    heroSub();
  }
  bus.on("selectcam", selectCam);
  bus.on("demo-motion", () => {
    const c = cams.find((x) => x.notify) || cams[0];
    c.lastToast = 0;
    onMotion(c, false);
  });

  const expandBtn = $("#cam-expand");
  const setExpanded = (on) => {
    hero.classList.toggle("expanded", on);
    expandBtn.innerHTML = svg(on ? "shrink" : "expand");
    expandBtn.setAttribute("aria-label", on ? "Kamera verkleinern" : "Kamera vergrößern");
  };
  expandBtn.addEventListener("click", () => setExpanded(!hero.classList.contains("expanded")));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setExpanded(false); });
  bus.on("ambient", () => setExpanded(false));
  setExpanded(false);

  let last = 0;
  (function loop(now) {
    if (now - last > 66) { last = now; for (const s of sims) s.draw(now); }
    requestAnimationFrame(loop);
  })(0);
  selectCam(cams[0].id);
}

// ---------- Kacheln ----------
function tile(kind, name, icon) {
  const fill = h("span", { class: "fill" });
  const val = h("span", { class: "t-val" });
  const el = h("div", { class: `tile ${kind}`, role: "slider", tabindex: 0, "aria-valuemin": 0, "aria-valuemax": 100,
    "aria-label": `${kind === "light" ? "Licht" : "Rollladen"} ${name}`, "aria-description": "Gedrückt halten für mehr Optionen" },
    fill, h("span", { class: "t-ico", html: svg(icon) }), val, h("span", { class: "t-name" }, name));
  return { el, fill, val };
}

function initTiles() {
  for (const l of D.lights.filter((x) => x.pinned !== false)) {
    const t = tile("light", l.name, "bulb");
    const render = () => {
      t.el.style.setProperty("--lc", lightColor(l));
      t.el.classList.toggle("on", l.on);
      t.fill.style.transform = `scaleX(${l.on ? l.brightness / 100 : 0})`;
      t.val.textContent = l.on ? `${l.brightness} %` : "Aus";
      t.el.setAttribute("aria-valuenow", l.on ? l.brightness : 0);
      t.el.setAttribute("aria-valuetext", t.val.textContent);
    };
    draggable(t.el, {
      axis: "x",
      get: () => (l.on ? l.brightness : 0),
      set: (v) => setLight(l, v > 0 ? { on: true, brightness: v } : { on: false }),
      onTap: () => toggleLight(l),
      onLongPress: () => openLightSheet(l),
    });
    bus.on("light", (x) => x === l && render());
    render();
    $("#lights").append(t.el);
  }

  for (const c of D.covers) {
    const t = tile("cover", c.name, "blinds");
    const render = () => {
      const moving = c.position !== c.target;
      t.el.classList.toggle("open", c.position > 0);
      t.el.classList.toggle("moving", moving);
      t.fill.style.transform = `scaleY(${(100 - c.position) / 100})`;
      t.val.textContent = moving || (c.position > 0 && c.position < 100) ? `${c.position} %` : c.position ? "Offen" : "Zu";
      t.el.setAttribute("aria-valuenow", c.position);
      t.el.setAttribute("aria-valuetext", `${c.position} % offen`);
    };
    draggable(t.el, {
      axis: "y",
      get: () => c.position,
      set: (v) => setCover(c, v),
      onTap: () => moveCover(c, c.target > 0 ? 0 : 100),
      onLongPress: () => openRoomSheet(c.room),
    });
    bus.on("cover", (x) => x === c && render());
    render();
    $("#covers").append(t.el);
  }
}

// ---------- Musik ----------
function initMusic() {
  M.elapsed = M.elapsed ?? 72;
  const music = $("#music");
  const art = h("div", { class: "art" });
  const title = h("div", { class: "m-title" });
  const sub = h("div", { class: "m-sub" });
  const bar = h("i");
  const tCur = h("span"), tDur = h("span");
  const play = h("button", { class: "round primary", type: "button", onclick: () => setMusic({ playing: !M.playing }) });
  const vol = h("input", { type: "range", min: 0, max: 100, "aria-label": "Lautstärke" });
  vol.addEventListener("input", () => setMusic({ volume: +vol.value }));
  const cur = () => M.queue[M.track];

  function render() {
    const t = cur();
    music.style.setProperty("--art", `linear-gradient(135deg, hsl(${t.hue} 75% 55%), hsl(${t.hue + 50} 70% 28%))`);
    music.classList.toggle("playing", M.playing);
    title.textContent = t.title;
    sub.textContent = `${t.artist} · ${M.room}`;
    play.innerHTML = svg(M.playing ? "pause" : "play");
    play.setAttribute("aria-label", M.playing ? "Pause" : "Abspielen");
    bar.style.transform = `scaleX(${M.elapsed / t.dur})`;
    tCur.textContent = mmss(M.elapsed);
    tDur.textContent = mmss(t.dur);
    vol.value = M.volume;
    vol.style.setProperty("--p", `${M.volume}%`);
  }
  music.append(
    h("div", { class: "m-head" }, art, h("div", { class: "m-info" }, title, sub), h("span", { class: "eq", "aria-hidden": "true" }, h("i"), h("i"), h("i"))),
    h("div", { class: "m-progress" }, bar),
    h("div", { class: "m-times" }, tCur, tDur),
    h("div", { class: "m-ctrl" },
      h("button", { class: "round", type: "button", "aria-label": "Zurück", html: svg("prev"), onclick: () => skipTrack(-1) }),
      play,
      h("button", { class: "round", type: "button", "aria-label": "Weiter", html: svg("next"), onclick: () => skipTrack(1) }),
      h("label", { class: "vol", html: svg("volume") }, vol)));
  setInterval(() => {
    if (!M.playing) return;
    if (++M.elapsed >= cur().dur) skipTrack(1); else render();
  }, 1000);
  bus.on("music", render);
  render();
}

// ---------- Szenen ----------
function initScenes() {
  const btns = D.scenes.map((s) => h("button", { class: "scene", type: "button", "aria-pressed": "false", onclick: () => runScene(s) },
    h("span", { html: svg(s.icon) }), s.name));
  $("#scenes").append(...btns);
  bus.on("scene", (active) => D.scenes.forEach((s, i) => btns[i].setAttribute("aria-pressed", String(s === active))));
}

// ---------- Termine ----------
function initAgenda() {
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

  function render() {
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
      list.append(h("li", { class: `ev${past ? " past" : ""}${isNext ? " next" : ""}`, style: { "--c": e.color } },
        h("time", {}, hhmm(e.at)),
        h("div", {}, h("div", { class: "ev-title" }, e.title), h("div", { class: "ev-cal" }, e.cal)),
        isNext && h("span", { class: "badge" }, until(Math.round((e.at - now) / 60000)))));
    }
    $("#agenda-meta").textContent = open ? `${open} anstehend` : "Nichts mehr";
    bus.emit("nextevent", next);
  }
  render();
  setInterval(render, 30000);
}
