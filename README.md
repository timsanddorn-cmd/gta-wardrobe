# GTA Wardrobe

Statische Wardrobe-Anwendung für GTA RP mit Firebase Authentication, Firestore-Cloud-Looks und lokalem Backup/Restore.

## Struktur

- `index.html` – Seitenstruktur
- `style.css` – Darstellung
- `app.js` – Anwendungs-, Login-, Cloud- und Speicherlogik
- `catalog/manifest.json` – Übersicht der Katalogbereiche
- `catalog/female/*.json` – Damen-Katalogdaten
- `catalog/male/*.json` – vorbereitete Herren-Katalogdaten
- `assets/catalog/` – einzeln ladbare Kleidungsbilder
- `firestore.rules` – Firestore-Berechtigungen
- `firebase.json` – Firebase-Hosting-Konfiguration

## Katalog

Kleidungsbilder sind nicht mehr in `app.js` eingebettet. Jeder Katalogeintrag enthält nur ID, Beschreibung und Bildpfad. Dadurch bleibt die Programmlogik klein und neue Kleidung kann ohne erneutes Aufblähen von `app.js` ergänzt werden.

Aktuell vollständig angebunden: Torso, Weste, Hose, Schuhe und T-Shirt.

Die bestehenden Cloud-, Vorschlags-, Import/Export- und Backup-Funktionen verwenden weiterhin die Kleidungs-IDs und Texturen; die ausgelagerten Bilddateien werden nicht in Looks gespeichert.
