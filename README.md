# Home Dashboard (Prototyp)

Statische Web-App mit Beispieldaten: Kameras, Termine, Musik, Lichter, Rollläden, Alexa-Szenen.
Kein Build-Schritt nötig.

## Starten

    python3 -m http.server 8080      # oder: npx serve
    # dann http://localhost:8080 öffnen

## Echte Kamera einbinden (data.js)

- `webcam`: Laptop-/Handykamera (nur auf localhost oder HTTPS)
- `mjpeg` / `iframe`: Stream von go2rtc, z. B. `http://HOST:1984/api/stream.mjpeg?src=tapo`

## Nächste Schritte

Beispieldaten in `data.js` durch Home Assistent (WebSocket-API) ersetzen.
