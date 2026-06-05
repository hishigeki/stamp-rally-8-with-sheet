const STAMP_TOTAL = 8;
const STORAGE_KEY = "festival_stamp_rally_8_sheet_stamps_stamp-rally-8-with-sheet";
const FINISHED_KEY = "festival_stamp_rally_8_sheet_finished_stamp-rally-8-with-sheet";
const PARTICIPANT_KEY = "festival_stamp_rally_8_sheet_participant_id_stamp-rally-8-with-sheet";
const INTRO_KEY = "festival_stamp_rally_8_sheet_intro_seen_stamp-rally-8-with-sheet";

const GAS_URL = "https://script.google.com/macros/s/AKfycby3aD37_u8WLqsZfgf4kmRH85rgO6-WLAzucgsGWjJw_r3MO-kHH3L6whSPqVusYxdGsw/exec";

const API_TOKEN = "api_1438d5a18d8959b0b8479f6e0a5cb2f9";
const FINISH_TOKEN = "finish_8375c30e5d902b3d7b61e3d8";
const RESET_TOKEN = "reset_54684587fc46e0d51ad57570";

const STAMP_MAP = [
  {"number":"01","token":"iytxZcSakuDpGpR4aV8","image":"img_deaec71cbd1ec57d.png"},
  {"number":"02","token":"rtFAMJCTyPCCZ9303ME","image":"img_1be1988cec79788d.png"},
  {"number":"03","token":"2fYAxU9nmwEroXuFWBI","image":"img_d3382ce894330f9a.png"},
  {"number":"04","token":"HUxnu8G6eK3nOYj2f6E","image":"img_e28559c223c3a2f8.png"},
  {"number":"05","token":"73yHFIRBWgSBxGalVr0","image":"img_1fd3d1a33b9f3be3.png"},
  {"number":"06","token":"k8cghnw6UOMpN1aBIFA","image":"img_5fb647b410880919.png"},
  {"number":"07","token":"TErMTIWyibvugV7P5o0","image":"img_93b993ef1787e3cf.png"},
  {"number":"08","token":"7UpmTxjN6YIJpsk4K5A","image":"img_cd7d4b4a6ccfb77d.png"}
];

const introScreen = document.getElementById("introScreen");
const mainScreen = document.getElementById("mainScreen");
const stampBoard = document.getElementById("stampBoard");
const countText = document.getElementById("countText");
const completeText = document.getElementById("completeText");
const progressBar = document.getElementById("progressBar");
const messageBox = document.getElementById("messageBox");
const noticeBox = document.getElementById("noticeBox");
const completeArea = document.getElementById("completeArea");
const finishedArea = document.getElementById("finishedArea");
const participantDisplay = document.getElementById("participantDisplay");
const participantQrArea = document.getElementById("participantQrArea");
const claimResultText = document.getElementById("claimResultText");

function showIntroOnce() {
  if (localStorage.getItem(INTRO_KEY) === "true") return;
  introScreen.classList.remove("hidden");
  mainScreen.classList.add("hidden");
  setTimeout(() => {
    localStorage.setItem(INTRO_KEY, "true");
    introScreen.classList.add("hidden");
    mainScreen.classList.remove("hidden");
  }, 3000);
}

function getParticipantId() {
  let id = localStorage.getItem(PARTICIPANT_KEY);
  if (!id) {
    id = "DX-" + crypto.randomUUID();
    localStorage.setItem(PARTICIPANT_KEY, id);
    sendLog({action:"register", participantId:id});
  }
  return id;
}

function nowText() {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function loadStamps() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch(e) {
    return [];
  }
}

function saveStamps(stamps) {
  const map = new Map();
  for (const item of stamps) if (!map.has(item.id)) map.set(item.id, item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(map.values()).sort((a,b)=>a.id.localeCompare(b.id))));
}

function isFinished() { return localStorage.getItem(FINISHED_KEY) === "true"; }
function setFinished() { localStorage.setItem(FINISHED_KEY, "true"); }
function isComplete() { return loadStamps().length >= STAMP_TOTAL; }

function showMessage(text, type="info") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function cleanUrl() {
  window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
}

function findStampByToken(token) {
  return STAMP_MAP.find(item => item.token === token);
}

function gasReady() {
  return GAS_URL && GAS_URL.indexOf("PASTE_GAS") === -1;
}

function sendLog(data) {
  if (!gasReady()) return;
  const payload = {
    token: API_TOKEN,
    userAgent: navigator.userAgent,
    clientTime: new Date().toISOString(),
    ...data
  };

  fetch(GAS_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {"Content-Type": "text/plain;charset=utf-8"},
    body: JSON.stringify(payload)
  }).catch(() => {});
}

