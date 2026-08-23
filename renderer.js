// ===== 음메모 UM MEMO 데스크톱 렌더러 =====

const MAX_INDEXES = 8;
const DEFAULT_STATE = {
  activeId: "idx-1",
  indexes: [{ id: "idx-1", title: "인덱스 1", color: "#f2b705", content: "" }],
};

let state = null;

const rootEl = document.getElementById("peekom-root");
const sideTabsEl = document.getElementById("peekom-side-tabs");
const panelEl = document.getElementById("peekom-panel");
const tabsRowEl = document.getElementById("peekom-tabs-row");
const activeTitleEl = document.getElementById("peekom-active-title");
const addBtn = document.getElementById("peekom-add-btn");
const closeBtn = document.getElementById("peekom-close-btn");
const pinBtn = document.getElementById("peekom-pin-btn");
const editorEl = document.getElementById("peekom-editor");
const bgBtn = document.getElementById("peekom-bg-btn");
const deleteBtn = document.getElementById("peekom-delete-btn");
const toolbarBtns = document.querySelectorAll(".peekom-toolbar button[data-cmd]");

// ----- 저장/불러오기 (로컬 JSON 파일) -----
function loadState() {
  const loaded = window.peekom.loadData();
  state =
    loaded && loaded.indexes && loaded.indexes.length
      ? loaded
      : JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => window.peekom.saveData(state), 200);
}

// ----- 열기/닫기 -----
function openPanel() {
  panelEl.classList.add("open");
  rootEl.classList.add("panel-open");
}
function closePanel() {
  panelEl.classList.remove("open");
  rootEl.classList.remove("panel-open");
  closeAllPopups();
}
// 열려있던 배경/알람/이름 팝업 정리 (닫았다 다시 열면 팝업은 닫혀있게)
function closeAllPopups() {
  if (bgPopEl) { bgPopEl.remove(); bgPopEl = null; }
  if (alarmPopEl) { alarmPopEl.remove(); alarmPopEl = null; }
  const ip = document.querySelector(".peekom-inline-prompt");
  if (ip) ip.remove();
}
closeBtn.addEventListener("click", closePanel);

// ----- 고정(핀): 켜면 바깥 클릭해도 안 닫힘 -----
let pinned = false;
pinBtn.addEventListener("click", () => {
  pinned = !pinned;
  pinBtn.classList.toggle("active", pinned);
});

// ----- 오른쪽 옆면 세로 인덱스 탭 (인덱스마다 하나씩) -----
function renderSideTabs() {
  sideTabsEl.innerHTML = "";
  state.indexes.forEach((idx) => {
    const t = document.createElement("button");
    t.className = "peekom-side-tab" + (idx.id === state.activeId ? " active" : "");
    t.style.setProperty("--tab-color", idx.color || "#f2b705");
    const label = document.createElement("span");
    label.className = "peekom-side-tab-label";
    label.textContent = idx.title;
    t.appendChild(label);
    t.addEventListener("click", () => {
      const alreadyActive = idx.id === state.activeId && panelEl.classList.contains("open");
      if (alreadyActive) {
        closePanel(); // 열려있는 현재 탭을 다시 누르면 닫기
        return;
      }
      state.activeId = idx.id;
      renderTabs();
      renderEditor();
      openPanel();
    });
    sideTabsEl.appendChild(t);
  });
}

// ----- 인덱스 렌더링 -----
function getActiveIndex() {
  return state.indexes.find((i) => i.id === state.activeId) || state.indexes[0];
}

function renderTabs() {
  tabsRowEl.innerHTML = "";
  state.indexes.forEach((idx) => {
    const b = document.createElement("button");
    b.className = "peekom-index-tab" + (idx.id === state.activeId ? " active" : "");
    b.style.setProperty("--tab-color", idx.color || "#f2b705");
    b.textContent = idx.title;
    b.addEventListener("click", () => {
      state.activeId = idx.id;
      renderTabs();
      renderEditor();
    });
    tabsRowEl.appendChild(b);
  });
  addBtn.disabled = state.indexes.length >= MAX_INDEXES;
  renderSideTabs(); // 옆면 세로 탭도 함께 갱신
}

