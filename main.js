const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, Notification, shell } = require("electron");
const path = require("path");

// 링크 바로가기: 렌더러에서 요청한 URL을 기본 브라우저로 열기 (http/https만 허용)
ipcMain.on("open-external", (e, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
});

// 윈도우 알림 표시 (렌더러가 예약 시각에 요청)
ipcMain.on("notify", (e, data) => {
  try {
    const n = new Notification({
      title: (data && data.title) || "음메모 알림",
      body: (data && data.body) || "",
      timeoutType: "never", // 사용자가 닫을 때까지 유지
    });
    n.on("click", () => {
      if (win) {
        win.show();
        win.focus();
        win.webContents.send("open-index", data && data.indexId);
      }
    });
    n.show();
  } catch (err) {}
});

let win = null;
let tray = null;

const TAB_W = 44; // 평소(닫힘) 상태 창 너비
const TAB_H = 84; // 평소(닫힘) 상태 창 높이
const PANEL_W = 340; // 열림 상태 창 너비

function boundsClosed() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  return { x: sw - TAB_W, y: Math.round((sh - TAB_H) / 2), width: TAB_W, height: TAB_H };
}

function boundsOpen() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  return { x: sw - PANEL_W, y: 0, width: PANEL_W, height: sh };
}

function createWindow() {
  // 창은 항상 패널 크기(우측 340px · 풀높이)로 고정. 열림/닫힘은 CSS(translateX)로만 처리.
  // (투명 창은 Windows에서 setBounds 리사이즈가 안 먹히는 제약이 있어, 리사이즈 대신 고정창+클릭통과 방식)
  const initial = boundsOpen();

  win = new BrowserWindow({
    ...initial,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true, // false면 Windows에서 setBounds가 씹히는 경우가 있어 true로 변경
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // ★핵심: preload가 fs 등 Node API를 쓰려면 샌드박스를 꺼야 함
                      //  (안 그러면 preload가 통째로 죽어 window.peekom이 안 생기고 데이터 로드 실패)
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile("index.html");
  // win.webContents.openDevTools({ mode: "detach" }); // 디버깅 필요할 때만 주석 해제

  win.on("closed", () => {
    win = null;
  });

  // 창 밖(다른 프로그램·바탕화면·투명 영역)을 클릭해 포커스를 잃으면 패널을 닫도록 렌더러에 알림
  win.on("blur", () => {
    if (win) win.webContents.send("peekom-blur");
  });

  // (will-resize preventDefault 제거 — Windows에서 프로그램의 setBounds까지 막아 패널이 안 열리던 원인.
  //  frame:false 라 사용자가 드래그로 크기 조절할 손잡이가 없어 이 핸들러는 불필요.)

  screen.on("display-metrics-changed", repositionWindow);
  screen.on("display-added", repositionWindow);
  screen.on("display-removed", repositionWindow);
}

function repositionWindow() {
  if (!win) return;
  // 현재 열림/닫힘 상태를 창 너비로 추정해서 그 상태에 맞게 재배치
  const isOpen = win.getBounds().width > TAB_W;
  win.setBounds(isOpen ? boundsOpen() : boundsClosed());
}

// 투명 영역은 클릭이 아래 프로그램으로 통과되게 (탭/패널 위에서만 클릭 받음)
ipcMain.on("set-ignore-mouse-events", (e, ignore, options) => {
  if (win) win.setIgnoreMouseEvents(ignore, options);
});

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "icon16.png"));
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "음메모 보이기/숨기기",
      click: () => {
        if (!win) return;
        win.isVisible() ? win.hide() : win.show();
      },
    },
    { type: "separator" },
    { label: "종료", click: () => app.quit() },
  ]);
  tray.setToolTip("음메모 UM MEMO");
  tray.setContextMenu(contextMenu);
}

// 중복 실행 방지: 이미 실행 중이면 새 인스턴스는 종료하고 기존 창을 앞으로
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) { win.show(); win.focus(); }
  });

  app.whenReady().then(() => {
    // 윈도우 알림이 제대로 뜨려면 AppUserModelID 지정 필요
    if (process.platform === "win32") app.setAppUserModelId("com.ummemo.app");
    createWindow();
    createTray();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // 트레이 상주 앱이므로 창이 닫혀도 종료하지 않음
  }
});
