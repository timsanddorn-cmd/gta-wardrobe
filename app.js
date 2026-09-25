const WARDROBE_TYPES = Object.freeze([
  {key:"torso", label:"Torso"},
  {key:"vest", label:"Weste"},
  {key:"pants", label:"Hose"},
  {key:"shoes", label:"Schuhe"},
  {key:"tshirt", label:"T-Shirt"}
]);
const PLACEHOLDER_INDEX = -1;
const PLACEHOLDER_IMAGE = "assets/ui/placeholder-select.svg";

const CATALOG_FILES = Object.freeze({
  female: Object.freeze({
    torso: "catalog/female/torso.json",
    vest: "catalog/female/weste.json",
    pants: "catalog/female/hose.json",
    shoes: "catalog/female/schuhe.json",
    tshirt: "catalog/female/tshirt.json"
  }),
  male: Object.freeze({
    torso: "catalog/male/torso.json",
    vest: "catalog/male/weste.json",
    pants: "catalog/male/hose.json",
    shoes: "catalog/male/schuhe.json",
    tshirt: "catalog/male/tshirt.json"
  })
});

const catalogs = {female:{}, male:{}};
WARDROBE_TYPES.forEach(function(type) {
  catalogs.female[type.key] = [];
  catalogs.male[type.key] = [];
});

function updateSourceDataStatus() {
  const el = document.getElementById("sourceDataStatus");
  if (!el) return;
  const c = catalogs.female;
  el.textContent =
    "Datenstand Klamotten ST: " +
    c.torso.length + " Torso · " +
    c.vest.length + " Weste · " +
    c.pants.length + " Hose · " +
    c.shoes.length + " Schuhe · " +
    c.tshirt.length + " T-Shirt";
}

async function loadCatalogs() {
  const jobs = [];
  Object.keys(CATALOG_FILES).forEach(function(gender) {
    WARDROBE_TYPES.forEach(function(type) {
      const path = CATALOG_FILES[gender][type.key];
      jobs.push(
        fetch(path, {cache:"no-cache"}).then(async function(response) {
          if (!response.ok) {
            throw new Error("Katalogdatei konnte nicht geladen werden: " + path + " (" + response.status + ")");
          }
          const data = await response.json();
          if (!Array.isArray(data)) {
            throw new Error("Ungültiges Katalogformat: " + path);
          }
          catalogs[gender][type.key] = data;
        })
      );
    });
  });
  await Promise.all(jobs);
  updateSourceDataStatus();
  return catalogs;
}

const catalogReady = loadCatalogs();

let activeGender = "female";
let catalog = catalogs[activeGender];

const state = {};
WARDROBE_TYPES.forEach(function(type) {
  state[type.key + "Index"] = PLACEHOLDER_INDEX;
  state[type.key + "Texture"] = 0;
});

function indexKey(type) {
  return type + "Index";
}

function textureKey(type) {
  return type + "Texture";
}

function current(type) {
  const list = catalog[type] || [];
  if (!list.length) return null;
  const rawIndex = Number(state[indexKey(type)]);
  if (!Number.isInteger(rawIndex) || rawIndex < 0) return null;
  return list[Math.min(rawIndex, list.length - 1)] || null;
}

function renderType(type) {
  const item = current(type);
  const rawIndex = Number(state[indexKey(type)]);
  const idx = Number.isInteger(rawIndex) ? rawIndex : PLACEHOLDER_INDEX;
  const list = catalog[type] || [];
  const img = document.getElementById(type + "Img");
  const viewer = img.closest(".viewer");
  const textureInput = document.getElementById(type + "Texture");
  const imageBox = img.parentElement;

  if (!item) {
    const hasCatalogData = list.length > 0;
    const empty = imageBox.querySelector(".emptyImage");

    if (hasCatalogData) {
      if (empty) empty.remove();
      const typeDef = WARDROBE_TYPES.find(function(entry){ return entry.key === type; });
      img.style.display = "block";
      img.src = PLACEHOLDER_IMAGE;
      img.alt = (typeDef ? typeDef.label : "Kleidungsstück") + " auswählen";
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
      let noData = empty;
      if (!noData) {
        noData = document.createElement("div");
        noData.className = "emptyImage";
        imageBox.appendChild(noData);
      }
      noData.textContent = activeGender === "male"
        ? "Noch keine Herren-Daten hinterlegt"
        : "Keine Daten vorhanden";
    }

    document.getElementById(type + "Id").textContent = "—";
    document.getElementById(type + "Desc").textContent = hasCatalogData
      ? "Bitte mit den Pfeilen ein Kleidungsstück auswählen."
      : (activeGender === "male"
        ? "Dieser Bereich ist vorbereitet. Sobald deine Männerdaten kommen, werden sie hier eingefügt."
        : "Keine Einträge vorhanden.");
    document.getElementById(type + "Pos").textContent = hasCatalogData
      ? "Nicht ausgewählt · 0 von " + list.length
      : "0 von 0";
    viewer.classList.add("noData");
    viewer.classList.toggle("placeholder", hasCatalogData);
    textureInput.disabled = true;
    return;
  }

  const empty = imageBox.querySelector(".emptyImage");
  if (empty) empty.remove();

  img.style.display = "block";
  img.src = item.image;
  document.getElementById(type + "Id").textContent = "ID " + item.id;
  document.getElementById(type + "Desc").textContent = item.description;
  document.getElementById(type + "Pos").textContent = (idx + 1) + " von " + list.length;
  viewer.classList.remove("noData","placeholder");
  textureInput.disabled = false;
}

function render() {
  WARDROBE_TYPES.forEach(function(type) {
    renderType(type.key);
    const input = document.getElementById(type.key + "Texture");
    input.value = state[textureKey(type.key)] || 0;
    const hasData = Boolean(catalog[type.key] && catalog[type.key].length);
    document.getElementById(type.key + "Prev").disabled = !hasData;
    document.getElementById(type.key + "Next").disabled = !hasData;
  });

  const hasAnyCatalogData = WARDROBE_TYPES.some(function(type) {
    return Boolean(catalog[type.key] && catalog[type.key].length);
  });
  document.getElementById("saveBtn").disabled = !hasAnyCatalogData;
  document.getElementById("saveNamedBtn").disabled = !hasAnyCatalogData;
}

function move(type, delta) {
  const list = catalog[type] || [];
  if (!list.length) return;

  const key = indexKey(type);
  const rawIndex = Number(state[key]);
  const currentIndex = Number.isInteger(rawIndex) && rawIndex >= PLACEHOLDER_INDEX
    ? Math.min(rawIndex, list.length - 1)
    : PLACEHOLDER_INDEX;

  // Position 0 is the placeholder; catalog items occupy positions 1..N.
  const cycleLength = list.length + 1;
  const currentPosition = currentIndex + 1;
  const nextPosition = (currentPosition + delta + cycleLength) % cycleLength;
  state[key] = nextPosition - 1;
  if (state[key] === PLACEHOLDER_INDEX) state[textureKey(type)] = 0;
  renderType(type);
  document.getElementById(type + "Texture").value = state[textureKey(type)] || 0;
}

function resetSelectionState() {
  WARDROBE_TYPES.forEach(function(type) {
    state[indexKey(type.key)] = PLACEHOLDER_INDEX;
    state[textureKey(type.key)] = 0;
  });
}

function clampSelectionState() {
  WARDROBE_TYPES.forEach(function(type) {
    const list = catalog[type.key] || [];
    const idxKey = indexKey(type.key);
    const texKey = textureKey(type.key);
    const rawIndex = Number(state[idxKey]);

    if (!list.length || !Number.isInteger(rawIndex) || rawIndex < 0) {
      state[idxKey] = PLACEHOLDER_INDEX;
    } else {
      state[idxKey] = Math.min(rawIndex, list.length - 1);
    }
    state[texKey] = state[idxKey] === PLACEHOLDER_INDEX
      ? 0
      : Math.max(0, Number(state[texKey]) || 0);
  });
}

function switchGender(gender, announce = true) {
  if (!catalogs[gender]) return;

  activeGender = gender;
  catalog = catalogs[activeGender];
  resetSelectionState();

  document.getElementById("femaleBtn").classList.toggle("active", gender === "female");
  document.getElementById("maleBtn").classList.toggle("active", gender === "male");
  document.getElementById("archiveBadge").textContent =
    (gender === "female" ? "DAMEN" : "HERREN") + " · WARDROBE";

  render();

  if (announce) {
    status.textContent = gender === "male"
      ? "Herrenbereich geöffnet. Die Struktur steht bereits – Daten folgen später."
      : "Damenbereich geöffnet.";
  }
}

const status = document.getElementById("status");

document.getElementById("femaleBtn").addEventListener("click", function(){ switchGender("female"); });
document.getElementById("maleBtn").addEventListener("click", function(){ switchGender("male"); });

WARDROBE_TYPES.forEach(function(type) {
  document.getElementById(type.key + "Prev").addEventListener("click", function(){ move(type.key,-1); });
  document.getElementById(type.key + "Next").addEventListener("click", function(){ move(type.key,1); });
  document.getElementById(type.key + "Texture").addEventListener("input", function(e) {
    state[textureKey(type.key)] = Math.max(0, parseInt(e.target.value || "0",10) || 0);
  });
});

document.getElementById("saveBtn").addEventListener("click", function() {
  try {
    localStorage.setItem("gtaWardrobeCatalog_" + activeGender, JSON.stringify(state));
    createEmergencySnapshot("quick_save");
    status.textContent = "Auswahl lokal gespeichert.";
  } catch(e) {
    status.textContent = "Speichern ist in diesem Browser nicht verfügbar.";
  }
});

