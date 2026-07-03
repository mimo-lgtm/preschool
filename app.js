// ==========================================
// 🌐 設定エリア（GASのWebアプリURL）
// ==========================================
// 🔴 デプロイした最新のGAS WebアプリURLをここに貼り付けてください
const GAS_URL = "https://script.google.com/macros/s/AKfycbzS2Bq8kgPcefvyQKB4B5cLN7Shm1mUbrS25cvGhtJgiCMKTmbMPz-4wd1y_7EjrzA/exec";

// 5つの一貫した大分類（カテゴリ）
const MAIN_CATEGORIES = [
    "シームレス成長支援",
    "主体的な学び",
    "楽しさと好奇心",
    "個性・才能の開花",
    "未来を生き抜く力"
];

// グローバル変数
let allOpinions = [];
let currentAiResult = null;

// ==========================================
// 🎬 画面が読み込まれた時のメイン処理
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    // 0. 「5つの基本方針」エリアの構造維持
    renderFivePillars();

    // ボタン要素の取得
    const btnAiAnalysis = document.getElementById("btnAiAnalysis"); 
    const btnSubmitToBox = document.getElementById("btnSubmitToBox");

    // 表示パーツの取得
    const aiPlaceholder = document.getElementById("aiPlaceholder");
    const aiAssistBox = document.getElementById("aiAssistBox");
    
    const aiSummaryText = document.getElementById("aiSummaryText");
    const aiPerspectivesText = document.getElementById("aiPerspectivesText");
    const aiTitleText = document.getElementById("aiTitleText");
    const aiRefinedText = document.getElementById("aiRefinedText");

    // 初期データの読み込みを実行
    fetchOpinions();

    // 🧠 1. 「AIと壁打ちする」ボタンのクリック処理
    if (btnAiAnalysis) {
        btnAiAnalysis.addEventListener("click", async function () {
            console.log("🚀 AI壁打ちボタンがクリックされました");
            
            // HTMLの textarea id="content" から取得
            const txtContent = document.getElementById("content");
            const contentValue = txtContent ? txtContent.value.trim() : "";
            console.log("📝 読み取った入力内容:", contentValue);

            if (!contentValue) {
                alert("あなたの想いやアイデアを自由に入力してください。");
                return;
            }

            // ボタンをローディング状態にする
            btnAiAnalysis.disabled = true;
            btnAiAnalysis.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> AIが思考を整理中...`;

            try {
                console.log("📡 GASへ通信を開始します...");
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify({ action: "analyze", content: contentValue })
                });
                const data = await res.json();
                console.log("📥 GASからの返答:", data);

                if (data.status === "success") {
                    currentAiResult = data.result;

                    // --- 📥 GAS(JSON)の日本語キー名と100%正確にマッピング ---
                    const bigCat = currentAiResult["大分類"] || "その他";
                    const midCat = currentAiResult["中分類"] || "一般テーマ";
                    const smallCat = currentAiResult["小分類"] || "未分類";
                    const recTitle = currentAiResult["推奨タイトル"] || "無題の提案";
                    const summary200 = currentAiResult["要約200"] || "要約の生成に失敗しました。";

                    // ① 意見の論点・概要（大分類・中分類をここにわかりやすく明記）
                    if (aiSummaryText) {
                        aiSummaryText.innerHTML = `<strong>【自動分類】</strong> ${bigCat} ＞ ${midCat}<br><strong>【キーワード】</strong> ${smallCat}<br><br>※AIが元の文章から文脈を読み解き、上記の幼児教育方針セクションへ自動的に仕分けを行いました。`;
                    }

                    // ② 5つの視点による深掘り / 補足
                    if (aiPerspectivesText) {
                        aiPerspectivesText.textContent = `元の意見をもとに、AIが論理構造を整理しました。上の「推奨タイトル」および下の「200字要約」の内容を確認し、よろしければ「提案箱に投稿する」ボタンを押してください。このまま大分類『${bigCat}』のデータベースへ格納されます。`;
                    }

                    // ③ 推奨タイトル
                    if (aiTitleText) {
                        aiTitleText.textContent = recTitle;
                    }

                    // ④ 200字要約
                    if (aiRefinedText) {
                        aiRefinedText.textContent = summary200;
                    }

                    // 画面の表示切り替え（プレースホルダーを隠して結果ボックスをFlex表示）
                    if (aiPlaceholder) aiPlaceholder.classList.add("d-none");
                    if (aiAssistBox) {
                        aiAssistBox.style.setProperty("display", "flex", "important");
                        aiAssistBox.classList.remove("d-none");
                    }
                } else {
                    alert("AI分析エラー: " + data.message);
                }
            } catch (err) {
                console.error("🚨 エラー詳細:", err);
                alert("通信エラーが発生しました。GASが正しく「ウェブアプリ」としてデプロイされているか、URLが合っているか確認してください。");
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

            const confirmPost = confirm("AIが整理・肉付けしたこの内容で、正式に提案箱へ投稿しますか？");
            if (!confirmPost) return;

            const txtContent = document.getElementById("content");
            const rawText = txtContent ? txtContent.value.trim() : "";

            btnSubmitToBox.disabled = true;
            btnSubmitToBox.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> 提案箱へ投稿中...`;

            try {
                // GASの「action === 'submit'」が受け取るパラメータ名に完全に一致させます
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify({
                        action: "submit",
                        content: rawText,
                        title: currentAiResult["推奨タイトル"],
                        summary: currentAiResult["要約200"],
                        category: currentAiResult["大分類"],
                        midCat: currentAiResult["中分類"],
                        subCat: currentAiResult["小分類"]
                    })
                });
                const data = await res.json();

                if (data.status === "success") {
                    alert(`提案箱への投稿が正常に完了しました！\n分野【${data.result["大分類"] || "分類中"}】へ格納されました。`);
                    
                    if (txtContent) txtContent.value = "";
                    if (aiPlaceholder) aiPlaceholder.classList.remove("d-none");
                    if (aiAssistBox) aiAssistBox.classList.add("d-none");
                    currentAiResult = null;

                    // リストを最新状態に再更新
                    fetchOpinions();
                    
                    // 投稿完了後、自動的に「アイデアの地図」タブを開く
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
// 🏛️ 「5つの柱」表示パーツの構造維持
// ==========================================
function renderFivePillars() {
    console.log("🌱 5つの基本方針セクションを確認しました。");
}

// ==========================================
// 📊 データ定義（15件の模擬データバックアップ）
// ==========================================
const MOCK_OPINIONS = [
    { 大分類: "シームレス成長支援", 中分類: "保幼小の連携強化", 推奨タイトル: "環境の変化による「小1の壁」を乗り越える保幼小の縦の連携強化", summary: "保育園・幼稚園から小学校への進学時、子どもの特性や支援内容がスムーズに引き継がれる仕組みを求めます。環境の変化による「小1の壁」で不安を感じる親子が多いため、5歳児クラスと小学校低学年での合同体験授業や、教職員間での情報共有カルテの義務化を先進的に進めてほしいです。" },
    { 大分類: "シームレス成長支援", 中分類: "切れ目のない相談窓口", 推奨タイトル: "出産前から高校生まで一貫して家族に寄り添う担当伴走制度の創設", summary: "出産前から高校生まで、子どもの成長ステージが変わっても同じ窓口や担当者が並走してくれる「マイ保健師・マイソーシャルワーカー」のような制度を提案します。年齢ごとに相談場所が変わると、一から説明し直す負担があり孤立を招きかねます。" },
    { 大分類: "シームレス成長支援", 中分類: "育児休業からの復職支援", 推奨タイトル: "キャリア中断を防ぐ雇用福祉連携型のスムーズな職場復帰サポート", summary: "育休から職場へ復帰する際、保育所の入所選考や預かり時間のミスマッチに悩む声が多く聞かれます。入園手続きのデジタル化やコンシェルジュによる柔軟なマッチング、復職直後の短時間勤務を支える一時預かりの拡充など、雇用と福祉が連携した一貫性のあるサポート体制を望みます。" },
    { 大分類: "主体的な学び", 中分類: "子ども主導のプロジェクト学習", 推奨タイトル: "幼児期から地域を舞台に問いを立てるプロジェクト型探究学習の導入", summary: "先生からの一方的な授業ではなく、子どもたちが日常生活の疑問から問いを立て、調査や議論を行う「プロジェクト型学習」を幼児期から導入すべきです。自ら考え、行動し、表現する経験の積み重ねが、変化の激しい時代を生き抜くために必要な思考力と自立心を早期から育みます。" },
    { 大分類: "主体的な学び", 中分類: "選択制のアクティビティ", 推奨タイトル: "指示待ちから自立へ導く「自由選択アクティビティ時間」の保障", summary: "一斉に同じ行動をする時間を減らし、子ども自身が「今は読書をする」「今はブロックで遊ぶ」と毎日の活動を自由に選択できる時間を、園や学校のカリキュラムに保障してください。大人の指示待ちになるのではなく、幼少期から「自分で選んで決める」心地よさと責任を学べる環境づくりが必要です。" },
    { 大分類: "主体的な学び", 中分類: "デジタルを活用した自己表現", 推奨タイトル: "消費から創造へ！タブレットを直感的自己表現ツールにする教育改革", summary: "タブレット端末をただのドリル学習として使うのではなく、子どもが描いた絵を動かしたり、写真や動画を使って自分の発見を友達に発表したりする「創造的な自己表現ツール」として活用させてほしいです。受動的な消費ではなく、主体的な表現者としてテクノロジーに親しむ教育を望みます。" },
    { 大分類: "楽しさと好奇心", 中分類: "五感を使う自然体験", 推奨タイトル: "地元の豊かな山川海をフィールドにする五感フル活用の自然体験教育", summary: "画面の中の知識ではなく、泥に触れ、虫を捕まえ、植物の匂いを嗅ぐといった五感をフルに使う自然体験を幼児教育の軸にしてほしいです。地域の山や川、海といった豊かな自然環境をフィールドに、季節の移り変わりを体感するフィールドワークを定期開催することを提案します。" },
    { 大分類: "楽しさと好奇心", 中分類: "失敗を歓迎する科学遊び", 推奨タイトル: "正解のない試行錯誤を楽しむ「失敗歓迎型」科学・工作遊びの拡充", summary: "水や空気、光を使った簡単な実験や、廃材を使った工作など、正解のない「科学遊び」の場を充実させてください。大切なのは、大人があらかじめ決めた結果通りに導くことではなく、「こうしたらどうなるだろう？」と試行錯誤し、失敗すること自体を楽しむ雰囲気です。" },
    { 大分類: "楽しさと好奇心", 中分類: "地域のアート・文化資源の活用", 推奨タイトル: "プロと響き合う体験で既成概念を打ち破る地域協働アートプログラム", summary: "地元の美術館や劇場、アーティストと連携し、本物の芸術や文化に幼少期から日常的に触れられる機会を創出してください。プロの作品を鑑賞するだけでなく、音楽家と一緒に音を鳴らしたり、画家と巨大なキャンバスに絵を描いたりする協働型ワークショップが理想です。" },
    { 大分類: "個性・才能の開花", 中分類: "個別最適化された学習プラン", 推奨タイトル: "AIと個別プランで誰一人取り残さず尖った才能も制限しない最適学習", summary: "子どもの発達速度や興味の対象は一人ひとり全く異なります。全員が同じ進度で学ぶ一斉授業の限界を補うため、AI教材や個別学習プランを活用し、それぞれのペースで学べる環境を望みます。得意な分野は年齢に関わらずどんどん先へ進み、苦手な部分は立ち止まって基礎をじっくり固める。" },
    { 大分類: "個性・才能の開花", 中分類: "多様な才能を認める評価基準", 推奨タイトル: "点数主義からの脱却！個々の「好き」を可視化するポートフォリオ評価", summary: "ペーパーテストの点数や運動能力だけでなく、絵画、プログラミング、観察力、あるいは「誰にでも優しくできる」といった多様な個性を独自の強みとして認め、ポートフォリオ形式で記録・評価する仕組みを提案します。画一的な基準で順位をつけるのではなく、その子だけの「好き」や「得意」を見つけ出します。" },
    { 大分類: "個性・才能の開花", 中分類: "特別なニーズを持つ子への支援", 推挙タイトル: "違いを価値に変えるインクルーシブ教育と専門環境のアップデート", summary: "発達障害やギフテッドなど、特異な才能や個別のニーズを持つ子どもたちが、その特性を否定されることなく伸び伸びと過ごせるインクルーシブ教育の拡充を求めます。専門知識を持つコーディネーターの増員や、個別の特性に合わせたクールダウン空間の設置などを進めてほしいです。" },
    { 大分類: "未来を生き抜く力", 中分類: "非認知能力の育成", 推奨タイトル: "困難に直面しても折れないレジリエンスを育む非認知能力教育の義務化", summary: "やり抜く力、感情をコントロールする自制心、他者と協働するコミュニケーション力などの「非認知能力」を育む教育に重点を置いてほしいです。これらは点数化できませんが、将来の幸福度に最も影響すると言われています。困難な状況に直面しても折れないレジリエンスの土台を築きます。" },
    { 大分類: "未来を生き抜く力", 中分類: "多様な人々と協働する体験", 推奨タイトル: "多世代・多文化と交わり地域の課題を共に解決するリアル協働スキル", summary: "同世代や学級内だけに閉じこもるのではなく、異なる年齢の子どもたちや、地域の高齢者、外国籍の住民、多様な職業の社会人と交流し、共に地域の課題解決に取り組む機会を設けてください。背景の異なる他者の意見を傾聴し、尊重しながら協働する経験は必須のスキルとなります。" },
    { 大分類: "未来を生き抜く力", 中分類: "答えのない問いに挑む力", 推奨タイトル: "正解のない現代社会のリアルな課題に挑み最適解を導く実践的市民教育", summary: "「気候変動」や「地域の過疎化」など、大人でも正解が分からない現代社会のリアルな課題について考え、議論する機会をカリキュラムに組み込んでほしいです。あらかじめ用意された正解を探すのではなく、不確実な情報の中から自分たちなりの最適解を導き出す力を養います。" }
];

// ==========================================
// 📊 データ取得 & 各種レンダリング
// ==========================================
async function fetchOpinions() {
    try {
        console.log("📡 GASから一覧データを取得中...");
        const res = await fetch(GAS_URL);
        let data = await res.json();
        
        // GASから配列が正しく取得できているかチェック
        if (!Array.isArray(data)) {
            console.log("GASデータが空、または形式が異なるため模擬データを使用します。");
            allOpinions = [...MOCK_OPINIONS];
        } else {
            // スプレッドシート側のキー（category, title, summary）を担保しつつマージ
            allOpinions = [...data, ...MOCK_OPINIONS];
        }
        renderIdeaMap();
        renderTeianBako();
    } catch (err) {
        console.error("データ取得エラー（模擬データで代替します）:", err);
        allOpinions = [...MOCK_OPINIONS];
        renderIdeaMap();
        renderTeianBako();
    }
}

// ① 【アイデアの地図】の描画
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

// アコーディオン開閉共通関数
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
