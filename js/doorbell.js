// Türklingel: Vollbild-Overlay mit Kamerabild, Gong, Sprechen, Wischen zum Öffnen
import { D, h, svg, bus, hhmm, haptic, toast } from "./core.js";
import { setLock } from "./state.js";
import { makeVisitor, snapshot } from "./sim.js";
import { slideConfirm } from "./security.js";

function chime() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [[659.3, 0], [523.3, 0.55]].forEach(([f, t]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ac.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 1.4);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 1.5);
    });
  } catch { /* Audio blockiert, bis einmal getippt wurde */ }
}

export function initDoorbell() {
  bus.on("doorbell", ring);
  if (D.demo?.autoDoorbell) setTimeout(() => bus.emit("doorbell"), D.demo.autoDoorbell * 1000);
}

function ring() {
  if (document.getElementById("doorbell")) return;
  bus.emit("wake");
  chime();
  haptic([80, 60, 80]);
  const vis = makeVisitor();
  let raf;
  const loop = (t) => { vis.draw(t); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  const at = new Date();

  const close = (type) => {
    cancelAnimationFrame(raf);
    clearTimeout(auto);
    clearInterval(timer);
    bus.emit("doorbell-event", { cam: "Haustür", camId: "door", type, snap: snapshot(null, null, { from: vis.canvas }) });
    ov.classList.remove("in");
    setTimeout(() => ov.remove(), 400);
  };

  const talk = h("button", { class: "db-btn", type: "button", "aria-label": "Gedrückt halten zum Sprechen" }, h("span", { html: svg("mic") }), h("small", {}, "Sprechen"));
  const startTalk = () => { talk.classList.add("talking"); talk.querySelector("small").textContent = "Spricht …"; };
  const stopTalk = () => { talk.classList.remove("talking"); talk.querySelector("small").textContent = "Sprechen"; };
  talk.addEventListener("pointerdown", startTalk);
  talk.addEventListener("pointerup", stopTalk);
  talk.addEventListener("pointerleave", stopTalk);
  talk.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); talk.classList.contains("talking") ? stopTalk() : startTalk(); } });

  const elapsed = h("span", { class: "chip mono" }, "0:00");
  const ov = h("div", { id: "doorbell", class: "doorbell", role: "alertdialog", "aria-label": "Es klingelt an der Haustür" },
    h("div", { class: "db-media" }, vis.canvas),
    h("div", { class: "db-top" },
      h("span", { class: "chip ringing" }, h("span", { class: "ring-ico", html: svg("bell") }), "Es klingelt"),
      elapsed),
    h("div", { class: "db-bottom" },
      h("div", { class: "db-title" }, "Haustür"),
      h("div", { class: "db-sub" }, `${hhmm(at)} · Person mit Paket erkannt`),
      h("div", { class: "db-actions" },
        talk,
        slideConfirm("Zum Öffnen schieben", () => { setLock(false); toast("Tür geöffnet", { sub: "Verriegelt automatisch wieder", icon: "unlock" }); close("Klingel"); }),
        h("button", { class: "db-btn decline", type: "button", "aria-label": "Ablehnen", onclick: () => close("Klingel") },
          h("span", { html: svg("phoneOff") }), h("small", {}, "Ablehnen")))));
  document.body.append(ov);
  requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add("in")));
  ov.querySelector(".slide")?.focus();

  let secs = 0;
  const timer = setInterval(() => { secs++; elapsed.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`; }, 1000);
  const auto = setTimeout(() => { close("Verpasst"); toast("Verpasster Besuch", { sub: `Haustür · ${hhmm(at)}`, icon: "bell", action: "Ansehen", onAction: () => bus.emit("nav", "security") }); }, 45000);
  ov.addEventListener("keydown", (e) => { if (e.key === "Escape") close("Klingel"); });
}
