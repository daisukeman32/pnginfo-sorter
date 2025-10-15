# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**PNG Sorter** は、PNG画像のメタデータ（PNGINFO）を読み取り、指定した条件に基づいて自動的にフォルダへ振り分けるElectronベースのデスクトップアプリケーションです。

### 主要機能
- PNGメタデータ（tEXt, iTXt, zTXtチャンク）の読み取り
- キーワードマッチングによる自動振り分け
- ドラッグ&ドロップ対応のシンプルなUI
- Day/Nightテーマ切り替え

### 技術スタック
- **Electron**: デスクトップアプリケーションフレームワーク
- **pngjs**: PNGファイル解析ライブラリ
- **Node.js**: ファイルシステム操作
- ローカル完結型（ネット接続不要）

## Gemini CLI 連携

### トリガー
ユーザーが「Geminiと相談しながら進めて」（または類似表現）とリクエストした場合、Claude はセッション全体を通じて Gemini CLI と協業します。

### 協業時の Claude の役割
- **批判的評価者**: Gemini の提案を鵜呑みにせず、必ず検証・評価する
- **統合責任者**: 複数の視点を統合し、最終判断を行う
- **品質管理者**: 実装の実現可能性、保守性、パフォーマンスを評価

### 協業ワークフロー
1. **PROMPT 準備**: 最新の要件と議論要約を `$PROMPT` に格納
2. **Gemini 呼び出し** (バックグラウンド実行で自動進行):
   ```bash
   gemini <<EOF
   $PROMPT
   
   重要：以下の観点で複数の選択肢を提示してください：
   - 長所と短所を明確に
   - トレードオフを具体的に
   - 実装難易度の評価
   EOF
   ```
   ※ Claude は `run_in_background: true` でGeminiを呼び出し、結果を自動的に取得・評価します
3. **出力形式**:
   ```md
   **Gemini ➜**
   <Gemini からの応答>

   **Claude ➜**
   <評価フレームワークに基づく分析>
   ```

### 📊 Claude の評価フレームワーク
**Claude ➜** セクションは必ず以下の構造に従う：

```
## Gemini提案の評価
✅ **採用可能な要素**: [具体的な良い点]
⚠️ **技術的懸念**: [実装上の問題点やリスク]
🔄 **Claude の代替案**: [独自の第3の選択肢]

## 最終判断
- **採用方針**: [Gemini案/Claude案/折衷案]
- **根拠**: [なぜその判断に至ったか]
- **実装計画**: [具体的な次のステップ]
```

### ⚡ 鵜呑み防止ルール
1. **Gemini の提案をそのまま採用することは禁止**
2. **必ず技術的検証を行う**
3. **独自案の検討を義務化**

## 開発コマンド

### セットアップ
```bash
npm init -y
npm install electron pngjs
npm install -D electron-builder
```

### 開発
```bash
npm start          # Electronアプリを起動
npm run build      # プロダクションビルド（electron-builder）
```

### ファイル構成
```
png-sorter/
├── src/
│   ├── main.js       # Electronメインプロセス（IPCハンドラ、PNG解析）
│   ├── preload.js    # contextBridge設定
│   ├── renderer.js   # UIロジック（D&D、ルール管理）
│   ├── index.html    # アプリケーションUI
│   └── style.css     # テーマ定義（Day/Night）
├── package.json
└── electron-builder.yml
```

## アーキテクチャ

### コンポーネント間通信
- **Main Process** (main.js): ファイルシステム操作、PNG解析
- **Renderer Process** (renderer.js): UI操作、イベント処理
- **IPC通信**:
  - `read-png-metadata`: PNGメタデータ読み取り
  - `sort-file`: ファイルコピー実行

### PNGメタデータ解析
`extractPNGText()` 関数がPNGチャンクを直接パースし、tEXt/iTXtチャンクからキーワードとテキストを抽出します。バッファオフセット操作で実装されており、外部パーサーに依存しません。

### 振り分けロジック
1. ドロップされたPNGファイルのメタデータを全て取得
2. メタデータをJSON文字列化し、小文字変換
3. ルールリストを順次チェックし、最初にマッチしたルールで振り分け
4. フォルダが存在しない場合は自動作成

## 重要な注意事項

- ユーザーが明示的に要求しない限りファイルを作成しない
- 新規ファイル作成より既存ファイルの編集を常に優先する
- コードベース内の既存のコードパターンと規約に従う
- 特に指定がない限り、すべてのコード変更は後方互換性を維持する

## デザイン規約

### テーマシステム
CSS変数を使用したDay/Nightモード切り替え:
```css
/* Night Mode (デフォルト) */
--bg: #000000
--text: #FFFFFF
--border: #333333

/* Day Mode */
--bg: #FFFFFF
--text: #000000
--border: #E5E5E5
```

### フォント
```
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', sans-serif
font-size: 14px
line-height: 1.5
```

### UI原則
- ミニマルデザイン：必要最小限の要素のみ
- ドラッグ&ドロップ優先：直感的なファイル操作
- ボーダーベース：シンプルな線と空白で構成

## セキュリティ
- `nodeIntegration: false` を維持
- `contextIsolation: true` を維持
- preload.js経由でのみIPCアクセスを許可
- ファイルパスの検証を実施