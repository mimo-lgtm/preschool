// =====================================================================
// js/app.js — 既存機能流用・3ページ構成制御版
// =====================================================================

let rawSheetData = [];
let selectedCategoryFilter = "すべて";
let myChartInstance = null;

// AI壁打ち用の一時保持ステート
let aiAnalyzedData = null;

window.onload = () => {
  initApp();
};

function initApp() {
  fetchVision();
  fetchList();
}

// ページ（タブ）切り替えロジック
function switchTab(tabName) {
  // ボタンのactiveクラス切り替え
  const buttons = document.querySelectorAll('.nav-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // ページの表示切り替え
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active'));
  
  if (tabName === 'map') {
    document.querySelector('button[onclick="switchTab(\'map\')"]').classList.add('active');
    document.getElementById('page-map').classList.add('active');
    if (myChartInstance) myChartInstance.update(); // グラフ再描画
  } else if (tabName === 'chat') {
    document.querySelector('button[onclick="switchTab(\'chat\')"]').classList.add('active');
    document.getElementById('page-chat').classList.add('active');
  } else if (tabName === 'box') {
    document.querySelector('button[onclick="switchTab(\'box\')"]').classList.add('active');
    document.getElementById('page-box').classList.add('active');
  }
}

// 1. Civic Visionの読み込み
function fetchVision() {
  google.script.run
    .withSuccessHandler((history) => {
      if (history && history.length > 0) {
        const latest = history[0]; // 降順配列の先頭
        document.getElementById('vision-v-tag').innerText = latest.version || "v0";
        document.getElementById('vision-text-display').innerText = latest.visionText || "";
        
        if (latest.imageUrl) {
          const imgZone = document.getElementById('vision-image-wrapper');
          imgZone.innerHTML = `<img src="${latest.imageUrl}" alt="Civic Vision Image">`;
          imgZone.style.display = 'block';
        }
        
        // 既存のウエイト統計グラフのレンダリング
        if (latest.scoreJson) {
          try {
            const scores = JSON.parse(latest.scoreJson);
            renderChart(scores.adjustedScores || scores.weights || {});
          } catch(e) { console.error("Score JSON parse error:", e); }
        }
      }
    })
    .doGet({ parameter: { mode: 'visionHistory' } });
}

// 2. 提案一覧の読み込み
function fetchList() {
  google.script.run
    .withSuccessHandler((data) => {
      rawSheetData = data;
      buildCategoryFilterBar();
      renderProposals();
    })
    .withFailureHandler((err) => {
      document.getElementById('proposals-list-target').innerHTML = `<p class="status-msg">エラーが発生しました: ${err.message}</p>`;
    })
    .doGet({ parameter: { mode: 'list' } });
}

// 既存の大分類定義に基づいてフィルターバーを動的生成
function buildCategoryFilterBar() {
  const filterBar = document.getElementById('category-filter-bar');
  if (!filterBar) return;
  
  // 重複のない大分類リストを生成
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

// 一覧カードの描画（全12列のメタデータを網羅）
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

// 詳細モーダルオープン処理
function openDetailModal(globalIdx) {
  const item = rawSheetData[globalIdx];
  if (!item) return;
  
  document.getElementById('modal-title').innerText = item.title || '(無題)';
  document.getElementById('modal-badge-main').innerText = item.main || '未分類';
  document.getElementById('modal-badge-sub').innerText = item.sub || 'その他';
  document.getElementById('modal-badge-status').innerText = item.status || '未統合';
  document.getElementById('modal-summary').innerText = item.summary200 || '要約なし';
  document.getElementById('modal-fulltext').innerText = item.fullText || '本文なし';
  
  // 12列付帯項目のマッピング展開
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
function startAIAnalysis() {
  const text = document.getElementById('chat-input-text').value.trim();
  if (!text) { alert("意見を入力してください。"); return; }
  
  document.getElementById('btn-analyze').innerText = "AIが分析中...";
  document.getElementById('btn-analyze').disabled = true;
  
  // 既存のバックエンド mode=analyze へ通信
  google.script.run
    .withSuccessHandler((res) => {
      document.getElementById('btn-analyze').innerText = "分析を実行する";
      document.getElementById('btn-analyze').disabled = false;
      
      try {
        const parsed = JSON.parse(res.content);
        aiAnalyzedData = parsed; // 保存用にステートに保持
        aiAnalyzedData.fullText = text; // 元文
        
        // 解析結果を展開表示
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
      } catch(e) {
        alert("AIの応答パースに失敗しました。再度お試しください。");
      }
    })
    .withFailureHandler((err) => {
      alert("通信エラー: " + err.message);
      document.getElementById('btn-analyze').innerText = "分析を実行する";
      document.getElementById('btn-analyze').disabled = false;
    })
    .doGet({ parameter: { mode: 'analyze', text: encodeURIComponent(text) } });
}

// AI壁打ち完了後のシートへのセーブ連携
function saveProposalToSheet() {
  if (!aiAnalyzedData) return;
  
  document.getElementById('btn-save-post').innerText = "保存中...";
  document.getElementById('btn-save-post').disabled = true;
  
  // 既存の第2段階要約(summarize)を噛ませてセーブへ引き渡す既存フローを完全踏襲
  google.script.run
    .withSuccessHandler((sumRes) => {
      try {
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
        
        // 最終保存実行
        google.script.run
          .withSuccessHandler(() => {
            alert("提案箱への自動集約・保存が完了しました。");
            document.getElementById('ai-response-wrapper').style.display = 'none';
            document.getElementById('chat-input-text').value = "";
            initApp(); // リスト再読み込み
            switchTab('map'); // 地図ページへ戻る
          })
          .doGet({ parameter: { mode: 'save', data: encodeURIComponent(JSON.stringify(savePayload)) } });
          
      } catch(e) { alert("要約保存に失敗しました。"); }
    })
    .doGet({ parameter: { mode: 'summarize', text: encodeURIComponent(aiAnalyzedData.fullText), analysis: encodeURIComponent(aiAnalyzedData.analysis) } });
}

// 4. 提案箱からの直接投稿ロジック
function submitDirectProposal() {
  const title = document.getElementById('direct-title').value.trim();
  const fullText = document.getElementById('direct-fulltext').value.trim();
  const author = document.getElementById('direct-author').value.trim() || "匿名市民";
  const note = document.getElementById('direct-note').value.trim();
  
  if (!title || !fullText) { alert("タイトルと提案本文は必須項目です。"); return; }
  
  document.getElementById('btn-direct-submit').innerText = "送信中...";
  document.getElementById('btn-direct-submit').disabled = true;
  
  // 直接投稿でも要約自動生成ロジック(summarize)を適用し、大分類は自動分類(classifyMain)に委ねる既存ロジックを流用
  const mockAnalysis = "直接投稿された提案です。";
  google.script.run
    .withSuccessHandler((sumRes) => {
      try {
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
        
        google.script.run
          .withSuccessHandler(() => {
            alert("提案箱への直接投稿が完了しました。");
            document.getElementById('direct-title').value = "";
            document.getElementById('direct-fulltext').value = "";
            document.getElementById('direct-author').value = "";
            document.getElementById('direct-note').value = "";
            document.getElementById('btn-direct-submit').innerText = "提案箱に直接投稿する";
            document.getElementById('btn-direct-submit').disabled = false;
            initApp();
            switchTab('map');
          })
          .doGet({ parameter: { mode: 'save', data: encodeURIComponent(JSON.stringify(savePayload)) } });
      } catch(e) { alert("投稿処理に失敗しました。"); }
    })
    .doGet({ parameter: { mode: 'summarize', text: encodeURIComponent(fullText), analysis: encodeURIComponent(mockAnalysis) } });
}

// 既存の統計グラフ描画ファンクションの完全流用
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
