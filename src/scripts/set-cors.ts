// Firebase Storage のCORS設定を適用するスクリプト
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// 実行時のカレントディレクトリから .env.local などを読み込む
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { adminStorage } from "../lib/firebase/admin";

async function setCors() {
  try {
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      console.error("エラー: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET が .env に設定されていません。");
      process.exit(1);
    }

    console.log(`設定対象のバケット: ${bucketName}`);
    const bucket = adminStorage.bucket(bucketName);

    // cors.json を読み込む
    const corsPath = path.resolve(process.cwd(), "cors.json");
    if (!fs.existsSync(corsPath)) {
      console.error(`エラー: ${corsPath} が見つかりません。`);
      process.exit(1);
    }

    const corsConfig = JSON.parse(fs.readFileSync(corsPath, "utf-8"));
    
    // @google-cloud/storage の setCorsConfiguration を呼び出す
    await bucket.setCorsConfiguration(corsConfig);
    
    console.log("✅ CORS設定が正常に適用されました！");
    console.log("（設定がブラウザに反映されるまで数分かかる場合があります）");
  } catch (error) {
    console.error("❌ CORS設定の適用中にエラーが発生しました:", error);
  }
}

setCors();
