const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbz92KXKg8PgPHuf-EP3K-KwbdVlIYDLOMEZ5Rc8hZJBuRltK4zjuvIMES8SKfv8pZDo/exec'; // 👈 新しいGASデプロイURLに書き換えてください

const CORE_CATEGORIES = [
  "シームレス成長支援",
  "主体的な学び",
  "楽しさと好奇心",
  "個性・才能の開花",
  "未来を生き抜く力"
];

document.addEventListener('DOMContentLoaded', () => {
  fetchTimelineAndMatrix();

  // AI壁打ちボタンのイベント
  const btnAiDraft = document.getElementById('btnAiDraft');
  if (btnAiDraft) {
    btnAiDraft.addEventListener('click', function() {
      const contentVal = document.getElementById('content').value;
      
      if (!contentVal.trim()) {
        alert('まずは「具体的な提案・意見」の欄に、生の意見を入力してください。');
        return;
      }

      const btnOriginalText = this.innerText;
      this.disabled = true;
      this.innerText = '✨ AIが最適な教育論理へリライト中...';

      const payload = {
        action: 'ai_draft',
        category: document.getElementById('category').value,
        keyword: document.getElementById('keyword').value,
        type: document.getElementById('type').value,
        content: contentVal
      };

      fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(res => {
        if (res.status === 'success' && res.refinedText) {
          document.getElementById('aiPlaceholder').classList.add('d-none');
          const aiBox = document.getElementById('aiAssistBox');
          aiBox.classList.remove('d-none');
          document.getElementById('aiRefinedText').innerText = res.refinedText;
          document.getElementById('btnSubmit').disabled = false;
        } else {
          // 👈 詳細なエラー内容を表示するように強化
          alert('【AI下書き構築エラー】\n' + (res.message || '不明なエラーです。GASのログを確認してください。'));
        }
      })
      .catch(err => {
        console.error('AI通信エラー:', err);
        alert('通信に失敗しました。URLが正しいか、またはCORSエラーが発生していないか確認してください。');
      })
      .finally(() => {
        this.disabled = false;
        this.innerText = btnOriginalText;
      });
    });
  }

  // AI提案の採用処理
  const btnAdoptAi = document.getElementById('btnAdoptAi');
  if (btnAdoptAi) {
    btnAdoptAi.addEventListener('click', function() {
      document.getElementById('content').value = document.getElementById('aiRefinedText').innerText;
      document.getElementById('aiAssistBox').classList.add('d-none');
      document.getElementById('aiPlaceholder').classList.remove('d-none');
    });
  }

  // 最終送信処理
  const opinionForm = document.getElementById('opinionForm');
  if (opinionForm) {
    opinionForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const btnSubmit = document.getElementById('btnSubmit');
      btnSubmit.disabled = true;
      const originalSubmitText = btnSubmit.innerText;
      btnSubmit.innerText = '🚀 AI構造化分析中...';

      const payload = {
        action: 'submit',
        category: document.getElementById('category').value,
        keyword: document.getElementById('keyword').value,
        type: document.getElementById('type').value,
        content: document.getElementById('content').value
      };

      fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(res => {
        if (res.status === 'success') {
          alert('送信が完了し、マトリクスと提案箱へ反映されました！');
          opinionForm.reset();
          document.getElementById('aiAssistBox').classList.add('d-none');
          document.getElementById('aiPlaceholder').classList.remove('d-none');
          btnSubmit.disabled = true;
          fetchTimelineAndMatrix();
        } else {
          alert('登録エラー: ' + res.message);
          btnSubmit.disabled = false;
        }
      })
      .catch(err => {
        alert('送信中にネットワークエラーが発生しました。');
        btnSubmit.disabled = false;
      })
      .finally(() => {
        btnSubmit.innerText = originalSubmitText;
      });
    });
  }
});

function fetchTimelineAndMatrix() {
  const mContainer = document.getElementById('matrixContainer');
  const lContainer = document.getElementById('listContainer');
  const loadingHtml = '<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
  
  if (mContainer) mContainer.innerHTML = loadingHtml;
  if (lContainer) lContainer.innerHTML = loadingHtml;

  fetch(GAS_API_URL)
    .then(response => response.json())
    .then(rawOpinions => {
      const parentOpinions = rawOpinions.filter(op => !op.mergedTo);
      parentOpinions.forEach(parent => {
        parent.children = rawOpinions.filter(op => String(op.mergedTo) === String(parent.id));
      });
      renderMatrixUI(parentOpinions);
      renderListUI(rawOpinions);
    })
    .catch(err => {
      const errorHtml = '<div class="alert alert-danger small">データの読み込みに失敗しました。</div>';
      if (mContainer) mContainer.innerHTML = errorHtml;
      if (lContainer) lContainer.innerHTML = errorHtml;
    });
}

