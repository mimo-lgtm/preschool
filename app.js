// 【重要】あなたのGASデプロイ完了後に発行されるWebアプリURLに差し替えてください
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbx2SV8IPkiDeinZSt_CNoS3LogeqAtvwF9SC9jRzbxo6m8asB36S6dJiYnGi0fCJ3Vb/exec'; 

// 5つの分野の定義
const CATEGORIES = [
  "シームレス成長支援",
  "主体的な学び",
  "楽しさと好奇心",
  "個性・才能の開花",
  "未来を生き抜く力"
];

document.addEventListener('DOMContentLoaded', () => {
  fetchOpinions();

  // フォーム送信処理
  document.getElementById('opinionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerText = '送信中...';

    const data = {
      category: document.getElementById('category').value,
      keyword: document.getElementById('keyword').value,
      type: document.getElementById('type').value,
      content: document.getElementById('content').value
    };

    fetch(GAS_API_URL, {
      method: 'POST',
      mode: 'no-cors', // クロスドメイン対策
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(() => {
      alert('貴重なご意見・アイデアをありがとうございました！プラットフォームに反映します。');
      this.reset();
      fetchOpinions(); // 再読み込み
    })
    .catch(error => {
      console.error('Error:', error);
      alert('送信中にエラーが発生しました。');
    })
    .finally(() => {
      submitButton.disabled = false;
      submitButton.innerText = 'この内容で社会に届ける';
    });
  });
});

// データを取得してマトリクスを生成する関数
function fetchOpinions() {
  const container = document.getElementById('matrixContainer');
  container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">意見データを読み込み中...</p></div>';

  fetch(GAS_API_URL)
    .then(response => response.json())
    .then(opinions => {
      renderMatrix(opinions);
    })
    .catch(error => {
      console.error('Error:', error);
      container.innerHTML = '<div class="alert alert-danger">データの読み込みに失敗しました。GASのURLや公開設定を確認してください。</div>';
    });
}

// マトリクスの描画
function renderMatrix(opinions) {
  const container = document.getElementById('matrixContainer');
  container.innerHTML = '';

  if (!opinions || opinions.length === 0) {
    container.innerHTML = '<div class="alert alert-info text-center">現在、まだ意見が投稿されていません。最初の意見を投稿してみましょう！</div>';
    return;
  }

  // 分野ごとにレーンを作成
  CATEGORIES.forEach(cat => {
    // 該当する分野の意見をフィルタリング
    const filtered = opinions.filter(op => op.category === cat);
    
    // 方向性ごとにさらに分類
    const problems = filtered.filter(op => op.type === '課題・困りごと');
    const ideas = filtered.filter(op => op.type === '提案・アイデア');
    const merits = filtered.filter(op => op.type === '魅力・継続希望');

    // レーンのHTML構築
    let laneHtml = `
      <div class="category-lane">
        <h4 class="category-title h5 mb-3">${cat}</h4>
        <div class="row g-2">
          <!-- 課題カラム -->
          <div class="col-md-4">
            <div class="p-2 bg-light rounded font-weight-bold text-danger mb-2" style="font-size:0.85rem; background-color: #fdf2f2 !important;">⚠️ 課題・困りごと (${problems.length})</div>
            <div class="d-flex flex-column gap-2">${renderCards(problems, 'danger')}</div>
          </div>
          <!-- 提案カラム -->
          <div class="col-md-4">
            <div class="p-2 bg-light rounded font-weight-bold text-primary mb-2" style="font-size:0.85rem; background-color: #f0f7ff !important;">💡 提案・アイデア (${ideas.length})</div>
            <div class="d-flex flex-column gap-2">${renderCards(ideas, 'primary')}</div>
          </div>
          <!-- 魅力カラム -->
          <div class="col-md-4">
            <div class="p-2 bg-light rounded font-weight-bold text-success mb-2" style="font-size:0.85rem; background-color: #f3faf5 !important;">✨ 魅力・継続希望 (${merits.length})</div>
            <div class="d-flex flex-column gap-2">${renderCards(merits, 'success')}</div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', laneHtml);
  });
}

// 意見カード単体の生成
function renderCards(cardsData, typeStyle) {
  if (cardsData.length === 0) {
    return '<p class="text-muted text-center my-2" style="font-size:0.8rem;">なし</p>';
  }
  
  return cardsData.map(op => {
    return `
      <div class="card opinion-card p-2 shadow-sm border-${typeStyle}-custom">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge badge-keyword mb-1" style="font-size:0.75rem;">#${op.keyword}</span>
        </div>
        <p class="card-text text-dark m-0" style="white-space: pre-wrap;">${escapeHtml(op.content)}</p>
      </div>
    `;
  }).join('');
}

// エスケープ処理（セキュリティ用）
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
