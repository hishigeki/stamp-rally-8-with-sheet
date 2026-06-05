# 学園祭Webスタンプラリー 8個版 Spreadsheet完全版

## 重要
この版は、Google Spreadsheet連携を含みます。

指定Spreadsheet:
https://docs.google.com/spreadsheets/d/1TKfOE8N8-68xu3oRC798vPgsN9XEbq37P6kUgUS1nr8/edit

## 手順

### 1. SpreadsheetでGASを作成

Spreadsheetを開く  
→ 拡張機能  
→ Apps Script

`gas/Code.gs` の内容を貼り付けます。

### 2. setupSheetsを実行

Apps Scriptで `setupSheets` を実行します。  
初回は権限承認が必要です。

作成されるシート:

- participants
- stamp_logs
- complete_logs
- prize_logs
- messages
- dashboard

### 3. Webアプリとしてデプロイ

デプロイ  
→ 新しいデプロイ  
→ ウェブアプリ

設定:

- 実行するユーザー: 自分
- アクセスできるユーザー: 全員

WebアプリURLをコピーします。

### 4. app.jsへGAS URLを貼り付け

`github_upload/app.js` の

```javascript
const GAS_URL = "PASTE_GAS_WEB_APP_URL_HERE";
```

を、コピーしたGAS WebアプリURLに変更します。

### 5. GitHubへアップロード

`github_upload` フォルダの中身を、GitHubリポジトリのルートへ上書きします。

### 6. QRコードを差し替え

`qr_codes` フォルダ内のQRコードを使用します。

## 記録される内容

- 参加者ID
- スタンプ番号
- スタンプ取得時刻
- コンプリート記録
- 景品交換記録
- メッセージ配信内容

## 注意

`stamp_mapping_admin_keep_private.json` と `qr_url_list_admin_keep_private.txt` は管理者用です。
本番では公開しないでください。


## 新リポジトリ用設定

リポジトリ名: stamp-rally-8-with-sheet

GitHub Pages URL:

https://hishigeki.github.io/stamp-rally-8-with-sheet/

このパッケージのQRコードは、上記URLに合わせて再生成済みです。