document.getElementById("loadBtn").addEventListener("click", function() {
  try {
    const raw = localStorage.getItem("gtaWardrobeCatalog_" + activeGender);
    if(!raw) {
      status.textContent = "Noch keine gespeicherte Auswahl gefunden.";
      return;
    }
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
    clampSelectionState();
    render();
    createEmergencySnapshot("quick_load");
    status.textContent = "Gespeicherte Auswahl geladen.";
  } catch(e) {
    status.textContent = "Gespeicherte Auswahl konnte nicht geladen werden.";
  }
});

document.getElementById("resetBtn").addEventListener("click", function() {
  resetSelectionState();
  render();
  status.textContent = "Auswahl zurückgesetzt.";
});


const OUTFIT_STORE_KEY = "gtaWardrobeNamedOutfitsV1";

function readSavedOutfits() {
  try {
    const raw = localStorage.getItem(OUTFIT_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeSavedOutfits(list) {
  localStorage.setItem(OUTFIT_STORE_KEY, JSON.stringify(list));
}

function currentOutfitSnapshot(name) {
  const snapshot = {
    schemaVersion: 2,
    id: Date.now(),
    gender: activeGender,
    name: name,
    savedAt: new Date().toISOString()
  };

  let selectedCount = 0;
  WARDROBE_TYPES.forEach(function(type) {
    const part = current(type.key);
    if (!part) return;
    selectedCount += 1;
    snapshot[indexKey(type.key)] = state[indexKey(type.key)];
    snapshot[type.key] = {
      id: part.id,
      description: part.description,
      texture: state[textureKey(type.key)] || 0
    };
  });

  return selectedCount ? snapshot : null;
}

function icText(outfit) {
  return WARDROBE_TYPES
    .filter(function(type){ return outfit && outfit[type.key]; })
    .map(function(type) {
      return type.label + ": ID " + outfit[type.key].id +
        " | Variante " + (Number(outfit[type.key].texture) || 0);
    })
    .join("\n");
}

function outfitPartsHtml(outfit) {
  return WARDROBE_TYPES
    .filter(function(type){ return outfit && outfit[type.key]; })
    .map(function(type) {
      const part = outfit[type.key];
      return escapeHtml(type.label) + " ID " + escapeHtml(part.id) +
        (part.description ? " · " + escapeHtml(part.description) : "");
    })
    .join("<br>");
}

function applyOutfitSelection(outfit) {
  if (!outfit || !WARDROBE_TYPES.some(function(type){ return outfit[type.key]; })) return false;

  const targetGender = outfit.gender === "male" ? "male" : "female";
  switchGender(targetGender, false);

  WARDROBE_TYPES.forEach(function(type) {
    const list = catalog[type.key] || [];
    const part = outfit[type.key];
    const idxKey = indexKey(type.key);
    const texKey = textureKey(type.key);

    if (!part || !list.length) {
      state[idxKey] = PLACEHOLDER_INDEX;
      state[texKey] = 0;
      return;
    }

    let idx = list.findIndex(function(item){ return String(item.id) === String(part.id); });
    if (idx < 0) {
      const savedIndex = Number(outfit[idxKey]);
      idx = Number.isInteger(savedIndex) && savedIndex >= 0
        ? Math.min(savedIndex, Math.max(0, list.length - 1))
        : PLACEHOLDER_INDEX;
    }
    state[idxKey] = idx;
    state[texKey] = idx === PLACEHOLDER_INDEX ? 0 : Math.max(0, Number(part.texture) || 0);
  });

  render();
  return WARDROBE_TYPES.some(function(type){ return current(type.key); });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function renderSavedOutfits() {
  const list = readSavedOutfits();
  const box = document.getElementById("savedList");
  const count = document.getElementById("savedCount");
  count.textContent = list.length + (list.length === 1 ? " gespeichert" : " gespeichert");

  if (!list.length) {
    box.innerHTML = '<div class="savedEmpty">Noch kein Outfit gespeichert.</div>';
    return;
  }

  box.innerHTML = "";
  [...list].reverse().forEach(outfit => {
    const item = document.createElement("div");
    item.className = "savedItem";
    item.innerHTML = `
      <div class="savedItemTop">
        <div>
          <div class="savedName"><span class="genderTag">${(outfit.gender || "female") === "male" ? "HERREN" : "DAMEN"}</span>${escapeHtml(outfit.name || "Unbenanntes Outfit")}</div>
          <div class="savedMeta">${outfitPartsHtml(outfit)}</div>
        </div>
        <div class="savedButtons">
          <button type="button" data-load="${outfit.id}">Laden</button>
          <button type="button" class="delete" data-delete="${outfit.id}">Löschen</button>
        </div>
      </div>
      <div class="icCode">${escapeHtml(icText(outfit))}</div>
    `;
    box.appendChild(item);
  });

  box.querySelectorAll("[data-load]").forEach(btn => {
    btn.addEventListener("click", () => loadNamedOutfit(Number(btn.dataset.load)));
  });

  box.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteNamedOutfit(Number(btn.dataset.delete)));
  });
}

function saveNamedOutfit() {
  const input = document.getElementById("outfitName");
  const name = input.value.trim() || ("Outfit " + (readSavedOutfits().length + 1));
  const snapshot = currentOutfitSnapshot(name);

  if (!snapshot) {
    status.textContent = activeGender === "male"
      ? "Für Herren sind aktuell noch keine Kleidungsdaten hinterlegt."
      : "Bitte mindestens ein Kleidungsstück auswählen.";
    return;
  }

  const list = readSavedOutfits();
  list.push(snapshot);
  writeSavedOutfits(list);
  input.value = "";
  renderSavedOutfits();
  resetSelectionState();
  render();
  status.textContent = 'Look "' + name + '" gespeichert. Neue Auswahl startet leer.';
}

function loadNamedOutfit(id) {
  const outfit = readSavedOutfits().find(function(x){ return x.id === id; });
  if (!outfit) return;
  if (!applyOutfitSelection(outfit)) {
    status.textContent = "Dieses gespeicherte Outfit ist unvollständig.";
    return;
  }
  status.textContent = 'Look "' + (outfit.name || "Unbenannt") + '" geladen.';
}

function deleteNamedOutfit(id) {
  const list = readSavedOutfits().filter(x => x.id !== id);
  writeSavedOutfits(list);
  renderSavedOutfits();
  status.textContent = "Gespeichertes Outfit gelöscht.";
}

function exportOutfits() {
  const list = readSavedOutfits();
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    outfits: list
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gta-kleiderkatalog-outfits.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  status.textContent = "Outfit-Speicher als JSON gesichert.";
}

async function importOutfits(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const incoming = Array.isArray(data) ? data : data.outfits;
    if (!Array.isArray(incoming)) throw new Error("Ungültiges Format");

    const cleaned = incoming.filter(function(x) {
      return x && WARDROBE_TYPES.some(function(type){ return x[type.key]; });
    }).map(x => ({
      ...x,
      id: Number(x.id) || (Date.now() + Math.floor(Math.random() * 100000))
    }));

    writeSavedOutfits(cleaned);
    renderSavedOutfits();
    status.textContent = cleaned.length + " Outfit(s) importiert.";
  } catch (e) {
    status.textContent = "Import fehlgeschlagen: ungültige Sicherungsdatei.";
  }
}

document.getElementById("saveNamedBtn").addEventListener("click", saveNamedOutfit);
document.getElementById("outfitName").addEventListener("keydown", e => {
  if (e.key === "Enter") saveNamedOutfit();
});
document.getElementById("exportBtn").addEventListener("click", exportOutfits);
document.getElementById("importFile").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0];
  if (file) importOutfits(file);
  e.target.value = "";
});


const FULL_BACKUP_VERSION = 2;
const SNAPSHOT_KEY = "gtaWardrobeEmergencySnapshotV2";

function collectWardrobeStorage() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("gtaWardrobe") && key !== SNAPSHOT_KEY) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

function createEmergencySnapshot(reason = "auto") {
  try {
    const snapshot = {
      format: "GTA_WARDROBE_EMERGENCY_SNAPSHOT",
      version: FULL_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      reason,
      activeGender,
      state: JSON.parse(JSON.stringify(state)),
      storage: collectWardrobeStorage()
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    const el = document.getElementById("backupState");
    if (el) el.textContent = "AUTO-GESICHERT";
  } catch (e) {
    const el = document.getElementById("backupState");
    if (el) el.textContent = "AUTO-SICHERUNG FEHLER";
  }
}

function makeFullBackupObject() {
  return {
    format: "GTA_WARDROBE_FULL_BACKUP",
    version: FULL_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    app: "Wardrobe Archive",
    activeGender,
    state: JSON.parse(JSON.stringify(state)),
    storage: collectWardrobeStorage()
  };
}

function downloadFullBackup() {
  try {
    createEmergencySnapshot("before_manual_backup");
    const backup = makeFullBackupObject();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Wardrobe-Backup-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    document.getElementById("backupState").textContent = "DATEI ERSTELLT";
    document.getElementById("backupInfo").textContent =
      "Sicherung erstellt: " + new Date().toLocaleString("de-DE") +
      ". Bewahre die JSON-Datei außerhalb des Wardrobe-Ordners auf.";
    status.textContent = "Vollständige Sicherung wurde erstellt.";
  } catch (e) {
    document.getElementById("backupState").textContent = "FEHLER";
    status.textContent = "Sicherung konnte nicht erstellt werden.";
  }
}

function validateBackup(data) {
  if (!data || typeof data !== "object") return false;
  if (data.format !== "GTA_WARDROBE_FULL_BACKUP" &&
      data.format !== "GTA_WARDROBE_EMERGENCY_SNAPSHOT") return false;
  if (!data.storage || typeof data.storage !== "object") return false;
  return true;
}

function applyBackup(data, sourceLabel = "Sicherung") {
  if (!validateBackup(data)) {
    throw new Error("Ungültiges Sicherungsformat");
  }

  createEmergencySnapshot("before_restore");

  // Only restore Wardrobe-owned keys; unrelated browser storage remains untouched.
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith("gtaWardrobe") && key !== SNAPSHOT_KEY) {
      localStorage.removeItem(key);
    }
  }

  Object.entries(data.storage).forEach(([key, value]) => {
    if (key.startsWith("gtaWardrobe") && key !== SNAPSHOT_KEY) {
      localStorage.setItem(key, String(value));
    }
  });

  const restoredGender = data.activeGender === "male" ? "male" : "female";
  switchGender(restoredGender, false);

  if (data.state && typeof data.state === "object") {
    WARDROBE_TYPES.forEach(function(type) {
      state[indexKey(type.key)] = Math.max(0, Number(data.state[indexKey(type.key)]) || 0);
      state[textureKey(type.key)] = Math.max(0, Number(data.state[textureKey(type.key)]) || 0);
    });
  }

  clampSelectionState();

  render();
  renderSavedOutfits();

  document.getElementById("backupState").textContent = "WIEDERHERGESTELLT";
  document.getElementById("backupInfo").textContent =
    sourceLabel + " erfolgreich geladen · " + new Date().toLocaleString("de-DE");
  status.textContent = "Fortschritt erfolgreich wiederhergestellt.";
}

