const GAS_URL = "https://script.google.com/macros/s/AKfycbwgOIK3P6wmltLLxFrPdEuiGko8u8Ty4WAFaIDLZLIrcfUWrwiXvvr0VyEKAmYuuuiK/exec";

// 厳格に定義された5つの基本分野
const MAIN_CATEGORIES = [
    "シームレス成長支援",
    "主体的な学び",
    "楽しさと好奇心",
    "個性・才能の開花",
    "未来を生き抜く力"
];

let allOpinions = [];
let currentAiResult = null; // AI壁打ちで生成された最新の一時データを保持

document.addEventListener("DOMContentLoaded", function () {
    // 初回データ読み込み
    fetchOpinions();

    // DOM要素の取得
    const btnAiAnalysis = document.getElementById("btnAiAnalysis");
    const btnSubmitToBox = document.getElementById("btnSubmitToBox");
    const txtContent = document.getElementById("content");
    
    const aiAssistBox = document.getElementById("aiAssistBox");
    const aiPlaceholder = document.getElementById("aiPlaceholder");
    
    const aiSummaryText = document.getElementById("aiSummaryText");
    const aiPerspectivesText = document.getElementById("aiPerspectivesText");
    const aiTitleText = document.getElementById("aiTitleText");
    const aiRefinedText = document.getElementById("aiRefinedText");

    // 🤖 1 & 2. AI壁打ち（論点抽出、5つの視点肉付け、200字要約、タイトル同時生成）
    if (btnAiAnalysis && txtContent) {
        btnAiAnalysis.addEventListener("click", async function () {
            const rawText = txtContent.value.trim();
            if (!rawText) {
                alert("まずは意見を入力してください。");
                return;
            }

            btnAiAnalysis.disabled = true;
            btnAiAnalysis.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> AIが思考・肉付け中...`;

            try {
                // GASへ壁打ちリクエストを送信
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "ai_draft", content: rawText })
                });
                const data = await res.json();

                if (data.status === "success") {
                    // データを一時保持
                    currentAiResult = data;

                    // ① 論点の概要を表示
                    if (aiSummaryText) {
                        aiSummaryText.textContent = data.outline || data.summary_outline || "入力された意見の論点を整理しました。";
                    }

                    // ② 5つの視点から肉付けされたテキストを綺麗に整形して表示
                    if (aiPerspectivesText) {
                        aiPerspectivesText.innerHTML = `
                            <strong>a. この意見の核心（本当の願い・課題）:</strong><br>${data.core || "分析中"}<br><br>
                            <strong>b. 実現した場合の市民生活への変化:</strong><br>${data.change || "分析中"}<br><br>
                            <strong>c. 成功事例（国内外）:</strong><br>${data.cases || "分析中"}<br><br>
                            <strong>d. 懸念点と乗り越え方:</strong><br>${data.concerns || "分析中"}<br><br>
                            <strong>e. さらに発展させるための問い:</strong><br>${data.questions || "分析中"}
                        `;
                    }

                    // ③ 推奨タイトルと200字要約を同時に表示
                    if (aiTitleText) aiTitleText.textContent = data.title || "無題の提案";
                    if (aiRefinedText) aiRefinedText.textContent = data.refinedText || data.summary || "200字要約が生成されませんでした。";

                    // 表示の切り替え
                    if (aiPlaceholder) aiPlaceholder.classList.add("d-none");
                    if (aiAssistBox) aiAssistBox.classList.remove("d-none");

                } else {
                    alert("AI解析エラー: " + data.message);
                }
            } catch (err) {
                console.error(err);
                alert("通信エラーが発生しました。");
            } finally {
                btnAiAnalysis.disabled = false;
                btnAiAnalysis.textContent = "✨ 1. 意見を送信してAIと壁打ちする";
            }
        });
    }

    // 📥 3. 提案箱に投稿するかを聞いてくるボタンのクリック処理
    if (btnSubmitToBox) {
        btnSubmitToBox.addEventListener("click", async function () {
            if (!currentAiResult) return;

            const confirmPost = confirm("AIが整理・肉付けしたこの内容で、正式に提案箱へ投稿しますか？");
            if (!confirmPost) return;

            btnSubmitToBox.disabled = true;
            btnSubmitToBox.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> 提案箱へ投稿中...`;

            try {
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        action: "submit",
                        content: txtContent.value.trim(),
                        title: currentAiResult.title,
                        summary: currentAiResult.refinedText || currentAiResult.summary,
                        category: currentAiResult.category || "その他"
                    })
                });
                const data = await res.json();

                if (data.status === "success") {
                    alert(`提案箱への投稿が正常に完了しました！\nAI自動識別により、大分類【${data.result.大分類 || "分類中"}】へ正しく格納されました。`);
                    
                    // フォームとAI結果をリセット
                    if (txtContent) txtContent.value = "";
                    if (aiPlaceholder) aiPlaceholder.classList.remove("d-none");
                    if (aiAssistBox) aiAssistBox.classList.add("d-none");
                    currentAiResult = null;

                    // 提案箱と地図の表示を最新データに更新
                    fetchOpinions();
                } else {
                    alert("投稿エラー: " + data.message);
                    btnSubmitToBox.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert("送信中にエラーが発生しました。");
                btnSubmitToBox.disabled = false;
            }
        });
    }
});

