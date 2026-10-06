// Beispieldaten. Später ersetzt durch Home Assistant (WebSocket/REST).
// Kamera-Typen:
//   sim     – simulierter Feed (läuft ohne Hardware)
//   webcam  – Laptop-/Handy-Kamera via getUserMedia
//   mjpeg   – <img src="..."> (z. B. go2rtc: http://HOST:1984/api/stream.mjpeg?src=name)
//   iframe  – eingebettete Seite (z. B. go2rtc: http://HOST:1984/stream.html?src=name)
window.DATA = {
  user: "Gast",
  weather: { temp: 17, text: "Leicht bewölkt", icon: "" },

  cameras: [
    { id: "door",   name: "Haustür",  type: "sim", seed: 1 },
    { id: "garden", name: "Garten",   type: "sim", seed: 2 },
    { id: "garage", name: "Garage",   type: "sim", seed: 3 },
    { id: "webcam", name: "Webcam (Test)", type: "webcam" },
    // { id: "tapo", name: "Wohnzimmer", type: "mjpeg", url: "http://192.168.1.10:1984/api/stream.mjpeg?src=tapo" },
  ],

  events: [
    { time: "08:30", title: "Daily Standup", cal: "Arbeit", color: "#4f8cff" },
    { time: "12:00", title: "Mittag mit Anna", cal: "Privat", color: "#3ddc97" },
    { time: "15:30", title: "Zahnarzt", cal: "Privat", color: "#3ddc97" },
    { time: "18:00", title: "Müll rausstellen", cal: "Haushalt", color: "#ffb84d" },
    { time: "Mi 09:00", title: "Paketlieferung", cal: "Haushalt", color: "#ffb84d" },
  ],

  lights: [
    { id: "l1", name: "Wohnzimmer", on: true,  brightness: 70 },
    { id: "l2", name: "Küche",      on: false, brightness: 100 },
    { id: "l3", name: "Schlafzimmer", on: false, brightness: 40 },
    { id: "l4", name: "Flur",       on: true,  brightness: 55 },
  ],

  covers: [
    { id: "c1", name: "Wohnzimmer", position: 100 },
    { id: "c2", name: "Küche",      position: 60 },
    { id: "c3", name: "Schlafzimmer", position: 0 },
  ],

  music: {
    playing: true,
    volume: 35,
    room: "Wohnzimmer",
    track: 0,
    queue: [
      { title: "Midnight City", artist: "M83", dur: 244, hue: 280 },
      { title: "Intro", artist: "The xx", dur: 127, hue: 200 },
      { title: "Weightless", artist: "Marconi Union", dur: 480, hue: 160 },
    ],
  },

  scenes: [
    { id: "morning", name: "Guten Morgen", icon: "☀", say: "Alexa, guten Morgen" },
    { id: "movie",   name: "Film",         icon: "◐", say: "Alexa, Filmabend" },
    { id: "away",    name: "Alle aus",     icon: "○", say: "Alexa, ich gehe" },
    { id: "night",   name: "Gute Nacht",   icon: "☾", say: "Alexa, gute Nacht" },
  ],
};
