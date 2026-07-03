<script>
// =====================================================================
// app_complete.js — 完全版
// 修正点：
//   1. GAS_URL を最新の再デプロイ後URLに更新してください（下記★）
//   2. fetchGAS() ヘルパーで CORS 対策（no-cors / redirect対応）
//   3. loadLiveCivicVision() → visionHistory から AI生成Visionを表示
//   4. PRページ統合過程の表示を強化
// =====================================================================

// ★ GASを再デプロイしたら、新しいURLに必ず書き換えてください
const GAS_URL = "https://script.google.com/macros/s/AKfycbxH4jE2lWyxAry1wi6i7bKuCID5CFZC2NakcFXUJOlNTJA8e3vAcHHXSMhvbBvdIwE2/exec";

const OTHER_LABEL = "その他";

const MAIN_CATEGORIES = [
  { key:"①", icon:"🏫", label:"芦屋市の価値向上（ブランド・移住促進）", keyword:"価値向上",
    subs:[ {label:"次世代教育ブランドの確立"}, {label:"街の魅力化・景観美化"}, {label:"市民協働"} ] },
  { key:"②", icon:"❤️", label:"市民へのベネフィット（ウェルビーイング）", keyword:"ベネフィット",
    subs:[ {label:"多世代交流・サードプレイス"}, {label:"知的探究・スキルアップ"} ] },
  { key:"③", icon:"💰", label:"財政的持続可能性", keyword:"財政的",
    subs:[ {label:"施設の収益化"}, {label:"寄付・ふるさと納税"} ] },
  { key:"④", icon:"🏛", label:"施設の戦略性", keyword:"戦略性",
    subs:[ {label:"知のゲートウェイ化"}, {label:"イノベーション・起業支援"} ] },
  { key:"⑤", icon:"🛡", label:"都市の強靭性とガバナンス", keyword:"強靭性",
    subs:[ {label:"デュアルユース"} ] }
];

function findMain(text) {
  if (!text) return MAIN_CATEGORIES[0];
  for (const m of MAIN_CATEGORIES) {
    if (text.includes(m.keyword) || text.includes(m.label)) return m;
  }
  for (const m of MAIN_CATEGORIES) {
    if (text.includes(m.key)) return m;
  }
  return MAIN_CATEGORIES[0];
}

// =====================================================================
// ★ fetchGAS — GET / POST 共通ヘルパー
//   GASはPOSTでCORSプリフライトが通らないため
//   POST も URLパラメータ付きGETで回避する方式を採用
// =====================================================================
// =====================================================================
// ★ GAS通信 — 根本解決版
//
// 問題の原因：
//   analyze/summarize/saveはリクエストデータが長く、
//   JSONPのGETパラメータに乗せるとURLが2000文字超えてGASがエラーを返す
//
// 解決策：
//   短いリクエスト（list, visionHistory）→ JSONP（CORSなし）
//   長いリクエスト（analyze, summarize, save）→ fetch POST text/plain
//   ※ Content-Type: text/plain はプリフライトが発生しないのでCORSを回避できる
//   ※ JSONPが失敗した場合もPOSTにフォールバック
// =====================================================================

let _gasCallbackId = 0;

// 短いGETリクエスト用（list, visionHistory）→ JSONP
function callGAS(mode, dataObj) {
  const dataStr = dataObj ? JSON.stringify(dataObj) : "";

  // ★ データが長い場合は即POSTへ
  if (dataStr.length > 500) {
    return postGAS(dataObj || { mode });
  }

  return new Promise((resolve, reject) => {
    const cbName = "_gasCb" + (++_gasCallbackId);

    const timer = setTimeout(() => {
      delete window[cbName];
      const s = document.getElementById(cbName);
      if (s) s.remove();
      reject(new Error("タイムアウト（30秒）"));
    }, 30000);

    window[cbName] = (data) => {
      clearTimeout(timer);
      delete window[cbName];
      const s = document.getElementById(cbName);
      if (s) s.remove();
      resolve(data);
    };

    let url = GAS_URL
      + "?callback=" + encodeURIComponent(cbName)
      + "&mode="     + encodeURIComponent(mode || "");
    if (dataStr) {
      url += "&data=" + encodeURIComponent(dataStr);
    }

    const script    = document.createElement("script");
    script.id       = cbName;
    script.src      = url;
    script.onerror  = () => {
      clearTimeout(timer);
      delete window[cbName];
      script.remove();
      // ★ JSONPが失敗したらPOSTにフォールバック（根本解決）
      console.warn("JSONP失敗 → POSTにフォールバック:", mode);
      postGAS(dataObj || { mode }).then(resolve).catch(reject);
    };
    document.head.appendChild(script);
  });
}

// ★ 長いリクエスト用（analyze, summarize, save）→ fetch POST text/plain
// Content-Type: text/plain はCORSプリフライトが発生しないため確実に通る
async function postGAS(payload) {
  try {
    const res = await fetch(GAS_URL, {
      method  : "POST",
      headers : { "Content-Type": "text/plain;charset=utf-8" },
      body    : JSON.stringify(payload),
      redirect: "follow"
    });

    if (!res.ok) throw new Error("HTTP " + res.status);

    const text = await res.text();
    if (!text || text.trim() === "") throw new Error("空のレスポンス");

    // HTMLが返ってきた場合（GASのリダイレクトエラー）を検出
    if (text.trim().startsWith("<!")) {
      throw new Error("GASがHTMLを返しました。再デプロイを確認してください。");
    }

    return JSON.parse(text);
  } catch(e) {
    console.error("postGASエラー:", e.message);
    throw e;
  }
}