// スプレッドシートから全件取得
async function fetchOpinions() {
    try {
        const res = await fetch(GAS_URL);
        allOpinions = await res.json();
        if (!Array.isArray(allOpinions)) allOpinions = [];

        renderIdeaMap();
        renderTeianBako();
    } catch (err) {
        console.error("データ取得エラー:", err);
    }
}

// ① アイデアの地図（最初は5分野のみ表示。クリックで展開）
function renderIdeaMap() {
    const container = document.getElementById("matrixContainer");
    if (!container) return;
    container.innerHTML = "";

    MAIN_CATEGORIES.forEach((cat, index) => {
        // 特定の大分類に属する意見のみを厳格にフィルタリング
        const filtered = allOpinions.filter(o => (o.category === cat || o.大分類 === cat));
        
        const itemHtml = `
            <div class="category-accordion-item">
                <div class="category-accordion-header" onclick="toggleAccordion('map-sec-${index}')">
                    <span>📁 ${cat} (${filtered.length}件)</span>
                    <span class="chevron" id="map-sec-${index}-chevron">▼</span>
                </div>
                <div class="category-accordion-body d-none" id="map-sec-${index}-body">
                    <div class="row g-3">
                        ${filtered.length === 0 ? '<p class="text-muted small p-2 mb-0">この分野にはまだ意見がありません。</p>' : 
                          filtered.map(o => `
                            <div class="col-md-6">
                                <div class="opinion-card border-primary-custom h-100 p-3 bg-white border rounded">
                                    <div class="badge bg-secondary mb-2" style="font-size:8pt;">${o.midCat || o.中分類 || "一般テーマ"}</div>
                                    <div class="fw-bold text-dark mb-2" style="font-size:10.5pt;">${o.title || o.推奨タイトル || "無題の提案"}</div>
                                    <p class="text-muted small mb-0" style="line-height:1.6;">${o.summary || o.refinedText || o.content || "内容なし"}</p>
                                </div>
                            </div>
                          `).join('')}
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", itemHtml);
    });
}

// ③ 提案箱（最初は5分野の項目のみ表示）
function renderTeianBako() {
    const container = document.getElementById("listContainer");
    if (!container) return;
    container.innerHTML = "";

    MAIN_CATEGORIES.forEach((cat, index) => {
        // 特定の大分類に属する意見のみを厳格にフィルタリング
        const filtered = allOpinions.filter(o => (o.category === cat || o.大分類 === cat));

        const itemHtml = `
            <div class="category-accordion-item">
                <div class="category-accordion-header" onclick="toggleAccordion('list-sec-${index}')">
                    <span>📥 ${cat} 一覧 (${filtered.length}件)</span>
                    <span class="chevron" id="list-sec-${index}-chevron">▼</span>
                </div>
                <div class="category-accordion-body d-none" id="list-sec-${index}-body">
                    <div class="table-responsive bg-white rounded p-1">
                        <table class="table table-hover small align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 20%">中分類</th>
                                    <th style="width: 25%">推奨タイトル</th>
                                    <th style="width: 55%">AI 200字要約</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.length === 0 ? '<tr><td colspan="3" class="text-muted text-center py-3">届いた意見はありません。</td></tr>' : 
                                  filtered.map(o => `
                                    <tr>
                                        <td><span class="badge bg-secondary">${o.midCat || o.中分類 || "未定"}</span></td>
                                        <td class="fw-bold text-dark">${o.title || o.推奨タイトル || "無題"}</td>
                                        <td class="text-muted" style="line-height:1.5;">${o.summary || o.refinedText || o.content || "内容なし"}</td>
                                    </tr>
                                  `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", itemHtml);
    });
}

// アコーディオン開閉用共通グローバル関数
window.toggleAccordion = function(id) {
    const body = document.getElementById(`${id}-body`);
    const chevron = document.getElementById(`${id}-chevron`);
    if (body) {
        if (body.classList.contains("d-none")) {
            body.classList.remove("d-none");
            if (chevron) chevron.textContent = "▲";
        } else {
            body.classList.add("d-none");
            if (chevron) chevron.textContent = "▼";
        }
    }
};
