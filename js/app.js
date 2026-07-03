// =====================================================================
// js/app.js — GAS接続URL追加・3ページ構成制御版
// =====================================================================

// 🔴 【重要】デプロイしたGASの「ウェブアプリURL」をここに貼り付けてください
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzRhoUkLTA7XDr2Vlo-JqCfCOlkjIgvdCX5rLw35zWWZoT71Q6RO6ySkNkH1BhNcW95/exec"; 

let rawSheetData = [];
let selectedCategoryFilter = "すべて";
let myChartInstance = null;
let aiAnalyzedData = null;

window.onload = () => {
  initApp();
};

function initApp() {
  fetchVision();
  fetchList();
}

// GASへFetch APIでリクエストを送る共通関数（CORS対策でJSONPまたは適切なリクエストを処理）
async function callGas(params) {
  const queryString = new Object(params);
  const url = new URL(GAS_WEBAPP_URL);
  Object.keys(queryString).forEach(key => url.searchParams.append(key, queryString[key]));
  
  const response = await fetch(url.toString(), { method: 'GET' });
  if (!response.ok) throw new Error(`GAS通信エラー: ${response.status}`);
  return await response.json();
}

// ページ（タブ）切り替えロジック
function switchTab(tabName) {
  const buttons = document.querySelectorAll('.nav-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active'));
  
  if (tabName === 'map') {
    document.querySelector('button[onclick="switchTab(\'map\')"]').classList.add('active');
    document.getElementById('page-map').classList.add('active');
    if (myChartInstance) myChartInstance.update();
  } else if (tabName === 'chat') {
    document.querySelector('button[onclick="switchTab(\'chat\')"]').classList.add('active');
    document.getElementById('page-chat').classList.add('active');
  } else if (tabName === 'box') {
    document.querySelector('button[onclick="switchTab(\'box\')"]').classList.add('active');
    document.getElementById('page-box').classList.add('active');
  }
}

// 1. Civic Visionの読み込み
async function fetchVision() {
  try {
    const history = await callGas({ mode: 'visionHistory' });
    if (history && history.length > 0) {
      const latest = history[0];
      document.getElementById('vision-v-tag').innerText = latest.version || "v0";
      document.getElementById('vision-text-display').innerText = latest.visionText || "";
      
      if (latest.imageUrl) {
        const imgZone = document.getElementById('vision-image-wrapper');
        imgZone.innerHTML = `<img src="${latest.imageUrl}" alt="Civic Vision Image">`;
        imgZone.style.display = 'block';
      }
      
      if (latest.scoreJson) {
        try {
          const scores = JSON.parse(latest.scoreJson);
          renderChart(scores.adjustedScores || scores.weights || {});
        } catch(e) { console.error("Score JSON parse error:", e); }
      }
    } else {
      document.getElementById('vision-v-tag').innerText = 'v0';
      document.getElementById('vision-text-display').innerText = 'Visionデータが登録されていません。';
    }
  } catch (err) {
    document.getElementById('vision-text-display').innerText = 'Visionの取得に失敗しました: ' + err.message;
  }
}

// 2. 提案一覧の読み込み
async function fetchList() {
  try {
    const data = await callGas({ mode: 'list' });
    rawSheetData = data;
    buildCategoryFilterBar();
    renderProposals();
  } catch (err) {
    document.getElementById('proposals-list-target').innerHTML = `<p class="status-msg">エラーが発生しました: ${err.message}</p>`;
  }
}

// フィルターバーの動的生成
function buildCategoryFilterBar() {
  const filterBar = document.getElementById('category-filter-bar');
  if (!filterBar) return;
  
  const categories = ["すべて"];
  rawSheetData.forEach(item => {
    if (item.main && !categories.includes(item.main)) {
      categories.push(item.main);
    }
  });
  
  filterBar.innerHTML = categories.map(cat => `
    <button class="filter-chip ${cat === selectedCategoryFilter ? 'active' : ''}" onclick="setFilter('${cat}', this)">${cat}</button>
  `).join('');
}

