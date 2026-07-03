{
    // あなたのGASウェブアプリURLに置き換えてください
    const GAS_URL = "https://script.google.com/macros/s/AKfycbyqu88PgyLyB02tf1TVxHAfzRJH6ICAj0X9DZtB7x3SWnwYSx_KjdOw6kTBj5MxQgm_/exec";

    // 5つの基本方針（定義通り）
    const MAIN_CATEGORIES = ["シームレス成長支援", "主体的な学び", "楽しさと好奇心", "個性・才能の開花", "未来を生き抜く力"];

    let allOpinions = [];

    document.addEventListener("DOMContentLoaded", function () {
        // 初回データ読み込み
        fetchOpinions();

        const btnAiAnalysis = document.getElementById("btnAiAnalysis");
        const btnSubmitToBox = document.getElementById("btnSubmitToBox");

        // 1. AI壁打ちアクション
        if (btnAiAnalysis) {
            btnAiAnalysis.addEventListener("click", async function () {
                const contentValue = document.getElementById("content").value.trim();
                if (!contentValue) {
                    alert("ご意見を入力してください。");
                    return;
                }

                btnAiAnalysis.disabled = true;
                btnAiAnalysis.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> AIが分析中...`;

                try {
                    const res = await fetch(GAS_URL, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain" },
                        body: JSON.stringify({ action: "analyze", content: contentValue })
                    });
                    const data = await res.json();

                    if (data.status === "success") {
                        window.currentAiResult = data.result;
                        const result = data.result;

                        // 🎯 スクリーンショットの項目名・構造に100%マッピング
                        document.getElementById("aiTitleText").textContent = result["推奨タイトル"] || "無題";
                        document.getElementById("aiSummaryText").textContent = result["概要"] || "取得できませんでした";
                        document.getElementById("aiRefinedText").textContent = result["要約200"] || "";

                        // a〜eの5つの視点を枠内に綺麗に出力
                        document.getElementById("aiPerspectivesText").innerHTML = `
                            <div class="perspective-box"><strong>a. 意見の核心:</strong> ${result["視点_a"] || "未抽出"}</div>
                            <div class="perspective-box"><strong>b. 市民生活の変化:</strong> ${result["視点_b"] || "未抽出"}</div>
                            <div class="perspective-box"><strong>c. 成功事例:</strong> ${result["視点_c"] || "未抽出"}</div>
                            <div class="perspective-box"><strong>d. 懸念点と乗り越え方:</strong> ${result["視点_d"] || "未抽出"}</div>
                            <div class="perspective-box"><strong>e. さらに発展させる問い:</strong> ${result["視点_e"] || "未抽出"}</div>
                        `;

                        // 配置・統合判定の理由
                        document.getElementById("aiMergeReasonText").innerHTML = `
                            <strong>【新規意見として配置】</strong><br>
                            ${result["統合理由"] || "既存のご意見と照らし合わせ、適切なカテゴリに配置しました。"}
                        `;

                        // 画面上のAI提案ボックスをふわっと表示
                        document.getElementById("aiAssistBox").classList.remove("d-none");
                    } else {
                        alert("AI分析エラー: " + data.message);
                    }
                } catch (err) {
                    alert("通信エラーが発生しました。GASが正しくウェブアプリとしてデプロイされているか確認してください。");
                } finally {
                    btnAiAnalysis.disabled = false;
                    btnAiAnalysis.innerHTML = `✨ 1. 意見を送信してAIと壁打ちする`;
                }
            });
        }

        // 2. 提案箱への最終投稿アクション
        if (btnSubmitToBox) {
            btnSubmitToBox.addEventListener("click", async function () {
                if (!window.currentAiResult) return;
                
                btnSubmitToBox.disabled = true;
                btnSubmitToBox.innerHTML = `投稿中...`;

                try {
                    const res = await fetch(GAS_URL, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain" },
                        body: JSON.stringify({
                            action: "submit",
                            content: document.getElementById("content").value.trim(),
                            title: window.currentAiResult["推奨タイトル"],
                            summary: window.currentAiResult["要約200"],
                            category: window.currentAiResult["大分類"],
                            midCat: window.currentAiResult["中分類"],
                            mergeReason: window.currentAiResult["統合理由"],
                            // 視点データも一緒にGASへ送る
                            perspectives: window.currentAiResult
                        })
                    });
                    const data = await res.json();
                    if (data.status === "success") {
                        alert("提案箱へ無事に投稿されました！");
                        document.getElementById("content").value = "";
                        document.getElementById("aiAssistBox").classList.add("d-none");
                        window.currentAiResult = null;
                        // 画面の一覧を最新状態にリフレッシュ
                        fetchOpinions();
                    } else {
                        alert("投稿エラー: " + data.message);
                    }
                } catch (e) {
                    alert("送信通信エラーが発生しました。");
                } finally {
                    btnSubmitToBox.disabled = false;
                    btnSubmitToBox.innerHTML = `📥 2. この内容で提案箱へ投稿する`;
                }
            });
        }
    });

    // データベース（GAS）から投稿一覧を取得
    async function fetchOpinions() {
        try {
            const res = await fetch(GAS_URL);
            allOpinions = await res.json();
            renderClassicStyle();
        } catch (e) {
            console.warn("GASからのデータ取得に失敗したため、モックデータで描写します。");
            allOpinions = [
                { category: "シームレス成長支援", title: "保幼小の連携強化について", summary: "幼保小の教育カリキュラムの段差をなくし、子供たちがスムーズに小学校へ移行できる環境を作ります。" }
            ];
            renderClassicStyle();
        }
    }

    // 以前の使い慣れたアコーディオン・リストUIを完全再現して描写する関数
    function renderClassicStyle() {
        const matrix = document.getElementById("matrixContainer");
        const list = document.getElementById("listContainer");
        if (!matrix || !list) return;

        matrix.innerHTML = "";
        list.innerHTML = "";

        // 🗺️ 右側上：5つの基本方針アコーディオンの生成
        MAIN_CATEGORIES.forEach((cat, idx) => {
            const filtered = allOpinions.filter(o => o.category === cat);
            
            const accordionHtml = `
                <div class="card mb-2 border">
                    <div class="card-header clickable-header bg-light fw-bold p-3 d-flex justify-content-between align-items-center" 
                         onclick="const el = document.getElementById('classic-body-${idx}'); el.classList.toggle('d-none');">
                        <span>📁 ${cat}</span>
                        <span class="badge bg-primary rounded-pill">${filtered.length} 件</span>
                    </div>
                    <div id="classic-body-${idx}" class="card-body d-none bg-white border-top">
                        <div class="list-group list-group-flush">
                            ${filtered.map(o => `
                                <div class="list-group-item px-0 py-2">
                                    <h6 class="fw-bold text-dark mb-1">📌 ${o.title}</h6>
                                    <p class="small text-muted mb-0 lh-base">${o.summary}</p>
                                    ${o.mergeReason ? `<div class="alert alert-light border py-1 px-2 mt-1 mb-0 custom-alert" style="font-size:0.82em;"><i class="fas fa-link"></i> 配置理由: ${o.mergeReason}</div>` : ''}
                                </div>
                            `).join('')}
                            ${filtered.length === 0 ? '<div class="text-muted small py-2">このカテゴリへの投稿はまだありません。</div>' : ''}
                        </div>
                    </div>
                </div>
            `;
            matrix.insertAdjacentHTML("beforeend", accordionHtml);
        });

        // 📥 右側下：届いた提案箱の一覧（時系列・全表示）
        if (allOpinions.length === 0) {
            list.innerHTML = `<p class="text-muted small text-center py-4">現在、提案箱に投稿はありません。</p>`;
            return;
        }

        allOpinions.forEach(o => {
            const itemHtml = `
                <div class="p-3 mb-3 bg-light border-start border-3 border-primary rounded-end shadow-sm">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-secondary">${o.category}</span>
                        <small class="text-muted style="font-size:0.75em;">投稿ID: #${o.id || '匿名'}</small>
                    </div>
                    <h6 class="fw-bold text-dark mb-2">${o.title}</h6>
                    <p class="small text-muted mb-0 lh-base" style="font-size:0.88em;">${o.summary}</p>
                </div>
            `;
            list.insertAdjacentHTML("beforeend", itemHtml);
        });
    }
}
