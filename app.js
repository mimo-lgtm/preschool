// 【最重要】新しくデプロイし直したGASの「全員」権限のWebアプリURLに書き換えてください
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwGIMORseiNH_aP193-KwyKGQXI9dQRy9FSW7L-MGZNUwUK7Vnkd7_8hwmplCAPoGjU/exec'; 

const CATEGORIES = [
  "シームレス成長支援",
  "主体的な学び",
  "楽しさと好奇心",
  "個性・才能の開花",
  "未来を生き抜く力"
];

document.addEventListener('DOMContentLoaded', () => {
  fetchOpinions();

  document.getElementById('opinionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerText = 'AIが解析・送信中...';

    const data = {
      category: document.getElementById('category').value,
      keyword: document.getElementById('keyword').value,
      type: document.getElementById('type').value,
      content: document.getElementById('content').value
    };

    fetch(GAS_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(() => {
      alert('ご意見ありがとうございました！AIが内容を分析し、マトリクスへ自動構造化しました。');
      this.reset();
      fetchOpinions();
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

function fetchOpinions() {
  const container = document.getElementById('matrixContainer');
  container.innerHTML = '<div class="text-center py-3"><p class="text-muted" style="font-size:9.5pt;">データを読み込み中...</p></div>';

  fetch(GAS_API_URL)
    .then(response => response.json())
    .then(opinions => {
      renderMatrix(opinions);
    })
    .catch(error => {
      console.error('Error:', error);
      container.innerHTML = '<div class="alert alert-danger" style="font-size:9.5pt;">データの読み込みに失敗しました。GASのURLやアクセス権限を確認してください。</div>';
    });
}

function renderMatrix(opinions) {
  const container = document.getElementById('matrixContainer');
  container.innerHTML = '';

  if (!opinions || opinions.length === 0) {
    container.innerHTML = '<div class="alert alert-info text-center" style="font-size:9.5pt;">現在、意見が投稿されていません。</div>';
    return;
  }

  CATEGORIES.forEach(cat => {
    const filtered = opinions.filter(op => op.category === cat);
    const problems = filtered.filter(op => op.type === '課題・困りごと');
    const ideas = filtered.filter(op => op.type === '提案・アイデア');
    const merits = filtered.filter(op => op.type === '魅力・継続希望');

    let laneHtml = `
      <div class="category-lane">
        <h4 class="category-title">${cat}</h4>
        <div class="lane-table">
          <div class="lane-row">
            <div class="lane-col">
              <div class="col-header text-danger" style="background-color: #fdf2f2;">⚠️ 課題 (${problems.length})</div>
              <div>${renderCards(problems, 'danger')}</div>
            </div>
            <div class="lane-col">
              <div class="col-header text-primary" style="background-color: #f0f7ff;">💡 提案 (${ideas.length})</div>
              <div>${renderCards(ideas, 'primary')}</div>
            </div>
            <div class="lane-col">
              <div class="col-header text-success" style="background-color: #f3faf5;">✨ 魅力 (${merits.length})</div>
              <div>${renderCards(merits, 'success')}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', laneHtml);
  });
}

function renderCards(cardsData, typeStyle) {
  if (cardsData.length === 0) {
    return '<p class="text-muted text-center" style="font-size:8pt; margin: 5px 0;">なし</p>';
  }
  
  return cardsData.map(op => {
    // AIコメントが存在する場合のみ、薄緑色のボックスでカード内に追加表示する
    let aiCommentHtml = '';
    if (op.aiComment && op.aiComment !== '（AIコメント生成スキップ）') {
      aiCommentHtml = `
        <div style="margin-top: 6px; padding: 5px; background-color: #f4f9f4; border-radius: 4px; border: 1px dashed #a2dba2; font-size: 8pt; color: #2e592e;">
          <strong>🤖 AI考察:</strong> ${escapeHtml(op.aiComment)}
        </div>
      `;
    }

    return `
      <div class="opinion-card border-${typeStyle}-custom">
        <div><span class="badge-keyword">#${op.keyword}</span></div>
        <div style="color: #212529; white-space: pre-wrap; font-weight: 500;">${escapeHtml(op.content)}</div>
        ${aiCommentHtml}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
