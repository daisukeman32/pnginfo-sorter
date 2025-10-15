# PNG振り分けツール設計書 - ミニマル版

## 1. 概要

### ツール名
**PNG Sorter** - PNGメタデータ振り分けツール

### 目的
PNGファイルのメタデータ情報を読み取り、指定条件でフォルダへ自動振り分け

### 基本仕様
- ローカル完結型（ネット接続不要）
- Electronによるデスクトップアプリ
- 最小限のUI要素

---

## 2. 機能仕様

### 実装する機能（これだけ）
1. **PNGメタデータ読み取り**
   - テキストチャンク（tEXt, iTXt, zTXt）
   - 作成ソフトウェア情報
   - プロンプト情報（AI画像）

2. **振り分けルール**
   - キーワードマッチング
   - 振り分け先フォルダ指定

3. **基本操作**
   - ドラッグ&ドロップ
   - 振り分け実行
   - ログ表示

---

## 3. デザイン仕様

### カラー設定（これだけ）
```css
/* ナイトモード */
.night {
  --bg: #000000;
  --text: #FFFFFF;
  --border: #333333;
}

/* デイモード */
.day {
  --bg: #FFFFFF;
  --text: #000000;
  --border: #E5E5E5;
}
```

### フォント
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', sans-serif;
font-size: 14px;
line-height: 1.5;
```

### レイアウト
```
┌────────────────────────────────┐
│ PNG Sorter          [Day/Night]│
├────────────────────────────────┤
│                                │
│  ファイルをドロップ             │
│                                │
├────────────────────────────────┤
│ ルール:                        │
│ キーワード → フォルダ          │
│ [_________]   [_________] [+]  │
├────────────────────────────────┤
│ [実行]                         │
├────────────────────────────────┤
│ ログ:                          │
│ ___________________________    │
└────────────────────────────────┘
```

---

## 4. 技術構成

### package.json
```json
{
  "name": "png-sorter",
  "version": "1.0.0",
  "main": "src/main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "pngjs": "^7.0.0"
  },
  "devDependencies": {
    "electron-builder": "^24.0.0"
  }
}
```

### ディレクトリ構造
```
png-sorter/
├── src/
│   ├── main.js       # メインプロセス
│   ├── renderer.js   # レンダラー
│   ├── index.html    # UI
│   └── style.css     # スタイル
├── package.json
└── README.md
```

---

## 5. コード仕様

### メインプロセス (main.js)
```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile('src/index.html');
}

// PNGメタデータ読み取り
ipcMain.handle('read-png-metadata', async (event, filePath) => {
  const buffer = fs.readFileSync(filePath);
  return extractPNGText(buffer);
});

// テキストチャンク抽出
function extractPNGText(buffer) {
  const chunks = {};
  let offset = 8; // PNGヘッダーをスキップ
  
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    
    if (type === 'tEXt' || type === 'iTXt') {
      const data = buffer.slice(offset + 8, offset + 8 + length);
      const nullIndex = data.indexOf(0);
      const keyword = data.toString('ascii', 0, nullIndex);
      const text = data.toString('utf-8', nullIndex + 1);
      chunks[keyword] = text;
    }
    
    offset += length + 12;
    if (type === 'IEND') break;
  }
  
  return chunks;
}

// ファイル振り分け
ipcMain.handle('sort-file', async (event, filePath, targetFolder) => {
  const fileName = path.basename(filePath);
  const targetPath = path.join(targetFolder, fileName);
  
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }
  
  fs.copyFileSync(filePath, targetPath);
  return targetPath;
});

app.whenReady().then(createWindow);
```

### HTML (index.html)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PNG Sorter</title>
  <link rel="stylesheet" href="style.css">
</head>
<body class="night">
  <header>
    <h1>PNG Sorter</h1>
    <button id="theme-toggle">Day/Night</button>
  </header>
  
  <main>
    <div id="drop-area">
      ファイルをドロップ
    </div>
    
    <div id="rules">
      <h3>ルール:</h3>
      <div class="rule-input">
        <input type="text" id="keyword" placeholder="キーワード">
        <input type="text" id="folder" placeholder="フォルダパス">
        <button id="add-rule">+</button>
      </div>
      <ul id="rule-list"></ul>
    </div>
    
    <button id="execute">実行</button>
    
    <div id="log">
      <h3>ログ:</h3>
      <textarea readonly></textarea>
    </div>
  </main>
  
  <script src="renderer.js"></script>
</body>
</html>
```

