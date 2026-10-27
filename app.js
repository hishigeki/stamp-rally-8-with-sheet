// 学園祭 Webスタンプラリー(12か所版)
const STAMP_TOTAL = 12;
const SUFFIX = "stamp-rally-12";
const STORAGE_KEY = "festival_stamps_" + SUFFIX;
const FINISHED_KEY = "festival_finished_" + SUFFIX;
const PARTICIPANT_KEY = "festival_pid_" + SUFFIX;
const INTRO_KEY = "festival_intro_" + SUFFIX;
const DAY_KEY = "festival_day_" + SUFFIX;       // 台紙を作った日(日本時間)。日が変わったら台紙を最初からにする
const SYNCED_KEY = "festival_synced_" + SUFFIX;   // サーバーが「コンプリート」を受け取ったことを確認できたら true

const GAS_URL =
"https://script.google.com/macros/s/AKfycbzfduTsOl5TIlOUYcYxkKdWewy_4gAYL2tsRzO4XYi9xNWabrofhcsQz_HKOs1XlPtD7Q/exec";

// 参加者画面用の公開トークン(register / complete / status だけ許可。景品の交換はできません)
const API_TOKEN = "api_1438d5a18d8959b0b8479f6e0a5cb2f9";
// 景品所に貼る「13番」のQR。スタンプの絵は出さず、読むと(12個そろっていれば)くじの順番待ちに入る
const VENUE_TOKEN = "ZA0fWrLOAwbr1MzWscg";
const RESET_TOKEN = "reset_54684587fc46e0d51ad57570";

const STAMP_MAP = [
  {"number":"01","token":"iytxZcSakuDpGpR4aV8","image":"img_deaec71cbd1ec57d.png"},
  {"number":"02","token":"rtFAMJCTyPCCZ9303ME","image":"img_1be1988cec79788d.png"},
  {"number":"03","token":"2fYAxU9nmwEroXuFWBI","image":"img_d3382ce894330f9a.png"},
  {"number":"04","token":"HUxnu8G6eK3nOYj2f6E","image":"img_e28559c223c3a2f8.png"},
  {"number":"05","token":"73yHFIRBWgSBxGalVr0","image":"img_1fd3d1a33b9f3be3.png"},
  {"number":"06","token":"k8cghnw6UOMpN1aBIFA","image":"img_5fb647b410880919.png"},
  {"number":"07","token":"TErMTIWyibvugV7P5o0","image":"img_93b993ef1787e3cf.png"},
  {"number":"08","token":"7UpmTxjN6YIJpsk4K5A","image":"img_cd7d4b4a6ccfb77d.png"},
  {"number":"09","token":"Cjg5bhw9l6sg449Do33","image":"img_09.png"},
  {"number":"10","token":"qKrA5IQef2wtWf7BNDQ","image":"img_10.png"},
  {"number":"11","token":"aeRpXBksymkjnLcRV6j","image":"img_11.png"},
  {"number":"12","token":"tyESqX8lh02XUwU08Al","image":"img_12.png"}
];

const $ = id => document.getElementById(id);
const introScreen = $("introScreen"), mainScreen = $("mainScreen"), stampBoard = $("stampBoard");
const countText = $("countText"), completeText = $("completeText"), progressBar = $("progressBar");
const messageBox = $("messageBox"), noticeBox = $("noticeBox");
const completeArea = $("completeArea"), closedArea = $("closedArea"), finishedArea = $("finishedArea");
const participantDisplay = $("participantDisplay"), participantQrArea = $("participantQrArea");

// 抽選の状態('open' | 'closed' | 'unknown')。サーバーから取得できるまで unknown=受付中扱い
let lotteryOpen = true;
let queueDetail = "";    // 通信エラーの目印
let queueInfo = null;     // {no, state, lane}(景品所のQRを読んで順番待ちに入った人)
let queueMsg = "";
let qrShownFor = "";

function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }

function showIntroOnce() {
  if (load(INTRO_KEY) === "true") return;
  introScreen.classList.remove("hidden");
  mainScreen.classList.add("hidden");
  $("introStart").addEventListener("click", () => {
    store(INTRO_KEY, "true");
    introScreen.classList.add("hidden");
    mainScreen.classList.remove("hidden");
    window.scrollTo(0, 0);
  });
}