// 後方互換ラッパー
async function fetchGAS(params) {
  return callGAS(params.mode);
}

// =====================================================================
// 状態管理
// =====================================================================
let currentIdeaText   = "";
let currentAIResult   = "";
let currentSummary200 = "";
let currentTitle      = "";
let currentMain       = "";
let currentSub        = "";
let cachedRows        = [];
let lastPostedTitle   = "";
let lastPostedMain    = "";
let lastPostedSub     = "";

// =====================================================================
// ページ切り替え
// =====================================================================
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");
  window.scrollTo({ top:0, behavior:"smooth" });

  if (pageId === "pullrequest") loadPRList();
  if (pageId === "tree")        { initTreeBoards(); loadTreeData(); }
  if (pageId === "analysis")    loadAnalysisData();
  // visionページはボタン押下時のみloadLiveCivicVisionを呼ぶ（自動ロードしない）
}

// =====================================================================
// 分析ページ
// =====================================================================
async function loadAnalysisData() {
  const totalEl   = document.getElementById("analysisTotalCount");
  const mergedEl  = document.getElementById("analysisMergedCount");
  const topEl     = document.getElementById("analysisTopTheme");
  const barsArea  = document.getElementById("analysisBarsArea");
  const alignArea = document.getElementById("alignmentBarsArea");

  try {
    if (cachedRows.length === 0) {
      const data = await fetchGAS({ mode:"list" });
      if (Array.isArray(data)) cachedRows = data;
    }
    const rows   = cachedRows;
    const total  = rows.length;
    const merged = rows.filter(r => r.status === "統合" || r.status === "新分類統合").length;

    const counts = {};
    MAIN_CATEGORIES.forEach(m => counts[m.label] = 0);
    rows.forEach(r => {
      const m = findMain(r.main || r.category);
      counts[m.label] = (counts[m.label] || 0) + 1;
    });
    const topEntry = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];

    if (totalEl)  totalEl.innerHTML  = total  + '<span style="font-size:14px;font-weight:400;color:#64748b;">件</span>';
    if (mergedEl) mergedEl.innerHTML = merged + '<span style="font-size:14px;font-weight:400;color:#64748b;">件</span>';
    if (topEl)    topEl.textContent  = topEntry ? topEntry[0].split("（")[0] : "―";

    if (barsArea) {
      if (total === 0) {
        barsArea.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">まだ投稿がありません</p>';
      } else {
        barsArea.innerHTML = '<h3 style="margin-bottom:12px;">大分類別の投稿割合</h3>';
        MAIN_CATEGORIES.forEach(m => {
          const cnt = counts[m.label] || 0;
          const pct = Math.round(cnt / total * 100);
          barsArea.innerHTML +=
            '<div class="analysis-bar-row">' +
            '<div class="analysis-bar-label">' + m.icon + ' ' + m.label.split("（")[0] + '</div>' +
            '<div class="analysis-bar-bg"><div class="analysis-bar-fill" style="width:' + pct + '%;"></div></div>' +
            '<div class="analysis-bar-pct">' + pct + '%（' + cnt + '件）</div></div>';
        });
      }
    }

    const visionIdeal = [20, 25, 20, 20, 15];
    if (alignArea) {
      alignArea.innerHTML = "";
      MAIN_CATEGORIES.forEach((m, i) => {
        const actual   = total > 0 ? Math.round((counts[m.label] || 0) / total * 100) : 0;
        const ideal    = visionIdeal[i];
        const alignPct = ideal > 0 ? Math.min(100, Math.round(actual / ideal * 100)) : 0;
        const barColor = alignPct >= 80 ? "#10b981" : alignPct >= 50 ? "#f59e0b" : "#ef4444";
        alignArea.innerHTML +=
          '<div class="alignment-bar-row">' +
          '<div class="alignment-bar-label">' + m.icon + ' ' + m.label.split("（")[0] + '</div>' +
          '<div class="analysis-bar-bg"><div class="analysis-bar-fill" style="width:' + alignPct + '%;background:' + barColor + ';"></div></div>' +
          '<div class="alignment-pct">' + alignPct + '%</div></div>';
      });
    }
  } catch(e) {
    console.error("分析データ読み込み失敗", e);
    if (barsArea)  barsArea.innerHTML  = '<p style="color:#dc2626;">データ取得失敗: ' + e.message + '</p>';
    if (alignArea) alignArea.innerHTML = "";
  }
}

