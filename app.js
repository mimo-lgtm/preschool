// ⚠️ あなたのGASウェブアプリURLをここに貼り付けてください
const GAS_URL = "https://script.google.com/macros/s/AKfycbyqu88PgyLyB02tf1TVxHAfzRJH6ICAj0X9DZtB7x3SWnwYSx_KjdOw6kTBj5MxQgm_/exec"; 

let allOpinions = [];

const MOCK_OPINIONS = [
    { id: 1, timestamp: new Date().toISOString(), category: "シームレス成長支援", title: "幼保小連携の強化", summary: "環境変化のストレスを低減するための合同研修の提案。", content: "子供が小学校に上がった時のギャップが心配です。", smallCat: "小1の壁", midCat: "幼保小連携", status: "表示" }
];

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    fetchOpinions();
    document.getElementById('btnAnalyze').addEventListener('click', handleAnalyze);
    document.getElementById('btnSubmit').addEventListener('click', handleSubmit);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
});

function initNavigation() {
    const navs = [
        { btn: document.getElementById('navPage1'), page: document.getElementById('page1') },
        { btn: document.getElementById('navPage2'), page: document.getElementById('page2') },
        { btn: document.getElementById('navPage3'), page: document.getElementById('page3') }
    ];
    navs.forEach(target => {
        target.btn.addEventListener('click', () => {
            navs.forEach(n => {
                n.btn.className = "px-4 py-1.5 rounded-lg text-xs font-medium transition-all text-white hover:bg-white/10";
                n.page.classList.add('hidden');
            });
            target.btn.className = "px-4 py-1.5 rounded-lg text-xs font-medium transition-all bg-white text-indigo-900 shadow-sm";
            target.page.classList.remove('hidden');
        });
    });
}

async function fetchOpinions() {
    try {
        const res = await fetch(GAS_URL);
        let data = await res.json();
        allOpinions = Array.isArray(data) && data.length > 0 ? data : [...MOCK_OPINIONS];
    } catch (err) {
        console.warn('GAS接続エラーのため模擬データを使用します。');
        allOpinions = [...MOCK_OPINIONS];
    }
    renderOpinions(allOpinions);
}

async function handleAnalyze() {
    const content = document.getElementById('opinionInput').value.trim();
    if (!content) return alert('ご意見を入力してください。');
    toggleButtons(true);
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'analyze', content: content })
        });
        const data = await res.json();
        if (data.status === 'success') {
            document.getElementById('resTitle').textContent = data.result.推奨タイトル || '無題';
            document.getElementById('resCategory').textContent = data.result.大分類 || 'その他';
            document.getElementById('resMidCat').textContent = data.result.中分類 || '未設定';
            document.getElementById('resSubCat').textContent = data.result.小分類 || '未設定';
            document.getElementById('resSummary').textContent = data.result.要約200 || content;
            document.getElementById('resultBox').classList.remove('hidden');
            document.getElementById('resultPlaceholder').classList.add('hidden');
        } else {
            alert('分析エラー: ' + data.message);
        }
    } catch (err) {
        alert('GAS接続失敗。デプロイ設定等を確認してください。');
    } finally { toggleButtons(false); }
}

async function handleSubmit() {
    const content = document.getElementById('opinionInput').value.trim();
    if (!content) return alert('ご意見を入力してください。');
    toggleButtons(true);
    const isAnalyzed = !document.getElementById('resultBox').classList.contains('hidden');
    const payload = {
        action: 'submit', content: content,
        title: isAnalyzed ? document.getElementById('resTitle').textContent : '',
        category: isAnalyzed ? document.getElementById('resCategory').textContent : '',
        midCat: isAnalyzed ? document.getElementById('resMidCat').textContent : '',
        subCat: isAnalyzed ? document.getElementById('resSubCat').textContent : '',
        summary: isAnalyzed ? document.getElementById('resSummary').textContent : ''
    };
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.status === 'success') {
            alert('データベースに格納されました！');
            document.getElementById('opinionInput').value = '';
            document.getElementById('resultBox').classList.add('hidden');
            document.getElementById('resultPlaceholder').classList.remove('hidden');
            fetchOpinions();
        }
    } catch (err) { alert('送信失敗'); } finally { toggleButtons(false); }
}

function renderOpinions(list) {
    const listEl = document.getElementById('opinionsList');
    listEl.innerHTML = '';
    list.forEach(op => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2";
        card.innerHTML = `
            <div class="text-xs flex gap-2">
                <span class="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">${op.category || 'その他'}</span>
                <span class="text-slate-400">#${op.smallCat || ''}</span>
            </div>
            <h4 class="font-bold text-slate-900">${op.title || '無題'}</h4>
            <p class="text-sm text-slate-600">${op.summary || op.content}</p>
        `;
        listEl.appendChild(card);
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allOpinions.filter(op => 
        (op.title && op.title.toLowerCase().includes(query)) ||
        (op.content && op.content.toLowerCase().includes(query))
    );
    renderOpinions(filtered);
}

function toggleButtons(disabled) {
    document.getElementById('btnAnalyze').disabled = disabled;
    document.getElementById('btnSubmit').disabled = disabled;
}