function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => b[i] = Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function getParticipantId() {
  let id = load(PARTICIPANT_KEY);
  if (!id) { id = "DX-" + uuid(); store(PARTICIPANT_KEY, id); }
  return id;
}

function nowText() {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function loadStamps() {
  try {
    const data = JSON.parse(load(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data.filter(s => s && STAMP_MAP.some(m => m.number === s.id)) : [];
  } catch (e) { return []; }
}
function saveStamps(stamps) {
  const map = new Map();
  for (const s of stamps) if (!map.has(s.id)) map.set(s.id, s);
  store(STORAGE_KEY, JSON.stringify(Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id))));
}
const isFinished = () => load(FINISHED_KEY) === "true";
const isComplete = () => loadStamps().length >= STAMP_TOTAL;

function showMessage(text, type = "info") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}
function cleanUrl() {
  history.replaceState({}, document.title, location.origin + location.pathname);
}
const gasReady = () => GAS_URL && GAS_URL.indexOf("PASTE_GAS") === -1;

// ---------- サーバーへ送る(POST。応答は読めないので、確認は status で行う) ----------
function post(data) {
  if (!gasReady()) return false;
  const body = JSON.stringify({
    token: API_TOKEN, userAgent: navigator.userAgent, clientTime: new Date().toISOString(), ...data
  });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(GAS_URL, new Blob([body], { type: "text/plain;charset=utf-8" }))) return true;
  } catch (e) {}
  fetch(GAS_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body, keepalive: true })
    .catch(() => {});
  return true;
}

let lastCompleteSend = 0;
function sendComplete() {
  if (!isComplete() || isFinished() || load(SYNCED_KEY) === "true") return;
  if (Date.now() - lastCompleteSend < 8000) return;      // 連打防止
  lastCompleteSend = Date.now();
  post({ action: "complete", participantId: getParticipantId(), stampCount: loadStamps().length,
         completedAt: new Date().toISOString() });
}
function sendRegister() {
  if (load("festival_reg_" + SUFFIX) === "true") return;
  if (post({ action: "register", participantId: getParticipantId(), stampCount: loadStamps().length })) {
    store("festival_reg_" + SUFFIX, "true");
  }
}

