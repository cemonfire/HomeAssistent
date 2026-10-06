// Ruhemodus: große Uhr über dem Himmel oder Fotos, Einbrennschutz, Wecken per Annäherung
import { D, $, h, bus, hhmm, condOf, store, toast } from "./core.js";

let on = false, idleTimer, proximity = null;

export function initAmbient() {
  const amb = $("#ambient");
  const app = $("#pages");

  const show = () => {
    if (on) return;
    on = true;
    document.body.classList.add("ambient-on");
    amb.setAttribute("aria-hidden", "false");
    app.inert = true;
    bus.emit("ambient");
    if (proximity) proximity.start();
  };
  const hide = () => {
    if (on) {
      on = false;
      document.body.classList.remove("ambient-on");
      amb.setAttribute("aria-hidden", "true");
      app.inert = false;
      proximity?.stop();
    }
    resetIdle();
  };
  function resetIdle() {
    clearTimeout(idleTimer);
    if (D.idleSeconds > 0) idleTimer = setTimeout(show, D.idleSeconds * 1000);
  }
  bus.on("sleep", show);
  bus.on("wake", hide);
  bus.on("idle", resetIdle);
  amb.addEventListener("pointerdown", (e) => { e.preventDefault(); hide(); });
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((ev) => addEventListener(ev, () => { if (!on) resetIdle(); }, { passive: true, capture: true }));
  addEventListener("keydown", () => { if (on) hide(); }, true);

  // Uhr, Datum, nächster Termin
  const tick = () => {
    const d = new Date();
    $("#amb-clock").textContent = hhmm(d);
    $("#amb-date").textContent = `${d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} · ${D.weather.temp}° ${condOf(D.weather.condition).text}`;
    const hr = d.getHours();
    document.body.classList.toggle("night", hr >= 22 || hr < 6);
  };
  tick();
  setInterval(tick, 1000);
  bus.on("weather", tick);
  bus.on("nextevent", (e) => {
    const el = $("#amb-next");
    el.textContent = e ? `${hhmm(e.at)}  ${e.title}` : "";
    el.style.setProperty("--c", e ? e.color : "");
  });

  // Einbrennschutz: Inhalt wandert langsam
  setInterval(() => {
    if (on) $("#amb-inner").style.transform = `translate(${(Math.random() - 0.5) * 8}vw, ${(Math.random() - 0.5) * 8}vh)`;
  }, 20000);

  // Fotos (optional) mit Ken-Burns-Effekt
  if (D.photos?.length) {
    const layers = [h("img", { alt: "" }), h("img", { alt: "" })];
    const box = h("div", { class: "amb-photos" }, layers);
    amb.prepend(box);
    let i = 0, cur = 0;
    const next = () => {
      const img = layers[cur ^ 1];
      img.src = D.photos[i++ % D.photos.length];
      img.onload = () => { layers[cur].classList.remove("show"); img.classList.add("show"); cur ^= 1; };
    };
    next();
    setInterval(() => on && next(), 12000);
  }

  if (store.get("proximity", false)) setProximity(true, { quiet: true });
  resetIdle();
}

// Annäherung: Frontkamera erkennt Bewegung (Bild bleibt im Gerät)
export async function setProximity(enabled, { quiet = false } = {}) {
  store.set("proximity", enabled);
  proximity?.stop(true);
  proximity = null;
  if (!enabled) return;
  const cv = document.createElement("canvas");
  cv.width = 40; cv.height = 30;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  let stream, video, timer, prev, hits = 0;
  proximity = {
    async start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120, facingMode: "user" } });
        video = h("video", { playsinline: true, muted: true });
        video.muted = true;
        video.srcObject = stream;
        await video.play();
        timer = setInterval(() => {
          ctx.drawImage(video, 0, 0, 40, 30);
          const d = ctx.getImageData(0, 0, 40, 30).data;
          const gray = new Uint8Array(1200);
          let diff = 0;
          for (let i = 0; i < 1200; i++) { gray[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; if (prev) diff += Math.abs(gray[i] - prev[i]); }
          prev = gray;
          hits = diff / 1200 > 10 ? hits + 1 : 0;
          if (hits >= 2) bus.emit("wake");
        }, 350);
      } catch {
        if (!quiet) toast("Kamera nicht verfügbar", { sub: "Annäherung braucht localhost oder HTTPS", icon: "camera" });
        store.set("proximity", false);
      }
    },
    stop() {
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      prev = null; hits = 0;
    },
  };
  if (!quiet) toast("Annäherung aktiv", { sub: "Display wacht auf, wenn jemand davorsteht", icon: "camera", ms: 3000 });
  if (on) proximity.start();
}