function renderMatrixUI(opinions) {
  const container = document.getElementById('matrixContainer');
  if (!container) return;
  container.innerHTML = '';

  CORE_CATEGORIES.forEach(categoryName => {
    const categoryDataset = opinions.filter(op => op.category === categoryName);
    const problems = categoryDataset.filter(op => op.type === '課題・困りごと');
    const ideas    = categoryDataset.filter(op => op.type === '提案・アイデア');
    const merits   = categoryDataset.filter(op => op.type === '魅力・継続希望');

    let laneMarkup = `
      <div class="category-lane">
        <h4 class="category-title">${categoryName}</h4>
        <div class="lane-table">
          <div class="lane-row">
            <div class="lane-col">
              <div class="col-header text-danger" style="background-color: #fdf2f2;">⚠️ 課題 (${problems.length})</div>
              <div>${generateCardStream(problems, 'danger')}</div>
            </div>
            <div class="lane-col">
              <div class="col-header text-primary" style="background-color: #f0f7ff;">💡 提案 (${ideas.length})</div>
              <div>${generateCardStream(ideas, 'primary')}</div>
            </div>
            <div class="lane-col">
              <div class="col-header text-success" style="background-color: #f3faf5;">✨ 魅力 (${merits.length})</div>
              <div>${generateCardStream(merits, 'success')}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', laneMarkup);
  });
}

function generateCardStream(cards, borderTheme) {
  if (cards.length === 0) return '<p class="text-muted text-center py-2" style="font-size: 8pt;">（なし）</p>';
  return cards.map(op => {
    const displayBody = op.summary ? op.summary : op.content;
    const cardTitle = op.title ? op.title : `#${op.smallCat || '一般意見'}`;
    const mergeBadge = (op.children && op.children.length > 0) ? `<span class="badge bg-dark ms-1" style="font-size:7pt;">他 ${op.children.length} 件を統合</span>` : '';

    return `
      <div class="opinion-card border-${borderTheme}-custom">
        <div class="d-flex justify-content-between align-items-start">
          <span class="badge-keyword">#${escapeSpecialChars(op.smallCat || '子育て')}</span>
          <div><span class="badge-hierarchy">${escapeSpecialChars(op.midCat || '全体')}</span>${mergeBadge}</div>
        </div>
        <div class="card-title-text">${escapeSpecialChars(cardTitle)}</div>
        <div style="color: #475569; font-size: 8.5pt; white-space: pre-wrap; line-height: 1.5;">${escapeSpecialChars(displayBody)}</div>
        <div class="text-end pt-1" style="font-size: 7.5pt; color: #94a3b8;">ID: ${op.id}</div>
      </div>
    `;
  }).join('');
}

function renderListUI(opinions) {
  const container = document.getElementById('listContainer');
  if (!container) return;
  container.innerHTML = '';

  const sortedOpinions = [...opinions].reverse();
  container.innerHTML = sortedOpinions.map(op => {
    const formattedDate = op.timestamp ? new Date(op.timestamp).toLocaleString('ja-JP') : '不明';
    let typeBadgeColor = op.type === '課題・困りごと' ? 'bg-danger' : (op.type === '魅力・継続希望' ? 'bg-success' : 'bg-primary');

    return `
      <div class="card mb-3 border-0 shadow-sm rounded-3">
        <div class="card-body p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span class="badge bg-light text-dark border me-1" style="font-size: 8pt;">${escapeSpecialChars(op.category)}</span>
              <span class="badge ${typeBadgeColor}" style="font-size: 8pt;">${escapeSpecialChars(op.type)}</span>
            </div>
            <small class="text-muted" style="font-size: 8pt;">${formattedDate}</small>
          </div>
          <h6 class="fw-bold text-dark mb-2" style="font-size: 10pt;">${op.title ? `【${escapeSpecialChars(op.title)}】` : ''} #${escapeSpecialChars(op.midCat || '幼児教育')}</h6>
          <div class="p-3 bg-light rounded-2 mb-2" style="font-size: 9pt; border-left: 3px solid #cbd5e1;">
            <p class="mb-0 text-dark" style="line-height: 1.5; white-space: pre-wrap;">${escapeSpecialChars(op.summary || '（未要約）')}</p>
          </div>
          <p class="mb-0 text-secondary mt-2 px-1" style="font-size: 8.5pt; white-space: pre-wrap;">${escapeSpecialChars(op.content)}</p>
        </div>
      </div>
    `;
  }).join('');
}

function escapeSpecialChars(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
