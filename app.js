// ==========================================
// 1. 設定・定数・グローバル変数定義
// ==========================================
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

    // 🖼️ タブ切り替え時に最上部画像を大きく変更するロジック（初期画像はheader.jpg）
    const mainHeaderImg = document.getElementById("mainHeaderImg");
    const tabButtons = document.querySelectorAll('button[data-bs-toggle="tab"]');
    
    if (mainHeaderImg) {
        mainHeaderImg.src = "image/header.jpg";
    }
    
    tabButtons.forEach(button => {
        button.addEventListener('show.bs.tab', function (event) {
            const targetId = event.target.id;
            if (!mainHeaderImg) return;

            if (targetId === "kabechuchi-tab" || targetId === "kabechuchi-tab-btn") {
                mainHeaderImg.src = "image/header.jpg";
            } else if (targetId === "map-tab" || targetId === "map-tab-btn") {
                mainHeaderImg.src = "image/logic.jpg";
            } else if (targetId === "list-tab" || targetId === "list-tab-btn") {
                mainHeaderImg.src = "image/teacher.jpg";
            }
        });
    });

    // 初期データの読み込み（GASから既存データを取得）
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
                    // 📥 どこに格納されたのかがパッと見えるポップアップ通知
                    alert(`📥 投稿が完了しました！\n\nあなたのアイデアは\n【大分類：${bigCat}】＞【中分類：${midCat}】\nのプロセス提案箱にリアルタイムに格納されました。`);
                    
                    if (txtContent) txtContent.value = "";
                    if (aiAssistBox) aiAssistBox.classList.add("d-none");
                    if (aiPlaceholder) aiPlaceholder.style.removeProperty("display");
                    currentAiResult = null;

                    // データの再読み込みと再描画
                    await fetchOpinions();

                    // 🏃‍♂️ AI壁打ちページから「提案箱（一覧）タブ」へ画面を切り替え
                    const listTabBtn = document.getElementById("list-tab-btn") || document.getElementById("list-tab");
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
// 3. データ取得・バックエンド連携
// ==========================================
async function fetchOpinions() {
    try {
        const res = await fetch(GAS_URL + "?action=get");
        const data = await res.json();
        allOpinions = data.opinions || [];
        
        // 取得したデータを新ルールに基づいて描画
        renderStructuredIdeas(allOpinions);
    } catch (e) {
        console.error("データ取得に失敗しました:", e);
    }
}

