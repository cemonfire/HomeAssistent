# Zuhause – Smart-Home-Dashboard (Prototyp)

Kiosk-Dashboard für Wandtablet und Desktop. Auf dem Handy wird daraus eine scrollbare Ansicht.
Läuft komplett mit Beispieldaten und ohne Build-Schritt. Die Seiten wechselt man per Wischen, über die Leiste bzw. das Dock oder mit den Tasten 1–5.

## Seiten

| Seite | Inhalt |
|---|---|
| **Übersicht** | Kamera mit Personenerkennung, Uhr, Anwesenheit, Szenen (Alexa), Termine, Musik, Licht- und Rollladen-Kacheln |
| **Räume** | Isometrischer Grundriss mit leuchtenden Lichtern, Rollläden, offenen Fenstern und Personen. Ein Raum antippen öffnet seine Steuerung mit Licht, Rollladen und Thermostat-Drehregler. Dazu Klima, Anwesenheit und Automationen |
| **Energie** | Live-Energiefluss (Solar, Netz, Haus, Batterie, Auto), Tageskurve mit Prognose, Autarkie, Ersparnis, Laden des Autos |
| **Sicherheit** | Alarmanlage mit PIN, Haustür zum Entriegeln wischen, Sensoren mit Batterie, Kamera-Ereignisse mit Zeitleiste und Standbildern |
| **Infos** | Wetter mit 24-h-Kurve und Regen, 6-Tage-Vorschau, Abfahrten mit „Jetzt los“, Müllabfuhr, Pakete |

## Weitere Funktionen

- **Lichtfarben:** Kachel gedrückt halten (oder Rechtsklick) öffnet Helligkeit, Weißton und Farbrad
- **Türklingel:** Vollbild mit Kamerabild, Gong, Gegensprechen, Wischen zum Öffnen. Unbeantwortete Besuche landen in der Zeitleiste
- **Lebendiger Hintergrund:** Der Himmel folgt Tageszeit und Wetter (Sterne, Wolken, Regen, Schnee, Blitze)
- **Ruhemodus:** Große Uhr über dem Himmel oder Fotos (`photos` in `data.js`), nachts gedimmt, mit Einbrennschutz. Optional wacht das Display auf, wenn jemand davorsteht (Frontkamera, das Bild verlässt das Gerät nicht)
- **Sprachsteuerung:** Mikrofon-Taste oder Strg+K. Beispiele: „Licht im Wohnzimmer aus“, „Küche auf 50 Prozent“, „Schlafzimmer blau“, „Rollläden runter“, „Filmabend“, „Wohnzimmer auf 22 Grad“, „Zeig Energie“. Ohne Spracherkennung im Browser tippt man die Befehle ein
- **Einstellungen und Demo:** Name, Ruhemodus, Vorlesen, „Effekte reduzieren“ für ältere Tablets. Demo-Knöpfe für Klingel, Bewegung, Einbruch, Wetter und Tageszeit-Vorschau

## Starten

    python3 -m http.server 8080      # oder: npx serve
    # http://localhost:8080 öffnen  (eine Seite direkt: ?page=rooms|energy|security|info)

Die App muss über einen Webserver laufen, weil ES-Module per `file://` nicht laden.

## Aufbau

    index.html        Gerüst + Übersicht
    data.js           alle Beispieldaten (hier anpassen)
    css/base.css      Farben, Navigation, Bausteine, Dialoge, Ruhemodus
    css/overview.css  Übersicht
    css/pages.css     Räume, Energie, Sicherheit, Infos, Overlays
    js/core.js        Helfer, Icons, Event-Bus, Toasts, Sonnenzeiten
    js/state.js       Zustand + Aktionen (hier später Home Assistant anbinden)
    js/*.js           je ein Modul pro Seite bzw. Funktion

Alle Änderungen laufen über `js/state.js` und werden über einen Event-Bus verteilt. Für Home Assistant ersetzt man dort die lokalen Zuweisungen durch WebSocket-Aufrufe (`call_service`) und speist eingehende `state_changed`-Events in dieselben Bus-Events ein.

## Echte Kamera

Über go2rtc in `data.js`:
`{ name: "Wohnzimmer", type: "mjpeg", url: "http://HOST:1984/api/stream.mjpeg?src=tapo" }`
