let files = [];
let rules = [];

// ローカルストレージからルールを読み込み
function loadRules() {
  const saved = localStorage.getItem('sortingRules');
  if (saved) {
    rules = JSON.parse(saved);
    updateRuleList();
  }
}

// ルールを保存
function saveRules() {
  localStorage.setItem('sortingRules', JSON.stringify(rules));
}

// テーマ切り替え
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('night');
  document.body.classList.toggle('day');

  // テーマ設定を保存
  const theme = document.body.classList.contains('night') ? 'night' : 'day';
  localStorage.setItem('theme', theme);
});

// 保存されたテーマを読み込み
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'day') {
  document.body.classList.remove('night');
  document.body.classList.add('day');
}

// ドラッグ&ドロップ
const dropArea = document.getElementById('drop-area');

dropArea.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.png';

  input.onchange = (e) => {
    const fileList = Array.from(e.target.files);
    handleFiles(fileList);
  };

  input.click();
});

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('dragover');

  const fileList = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.png'));
  handleFiles(fileList);
});

function handleFiles(fileList) {
  files = fileList;
  log(`${files.length}個のPNGファイルを読み込みました`);

  // 実行ボタンを有効化
  document.getElementById('execute').disabled = files.length === 0 || rules.length === 0;
}

// フォルダ選択
document.getElementById('select-folder').addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) {
    document.getElementById('folder').value = folder;
  }
});

// ルール追加
document.getElementById('add-rule').addEventListener('click', () => {
  const keyword = document.getElementById('keyword').value.trim();
  const folder = document.getElementById('folder').value.trim();

  if (keyword && folder) {
    rules.push({ keyword, folder });
    saveRules();
    updateRuleList();

    // 入力欄をクリア
    document.getElementById('keyword').value = '';
    document.getElementById('folder').value = '';

    log(`ルールを追加: "${keyword}" → ${folder}`);

    // 実行ボタンを有効化
    document.getElementById('execute').disabled = files.length === 0 || rules.length === 0;
  } else {
    alert('キーワードとフォルダパスを両方入力してください');
  }
});

// ルールリスト更新
function updateRuleList() {
  const list = document.getElementById('rule-list');
  list.innerHTML = '';

  rules.forEach((rule, index) => {
    const li = document.createElement('li');

    const text = document.createElement('span');
    text.textContent = `"${rule.keyword}" → ${rule.folder}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '削除';
    deleteBtn.onclick = () => {
      rules.splice(index, 1);
      saveRules();
      updateRuleList();
      log(`ルールを削除: "${rule.keyword}"`);

      // 実行ボタンの状態を更新
      document.getElementById('execute').disabled = files.length === 0 || rules.length === 0;
    };

    li.appendChild(text);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

// 実行
document.getElementById('execute').addEventListener('click', async () => {
  if (files.length === 0) {
    alert('ファイルをドロップしてください');
    return;
  }

  if (rules.length === 0) {
    alert('ルールを追加してください');
    return;
  }

  log('--- 振り分け開始 ---');
  let sortedCount = 0;
  let unsortedCount = 0;

  for (const file of files) {
    try {
      const metadata = await window.api.readPNGMetadata(file.path);
      const metadataText = JSON.stringify(metadata).toLowerCase();

      let sorted = false;

      for (const rule of rules) {
        if (metadataText.includes(rule.keyword.toLowerCase())) {
          const result = await window.api.sortFile(file.path, rule.folder);

          if (result.success) {
            log(`✓ ${file.name} → ${rule.folder}`);
            sortedCount++;
            sorted = true;
            break;
          } else {
            log(`✗ エラー: ${file.name} - ${result.error}`);
          }
        }
      }

      if (!sorted) {
        log(`- ${file.name} (マッチなし)`);
        unsortedCount++;
      }
    } catch (error) {
      log(`✗ エラー: ${file.name} - ${error.message}`);
    }
  }

  log(`--- 完了: ${sortedCount}件振り分け、${unsortedCount}件スキップ ---`);
});

// ログ出力
function log(message) {
  const textarea = document.getElementById('log');
  const timestamp = new Date().toLocaleTimeString();
  textarea.value += `[${timestamp}] ${message}\n`;
  textarea.scrollTop = textarea.scrollHeight;
}

// 初期化
loadRules();
log('PNG Sorter 起動');
