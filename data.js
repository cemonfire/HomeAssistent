// Beispieldaten. Später ersetzt durch Home Assistant (WebSocket/REST).
// Alles, was du anpassen willst, steht hier.
window.DATA = {
  user: "",              // dein Vorname für die Begrüßung (auch in den Einstellungen änderbar)
  idleSeconds: 120,      // Ruhemodus nach X Sekunden ohne Bedienung (0 = aus)
  location: { lat: 51.2, lon: 10.4 },   // für Sonnenauf-/untergang, Himmel und Solar-Kurve
  photos: [],            // Bild-URLs für die Diashow im Ruhemodus (leer = animierter Himmel)
  demo: { autoDoorbell: 90 },           // Demo: klingelt nach X Sekunden einmal (0 = aus)

  // condition: clear | cloudy | rain | snow | storm
  weather: {
    temp: 17, condition: "cloudy", humidity: 62, wind: 12,
    days: [
      { day: "Heute", cond: "cloudy", min: 9,  max: 19, rain: 20 },
      { day: "Mi",    cond: "rain",   min: 10, max: 15, rain: 80 },
      { day: "Do",    cond: "storm",  min: 8,  max: 14, rain: 70 },
      { day: "Fr",    cond: "cloudy", min: 6,  max: 13, rain: 30 },
      { day: "Sa",    cond: "clear",  min: 5,  max: 16, rain: 5 },
      { day: "So",    cond: "clear",  min: 7,  max: 18, rain: 0 },
    ],
  },

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
  ],

  // "in" = Minuten relativ zu jetzt, damit die Demo immer aktuell wirkt
  events: [
    { in: -150, dur: 30, title: "Daily Standup",    cal: "Arbeit",   color: "#7aa2ff" },
    { in: 35,   dur: 60, title: "Mittag mit Anna",  cal: "Privat",   color: "#5fe0a8" },
    { in: 185,  dur: 45, title: "Zahnarzt",         cal: "Privat",   color: "#5fe0a8" },
    { in: 330,  dur: 15, title: "Müll rausstellen", cal: "Haushalt", color: "#ffc566" },
    { in: 1460, dur: 30, title: "Paketlieferung",   cal: "Haushalt", color: "#ffc566" },
  ],

  // mode: "ct" (Weißton in Kelvin) oder "color" (Farbe, nur wenn rgb: true)
  // pinned: false → nur im Grundriss, nicht auf der Übersicht
  lights: [
    { id: "l1", name: "Wohnzimmer",   room: "living",  on: true,  brightness: 70, rgb: true,  mode: "ct",    ct: 2700, color: "#ff8a4c" },
    { id: "l2", name: "Küche",        room: "kitchen", on: false, brightness: 100, rgb: false, mode: "ct",   ct: 4000 },
    { id: "l3", name: "Schlafzimmer", room: "bed",     on: false, brightness: 40, rgb: true,  mode: "color", ct: 2700, color: "#ff7a59" },
    { id: "l4", name: "Flur",         room: "hall",    on: true,  brightness: 35, rgb: false, mode: "ct",    ct: 3000 },
    { id: "l5", name: "Bad",          room: "bath",    on: false, brightness: 80, rgb: false, mode: "ct",    ct: 4500, pinned: false },
    { id: "l6", name: "Büro",         room: "office",  on: true,  brightness: 90, rgb: true,  mode: "color", ct: 5000, color: "#7c8cff", pinned: false },
  ],

  covers: [
    { id: "c1", name: "Wohnzimmer",   room: "living",  position: 100 },
    { id: "c2", name: "Küche",        room: "kitchen", position: 60 },
    { id: "c3", name: "Schlafzimmer", room: "bed",     position: 0 },
  ],

  climate: [
    { id: "t1", name: "Wohnzimmer",   room: "living",  current: 21.2, target: 21.5, humidity: 48 },
    { id: "t2", name: "Küche",        room: "kitchen", current: 20.6, target: 20,   humidity: 55 },
    { id: "t3", name: "Schlafzimmer", room: "bed",     current: 18.4, target: 18,   humidity: 51 },
    { id: "t4", name: "Bad",          room: "bath",    current: 21.8, target: 23,   humidity: 67 },
    { id: "t5", name: "Büro",         room: "office",  current: 20.9, target: 21,   humidity: 44 },
  ],

  // state: closed | open | tilted (Fenster/Türen) · ok | alarm (Melder)
  sensors: [
    { id: "s1", name: "Haustür",              type: "door",   room: "hall",    state: "closed", battery: 91 },
    { id: "s5", name: "Terrassentür",         type: "door",   room: "living",  state: "closed", battery: 77 },
    { id: "s2", name: "Fenster Wohnzimmer",   type: "window", room: "living",  state: "closed", battery: 88 },
    { id: "s3", name: "Fenster Küche",        type: "window", room: "kitchen", state: "tilted", battery: 54 },
    { id: "s4", name: "Fenster Schlafzimmer", type: "window", room: "bed",     state: "closed", battery: 69 },
    { id: "s8", name: "Fenster Büro",         type: "window", room: "office",  state: "closed", battery: 95 },
    { id: "s6", name: "Rauchmelder Flur",     type: "smoke",  room: "hall",    state: "ok",     battery: 82 },
    { id: "s7", name: "Wassermelder Bad",     type: "water",  room: "bath",    state: "ok",     battery: 18 },
  ],

  lock: { name: "Haustür", locked: true, autoRelock: 30 },
  alarm: { mode: "disarmed", pin: "1234", exitDelay: 10 },   // Demo-PIN

  people: [
    { id: "p1", name: "Anna", color: "#5fe0a8", home: true,  room: "living" },
    { id: "p2", name: "Ben",  color: "#7aa2ff", home: false, where: "Arbeit", eta: 40 },
  ],

  schedules: [
    { id: "a1", name: "Rollläden hoch",   time: "07:00",  days: "Mo–Fr",   icon: "blinds", enabled: true },
    { id: "a2", name: "Rollläden runter", time: "sunset", days: "Täglich", icon: "sunset", enabled: true },
    { id: "a3", name: "Heizung Eco",      time: "22:30",  days: "Täglich", icon: "flame",  enabled: true },
    { id: "a4", name: "Flurlicht 10 %",   time: "23:00",  days: "Täglich", icon: "bulb",   enabled: false },
  ],

  energy: {
    solarPeak: 8.4,      // kWp
    batteryKwh: 10, soc: 64,
    price: 0.32, feedIn: 0.08,   // €/kWh
    car: { name: "Auto", soc: 48, charging: false, kw: 3.7, capacity: 60 },
  },

  transit: {
    stop: "Lindenplatz",
    lines: [
      { line: "U2",  color: "#e8414c", dir: "Hauptbahnhof", every: 10, offset: 3 },
      { line: "42",  color: "#3d7be0", dir: "Uniklinik",    every: 15, offset: 7 },
      { line: "S1",  color: "#1f9d61", dir: "Flughafen",    every: 20, offset: 12, delay: 2 },
      { line: "U2",  color: "#e8414c", dir: "Nordpark",     every: 10, offset: 8 },
    ],
  },

  // nächste Abholung in X Tagen, danach alle "every" Tage
  trash: [
    { type: "Restmüll",    color: "#8b919c", inDays: 1, every: 14 },
    { type: "Bio",         color: "#6fae4f", inDays: 3, every: 7 },
    { type: "Papier",      color: "#3d7be0", inDays: 6, every: 28 },
    { type: "Gelber Sack", color: "#e8c547", inDays: 9, every: 14 },
  ],

  packages: [
    { name: "Kopfhörer",   carrier: "DHL",    step: 2, eta: "Heute, 14–18 Uhr" },
    { name: "Kaffeebohnen", carrier: "Hermes", step: 1, eta: "Morgen" },
    { name: "Buch",        carrier: "DPD",    step: 3, eta: "Zugestellt · Briefkasten" },
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

  // Grundriss in Metern (x nach rechts/Osten, y nach vorn/Süden)
  floorplan: {
    width: 12, depth: 9,
    rooms: [
      { id: "living",  name: "Wohnzimmer",   x: 0,   y: 0,   w: 6,   d: 5.5 },
      { id: "kitchen", name: "Küche",        x: 6,   y: 0,   w: 3.5, d: 4 },
      { id: "bath",    name: "Bad",          x: 9.5, y: 0,   w: 2.5, d: 4 },
      { id: "hall",    name: "Flur",         x: 6,   y: 4,   w: 6,   d: 1.8 },
      { id: "office",  name: "Büro",         x: 0,   y: 5.5, w: 6,   d: 3.5 },
      { id: "bed",     name: "Schlafzimmer", x: 6,   y: 5.8, w: 6,   d: 3.2 },
    ],
    // side: n | w | s | e (Außenwand), from/to in Metern entlang der Wand
    openings: [
      { side: "n", from: 1,    to: 4.2,  sensor: "s2", cover: "c1" },
      { side: "w", from: 1.8,  to: 3.6,  sensor: "s5", door: true },
      { side: "n", from: 6.8,  to: 8.8,  sensor: "s3", cover: "c2" },
      { side: "n", from: 10.2, to: 11.3 },
      { side: "w", from: 6.2,  to: 8,    sensor: "s8" },
      { side: "s", from: 7.6,  to: 10.4, sensor: "s4", cover: "c3" },
      { side: "e", from: 4.4,  to: 5.4,  sensor: "s1", door: true, lock: true },
    ],
  },
};
