const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const DEFAULT_DATA = {
  tracked: [],
  notifications: [],
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load() {
  ensureDataDir();
  if (!fs.existsSync(STORE_FILE)) {
    save(DEFAULT_DATA);
    return { ...DEFAULT_DATA };
  }
  const raw = fs.readFileSync(STORE_FILE, "utf-8");
  return JSON.parse(raw);
}

function save(data) {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function getTracked() {
  return load().tracked;
}

function addTracked(item) {
  const data = load();
  const exists = data.tracked.find(
    (t) => t.comicVineId === item.comicVineId && t.resourceType === item.resourceType
  );
  if (exists) return exists;

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    comicVineId: item.comicVineId,
    resourceType: item.resourceType,
    name: item.name,
    image: item.image || null,
    publisher: item.publisher || null,
    trackedAt: new Date().toISOString(),
    lastChecked: null,
    latestKnownIssueId: item.latestKnownIssueId || null,
  };
  data.tracked.push(entry);
  save(data);
  return entry;
}

function removeTracked(id) {
  const data = load();
  const idx = data.tracked.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  data.tracked.splice(idx, 1);
  save(data);
  return true;
}

function updateTracked(id, updates) {
  const data = load();
  const item = data.tracked.find((t) => t.id === id);
  if (!item) return null;
  Object.assign(item, updates);
  save(data);
  return item;
}

function getNotifications() {
  return load().notifications;
}

function addNotification(notification) {
  const data = load();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    resourceType: notification.resourceType || null,
    comicVineId: notification.comicVineId || null,
    releaseDate: notification.releaseDate || null,
    image: notification.image || null,
    read: false,
    createdAt: new Date().toISOString(),
  };
  data.notifications.unshift(entry);
  // Keep only last 100 notifications
  if (data.notifications.length > 100) {
    data.notifications = data.notifications.slice(0, 100);
  }
  save(data);
  return entry;
}

function markNotificationRead(id) {
  const data = load();
  const notif = data.notifications.find((n) => n.id === id);
  if (!notif) return false;
  notif.read = true;
  save(data);
  return true;
}

function markAllNotificationsRead() {
  const data = load();
  data.notifications.forEach((n) => (n.read = true));
  save(data);
  return true;
}

module.exports = {
  getTracked,
  addTracked,
  removeTracked,
  updateTracked,
  getNotifications,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
};