// ---------- GASとの通信 ----------
// 1) fetch で、Googleのログイン情報(Cookie)を付けずに呼ぶ。スマホに複数のGoogleアカウントが入っていても、
//    「現在、ファイルを開くことができません」にならない。
// 2) だめなら、従来の JSONP(scriptタグ)でやり直す。
let pollSeq = 0, polling = false;
function gasGet(params, cb) {
  if (!gasReady()) { cb(null, "no-gas-url"); return; }
  const url = new URL(GAS_URL);
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
  url.searchParams.set("token", API_TOKEN);
  url.searchParams.set("_", Date.now() + "" + Math.floor(Math.random() * 1000));   // ブラウザのキャッシュで古い返事を使わないようにする
  let fin = false, fetchWhy = "";
  const finish = (r, why) => { if (fin) return; fin = true; cb(r, r ? "" : (fetchWhy ? fetchWhy + "/" : "") + (why || "")); };

  const viaScript = () => {
    const name = "__g" + (++pollSeq) + "_" + Math.floor(Math.random() * 1e6);
    const script = document.createElement("script");
    const u = new URL(url.toString());
    u.searchParams.set("callback", name);
    const cleanup = () => { try { delete window[name]; } catch (e) { window[name] = undefined; } script.remove(); };
    const timer = setTimeout(() => { cleanup(); finish(null, "script-timeout"); }, 15000);
    window[name] = r => { clearTimeout(timer); cleanup(); finish(r); };
    script.onerror = () => { clearTimeout(timer); cleanup(); finish(null, "script-error"); };
    script.src = u.toString();
    document.body.appendChild(script);
  };

  if (typeof fetch !== "function") { viaScript(); return; }
  const fu = new URL(url.toString());
  fu.searchParams.set("callback", "cb");
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 12000);
  fetch(fu.toString(), { credentials: "omit", cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
    .then(r => r.text())
    .then(t => {
      clearTimeout(timer);
      const m = t.match(/^[^({]*\(([\s\S]*)\)\s*;?\s*$/);       // cb({...}); の中身を取り出す
      let obj = null;
      try { obj = JSON.parse(m ? m[1] : t); } catch (e) { obj = null; }
      if (obj && typeof obj === "object") finish(obj); else { fetchWhy = "fetch-notjson"; viaScript(); }
    })
    .catch(e => { clearTimeout(timer); fetchWhy = "fetch-" + ((e && e.name) || "error"); viaScript(); });
}

// ---------- 状態の取得(1回で お知らせ+抽選受付+自分の状態 を取る) ----------
function pollStatus() {
  if (!gasReady() || polling || document.hidden) return;
  polling = true;
  const params = { action: "status" };
  if (isComplete()) params.participantId = getParticipantId();
  gasGet(params, res => { polling = false; if (res) applyStatus(res); });
}

// 景品所のQR(?lottery=1)を読んだ → くじの順番待ちに入る
const ENTER_MSG = {
  CLOSED: "くじは おわりました。",
  DUPLICATE: "くじは 1人 1回だけです。もう ひいています。",
  NOT_COMPLETE: "まだ 12こ そろっていません。スタンプを あつめてから、もう一度 よみとってください。",
  UNKNOWN_ID: "まだ きろくが とどいていません。少し まってから、もう一度 QRコードを よみとってください。"
};
function enterLottery() {
  if (isFinished()) { showMessage("くじは 1人 1回だけです。もう ひいています。", "warning"); return; }
  if (loadStamps().length < STAMP_TOTAL) { showMessage("まだ 12こ そろっていません。1〜12番の スタンプを あつめてから、景品引換所の 「13番」の QRコードを よみとってください。", "warning"); return; }
  sendComplete();                                   // 念のため、コンプリートを先に送る
  queueMsg = "順番まちに 入っています…"; queueDetail = "";
  renderBoard();
  const attempt = n => gasGet({ action: "enter", participantId: getParticipantId() }, (res, why) => {
    if (!res && n < 3) { setTimeout(() => attempt(n + 1), 2500); return; }       // 通信エラー → 数回やり直す
    if (res && res.ok && res.result === "OK") {
      queueInfo = { no: res.no, state: "waiting", lane: 0, ahead: res.ahead || 0 };
      queueMsg = "";
      showMessage(`くじの 順番まちに 入りました。受付番号は ${res.no}番 です。`, "success");
    } else if (res && res.result === "UNKNOWN_ID" && n < 3) {
      sendComplete(); setTimeout(() => attempt(n + 1), 3000); return;
    } else {
      queueDetail = why || (res && (res.result || res.error)) || "";   // 原因の目印(係の人が見る用)
      queueMsg = (res && ENTER_MSG[res.result]) || "つながりませんでした。電波の よい ところで、もう一度 QRコードを よみとってください。それでも だめな ときは、画面の QRコードを 係の 人に 見せてください。";
    }
    renderBoard();
    setTimeout(pollStatus, 3000);
  });
  attempt(0);
}

function applyStatus(res) {
  if (!res || res.ok !== true) return;
  // お知らせ(textContent で表示)
  const m = (res.messages || [])[0];
  if (m) {
    noticeBox.textContent = "";
    const t = document.createElement("strong");
    t.textContent = m.title || "お知らせ";
    noticeBox.append(t, document.createElement("br"), document.createTextNode(m.body || ""));
    noticeBox.className = "notice" + (m.priority === "high" ? " high" : "");
  } else {
    noticeBox.classList.add("hidden");
  }
  if (res.lottery && typeof res.lottery.open === "boolean") lotteryOpen = res.lottery.open;
  const me = res.me;
  if (me) {
    if (me.claimed) store(FINISHED_KEY, "true");
    if (me.completed) store(SYNCED_KEY, "true");
    queueInfo = me.queue && !me.claimed ? me.queue : null;
    if (queueInfo) queueMsg = "";
    else if (isComplete()) { drop(SYNCED_KEY); sendComplete(); }   // 届いていなければ再送
  }
  renderBoard();
  if (queueInfo && !queueInfo.lane) setTimeout(pollStatus, (queueInfo.state === "waiting" ? 8000 : 3500) + Math.random() * 2000);   // 順番(レーン)が決まるまで短い間隔で確認
}

function schedulePoll() {
  const base = isComplete() && !isFinished() ? 25000 : 90000;
  setTimeout(() => { pollStatus(); schedulePoll(); }, base * (0.8 + Math.random() * 0.4));
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(pollStatus, Math.random() * 1500); });

// ---------- URL の処理 ----------
function resetByAdminQr(token) {
  if (token !== RESET_TOKEN) { showMessage("この QRコードは 使えません。", "warning"); return; }
  [STORAGE_KEY, FINISHED_KEY, PARTICIPANT_KEY, INTRO_KEY, SYNCED_KEY, "festival_reg_" + SUFFIX].forEach(drop);
  showMessage("台紙を 最初に もどしました。", "success");
}

function handleUrlAction() {
  const params = new URLSearchParams(location.search);
  const stampToken = params.get("s"), reset = params.get("reset");
  if (reset) { resetByAdminQr(reset); cleanUrl(); return; }
  if (!stampToken) return;
  if (stampToken === VENUE_TOKEN) { cleanUrl(); wantEnter = true; return; }
  cleanUrl();
  acquireStamp(stampToken);
}

// スタンプを1つ取る(URLから来た場合も、ページ内カメラで読んだ場合も同じ処理)
function acquireStamp(token) {
  const info = STAMP_MAP.find(i => i.token === token);
  if (!info) { showMessage("この QRコードは スタンプラリーの ものでは ありません。", "warning"); return { status: "invalid" }; }
  if (isFinished()) { showMessage("くじは 1人 1回だけです。もう ひいています。", "warning"); return { status: "finished" }; }
  const stamps = loadStamps();
  if (stamps.some(s => s.id === info.number)) {
    showMessage(`${info.number}番の スタンプは もう あります。`, "warning");
    return { status: "dup", number: info.number };
  }
  stamps.push({ id: info.number, time: nowText() });
  saveStamps(stamps);
  lastNew = info.number;
  showMessage(`${info.number}番の スタンプを ゲット!`, "success");
  sendRegister();
  return { status: "new", number: info.number };
}
let lastNew = "";
let wantEnter = false;

// ---------- 描画 ----------
function showParticipantQr(pid) {
  if (qrShownFor === pid && participantQrArea.firstChild) return;
  qrShownFor = pid;
  participantQrArea.textContent = "";
  try {
    const qr = qrcode(0, "M");
    qr.addData(pid);
    qr.make();
    const holder = document.createElement("div");
    holder.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });   // 自前生成のSVGのみ
    participantQrArea.appendChild(holder);
  } catch (e) {
    const p = document.createElement("p"); p.textContent = "QRコードを 作れませんでした。参加者IDを 係の 人に 見せてください。";
    participantQrArea.appendChild(p);
  }
  const idp = document.createElement("p");
  idp.className = "qr-id"; idp.textContent = pid;
  participantQrArea.appendChild(idp);
}

