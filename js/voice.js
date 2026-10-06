// Sprachsteuerung im Dashboard (Web Speech API, Chrome/Edge/Safari) mit Texteingabe als Ersatz
import { D, h, svg, bus, num, store, condOf, hhmm, kelvinToHex } from "./core.js";
import { setLight, moveCover, setTarget, runScene, setMusic, skipTrack, setLock, armAlarm, byRoom, M } from "./state.js";
import { openSheet } from "./sheets.js";

const ROOM_WORDS = { wohnzimmer: "living", küche: "kitchen", schlafzimmer: "bed", flur: "hall", diele: "hall", badezimmer: "bath", bad: "bath", büro: "office", arbeitszimmer: "office" };
const PAGE_WORDS = { übersicht: "home", start: "home", räume: "rooms", grundriss: "rooms", energie: "energy", strom: "energy", solar: "energy", sicherheit: "security", alarm: "security", kamera: "security", infos: "info", wetter: "info", bahn: "info", bus: "info", müll: "info", pakete: "info" };
const COLORS = { rot: "#ff4d4d", orange: "#ff8a4c", gelb: "#ffd04d", grün: "#3ddc97", blau: "#4f7bff", lila: "#a46bff", pink: "#ff5fa8", türkis: "#38d6d0" };
const EXAMPLES = ["Licht im Wohnzimmer aus", "Küche auf 50 Prozent", "Schlafzimmer blau", "Rollläden runter", "Filmabend", "Wohnzimmer auf 22 Grad", "Wie warm ist es?", "Zeig Energie"];

