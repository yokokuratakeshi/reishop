# デプロイガイド：フランチャイズ発注管理システム

このプロジェクトを Vercel および Firebase にデプロイするための手順です。

## 1. Firebase コンソールでの設定

### Firestore インデックスの適用
プロジェクトルートにある `firestore.indexes.json` を Firebase CLI でデプロイするか、コンソールから手動で以下の複合インデックスを作成してください。

| コレクション | フィールド | 順序 |
| :--- | :--- | :--- |
| `orders` | `franchise_id` (ASC), `created_at` (DESC) |
| `invoices` | `franchise_id` (ASC), `year_month` (DESC) |
| `invoices` | `year_month` (ASC), `status` (ASC) |

### セキュリティルールの適用
`firestore.rules` および `storage.rules` の内容をそれぞれのコンソールに貼り付けて保存してください。

## 2. Vercel へのデプロイ

### 環境変数の設定
Vercel のプロジェクト設定で、`.env.local` にある全ての環境変数を追加してください。
特に `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON文字列) または個別の Admin 用環境変数の設定に注意してください。

### ビルドコマンド
`npm run build` をビルドコマンドとして設定してください。オーバライドは不要です。

## 3. 運用開始時の注意点
- **初期マスタ登録**: 管理画面の CSV インポート機能を使用して、カテゴリ、ステージ、商品、加盟店を一括登録してください。
- **通知機能**: `src/lib/utils/notifications.ts` 内のシミュレーションロジックを、SendGrid などの実サービスへ接続するように変更してください。
