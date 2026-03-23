// 初期マスターデータ投入スクリプト

import { adminAuth, adminDb } from "../lib/firebase/admin";
import { COLLECTIONS, SUBCOLLECTIONS } from "../lib/constants";
import { FieldValue } from "firebase-admin/firestore";

async function seedData() {
  try {
    console.log("シードデータの投入を開始します...");

    // 1. カテゴリ作成
    const categoryRef = adminDb.collection(COLLECTIONS.CATEGORIES).doc("cat_tops");
    await categoryRef.set({
      id: "cat_tops",
      name: "トップス",
      display_order: 1,
      is_active: true,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    console.log("カテゴリを作成しました");

    // 2. ステージ作成
    const stageRef = adminDb.collection(COLLECTIONS.STAGES).doc("stage_0");
    await stageRef.set({
      id: "stage_0",
      name: "0期",
      display_order: 1,
      is_active: true,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    console.log("ステージを作成しました");

    // 3. 商品作成
    const productRef = adminDb.collection(COLLECTIONS.PRODUCTS).doc("prod_tshirt");
    await productRef.set({
      id: "prod_tshirt",
      name: "ロゴTシャツ",
      description: "定番のロゴTシャツです。",
      category_id: "cat_tops",
      product_type: "apparel",
      is_active: true,
      image_urls: [],
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // 属性 (サイズ)
    const attrRef = productRef.collection(SUBCOLLECTIONS.ATTRIBUTES).doc("attr_size");
    await attrRef.set({
      id: "attr_size",
      name: "サイズ",
      values: ["S", "M"],
    });

    // バリアント (S)
    const variantSRef = productRef.collection(SUBCOLLECTIONS.VARIANTS).doc("var_s");
    await variantSRef.set({
      id: "var_s",
      sku: "TS-LOG-S",
      options: { "サイズ": "S" },
      is_active: true,
    });

    // 価格 (S, 0期)
    await variantSRef.collection(SUBCOLLECTIONS.PRICES).doc("stage_0").set({
      stage_id: "stage_0",
      wholesale_price: 3000,
    });

    // バリアント (M)
    const variantMRef = productRef.collection(SUBCOLLECTIONS.VARIANTS).doc("var_m");
    await variantMRef.set({
      id: "var_m",
      sku: "TS-LOG-M",
      options: { "サイズ": "M" },
      is_active: true,
    });

    // 価格 (M, 0期)
    await variantMRef.collection(SUBCOLLECTIONS.PRICES).doc("stage_0").set({
      stage_id: "stage_0",
      wholesale_price: 3000,
    });

    console.log("商品とバリアント・価格を作成しました");

    // 4. 加盟店作成
    const franchiseRef = adminDb.collection(COLLECTIONS.FRANCHISES).doc("fc_aoyama");
    await franchiseRef.set({
      id: "fc_aoyama",
      name: "青山店",
      franchise_code: "AOYAMA-001",
      stage_id: "stage_0",
      postal_code: "107-0062",
      address: "東京都港区南青山",
      phone: "03-1234-5678",
      is_active: true,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    console.log("加盟店を作成しました");

    // 5. 加盟店ユーザー作成
    const fEmail = "franchise@example.com";
    const fPassword = "password123";
    const fName = "青山店 店長";

    let fUser;
    try {
      fUser = await adminAuth.getUserByEmail(fEmail);
    } catch {
      fUser = await adminAuth.createUser({
        email: fEmail,
        password: fPassword,
        displayName: fName,
      });
    }

    await adminAuth.setCustomUserClaims(fUser.uid, {
      role: "franchise",
      franchise_id: "fc_aoyama",
    });

    await adminDb.collection(COLLECTIONS.USERS).doc(fUser.uid).set({
      uid: fUser.uid,
      email: fEmail,
      name: fName,
      role: "franchise",
      franchise_id: "fc_aoyama",
      is_active: true,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    console.log("加盟店ユーザーを作成しました");

    console.log("シードデータの投入が完了しました！");
  } catch (err) {
    console.error("エラー:", err);
  }
}

seedData();
