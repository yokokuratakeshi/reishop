// Firestore 接続テストスクリプト

import { adminDb } from "../lib/firebase/admin";
import { COLLECTIONS } from "../lib/constants";

async function testDb() {
  try {
    console.log("Firestore への書き込みを試行します...");
    const testDoc = adminDb.collection("_test").doc("ping");
    await testDoc.set({
      message: "pong",
      timestamp: new Date().toISOString()
    });
    console.log("書き込み成功！");

    const snapshot = await testDoc.get();
    console.log("読み取りデータ:", snapshot.data());
    
    // 消去
    await testDoc.delete();
    console.log("テストデータを削除しました");

    console.log("--- Firestore 接続確認完了 ---");
  } catch (err) {
    console.error("Firestore エラー:", err);
  }
}

testDb();
