# Zuhause – Smart-Home-Dashboard (Prototyp)

Kiosk-Dashboard für Wandtablet und Desktop, das auf dem Handy zu einer scrollbaren Ansicht umbricht.
Läuft mit Beispieldaten, ohne Build-Schritt.

- **Kameras:** Hauptbild mit Vorschaubildern, simulierte Feeds mit Personenerkennung, Bewegungshinweise
- **Licht:** Tippen schaltet, waagerecht ziehen dimmt
- **Rollläden:** Tippen fährt auf oder zu, senkrecht ziehen setzt die Position
- **Szenen / Alexa:** Morgen, Film, Alle aus, Nacht
- **Termine:** Tagesansicht mit Countdown zum nächsten Termin
- **Musik:** Player mit Cover-Farbe und Lautstärke
- **Ruhemodus:** Nach 2 Minuten ohne Bedienung erscheint eine große Uhr, die nachts gedimmt wird und gegen Einbrennen langsam wandert

## Starten

    python3 -m http.server 8080      # oder: npx serve
    # http://localhost:8080 öffnen

## Anpassen

Alles steht in `data.js`: Name, Ruhemodus-Zeit, Kameras, Termine, Lichter, Rollläden, Szenen.

Echte Kamera über go2rtc:
`{ name: "Wohnzimmer", type: "mjpeg", url: "http://HOST:1984/api/stream.mjpeg?src=tapo" }`

## Nächster Schritt

Die Beispieldaten in `data.js` durch Home Assistant ersetzen (WebSocket-API).