// ==========================================
// 4. 【新ルール】アイデアの地図 ＆ 提案箱の描画ロジック
// ==========================================
function renderStructuredIdeas(ideasDataset) {
    // 5つの柱のコンテナを初期化
    for (let i = 1; i <= 5; i++) {
        const mapPillar = document.getElementById(`map-pillar-${i}`);
        if (mapPillar) mapPillar.innerHTML = "";
    }
    const proposalContainer = document.getElementById("proposal-container");
    if (proposalContainer) proposalContainer.innerHTML = "";

    // GASの大分類テキストとHTMLの「5つの柱（1〜5）」の紐づけ定義
    const pillarMapping = {
        "シームレス成長支援": 5,
        "主体的な学び": 1,
        "楽しさと好奇心": 2,
        "個性・才能の開花": 4,
        "未来を生き抜く力": 3
    };

    const pillarNames = [
        "🌱 1. 探究心を育む知育環境",
        "🎨 2. 感性を磨くアートと表現",
        "🤝 3. 協調性を養うグループワーク",
        "🌳 4. 心身を健やかに育てる自然体験",
        "🌐 5. 地域と言語を繋ぐグローバルコミュニケーション"
    ];

    pillarNames.forEach((name, index) => {
        const pillarId = index + 1;
        
        // この大分類（柱）に該当するデータを全抽出
        const pillarIdeas = ideasDataset.filter(item => {
            // item.category（大分類名）から対応する柱の番号を取得
            const mappedId = pillarMapping[item.category];
            return mappedId === pillarId;
        });
        
        // 📦 提案箱用：大分類ごとのボックス枠を生成
        const pillarSection = document.createElement("div");
        pillarSection.className = "mb-4 p-3 border rounded bg-light shadow-sm";
        pillarSection.innerHTML = `<h5 class="fw-bold border-bottom pb-2 text-dark">${name}</h5>`;

        // 「単独提案」と「新統合」を抽出して先に並べる
        const mainIdeas = pillarIdeas.filter(item => item.status !== "元記事");
        
        if (mainIdeas.length === 0 && pillarIdeas.filter(item => item.status === "元記事").length === 0) {
            pillarSection.innerHTML += `<p class="text-muted small">投稿されたアイデアはまだありません。</p>`;
        }

        mainIdeas.forEach(idea => {
            // ステータス（単独提案 / 新統合）に応じたバッジの色分け
            let badgeColor = "bg-primary";
            // サーバー側が「未統合」と返してきた場合は「単独提案」として扱う
            let displayStatus = idea.status;
            if (displayStatus === "未統合" || !displayStatus) displayStatus = "単独提案";

            if (displayStatus === "新統合") badgeColor = "bg-success";
            if (displayStatus === "単独提案") badgeColor = "bg-info text-dark";

            const card = `
                <div class="card mb-2 shadow-sm border-0">
                    <div class="card-body p-3">
                        <span class="badge ${badgeColor} mb-2">${displayStatus}</span>
                        <h6 class="fw-bold text-dark mb-1">${idea.title || idea.推奨タイトル || "無題の提案"}</h6>
                        <p class="small text-secondary mb-0">${idea.summary || idea.要約200 || ""}</p>
                    </div>
                </div>
            `;
            pillarSection.innerHTML += card;

            // 🗺️ 【アイデアの地図】側のアコーディオン内部には「新統合」された完成形のみを格納
            if (displayStatus === "新統合") {
                const mapPillar = document.getElementById(`map-pillar-${pillarId}`);
                if (mapPillar) {
                    mapPillar.innerHTML += `
                        <div class="p-3 mb-2 border-start border-success border-4 bg-light rounded shadow-sm">
                            <span class="badge bg-success mb-2">新統合</span>
                            <h5 class="fw-bold text-success mb-1">${idea.title || idea.推奨タイトル}</h5>
                            <p class="mb-0 text-secondary small">${idea.summary || idea.要約200}</p>
                        </div>
                    `;
                }
            }
        });

        // 📂 大量に増える「元記事」を、各大分類の中に設置した個別折りたたみ（アコーディオン）に隠して整理
        const originalIdeas = pillarIdeas.filter(item => item.status === "元記事");
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
                originalSectionHtml += `
                    <div class="p-2 mb-2 border-bottom last-border-0 bg-light-subtle rounded">
                        <span class="badge bg-secondary mb-1">元記事</span>
                        <h6 class="fw-bold text-muted mb-1" style="text-decoration: line-through;">${orig.title || orig.推奨タイトル || "無題の提案"}</h6>
                        <p class="text-danger small mb-1" style="font-size: 0.75rem; font-weight: 500;">🔄 統合理由: ${orig.reason || '類似した投稿のため、新統合記事へ集約されました。'}</p>
                        <p class="small text-muted mb-0">${orig.summary || orig.要約200 || ""}</p>
                    </div>
                `;
            });

            originalSectionHtml += `</div></div></div>`;
            pillarSection.innerHTML += originalSectionHtml;
        }

        // 提案箱コンテナへ大分類ボックスを追加
        if (proposalContainer) {
            proposalContainer.appendChild(pillarSection);
        }
    });

    // アイデアの地図側で、新統合が1件もない柱にプレースホルダーを表示
    for (let i = 1; i <= 5; i++) {
        const mapPillar = document.getElementById(`map-pillar-${i}`);
        if (mapPillar && mapPillar.innerHTML.trim() === "") {
            mapPillar.innerHTML = `<p class="text-muted small mb-0">現在、この分野の「新統合」アイデアはありません。</p>`;
        }
    }
}
