{
    // ==========================================
    // 🌐 設定エリア（GASのWebアプリURL）
    // ==========================================
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwgOIK3P6wmltLLxFrPdEuiGko8u8Ty4WAFaIDLZLIrcfUWrwiXvvr0VyEKAmYuuuiK/exec";

    // 固定された5つの大分類
    const MAIN_CATEGORIES = [
        "シームレス成長支援",
        "主体的な学び",
        "楽しさと好奇心",
        "個性・才能の開花",
        "未来を生き抜く力"
    ];

    // 暫定で定義する中分類のマッピング
    const DEFAULT_MID_CATEGORIES = {
        "シームレス成長支援": ["保幼小の連携強化", "切れ目のない相談窓口", "育児休業からの復職支援", "その他支援"],
        "主体的な学び": ["子ども主導のプロジェクト学習", "選択制のアクティビティ", "デジタルを活用した自己表現", "その他学び"],
        "楽しさと好奇心": ["五感を使う自然体験", "失敗を歓迎する科学遊び", "地域のアート・文化資源の活用", "その他好奇心"],
        "個性・才能の開花": ["個別最適化された学習プラン", "多様な才能を認める評価基準", "特別なニーズを持つ子への支援", "その他個性"],
        "未来を生き抜く力": ["非認知能力の育成", "多様な人々と協働する体験", "答えのない問いに挑む力", "その他未来力"]
    };

    let allOpinions = [];
    let currentAiResult = null;

    // ==========================================
    // 🎬 初期化処理
    // ==========================================
    document.addEventListener("DOMContentLoaded", function () {
        fetchOpinions();

        const btnAiAnalysis = document.getElementById("btnAiAnalysis");
        const btnSubmitToBox = document.getElementById("btnSubmitToBox");

        // 🧠 1. AI壁打ちボタンのクリックイベント
        if (btnAiAnalysis) {
            btnAiAnalysis.addEventListener("click", async function () {
                const txtContent = document.getElementById("content");
                const contentValue = txtContent ? txtContent.value.trim() : "";

                if (!contentValue) {
                    alert("あなたの想いやアイデアを自由に入力してください。");
                    return;
                }

                btnAiAnalysis.disabled = true;
                btnAiAnalysis.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> AIが深掘り分析中...`;

                try {
                    const res = await fetch(GAS_URL, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain" },
                        body: JSON.stringify({ action: "analyze", content: contentValue })
                    });
                    const data = await res.json();

                    if (data.status === "success") {
                        currentAiResult = data.result;

                        // 1. 各出力をHTMLのパーツへ確実にマッピング
                        document.getElementById("aiTitleText").textContent = currentAiResult.推奨タイトル || "無題の提案";
                        document.getElementById("aiSummaryText").textContent = currentAiResult.概要 || "（概要の取得に失敗しました）";
                        document.getElementById("aiRefinedText").textContent = currentAiResult.要約200 || "（要約の取得に失敗しました）";

                        // 2. 5つの視点（a〜e）を厳格に組み立てて表示
                        const perspectivesContainer = document.getElementById("aiPerspectivesText");
                        if (perspectivesContainer) {
                            perspectivesContainer.innerHTML = `
                                <div class="perspective-box"><strong>a. 意見の核心:</strong> ${currentAiResult.視点_a || currentAiResult.核心 || "未抽出"}</div>
                                <div class="perspective-box"><strong>b. 市民生活の変化:</strong> ${currentAiResult.視点_b || currentAiResult.変化 || "未抽出"}</div>
                                <div class="perspective-box"><strong>c. 成功事例:</strong> ${currentAiResult.視点_c || currentAiResult.事例 || "未抽出"}</div>
                                <div class="perspective-box"><strong>d. 懸念点と乗り越え方:</strong> ${currentAiResult.視点_d || currentAiResult.対策 || "未抽出"}</div>
                                <div class="perspective-box"><strong>e. さらに発展させる問い:</strong> ${currentAiResult.視点_e || currentAiResult.問い || "未抽出"}</div>
                            `;
                        }

                        // 3. 配置・統合理由の表示
                        const mergeReasonContainer = document.getElementById("aiMergeReasonText");
                        if (mergeReasonContainer) {
                            const isMerged = currentAiResult.統合フラグ ? "【既存の類似意見に統合】" : "【新規意見として配置】";
                            mergeReasonContainer.innerHTML = `<strong>${isMerged}</strong><br>${currentAiResult.統合理由 || currentAiResult.配置理由 || "既存のご意見と照らし合わせ、適切なカテゴリに配置しました。"}`;
                        }

                        // 表示枠を可視化
                        const aiAssistBox = document.getElementById("aiAssistBox");
                        const aiPlaceholder = document.getElementById("aiPlaceholder");
                        if (aiPlaceholder) aiPlaceholder.classList.add("d-none");
                        if (aiAssistBox) {
                            aiAssistBox.style.setProperty("display", "block", "important");
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

        // 📥 2. 投稿するボタンのクリックイベント
        if (btnSubmitToBox) {
            btnSubmitToBox.addEventListener("click", async function () {
                if (!currentAiResult) return;

                const txtContent = document.getElementById("content");
                const rawText = txtContent ? txtContent.value.trim() : "";

                btnSubmitToBox.disabled = true;
                btnSubmitToBox.innerHTML = `投稿中...`;

                try {
                    const res = await fetch(GAS_URL, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain" },
                        body: JSON.stringify({
                            action: "submit",
                            content: rawText,
                            title: currentAiResult.推奨タイトル,
                            summary: currentAiResult.要約200,
                            category: currentAiResult.大分類 || "その他",
                            midCat: currentAiResult.中分類 || "その他テーマ",
                            mergeReason: currentAiResult.統合理由 || ""
                        })
                    });
                    const data = await res.json();

                    if (data.status === "success") {
                        alert("提案箱への投稿が正常に完了しました。");
                        if (txtContent) txtContent.value = "";
                        document.getElementById("aiAssistBox").classList.add("d-none");
                        currentAiResult = null;
                        fetchOpinions();
                    } else {
                        alert("投稿に失敗しました: " + data.message);
                    }
                } catch (err) {
                    console.error(err);
                    alert("送信エラーが発生しました。");
                } finally {
                    btnSubmitToBox.disabled = false;
                    btnSubmitToBox.innerHTML = `📥 2. この内容で提案箱へ投稿する`;
                }
            });
        }
    });

    // ==========================================
    // 📊 データ取得 & ドリルダウンレンダリング
    // ==========================================
    async function fetchOpinions() {
        try {
            const res = await fetch(GAS_URL);
            const data = await res.json();
            allOpinions = Array.isArray(data) && data.length >= 3 ? data : getMockData();
        } catch (err) {
            console.log("リモートデータ未取得のため、模擬データを読み込みます。");
            allOpinions = getMockData();
        }
        renderDrillDownContainer("matrixContainer", "map");
        renderDrillDownContainer("listContainer", "list");
    }

    // 地図と提案箱、両方に対応するドリルダウン（階層型）生成関数
    function renderDrillDownContainer(containerId, prefix) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";

        MAIN_CATEGORIES.forEach((mainCat, mIdx) => {
            const midCats = DEFAULT_MID_CATEGORIES[mainCat] || ["その他"];
            const mainFiltered = allOpinions.filter(o => (o.category === mainCat || o.大分類 === mainCat));

            // 1階層目：大分類アコーディオン
            const mainHtml = `
                <div class="card mb-2">
                    <div class="card-header clickable-header fw-bold bg-light p-3" onclick="toggleDrill('${prefix}-m-${mIdx}')">
                        📁 ${mainCat} <span class="badge bg-primary rounded-pill ms-2">${mainFiltered.length}</span>
                    </div>
                    <div id="${prefix}-m-${mIdx}" class="card-body d-none">
                        <!-- ここに中分類が入る -->
                        <div id="${prefix}-m-${mIdx}-mids"></div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML("beforeend", mainHtml);

            const midContainer = document.getElementById(`${prefix}-m-${mIdx}-mids`);

            midCats.forEach((midCat, sIdx) => {
                const subFiltered = mainFiltered.filter(o => (o.midCat === midCat || o.中分類 === midCat));

                // 2階層目：中分類アコーディオン
                const midHtml = `
                    <div class="drilldown-item my-2">
                        <div class="fw-bold text-secondary clickable-header p-2 rounded" onclick="toggleDrill('${prefix}-m-${mIdx}-s-${sIdx}')">
                            🌿 ${midCat} (${subFiltered.length}件)
                        </div>
                        <div id="${prefix}-m-${mIdx}-s-${sIdx}" class="d-none mt-1">
                            <!-- ここにタイトルが入る -->
                            <div id="${prefix}-m-${mIdx}-s-${sIdx}-titles" class="list-group list-group-flush ms-3"></div>
                        </div>
                    </div>
                `;
                midContainer.insertAdjacentHTML("beforeend", midHtml);

                const titleContainer = document.getElementById(`${prefix}-m-${mIdx}-s-${sIdx}-titles`);

                if (subFiltered.length === 0) {
                    titleContainer.innerHTML = `<div class="text-muted small p-2">このテーマへの投稿はまだありません。</div>`;
                } else {
                    subFiltered.forEach((o, oIdx) => {
                        const titleText = o.title || o.推奨タイトル || "無題の提案";
                        const summaryText = o.summary || o.refinedText || o.要約200 || "内容の要約がありません。";
                        const mergeInfo = o.mergeReason ? `<div class="alert alert-warning sm-alert mt-2 py-1 px-2 mb-0" style="font-size:8.5pt;"><strong>統合理由:</strong> ${o.mergeReason}</div>` : "";

                        // 3・4階層目：タイトルクリック ＞ 200字要約展開
                        const itemHtml = `
                            <div class="list-group-item p-2">
                                <div class="text-dark clickable-header fw-semibold" style="font-size:10pt;" onclick="toggleDrill('${prefix}-m-${mIdx}-s-${sIdx}-o-${oIdx}')">
                                    📌 ${titleText}
                                </div>
                                <div id="${prefix}-m-${mIdx}-s-${sIdx}-o-${oIdx}" class="d-none bg-light p-2 mt-2 rounded border" style="font-size:9.5pt; line-height:1.6; color:#495057;">
                                    ${summaryText}
                                    ${mergeInfo}
                                </div>
                            </div>
                        `;
                        titleContainer.insertAdjacentHTML("beforeend", itemHtml);
                    });
                }
            });
        });
    }

    // 表示トグルスイッチ関数（グローバルに公開）
    window.toggleDrill = function(id) {
        const target = document.getElementById(id);
        if (target) {
            target.classList.toggle("d-none");
        }
    };

    // 🌟 テスト用模擬データ（15件）
    function getMockData() {
        return [
            { category: "シームレス成長支援", midCat: "保幼小の連携強化", title: "環境の変化による「小1の壁」を乗り越える保幼小の縦の連携強化", summary: "保育園・幼稚園から小学校への進学時、子どもの特性や支援内容がスムーズに引き継がれる仕組みを求めます。環境の変化による「小1の壁」で不安を感じる親子が多いため、5歳児クラスと小学校低学年での合同体験授業や、教職員間での情報共有カルテの義務化を進めてほしいです。", mergeReason: "類似する『幼保小の一貫教育体制についての要望』と方向性が同一であるため、集約・統合されました。" },
            { category: "シームレス成長支援", midCat: "切れ目のない相談窓口", title: "出産前から高校生まで一貫して家族に寄り添う担当伴走制度の創設", summary: "出産前から高校生まで、子どもの成長ステージが変わっても同じ窓口や担当者が並走してくれる制度を提案します。年齢ごとに相談場所が変わると、一から説明し直す負担があり孤立を招きかねません。" },
            { category: "主体的な学び", midCat: "子ども主導のプロジェクト学習", title: "幼児期から地域を舞台に問いを立てるプロジェクト型探究学習の導入", summary: "先生からの一方的な授業ではなく、子どもたちが日常生活の疑問から問いを立て、調査や議論を行う「プロジェクト型学習」を幼児期から導入すべきです。自ら考え行動する経験が、思考力と自立心を早期から育みます。" },
            { category: "楽しさと好奇心", midCat: "五感を使う自然体験", title: "地元の豊かな山川海をフィールドにする五感フル活用の自然体験教育", summary: "画面の中の知識ではなく、泥に触れ、虫を捕まえ、植物の匂いを嗅ぐといった五感をフルに使う自然体験を幼児教育の軸にしてほしいです。地域の山や川、海をフィールドに、季節の移り変わりを体感するワークを提案します。" },
            { category: "個性・才能の開花", midCat: "個別最適化された学習プラン", title: "AIと個別プランで誰一人取り残さず尖った才能も制限しない最適学習", summary: "子どもの発達速度や興味の対象は一人ひとり全く異なります。全員が同じ進度で学ぶ一斉授業の限界を補うため、AI教材や個別学習プランを活用し、それぞれのペースで学べる環境を望みます。" },
            { category: "未来を生き抜く力", midCat: "非認知能力の育成", title: "困難に直面しても折れないレジリエンスを育む非認知能力教育の義務化", summary: "やり抜く力、感情をコントロールする自制心、他者と協働するコミュニケーション力などの「非認知能力」を育む教育に重点を置いてほしいです。困難な状況に直面しても折れないレジリエンスの土台を築きます。" }
        ];
    }
}
