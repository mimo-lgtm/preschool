// ==========================================================================
// 幼児教育・子育てプラットフォーム コアフロントエンドロジック
// ==========================================================================

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxHlOcZWP9SiXJr09g_V-QlAiKT5-VMcYAhOvAy4nUmN1_rhEtqAkxQQurmy8fuN8o0/exec'; // 👈 新しいGASデプロイURLに書き換えてください

// 構造定義マトリクス用 5大分野配列
const CORE_CATEGORIES = [
  "シームレス成長支援",
  "主体的な学び",
  "楽しさと好奇心",
  "個性・才能の開花",
  "未来を生き抜く力"
];

document.addEventListener('DOMContentLoaded', () => {
  // アプリケーション起動時に全データを初期ロード
  fetchTimelineAndMatrix();

  // ==========================================================================
  // アクションA: AI壁打ち（下書き論理補強）ボタンのイベント制御
  // ==========================================================================
  const btnAiDraft = document.getElementById('btnAiDraft');
  if (btnAiDraft) {
    btnAiDraft.addEventListener('click', function() {
      const contentField = document.getElementById('content');
      const contentVal = contentField.value;
      
      if (!contentVal.trim()) {
        alert('まずは「具体的な提案・意見」の欄に、生の意見やメモを入力してください。');
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
          // プレビューコンテナのトグル切り替え
          document.getElementById('aiPlaceholder').classList.add('d-none');
          const aiBox = document.getElementById('aiAssistBox');
          aiBox.classList.remove('d-none');
          
          document.getElementById('aiRefinedText').innerText = res.refinedText;
          
          // AIを通したため、最終送信ボタンをアクティブ化
          document.getElementById('btnSubmit').disabled = false;
        } else {
          alert('AI下書きの構築に失敗しました。GASのスクリプトプロパティ「GROQ_API_KEY」を確認してください。');
        }
      })
      .catch(err => {
        console.error('AI通信エラー:', err);
        alert('AIエンドポイントとの通信中にエラーが発生しました。');
      })
      .finally(() => {
        this.disabled = false;
        this.innerText = btnOriginalText;
      });
    });
  }

  // ==========================================================================
  // アクションB: AI提案の採用処理
  // ==========================================================================
  const btnAdoptAi = document.getElementById('btnAdoptAi');
  if (btnAdoptAi) {
    btnAdoptAi.addEventListener('click', function() {
      const refinedText = document.getElementById('aiRefinedText').innerText;
      document.getElementById('content').value = refinedText;
      
      // 役目を終えたのでプレビューエリアを閉じる
      document.getElementById('aiAssistBox').classList.add('d-none');
      document.getElementById('aiPlaceholder').classList.remove('d-none');
    });
  }

  // ==========================================================================
  // アクションC: 最終送信処理（マトリクス＆スプレッドシートへコミット）
  // ==========================================================================
  const opinionForm = document.getElementById('opinionForm');
  if (opinionForm) {
    opinionForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const btnSubmit = document.getElementById('btnSubmit');
      btnSubmit.disabled = true;
      const originalSubmitText = btnSubmit.innerText;
      btnSubmit.innerText = '🚀 データベースに格納＆AI構造化分析中...';

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
          alert('ありがとうございます！ご意見はAIによる分類・要約を経てマトリクスと提案箱へリアルタイム展開されました。');
          
          // 入力フォームとAI関連のUI状態をリセット
          opinionForm.reset();
          document.getElementById('aiAssistBox').classList.add('d-none');
          document.getElementById('aiPlaceholder').classList.remove('d-none');
          btnSubmit.disabled = true; // 次回の壁打ちまで不活性化
          
          // リロード
          fetchTimelineAndMatrix();
        } else {
          alert('登録エラーが発生しました: ' + res.message);
          btnSubmit.disabled = false;
        }
      })
      .catch(err => {
        console.error('送信エラー:', err);
        alert('サーバーとの通信中に致命的なエラーが発生しました。');
        btnSubmit.disabled = false;
      })
      .finally(() => {
        btnSubmit.innerText = originalSubmitText;
      });
    });
  }
});

// ==========================================================================
// データ統合制御・非同期ロード処理
// ==========================================================================
function fetchTimelineAndMatrix() {
  const mContainer = document.getElementById('matrixContainer');
  const lContainer = document.getElementById('listContainer');
  
  const loadingHtml = '<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm" role="status"></div><p class="text-muted small mt-2">スプレッドシートからデータを取得中...</p></div>';
  
  if (mContainer) mContainer.innerHTML = loadingHtml;
  if (lContainer) lContainer.innerHTML = loadingHtml;

  fetch(GAS_API_URL)
    .then(response => response.json())
    .then(rawOpinions => {
      // 以前の統合ギミック（mergedToが設定されている意見は、親IDに束ねて格納・非表示にする）の処理
      // 1. マトリクス表示用（親カードのみ抽出し、子意見はネスト格納用にする）
      const parentOpinions = rawOpinions.filter(op => !op.mergedTo);
      
      // 子意見をマッピング
      parentOpinions.forEach(parent => {
        parent.children = rawOpinions.filter(op => String(op.mergedTo) === String(parent.id));
      });

      renderMatrixUI(parentOpinions);
      renderListUI(rawOpinions); // 提案箱はすべてそのまま時系列で出す
    })
    .catch(err => {
      console.error('データ取得失敗:', err);
      const errorHtml = '<div class="alert alert-danger small mx-2">データの読み込みに失敗しました。Webアプリの新しいデプロイURLが正しいか確認してください。</div>';
      if (mContainer) mContainer.innerHTML = errorHtml;
      if (lContainer) lContainer.innerHTML = errorHtml;
    });
}