// =====================================================================
// ★ Civic Vision ライブ表示
//   visionHistory から AIが生成した最新Visionを取得して表示
//   投稿数の多数決ではなく、設計ウェイト×投稿比率×AI質的判断の結果を使う
// =====================================================================
async function loadLiveCivicVision() {
  const liveText   = document.getElementById("visionLiveText");
  const liveIllust = document.getElementById("visionLiveIllust");
  const versionEl  = document.getElementById("visionLiveVersion");
  const compareEl  = document.getElementById("visionCompareArea");

  if (!liveText) return;

  // ★ スクロールしない：in-placeで表示を更新するだけ
  liveText.innerHTML = '<span style="color:var(--color-text-secondary);font-size:14px;">市民の投稿データを読み込み中…</span>';
  if (versionEl) versionEl.innerHTML = "";

  // ★ デモデータ（VisionHistoryが空の場合に表示するサンプル）
  const DEMO_HISTORY = [
    {
      version   : "v1（最新）",
      timestamp : "2025年6月末",
      totalPosts: 12,
      visionText:
        "駅前公共施設を、単なる利用の場ではなく、市民の学び・挑戦・交流が自然に芽生え育っていく"成長する拠点"へ転換する。特に子育て世代からの声が多く集まっており、子どもから高齢者まで多世代が気軽に立ち寄れるサードプレイスとしての機能が期待されている。市民とともに育て、芦屋の価値を静かに、しかし確実に積み上げていく。",
      reason    :
        "投稿12件のうち、ウェルビーイング分野（多世代交流・サードプレイス）への関心が最も高く、設計ウェイトとのバランスを考慮してこの部分を強調する形でVisionを更新しました。"
    },
    {
      version   : "v0（初期）",
      timestamp : "プラットフォーム開設時",
      totalPosts: 0,
      visionText:
        "駅前公共施設を、単なる利用の場ではなく、市民の学び・挑戦・交流が自然に芽生え、広がり、街の魅力を育てていく"成長する拠点"へと転換する。行政が一方的に提供する施設ではなく、市民とともに育て、市民の力が循環し、芦屋の価値が静かに、しかし確実に積み上がっていく"まちの育ち場"として再構築する。",
      reason    : "初期設定のCivic Vision（プラットフォーム開設時）"
    }
  ];

  try {
    // visionHistoryを取得（失敗してもデモにフォールバック）
    // ★ 画面のウェイト入力値を取得してVision生成に反映
    const customWeights = {
      "①": parseInt(document.getElementById("w1")?.value) || 20,
      "②": parseInt(document.getElementById("w2")?.value) || 25,
      "③": parseInt(document.getElementById("w3")?.value) || 20,
      "④": parseInt(document.getElementById("w4")?.value) || 20,
      "⑤": parseInt(document.getElementById("w5")?.value) || 15,
    };
    const weightTotal = Object.values(customWeights).reduce((a,b)=>a+b,0);
    if (weightTotal !== 100) {
      if (liveText) {
        liveText.style.display = "block";
        liveText.innerHTML = '<div style="color:#dc2626;background:#fee2e2;border-radius:8px;padding:12px 14px;font-size:14px;">⚠️ ウェイトの合計が ' + weightTotal + ' pt です。合計が100になるよう調整してください。</div>';
      }
      return;
    }

    let data = [];
    try {
      data = await callGAS("visionHistory");
      if (!Array.isArray(data) || data.length === 0) throw new Error("empty");
    } catch(e) {
      console.warn("visionHistory取得失敗。デモデータで表示します:", e.message);
      data = DEMO_HISTORY;
    }

    const latest = data[0];
    const prev   = data.length > 1 ? data[1] : null;

    // ★ ボタン押下後にコンテンツエリアを表示
    liveText.style.display = "block";
    if (liveIllust) liveIllust.style.display = "flex";
    if (versionEl) { versionEl.style.display = "block"; versionEl.style.minHeight = "22px"; }

    // ★ Vision本文を表示（デモか実データかに関わらず同じ処理）
    liveText.innerHTML =
      '<div style="font-size:15px;line-height:1.9;color:var(--color-text-primary);margin-bottom:14px;">' +
        latest.visionText +
      '</div>' +
      (latest.reason
        ? '<div style="font-size:13px;background:var(--color-background-success);border-radius:8px;' +
          'padding:10px 14px;border-left:3px solid var(--color-border-success);line-height:1.7;color:var(--color-text-success);">' +
          '<strong>このVisionになった理由：</strong><br>' + latest.reason + '</div>'
        : '');

    // バージョン・更新日・投稿数
    if (versionEl) {
      const isDemolatest = (latest === DEMO_HISTORY[0] && data === DEMO_HISTORY);
      versionEl.innerHTML =
        '<span style="background:var(--color-background-success);color:var(--color-text-success);' +
        'padding:2px 10px;border-radius:999px;font-size:12px;font-weight:500;margin-right:8px;">' +
        latest.version + '</span>' +
        '<span style="font-size:12px;color:var(--color-text-secondary);">' +
        latest.timestamp + '　投稿総数 ' + latest.totalPosts + ' 件をもとに生成</span>' +
        (isDemolatest
          ? '<span style="font-size:11px;color:var(--color-text-warning);margin-left:8px;">（デモ表示）</span>'
          : '');
    }

    // before/after 比較（前バージョンがある場合）
    if (compareEl && prev) {
      compareEl.style.display = "block";
      compareEl.innerHTML =
        '<h4 style="font-size:14px;font-weight:500;color:var(--color-text-primary);margin-bottom:12px;">' +
        '前回（' + prev.version + '）との比較</h4>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
          '<div style="border-radius:12px;padding:14px;background:var(--color-background-secondary);border:.5px solid var(--color-border-tertiary);">' +
            '<div style="font-size:11px;font-weight:500;color:var(--color-text-secondary);margin-bottom:8px;">▼ 前回 ' + prev.version + '</div>' +
            '<div style="font-size:13px;line-height:1.8;color:var(--color-text-secondary);">' + prev.visionText.substring(0,80) + '…</div>' +
          '</div>' +
          '<div style="border-radius:12px;padding:14px;background:var(--color-background-success);border:.5px solid var(--color-border-success);">' +
            '<div style="font-size:11px;font-weight:500;color:var(--color-text-success);margin-bottom:8px;">✅ 最新 ' + latest.version + '</div>' +
            '<div style="font-size:13px;line-height:1.8;color:var(--color-text-primary);">' + latest.visionText.substring(0,80) + '…</div>' +
          '</div>' +
        '</div>';
    } else if (compareEl) {
      compareEl.style.display = "none";
    }

    if (liveIllust) liveIllust.innerHTML = "🌳";

  } catch(e) {
    if (liveText) liveText.innerHTML =
      '<span style="color:var(--color-text-danger);">データの読み込みに失敗しました（' + e.message + '）</span>';
    console.error("loadLiveCivicVision エラー:", e);
  }
}