function renderEditor() {
  closeAllPopups(); // 다른 인덱스로 전환하면 열려있던 배경/알람 팝업 닫기
  const idx = getActiveIndex();
  editorEl.innerHTML = idx.content || "";
  migrateCheckboxes(); // 예전 input 체크박스를 새 방식으로 변환
  if (activeTitleEl) activeTitleEl.textContent = idx.title;
  applyEditorBg(idx);
}

// 예전 방식(실제 input 또는 중첩 span) 체크 항목을 새 방식(텍스트만 든 줄)으로 변환
function migrateCheckboxes() {
  const lines = editorEl.querySelectorAll(".peekom-check-line");
  let changed = false;
  lines.forEach((line) => {
    const input = line.querySelector("input.peekom-checkbox");
    const boxSpan = line.querySelector(".peekom-check-box");
    const textSpan = line.querySelector(".peekom-check-text");
    if (!input && !boxSpan && !textSpan) return; // 이미 새 방식
    changed = true;
    const checked = line.classList.contains("checked") || (input && input.checked);
    const text = (textSpan ? textSpan.textContent : line.textContent) || "";
    line.innerHTML = "";
    line.textContent = text;
    if (!text) line.innerHTML = "<br>";
    line.className = "peekom-check-line" + (checked ? " checked" : "");
  });
  if (changed) { getActiveIndex().content = editorEl.innerHTML; saveState(); }
}

// ----- 메모지 배경 (색상 + 줄노트) -----
const BG_PRESETS = [
  { name: "기본", color: "#ffffff" },
  { name: "노랑", color: "#fff9db" },
  { name: "분홍", color: "#ffeef2" },
  { name: "민트", color: "#e6fcf5" },
  { name: "하늘", color: "#e7f5ff" },
  { name: "라벤더", color: "#f3f0ff" },
  { name: "회색", color: "#f1f3f5" },
];
// 인덱스(세로 탭) 색 프리셋
const TAB_COLORS = ["#f2b705", "#ffa94d", "#ff8787", "#f783ac", "#da77f2", "#748ffc", "#4dabf7", "#38d9a9", "#69db7c", "#a9a9a9"];