const norm = (t) => t.toLowerCase().replace(/[.,!?„“"]/g, " ").replace(/\s+/g, " ").trim();
const has = (t, re) => re.test(t);

export function handleCommand(raw) {
  const t = norm(raw);
  if (!t) return "Ich habe nichts gehört.";
  const rooms = [...new Set(Object.entries(ROOM_WORDS).filter(([w]) => new RegExp(`(^|\\s)${w}`).test(t)).map(([, id]) => id))];
  const all = has(t, /\b(alle|überall|ganzen? (haus|wohnung))\b/);
  const pct = t.match(/(\d{1,3})\s*(%|prozent)/);
  const deg = t.match(/(\d{2}(?:[,.]5)?)\s*grad/);
  const roomList = (ids) => ids.map((id) => D.floorplan.rooms.find((r) => r.id === id).name).join(" und ");
  const inRooms = (ids) => ids.map((id) => `${id === "kitchen" ? "in der" : "im"} ${roomList([id])}`).join(" und ");

  if (has(t, /hilfe|was kannst du/)) return `Zum Beispiel: ${EXAMPLES.slice(0, 4).join(" · ")}`;
  if (has(t, /wie spät|uhrzeit/)) return `Es ist ${hhmm(new Date())} Uhr.`;

  if (has(t, /\b(zeig|zeige|öffne|geh|wechsel)/)) {
    const p = Object.entries(PAGE_WORDS).find(([w]) => t.includes(w));
    if (p && !has(t, /rollläden|rollladen|tür/)) { bus.emit("nav", p[1]); return `Ich zeige ${p[0][0].toUpperCase() + p[0].slice(1)}.`; }
  }

  const sceneAlias = { film: "movie", kino: "movie", "gute nacht": "night", schlafen: "night", "guten morgen": "morning", "ich gehe": "away", "alles aus": "away", "alle aus": "away" };
  const sid = Object.entries(sceneAlias).find(([w]) => t.includes(w))?.[1] || D.scenes.find((s) => t.includes(s.name.toLowerCase()) || t.includes(s.say.toLowerCase()))?.id;
  if (sid && !has(t, /licht|lampe|rolll?äden|rolll?aden/)) { const s = D.scenes.find((x) => x.id === sid); runScene(s); return `Szene „${s.name}“ ist aktiv.`; }

  if (has(t, /roll+(ä|a)den|jalousie|rollo/)) {
    const target = pct ? +pct[1] : has(t, /\b(hoch|auf|öffne|rauf)/) ? 100 : has(t, /\b(runter|zu|schließ|herunter)/) ? 0 : null;
    if (target == null) return "Sollen die Rollläden hoch oder runter?";
    const list = rooms.length ? D.covers.filter((c) => rooms.includes(c.room)) : D.covers;
    if (!list.length) return `In ${roomList(rooms)} gibt es keinen Rollladen.`;
    list.forEach((c) => moveCover(c, target));
    return `Rollläden ${rooms.length ? `${inRooms(rooms)} ` : ""}${target === 100 ? "fahren hoch" : target === 0 ? "fahren runter" : `auf ${target} %`}.`;
  }

  if (has(t, /heizung|grad|wärmer|kälter/) && !has(t, /wie (warm|kalt)/)) {
    const list = rooms.length ? D.climate.filter((c) => rooms.includes(c.room)) : D.climate;
    list.forEach((c) => setTarget(c, deg ? parseFloat(deg[1].replace(",", ".")) : c.target + (has(t, /kälter/) ? -1 : 1)));
    return `${rooms.length ? roomList(rooms) : "Alle Räume"}: ${num(list[0].target)} Grad.`;
  }

  if (has(t, /wie (warm|kalt)|temperatur/) && rooms.length) {
    const c = byRoom(D.climate, rooms[0])[0];
    return c ? `${inRooms([rooms[0]]).replace(/^./, (c) => c.toUpperCase())} sind es ${num(c.current)} Grad.` : "Dort habe ich keinen Temperatursensor.";
  }

  const lightWords = has(t, /licht|lampe|beleuchtung|hell|dunkel|dimm/);
  const color = Object.keys(COLORS).find((c) => new RegExp(`\\b${c}`).test(t));
  if (lightWords || (rooms.length && (pct || color || has(t, /\b(an|aus|ein|warm|kalt)\b/)))) {
    const list = rooms.length ? D.lights.filter((l) => rooms.includes(l.room)) : all || lightWords ? D.lights : [];
    if (!list.length) return "Welches Licht meinst du?";
    let txt;
    if (pct) { list.forEach((l) => setLight(l, { on: +pct[1] > 0, brightness: Math.max(1, Math.min(100, +pct[1])) })); txt = `auf ${pct[1]} %`; }
    else if (color) { list.forEach((l) => setLight(l, l.rgb ? { on: true, mode: "color", color: COLORS[color] } : { on: true })); txt = list.some((l) => l.rgb) ? `in ${color[0].toUpperCase() + color.slice(1)}` : "an (keine Farbe möglich)"; }
    else if (has(t, /\bwarm/)) { list.forEach((l) => setLight(l, { on: true, mode: "ct", ct: 2700 })); txt = "warmweiß"; }
    else if (has(t, /\b(kalt|tageslicht)/)) { list.forEach((l) => setLight(l, { on: true, mode: "ct", ct: 6000 })); txt = "tageslichtweiß"; }
    else if (has(t, /\b(aus|ausschalten|dunkel)\b/)) { list.forEach((l) => setLight(l, { on: false })); txt = "aus"; }
    else if (has(t, /\bdimm/)) { list.forEach((l) => setLight(l, { on: true, brightness: 20 })); txt = "gedimmt"; }
    else { list.forEach((l) => setLight(l, { on: true, brightness: has(t, /hell/) ? 100 : l.brightness || 100 })); txt = "an"; }
    return `Licht ${rooms.length ? inRooms(rooms) : "überall"} ${txt}.`;
  }

  if (has(t, /musik|song|lied|titel|lauter|leiser|pause|weiter|nächst|stopp|spiel/)) {
    if (has(t, /nächst|überspring/)) { skipTrack(1); return `Weiter mit „${M.queue[M.track].title}“.`; }
    if (has(t, /lauter/)) { setMusic({ volume: Math.min(100, M.volume + 15) }); return `Lautstärke ${M.volume} %.`; }
    if (has(t, /leiser/)) { setMusic({ volume: Math.max(0, M.volume - 15) }); return `Lautstärke ${M.volume} %.`; }
    if (has(t, /pause|stopp|aus/)) { setMusic({ playing: false }); return "Musik pausiert."; }
    setMusic({ playing: true });
    return `Ich spiele „${M.queue[M.track].title}“.`;
  }

  if (has(t, /tür/)) {
    if (has(t, /abschließen|verriegeln|zusperren|\bzu\b/)) { setLock(true); return "Haustür ist verriegelt."; }
    if (has(t, /aufschließen|entriegeln|öffne|\bauf\b/)) { bus.emit("nav", "security"); return "Zum Entriegeln bitte am Display wischen – sicher ist sicher."; }
  }
  if (has(t, /alarm/)) {
    if (has(t, /\b(aus|unscharf|deaktiv)/)) { bus.emit("nav", "security"); return "Zum Ausschalten bitte die PIN eingeben."; }
    armAlarm(has(t, /zuhause|nacht/) ? "home" : "away");
    return "Alarmanlage wird scharf geschaltet.";
  }

  if (has(t, /wetter|warm|kalt|regnet|regen|temperatur/)) {
    const W = D.weather;
    return `Draußen ${W.temp} Grad, ${condOf(W.condition).text.toLowerCase()}. Heute bis ${W.days[0].max} Grad, Regenrisiko ${W.days[0].rain} %.`;
  }
  return `„${raw}“ habe ich nicht verstanden. Sag zum Beispiel: ${EXAMPLES[0]}.`;
}

function speak(text) {
  if (!store.get("speak", false) || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

export function openVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const orb = h("div", { class: "orb" }, h("i"), h("i"), h("i"));
  const said = h("div", { class: "v-said", "aria-live": "polite" }, SR ? "Ich höre zu …" : "Schreib einen Befehl");
  const reply = h("div", { class: "v-reply", "aria-live": "polite" });
  const input = h("input", { class: "v-input", type: "text", placeholder: "z. B. Licht im Wohnzimmer aus", "aria-label": "Befehl eingeben", enterkeyhint: "send" });
  let rec;

  const run = (text) => {
    said.textContent = `„${text}“`;
    const r = handleCommand(text);
    reply.textContent = r;
    orb.classList.remove("listening");
    speak(r);
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) { run(input.value.trim()); input.value = ""; } });

  const listen = () => {
    if (!SR) return input.focus();
    try {
      rec = new SR();
      rec.lang = "de-DE";
      rec.interimResults = true;
      rec.onresult = (e) => {
        const res = e.results[e.results.length - 1];
        said.textContent = res[0].transcript;
        if (res.isFinal) run(res[0].transcript);
      };
      rec.onerror = () => { orb.classList.remove("listening"); said.textContent = "Spracherkennung nicht verfügbar – tippe den Befehl."; };
      rec.onend = () => orb.classList.remove("listening");
      rec.start();
      orb.classList.add("listening");
      said.textContent = "Ich höre zu …";
    } catch { said.textContent = "Spracherkennung nicht verfügbar – tippe den Befehl."; }
  };

  const body = h("div", { class: "voice" },
    h("button", { class: "orb-btn", type: "button", "aria-label": "Zuhören", onclick: listen }, orb, h("span", { class: "orb-ico", html: svg("mic") })),
    said, reply,
    h("div", { class: "v-form" }, input, h("button", { class: "round primary", type: "button", "aria-label": "Senden", html: svg("chevron"), onclick: () => { if (input.value.trim()) { run(input.value.trim()); input.value = ""; } } })),
    h("div", { class: "chips v-examples" }, EXAMPLES.map((x) => h("button", { class: "chip-s", type: "button", onclick: () => run(x) }, x))));
  openSheet({ title: "Sprachsteuerung", sub: SR ? "Tippe aufs Mikrofon und sprich" : "Spracheingabe wird von diesem Browser nicht unterstützt", body, cls: "sheet-voice", onClose: () => { try { rec?.abort(); } catch { /* egal */ } } });
  if (SR) listen(); else input.focus();
}
