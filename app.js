// 【最重要】新しくデプロイし直したGASの「全員」権限のWebアプリURLに書き換えてください
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxxb63bYicFqbhqp5NGxTFmrMvfjFbddB-FrWQBcP6dgot-1Fxwphvhp832g2NUe9tT/exec'; 

const CATEGORIES = [
  "シームレス成長支援",
  "主体的な学び",
  "楽しさと好奇心",
  "個性・才能の開花",
  "未来を生き抜く力"
];

document.addEventListener('DOMContentLoaded', () => {
  fetchOpinions();

  const aiButton = document.getElementById('btnAiDraft');
  if (!aiButton) {
    console.error('【エラー】HTML内に「btnAiDraft」というIDのボタンが見つかりません。HTMLの記述を確認してください。');
    return;
  }

  // AI壁打ちボタンのクリックイベント
  aiButton.addEventListener('click', function() {
    console.log('AI補強ボタンがクリックされました。処理を開始します。'); // 👈 ログを出して確認
    
    const content = document.getElementById('content').value;
    if (!content.trim()) {
      alert('まずは「具体的な提案・意見」の欄に、生の意見を入力してください。');
      return;
    }

    const originalText = this.innerText;
    this.disabled = true;
    this.innerText = '✨ AIが文章を論理的に洗練中...';

    const data = {
      action: 'ai_draft',
      category: document.getElementById('category').value,
      keyword: document.getElementById('keyword').value,
      type: document.getElementById('type').value,
      content: content
    };

    console.log('GASに送信するデータ:', data);

    fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    .then(response => {
      console.log('GASから応答を受け取りました:', response);
      return response.json();
    })
    .then(res => {
      console.log('GASからの解析済みJSONデータ:', res);
      if (res.status === 'success' && res.refinedText) {
        const assistBox = document.getElementById('aiAisistBox');
        const refinedTextElem = document.getElementById('aiRefinedText');
        
        if (assistBox && refinedTextElem) {
          refinedTextElem.innerText = res.refinedText;
          assistBox.classList.remove('d-none'); // 👈 枠を表示する
          console.log('画面へのAIテキスト表示に成功しました。');
        } else {
          console.error('【エラー】HTML内に aiAisistBox または aiRefinedText が見つかりません。');
        }
      } else {
        alert('AI補強文の取得に課題が発生しました。GASのログ、またはAPIキーを確認してください。');
      }
    })
    .catch(error => {
      console.error('【通信エラー発生】:', error);
      alert('AI呼び出し中に通信エラーが発生しました。詳細はコンソールを確認してください。');
    })
    .finally(() => {
      this.disabled = false;
      this.innerText = originalText;
    });
  });

  // （以下の「この案を採用する」や「最終送信」の処理は前回のままでOKです）
});

function fetchOpinions() {
  const container = document.getElementById('matrixContainer');
  container.innerHTML = '<div class="text-center py-3"><p class="text-muted" style="font-size:9.5pt;">データを読み込み中...</p></div>';

  fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    .then(response => {
      console.log('GASから応答を受け取りました:', response);
      return response.json();
    })
    .then(res => {
      console.log('GASからの解析済みJSONデータ:', res); // 👈 ここで中身を確認
      
      // 判定条件を少し緩め、もしエラーメッセージが含まれていればそれを直接アラートに出す
      if (res.status === 'success' && res.refinedText) {
        // キーが正常に設定されておらず、スキップ文字が入っている場合も警告
        if (res.refinedText.includes('未設定') || res.refinedText.includes('失敗')) {
          alert('GAS側からの応答: ' + res.refinedText + '\nスクリプトプロパティの「GROQ_API_KEY」が正しく設定されているか確認してください。');
          return;
        }
        
        const assistBox = document.getElementById('aiAisistBox');
        const refinedTextElem = document.getElementById('aiRefinedText');
        
        if (assistBox && refinedTextElem) {
          refinedTextElem.innerText = res.refinedText;
          assistBox.classList.remove('d-none');
          console.log('画面へのAIテキスト表示に成功しました。');
        }
      } else {
        // GAS側でcatchされたエラーメッセージがあれば詳細を表示
        const errMsg = res.message || JSON.stringify(res);
        alert('AI補強文の取得に課題が発生しました。\n\n【GASからのエラー詳細】:\n' + errMsg);
      }
    })
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
    // AIが補強した文章がある場合、カード内で「論理補強文」として目立たせる
    let aiCommentHtml = '';
    if (op.aiComment && !op.aiComment.includes('確認中') && !op.aiComment.includes('スキップ')) {
      aiCommentHtml = `
        <div style="margin-top: 8px; padding: 6px 8px; background-color: #f7fafc; border-left: 3px solid #3182ce; border-radius: 0 4px 4px 0; font-size: 8.5pt; color: #2d3748; line-height: 1.4;">
          <strong style="color: #2b6cb0; font-size: 8pt; display: block; margin-bottom: 2px;">🤖 AI論理補強・アップデート:</strong>
          ${escapeHtml(op.aiComment)}
        </div>
      `;
    }

    return `
      <div class="opinion-card border-${typeStyle}-custom" style="padding: 10px; margin-bottom: 8px; background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div><span class="badge-keyword" style="font-size: 7.5pt; background: #edf2f7; padding: 2px 6px; border-radius: 4px;">#${op.keyword}</span></div>
        <div style="color: #718096; font-size: 8.5pt; margin-top: 4px; font-style: italic; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
          「${escapeHtml(op.content)}」
        </div>
        ${aiCommentHtml}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