// 줄노트: 배경 줄무늬 대신 각 줄(블록)에 실제 밑줄을 긋는 방식 → 글자와 항상 정확히 정렬됨
function applyEditorBg(idx) {
  const color = idx.bg || "#ffffff";
  editorEl.style.backgroundColor = color;
  editorEl.classList.toggle("lined", !!idx.lined);
}
let bgPopEl = null;
function toggleBgPopup() {
  if (bgPopEl) { bgPopEl.remove(); bgPopEl = null; return; }
  const idx = getActiveIndex();
  bgPopEl = document.createElement("div");
  bgPopEl.className = "peekom-bg-pop";
  const swatches = BG_PRESETS.map(
    (p) => `<button class="peekom-bg-sw${(idx.bg||'#ffffff')===p.color?' on':''}" data-color="${p.color}" title="${p.name}" style="background:${p.color}"></button>`
  ).join("");
  const tabSwatches = TAB_COLORS.map(
    (c) => `<button class="peekom-tabcolor-sw${(idx.color||'#f2b705')===c?' on':''}" data-color="${c}" style="background:${c}"></button>`
  ).join("");
  bgPopEl.innerHTML =
    `<div class="peekom-bg-title">인덱스 탭 색</div>` +
    `<div class="peekom-bg-row">${tabSwatches}` +
      `<label class="peekom-tabcolor-custom" title="직접 색 고르기">🎨<input type="color" id="peekom-tabcolor-input" value="${idx.color||'#f2b705'}"></label>` +
    `</div>` +
    `<div class="peekom-bg-title" style="margin-top:6px">메모지 배경색</div>` +
    `<div class="peekom-bg-row">${swatches}</div>` +
    `<label class="peekom-bg-lined"><input type="checkbox" id="peekom-lined-chk" ${idx.lined?"checked":""}> 줄노트 무늬</label>`;
  // 툴바 바로 아래(에디터 앞)에 정상 흐름으로 끼워 넣음 → 좁은 고정창에서도 항상 보임, 안 잘림
  panelEl.insertBefore(bgPopEl, editorEl);
  // 인덱스 탭 색 - 프리셋
  bgPopEl.querySelectorAll(".peekom-tabcolor-sw").forEach((b) => {
    b.addEventListener("click", () => {
      const ix = getActiveIndex();
      ix.color = b.dataset.color;
      renderTabs(); saveState();
      bgPopEl.querySelectorAll(".peekom-tabcolor-sw").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
    });
  });
  // 인덱스 탭 색 - 직접 고르기
  bgPopEl.querySelector("#peekom-tabcolor-input").addEventListener("input", (e) => {
    const ix = getActiveIndex();
    ix.color = e.target.value;
    renderTabs(); saveState();
    bgPopEl.querySelectorAll(".peekom-tabcolor-sw").forEach((x) => x.classList.remove("on"));
  });
  // 메모지 배경색
  bgPopEl.querySelectorAll(".peekom-bg-sw").forEach((b) => {
    b.addEventListener("click", () => {
      const ix = getActiveIndex();
      ix.bg = b.dataset.color;
      applyEditorBg(ix); saveState();
      bgPopEl.querySelectorAll(".peekom-bg-sw").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
    });
  });
  bgPopEl.querySelector("#peekom-lined-chk").addEventListener("change", (e) => {
    const ix = getActiveIndex();
    ix.lined = e.target.checked;
    applyEditorBg(ix); saveState();
  });
}
bgBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (alarmPopEl) { alarmPopEl.remove(); alarmPopEl = null; }
  toggleBgPopup();
});