### スタイル (style.css)
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  background: var(--bg);
  color: var(--text);
  padding: 20px;
}

/* ナイトモード */
body.night {
  --bg: #000000;
  --text: #FFFFFF;
  --border: #333333;
}

/* デイモード */
body.day {
  --bg: #FFFFFF;
  --text: #000000;
  --border: #E5E5E5;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

h1 {
  font-size: 18px;
  font-weight: normal;
}

button {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  padding: 5px 15px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: var(--border);
}

#drop-area {
  border: 2px dashed var(--border);
  padding: 40px;
  text-align: center;
  margin-bottom: 20px;
}

#drop-area.dragover {
  background: var(--border);
}

.rule-input {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

input {
  flex: 1;
  padding: 5px;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

#execute {
  width: 100%;
  padding: 10px;
  margin: 20px 0;
}

textarea {
  width: 100%;
  height: 100px;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 10px;
  font-family: monospace;
  resize: none;
}
```

### レンダラー (renderer.js)
```javascript
let files = [];
let rules = [];

// テーマ切り替え
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('night');
  document.body.classList.toggle('day');
});

// ドラッグ&ドロップ
const dropArea = document.getElementById('drop-area');

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
  
  files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.png'));
  log(`${files.length}個のPNGファイルを読み込みました`);
});

// ルール追加
document.getElementById('add-rule').addEventListener('click', () => {
  const keyword = document.getElementById('keyword').value;
  const folder = document.getElementById('folder').value;
  
  if (keyword && folder) {
    rules.push({ keyword, folder });
    updateRuleList();
    document.getElementById('keyword').value = '';
    document.getElementById('folder').value = '';
  }
});

// 実行
document.getElementById('execute').addEventListener('click', async () => {
  for (const file of files) {
    const metadata = await window.api.readPNGMetadata(file.path);
    const metadataText = JSON.stringify(metadata).toLowerCase();
    
    for (const rule of rules) {
      if (metadataText.includes(rule.keyword.toLowerCase())) {
        await window.api.sortFile(file.path, rule.folder);
        log(`${file.name} → ${rule.folder}`);
        break;
      }
    }
  }
  log('振り分け完了');
});

function updateRuleList() {
  const list = document.getElementById('rule-list');
  list.innerHTML = rules.map(r => `<li>${r.keyword} → ${r.folder}</li>`).join('');
}

function log(message) {
  const textarea = document.querySelector('textarea');
  textarea.value += `${new Date().toLocaleTimeString()} ${message}\n`;
  textarea.scrollTop = textarea.scrollHeight;
}
```

### プリロード (preload.js)
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readPNGMetadata: (path) => ipcRenderer.invoke('read-png-metadata', path),
  sortFile: (path, folder) => ipcRenderer.invoke('sort-file', path, folder)
});
```

---

## 6. ビルド設定

### electron-builder.yml
```yaml
appId: com.local.png-sorter
productName: PNG Sorter
directories:
  output: dist
files:
  - "src/**/*"
  - "package.json"
mac:
  target: dmg
win:
  target: portable
linux:
  target: AppImage
```

---

## 7. 使い方

1. PNGファイルをドロップエリアにドラッグ
2. キーワードと振り分け先フォルダを設定
3. 実行ボタンをクリック
4. ログで結果確認

---

## 8. 開発コマンド

```bash
# プロジェクト作成
mkdir png-sorter && cd png-sorter
npm init -y

# Electron インストール
npm install electron pngjs
npm install -D electron-builder

# 起動
npm start

# ビルド
npm run build
```

以上、超シンプル設計の振り分けツール設計書です。