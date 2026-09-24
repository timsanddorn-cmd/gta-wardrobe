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

Die fertige App liegt ausschließlich in `index.html`. Diese Datei ist die gemeinsame Quelle für GitHub Pages und Firebase Hosting. Eine zweite Kopie unter `public/index.html` wird nicht mehr gepflegt.

Firestore-Regeln liegen versioniert in `firestore.rules`.