// 管理者用：手動でCivic Visionを今すぐ更新
async function adminUpdateVision() {
  const btn = document.getElementById("btnAdminUpdate");
  if (btn) { btn.disabled = true; btn.textContent = "更新中…"; }
  try {
    const data = await postGAS({ mode:"updateVision" });
    alert(data.message || "Civic Visionを更新しました");
    cachedRows = [];
    await loadLiveCivicVision();
  } catch(e) {
    alert("更新失敗: " + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "🔄 今すぐVisionを更新（管理者）"; }
  }
}

// =====================================================================
// Policy Logic Tree
// =====================================================================
function initTreeBoards() {
  const area = document.getElementById("treeMainBoards");
  if (!area) return;
  area.innerHTML = "";
  MAIN_CATEGORIES.forEach((m, idx) => {
    const board = document.createElement("div");
    board.className = "tree-board";
    board.id = "treeBoard_" + idx;
    board.innerHTML =
      '<div class="tree-board-icon">' + m.icon + '</div>' +
      '<div class="tree-board-key">' + m.key + '</div>' +
      '<div class="tree-board-label">' + m.label + '</div>' +
      '<span class="tree-board-count" id="treeBoardCount_' + idx + '">0</span>';
    board.onclick = () => showTreeDetail(idx);
    area.appendChild(board);
  });
}

async function loadTreeData() {
  try {
    const data = await fetchGAS({ mode:"list" });
    if (Array.isArray(data)) cachedRows = data;
  } catch(e) { console.error("ツリーデータ取得失敗", e); }

  MAIN_CATEGORIES.forEach((m, idx) => {
    const cnt   = cachedRows.filter(r => findMain(r.main || r.category).key === m.key).length;
    const badge = document.getElementById("treeBoardCount_" + idx);
    if (badge) badge.textContent = cnt;
  });
}

function showTreeDetail(mainIndex) {
  document.querySelectorAll(".tree-board").forEach((b, i) =>
    b.classList.toggle("active", i === mainIndex));

  const m    = MAIN_CATEGORIES[mainIndex];
  const area = document.getElementById("treeDetailArea");
  if (!area) return;
  area.style.display = "block";

  const mainPosts = cachedRows.filter(r => findMain(r.main || r.category).key === m.key);

  area.innerHTML =
    '<div class="tree-detail-title">' + m.icon + ' ' + m.key + ' ' + m.label +
    ' <span style="font-size:13px;font-weight:400;color:#64748b;margin-left:8px;">計' + mainPosts.length + '件</span></div>';

  const allSubs = new Set([...m.subs.map(s => s.label), OTHER_LABEL]);
  mainPosts.forEach(r => { if (r.sub) allSubs.add(r.sub); });

  allSubs.forEach(subLabel => {
    const subPosts = mainPosts.filter(r => (r.sub || OTHER_LABEL) === subLabel);
    const block    = document.createElement("div");
    block.className = "tree-sub-block";

    const header = document.createElement("div");
    header.className = "tree-sub-header";
    header.innerHTML =
      '<span>' + subLabel + '</span>' +
      '<span><span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:999px;font-size:12px;margin-right:8px;">' +
      subPosts.length + '件</span><span class="tree-acc-arrow">▼</span></span>';

    const body = document.createElement("div");
    body.className = "tree-item-list";
    body.style.display = "none";

    if (!subPosts.length) {
      body.innerHTML = '<p style="font-size:13px;color:#94a3b8;padding:8px 0;">まだ投稿がありません</p>';
    } else {
      subPosts.forEach(r => {
        const borderColor = r.status === "統合" ? "#2563eb"
          : r.status === "新分類統合" ? "#8b5cf6"
          : r.status === "統合済み"   ? "#94a3b8" : "#dc2626";
        const statusLabel = r.status === "統合" ? "🔵 統合済み"
          : r.status === "新分類統合" ? "🟣 新分類"
          : r.status === "統合済み"   ? "⚫ 処理済み" : "🔴 未統合";

        const chip = document.createElement("div");
        chip.className = "tree-post-chip";
        chip.style.borderLeftColor = borderColor;

        const titleRow = document.createElement("div");
        titleRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
        titleRow.innerHTML =
          '<strong>' + (r.title || "(無題)") + '</strong>' +
          '<span style="font-size:11px;font-weight:700;color:' + borderColor + ';">' + statusLabel + '</span>';

        const sumDiv = document.createElement("div");
        sumDiv.className = "tree-post-summary";
        sumDiv.textContent = r.summary200 || "(要約なし)";
        if (r.mergedInto) {
          const note = document.createElement("div");
          note.className = "tree-merged-note";
          note.innerHTML = "📎 この投稿は「<strong>" + r.mergedInto + "</strong>」に統合されました";
          sumDiv.appendChild(note);
        }

        chip.appendChild(titleRow);
        chip.appendChild(sumDiv);
        let isOpen = false;
        chip.onclick = () => {
          isOpen = !isOpen;
          sumDiv.style.display = isOpen ? "block" : "none";
          chip.classList.toggle("open", isOpen);
        };
        body.appendChild(chip);
      });
    }

    header.onclick = () => {
      const open = body.style.display === "block";
      body.style.display = open ? "none" : "block";
      header.querySelector(".tree-acc-arrow").textContent = open ? "▼" : "▲";
    };
    block.appendChild(header);
    block.appendChild(body);
    area.appendChild(block);
  });

  setTimeout(() => area.scrollIntoView({ behavior:"smooth", block:"start" }), 50);
}

