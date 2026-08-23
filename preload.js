const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");

const DATA_DIR = path.join(os.homedir(), "AppData", "Roaming", "peekom-index");
const DATA_FILE = path.join(DATA_DIR, "data.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(null));
  }
}

contextBridge.exposeInMainWorld("peekom", {
  openPanel: () => ipcRenderer.send("panel-open"),    // 창을 패널 크기로 확대
  closePanel: () => ipcRenderer.send("panel-close"),  // 창을 탭 크기로 축소
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send("set-ignore-mouse-events", ignore, options);
  },
  onBlur: (cb) => ipcRenderer.on("peekom-blur", () => cb()),
  notify: (title, body, indexId) => ipcRenderer.send("notify", { title, body, indexId }),
  onOpenIndex: (cb) => ipcRenderer.on("open-index", (e, id) => cb(id)),
  openExternal: (url) => ipcRenderer.send("open-external", url),
  loadData: () => {
    try {
      ensureDataFile();
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },
  saveData: (data) => {
    try {
      ensureDataFile();
      fs.writeFileSync(DATA_FILE, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  },
});