async function restoreFromBackupFile(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!validateBackup(data)) {
      throw new Error("Ungültige Datei");
    }

    const created = data.createdAt
      ? new Date(data.createdAt).toLocaleString("de-DE")
      : "unbekannt";

    const ok = confirm(
      "Sicherung vom " + created + " wiederherstellen?\n\n" +
      "Der aktuelle Wardrobe-Stand wird vorher automatisch als Notfallsicherung gespeichert."
    );
    if (!ok) {
      status.textContent = "Wiederherstellung abgebrochen.";
      return;
    }

    applyBackup(data, "PC-Sicherung");
  } catch (e) {
    document.getElementById("backupState").textContent = "DATEI UNGÜLTIG";
    status.textContent = "Diese Datei ist keine gültige Wardrobe-Sicherung.";
  }
}

function restoreEmergencySnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) {
      status.textContent = "Noch keine interne Notfallsicherung vorhanden.";
      return;
    }

    const data = JSON.parse(raw);
    if (!validateBackup(data)) throw new Error("Ungültiger Snapshot");

    const created = data.createdAt
      ? new Date(data.createdAt).toLocaleString("de-DE")
      : "unbekannt";

    const ok = confirm(
      "Internen Wiederherstellungspunkt vom " + created + " laden?\n\n" +
      "Nutze dies nur, wenn nach einer Änderung etwas schiefgelaufen ist."
    );
    if (!ok) return;

    applyBackup(data, "Interne Notfallsicherung");
  } catch (e) {
    status.textContent = "Interne Notfallsicherung konnte nicht gelesen werden.";
  }
}

document.getElementById("fullBackupBtn").addEventListener("click", downloadFullBackup);
document.getElementById("restoreBackupFile").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0];
  if (file) restoreFromBackupFile(file);
  e.target.value = "";
});
document.getElementById("restoreSnapshotBtn").addEventListener("click", restoreEmergencySnapshot);

// Automatic emergency snapshots before/after important local changes.
const originalWriteSavedOutfits = writeSavedOutfits;
writeSavedOutfits = function(list) {
  createEmergencySnapshot("before_outfit_change");
  originalWriteSavedOutfits(list);
  createEmergencySnapshot("after_outfit_change");
};

window.addEventListener("beforeunload", () => {
  try { createEmergencySnapshot("page_close"); } catch (e) {}
});


render();
renderSavedOutfits();

catalogReady.then(function() {
  switchGender("female", false);
  updateSourceDataStatus();
  status.textContent = "Katalog geladen.";
}).catch(function(error) {
  console.error("Wardrobe-Katalog konnte nicht geladen werden:", error);
  const sourceStatus = document.getElementById("sourceDataStatus");
  if (sourceStatus) sourceStatus.textContent = "Katalog konnte nicht geladen werden";
  status.textContent = "Katalogdaten konnten nicht geladen werden. Bitte Seite neu laden.";
});

window.WardrobeBridge = {
  snapshot: function(name) {
    return currentOutfitSnapshot(name);
  },
  localOutfits: function() {
    return readSavedOutfits();
  },
  load: function(outfit) {
    if (!applyOutfitSelection(outfit)) return false;
    status.textContent = 'Look "' + (outfit.name || "Unbenannt") + '" als Vorlage geladen.';
    window.scrollTo({top: document.querySelector(".catalog").offsetTop, behavior:"smooth"});
    return true;
  },
  message: function(text) {
    status.textContent = String(text || "");
  },
  localStorageDump: function() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("gtaWardrobe")) data[key] = localStorage.getItem(key);
    }
    return data;
  },
  restoreLocalStorage: function(data, allowedKeys) {
    if (!data || typeof data !== "object" || !Array.isArray(allowedKeys)) return true;
    const allowed = new Set(allowedKeys.map(String));
    let restored = true;
    Object.entries(data).forEach(function(entry) {
      const key = entry[0], value = entry[1];
      if (!key.startsWith("gtaWardrobe") || !allowed.has(key)) return;
      try {
        localStorage.setItem(key, String(value));
      } catch (e) {
        restored = false;
      }
    });
    return restored;
  }
};