// =====================================================================
// PR PAGE
// =====================================================================
async function loadPRList() {
  const prList = document.getElementById("prList");
  if (!prList) return;
  prList.innerHTML = '<div class="pr-loading">読み込み中…</div>';

  try {
    const rows = await fetchGAS({ mode:"list" });
    if (rows.error) throw new Error(rows.error);
    cachedRows = Array.isArray(rows) ? rows : [];
    renderPRList(cachedRows);
    if (lastPostedTitle) showTrackBanner();
  } catch(e) {
    prList.innerHTML = '<div class="pr-error">取得に失敗しました（' + e.message + '）<br>' +
      '<strong>GASを再デプロイして新しいURLをGAS_URLに設定してください。</strong></div>';
  }
}

function showTrackBanner() {
  const banner = document.getElementById("prTrackBanner");
  const text   = document.getElementById("prTrackText");
  if (!banner || !text) return;
  const mainObj = findMain(lastPostedMain);
  text.innerHTML =
    '「<strong>' + lastPostedTitle + '</strong>」を投稿しました。' +
    '<br><span style="font-size:12px;color:#93c5fd;">' +
    mainObj.label.split("（")[0] + ' › ' + lastPostedSub + '</span>';
  banner.style.display = "flex";
  // ★ 自動的に該当箇所を展開してスクロール
  setTimeout(() => autoExpandMyPost(), 600);
}

// ★ 投稿後に自動で該当大分類・中分類を展開してハイライト
function autoExpandMyPost() {
  if (!lastPostedTitle) return;
  const mainObj = findMain(lastPostedMain);

  document.querySelectorAll(".pr-main-board").forEach(board => {
    const titleEl = board.querySelector(".pr-main-title");
    if (!titleEl || !titleEl.textContent.includes(mainObj.label.split("（")[0])) return;

    // 大分類を展開
    const subArea = board.querySelector(".pr-sub-area");
    const arrow   = board.querySelector(".pr-accordion-arrow");
    if (subArea) { subArea.style.display = "block"; }
    if (arrow)   { arrow.classList.add("open"); }

    // 中分類を展開
    board.querySelectorAll(".pr-sub-board").forEach(subBoard => {
      const nameEl = subBoard.querySelector(".pr-sub-name");
      if (!nameEl) return;
      const subName = nameEl.textContent.trim();
      if (subName !== lastPostedSub && subName !== "その他") return;

      const titleListArea = subBoard.querySelector(".pr-title-list-area");
      const subHint       = subBoard.querySelector(".pr-sub-hint");
      if (titleListArea) { titleListArea.style.display = "block"; }
      if (subHint)       { subHint.textContent = "閉じる ▲"; }
      subBoard.classList.add("active");

      // ★ 自分の投稿タイトルを見つけてハイライト
      if (titleListArea) {
        titleListArea.querySelectorAll(".pr-title-btn").forEach(btn => {
          const txtEl = btn.querySelector(".pr-title-btn-text");
          if (!txtEl) return;
          if (txtEl.textContent.includes(lastPostedTitle) ||
              lastPostedTitle.includes(txtEl.textContent.trim())) {
            // ハイライト
            btn.style.background = "#fefce8";
            btn.style.borderLeftColor = "#f59e0b";
            btn.style.boxShadow = "0 0 0 2px #f59e0b";
            // 自動的にクリックして要約を開く
            setTimeout(() => { btn.click(); }, 300);
          }
        });
      }

      // スクロール
      setTimeout(() => subBoard.scrollIntoView({ behavior:"smooth", block:"center" }), 400);
    });
  });
}