function renderBoard() {
  const stamps = loadStamps(), finished = isFinished(), pid = getParticipantId();
  participantDisplay.textContent = "参加者ID:" + pid;
  stampBoard.textContent = "";
  for (const item of STAMP_MAP) {
    const slot = document.createElement("div");
    slot.className = "stamp-slot";
    slot.dataset.number = item.number;
    const stamp = stamps.find(s => s.id === item.number);
    if (stamp) {
      const img = document.createElement("img");
      img.src = `images/${item.image}`;
      img.alt = `${item.number}番のスタンプ`;
      const time = document.createElement("div");
      time.className = "stamp-time";
      time.textContent = stamp.time;
      slot.append(img, time);
      if (item.number === lastNew) slot.classList.add("pop");
    } else {
      slot.classList.add("empty");
    }
    stampBoard.appendChild(slot);
  }
  lastNew = "";

  const count = stamps.length;
  countText.textContent = `${count} / ${STAMP_TOTAL}`;
  progressBar.style.width = `${Math.min(100, count / STAMP_TOTAL * 100)}%`;
  completeArea.classList.add("hidden");
  closedArea.classList.add("hidden");
  finishedArea.classList.add("hidden");

  renderQueue();
  if (finished) {
    completeText.textContent = "くじは おわり";
    finishedArea.classList.remove("hidden");
  } else if (count >= STAMP_TOTAL) {
    if (lotteryOpen) {
      completeText.textContent = "コンプリート!";
      completeArea.classList.remove("hidden");
      showParticipantQr(pid);
      if (!queueInfo && !queueMsg) showMessage("コンプリート! 景品引換所の 「13番」の QRコードを スマホの カメラで よみとると、くじの 順番まちに 入れます。", "success");
      sendComplete();
    } else {
      completeText.textContent = "コンプリート!";
      closedArea.classList.remove("hidden");
      showMessage("コンプリート おめでとう! くじは おわりました。", "warning");
      sendComplete();     // 記録は残す
    }
  } else {
    completeText.textContent = `あと ${STAMP_TOTAL - count}こ`;
  }
}

