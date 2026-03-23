// テスト用管理ユーザー作成スクリプト

import { adminAuth, adminDb } from "../lib/firebase/admin";
import { COLLECTIONS } from "../lib/constants";
import { FieldValue } from "firebase-admin/firestore";

async function createAdminUser() {
  const email = "admin@example.com";
  const password = "password123";
  const name = "管理者太郎";

  try {
    // Auth ユーザー作成を直接試行
    console.log("Auth ユーザー作成を開始します...");
    const user = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    }).catch(async (err) => {
      if (err.code === "auth/email-already-exists") {
        return await adminAuth.getUserByEmail(email);
      }
      throw err;
    });

    console.log("Auth ユーザー情報取得/作成成功:", user.uid);

    // カスタムクレーム設定
    await adminAuth.setCustomUserClaims(user.uid, {
      role: "admin",
      franchise_id: null,
    });
    console.log("カスタムクレーム（ロール）を設定しました");

    // Firestore ユーザー情報作成
    await adminDb.collection(COLLECTIONS.USERS).doc(user.uid).set({
      uid: user.uid,
      email,
      name,
      role: "admin",
      franchise_id: null,
      is_active: true,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    console.log("Firestore ユーザー情報を保存しました");

  } catch (err) {
    console.error("エラー:", err);
  }
}

createAdminUser();