// ===== 메모 알림 (날짜·시간 → 윈도우 알림) =====
const alarmBtn = document.getElementById("peekom-alarm-btn");
const reminderTimers = {};

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toLocalInputValue(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtReminder(t) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function removeReminder(id) {
  if (reminderTimers[id]) { clearTimeout(reminderTimers[id]); delete reminderTimers[id]; }
  state.reminders = (state.reminders || []).filter((x) => x.id !== id);
  saveState();
}
function fireReminder(r) {
  const idx = (state.indexes || []).find((i) => i.id === r.indexId);
  const name = (idx && idx.title) || r.indexTitle || "메모";
  window.peekom.notify(`[${name}] 메모 알림이 있어요!`, r.text ? r.text : "메모를 확인해보세요", r.indexId);
  removeReminder(r.id);
}
function scheduleReminder(r) {
  const MAX = 2147483647; // setTimeout 최대치(약 24.8일)
  const delay = r.time - Date.now();
  if (delay <= 0) { fireReminder(r); return; }
  if (delay > MAX) {
    reminderTimers[r.id] = setTimeout(() => scheduleReminder(r), MAX);
  } else {
    reminderTimers[r.id] = setTimeout(() => fireReminder(r), delay);
  }
}
function scheduleAllReminders() {
  (state.reminders || []).forEach((r) => scheduleReminder(r));
}

let alarmPopEl = null;
function renderAlarmPopup() {
  const idx = getActiveIndex();
  const def = toLocalInputValue(new Date(Date.now() + 3600000));
  const list = (state.reminders || [])
    .filter((r) => r.indexId === idx.id)
    .sort((a, b) => a.time - b.time);
  const listHtml = list.length
    ? list.map((r) => `<div class="peekom-alarm-item"><span>${fmtReminder(r.time)} · ${escapeHtml(r.text)}</span><button class="peekom-alarm-del" data-id="${r.id}">✕</button></div>`).join("")
    : `<div class="peekom-alarm-empty">예약된 알림이 없어요</div>`;
  alarmPopEl.innerHTML =
    `<div class="peekom-bg-title">알림 예약</div>` +
    `<div class="peekom-alarm-for">📄 ${escapeHtml(idx.title)}</div>` +
    `<input type="datetime-local" class="peekom-alarm-dt" value="${def}">` +
    `<input type="text" class="peekom-alarm-text" placeholder="알림 내용 (예: 회의 준비)">` +
    `<button class="peekom-alarm-set">＋ 알림 추가</button>` +
    `<div class="peekom-alarm-list">${listHtml}</div>`;
  alarmPopEl.querySelector(".peekom-alarm-set").addEventListener("click", () => {
    const dtVal = alarmPopEl.querySelector(".peekom-alarm-dt").value;
    const txt = alarmPopEl.querySelector(".peekom-alarm-text").value.trim();
    if (!dtVal) return;
    const time = new Date(dtVal).getTime();
    if (isNaN(time)) return;
    if (time <= Date.now()) { alert("미래 시각으로 정해주세요."); return; }
    const r = { id: "rem-" + Date.now(), indexId: idx.id, indexTitle: idx.title, time, text: txt };
    state.reminders = state.reminders || [];
    state.reminders.push(r);
    saveState();
    scheduleReminder(r);
    renderAlarmPopup(); // 목록 갱신
  });
  alarmPopEl.querySelectorAll(".peekom-alarm-del").forEach((b) => {
    b.addEventListener("click", () => { removeReminder(b.dataset.id); renderAlarmPopup(); });
  });
}
function toggleAlarmPopup() {
  if (alarmPopEl) { alarmPopEl.remove(); alarmPopEl = null; return; }
  if (bgPopEl) { bgPopEl.remove(); bgPopEl = null; }
  alarmPopEl = document.createElement("div");
  alarmPopEl.className = "peekom-alarm-pop";
  panelEl.insertBefore(alarmPopEl, editorEl);
  renderAlarmPopup();
}
alarmBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleAlarmPopup();
});

addBtn.addEventListener("click", () => {
  if (state.indexes.length >= MAX_INDEXES) return;
  const n = state.indexes.length + 1;
  const newIdx = {
    id: "idx-" + Date.now(),
    title: "인덱스 " + n,
    color: randomColor(),
    content: "",
  };
  state.indexes.push(newIdx);
  state.activeId = newIdx.id;
  renderTabs();
  renderEditor();
  saveState();
});

deleteBtn.addEventListener("click", () => {
  if (state.indexes.length <= 1) {
    alert("마지막 인덱스는 삭제할 수 없어요.");
    return;
  }
  const idx = getActiveIndex();
  if (!confirm(`"${idx.title}" 인덱스를 삭제할까요?`)) return;
  state.indexes = state.indexes.filter((i) => i.id !== idx.id);
  state.activeId = state.indexes[0].id;
  renderTabs();
  renderEditor();
  saveState();
});

// ----- 헤더 이름을 클릭하면 그 자리에서 바로 수정 -----
let titleEditing = false;
activeTitleEl.addEventListener("click", () => {
  if (titleEditing) return;
  titleEditing = true;
  activeTitleEl.setAttribute("contenteditable", "true");
  activeTitleEl.classList.add("editing");
  activeTitleEl.focus();
  const range = document.createRange();
  range.selectNodeContents(activeTitleEl);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(range);
});
activeTitleEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); activeTitleEl.blur(); }
  else if (e.key === "Escape") { activeTitleEl.textContent = getActiveIndex().title; activeTitleEl.blur(); }
});
activeTitleEl.addEventListener("blur", () => {
  if (!titleEditing) return;
  titleEditing = false;
  activeTitleEl.setAttribute("contenteditable", "false");
  activeTitleEl.classList.remove("editing");
  const idx = getActiveIndex();
  const v = activeTitleEl.textContent.trim().slice(0, 20);
  if (v) idx.title = v;
  activeTitleEl.textContent = idx.title; // 정규화
  renderTabs();
  saveState();
});

