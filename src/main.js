const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
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
  try {
    const buffer = fs.readFileSync(filePath);
    return extractPNGText(buffer);
  } catch (error) {
    console.error('Error reading PNG metadata:', error);
    return {};
  }
});

// テキストチャンク抽出
function extractPNGText(buffer) {
  const chunks = {};
  let offset = 8; // PNGヘッダーをスキップ

  try {
    while (offset < buffer.length) {
      if (offset + 12 > buffer.length) break;

      const length = buffer.readUInt32BE(offset);
      const type = buffer.toString('ascii', offset + 4, offset + 8);

      if (type === 'tEXt' || type === 'iTXt') {
        const data = buffer.slice(offset + 8, offset + 8 + length);
        const nullIndex = data.indexOf(0);

        if (nullIndex !== -1) {
          const keyword = data.toString('ascii', 0, nullIndex);
          const text = data.toString('utf-8', nullIndex + 1);
          chunks[keyword] = text;
        }
      }

      offset += length + 12;
      if (type === 'IEND') break;
    }
  } catch (error) {
    console.error('Error extracting PNG text chunks:', error);
  }

  return chunks;
}

// ファイル振り分け
ipcMain.handle('sort-file', async (event, filePath, targetFolder) => {
  try {
    const fileName = path.basename(filePath);
    const targetPath = path.join(targetFolder, fileName);

    // フォルダが存在しない場合は作成
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // ファイルをコピー
    fs.copyFileSync(filePath, targetPath);
    return { success: true, targetPath };
  } catch (error) {
    console.error('Error sorting file:', error);
    return { success: false, error: error.message };
  }
});

// フォルダ選択ダイアログ
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
