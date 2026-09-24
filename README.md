# GTA Wardrobe

Gemeinsame Wardrobe-App für Tim, Ray, Andy und Kata.

## Aktueller Funktionsumfang
- Firebase-Login ohne sichtbare E-Mail-Adressen
- Firestore-Freigabeliste für genau die erlaubten Nutzer
- Eigene Cloud-Looks speichern, umbenennen, archivieren und löschen
- Looks der anderen ansehen und als Vorlage laden
- Outfit-Vorschläge senden, annehmen, ablehnen und zurückziehen
- Export, Import und geschützte vollständige Sicherung
- Übernahme älterer lokaler Looks
- Eigenes Passwort unter „Konto & Sicherheit“ ändern
- Damen-/Herren-Bereiche vorbereitet
- Damen-Katalog mit Torso, Weste, Hose, Schuhe und T-Shirt
- Neue Looks speichern alle fünf Kleidungsbereiche; bestehende ältere Zwei-Teil-Looks bleiben kompatibel

Die App ist in `index.html` (Markup), `style.css` (Darstellung) und `app.js` (Logik, Katalogdaten und Firebase-Anbindung) aufgeteilt. GitHub Pages und Firebase Hosting verwenden gemeinsam diese Dateien.

Firestore-Regeln liegen versioniert in `firestore.rules`.