function jsonp(params, callbackName) {
  if (!gasReady()) return;
  const url = new URL(GAS_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("token", API_TOKEN);
  url.searchParams.set("callback", callbackName);

  const script = document.createElement("script");
  script.src = url.toString();
  script.onerror = () => script.remove();
  document.body.appendChild(script);
}

function resetByAdminQr(token) {
  if (token !== RESET_TOKEN) {
    showMessage("このリセットQRは無効です。", "warning");
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(FINISHED_KEY);
  localStorage.removeItem(PARTICIPANT_KEY);
  localStorage.removeItem(INTRO_KEY);
  showMessage("管理者QRにより台紙をリセットしました。", "success");
}

function handleUrlAction() {
  const params = new URLSearchParams(window.location.search);
  const stampToken = params.get("s");
  const finish = params.get("finish");
  const reset = params.get("reset");
  const participantId = getParticipantId();

  if (reset) {
    resetByAdminQr(reset);
    cleanUrl();
    renderBoard();
    return;
  }

  if (finish === FINISH_TOKEN) {
    if (!isComplete()) {
      showMessage("まだコンプリートしていません。景品交換はできません。", "warning");
      sendLog({action:"claimAttempt", participantId, result:"NOT_COMPLETE", stampCount:loadStamps().length});
      cleanUrl();
      return;
    }

    window.handlePrizeResult = function(res) {
      if (res && res.result === "OK") {
        setFinished();
        showMessage("景品受け取り済みにしました。ご参加ありがとうございました。", "success");
        claimResultText.textContent = "景品交換を記録しました。";
      } else if (res && res.result === "DUPLICATE") {
        setFinished();
        showMessage("この参加者IDはすでに景品交換済みです。", "warning");
        claimResultText.textContent = "すでに交換済みとして記録されています。";
      } else {
        showMessage("景品交換の確認に失敗しました。係員に確認してください。", "error");
      }
      renderBoard();
    };

    jsonp({action:"claimPrize", participantId, stampCount:loadStamps().length}, "handlePrizeResult");

    cleanUrl();
    return;
  }

  if (!stampToken) return;

  const info = findStampByToken(stampToken);
  if (!info) {
    showMessage("このQRコードはスタンプラリー用ではありません。", "warning");
    cleanUrl();
    return;
  }

  if (isFinished()) {
    showMessage("この台紙は景品受け取り済みです。", "warning");
    cleanUrl();
    return;
  }

  const id = info.number;
  const stamps = loadStamps();

  if (stamps.some(item => item.id === id)) {
    showMessage(`${id}番のスタンプは取得済みです。`, "warning");
  } else {
    const item = {id:id, time:nowText()};
    stamps.push(item);
    saveStamps(stamps);
    showMessage(`${id}番のスタンプを取得しました！`, "success");

    sendLog({
      action:"stamp",
      participantId,
      stampNumber:id,
      stampOrder:stamps.length,
      stampTime:item.time,
      stampCount:stamps.length
    });

    if (stamps.length >= STAMP_TOTAL) {
      sendLog({
        action:"complete",
        participantId,
        stampCount:stamps.length,
        completedAt:new Date().toISOString()
      });
    }
  }

  cleanUrl();
}

function showParticipantQr(participantId) {
  const qrText = encodeURIComponent(participantId);
  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrText}`;

  participantQrArea.innerHTML = `
    <p>景品交換用QR</p>
    <img src="${qrUrl}" width="180" height="180">
    <p>${participantId}</p>
  `;
}

function renderBoard() {
  const stamps = loadStamps();
  const finished = isFinished();
  const participantId = getParticipantId();
  participantDisplay.textContent = "参加者ID：" + participantId;
  stampBoard.innerHTML = "";

  for (const item of STAMP_MAP) {
    const id = item.number;
    const slot = document.createElement("div");
    slot.className = "stamp-slot";
    slot.dataset.number = id;
    const stamp = stamps.find(s => s.id === id);

    if (stamp) {
      const img = document.createElement("img");
      img.src = `images/${item.image}`;
      img.alt = `${id}番のスタンプ`;

      const time = document.createElement("div");
      time.className = "stamp-time";
      time.textContent = stamp.time;

      slot.appendChild(img);
      slot.appendChild(time);
    } else {
      slot.classList.add("empty");
    }
    stampBoard.appendChild(slot);
  }

  const count = stamps.length;
  countText.textContent = `${count} / ${STAMP_TOTAL}`;
  progressBar.style.width = `${(count / STAMP_TOTAL) * 100}%`;

  if (finished) {
    completeText.textContent = "終了";
    completeArea.classList.add("hidden");
    finishedArea.classList.remove("hidden");
    if (participantQrArea) participantQrArea.innerHTML = "";
  } else if (count >= STAMP_TOTAL) {
    completeText.textContent = "コンプリート";
    completeArea.classList.remove("hidden");
    finishedArea.classList.add("hidden");
    showParticipantQr(participantId);
  } else {
    completeText.textContent = `あと ${STAMP_TOTAL - count} 個`;
    completeArea.classList.add("hidden");
    finishedArea.classList.add("hidden");
    if (participantQrArea) participantQrArea.innerHTML = "";
  }
}

function loadMessages() {
  if (!gasReady()) return;
  window.handleMessages = function(res) {
    if (!res || !res.messages || res.messages.length === 0) {
      noticeBox.classList.add("hidden");
      return;
    }
    const msg = res.messages[0];
    noticeBox.innerHTML = `<strong>${msg.title}</strong><br>${msg.body}`;
    noticeBox.classList.remove("hidden");
  };
  jsonp({action:"getMessages"}, "handleMessages");
}

showIntroOnce();
handleUrlAction();
renderBoard();
loadMessages();
setInterval(loadMessages, 60000);
