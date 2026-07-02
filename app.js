// GASのWebアプリURL（ご自身のURLのままであれば差し替え不要です）
const GAS_URL = "https://script.google.com/macros/s/AKfycbwgOIK3P6wmltLLxFrPdEuiGko8u8Ty4WAFaIDLZLIrcfUWrwiXvvr0VyEKAmYuuuiK/exec";

// 5つの大分類の固定定義
const MAIN_CATEGORIES = [
    "シームレス成長支援",
    "主体的な学び",
    "楽しさと好奇心",
    "個性・才能の開花",
    "未来を生き抜く力",
    "その他"
];

let allOpinions = [];

document.addEventListener("DOMContentLoaded", function () {
    // データの初回読み込み
    fetchOpinions();

    // ── AI壁打ちロジック群 ──
    const btnAiDraft = document.getElementById("btnAiDraft");
    const btnSubmit = document.getElementById("btnSubmit");
    const btnAdoptAi = document.getElementById("btnAdoptAi");
    const txtContent = document.getElementById("content");
    const aiAssistBox = document.getElementById("aiAssistBox");
    const aiPlaceholder = document.getElementById("aiPlaceholder");
    const aiRefinedText = document.getElementById("aiRefinedText");
    const opinionForm = document.getElementById("opinionForm");

    if (btnAiDraft && txtContent) {
        // AI文章推敲（200字要約）の実行
        btnAiDraft.addEventListener("click", async function () {
            const rawText = txtContent.value.trim();
            if (!rawText) {
                alert("意見を先に入力してください。");
                return;
            }

            btnAiDraft.disabled = true;
            btnAiDraft.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> AI推敲中...`;

            try {
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "ai_draft", content: rawText })
                });
                const data = await res.json();

                if (data.status === "success") {
                    aiRefinedText.textContent = data.refinedText;
                    aiPlaceholder.classList.add("d-none");
                    aiAssistBox.classList.remove("d-none");
                    btnSubmit.disabled = false; // 送信を許可
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

    // AIが作成した200字文章を上の入力欄にコピー（スマホ・PC完全対応）
    if (btnAdoptAi && txtContent && aiRefinedText) {
        btnAdoptAi.addEventListener("click", function () {
            txtContent.value = aiRefinedText.textContent;
            alert("洗練された文章を入力欄に反映しました！");
        });
    }

    // 最終送信処理
    if (opinionForm) {
        opinionForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const finalContent = txtContent.value.trim();

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 送信中...`;

            try {
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "submit", content: finalContent })
                });
                const data = await res.json();

                if (data.status === "success") {
                    alert(`送信が完了しました！\n\nAI自動識別結果:\n【大分類】 ${data.result.大分類}\n【中分類】 ${data.result.中分類}`);
                    opinionForm.reset();
                    aiPlaceholder.classList.remove("d-none");
                    aiAssistBox.classList.add("d-none");
                    btnSubmit.disabled = true;
                    // 再読み込みして地図と提案箱を更新
                    fetchOpinions();
                } else {
                    alert("送信エラー: " + data.message);
                    btnSubmit.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert("送信中に通信エラーが発生しました。");
                btnSubmit.disabled = false;
            }
        });
    }
});

// HTML側のエラーを完全に防ぐための空のグローバル関数定義
window.filterByMainCategory = function(cat) {
    console.log("Category clicked: " + cat);
};

// スプレッドシートからデータを取得
async function fetchOpinions() {
    try {
        const res = await fetch(GAS_URL);
        allOpinions = await res.json();
        
        // エラーデータや配列でない場合の防衛策
        if (!Array.isArray(allOpinions)) {
            allOpinions = [];
        }

        renderIdeaMap();
        renderTeianBako();
    } catch (err) {
        console.error("データ取得失敗:", err);
    }
}

// ① 「アイデアの地図」をレンダリング（大分類アコーディオンの中にすっきり200字要約を表示）
function renderIdeaMap() {
    const container = document.getElementById("matrixContainer");
    if (!container) return;
    container.innerHTML = "";

    MAIN_CATEGORIES.forEach((cat, index) => {
        // 該当する大分類の意見を抽出
        const filtered = allOpinions.filter(o => o.category === cat);
        
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
                                    <div class="badge-keyword">${o.midCat || "一般テーマ"}</div>
                                    <div class="card-title-text">${o.title || "無題の提案"}</div>
                                    <p class="text-secondary small mb-0" style="line-height:1.6;">${o.summary || o.content}</p>
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

// ③ 「提案箱」をレンダリング（最初は大分類のみ。クリックで一覧開閉）
function renderTeianBako() {
    const container = document.getElementById("listContainer");
    if (!container) return;
    container.innerHTML = "";

    MAIN_CATEGORIES.forEach((cat, index) => {
        const filtered = allOpinions.filter(o => o.category === cat);

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
                                    <th style="width: 15%">中分類</th>
                                    <th style="width: 25%">推奨タイトル</th>
                                    <th style="width: 60%">AI 200字要約</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.length === 0 ? '<tr><td colspan="3" class="text-muted text-center py-3">届いた意見はありません。</td></tr>' : 
                                  filtered.map(o => `
                                    <tr>
                                        <td><span class="badge bg-secondary">${o.midCat || "未定"}</span></td>
                                        <td class="fw-bold text-dark">${o.title || "無題"}</td>
                                        <td class="text-muted">${o.summary || o.content}</td>
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

// アコーディオンの共通開閉ロジック
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
