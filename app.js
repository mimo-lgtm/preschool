const GAS_URL = "https://script.google.com/macros/s/AKfycbzS2Bq8kgPcefvyQKB4B5cLN7Shm1mUbrS25cvGhtJgiCMKTmbMPz-4wd1y_7EjrzA/exec";

const MAIN_CATEGORIES = [
    "シームレス成長支援",
    "主体的な学び",
    "楽しさと好奇心",
    "個性・才能の開花",
    "未来を生き抜く力"
];

const FIXED_MID_CATEGORIES = {
    "シームレス成長支援": ["保幼小の連携強化", "切れ目のない相談窓口", "育児休業からの復職支援", "その他"],
    "主体的な学び": ["子ども主導のプロジェクト学習", "選択制のアクティビティ", "デジタルを活用した自己表現", "その他"],
    "楽しさと好奇心": ["五感を使う自然体験", "失敗を歓迎する科学遊び", "地域のアート・文化資源の活用", "その他"],
    "個性・才能の開花": ["個別最適化された学習プラン", "多様な才能を認める評価基準", "特別なニーズを持つ子への支援", "その他"],
    "未来を生き抜く力": ["非認知能力の育成", "多様な人々と協働する体験", "答えのない問いに挑む力", "その他"]
};

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

    // 🖼️ タブ切り替え時に最上部画像を大きく変更するロジック
    const mainHeaderImg = document.getElementById("mainHeaderImg");
    const tabButtons = document.querySelectorAll('button[data-bs-toggle="tab"]');
    
    tabButtons.forEach(button => {
        button.addEventListener('show.bs.tab', function (event) {
            const targetId = event.target.id;
            if (!mainHeaderImg) return;

            if (targetId === "kabechuchi-tab") {
                mainHeaderImg.src = "image/ar.jpg";
            } else if (targetId === "map-tab") {
                mainHeaderImg.src = "image/logic.jpg";
            } else if (targetId === "list-tab") {
                mainHeaderImg.src = "image/teacher.jpg";
            }
        });
    });

    fetchOpinions();

    if (btnAiAnalysis) {
        btnAiAnalysis.addEventListener("click", async function () {
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

                    if (aiSummaryText) aiSummaryText.innerHTML = `<strong>【自動分類】</strong> ${bigCat} ＞ ${midCat}`;

                    if (aiPerspectivesText) {
                        aiPerspectivesText.innerHTML = `
<div class="mb-3"><strong>a. この意見の核心（本当の願い・課題）</strong><br><span class="text-dark">${currentAiResult["核心"] || "分析中"}</span></div>
<div class="mb-3"><strong>b. 実現した場合の市民生活への変化</strong><br><span class="text-dark">${currentAiResult["変化"] || "分析中"}</span></div>
<div class="mb-3"><strong>c. 成功事例（国内外）</strong><br><span class="text-dark">${currentAiResult["成功事例"] || "分析中"}</span></div>
<div class="mb-3"><strong>d. 懸念点と乗り越え方</strong><br><span class="text-dark">${currentAiResult["懸念点"] || "分析中"}</span></div>
<div class="mb-1"><strong>e. さらに発展させるための問い</strong><br><span class="text-dark">${currentAiResult["問い"] || "分析中"}</span></div>
                        `.trim();
                    }

                    if (aiTitleText) aiTitleText.textContent = currentAiResult["推奨タイトル"] || "無題の提案";
                    if (aiRefinedText) aiRefinedText.textContent = currentAiResult["要約200"] || "";

                    if (aiPlaceholder) aiPlaceholder.style.setProperty("display", "none", "important");
                    if (aiAssistBox) {
                        aiAssistBox.style.setProperty("display", "flex", "important");
                        aiAssistBox.classList.remove("d-none");
                    }
                } else {
                    alert("AI分析エラー: " + data.message);
                }
            } catch (err) {
                console.error(err);
                alert("通信エラーが発生しました。");
            } finally {
                btnAiAnalysis.disabled = false;
                btnAiAnalysis.innerHTML = `✨ 1. 意見を送信してAIと壁打ちする`;
            }
        });
    }

    if (btnSubmitToBox) {
        btnSubmitToBox.addEventListener("click", async function () {
            if (!currentAiResult) return;
            const bigCat = currentAiResult["大分類"] || "その他";
            const midCat = currentAiResult["中分類"] || "hidden";

            if (!confirm(`正式に提案箱へ投稿しますか？\n（大分類「${bigCat}」＞ 中分類「${midCat}」へ格納されます）`)) return;

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
                    alert(`投稿が完了しました！\n分野【${bigCat} ＞ ${midCat}】へ格納されました。`);
                    if (txtContent) txtContent.value = "";
                    if (aiAssistBox) aiAssistBox.classList.add("d-none");
                    if (aiPlaceholder) aiPlaceholder.style.removeProperty("display");
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
                alert("送信エラーが発生しました。");
                btnSubmitToBox.disabled = false;
            }
        });
    }
});

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

    MAIN_CATEGORIES.forEach((cat, bIdx) => {
        const catOpinions = allOpinions.filter(o => o.大分類 === cat);
        const midCategories = FIXED_MID_CATEGORIES[cat] || ["その他"];

        let midHtml = "";
        midCategories.forEach((mid, mIdx) => {
            const matchedOpinions = catOpinions.filter(o => o.中分類 === mid);
            
            midHtml += `
                <div class="border rounded mb-2 bg-light">
                    <div class="p-2 fw-bold text-secondary d-flex justify-content-between align-items-center" style="cursor:pointer; font-size:10pt;" onclick="toggleAccordion('map-mid-${bIdx}-${mIdx}')">
                        <span>📂 ${mid} (${matchedOpinions.length}件)</span>
                        <span id="map-mid-${bIdx}-${mIdx}-chevron">▼</span>
                    </div>
                    <div id="map-mid-${bIdx}-${mIdx}-body" class="p-3 bg-white d-none border-top">
                        <div class="row g-2">
                            ${matchedOpinions.length === 0 ? '<p class="text-muted small mb-0">このテーマへの投稿はまだありません。</p>' : 
                              matchedOpinions.map((o, oIdx) => `
                                <div class="col-12">
                                    <div class="p-2 border rounded" style="cursor:pointer; border-left: 3px solid #10b981 !important;" onclick="toggleAccordion('map-op-${bIdx}-${mIdx}-${oIdx}')">
                                        <div class="fw-bold text-dark small d-flex justify-content-between">
                                            <span>📝 ${o.title}</span>
                                            <span id="map-op-${bIdx}-${mIdx}-${oIdx}-chevron">▼</span>
                                        </div>
                                        <div id="map-op-${bIdx}-${mIdx}-${oIdx}-body" class="text-muted small mt-2 pt-2 border-top d-none" style="line-height:1.5;">
                                            ${o.summary}
                                        </div>
                                    </div>
                                </div>
                              `).join('')}
                        </div>
                    </div>
                </div>
            `;
        });

        const itemHtml = `
            <div class="category-accordion-item mb-3 shadow-sm border rounded">
                <div class="category-accordion-header bg-primary text-white p-3 fw-bold d-flex justify-content-between align-items-center" style="cursor:pointer; border-radius: 4px 4px 0 0;" onclick="toggleAccordion('map-big-${bIdx}')">
                    <span>📁 ${cat} (${catOpinions.length}件)</span>
                    <span id="map-big-${bIdx}-chevron">▼</span>
                </div>
                <div class="category-accordion-body p-3 bg-white d-none" id="map-big-${bIdx}-body">
                    ${midHtml}
                </div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", itemHtml);
    });
}

function renderTeianBako() {
    const container = document.getElementById("listContainer");
    if (!container) return;
    container.innerHTML = "";

    MAIN_CATEGORIES.forEach((cat, bIdx) => {
        const catOpinions = allOpinions.filter(o => o.大分類 === cat);
        const midCategories = FIXED_MID_CATEGORIES[cat] || ["その他"];

        let midHtml = "";
        midCategories.forEach((mid, mIdx) => {
            const matchedOpinions = catOpinions.filter(o => o.中分類 === mid);

            midHtml += `
                <div class="border rounded mb-2 bg-light">
                    <div class="p-2 fw-bold text-secondary d-flex justify-content-between align-items-center" style="cursor:pointer; font-size:10pt;" onclick="toggleAccordion('list-mid-${bIdx}-${mIdx}')">
                        <span>📥 ${mid} (${matchedOpinions.length}件)</span>
                        <span id="list-mid-${bIdx}-${mIdx}-chevron">▼</span>
                    </div>
                    <div id="list-mid-${bIdx}-${mIdx}-body" class="p-2 bg-white d-none border-top">
                        <div class="table-responsive">
                            <table class="table table-sm table-hover mb-0 small">
                                <thead class="table-light">
                                    <tr>
                                        <th style="width: 40%">推奨タイトル（クリックで要約展開）</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${matchedOpinions.length === 0 ? '<tr><td class="text-muted text-center py-2">届いた意見はありません。</td></tr>' : 
                                      matchedOpinions.map((o, oIdx) => `
                                        <tr>
                                            <td>
                                                <div class="fw-bold text-dark py-1" style="cursor:pointer;" onclick="toggleAccordion('list-op-${bIdx}-${mIdx}-${oIdx}')">
                                                    📌 ${o.title} <span class="float-end" id="list-op-${bIdx}-${mIdx}-${oIdx}-chevron">▼</span>
                                                </div>
                                                <div id="list-op-${bIdx}-${mIdx}-${oIdx}-body" class="text-muted bg-light p-2 rounded mt-1 d-none" style="line-height:1.5; font-size:9pt;">
                                                    <strong>AI 200字要約:</strong><br>${o.summary}
                                                </div>
                                            </td>
                                        </tr>
                                      `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        });

        const itemHtml = `
            <div class="category-accordion-item mb-3 shadow-sm border rounded">
                <div class="category-accordion-header bg-dark text-white p-3 fw-bold d-flex justify-content-between align-items-center" style="cursor:pointer; border-radius: 4px 4px 0 0;" onclick="toggleAccordion('list-big-${bIdx}')">
                    <span>📥 ${cat} 一覧 (${catOpinions.length}件)</span>
                    <span id="list-big-${bIdx}-chevron">▼</span>
                </div>
                <div class="category-accordion-body p-3 bg-white d-none" id="list-big-${bIdx}-body">
                    ${midHtml}
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
