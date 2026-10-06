// Einstieg: Navigation (Leiste/Dock), wischbare Seiten, Tastatur, Start aller Module
import { D, $, h, svg, bus, store, haptic } from "./core.js";
import { applyStoredSettings, openSettings } from "./settings.js";
import { initSky } from "./sky.js";
import { initAmbient } from "./ambient.js";
import { initOverview } from "./overview.js";
import { initRooms } from "./rooms.js";
import { initEnergy } from "./energy.js";
import { initSecurity } from "./security.js";
import { initInfo } from "./info.js";
import { initDoorbell } from "./doorbell.js";
import { openVoice } from "./voice.js";
import { sheetOpen } from "./sheets.js";

const PAGES = [
  { id: "home", label: "Übersicht", icon: "home" },
  { id: "rooms", label: "Räume", icon: "plan" },
  { id: "energy", label: "Energie", icon: "zap" },
  { id: "security", label: "Sicherheit", icon: "shield" },
  { id: "info", label: "Infos", icon: "cloud" },
];

applyStoredSettings();
initSky($("#sky"));
initAmbient();
initOverview();
initRooms($("#page-rooms"));
initEnergy($("#page-energy"));
initSecurity($("#page-security"));
initInfo($("#page-info"));
initDoorbell();

// ---------- Navigation ----------
const pages = $("#pages");
const navBtns = PAGES.map((p, i) => h("button", { class: "nav-btn", type: "button", "aria-label": p.label, title: `${p.label} (${i + 1})`, onclick: () => { haptic(); goTo(p.id); } },
  h("span", { class: "nav-ico", html: svg(p.icon) }), h("span", { class: "nav-label" }, p.label)));
const tool = (label, icon, fn, cls = "") => h("button", { class: `nav-btn tool ${cls}`, type: "button", "aria-label": label, title: label, onclick: fn },
  h("span", { class: "nav-ico", html: svg(icon) }), h("span", { class: "nav-label" }, label));
$("#rail").append(
  h("div", { class: "logo", "aria-hidden": "true" }),
  h("div", { class: "nav" }, navBtns),
  h("div", { class: "rail-tools" },
    tool("Sprechen", "mic", openVoice, "mic"),
    tool("Ruhemodus", "moon", () => bus.emit("sleep"), "wide-only"),
    document.fullscreenEnabled && tool("Vollbild", "monitor", () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {})), "wide-only"),
    tool("Einstellungen", "sliders", openSettings)));

let current = 0;
function setActive(i) {
  current = i;
  navBtns.forEach((b, k) => b.setAttribute("aria-current", k === i ? "page" : "false"));
  document.body.dataset.page = PAGES[i].id;
  PAGES.forEach((p, k) => $(`#page-${p.id}`).toggleAttribute("inert", k !== i));
  store.set("page", PAGES[i].id);
}
function goTo(id, smooth = true) {
  const i = Math.max(0, PAGES.findIndex((p) => p.id === id));
  pages.scrollTo({ left: i * pages.clientWidth, behavior: smooth ? "smooth" : "instant" });
  setActive(i);
}
let scrollT;
pages.addEventListener("scroll", () => {
  clearTimeout(scrollT);
  scrollT = setTimeout(() => {
    const i = Math.round(pages.scrollLeft / pages.clientWidth);
    if (i !== current) setActive(i);
  }, 80);
}, { passive: true });
addEventListener("resize", () => pages.scrollTo({ left: current * pages.clientWidth, behavior: "instant" }));
bus.on("nav", (id) => goTo(id));

// Alarm-Zustand an der Sicherheits-Taste
const secBtn = navBtns[3];
bus.on("alarm", (A) => {
  secBtn.dataset.alarm = A.mode;
  secBtn.querySelector(".nav-ico").innerHTML = svg(A.mode === "disarmed" ? "shield" : A.mode === "triggered" ? "shieldAlert" : "shieldCheck");
});

// Tastatur: 1–5 Seiten, Strg+K Sprache
addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || sheetOpen() || document.body.classList.contains("ambient-on")) return;
  if (/^[1-5]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) goTo(PAGES[+e.key - 1].id);
  else if (e.key === "k" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openVoice(); }
});

goTo(new URLSearchParams(location.search).get("page") || store.get("page", "home"), false);
document.body.classList.add("ready");
window.HOME = { D, bus };   // zum Ausprobieren in der Konsole