// ---------- くじの順番待ち表示 ----------
function renderQueue() {
  const box = $("queueArea");
  if (!box) return;
  box.textContent = "";
  const q = queueInfo;
  if (isFinished() || (!q && !queueMsg) || loadStamps().length < STAMP_TOTAL) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const h = document.createElement("h2"); h.textContent = "くじの 順番まち";
  box.appendChild(h);
  if (q) {
    const n = document.createElement("p"); n.className = "queue-no"; n.textContent = "受付番号 " + q.no;
    const m = document.createElement("p");
    if (q.lane) {
      m.textContent = q.lane === 9 ? "会場に 入って、くじ引き機の 列に ならんでください。画面に 受付番号が 出たら、あなたの 番です。"
        : "会場に 入って、くじ引き機 " + (q.lane === 1 ? "①(スペースキー・青)" : "②(マウスの クリック・オレンジ)") + " の 列に ならんでください。画面に 受付番号が 出たら、あなたの 番です。";
    } else if (q.state === "waiting" && q.ahead > 0) {
      m.textContent = "いま 会場が いっぱいです。階段で 2列に ならんで まってください。あなたの 前に " + q.ahead + " 人 います。順番に なると、この 画面が かわります。";
    } else if (q.state === "waiting") {
      m.textContent = "もうすぐ 会場に 入れます。入口の 近くで まってください。";
    } else {
      m.textContent = "順番を きめています。少し まってね…";
    }
    box.append(n, m);
    if (q.state === "taken") {
      const b = document.createElement("button"); b.type = "button"; b.className = "queue-again";
      b.textContent = "列から はずれた ときは、ここを おして もう一度 ならぶ";
      b.addEventListener("click", () => { queueInfo = null; enterLottery(); });
      box.appendChild(b);
    }
  } else {
    const m = document.createElement("p"); m.textContent = queueMsg; box.appendChild(m);
    if (queueDetail) { const d = document.createElement("p"); d.className = "note"; d.textContent = "(係の 人へ: " + queueDetail + ")"; box.appendChild(d); }
  }
}

// 日が変わっていたら(前日までの台紙が残っていたら)、スタンプ・コンプリート・参加者IDを消して最初から始める
function resetIfNewDay() {
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  if (load(DAY_KEY) === today) return;
  const hadData = !!(load(STORAGE_KEY) || load(PARTICIPANT_KEY));
  [STORAGE_KEY, FINISHED_KEY, PARTICIPANT_KEY, SYNCED_KEY, INTRO_KEY, "festival_reg_" + SUFFIX].forEach(drop);   // あそびかたも、もう一度出す
  store(DAY_KEY, today);
  if (hadData) showMessage("あたらしい 日に なったので、台紙を 最初から にしました。", "info");
}
resetIfNewDay();
getParticipantId();
handleUrlAction();
renderBoard();
if (wantEnter) enterLottery();
showIntroOnce();
setTimeout(pollStatus, 300 + Math.random() * 1200);
schedulePoll();