function scrollToMyPost() {
  if (!lastPostedTitle) return;
  const mainObj = findMain(lastPostedMain);
  document.querySelectorAll(".pr-main-board").forEach(board => {
    const titleEl = board.querySelector(".pr-main-title");
    if (titleEl && titleEl.textContent.includes(mainObj.label.split("（")[0])) {
      const subArea = board.querySelector(".pr-sub-area");
      if (subArea && subArea.style.display !== "block") {
        subArea.style.display = "block";
        const arrow = board.querySelector(".pr-accordion-arrow");
        if (arrow) arrow.classList.add("open");
      }
      board.scrollIntoView({ behavior:"smooth", block:"start" });
    }
  });
}

function renderPRList(rows) {
  const prList = document.getElementById("prList");
  prList.innerHTML = "";

  const processed  = rows.filter(r => r.status === "統合済み" || r.status === "新分類統合").length;
  const totalCount = rows.length;
  if (processed > 0) {
    const notice = document.createElement("div");
    notice.className = "pr-count-notice";
    notice.innerHTML =
      '📊 総保存件数：<strong>' + totalCount + '件</strong>（うち元投稿として保持 ' +
      processed + ' 件。統合・未統合の代表記事：<strong>' + (totalCount - processed) + '件</strong>）';
    prList.appendChild(notice);
  }

  MAIN_CATEGORIES.forEach(m => {
    const mainPosts  = rows.filter(r => findMain(r.main || r.category).key === m.key);
    const mainBoard  = document.createElement("div");
    mainBoard.className = "pr-main-board";

    const mainHeader = document.createElement("div");
    mainHeader.className = "pr-main-header";
    mainHeader.innerHTML =
      '<span class="pr-main-title">' + m.icon + ' ' + m.key + ' ' + m.label + '</span>' +
      '<span class="pr-main-meta"><span class="count-badge">' + mainPosts.length +
      '件</span><span class="pr-accordion-arrow">▼</span></span>';

    const subArea = document.createElement("div");
    subArea.className = "pr-sub-area";
    const subGrid = document.createElement("div");
    subGrid.className = "pr-sub-grid";

    const allSubs = new Set([...m.subs.map(s => s.label), OTHER_LABEL]);
    mainPosts.forEach(r => { if (r.sub) allSubs.add(r.sub); });

    allSubs.forEach(subLabel => {
      const subPosts = mainPosts.filter(r => (r.sub || OTHER_LABEL) === subLabel);
      const subBoard = document.createElement("div");
      subBoard.className = "pr-sub-board" + (subPosts.length ? " has-posts" : "");

      const subInner = document.createElement("div");
      subInner.className = "pr-sub-header-inner";
      subInner.innerHTML =
        '<span class="pr-sub-name">' + subLabel + '</span>' +
        '<span class="count-badge ' + (subPosts.length ? "" : "zero") + '">' + subPosts.length + '</span>';

      const subHint = document.createElement("div");
      subHint.className = "pr-sub-hint";
      subHint.textContent = subPosts.length ? "クリックして投稿一覧を見る ▼" : "まだ投稿がありません";

      const titleListArea = document.createElement("div");
      titleListArea.className = "pr-title-list-area";
      titleListArea.style.display = "none";

      const summaryPanel = document.createElement("div");
      summaryPanel.className = "pr-summary-panel";
      summaryPanel.style.display = "none";

      // 表示順：統合記事 → 未統合 → 元投稿
      const mergedRows   = subPosts.filter(r => r.status === "統合");
      const unmergedRows = subPosts.filter(r => r.status !== "統合" && r.status !== "統合済み" && r.status !== "新分類統合");
      const sourceRows   = subPosts.filter(r => r.status === "統合済み" || r.status === "新分類統合");
      const displayOrder = [...mergedRows, ...unmergedRows, ...sourceRows];

      displayOrder.forEach(row => {
        const isMergedResult = row.status === "統合";
        const isMergedSource = row.status === "統合済み" || row.status === "新分類統合";
        const borderColor    = isMergedResult ? "#2563eb" : isMergedSource ? "#94a3b8" : "#dc2626";
        const statusLabel    = isMergedResult ? "🔵 統合記事" : isMergedSource ? "⚫ 元の投稿" : "🔴 未統合";

        const titleBtn = document.createElement("div");
        titleBtn.className = "pr-title-btn";
        titleBtn.style.borderLeftColor = borderColor;
        titleBtn.innerHTML =
          '<span class="pr-title-btn-text">' + (row.title || "(無題)") + '</span>' +
          '<span class="pr-title-btn-status" style="color:' + borderColor + ';">' + statusLabel + '</span>';

        titleBtn.onclick = (ev) => {
          ev.stopPropagation();

          const badgeBg = isMergedResult ? "#dbeafe" : isMergedSource ? "#e2e8f0" : "#fee2e2";
          const badgeFg = isMergedResult ? "#1e40af" : isMergedSource ? "#64748b" : "#dc2626";

          let html =
            '<div class="pr-summary-close" onclick="this.closest(\'.pr-summary-panel\').style.display=\'none\'">✕ 閉じる</div>' +
            '<h3 class="pr-summary-title">' + (row.title || "(無題)") + '</h3>' +
            '<div style="margin-bottom:10px;"><span style="font-size:12px;font-weight:700;padding:3px 10px;' +
            'border-radius:999px;background:' + badgeBg + ';color:' + badgeFg + ';">' + statusLabel + '</span></div>' +
            '<div class="pr-summary-body">' + (row.summary200 || "（要約なし）") + '</div>';

          // ★ 統合記事：統合過程を詳細表示
          if (isMergedResult) {
            const origPosts = subPosts.filter(r2 => r2.mergedInto === row.title);
            // fullTextに統合記録が入っている場合
            const hasRecord = row.fullText && row.fullText.includes("【統合記録】");

            if (origPosts.length > 0 || hasRecord) {
              html +=
                '<div class="pr-merge-detail">' +
                '<div class="pr-merge-detail-header">🔗 統合の過程</div>' +
                '<div class="pr-merge-detail-body">';

              // 元の投稿を列挙
              if (origPosts.length > 0) {
                html += '<div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:6px;">統合された元の投稿：</div>';
                origPosts.forEach((op, idx) => {
                  html +=
                    '<div class="pr-merge-row">' +
                    '<span class="pr-merge-label">元の投稿 ' + (idx+1) + '</span>' +
                    '<span class="pr-merge-text">「' + (op.title || "(無題)") + '」<br>' +
                    '<span style="font-size:12px;color:#64748b;">' + (op.summary200 || "") + '</span></span>' +
                    '</div>';
                });
              }

              // 統合記録（採用理由）
              if (hasRecord) {
                const record = row.fullText.replace("【統合記録】", "").trim();
                html +=
                  '<div class="pr-merge-row" style="margin-top:8px;">' +
                  '<span class="pr-merge-label">統合の根拠</span>' +
                  '<span class="pr-merge-text">' + record + '</span>' +
                  '</div>';
              }

              html += '</div></div>';
            } else {
              // 元投稿が見つからない場合でも説明を表示
              html +=
                '<div class="pr-merged-note" style="background:#dbeafe;border-left-color:#2563eb;color:#1e40af;">' +
                '🔵 この記事は複数の投稿をAIが統合したものです。' +
                '元の投稿は「⚫ 元の投稿」として同じ分類内に保存されています。</div>';
            }
          }

          // 元の投稿：統合先を表示
          if (isMergedSource && row.mergedInto) {
            html +=
              '<div class="pr-merged-note">📎 この投稿は「<strong>' + row.mergedInto +
              '</strong>」に統合されました</div>';
          }

          summaryPanel.innerHTML = html;
          summaryPanel.style.display = "block";

          titleListArea.querySelectorAll(".pr-title-btn").forEach(b => b.classList.remove("active"));
          titleBtn.classList.add("active");
          setTimeout(() => summaryPanel.scrollIntoView({ behavior:"smooth", block:"nearest" }), 50);
        };

        titleListArea.appendChild(titleBtn);
      });

      titleListArea.appendChild(summaryPanel);

      subBoard.onclick = (ev) => {
        if (!subPosts.length) return;
        const open = titleListArea.style.display === "block";
        titleListArea.style.display = open ? "none" : "block";
        if (open) summaryPanel.style.display = "none";
        subHint.textContent = open ? "クリックして投稿一覧を見る ▼" : "閉じる ▲";
        subBoard.classList.toggle("active", !open);
      };

      subBoard.appendChild(subInner);
      subBoard.appendChild(subHint);
      subBoard.appendChild(titleListArea);
      subGrid.appendChild(subBoard);
    });

    subArea.appendChild(subGrid);

    mainHeader.onclick = () => {
      const open  = subArea.style.display === "block";
      subArea.style.display = open ? "none" : "block";
      const arrow = mainHeader.querySelector(".pr-accordion-arrow");
      if (arrow) arrow.classList.toggle("open", !open);
    };

    mainBoard.appendChild(mainHeader);
    mainBoard.appendChild(subArea);
    prList.appendChild(mainBoard);
  });
}