// ==========================================================================
// ① アイデアの地図（構造化マトリクス）の動的描画レンダラー
// ==========================================================================
function renderMatrixUI(opinions) {
  const container = document.getElementById('matrixContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!opinions || opinions.length === 0) {
    container.innerHTML = '<div class="alert alert-info text-center small">登録済みの構造化データがまだありません。最初の意見を投稿してみましょう。</div>';
    return;
  }

  // 5大分野に沿ってループを回し、レーンを構築
  CORE_CATEGORIES.forEach(categoryName => {
    const categoryDataset = opinions.filter(op => op.category === categoryName);
    
    // 意見の種類別（課題、提案、魅力）へのセパレート
    const problems = categoryDataset.filter(op => op.type === '課題・困りごと');
    const ideas    = categoryDataset.filter(op => op.type === '提案・アイデア');
    const merits   = categoryDataset.filter(op => op.type === '魅力・継続希望');

    let laneMarkup = `
      <div class="category-lane">
        <h4 class="category-title">${categoryName}</h4>
        <div class="lane-table">
          <div class="lane-row">
            
            <!-- 課題カラム -->
            <div class="lane-col">
              <div class="col-header text-danger" style="background-color: #fdf2f2;">⚠️ 課題 (${problems.length})</div>
              <div>${generateCardStream(problems, 'danger')}</div>
            </div>
            
            <!-- 提案カラム -->
            <div class="lane-col">
              <div class="col-header text-primary" style="background-color: #f0f7ff;">💡 提案 (${ideas.length})</div>
              <div>${generateCardStream(ideas, 'primary')}</div>
            </div>
            
            <!-- 魅力カラム -->
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

// マトリクス内部の各意見カードの内部ストリーム作成（統合・要約の表示）
function generateCardStream(cards, borderTheme) {
  if (cards.length === 0) {
    return '<p class="text-muted text-center py-2" style="font-size: 8pt; letter-spacing: 0.5px;">（意見はまだありません）</p>';
  }

  return cards.map(op => {
    // 以前のシステム同様、要約200がある場合は要約を、ない場合は元の投稿文を安全に出す
    const displayBody = op.summary ? op.summary : op.content;
    const cardTitle = op.title ? op.title : `#${op.smallCat || '一般意見'}`;
    
    // 類似意見が統合されている（子ノードを持つ）場合のバッジ
    const mergeBadge = (op.children && op.children.length > 0) 
      ? `<span class="badge bg-dark ms-1" style="font-size:7pt;">他 ${op.children.length} 件を自動統合</span>` 
      : '';

    return `
      <div class="opinion-card border-${borderTheme}-custom">
        <div class="d-flex justify-content-between align-items-start">
          <span class="badge-keyword">#${escapeSpecialChars(op.smallCat || '子育て')}</span>
          <div>
            <span class="badge-hierarchy">${escapeSpecialChars(op.midCat || '全体')}</span>
            ${mergeBadge}
          </div>
        </div>
        <div class="card-title-text">${escapeSpecialChars(cardTitle)}</div>
        <div style="color: #475569; font-size: 8.5pt; white-space: pre-wrap; line-height: 1.5;">${escapeSpecialChars(displayBody)}</div>
        <div class="text-end pt-1" style="font-size: 7.5pt; color: #94a3b8;">ID: ${op.id}</div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// ③ 提案箱（タイムライン一覧）の動的描画レンダラー
// ==========================================================================
function renderListUI(opinions) {
  const container = document.getElementById('listContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!opinions || opinions.length === 0) {
    container.innerHTML = '<div class="alert alert-info text-center small">届いた提案はまだありません。</div>';
    return;
  }

  // 新着順（IDまたはタイムスタンプの降順）に並べ替えてタイムラインを構成
  const sortedOpinions = [...opinions].reverse();

  const listHtml = sortedOpinions.map(op => {
    const formattedDate = op.timestamp ? new Date(op.timestamp).toLocaleString('ja-JP') : '不明';
    
    // 意見の種類に応じたバッジ色
    let typeBadgeColor = 'bg-secondary';
    if (op.type === '課題・困りごと') typeBadgeColor = 'bg-danger';
    if (op.type === '提案・アイデア') typeBadgeColor = 'bg-primary';
    if (op.type === '魅力・継続希望') typeBadgeColor = 'bg-success';

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
          
          <h6 class="fw-bold text-dark mb-2" style="font-size: 10pt;">
            ${op.title ? `【${escapeSpecialChars(op.title)}】` : ''} #${escapeSpecialChars(op.midCat || '幼児教育')}
          </h6>
          
          <div class="p-3 bg-light rounded-2 mb-2" style="font-size: 9pt; border-left: 3px solid #cbd5e1;">
            <div class="fw-bold text-muted mb-1" style="font-size: 7.5pt;">💡 AI構造化 200字要約:</div>
            <p class="mb-0 text-dark" style="line-height: 1.5; white-space: pre-wrap;">${escapeSpecialChars(op.summary || '（未要約）')}</p>
          </div>
          
          <div class="pt-2 px-1">
            <div class="text-muted mb-1" style="font-size: 7.5pt;">📝 元の投稿文（生のこえ）:</div>
            <p class="mb-0 text-secondary" style="font-size: 8.5pt; line-height: 1.5; white-space: pre-wrap;">${escapeSpecialChars(op.content)}</p>
          </div>
          
          <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-light">
            <span class="text-muted" style="font-size: 7.5pt;">投稿者: ${escapeSpecialChars(op.userName)}</span>
            <span class="text-muted" style="font-size: 7.5pt;">投稿ID: ${op.id} ${op.mergedTo ? `<span class="text-warning">(ID: ${op.mergedTo} へ統合済)</span>` : ''}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = listHtml;
}

// XSS対策用 HTMLエンティティエスケープユーティリティ
function escapeSpecialChars(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