function randomColor() {
  const colors = ["#f2b705", "#4dabf7", "#ff8787", "#69db7c", "#da77f2", "#ffa94d"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ----- 서식 -----
try { document.execCommand("styleWithCSS", false, false); } catch (e) {} // 볼드 등은 <b> 태그로(구조 안 깨지게)
toolbarBtns.forEach((btn) => {
  // ★핵심: 버튼 mousedown 때 에디터 선택영역이 풀리지 않도록 기본동작 차단
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => {
    const cmd = btn.dataset.cmd;
    if (cmd === "checklist") {
      editorEl.focus();
      insertChecklistItem();
    } else {
      document.execCommand(cmd, false, null); // 선택영역이 유지된 채로 적용됨
    }
    persistContent();
  });
});

// 체크 항목 = 텍스트만 든 일반 줄(div). 체크박스는 CSS ::before 로 그림 → 편집이 일반 글자처럼 동작
function makeCheckLine(text, checked) {
  const line = document.createElement("div");
  line.className = "peekom-check-line" + (checked ? " checked" : "");
  line.textContent = text || "";
  if (!text) line.innerHTML = "<br>"; // 빈 줄도 높이 유지
  return line;
}

function insertChecklistItem() {
  const line = makeCheckLine("체크 항목", false);
  // 항상 에디터의 최상위 블록으로 삽입 (다른 줄 안에 중첩되지 않게)
  const sel = window.getSelection();
  let block = null;
  if (sel && sel.rangeCount > 0) {
    let node = sel.getRangeAt(0).startContainer;
    while (node && node.parentNode !== editorEl) node = node.parentNode;
    if (node && node.parentNode === editorEl) block = node;
  }
  if (block) block.after(line);
  else editorEl.appendChild(line);
  // "체크 항목" 글자를 전체 선택 상태로 (바로 타이핑하면 덮어쓰기)
  const range = document.createRange();
  range.selectNodeContents(line);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(range);
  persistContent();
}

editorEl.addEventListener("click", (e) => {
  const line = e.target.closest && e.target.closest(".peekom-check-line");
  if (!line) return;
  // 왼쪽 체크박스 영역(약 24px)을 클릭했을 때만 토글. 글자 영역 클릭은 커서 이동(편집)
  const rect = line.getBoundingClientRect();
  if (e.clientX - rect.left > 24) return;
  const nowChecked = !line.classList.contains("checked");
  line.classList.toggle("checked", nowChecked);
  if (nowChecked) {
    editorEl.appendChild(line); // 완료 항목은 맨 밑으로
  } else {
    const firstChecked = editorEl.querySelector(".peekom-check-line.checked");
    if (firstChecked && firstChecked !== line) editorEl.insertBefore(line, firstChecked);
  }
  persistContent();
});
// 커서를 특정 요소 안(맨 앞)으로 이동
function placeCaretIn(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(true);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(range);
}

// 체크리스트 항목 안에서 엔터 → 새 체크 항목으로 내려감 (빈 항목이면 체크리스트 종료)
editorEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.shiftKey) return;
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const startEl =
    sel.getRangeAt(0).startContainer.nodeType === 3
      ? sel.getRangeAt(0).startContainer.parentElement
      : sel.getRangeAt(0).startContainer;
  const checkLine = startEl && startEl.closest ? startEl.closest(".peekom-check-line") : null;
  if (!checkLine) return; // 일반 줄이면 기본 엔터 동작

  e.preventDefault();
  const isEmpty = checkLine.textContent.trim() === "";

  if (isEmpty) {
    // 빈 체크 항목에서 엔터 → 체크리스트 빠져나와 일반 줄로 (클래스만 제거)
    checkLine.classList.remove("checked");
    checkLine.className = "";
    checkLine.innerHTML = "<br>";
    placeCaretIn(checkLine);
  } else {
    // 새 체크 항목 추가
    const line = makeCheckLine("", false);
    checkLine.after(line);
    placeCaretIn(line);
  }
  persistContent();
});

