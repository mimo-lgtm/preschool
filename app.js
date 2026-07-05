// ==========================================
// 1. 設定・定数・グローバル変数定義。
// ==========================================
// ⚠️ 新しいGASのURLを取得されている場合は、以下の "" の中に上書きしてください
const GAS_URL = "https://script.google.com/macros/s/AKfycbzl2w3LIhCKFx0Xw-biVr2bEarkPl3mZWGi-wKLahfG_u4EWdDioF0CLpnn1Mjr2FY0/exec";

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

// ==========================================
// 2. メイン処理（画面初期化・イベント設定）
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const btnAiAnalysis = document.getElementById("btnAiAnalysis"); 
    const btnSubmitToBox = document.getElementById("btnSubmitToBox");
    const aiPlaceholder = document.getElementById("aiPlaceholder");
    const aiAssistBox = document.getElementById("aiAssistBox");
    const aiSummaryText = document.getElementById("aiSummaryText");
    const aiPerspectivesText = document.getElementById("aiPerspectivesText");
    const aiTitleText = document.getElementById("aiTitleText");
    const aiRefinedText = document.getElementById("aiRefinedText");

    // ✨ 最優先でデータを読み込む（画像エラーの巻き添えを防ぐ安全設計）
    fetchOpinions();

    // 📄 AI分析（壁打ち）ボタンのイベント
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

    // 📤 提案箱へ正式投稿するボタンのイベント
    if (btnSubmitToBox) {
        btnSubmitToBox.addEventListener("click", async function () {
            if (!currentAiResult) return;
            const bigCat = currentAiResult["大分類"] || "その他";
            const midCat = currentAiResult["中分類"] || "その他";

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
                    alert(`📥 投稿が完了しました！\n\nあなたのアイデアは\n【大分類：${bigCat}】＞【中分類：${midCat}】\nのプロセス提案箱にリアルタイムに格納されました。`);
                    
                    if (txtContent) txtContent.value = "";
                    if (aiAssistBox) aiAssistBox.classList.add("d-none");
                    if (aiPlaceholder) aiPlaceholder.style.removeProperty("display");
                    currentAiResult = null;

                    // データの再読み込みと画面の再描画
                    await fetchOpinions();

                    // 新しいID名（list-tab-btn）に対応して自動でタブを切り替え
                    const listTabBtn = document.getElementById("list-tab-btn");
                    if (listTabBtn) {
                        listTabBtn.click();
                    }
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

// ==========================================
// 3. データ取得・バックエンド連携（本番仕様版）
// ==========================================
async function fetchOpinions() {
    try {
        // スプレッドシートからデータを取得
        const res = await fetch(GAS_URL + "?action=get");
        const data = await res.json();
        
        // データ形式を配列に整える
        if (Array.isArray(data)) {
            allOpinions = data;
        } else if (data && data.opinions) {
            allOpinions = data.opinions;
        } else {
            allOpinions = [];
        }
        
        // 取得したデータを地図と提案箱に流し込む
        renderStructuredIdeas(allOpinions);

    } catch (e) {
        console.error("データ取得に失敗しました:", e);
    }
}

// ==========================================
// 4. アイデアの地図 ＆ 提案箱の描画ロジック（スプレッドシート完全一致版）
// ==========================================
function renderStructuredIdeas(ideasDataset) {
    // 画面の各エリアを初期化
    for (let i = 1; i <= 5; i++) {
        const mapPillar = document.getElementById(`map-pillar-${i}`);
        if (mapPillar) mapPillar.innerHTML = "";
    }
    const proposalContainer = document.getElementById("proposal-container");
    if (proposalContainer) proposalContainer.innerHTML = "";

    // あなた本来の意図に修正した5つの柱の定義
    const pillarRules = [
        { id: 1, name: "🌱 1. 探究心を育む知育環境（主体的な学び）", keyword: "主体" },
        { id: 2, name: "🎨 2. 学問の楽しさと感性の融合（楽しさと好奇心）", keyword: "好奇心" },
        { id: 3, name: "🤝 3. 逆境を跳ね返すサバイバル能力（未来を生き抜く力）", keyword: "未来" },
        { id: 4, name: "🌳 4. 個性の開花ととことんやり抜く環境（才能の応援）", keyword: "個性" },
        { id: 5, name: "🌐 5. 学校の枠に縛られない個別最適化教育（自由な学び）", keyword: "シームレス" }
    ];

    // 5つの柱ごとにデータを仕分けして描画
    pillarRules.forEach(rule => {
        const pillarId = rule.id;
        
        // スプレッドシートの「大分類（category）」にキーワードが含まれるデータを抽出
        const pillarIdeas = ideasDataset.filter(item => {
            if (!item.category) return false;
            return String(item.category).trim().includes(rule.keyword);
        });
        
        // 提案箱（タブ3）用の外枠（セクション）を作成
        const pillarSection = document.createElement("div");
        pillarSection.className = "mb-4 p-3 border rounded bg-light shadow-sm";
        pillarSection.innerHTML = `<h5 class="fw-bold border-bottom pb-2 text-dark">${rule.name}</h5>`;

        // 「元記事」以外のメインアイデア（新統合、または単独提案）
        const mainIdeas = pillarIdeas.filter(item => {
            const statusStr = item.status ? String(item.status).trim() : "";
            return statusStr !== "元記事";
        });
        
        // 該当データが一切ない場合の表示
        const hasOriginals = pillarIdeas.some(item => String(item.status).trim() === "元記事");
        if (mainIdeas.length === 0 && !hasOriginals) {
            pillarSection.innerHTML += `<p class="text-muted small">投稿されたアイデアはまだありません。</p>`;
        }

        // メインアイデアの描画処理
        mainIdeas.forEach(idea => {
            let badgeColor = "bg-info text-dark";
            let displayStatus = idea.status ? String(idea.status).trim() : "";
            
            // H列が「新統合」なら緑バッジ、それ以外（表示・空欄など）なら水色の「単独提案」
            if (displayStatus === "新統合") {
                badgeColor = "bg-success";
            } else {
                displayStatus = "単独提案";
                badgeColor = "bg-info text-dark";
            }

            // 【提案箱（タブ3）】へカードを追加
            const card = `
                <div class="card mb-2 shadow-sm border-0">
                    <div class="card-body p-3">
                        <span class="badge ${badgeColor} mb-2">${displayStatus}</span>
                        <h6 class="fw-bold text-dark mb-1">${idea.title || "無題の提案"}</h6>
                        <p class="small text-secondary mb-0">${idea.summary || ""}</p>
                    </div>
                </div>
            `;
            pillarSection.innerHTML += card;

            // 【アイデアの地図（タブ2）】へカードを追加（「新統合」に指定した記事がここに載ります）
            if (displayStatus === "新統合") {
                const mapPillar = document.getElementById(`map-pillar-${pillarId}`);
                if (mapPillar) {
                    mapPillar.innerHTML += `
                        <div class="p-3 mb-2 border-start border-success border-4 bg-light rounded shadow-sm">
                            <span class="badge bg-success mb-2">新統合</span>
                            <h5 class="fw-bold text-success mb-1">${idea.title || "無題の提案"}</h5>
                            <p class="mb-0 text-secondary small">${idea.summary || ""}</p>
                        </div>
                    `;
                }
            }
        });

        // 「元記事」に指定されたデータをアコーディオン（折りたたみ）形式で格納
        const originalIdeas = pillarIdeas.filter(item => {
            const statusStr = item.status ? String(item.status).trim() : "";
            return statusStr === "元記事";
        });

        if (originalIdeas.length > 0) {
            const subAccordionId = `subCollapse-original-${pillarId}`;
            let originalSectionHtml = `
                <div class="mt-3">
                    <button class="btn btn-sm btn-outline-secondary w-100 text-start d-flex justify-content-between align-items-center" type="button" data-bs-toggle="collapse" data-bs-target="#${subAccordionId}">
                        <span>📂 この分野の「元記事」一覧 (${originalIdeas.length}件)</span>
                        <small class="text-muted">クリックで開閉</small>
                    </button>
                    <div class="collapse mt-2" id="${subAccordionId}">
                        <div class="p-2 border rounded bg-white" style="max-height: 300px; overflow-y: auto;">
            `;

            originalIdeas.forEach(orig => {
                // I列（mergedTo）または L列（aiJson / AI分析深掘り）に入っている統合理由を取得
                let reasonText = orig.mergedTo ? String(orig.mergedTo).trim() : "";
                if (!reasonText && orig.aiJson) {
                    reasonText = String(orig.aiJson).trim();
                }
                if (!reasonText) {
                    reasonText = '類似した投稿のため、新統合記事へ集約されました。';
                }

                originalSectionHtml += `
                    <div class="p-2 mb-2 border-bottom last-border-0 bg-light-subtle rounded">
                        <span class="badge bg-secondary mb-1">元記事</span>
                        <h6 class="fw-bold text-muted mb-1" style="text-decoration: line-through;">${orig.title || "無題の提案"}</h6>
                        <p class="text-danger small mb-1" style="font-size: 0.75rem; font-weight: 500;">🔄 統合理由: ${reasonText}</p>
                        <p class="small text-muted mb-0">${orig.summary || ""}</p>
                    </div>
                `;
            });

            originalSectionHtml += `</div></div></div>`;
            pillarSection.innerHTML += originalSectionHtml;
        }

        if (proposalContainer) {
            proposalContainer.appendChild(pillarSection);
        }
    });

    // 地図側で新統合データがまだ無い場合のケア表示
    for (let i = 1; i <= 5; i++) {
        const mapPillar = document.getElementById(`map-pillar-${i}`);
        if (mapPillar && mapPillar.innerHTML.trim() === "") {
            mapPillar.innerHTML = `<p class="text-muted small mb-0">現在、この分野の「新統合」アイデアはありません。</p>`;
        }
        　
    }
}