// =====================================================================
// AI壁打ち
// =====================================================================
async function runAI() {
  const textarea     = document.getElementById("userInput");
  const aiResult     = document.getElementById("aiResult");
  const summarizeBtn = document.getElementById("summarizeBtnBox");
  const summaryArea  = document.getElementById("summaryArea");
  const deepDiveArea = document.getElementById("deepDiveArea");

  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) { alert("意見を入力してください"); return; }

  currentIdeaText = text;
  aiResult.innerHTML = '<p style="color:#2563eb;">🤖 AIが分析中…</p>';
  if (summarizeBtn)  summarizeBtn.style.display  = "none";
  if (summaryArea)   summaryArea.style.display   = "none";
  if (deepDiveArea)  deepDiveArea.style.display  = "none";

  try {
    const data = await postGAS({ mode:"analyze", text });
    if (data.error) throw new Error(data.error);

    const parsed    = JSON.parse(data.content);
    currentAIResult = data.content;
    currentMain     = parsed.main || "";
    currentSub      = parsed.sub  || OTHER_LABEL;

    aiResult.innerHTML = '<p class="ai-result-summary">' + (parsed.analysis || "（分析結果なし）") + '</p>';

    if (deepDiveArea) {
      deepDiveArea.style.display = "block";
      deepDiveArea.innerHTML =
        '<div class="deep-item"><div class="deep-label">💡 核心・本当の願い</div><div class="deep-body">' + (parsed.core     || "") + '</div></div>' +
        '<div class="deep-item"><div class="deep-label">🌱 実現した場合の変化</div><div class="deep-body">' + (parsed.impact   || "") + '</div></div>' +
        '<div class="deep-item"><div class="deep-label">🌍 国内外の成功事例</div><div class="deep-body">' + (parsed.example  || "") + '</div></div>' +
        '<div class="deep-item"><div class="deep-label">⚠️ 懸念点と乗り越え方</div><div class="deep-body">' + (parsed.concern  || "") + '</div></div>' +
        '<div class="deep-item deep-next"><div class="deep-label">🚀 さらに発展させるための問い</div><div class="deep-body">' + (parsed.nextStep || "") + '</div></div>';
    }
    if (summarizeBtn) summarizeBtn.style.display = "block";

  } catch(e) {
    aiResult.innerHTML = '<p style="color:#dc2626;">エラー: ' + e.message + '</p>';
  }
}