editorEl.addEventListener("input", persistContent);

// ----- 링크 붙여넣기 → 바로가기 링크로 변환 -----
editorEl.addEventListener("paste", (e) => {
  const cd = e.clipboardData || window.clipboardData;
  const text = cd ? cd.getData("text") : "";
  if (!text || !/https?:\/\//i.test(text)) return; // URL 없으면 기본 붙여넣기
  e.preventDefault();
  let html = escapeHtml(text)
    .replace(/(https?:\/\/[^\s]+)/gi, (u) => `<a href="${u}" class="peekom-link" contenteditable="false">${u}</a>`)
    .replace(/\n/g, "<br>");
  document.execCommand("insertHTML", false, html);
  persistContent();
});

// 링크 클릭 → 기본 브라우저로 열기
editorEl.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a.peekom-link");
  if (a) {
    e.preventDefault();
    const href = a.getAttribute("href");
    if (href) window.peekom.openExternal(href);
  }
});

function persistContent() {
  const idx = getActiveIndex();
  idx.content = editorEl.innerHTML;
  saveState();
}

// ----- 클릭스루(마우스 통과) 처리 -----
// 이 창은 화면 전체를 덮지 않고 우측 340px만 차지하지만,
// 탭/패널이 없는 투명한 부분은 클릭이 아래 프로그램으로 그대로 전달돼야 함
let mouseOverInteractive = false;
const EDGE_ZONE = 20; // 오른쪽 끝에서 이 픽셀 안으로 들어오면 세로 탭이 나타남

function updateIgnoreMouseEvents(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const isOverUI = el && el.closest(".peekom-side-tabs, .peekom-panel");
  if (isOverUI && !mouseOverInteractive) {
    mouseOverInteractive = true;
    window.peekom.setIgnoreMouseEvents(false);
  } else if (!isOverUI && mouseOverInteractive) {
    mouseOverInteractive = false;
    window.peekom.setIgnoreMouseEvents(true, { forward: true });
  }
  // 세로 인덱스 탭: 평소엔 숨김. 오른쪽 끝 근처이거나, 패널이 열려있거나, 탭 위에 있을 때만 표시
  const nearRight = e.clientX >= window.innerWidth - EDGE_ZONE;
  const panelOpen = panelEl.classList.contains("open");
  if (nearRight || panelOpen || isOverUI) {
    sideTabsEl.classList.add("reveal");
  } else {
    sideTabsEl.classList.remove("reveal");
  }
}
document.addEventListener("mousemove", updateIgnoreMouseEvents);

// 창 밖을 클릭해 포커스를 잃으면 패널 닫기
if (window.peekom.onBlur) {
  window.peekom.onBlur(() => {
    if (!pinned && panelEl.classList.contains("open")) closePanel();
  });
}

// 알림을 클릭하면 해당 인덱스 메모를 열기
if (window.peekom.onOpenIndex) {
  window.peekom.onOpenIndex((id) => {
    if (id && (state.indexes || []).some((i) => i.id === id)) {
      state.activeId = id;
      renderTabs();
      renderEditor();
    }
    openPanel();
  });
}

// ----- 초기화 -----
try { document.execCommand("defaultParagraphSeparator", false, "div"); } catch (e) {}
loadState();
scheduleAllReminders(); // 저장된 알림 다시 예약 (놓친 건 바로 알림)
renderTabs();
renderEditor();
// 시작 시 투명 영역은 클릭이 아래 프로그램으로 통과되게 (이후 마우스가 탭/패널 위로 오면 잡음)
window.peekom.setIgnoreMouseEvents(true, { forward: true });