function setFilter(cat, element) {
  selectedCategoryFilter = cat;
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(c => c.classList.remove('active'));
  element.classList.add('active');
  renderProposals();
}

// 一覧カードの描画
function renderProposals() {
  const target = document.getElementById('proposals-list-target');
  if (!target) return;
  
  const filtered = rawSheetData.filter(item => {
    if (selectedCategoryFilter === "すべて") return true;
    return item.main === selectedCategoryFilter;
  });
  
  document.getElementById('total-count-badge').innerText = `${filtered.length} 件`;
  
  if (filtered.length === 0) {
    target.innerHTML = '<p class="status-msg">該当する提案はありません。</p>';
    return;
  }
  
  target.innerHTML = filtered.map((item, idx) => {
    const statusClass = (item.status === '統合' || item.status === '統合済み') ? 'status-merged' : 'status-unmerged';
    return `
      <div class="proposal-card" onclick="openDetailModal(${idx})">
        <div class="card-meta">
          <span class="badge badge-main">${item.main || '未分類'}</span>
          <span class="badge badge-sub">${item.sub || 'その他'}</span>
          <span class="badge ${statusClass}">${item.status || '未統合'}</span>
        </div>
        <h4>${item.title || '(無題)'}</h4>
        <p class="summary-preview">${item.summary200 || '要約がありません。'}</p>
        <div class="card-sub-footer">
          <span><i class="fa-solid fa-user"></i> ${item.author || '匿名'}</span>
          <span><i class="fa-solid fa-id-card"></i> ${item.postId || '---'}</span>
        </div>
      </div>
    `;
  }).join('');
}

