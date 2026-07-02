const GAS_URL = "https://script.google.com/macros/s/AKfycbwgOIK3P6wmltLLxFrPdEuiGko8u8Ty4WAFaIDLZLIrcfUWrwiXvvr0VyEKAmYuuuiK/exec";

// 5つの正しい大分類定義
const MAIN_CATEGORIES = [
    "シームレス成長支援",
    "主体的な学び",
    "楽しさと好奇心",
    "個性・才能の開花",
    "未来を生き抜く力"
];

let allOpinions = [];

document.addEventListener("DOMContentLoaded", function () {
    // 初回データ読み込み
    fetchOpinions();

    // DOM要素の確実な取得
    const btnAiDraft = document.getElementById("btnAiDraft");
    const btnSubmit = document.getElementById("btnSubmit");
    const btnAdoptAi = document.getElementById("btnAdoptAi");
    const txtContent = document.getElementById("content");
    const aiAssistBox = document.getElementById("aiAssistBox");
    const aiPlaceholder = document.getElementById("aiPlaceholder");
    const aiTitleText = document.getElementById("aiTitleText");
    const aiRefinedText = document.getElementById("aiRefinedText");
    const opinionForm = document.getElementById("opinionForm");

    // 🤖 AI壁打ち機能（200字要約・推奨タイトル生成）
    if (btnAiDraft && txtContent) {
        btnAiDraft.addEventListener("click", async function () {
            const rawText = txtContent.value.trim();
            if (!rawText) {
                alert("意見を先に入力してください。");
                return;
            }

            btnAiDraft.disabled = true;
            btnAiDraft.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> 推敲中...`;

            try {
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "ai_draft", content: rawText })
                });
                const data = await res.json();

                if (data.status === "success") {
                    // 推奨タイトルと200字要約を画面に反映
                    if (aiTitleText) aiTitleText.textContent = data.title || "推奨タイトルが生成されませんでした";
                    if (aiRefinedText) aiRefinedText.textContent = data.refinedText || data.summary || "200字要約が生成されませんでした";
                    
                    if (aiPlaceholder) aiPlaceholder.classList.add("d-none");
                    if (aiAssistBox) aiAssistBox.classList.remove("d-none");
                    if (btnSubmit) btnSubmit.disabled = false;
                } else {
                    alert("AI推敲エラー: " + data.message);
                }
            } catch (err) {
                console.error(err);
                alert("通信エラーが発生しました。");
            } finally {
                btnAiDraft.disabled = false;
                btnAiDraft.textContent = "✨ まずAIに文章を綺麗に整えてもらう";
            }
        });
    }

    // 200字要約を入力欄へ反映させる処理
    if (btnAdoptAi && txtContent && aiRefinedText) {
        btnAdoptAi.addEventListener("click", function () {
            txtContent.value = aiRefinedText.textContent;
            alert("200字要約の文章を入力欄に反映しました。");
        });
    }

    // フォーム送信処理
    if (opinionForm) {
        opinionForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const finalContent = txtContent.value.trim();

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> 送信中...`;

            try {
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "submit", content: finalContent })
                });
                const data = await res.json();

                if (data.status === "success") {
                    alert("送信が完了しました！");
                    opinionForm.reset();
                    if (aiPlaceholder) aiPlaceholder.classList.remove("d-none");
                    if (aiAssistBox) aiAssistBox.classList.add("d-none");
                    if (btnSubmit) btnSubmit.disabled = true;
                    fetchOpinions(); // 一覧と地図を再更新
                } else {
                    alert("送信エラー: " + data.message);
                    btnSubmit.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert("通信エラーが発生しました。");
                btnSubmit.disabled = false;
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

// ① アイデアの地図（課題・提案・魅力をすべて廃止した200字要約版）
function renderIdeaMap() {
    const container = document.getElementById("matrixContainer");
    if (!container) return;
    container.innerHTML = "";

    MAIN_CATEGORIES.forEach((cat, index) => {
        // GAS側のオブジェクトキー（category または 大分類）に柔軟に対応
        const filtered = allOpinions.filter(o => (o.category === cat || o.大分類 === cat));
        
        const itemHtml = `
            <div class="category-accordion-item">
                <div class="category-accordion-header" onclick="toggleAccordion('map-sec-${index}')">
                    <span>📁 ${cat} (${filtered.length}件)</span>
                    <span class="chevron" id="map-sec-${index}-chevron">▼</span>
                </div>
                <div class="category-accordion-body d-none" id="map-sec-${index}-body">
                    <div class="row g-3">
                        ${filtered.length === 0 ? '<p class="text-muted small p-3">この分類にはまだ意見がありません。</p>' : 
                          filtered.map(o => `
                            <div class="col-md-6">
                                <div class="opinion-card border-primary-custom h-100">
                                    <div class="badge-keyword">${o.midCat || o.中分類 || "一般テーマ"}</div>
                                    <div class="card-title-text">${o.title || o.推奨タイトル || "無題の提案"}</div>
                                    <p class="text-secondary small mb-0" style="line-height:1.6;">${o.summary || o.refinedText || o.content || "内容なし"}</p>
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

// ③ 提案箱
function renderTeianBako() {
    const container = document.getElementById("listContainer");
    if (!container) return;
    container.innerHTML = "";

    MAIN_CATEGORIES.forEach((cat, index) => {
        const filtered = allOpinions.filter(o => (o.category === cat || o.大分類 === cat));

        const itemHtml = `
            <div class="category-accordion-item">
                <div class="category-accordion-header" onclick="toggleAccordion('list-sec-${index}')">
                    <span>📥 ${cat} 一覧 (${filtered.length}件)</span>
                    <span class="chevron" id="list-sec-${index}-chevron">▼</span>
                </div>
                <div class="category-accordion-body d-none" id="list-sec-${index}-body">
                    <div class="table-responsive bg-white rounded shadow-sm p-2">
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
                                        <td class="text-muted">${o.summary || o.refinedText || o.content || "内容なし"}</td>
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

// 開閉共通関数
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
