// Beispieldaten. Später ersetzt durch Home Assistant (WebSocket/REST).
window.DATA = {
  user: "",            // dein Vorname für die Begrüßung
  idleSeconds: 120,    // Ruhemodus nach X Sekunden ohne Bedienung (0 = aus)

  weather: { temp: 17, text: "Leicht bewölkt" },

  // Kamera-Typen:
  //   sim     – simulierter Feed (läuft ohne Hardware), scene: door | garden | garage
  //   webcam  – Laptop-/Handy-Kamera (nur localhost oder HTTPS)
  //   mjpeg   – z. B. go2rtc: http://HOST:1984/api/stream.mjpeg?src=name
  //   iframe  – z. B. go2rtc WebRTC: http://HOST:1984/stream.html?src=name
  // notify: true → Hinweis bei Bewegung
  cameras: [
    { id: "door",   name: "Haustür", type: "sim", scene: "door", notify: true },
    { id: "garden", name: "Garten",  type: "sim", scene: "garden" },
    { id: "garage", name: "Garage",  type: "sim", scene: "garage" },
    { id: "webcam", name: "Webcam",  type: "webcam" },
    // { id: "tapo", name: "Wohnzimmer", type: "mjpeg", url: "http://192.168.1.10:1984/api/stream.mjpeg?src=tapo" },
  ],

  // "in" = Minuten relativ zu jetzt, damit die Demo immer aktuell wirkt
  events: [
    { in: -150, dur: 30, title: "Daily Standup",    cal: "Arbeit",   color: "#7aa2ff" },
    { in: 35,   dur: 60, title: "Mittag mit Anna",  cal: "Privat",   color: "#5fe0a8" },
    { in: 185,  dur: 45, title: "Zahnarzt",         cal: "Privat",   color: "#5fe0a8" },
    { in: 330,  dur: 15, title: "Müll rausstellen", cal: "Haushalt", color: "#ffc566" },
    { in: 1460, dur: 30, title: "Paketlieferung",   cal: "Haushalt", color: "#ffc566" },
  ],

  lights: [
    { id: "l1", name: "Wohnzimmer",   on: true,  brightness: 70 },
    { id: "l2", name: "Küche",        on: false, brightness: 100 },
    { id: "l3", name: "Schlafzimmer", on: false, brightness: 40 },
    { id: "l4", name: "Flur",         on: true,  brightness: 35 },
  ],

  covers: [
    { id: "c1", name: "Wohnzimmer",   position: 100 },
    { id: "c2", name: "Küche",        position: 60 },
    { id: "c3", name: "Schlafzimmer", position: 0 },
  ],

  music: {
    playing: true,
    volume: 35,
    room: "Wohnzimmer",
    track: 0,
    queue: [
      { title: "Midnight City", artist: "M83",           dur: 244, hue: 275 },
      { title: "Intro",         artist: "The xx",        dur: 127, hue: 200 },
      { title: "Weightless",    artist: "Marconi Union", dur: 480, hue: 160 },
    ],
  },

  // Szenen = Alexa-Routinen. lights: Name → Helligkeit (nicht genannte gehen aus)
  scenes: [
    { id: "morning", name: "Morgen",   icon: "sun",   say: "guten Morgen", lights: { "Küche": 80, "Flur": 40 }, covers: 100 },
    { id: "movie",   name: "Film",     icon: "tv",    say: "Filmabend",    lights: { "Wohnzimmer": 12 },        covers: 0, music: false },
    { id: "away",    name: "Alle aus", icon: "power", say: "ich gehe",     lights: {},                          covers: 0, music: false },
    { id: "night",   name: "Nacht",    icon: "moon",  say: "gute Nacht",   lights: { "Flur": 5 },               covers: 0, music: false },
  ],
};
