// ==========================================
// 🌐 設定エリア（GASのWebアプリURL）
// ==========================================
// ★ご自身の環境に合わせて、必要に応じてここのURLを書き換えてください。
const GAS_URL = "https://script.google.com/macros/s/AKfycbwgOIK3P6wmltLLxFrPdEuiGko8u8Ty4WAFaIDLZLIrcfUWrwiXvvr0VyEKAmYuuuiK/exec";

// 5つの一貫した大分類（カテゴリ）
const MAIN_CATEGORIES = [
    "シームレス成長支援",
    "主体的な学び",
    "楽しさと好奇心",
    "個性・才能の開花",
    "未来を生き抜く力"
];

// 取得したすべての意見データを保持するグローバル配列
let allOpinions = [];
// 現在のAIによる分析結果を保持するオブジェクト
let currentAiResult = null;

// ==========================================
// 🎬 画面が読み込まれた時のメイン処理
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    // 1. 各種画面要素（DOM）の取得
    const txtContent = document.getElementById("txtContent");
    const btnAiAssist = document.getElementById("btnAiAssist");
    const aiPlaceholder = document.getElementById("aiPlaceholder");
    const aiAssistBox = document.getElementById("aiAssistBox");

    // 分析結果を表示するパーツ
    const resTitle = document.getElementById("resTitle");
    const resCategory = document.getElementById("resCategory");
    const resMidCat = document.getElementById("resMidCat");
    const resRefinedText = document.getElementById("resRefinedText");
    const resReason = document.getElementById("resReason");

    // 投稿ボタン
    const btnSubmitToBox = document.getElementById("btnSubmitToBox");

    // 初期データの読み込みを実行
    fetchOpinions();

    // 🧠 2. 「AIに相談して、きれいに整理する」ボタンのクリック処理
    if (btnAiAssist) {
        btnAiAssist.addEventListener("click", async function () {
            const content = txtContent.value.trim();
            if (!content) {
                alert("あなたの想いやアイデアを自由に入力してください。");
                return;
            }

            // ボタンをローディング状態にする
            btnAiAssist.disabled = true;
            btnAiAssist.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> AIが思考を整理中...`;

            try {
                // GASへ「分析依頼（analyze）」を送信
                const res = await fetch(GAS_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "analyze", content: content })
                });
                const data = await res.json();

                if (data.status === "success") {
                    // グローバル変数に結果を一時保存
                    currentAiResult = data.result;

                    // 画面にAIの肉付け結果を反映
                    resTitle.textContent = currentAiResult.title || "無題の提案";
                    resCategory.textContent = currentAiResult.category || "その他";
                    resMidCat.textContent = currentAiResult.midCat || "未定";
                    resRefinedText.textContent = currentAiResult.refinedText || currentAiResult.summary;
                    resReason.textContent = currentAiResult.reason || "記載なし";

                    // プレースホルダー（初期メッセージ）を隠し、結果ボックスを表示
                    if (aiPlaceholder) aiPlaceholder.classList.add("d-none");
                    if (aiAssistBox) aiAssistBox.classList.remove("d-none");
                } else {
                    alert("AI分析エラー: " + data.message);
                }
            } catch (err) {
                console.error(err);
                alert("通信エラーが発生しました。時間を置いて再度お試しください。");
            } finally {
                // ボタンを元の状態に戻す
                btnAiAssist.disabled = false;
                btnAiAssist.innerHTML = `✨ AIに相談して、きれいに整理する`;
            }
        });
    }

    // 📥 3. 「この内容で提案箱へ投稿する」ボタンのクリック処理
    if (btnSubmitToBox) {
        btnSubmitToBox.addEventListener("click", async function () {
            if (!currentAiResult) return;

            const confirmPost = confirm("AIが整理・肉付けしたこの内容で、正式に提案箱へ投稿しますか？");
            if (!confirmPost) return;

            btnSubmitToBox.disabled = true;
            btnSubmitToBox.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> 提案箱へ投稿中...`;

            try {
                // GASへ「正式投稿（submit）」を送信
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
                    
                    // フォームとAI結果の表示をきれいにリセット
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
}); // <--- ここで DOMContentLoaded の閉じカッコ

// ==========================================
// 📊 データ取得 & アコーディオン描画関数エリア
// ==========================================

// 💡 15件の初期模擬データを定義（データが少ない、またはエラーの際のセーフティネット）
const MOCK_OPINIONS = [
    // 1. シームレス成長支援
    { 大分類: "シームレス成長支援", 中分類: "保幼小の連携強化", 推奨タイトル: "環境の変化による「小1の壁」を乗り越える保幼小の縦の連携強化", summary: "保育園・幼稚園から小学校への進学時、子どもの特性や支援内容がスムーズに引き継がれる仕組みを求めます。環境の変化による「小1の壁」で不安を感じる親子が多いため、5歳児クラスと小学校低学年での合同体験授業や、教職員間での情報共有カルテの義務化を先進的に進めてほしいです。発達の段差をなくし、地域全体で途切れなく成長を見守る体制が整えば、働く保護者も安心して子育てを継続できます。" },
    { 大分類: "シームレス成長支援", 中分類: "切れ目のない相談窓口", 推奨タイトル: "出産前から高校生まで一貫して家族に寄り添う担当伴走制度の創設", summary: "出産前から高校生まで、子どもの成長ステージが変わっても同じ窓口や担当者が並走してくれる「マイ保健師・マイソーシャルワーカー」のような制度を提案します。年齢ごとに相談場所が変わると、一から説明し直す負担があり孤立を招きかねます。データの一元化と専任担当制により、いつでも過去の経緯を理解した上で支援を受けられる、心理的ハードルの低いシームレスな相談環境が必要です。" },
    { 大分類: "シームレス成長支援", 中分類: "育児休業からの復職支援", 推奨タイトル: "キャリア中断を防ぐ雇用福祉連携型のスムーズな職場復帰サポート", summary: "育休から職場へ復帰する際、保育所の入所選考や預かり時間のミスマッチに悩む声が多く聞かれます。入園手続きのデジタル化やコンシェルジュによる柔軟なマッチング、復職直後の短時間勤務を支える一時預かりの拡充など、雇用と福祉が連携した一貫性のあるサポート体制を望みます。親のキャリア中断を防ぎ、ライフステージの移行期を地域全体で包括的に支えることで、次世代の育成にも繋がります。" },
    // 2. 主体的な学び
    { 大分類: "主体的な学び", 中分類: "子ども主導のプロジェクト学習", 推奨タイトル: "幼児期から地域を舞台に問いを立てるプロジェクト型探究学習の導入", summary: "先生からの一方的な授業ではなく、子どもたちが日常生活の疑問から問いを立て、調査や議論を行う「プロジェクト型学習」を幼児期から導入すべきです。例えば、地域の公園の遊具や自然をテーマに、どうすればもっと楽しくなるかを皆で話し合い、模型を作るような試みです。自ら考え、行動し、表現する経験の積み重ねが、変化の激しい時代を生き抜くために必要な思考力と自立心を早期から育みます。" },
    { 大分類: "主体的な学び", 中分類: "選択制のアクティビティ", 推奨タイトル: "指示待ちから自立へ導く「自由選択アクティビティ時間」の保障", summary: "一斉に同じ行動をする時間を減らし、子ども自身が「今は読書をする」「今はブロックで遊ぶ」と毎日の活動を自由に選択できる時間を、園や学校のカリキュラムに保障してください。自分の興味に従って時間を忘れて没頭する経験こそが、集中力と自己決定能力の土台となります。大人の指示待ちになるのではなく、幼少期から「自分で選んで決める」心地よさと責任を学べる環境づくりが必要です。" },
    { 大分類: "主体的な学び", 中分類: "デジタルを活用した自己表現", 推奨タイトル: "消費から創造へ！タブレットを直感的自己表現ツールにする教育改革", summary: "タブレット端末をただのドリル学習として使うのではなく、子どもが描いた絵を動かしたり、写真や動画を使って自分の発見を友達に発表したりする「創造的な自己表現ツール」として活用させてほしいです。文字がまだ十分に書けない幼児期でも、デジタルを活用すれば直感的に自分の世界を他者へ伝えることができます。受動的な消費ではなく、主体的な表現者としてテクノロジーに親しむ教育を望みます。" },
    // 3. 楽しさと好奇心
    { 大分類: "楽しさと好奇心", 中分類: "五感を使う自然体験", 推奨タイトル: "地元の豊かな山川海をフィールドにする五感フル活用の自然体験教育", summary: "画面の中の知識ではなく、泥に触れ、虫を捕まえ、植物の匂いを嗅ぐといった五感をフルに使う自然体験を幼児教育の軸にしてほしいです。地域の山や川、海といった豊かな自然環境をフィールドに、季節の移り変わりを体感するフィールドワークを定期開催することを提案します。「なぜだろう？」という知的好奇心や生命への畏敬の念は、五感を刺激するリアルな実体験の中でこそ最大化され、豊かな感性を形作ります。" },
    { 大分類: "楽しさと好奇心", 中分類: "失敗を歓迎する科学遊び", 推奨タイトル: "正解のない試行錯誤を楽しむ「失敗歓迎型」科学・工作遊びの拡充", summary: "水や空気、光を使った簡単な実験や、廃材を使った工作など、正解のない「科学遊び」の場を充実させてください。大切なのは、大人があらかじめ決めた結果通りに導くことではなく、「こうしたらどうなるだろう？」と試行錯誤し、失敗すること自体を楽しむ雰囲気です。予想外の結果に驚き、工夫を重ねるプロセスこそが、子どもの探究心の火を灯し、未知の事柄へ挑戦する冒険心を養います。" },
    { 大分類: "楽しさと好奇心", 中分類: "地域のアート・文化資源の活用", 推奨タイトル: "プロと響き合う体験で既成概念を打ち破る地域協働アートプログラム", summary: "地元の美術館や劇場、アーティストと連携し、本物の芸術や文化に幼少期から日常的に触れられる機会を創出してください。プロの作品を鑑賞するだけでなく、音楽家と一緒に音を鳴らしたり、画家と巨大なキャンバスに絵を描いたりする協働型ワークショップが理想です。自由な表現に触れて心が動かされる経験は、既成概念にとらわれない柔軟な想像力を育み、人生をより豊かに楽しむ力を授けてくれます。" },
    // 4. 個性・才能の開花
    { 大分類: "個性・才能の開花", 中分類: "個別最適化された学習プラン", 推奨タイトル: "AIと個別プランで誰一人取り残さず尖った才能も制限しない最適学習", summary: "子どもの発達速度や興味の対象は一人ひとり全く異なります。全員が同じ進度で学ぶ一斉授業の限界を補うため、AI教材や個別学習プランを活用し、それぞれのペースで学べる環境を望みます。得意な分野は年齢に関わらずどんどん先へ進み、苦手な部分は立ち止まって基礎をじっくり固める。誰一人取り残さず、かつそれぞれの尖った才能を制限することなく伸ばせる、真に個別最適化された教育の実現を期待します。" },
    { 大分類: "個性・才能の開花", 中分類: "多様な才能を認める評価基準", 推奨タイトル: "点数主義からの脱却！個々の「好き」を可視化するポートフォリオ評価", summary: "ペーパーテストの点数や運動能力だけでなく、絵画、プログラミング、観察力、あるいは「誰にでも優しくできる」といった多様な個性を独自の強みとして認め、ポートフォリオ形式で記録・評価する仕組みを提案します。画一的な基準で順位をつけるのではなく、その子だけの「好き」や「得意」を見つけ出し、肯定的なフィードバックを行うことで、強固な自己肯定感を育て、唯一無二の才能の開花を後押しします。" },
    { 大分類: "個性・才能の開花", 中分類: "特別なニーズを持つ子への支援", 推奨タイトル: "違いを価値に変えるインクルーシブ教育と専門環境のアップデート", summary: "発達障害やギフテッドなど、特異な才能や個別のニーズを持つ子どもたちが、その特性を否定されることなく伸び伸びと過ごせるインクルーシブ教育の拡充を求めます。専門知識を持つコーディネーターの増員や、個別の特性に合わせたクールダウン空間の設置などを進めてほしいです。周囲と違うことを「困ったこと」ではなく「貴重な個性」として受け入れ、凸凹のある才能を社会の宝として育てる視点が必要です。" },
    // 5. 未来を生き抜く力
    { 大分類: "未来を生き抜く力", 中分類: "非認知能力の育成", 推奨タイトル: "困難に直面しても折れないレジリエンスを育む非認知能力教育の義務化", summary: "やり抜く力、感情をコントロールする自制心、他者と協働するコミュニケーション力などの「非認知能力」を育む教育に重点を置いてほしいです。これらは点数化できませんが、将来の幸福度に最も影響すると言われています。園や学校の日常の中で、対立を話し合いで解決するワークや、長期的な目標にチームで挑む機会を意図的に設けることで、困難な状況に直面しても折れないレジリエンスの土台を築きます。" },
    { 大分類: "未来を生き抜く力", 中分類: "多様な人々と協働する体験", 推奨タイトル: "多世代・多文化と交わり地域の課題を共に解決するリアル協働スキル", summary: "同世代の学級内だけに閉じこもるのではなく、異なる年齢の子どもたちや、地域の高齢者、外国籍の住民、多様な職業の社会人と交流し、共に地域の課題解決に取り組む機会を設けてください。背景の異なる他者の意見を傾聴し、尊重しながら協働する経験は、これからのグローバル社会・多文化共生社会において必須のスキルとなります。視野を広げ、多様性を受け入れる寛容さと協調性を養います。" },
    { 大分類: "未来を生き抜く力", 中分類: "答えのない問いに挑む力", 推奨タイトル: "正解のない現代社会のリアルな課題に挑み最適解を導く実践的市民教育", summary: "「気候変動」や「地域の過疎化」など、大人でも正解が分からない現代社会のリアルな課題について考え、議論する機会をカリキュラムに組み込んでほしいです。あらかじめ用意された正解を探すのではなく、不確実な情報の中から自分たちなりの最適解を導き出し、他者に提案する力を養います。変化の激しい未来において、自ら問いを生み出し、主体的に社会に関与していく市民意識の原点を育てます。" }
];

// スプレッドシートからデータを取得する関数（データが無ければ模擬データを足す）
async function fetchOpinions() {
    try {
        const res = await fetch(GAS_URL);
        let data = await res.json();
        
        if (!Array.isArray(data) || data.length < 5) {
            console.log("スプレッドシートのデータが少ないため、15件の模擬データをベースに表示します。");
            allOpinions = [...MOCK_OPINIONS];
        } else {
            // スプレッドシートにデータがあれば合流させて表示
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

// ① 【アイデアの地図】の描画（5分野アコーディオン）
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

// ③ 【届いた提案箱】の描画（テーブル形式アコーディオン）
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

// アコーディオンを開閉するための共通関数
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