(async function initWardrobeCloud() {
  const [
    firebaseAppModule,
    firebaseAuthModule,
    firebaseFirestoreModule
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js")
  ]);

  const { initializeApp } = firebaseAppModule;
  const {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
  } = firebaseAuthModule;
  const {
    getFirestore,
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    writeBatch,
    runTransaction
  } = firebaseFirestoreModule;

const firebaseConfig = {
    apiKey: "AIzaSyAxZqZ5SqvdIukMi6-Y6FHXSyY_d-mx1Zg",
    authDomain: "gta-wardrobe.firebaseapp.com",
    projectId: "gta-wardrobe",
    storageBucket: "gta-wardrobe.firebasestorage.app",
    messagingSenderId: "1030755625903",
    appId: "1:1030755625903:web:2fa213e5a2c1ad093e9d5a"
  };

  const LOGIN_EMAILS = Object.freeze({
    tim: "tim@wardrobe.invalid",
    ray: "ray@wardrobe.invalid",
    andy: "andy@wardrobe.invalid",
    kata: "kata@wardrobe.invalid"
  });

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const bridge = window.WardrobeBridge;

  const gate = document.getElementById("authGate");
  const form = document.getElementById("loginForm");
  const userSelect = document.getElementById("loginUser");
  const loginUsernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  const loginButton = document.getElementById("loginButton");
  const authMessage = document.getElementById("authMessage");
  const userSession = document.getElementById("userSession");
  const sessionUserName = document.getElementById("sessionUserName");
  const sessionUserRole = document.getElementById("sessionUserRole");
  const logoutBtn = document.getElementById("logoutBtn");
  const accountSecurityBtn = document.getElementById("accountSecurityBtn");
  const passwordChangeUsernameInput = document.getElementById("passwordChangeUsername");

  const cloudSummary = document.getElementById("cloudSummary");
  const cloudTabBody = document.getElementById("cloudTabBody");
  const cloudSaveBtn = document.getElementById("cloudSaveBtn");
  const cloudOutfitName = document.getElementById("cloudOutfitName");
  const cloudRefreshBtn = document.getElementById("cloudRefreshBtn");
  const cloudExportBtn = document.getElementById("cloudExportBtn");
  const cloudImportFile = document.getElementById("cloudImportFile");
  const cloudMigration = document.getElementById("cloudMigration");
  const cloudFullBackupBtn = document.getElementById("cloudFullBackupBtn");
  const cloudRestoreFile = document.getElementById("cloudRestoreFile");

  let currentProfile = null;
  let currentTab = "mine";
  let allowedUsers = [];
  let allOutfits = [];
  let incomingSuggestions = [];
  let sentSuggestions = [];
  let suggestionTarget = null;
  let suggestionSource = null;
  let authRevision = 0;
  let activeOutfitWrite = "";
  let outfitWriteSequence = 0;

  const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
  const MAX_BACKUP_BYTES = 6 * 1024 * 1024;
  const MAX_ATOMIC_RESTORE_WRITES = 450;

  function safeNonNegativeInt(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
  }

  function safeGarmentId(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
    const text = String(value == null ? "" : value).trim().slice(0,120);
    return text || "0";
  }

  function captureSession() {
    const user = auth.currentUser;
    if (!currentProfile || !user || currentProfile.uid !== user.uid) return null;
    return {
      uid: currentProfile.uid,
      name: currentProfile.name,
      revision: authRevision,
      user: user
    };
  }

  function sessionIsCurrent(session) {
    return Boolean(
      session &&
      session.revision === authRevision &&
      currentProfile &&
      currentProfile.uid === session.uid &&
      auth.currentUser &&
      auth.currentUser.uid === session.uid
    );
  }

  function beginOutfitWrite(operation) {
    if (activeOutfitWrite) {
      bridge.message("Eine andere Cloud-Aktion läuft bereits. Bitte schließe sie zuerst ab.");
      return "";
    }
    const token = authRevision + ":" + (++outfitWriteSequence) + ":" + operation;
    activeOutfitWrite = token;
    return token;
  }

  function endOutfitWrite(token) {
    if (activeOutfitWrite === token) activeOutfitWrite = "";
  }

  function setLoginBusy(busy) {
    loginButton.disabled = Boolean(busy);
    loginButton.textContent = busy ? "PRÜFE ZUGRIFF …" : "ANMELDEN";
  }

  function syncLoginUsernameHint() {
    if (loginUsernameInput) loginUsernameInput.value = userSelect.value || "";
  }

  userSelect.addEventListener("change", syncLoginUsernameHint);
  syncLoginUsernameHint();

  function readMigrationMarker(key) {
    if (!key) return false;
    try {
      return localStorage.getItem(key) === "1";
    } catch (e) {
      return false;
    }
  }

  function writeMigrationMarker(key) {
    if (!key) return false;
    try {
      localStorage.setItem(key,"1");
      return true;
    } catch (e) {
      return false;
    }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function(c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
    });
  }

  function readableDate(value) {
    try {
      if (!value) return "gerade eben";
      const d = typeof value.toDate === "function" ? value.toDate() : new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("de-DE");
    } catch (e) {
      return "";
    }
  }

  function sanitizeOutfit(raw, forcedName) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

    const schemaVersion = raw.schemaVersion == null ? 1 : Number(raw.schemaVersion);
    if (schemaVersion !== 1 && schemaVersion !== 2) return null;

    const selectedTypes = WARDROBE_TYPES.filter(function(type) {
      const part = raw[type.key];
      return part && typeof part === "object" && !Array.isArray(part) && part.id != null;
    });

    if (schemaVersion === 1) {
      if (!raw.torso || !raw.pants || raw.torso.id == null || raw.pants.id == null) return null;
    } else if (!selectedTypes.length) {
      return null;
    }

    const name = String(forcedName || raw.name || "Unbenannter Look").trim().slice(0,60) || "Unbenannter Look";
    const savedAt = typeof raw.savedAt === "string" && raw.savedAt.trim()
      ? raw.savedAt.trim().slice(0,80)
      : new Date().toISOString();

    const clean = {
      schemaVersion: schemaVersion,
      name: name,
      gender: raw.gender === "male" ? "male" : "female",
      savedAt: savedAt,
      archived: Boolean(raw.archived)
    };

    selectedTypes.forEach(function(type) {
      const part = raw[type.key];
      clean[type.key + "Index"] = safeNonNegativeInt(raw[type.key + "Index"]);
      clean[type.key] = {
        id: safeGarmentId(part.id),
        description: String(part.description || "").slice(0,220),
        texture: safeNonNegativeInt(part.texture)
      };
    });

    return clean;
  }

  function validIncomingGarment(part) {
    if (!part || typeof part !== "object" || Array.isArray(part)) return false;

    const id = part.id;
    const validId =
      (typeof id === "number" && Number.isFinite(id) && Number.isInteger(id) && id >= 0) ||
      (typeof id === "string" && id.trim().length > 0 && id.trim().length <= 120);

    return validId
      && typeof part.description === "string"
      && part.description.length <= 220
      && typeof part.texture === "number"
      && Number.isFinite(part.texture)
      && Number.isInteger(part.texture)
      && part.texture >= 0;
  }

  function validIncomingOutfit(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;

    const schemaVersion = raw.schemaVersion == null ? 1 : raw.schemaVersion;
    if (schemaVersion !== 1 && schemaVersion !== 2) return false;
    if (typeof raw.name !== "string" || !raw.name.trim() || raw.name.trim().length > 60) return false;
    if (raw.gender !== "female" && raw.gender !== "male") return false;
    if (typeof raw.savedAt !== "string" || !raw.savedAt.trim() || raw.savedAt.trim().length > 80) return false;
    if (raw.archived != null && typeof raw.archived !== "boolean") return false;

    const validParts = WARDROBE_TYPES.every(function(type) {
      const key = type.key;
      const hasPart = raw[key] != null;
      const hasIndex = raw[key + "Index"] != null;
      if (hasPart !== hasIndex) return false;
      if (!hasPart) return true;

      const index = raw[key + "Index"];
      return typeof index === "number"
        && Number.isFinite(index)
        && Number.isInteger(index)
        && index >= 0
        && validIncomingGarment(raw[key]);
    });
    if (!validParts) return false;

    if (schemaVersion === 1) {
      return raw.torso != null && raw.pants != null;
    }
    return WARDROBE_TYPES.some(function(type){ return raw[type.key] != null; });
  }

  function outfitFingerprint(raw) {
    const outfit = sanitizeOutfit(raw, raw && raw.name);
    if (!outfit) return "";
    const parts = [outfit.name, outfit.gender];
    WARDROBE_TYPES.forEach(function(type) {
      const part = outfit[type.key];
      parts.push(part ? String(part.id) : null);
      parts.push(part ? part.texture : null);
    });
    return JSON.stringify(parts);
  }

  function canonicalUserName(value) {
    const name = String(value || "Benutzer").trim() || "Benutzer";
    return name.toLowerCase() === "kata" ? "Kata" : name;
  }

  function ownerName(uid) {
    const user = allowedUsers.find(function(x){ return x.uid === uid; });
    return user ? user.name : "Benutzer";
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("open");
    el.setAttribute("aria-hidden","false");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("open");
    el.setAttribute("aria-hidden","true");
  }

  document.querySelectorAll("[data-close-modal]").forEach(function(btn) {
    btn.addEventListener("click", function(){ closeModal(btn.dataset.closeModal); });
  });
  document.querySelectorAll(".cloudModalWrap").forEach(function(wrap) {
    wrap.addEventListener("click", function(e){ if (e.target === wrap) closeModal(wrap.id); });
  });
  document.addEventListener("keydown", function(e) {
    if (e.key !== "Escape") return;
    const openModals = document.querySelectorAll(".cloudModalWrap.open");
    const topModal = openModals[openModals.length - 1];
    if (topModal) closeModal(topModal.id);
  });

  function lockApp(message) {
    document.body.classList.add("auth-locked");
    gate.style.display = "flex";
    userSession.classList.remove("active");
    sessionUserName.textContent = "";
    sessionUserRole.textContent = "";
    suggestionTarget = null;
    document.querySelectorAll(".cloudModalWrap.open").forEach(function(wrap){ closeModal(wrap.id); });
    cloudSummary.textContent = "Anmeldung erforderlich.";
    cloudTabBody.innerHTML = '<div class="cloudEmpty">Bitte zuerst anmelden.</div>';
    authMessage.textContent = message || "";
  }

  function unlockApp(profile) {
    document.body.classList.remove("auth-locked");
    gate.style.display = "none";
    authMessage.textContent = "";
    passwordInput.value = "";
    sessionUserName.textContent = profile.name || "Benutzer";
    sessionUserRole.textContent = profile.role === "admin" ? "Administrator" : "Benutzer";
    userSession.classList.add("active");
  }

  async function approvedProfile(user) {
    if (!user) return null;
    const snap = await getDoc(doc(db, "allowedUsers", user.uid));
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    return {
      uid: user.uid,
      name: canonicalUserName(typeof data.name === "string" ? data.name : "Benutzer"),
      role: typeof data.role === "string" ? data.role : "user"
    };
  }

  async function fetchAllowedUsers() {
    const snap = await getDocs(collection(db, "allowedUsers"));
    return snap.docs.map(function(d) {
      const data = d.data() || {};
      return {uid:d.id,name:canonicalUserName(data.name),role:String(data.role || "user")};
    }).sort(function(a,b){ return a.name.localeCompare(b.name,"de"); });
  }

  async function fetchVisibleOutfits(users, viewerUid) {
    const groups = await Promise.all(users.map(async function(user) {
      const ref = collection(db, "users", user.uid, "outfits");
      const snap = user.uid === viewerUid
        ? await getDocs(ref)
        : await getDocs(query(ref, where("archived","==",false)));
      return snap.docs.map(function(d) {
        return Object.assign({}, d.data(), {_docId:d.id,_ownerUid:user.uid,_ownerName:user.name});
      });
    }));
    return groups.flat();
  }

  async function fetchSuggestions(uid) {
    const incomingSnap = await getDocs(query(collection(db,"suggestions"), where("toUid","==",uid)));
    const sentSnap = await getDocs(query(collection(db,"suggestions"), where("fromUid","==",uid)));
    return {
      incoming: incomingSnap.docs.map(function(d){ return Object.assign({},d.data(),{_id:d.id}); }),
      sent: sentSnap.docs.map(function(d){ return Object.assign({},d.data(),{_id:d.id}); })
    };
  }

  function sortNewest(list) {
    return list.slice().sort(function(a,b) {
      const ad = a.createdAt && typeof a.createdAt.toMillis === "function" ? a.createdAt.toMillis() : Date.parse(a.savedAt || 0) || 0;
      const bd = b.createdAt && typeof b.createdAt.toMillis === "function" ? b.createdAt.toMillis() : Date.parse(b.savedAt || 0) || 0;
      return bd - ad;
    });
  }

  function outfitMeta(outfit) {
    const lines = WARDROBE_TYPES
      .filter(function(type){ return outfit && outfit[type.key]; })
      .map(function(type) {
        const part = outfit[type.key];
        return esc(type.label) + " ID " + esc(part.id) + " · Variante " + esc(part.texture);
      });
    return lines.join("<br>");
  }

  function outfitCard(outfit, mode) {
    const key = outfit._ownerUid + ":" + outfit._docId;
    let actions = '<button class="cloudBtn" data-action="load" data-key="' + esc(key) + '">ANSEHEN / LADEN</button>';
    if (mode === "mine") {
      actions += '<button class="cloudBtn" data-action="rename" data-key="' + esc(key) + '">UMBENENNEN</button>';
      actions += '<button class="cloudBtn" data-action="archive" data-key="' + esc(key) + '">ARCHIVIEREN</button>';
      actions += '<button class="cloudBtn" data-action="suggest" data-key="' + esc(key) + '">VORSCHLAGEN</button>';
      actions += '<button class="cloudBtn danger" data-action="delete" data-key="' + esc(key) + '">LÖSCHEN</button>';
    } else if (mode === "others") {
      actions += '<button class="cloudBtn" data-action="suggest" data-key="' + esc(key) + '">JEMANDEM VORSCHLAGEN</button>';
    } else if (mode === "archive") {
      actions += '<button class="cloudBtn" data-action="unarchive" data-key="' + esc(key) + '">WIEDER AKTIVIEREN</button>';
      actions += '<button class="cloudBtn danger" data-action="delete" data-key="' + esc(key) + '">LÖSCHEN</button>';
    }
    return '<article class="cloudCard">' +
      '<div class="cloudCardTop"><div><div class="cloudCardOwner">' + esc(outfit._ownerName || ownerName(outfit._ownerUid)) + '</div>' +
      '<div class="cloudCardName">' + esc(outfit.name || "Unbenannter Look") + '</div>' +
      '<div class="cloudCardMeta">' + outfitMeta(outfit) + '<br>' + esc(readableDate(outfit.updatedAt || outfit.createdAt || outfit.savedAt)) + '</div></div>' +
      '<div class="cloudCardActions">' + actions + '</div></div></article>';
  }

  function statusLabel(status) {
    return ({pending:"Offen",accepted:"Angenommen",declined:"Abgelehnt",withdrawn:"Zurückgezogen"})[status] || status || "Unbekannt";
  }

  function suggestionCard(item, direction) {
    const otherUid = direction === "incoming" ? item.fromUid : item.toUid;
    const other = ownerName(otherUid);
    const outfit = item.outfit || {};
    let actions = '<button class="cloudBtn" data-suggestion-action="load" data-id="' + esc(item._id) + '" data-direction="' + direction + '">LOOK LADEN</button>';
    if (direction === "incoming" && item.status === "pending") {
      actions += '<button class="cloudBtn primary" data-suggestion-action="accept" data-id="' + esc(item._id) + '">ÜBERNEHMEN</button>';
      actions += '<button class="cloudBtn" data-suggestion-action="decline" data-id="' + esc(item._id) + '">ABLEHNEN</button>';
    }
    if (direction === "sent" && item.status === "pending") {
      actions += '<button class="cloudBtn danger" data-suggestion-action="withdraw" data-id="' + esc(item._id) + '">ZURÜCKZIEHEN</button>';
    }
    return '<article class="cloudCard">' +
      '<div class="cloudCardTop"><div><div class="cloudCardOwner">' + (direction === "incoming" ? "Von " : "An ") + esc(other) + '</div>' +
      '<div class="cloudCardName">' + esc(outfit.name || "Outfit-Vorschlag") + '</div>' +
      '<div class="cloudCardMeta">' + (outfit.torso && outfit.pants ? outfitMeta(outfit) : "") +
      (item.message ? '<br><br>„' + esc(item.message) + '“' : '') +
      '<br>' + esc(readableDate(item.createdAt)) + '</div><span class="cloudStatus">' + esc(statusLabel(item.status)) + '</span></div>' +
      '<div class="cloudCardActions">' + actions + '</div></div></article>';
  }

  function renderTabs() {
    document.querySelectorAll("[data-cloud-tab]").forEach(function(btn) {
      btn.classList.toggle("active", btn.dataset.cloudTab === currentTab);
    });

    if (!currentProfile) {
      cloudTabBody.innerHTML = '<div class="cloudEmpty">Bitte zuerst anmelden.</div>';
      return;
    }

    const uid = currentProfile.uid;
    let html = "";

    if (currentTab === "mine") {
      const list = sortNewest(allOutfits.filter(function(x){ return x._ownerUid === uid && !x.archived; }));
      html = list.length ? list.map(function(x){ return outfitCard(x,"mine"); }).join("") :
        '<div class="cloudEmpty">Noch kein Cloud-Look gespeichert. Stelle oben etwas zusammen, gib dem Look einen Namen und klicke auf „Look speichern“.</div>';
    } else if (currentTab === "others") {
      const list = sortNewest(allOutfits.filter(function(x){ return x._ownerUid !== uid && !x.archived; }));
      html = list.length ? list.map(function(x){ return outfitCard(x,"others"); }).join("") :
        '<div class="cloudEmpty">Die anderen haben noch keine sichtbaren Looks gespeichert.</div>';
    } else if (currentTab === "incoming") {
      const list = sortNewest(incomingSuggestions);
      html = list.length ? list.map(function(x){ return suggestionCard(x,"incoming"); }).join("") :
        '<div class="cloudEmpty">Aktuell gibt es keine Outfit-Vorschläge für dich.</div>';
    } else if (currentTab === "sent") {
      const list = sortNewest(sentSuggestions);
      html = list.length ? list.map(function(x){ return suggestionCard(x,"sent"); }).join("") :
        '<div class="cloudEmpty">Du hast noch keine Outfit-Vorschläge verschickt.</div>';
    } else if (currentTab === "archive") {
      const list = sortNewest(allOutfits.filter(function(x){ return x._ownerUid === uid && x.archived; }));
      html = list.length ? list.map(function(x){ return outfitCard(x,"archive"); }).join("") :
        '<div class="cloudEmpty">Dein Archiv ist leer. Archivierte Looks verschwinden aus der normalen Übersicht, bleiben aber gespeichert.</div>';
    }

    cloudTabBody.innerHTML = html;
  }

  function updateSummary() {
    if (!currentProfile) return;
    const uid = currentProfile.uid;
    const own = allOutfits.filter(function(x){ return x._ownerUid === uid && !x.archived; }).length;
    const others = allOutfits.filter(function(x){ return x._ownerUid !== uid && !x.archived; }).length;
    const incoming = incomingSuggestions.filter(function(x){ return x.status === "pending"; }).length;
    cloudSummary.innerHTML = "<strong>" + esc(currentProfile.name) + "</strong><br>" +
      own + " eigene Looks<br>" + others + " Looks der anderen<br>" + incoming + " neue Vorschläge";
  }

  function updateMigrationBox() {
    const rawLocal = bridge && bridge.localOutfits ? bridge.localOutfits() : [];
    const local = rawLocal
      .filter(validIncomingOutfit)
      .map(function(x){ return sanitizeOutfit(x,x && x.name); })
      .filter(Boolean);
    const invalidCount = rawLocal.length - local.length;
    const key = currentProfile ? "gtaWardrobeCloudMigrated_" + currentProfile.uid : "";
    const invalidNote = invalidCount
      ? " " + invalidCount + " beschädigte lokale " + (invalidCount === 1 ? "Datei wurde" : "Dateien wurden") + " ignoriert."
      : "";

    if (!currentProfile || !local.length) {
      cloudMigration.textContent = invalidCount
        ? "Es wurden keine gültigen älteren lokalen Looks gefunden." + invalidNote
        : "Auf diesem Gerät wurden keine älteren lokalen Looks gefunden.";
      return;
    }

    const existing = new Set(
      allOutfits
        .filter(function(x){ return x._ownerUid === currentProfile.uid; })
        .map(outfitFingerprint)
        .filter(Boolean)
    );
    const pending = local.filter(function(outfit){ return !existing.has(outfitFingerprint(outfit)); });

    if (!pending.length) {
      writeMigrationMarker(key);
      cloudMigration.textContent =
        "Die vorhandenen lokalen Looks sind bereits in deinem Cloud-Konto berücksichtigt. Die lokalen Kopien bleiben erhalten." +
        invalidNote;
      return;
    }

    const done = readMigrationMarker(key);
    cloudMigration.innerHTML =
      "<strong>" + pending.length + " noch nicht übernommene lokale Looks gefunden.</strong> " +
      (done ? "Seit der letzten Übernahme sind weitere lokale Looks hinzugekommen. " :
      "Du kannst sie in dein persönliches Cloud-Konto übernehmen. ") +
      'Die lokalen Kopien bleiben erhalten. <button class="cloudBtn" type="button" id="migrateLocalBtn">JETZT ÜBERNEHMEN</button>' +
      esc(invalidNote);
    const btn = document.getElementById("migrateLocalBtn");
    if (btn) btn.addEventListener("click", migrateLocalLooks);
  }

  async function refreshCloud(showMessage, revision) {
    if (!currentProfile) return;
    const expectedRevision = revision == null ? authRevision : revision;
    const uid = currentProfile.uid;
    if (showMessage) bridge.message("Cloud-Daten werden aktualisiert …");

    try {
      const users = await fetchAllowedUsers();
      const results = await Promise.all([fetchVisibleOutfits(users,uid), fetchSuggestions(uid)]);

      if (
        expectedRevision !== authRevision ||
        !currentProfile ||
        currentProfile.uid !== uid ||
        !auth.currentUser ||
        auth.currentUser.uid !== uid
      ) return;

      allowedUsers = users;
      allOutfits = results[0];
      incomingSuggestions = results[1].incoming;
      sentSuggestions = results[1].sent;
      updateSummary();
      renderTabs();
      updateMigrationBox();
      if (showMessage) bridge.message("Cloud-Daten sind aktuell.");
    } catch (e) {
      if (expectedRevision !== authRevision || !currentProfile || currentProfile.uid !== uid) return;
      console.error("Cloud refresh failed", e);
      cloudTabBody.innerHTML = '<div class="cloudEmpty">Cloud-Daten konnten nicht geladen werden. Prüfe die Firestore-Regeln und versuche es erneut.</div>';
      cloudSummary.textContent = "Cloud-Verbindung nicht verfügbar.";
      bridge.message("Cloud-Daten konnten nicht geladen werden.");
    }
  }

  async function saveCurrentLook() {
    const session = captureSession();
    if (!session) return;

    const rawName = cloudOutfitName.value.trim();
    const name = rawName || ("Outfit " + (allOutfits.filter(function(x){ return x._ownerUid === session.uid; }).length + 1));
    const raw = bridge.snapshot(name);
    const outfit = sanitizeOutfit(raw,name);
    if (!outfit) {
      bridge.message("Bitte mindestens ein Kleidungsstück auswählen.");
      return;
    }

    const writeToken = beginOutfitWrite("save-current-look");
    if (!writeToken) return;

    cloudSaveBtn.disabled = true;
    try {
      await addDoc(collection(db,"users",session.uid,"outfits"), Object.assign({},outfit,{
        archived:false,
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      }));
      if (!sessionIsCurrent(session)) return;

      cloudOutfitName.value = "";
      resetSelectionState();
      render();
      currentTab = "mine";
      await refreshCloud(false,session.revision);
      if (!sessionIsCurrent(session)) return;
      bridge.message('Look "' + name + '" wurde gespeichert. Neue Auswahl startet leer.');
    } catch (e) {
      console.error(e);
      if (sessionIsCurrent(session)) bridge.message("Der Look konnte nicht gespeichert werden.");
    } finally {
      cloudSaveBtn.disabled = false;
      endOutfitWrite(writeToken);
    }
  }

  function findOutfitByKey(key) {
    const parts = String(key || "").split(":");
    return allOutfits.find(function(x){ return x._ownerUid === parts[0] && x._docId === parts.slice(1).join(":"); });
  }

  async function changeOwnOutfit(outfit, changes, message) {
    const session = captureSession();
    if (!session || !outfit || outfit._ownerUid !== session.uid) return;

    const writeToken = beginOutfitWrite("change-outfit:" + outfit._docId);
    if (!writeToken) return;

    try {
      await updateDoc(
        doc(db,"users",session.uid,"outfits",outfit._docId),
        Object.assign({},changes,{updatedAt:serverTimestamp()})
      );
      if (!sessionIsCurrent(session)) return;

      await refreshCloud(false,session.revision);
      if (!sessionIsCurrent(session)) return;
      bridge.message(message);
    } finally {
      endOutfitWrite(writeToken);
    }
  }

  function populateSuggestionModal(outfit) {
    suggestionTarget = sanitizeOutfit(outfit,outfit.name);
    suggestionSource = outfit && currentProfile && outfit._ownerUid === currentProfile.uid && outfit._docId
      ? { ownerUid: outfit._ownerUid, docId: outfit._docId }
      : null;
    const select = document.getElementById("suggestRecipient");
    select.innerHTML = allowedUsers.filter(function(u){ return u.uid !== currentProfile.uid; })
      .map(function(u){ return '<option value="' + esc(u.uid) + '">' + esc(u.name) + '</option>'; }).join("");
    document.getElementById("suggestMessage").value = "";
    document.getElementById("suggestMessageStatus").textContent = "";
    document.getElementById("suggestOutfitInfo").textContent =
      (suggestionTarget ? suggestionTarget.name : "Look") +
      (suggestionSource
        ? " · wird vorgeschlagen und danach aus „Meine Looks“ ins Archiv verschoben."
        : " · wird als unveränderliche Kopie verschickt.");
    openModal("suggestModal");
  }

  async function sendSuggestion() {
    const session = captureSession();
    const toUid = document.getElementById("suggestRecipient").value;
    const message = document.getElementById("suggestMessage").value.trim().slice(0,500);
    const statusBox = document.getElementById("suggestMessageStatus");
    const btn = document.getElementById("sendSuggestionBtn");
    const target = suggestionTarget ? sanitizeOutfit(suggestionTarget,suggestionTarget.name) : null;
    const sourceOutfit = suggestionSource ? Object.assign({},suggestionSource) : null;
    if (!session || !target || !toUid || toUid === session.uid) return;

    const targetFingerprint = outfitFingerprint(target);
    const duplicate = sentSuggestions.some(function(item) {
      return item.status === "pending"
        && item.toUid === toUid
        && outfitFingerprint(item.outfit) === targetFingerprint;
    });
    if (duplicate) {
      statusBox.textContent = "Dieser identische Vorschlag ist für den Empfänger bereits offen.";
      return;
    }

    btn.disabled = true;
    statusBox.textContent = "Vorschlag wird geprüft …";
    try {
      const freshSent = await getDocs(query(collection(db,"suggestions"), where("fromUid","==",session.uid)));
      if (!sessionIsCurrent(session)) return;

      const freshDuplicate = freshSent.docs.some(function(d) {
        const item = d.data() || {};
        return item.status === "pending"
          && item.toUid === toUid
          && outfitFingerprint(item.outfit) === targetFingerprint;
      });
      if (freshDuplicate) {
        statusBox.textContent = "Dieser identische Vorschlag ist für den Empfänger bereits offen.";
        return;
      }

      statusBox.textContent = "Vorschlag wird gesendet …";
      const suggestionRef = doc(collection(db,"suggestions"));
      const moveOwnLook = Boolean(
        sourceOutfit
        && sourceOutfit.ownerUid === session.uid
        && sourceOutfit.docId
      );

      await runTransaction(db, async function(transaction) {
        if (!sessionIsCurrent(session)) throw new Error("Sitzung wurde geändert");

        transaction.set(suggestionRef,{
          fromUid:session.uid,
          toUid:toUid,
          message:message,
          status:"pending",
          createdAt:serverTimestamp(),
          outfit:target
        });

        if (moveOwnLook) {
          transaction.update(
            doc(db,"users",session.uid,"outfits",sourceOutfit.docId),
            {archived:true,updatedAt:serverTimestamp()}
          );
        }
      });
      if (!sessionIsCurrent(session)) return;

      closeModal("suggestModal");
      suggestionTarget = null;
      suggestionSource = null;
      currentTab = "sent";
      await refreshCloud(false,session.revision);
      if (!sessionIsCurrent(session)) return;
      bridge.message(moveOwnLook
        ? "Outfit-Vorschlag wurde gesendet. Der Look ist nicht mehr unter „Meine Looks“ und bleibt unter „Von mir“ sichtbar."
        : "Outfit-Vorschlag wurde gesendet.");
    } catch (e) {
      console.error(e);
      if (sessionIsCurrent(session)) statusBox.textContent = "Der Vorschlag konnte nicht gesendet werden.";
    } finally {
      btn.disabled = false;
    }
  }

  function findSuggestion(id, direction) {
    const list = direction === "incoming" ? incomingSuggestions : sentSuggestions;
    return list.find(function(x){ return x._id === id; });
  }

  async function handleSuggestionAction(action,id,direction) {
    const session = captureSession();
    if (!session) return;

    const item = findSuggestion(id,direction);
    if (!item) return;
    if (action === "load") {
      bridge.load(Object.assign({},item.outfit,{name:item.outfit && item.outfit.name ? item.outfit.name : "Vorschlag"}));
      return;
    }

    const ref = doc(db,"suggestions",id);
    if (action === "accept" && direction === "incoming" && item.status === "pending") {
      const writeToken = beginOutfitWrite("accept-suggestion:" + id);
      if (!writeToken) return;

      try {
        const newRef = doc(collection(db,"users",session.uid,"outfits"));

        await runTransaction(db, async function(transaction) {
          const fresh = await transaction.get(ref);
          if (!fresh.exists()) throw new Error("Vorschlag nicht gefunden");

          const freshData = fresh.data() || {};
          if (
            freshData.toUid !== session.uid ||
            freshData.status !== "pending" ||
            !sessionIsCurrent(session)
          ) {
            throw new Error("Vorschlag nicht mehr offen");
          }

          const copy = sanitizeOutfit(
            freshData.outfit,
            (freshData.outfit && freshData.outfit.name ? freshData.outfit.name : "Vorschlag") +
              " · von " + ownerName(freshData.fromUid)
          );
          if (!copy) throw new Error("Ungültiger Vorschlag");

          transaction.set(
            newRef,
            Object.assign({},copy,{
              archived:false,
              createdAt:serverTimestamp(),
              updatedAt:serverTimestamp()
            })
          );
          transaction.update(ref,{status:"accepted"});
        });
        if (!sessionIsCurrent(session)) return;

        currentTab = "mine";
        await refreshCloud(false,session.revision);
        if (!sessionIsCurrent(session)) return;
        bridge.message("Vorschlag übernommen und als eigener Look gespeichert.");
      } finally {
        endOutfitWrite(writeToken);
      }
      return;
    }
    if (action === "decline" && direction === "incoming" && item.status === "pending") {
      if (!sessionIsCurrent(session)) return;
      await updateDoc(ref,{status:"declined"});
      if (!sessionIsCurrent(session)) return;
      await refreshCloud(false,session.revision);
      if (sessionIsCurrent(session)) bridge.message("Vorschlag abgelehnt.");
      return;
    }
    if (action === "withdraw" && direction === "sent" && item.status === "pending") {
      if (!sessionIsCurrent(session)) return;
      await updateDoc(ref,{status:"withdrawn"});
      if (!sessionIsCurrent(session)) return;
      await refreshCloud(false,session.revision);
      if (sessionIsCurrent(session)) bridge.message("Vorschlag zurückgezogen.");
    }
  }

  async function migrateLocalLooks() {
    const session = captureSession();
    if (!session) return;

    const rawLocal = bridge.localOutfits();
    const local = rawLocal
      .filter(validIncomingOutfit)
      .map(function(x){ return sanitizeOutfit(x,x && x.name); })
      .filter(Boolean);
    const invalidCount = rawLocal.length - local.length;
    if (!local.length) {
      if (invalidCount && sessionIsCurrent(session)) {
        bridge.message("Die lokalen Looks sind beschädigt und wurden nicht in die Cloud übernommen.");
      }
      return;
    }

    const writeToken = beginOutfitWrite("migrate-local-looks");
    if (!writeToken) return;

    try {
      const snap = await getDocs(collection(db,"users",session.uid,"outfits"));
      if (!sessionIsCurrent(session)) return;

      const existing = new Set(
        snap.docs
          .map(function(d){ return sanitizeOutfit(d.data(), d.data() && d.data().name); })
          .filter(Boolean)
          .map(outfitFingerprint)
      );
      const seen = new Set(existing);
      const pending = local.filter(function(outfit) {
        const key = outfitFingerprint(outfit);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (!pending.length) {
        writeMigrationMarker("gtaWardrobeCloudMigrated_" + session.uid);
        await refreshCloud(false,session.revision);
        if (sessionIsCurrent(session)) bridge.message("Alle lokalen Looks sind bereits in deinem Cloud-Konto vorhanden.");
        return;
      }

      if (!confirm(pending.length + " noch nicht übernommene lokale Looks in dein Cloud-Konto übernehmen?")) return;
      if (!sessionIsCurrent(session)) return;

      for (let offset = 0; offset < pending.length; offset += 400) {
        if (!sessionIsCurrent(session)) return;

        const batch = writeBatch(db);
        pending.slice(offset,offset + 400).forEach(function(outfit) {
          const ref = doc(collection(db,"users",session.uid,"outfits"));
          batch.set(ref,Object.assign({},outfit,{archived:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
        });
        await batch.commit();
        if (!sessionIsCurrent(session)) return;
      }

      writeMigrationMarker("gtaWardrobeCloudMigrated_" + session.uid);
      await refreshCloud(false,session.revision);
      if (sessionIsCurrent(session)) bridge.message(pending.length + " lokale Looks wurden in die Cloud übernommen.");
    } catch (e) {
      console.error(e);
      if (!sessionIsCurrent(session)) return;
      await refreshCloud(false,session.revision);
      if (sessionIsCurrent(session)) {
        bridge.message("Lokale Looks konnten nicht vollständig übernommen werden. Bereits übernommene Duplikate werden beim nächsten Versuch übersprungen.");
      }
    } finally {
      endOutfitWrite(writeToken);
    }
  }

  function downloadJson(filename,data) {
    const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportOwnLooks() {
    const session = captureSession();
    if (!session) return;

    try {
      const snap = await getDocs(collection(db,"users",session.uid,"outfits"));
      if (!sessionIsCurrent(session)) return;

      const own = snap.docs
        .map(function(d){ return sanitizeOutfit(d.data(), d.data() && d.data().name); })
        .filter(Boolean);

      downloadJson("wardrobe-" + session.name.toLowerCase() + "-looks.json",{
        format:"GTA_WARDROBE_CLOUD_OUTFITS",
        version:1,
        exportedAt:new Date().toISOString(),
        ownerUid:session.uid,
        owner:session.name,
        outfits:own
      });
      if (sessionIsCurrent(session)) bridge.message("Deine aktuellen Cloud-Looks wurden exportiert.");
    } catch (e) {
      console.error(e);
      if (sessionIsCurrent(session)) bridge.message("Deine Cloud-Looks konnten nicht exportiert werden.");
    }
  }

  async function importLooksFile(file) {
    const session = captureSession();
    if (!session) return;

    const writeToken = beginOutfitWrite("import-looks");
    if (!writeToken) return;

    try {
      if (!file || file.size > MAX_IMPORT_BYTES) throw new Error("Datei zu groß");
      const fileText = await file.text();
      if (!sessionIsCurrent(session)) return;

      const data = JSON.parse(fileText);
      const source = Array.isArray(data) ? data : (Array.isArray(data.outfits) ? data.outfits : data.cloudOutfits);
      if (!Array.isArray(source)) throw new Error("Format");
      if (!source.length) throw new Error("Leer");
      if (source.length > 400) throw new Error("Zu viele");
      if (source.some(function(x){ return !validIncomingOutfit(x); })) throw new Error("Ungültige Looks");

      const cleaned = source.map(function(x){ return sanitizeOutfit(x,x && x.name); }).filter(Boolean);
      if (cleaned.length !== source.length) throw new Error("Ungültige Looks");

      const currentSnap = await getDocs(collection(db,"users",session.uid,"outfits"));
      if (!sessionIsCurrent(session)) return;

      const seen = new Set(
        currentSnap.docs
          .map(function(d){ return sanitizeOutfit(d.data(), d.data() && d.data().name); })
          .filter(Boolean)
          .map(outfitFingerprint)
      );
      const pending = cleaned.filter(function(outfit) {
        const key = outfitFingerprint(outfit);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (!pending.length) {
        bridge.message("Import geprüft: Es gibt keine neuen Looks hinzuzufügen.");
        return;
      }
      if (!sessionIsCurrent(session)) return;

      const batch = writeBatch(db);
      pending.forEach(function(outfit) {
        const ref = doc(collection(db,"users",session.uid,"outfits"));
        batch.set(ref,Object.assign({},outfit,{archived:Boolean(outfit.archived),createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
      });
      await batch.commit();
      if (!sessionIsCurrent(session)) return;

      currentTab = "mine";
      await refreshCloud(false,session.revision);
      if (!sessionIsCurrent(session)) return;

      const skipped = cleaned.length - pending.length;
      bridge.message(
        pending.length + " Look(s) wurden deinem Konto hinzugefügt." +
        (skipped ? " " + skipped + " bereits vorhandene Duplikat(e) wurden übersprungen." : "")
      );
    } catch (e) {
      console.error(e);
      if (sessionIsCurrent(session)) {
        bridge.message("Import fehlgeschlagen. Die Datei ist ungültig, zu groß oder enthält fehlerhafte Wardrobe-Looks.");
      }
    } finally {
      endOutfitWrite(writeToken);
    }
  }

  async function fullBackup() {
    const session = captureSession();
    if (!session) return;

    try {
      const snap = await getDocs(collection(db,"users",session.uid,"outfits"));
      if (!sessionIsCurrent(session)) return;

      const own = snap.docs
        .map(function(d){ return sanitizeOutfit(d.data(), d.data() && d.data().name); })
        .filter(Boolean);

      const migrationKey = "gtaWardrobeCloudMigrated_" + session.uid;
      const fullLocalDump = bridge.localStorageDump();
      const personalLocalStorage = {};
      if (Object.prototype.hasOwnProperty.call(fullLocalDump,migrationKey)) {
        personalLocalStorage[migrationKey] = fullLocalDump[migrationKey];
      }

      downloadJson("wardrobe-" + session.name.toLowerCase() + "-vollsicherung.json",{
        format:"GTA_WARDROBE_ACCOUNT_BACKUP",
        version:2,
        createdAt:new Date().toISOString(),
        ownerUid:session.uid,
        ownerName:session.name,
        cloudOutfits:own,
        localStorage:personalLocalStorage
      });
      if (sessionIsCurrent(session)) bridge.message("Vollständige persönliche Sicherung erstellt.");
    } catch (e) {
      console.error(e);
      if (sessionIsCurrent(session)) bridge.message("Vollständige Sicherung konnte nicht erstellt werden.");
    }
  }

  async function restoreBackup(file) {
    const session = captureSession();
    if (!session) return;

    const writeToken = beginOutfitWrite("restore-backup");
    if (!writeToken) return;

    try {
      if (!file || file.size > MAX_BACKUP_BYTES) throw new Error("Datei zu groß");
      const fileText = await file.text();
      if (!sessionIsCurrent(session)) return;

      const data = JSON.parse(fileText);
      if (!data || data.format !== "GTA_WARDROBE_ACCOUNT_BACKUP" || !Array.isArray(data.cloudOutfits)) throw new Error("Format");

      const backupOwnerUid = typeof data.ownerUid === "string" ? data.ownerUid : "";
      const backupOwnerName = typeof data.ownerName === "string" ? data.ownerName.trim() : "";
      if (backupOwnerUid && backupOwnerUid !== session.uid) throw new Error("Falsches Konto");
      if (!backupOwnerUid && backupOwnerName && canonicalUserName(backupOwnerName) !== canonicalUserName(session.name)) throw new Error("Falsches Konto");
      if (!backupOwnerUid && !backupOwnerName) throw new Error("Kontozuordnung fehlt");

      if (data.cloudOutfits.some(function(x){ return !validIncomingOutfit(x); })) throw new Error("Ungültige Looks");
      const cleaned = data.cloudOutfits.map(function(x){ return sanitizeOutfit(x,x && x.name); }).filter(Boolean);
      if (cleaned.length !== data.cloudOutfits.length) throw new Error("Ungültige Looks");

      const typed = prompt(
        "Diese Aktion ersetzt die aktuellen Cloud-Looks von " + session.name +
        " durch die Sicherung.\n\nTippe WIEDERHERSTELLEN, um fortzufahren:"
      );
      if (typed !== "WIEDERHERSTELLEN") {
        if (sessionIsCurrent(session)) bridge.message("Wiederherstellung abgebrochen.");
        return;
      }
      if (!sessionIsCurrent(session)) return;

      const currentSnap = await getDocs(collection(db,"users",session.uid,"outfits"));
      if (!sessionIsCurrent(session)) return;
      if (currentSnap.size + cleaned.length > MAX_ATOMIC_RESTORE_WRITES) throw new Error("Zu viele Operationen");

      const batch = writeBatch(db);
      currentSnap.docs.forEach(function(d){ batch.delete(doc(db,"users",session.uid,"outfits",d.id)); });
      cleaned.forEach(function(outfit){
        const ref = doc(collection(db,"users",session.uid,"outfits"));
        batch.set(ref,Object.assign({},outfit,{createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
      });
      if (!sessionIsCurrent(session)) return;

      await batch.commit();
      if (!sessionIsCurrent(session)) return;

      const migrationKey = "gtaWardrobeCloudMigrated_" + session.uid;
      const localMarkerRestored = data.localStorage && typeof data.localStorage === "object"
        ? bridge.restoreLocalStorage(data.localStorage,[migrationKey])
        : true;

      currentTab = "mine";
      await refreshCloud(false,session.revision);
      if (sessionIsCurrent(session)) {
        bridge.message(
          localMarkerRestored
            ? "Persönliche Sicherung wurde wiederhergestellt."
            : "Cloud-Looks wurden wiederhergestellt. Der lokale Migrationsstatus konnte in diesem Browser nicht gespeichert werden."
        );
      }
    } catch (e) {
      console.error(e);
      if (sessionIsCurrent(session)) {
        bridge.message("Wiederherstellung fehlgeschlagen. Prüfe Datei, Konto-Zuordnung und Anzahl der Looks.");
      }
    } finally {
      endOutfitWrite(writeToken);
    }
  }

  cloudSaveBtn.addEventListener("click", saveCurrentLook);
  cloudOutfitName.addEventListener("keydown", function(e){ if (e.key === "Enter") saveCurrentLook(); });
  cloudRefreshBtn.addEventListener("click", function(){ refreshCloud(true); });
  cloudExportBtn.addEventListener("click", exportOwnLooks);
  cloudImportFile.addEventListener("change", function(e) {
    const file = e.target.files && e.target.files[0];
    if (file) importLooksFile(file);
    e.target.value = "";
  });
  cloudFullBackupBtn.addEventListener("click", fullBackup);
  cloudRestoreFile.addEventListener("change", function(e) {
    const file = e.target.files && e.target.files[0];
    if (file) restoreBackup(file);
    e.target.value = "";
  });

  document.querySelectorAll("[data-cloud-tab]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      currentTab = btn.dataset.cloudTab;
      renderTabs();
    });
  });

  cloudTabBody.addEventListener("click", async function(e) {
    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      const actionSession = captureSession();
      if (!actionSession) return;

      const outfit = findOutfitByKey(actionBtn.dataset.key);
      if (!outfit) return;
      const action = actionBtn.dataset.action;
      try {
        if (action === "load") bridge.load(outfit);
        else if (action === "suggest") populateSuggestionModal(outfit);
        else if (action === "archive") await changeOwnOutfit(outfit,{archived:true},"Look wurde archiviert.");
        else if (action === "unarchive") await changeOwnOutfit(outfit,{archived:false},"Look ist wieder aktiv.");
        else if (action === "rename") {
          const name = prompt("Neuer Name für den Look:",outfit.name || "");
          if (name && name.trim()) await changeOwnOutfit(outfit,{name:name.trim().slice(0,60)},"Look wurde umbenannt.");
        } else if (action === "delete") {
          if (outfit._ownerUid !== actionSession.uid) {
            bridge.message("Fremde Looks können nicht gelöscht werden.");
            return;
          }
          if (confirm('Look "' + (outfit.name || "Unbenannt") + '" wirklich löschen?')) {
            const writeToken = beginOutfitWrite("delete-outfit:" + outfit._docId);
            if (!writeToken) return;
            try {
              if (!sessionIsCurrent(actionSession)) return;
              await deleteDoc(doc(db,"users",actionSession.uid,"outfits",outfit._docId));
              if (!sessionIsCurrent(actionSession)) return;
              await refreshCloud(false,actionSession.revision);
              if (sessionIsCurrent(actionSession)) bridge.message("Look wurde gelöscht.");
            } finally {
              endOutfitWrite(writeToken);
            }
          }
        }
      } catch (err) {
        console.error(err);
        if (sessionIsCurrent(actionSession)) bridge.message("Aktion konnte nicht ausgeführt werden.");
      }
      return;
    }

    const suggestionBtn = e.target.closest("[data-suggestion-action]");
    if (suggestionBtn) {
      const suggestionSession = captureSession();
      if (!suggestionSession) return;

      try {
        await handleSuggestionAction(
          suggestionBtn.dataset.suggestionAction,
          suggestionBtn.dataset.id,
          suggestionBtn.dataset.direction
        );
      } catch (err) {
        console.error(err);
        if (sessionIsCurrent(suggestionSession)) bridge.message("Vorschlag konnte nicht verarbeitet werden.");
      }
    }
  });

  document.getElementById("sendSuggestionBtn").addEventListener("click", sendSuggestion);

  accountSecurityBtn.addEventListener("click", function() {
    if (passwordChangeUsernameInput) {
      passwordChangeUsernameInput.value = currentProfile && currentProfile.name ? currentProfile.name : userSelect.value;
    }
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("newPasswordRepeat").value = "";
    document.getElementById("passwordChangeStatus").textContent = "";
    openModal("accountModal");
  });

  document.getElementById("passwordChangeForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const oldPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const repeat = document.getElementById("newPasswordRepeat").value;
    const msg = document.getElementById("passwordChangeStatus");
    const btn = document.getElementById("passwordChangeBtn");
    const session = captureSession();
    const accountUser = session && session.user;

    if (newPassword.length < 10) {
      msg.textContent = "Das neue Passwort muss mindestens 10 Zeichen lang sein.";
      return;
    }
    if (newPassword !== repeat) {
      msg.textContent = "Die beiden neuen Passwörter stimmen nicht überein.";
      return;
    }
    if (!accountUser || !accountUser.email) {
      msg.textContent = "Es ist kein Benutzer angemeldet.";
      return;
    }

    btn.disabled = true;
    msg.textContent = "Passwort wird geprüft …";
    try {
      const credential = EmailAuthProvider.credential(accountUser.email,oldPassword);
      await reauthenticateWithCredential(accountUser,credential);
      if (!sessionIsCurrent(session)) {
        msg.textContent = "Passwortänderung abgebrochen, weil der Benutzer gewechselt wurde.";
        return;
      }

      await updatePassword(accountUser,newPassword);
      if (!sessionIsCurrent(session)) return;

      msg.textContent = "Passwort erfolgreich geändert.";
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("newPasswordRepeat").value = "";
      bridge.message("Dein Passwort wurde geändert.");
    } catch (err) {
      console.error(err);
      if (sessionIsCurrent(session)) {
        msg.textContent = "Passwort konnte nicht geändert werden. Prüfe dein aktuelles Passwort.";
      }
    } finally {
      btn.disabled = false;
    }
  });

  await setPersistence(auth,browserSessionPersistence);

  form.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (loginButton.disabled) return;

    authMessage.textContent = "";
    setLoginBusy(true);
    try {
      await signInWithEmailAndPassword(auth,LOGIN_EMAILS[userSelect.value],passwordInput.value);
    } catch (error) {
      console.error("Anmeldung fehlgeschlagen",error);
      lockApp("Anmeldung nicht möglich. Benutzer oder Passwort ist nicht korrekt.");
      setLoginBusy(false);
      passwordInput.select();
    }
  });

  logoutBtn.addEventListener("click", async function() {
    await signOut(auth);
  });

  onAuthStateChanged(auth, async function(user) {
    const revision = ++authRevision;
    activeOutfitWrite = "";

    if (!user) {
      currentProfile = null;
      allowedUsers = [];
      allOutfits = [];
      incomingSuggestions = [];
      sentSuggestions = [];
      suggestionTarget = null;
      suggestionSource = null;
      window.wardrobeUser = null;
      lockApp();
      setLoginBusy(false);
      return;
    }

    const uid = user.uid;
    currentProfile = null;
    allowedUsers = [];
    allOutfits = [];
    incomingSuggestions = [];
    sentSuggestions = [];
    suggestionTarget = null;
    suggestionSource = null;
    window.wardrobeUser = null;
    lockApp("Zugriff wird geprüft …");
    setLoginBusy(true);

    try {
      const profile = await approvedProfile(user);
      if (revision !== authRevision || !auth.currentUser || auth.currentUser.uid !== uid) return;

      if (!profile) {
        await signOut(auth);
        lockApp("Dieses Konto ist nicht für den Wardrobe-Zugriff freigegeben.");
        setLoginBusy(false);
        return;
      }

      currentProfile = profile;
      if (passwordChangeUsernameInput) passwordChangeUsernameInput.value = profile.name || userSelect.value;
      window.wardrobeUser = profile;
      unlockApp(profile);
      setLoginBusy(false);
      await refreshCloud(false,revision);
    } catch (error) {
      if (revision !== authRevision || !auth.currentUser || auth.currentUser.uid !== uid) return;
      console.error("Freigabeprüfung fehlgeschlagen",error);

      if (error && error.code === "permission-denied") {
        await signOut(auth);
        lockApp("Dieses Konto ist nicht für den Wardrobe-Zugriff freigegeben.");
        setLoginBusy(false);
        return;
      }

      lockApp("Die Zugriffsprüfung ist fehlgeschlagen. Bitte später erneut versuchen.");
      setLoginBusy(false);
    }
  });

})();