// 詳細モーダルオープン
function openDetailModal(globalIdx) {
  const item = rawSheetData[globalIdx];
  if (!item) return;
  
  document.getElementById('modal-title').innerText = item.title || '(無題)';
  document.getElementById('modal-badge-main').innerText = item.main || '未分類';
  document.getElementById('modal-badge-sub').innerText = item.sub || 'その他';
  document.getElementById('modal-badge-status').innerText = item.status || '未統合';
  document.getElementById('modal-summary').innerText = item.summary200 || '要約なし';
  document.getElementById('modal-fulltext').innerText = item.fullText || '本文なし';
  
  document.getElementById('modal-extra-info').innerHTML = `
    <div><strong>投稿ID:</strong> ${item.postId || '---'}</div>
    <div><strong>投稿者名:</strong> ${item.author || '匿名市民'}</div>
    <div><strong>受付時間:</strong> ${item.timestamp ? new Date(item.timestamp).toLocaleString('ja-JP') : '---'}</div>
    ${item.mergedInto ? `<div><strong>統合先リンク・情報:</strong> ${item.mergedInto}</div>` : ''}
    ${item.note ? `<div><strong>備考欄:</strong> ${item.note}</div>` : ''}
  `;
  
  document.getElementById('detail-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('detail-modal').style.display = 'none';
}

// 3. AI壁打ちアクション
async function startAIAnalysis() {
  const text = document.getElementById('chat-input-text').value.trim();
  if (!text) { alert("意見を入力してください。"); return; }
  
  document.getElementById('btn-analyze').innerText = "AIが分析中...";
  document.getElementById('btn-analyze').disabled = true;
  
  try {
    const res = await callGas({ mode: 'analyze', text: encodeURIComponent(text) });
    const parsed = JSON.parse(res.content);
    aiAnalyzedData = parsed;
    aiAnalyzedData.fullText = text;
    
    document.getElementById('ai-res-content').innerHTML = `
      <p><strong>核心にある課題・願い:</strong> ${parsed.core}</p>
      <p><strong>実現した際の変化:</strong> ${parsed.impact}</p>
      <p><strong>国内外の成功事例:</strong> ${parsed.example}</p>
      <p><strong>懸念点と乗り越え方:</strong> ${parsed.concern}</p>
      <p><strong>次へのステップ:</strong> ${parsed.nextStep}</p>
      <hr style="margin:10px 0; border:0; border-top:1px solid #ddd;">
      <p><strong>AI生成要約文:</strong> ${parsed.analysis}</p>
      <p><strong>自動判定大分類:</strong> ${parsed.main} / <strong>中分類案:</strong> ${parsed.sub}</p>
    `;
    document.getElementById('ai-response-wrapper').style.display = 'block';
  } catch(err) {
    alert("通信または解析エラー: " + err.message);
  } finally {
    document.getElementById('btn-analyze').innerText = "分析を実行する";
    document.getElementById('btn-analyze').disabled = false;
  }
}

// AI壁打ち完了後のシートへのセーブ連携
async function saveProposalToSheet() {
  if (!aiAnalyzedData) return;
  
  document.getElementById('btn-save-post').innerText = "保存中...";
  document.getElementById('btn-save-post').disabled = true;
  
  try {
    const sumRes = await callGas({ mode: 'summarize', text: encodeURIComponent(aiAnalyzedData.fullText), analysis: encodeURIComponent(aiAnalyzedData.analysis) });
    const sumParsed = JSON.parse(sumRes.content);
    
    const savePayload = {
      mode: 'save',
      main: aiAnalyzedData.main,
      sub: aiAnalyzedData.sub,
      title: sumParsed.title,
      summary200: sumParsed.summary200,
      fullText: aiAnalyzedData.fullText,
      postId: "P" + Date.now(),
      author: "壁打ちAI経由",
      note: "AI支援分析適用"
    };
    
    await callGas({ mode: 'save', data: encodeURIComponent(JSON.stringify(savePayload)) });
    alert("提案箱への自動集約・保存が完了しました。");
    document.getElementById('ai-response-wrapper').style.display = 'none';
    document.getElementById('chat-input-text').value = "";
    initApp();
    switchTab('map');
  } catch(e) {
    alert("保存処理に失敗しました: " + e.message);
  } finally {
    document.getElementById('btn-save-post').innerText = "この内容を提案箱へ送る";
    document.getElementById('btn-save-post').disabled = false;
  }
}

// 4. 提案箱からの直接投稿ロジック
async function submitDirectProposal() {
  const title = document.getElementById('direct-title').value.trim();
  const fullText = document.getElementById('direct-fulltext').value.trim();
  const author = document.getElementById('direct-author').value.trim() || "匿名市民";
  const note = document.getElementById('direct-note').value.trim();
  
  if (!title || !fullText) { alert("タイトルと提案本文は必須項目です。"); return; }
  
  document.getElementById('btn-direct-submit').innerText = "送信中...";
  document.getElementById('btn-direct-submit').disabled = true;
  
  try {
    const mockAnalysis = "直接投稿された提案です。";
    const sumRes = await callGas({ mode: 'summarize', text: encodeURIComponent(fullText), analysis: encodeURIComponent(mockAnalysis) });
    const sumParsed = JSON.parse(sumRes.content);
    
    const savePayload = {
      mode: 'save',
      title: title,
      summary200: sumParsed.summary200 || fullText.substring(0, 150),
      fullText: fullText,
      postId: "D" + Date.now(),
      author: author,
      note: note
    };
    
    await callGas({ mode: 'save', data: encodeURIComponent(JSON.stringify(savePayload)) });
    alert("提案箱への直接投稿が完了しました。");
    document.getElementById('direct-title').value = "";
    document.getElementById('direct-fulltext').value = "";
    document.getElementById('direct-author').value = "";
    document.getElementById('direct-note').value = "";
    initApp();
    switchTab('map');
  } catch(e) {
    alert("投稿処理に失敗しました: " + e.message);
  } finally {
    document.getElementById('btn-direct-submit').innerText = "提案箱に直接投稿する";
    document.getElementById('btn-direct-submit').disabled = false;
  }
}

// 統計グラフ描画
function renderChart(weightData) {
  const ctx = document.getElementById('weightChart');
  if (!ctx) return;
  
  const labels = Object.keys(weightData);
  const values = Object.values(weightData);
  
  if (myChartInstance) {
    myChartInstance.destroy();
  }
  
  myChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
    }
  });
}
