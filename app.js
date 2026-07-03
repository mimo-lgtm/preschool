// ==========================================
// 🌐 設定エリア（GASのWebアプリURL）
// ==========================================
// ⚠️ GAS側を修正して「新しいデプロイ」を行った後の最新URLを貼り付けてください
const GAS_URL = "https://script.google.com/macros/s/AKfycbzS2Bq8kgPcefvyQKB4B5cLN7Shm1mUbrS25cvGhtJgiCMKTmbMPz-4wd1y_7EjrzA/exec";

const MAIN_CATEGORIES = [
    "シームレス成長支援",
    "主体的な学び",
    "楽しさと好奇心",
    "個性・才能の開花",
    "未来を生き抜く力"
];

let allOpinions = [];
let currentAiResult = null;

document.addEventListener("DOMContentLoaded", function () {
    const btnAiAnalysis = document.getElementById("btnAiAnalysis"); 
    const btnSubmitToBox = document.getElementById("btnSubmitToBox");

    const aiPlaceholder = document.getElementById("aiPlaceholder");
    const aiAssistBox = document.getElementById("aiAssistBox");
    
    const aiSummaryText = document.getElementById("aiSummaryText");
    const aiPerspectivesText = document.getElementById("aiPerspectivesText");
    const aiTitleText = document.getElementById("aiTitleText");
    const aiRefinedText = document.getElementById("aiRefinedText");

    fetchOpinions();

    // 🧠 1. 「AIと壁打ちする」ボタンのクリック処理
    if (btnAiAnalysis) {
        btnAiAnalysis.addEventListener("click", async function () {
            console.log("🚀 AI壁打ちボタンがクリックされました");
            
            const txtContent = document.getElementById("content");
            const contentValue = txtContent ? txtContent.value.trim() : "";

            if (!contentValue) {
                alert("あなたの想いやアイデアを自由に入力してください。");
                return;
            }

            btnAiAnalysis.disabled = true;
            btnAiAnalysis.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> AIが思考を整理中...`;

            try {
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify({ action: "analyze", content: contentValue })
                });
                const data = await res.json();

                if (data.status === "success") {
                    currentAiResult = data.result;

                    const bigCat = currentAiResult["大分類"] || "その他";
                    const midCat = currentAiResult["中分類"] || "その他";

                    // 1. 【自動分類】の表示（固定項目のみ。余計な説明文やキーワードは完全削除）
                    if (aiSummaryText) {
                        aiSummaryText.innerHTML = `<strong>【自動分類】</strong> ${bigCat} ＞ ${midCat}`;
                    }

                    // 2. 【5つの視点による深掘り】の表示（ご指定のa〜eの分析項目をそのままマッピング）
                    if (aiPerspectivesText) {
                        aiPerspectivesText.innerHTML = `
<div class="mb-3"><strong>a. この意見の核心（本当の願い・課題）</strong><br><span class="text-dark">${currentAiResult["核心"] || "分析中"}</span></div>
<div class="mb-3"><strong>b. 実現した場合の市民生活への変化</strong><br><span class="text-dark">${currentAiResult["変化"] || "分析中"}</span></div>
<div class="mb-3"><strong>c. 成功事例（国内外）</strong><br><span class="text-dark">${currentAiResult["成功事例"] || "分析中"}</span></div>
<div class="mb-3"><strong>d. 懸念点と乗り越え方</strong><br><span class="text-dark">${currentAiResult["懸念点"] || "分析中"}</span></div>
<div class="mb-1"><strong>e. さらに発展させるための問い</strong><br><span class="text-dark">${currentAiResult["問い"] || "分析中"}</span></div>
                        `.trim();
                    }

                    // 3. 👑 推奨タイトル
                    if (aiTitleText) {
                        aiTitleText.textContent = currentAiResult["推奨タイトル"] || "無題の提案";
                    }

                    // 4. 📝 200字要約
                    if (aiRefinedText) {
                        aiRefinedText.textContent = currentAiResult["要約200"] || "";
                    }

                    // 初期プレースホルダーボックスを完全に消去
                    if (aiPlaceholder) {
                        aiPlaceholder.style.setProperty("display", "none", "important");
                    }
                    // 分析結果エリアを表示
                    if (aiAssistBox) {
                        aiAssistBox.style.setProperty("display", "flex", "important");
                        aiAssistBox.classList.remove("d-none");
                    }
                } else {
                    alert("AI分析エラー: " + data.message);
                }
            } catch (err) {
                console.error("🚨 エラー詳細:", err);
                alert("通信エラーが発生しました。");
            } finally {
                btnAiAnalysis.disabled = false;
                btnAiAnalysis.innerHTML = `✨ 1. 意見を送信してAIと壁打ちする`;
            }
        });
    }

    // 📥 2. 「この内容で提案箱へ投稿する」ボタンのクリック処理
    if (btnSubmitToBox) {
        btnSubmitToBox.addEventListener("click", async function () {
            if (!currentAiResult) return;

            const bigCat = currentAiResult["大分類"] || "その他";
            const midCat = currentAiResult["中分類"] || "その他";

            const confirmPost = confirm(`AIが整理した内容で、正式に提案箱へ投稿しますか？\n（大分類「${bigCat}」の中の中分類「${midCat}」に格納されます）`);
            if (!confirmPost) return;

            const txtContent = document.getElementById("content");
            const rawText = txtContent ? txtContent.value.trim() : "";

            btnSubmitToBox.disabled = true;
            btnSubmitToBox.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> 提案箱へ投稿中...`;

            try {
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify({
                        action: "submit",
                        content: rawText,
                        title: currentAiResult["推奨タイトル"],
                        summary: currentAiResult["要約200"],
                        category: bigCat, 
                        midCat: midCat
                    })
                });
                const data = await res.json();

                if (data.status === "success") {
                    alert(`提案箱への投稿が正常に完了しました！\n分野【${bigCat} ＞ ${midCat}】へ格納されました。`);
                    
                    if (txtContent) txtContent.value = "";
                    
                    if (aiAssistBox) aiAssistBox.classList.add("d-none");
                    if (aiPlaceholder) {
                        aiPlaceholder.style.removeProperty("display");
                    }
                    currentAiResult = null;

                    await fetchOpinions();
                    
                    const mapTabBtn = document.getElementById("map-tab");
                    if (mapTabBtn) mapTabBtn.click();
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

// ==========================================
// 📊 データ取得 & 各種レンダリング (以下、変更なし)
// ==========================================
async function fetchOpinions() {
    try {
        const res = await fetch(GAS_URL);
        let data = await res.json();
        if (Array.isArray(data)) {
            allOpinions = data.map(item => ({
                大分類: item.category || "その他",
                category: item.category || "その他",
                中分類: item.midCat || "その他",
                midCat: item.midCat || "その他",
                推奨タイトル: item.title || "無題の提案",
                title: item.title || "無題の提案",
                summary: item.summary || item.content || "内容なし"
            }));
        }
        renderIdeaMap();
        renderTeianBako();
    } catch (err) {
        console.error("データ取得エラー:", err);
    }
}

function renderIdeaMap() {
    const container = document.getElementById("matrixContainer");
    if (!container) return;
    container.innerHTML = "";

    MAIN_CATEGORIES.forEach((cat, index) => {
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
                                <div class="opinion-card border-primary-custom h-100 p-3 bg-white border rounded" style="border-left: 4px solid #3b82f6 !important;">
                                    <div class="badge bg-secondary mb-2" style="font-size:8pt;">${o.midCat || o.中分類 || "その他"}</div>
                                    <div class="fw-bold text-dark mb-2" style="font-size:10.5pt;">${o.title || o.推奨タイトル || "無題の提案"}</div>
                                    <p class="text-muted small mb-0" style="line-height:1.6;">${o.summary || "内容なし"}</p>
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

// ③ 【届いた提案箱】の描画
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
                                        <td><span class="badge bg-secondary">${o.midCat || o.中分類 || "その他"}</span></td>
                                        <td class="fw-bold text-dark">${o.title || o.推奨タイトル || "無題"}</td>
                                        <td class="text-muted" style="line-height:1.5;">${o.summary || "内容なし"}</td>
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