async function confirmSummary() {
  const summaryArea    = document.getElementById("summaryArea");
  const summaryBox     = document.getElementById("summaryBox");
  const titleBox       = document.getElementById("titleBox");
  const categoryResult = document.getElementById("categoryResult");
  const postDecision   = document.getElementById("postDecision");

  if (!summaryArea) return;
  summaryArea.style.display = "block";
  if (summaryBox) summaryBox.textContent = "要約中…";

  try {
    const data = await postGAS({ mode:"summarize", text:currentIdeaText, analysis:currentAIResult });
    if (data.error) throw new Error(data.error);
    const parsed = JSON.parse(data.content);
    currentSummary200 = parsed.summary200 || "";
    currentTitle      = parsed.title      || "";

    if (summaryBox)     summaryBox.textContent   = currentSummary200;
    if (titleBox)       titleBox.textContent      = currentTitle;
    if (categoryResult) categoryResult.innerHTML  =
      "大分類：<strong>" + currentMain + "</strong><br>中分類：<strong>" + currentSub + "</strong>";
    if (postDecision)   postDecision.style.display = "block";
  } catch(e) {
    if (summaryBox) summaryBox.textContent = "エラー: " + e.message;
  }
}

async function postToPR() {
  const btn = document.querySelector("#postDecision .big-button.success");
  if (btn) { btn.disabled = true; btn.textContent = "投稿中…"; }

  try {
    const data = await postGAS({
      mode:"save",
      title:currentTitle, summary200:currentSummary200,
      fullText:currentIdeaText, main:currentMain, sub:currentSub
    });
    if (data.error) throw new Error(data.error);

    lastPostedTitle = currentTitle;
    lastPostedMain  = currentMain;
    lastPostedSub   = currentSub;
    cachedRows = [];
    showPage("pullrequest");

  } catch(e) {
    alert("投稿エラー: " + e.message);
    if (btn) { btn.disabled = false; btn.textContent = "✅ PRページへ投稿する"; }
  }
}

function continueEditing() {
  const summaryArea  = document.getElementById("summaryArea");
  const postDecision = document.getElementById("postDecision");
  if (summaryArea)  summaryArea.style.display  = "none";
  if (postDecision) postDecision.style.display = "none";
}

// =====================================================================
// 初期化
// =====================================================================
// =====================================================================
// ウェイト合計の表示更新
// =====================================================================
function updateWeightTotal() {
  const ids = ["w1","w2","w3","w4","w5"];
  const total = ids.reduce((sum, id) => {
    const el = document.getElementById(id);
    return sum + (el ? parseInt(el.value) || 0 : 0);
  }, 0);
  const el = document.getElementById("weightTotal");
  if (el) {
    el.textContent = total;
    const badge = el.closest("span");
    if (badge) {
      badge.style.background = total === 100 ? "#dcfce7" : "#fee2e2";
      badge.style.color      = total === 100 ? "#15803d" : "#dc2626";
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  showPage("intro");
});


// 統合ページタブ切替
function toggleMergeDetail() {
  const panel = document.getElementById('mergeDetailPanel');
  const arrow = document.getElementById('mergeDetailArrow');
  const btn   = document.getElementById('mergeDetailBtn');
  if (!panel) return;
  const open = panel.classList.contains('show');
  panel.classList.toggle('show', !open);
  btn.classList.toggle('open', !open);
  if (arrow) arrow.textContent = open ? '▼' : '▲';
}

function switchMergeTab(tab) {
  document.getElementById('mergeTabGeneral').classList.toggle('active', tab === 'general');
  document.getElementById('mergeTabExpert').classList.toggle('active', tab === 'expert');
  document.getElementById('tabGeneral').classList.toggle('active', tab === 'general');
  document.getElementById('tabExpert').classList.toggle('active', tab === 'expert');
}
</script>